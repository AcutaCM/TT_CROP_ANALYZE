#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
专用QR码检测的无人机后端服务
移除ArUco，专注于传统QR码检测
"""

import sys
import os
import json
import asyncio
import websockets
import threading
import time
import argparse
from datetime import datetime
import traceback
import cv2
import numpy as np
import base64

# 设置控制台编码为UTF-8
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

# DJI Tello导入
try:
    from djitellopy import Tello

    TELLO_AVAILABLE = True
    print("✅ djitellopy库加载成功")
except ImportError as e:
    TELLO_AVAILABLE = False
    print(f"❌ djitellopy库导入失败: {e}")

# QR码检测库导入 - 这是关键！
try:
    from pyzbar import pyzbar

    PYZBAR_AVAILABLE = True
    print("✅ pyzbar QR码检测库加载成功")
except ImportError:
    PYZBAR_AVAILABLE = False
    print("❌ pyzbar库未安装！这是检测QR码的必需库")
    print("请运行: pip install pyzbar")
    if sys.platform.startswith('win'):
        print("Windows用户可能还需要安装: pip install zbar-py")

# AI分析器导入
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from crop_analyzer_dashscope import CropAnalyzer

    ANALYZER_AVAILABLE = True
    print("✅ AI分析器模块加载成功")
except ImportError as e:
    ANALYZER_AVAILABLE = False
    print(f"❌ AI分析器模块导入失败: {e}")


class QRDroneBackendService:
    """专用QR码检测的无人机后端服务"""

    def __init__(self, ws_port=3002):
        self.ws_port = ws_port
        self.drone = None
        self.crop_analyzer = None
        self.video_thread = None
        self.is_running = True
        self.connected_clients = set()

        # 主事件循环引用
        self.main_loop = None

        # 无人机状态
        self.drone_state = {
            'connected': False,
            'flying': False,
            'battery': 0,
            'mission_active': False,
            'wifi_signal': 0,
            'temperature': 0
        }

        # 视频和QR检测状态
        self.video_streaming = False
        self.qr_detection_enabled = True
        self.processed_qr_data = set()  # 存储已处理的QR码数据
        self.frame_count = 0
        self.last_fps_time = time.time()
        self.fps = 0

        # QR码检测相关
        self.detection_cooldown = {}  # 检测冷却时间
        self.cooldown_duration = 5.0  # 5秒冷却期
        self.last_detection_time = 0
        self.detection_interval = 0.5  # 每0.5秒检测一次

        # 检查QR码检测库
        if not PYZBAR_AVAILABLE:
            print("⚠️ 警告：pyzbar库未安装，QR码检测将不可用")
            print("解决方案：pip install pyzbar")

        # 初始化AI分析器
        self.init_ai_analyzer()

    def init_ai_analyzer(self):
        """初始化AI分析器"""
        try:
            if not ANALYZER_AVAILABLE:
                print("⚠️ AI分析器模块不可用")
                return

            # 从环境变量或配置文件获取API配置
            api_key = os.getenv('DASHSCOPE_API_KEY')
            app_id = os.getenv('DASHSCOPE_APP_ID')

            if not api_key or not app_id:
                config_path = os.path.join(os.path.dirname(__file__), 'config.json')
                if os.path.exists(config_path):
                    with open(config_path, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                        api_key = api_key or config.get('dashscope_api_key')
                        app_id = app_id or config.get('dashscope_app_id')

            if api_key and app_id:
                self.crop_analyzer = CropAnalyzer(api_key=api_key, app_id=app_id)
                print("✅ AI分析器初始化成功")
            else:
                print("⚠️ 未找到有效的AI API配置")
        except Exception as e:
            print(f"❌ AI分析器初始化失败: {e}")
            self.crop_analyzer = None

    async def start_websocket_server(self):
        """启动WebSocket服务器"""
        print(f"🚀 启动专用QR码检测WebSocket服务器，端口: {self.ws_port}")

        # 保存主事件循环引用
        self.main_loop = asyncio.get_event_loop()

        async def handle_client(websocket, path):
            client_ip = websocket.remote_address[0] if websocket.remote_address else "unknown"
            print(f"🔗 客户端连接: {client_ip}")
            self.connected_clients.add(websocket)

            try:
                # 发送连接确认
                await websocket.send(json.dumps({
                    'type': 'connection_established',
                    'data': {
                        'server_time': datetime.now().isoformat(),
                        'qr_detection_available': PYZBAR_AVAILABLE,
                        'message': 'QR码专用检测服务已就绪'
                    },
                    'timestamp': datetime.now().isoformat()
                }, ensure_ascii=False))

                async for message in websocket:
                    await self.handle_websocket_message(websocket, message)
            except websockets.exceptions.ConnectionClosed:
                print(f"📴 客户端断开连接: {client_ip}")
            except Exception as e:
                print(f"❌ WebSocket处理错误: {e}")
                traceback.print_exc()
            finally:
                self.connected_clients.discard(websocket)

        # 启动服务器
        server = await websockets.serve(handle_client, "localhost", self.ws_port)
        print(f"✅ QR码检测WebSocket服务器已启动: ws://localhost:{self.ws_port}")

        return server

    def video_stream_worker(self):
        """视频流工作线程 - QR码专用版本"""
        print("📹 QR码检测视频流已启动")

        frame_retry_count = 0
        max_retry = 10

        while self.video_streaming and self.drone:
            try:
                frame_read = self.drone.get_frame_read()
                if frame_read is None:
                    time.sleep(0.1)
                    continue

                frame = frame_read.frame
                if frame is None:
                    frame_retry_count += 1
                    if frame_retry_count > max_retry:
                        print("⚠️ 视频帧获取失败次数过多")
                        frame_retry_count = 0
                    time.sleep(0.1)
                    continue

                frame_retry_count = 0
                self.update_fps_stats()

                # QR码检测处理
                current_time = time.time()
                should_detect = (current_time - self.last_detection_time) >= self.detection_interval

                processed_frame = self.process_frame_for_qr(frame, should_detect)

                if should_detect:
                    self.last_detection_time = current_time

                # 编码并发送视频帧
                _, buffer = cv2.imencode('.jpg', processed_frame,
                                         [cv2.IMWRITE_JPEG_QUALITY, 85])
                frame_b64 = base64.b64encode(buffer).decode('utf-8')

                if self.main_loop and not self.main_loop.is_closed():
                    try:
                        future = asyncio.run_coroutine_threadsafe(
                            self.broadcast_message('video_frame', {
                                'frame': f'data:image/jpeg;base64,{frame_b64}',
                                'fps': self.fps,
                                'timestamp': datetime.now().isoformat()
                            }),
                            self.main_loop
                        )
                        future.result(timeout=0.1)
                    except Exception:
                        pass

                time.sleep(0.033)  # 约30fps

            except Exception as e:
                print(f"❌ QR检测视频流错误: {e}")
                time.sleep(0.5)

        print("📹 QR码检测视频流已停止")

    def process_frame_for_qr(self, frame, should_detect=True):
        """专门处理QR码检测的帧处理"""
        try:
            processed_frame = frame.copy()

            # QR码检测
            if (should_detect and
                    self.qr_detection_enabled and
                    self.drone_state.get('mission_active', False) and
                    PYZBAR_AVAILABLE):

                detected_qrs = self.detect_qr_codes(processed_frame)

                for qr_info in detected_qrs:
                    qr_data = qr_info['data']
                    current_time = time.time()

                    # 检查冷却时间
                    if qr_data in self.detection_cooldown:
                        if current_time - self.detection_cooldown[qr_data] < self.cooldown_duration:
                            # 还在冷却期，绘制灰色边框
                            self.draw_qr_detection(processed_frame, qr_info, color=(128, 128, 128))
                            continue

                    # 新检测到的QR码
                    self.detection_cooldown[qr_data] = current_time

                    # 绘制绿色边框
                    self.draw_qr_detection(processed_frame, qr_info, color=(0, 255, 0))

                    # 处理QR码检测结果
                    self.handle_qr_detection(frame, qr_info)

            # 添加覆盖信息
            self.add_frame_overlay(processed_frame)

            return processed_frame

        except Exception as e:
            print(f"❌ QR码帧处理错误: {e}")
            return frame

    def detect_qr_codes(self, frame):
        """检测QR码 - 仅使用pyzbar"""
        detected_codes = []

        if not PYZBAR_AVAILABLE:
            return detected_codes

        try:
            # 转换为灰度图
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # 图像预处理 - 提高检测成功率
            # 1. 高斯模糊去噪
            gray = cv2.GaussianBlur(gray, (3, 3), 0)

            # 2. 对比度增强
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray = clahe.apply(gray)

            # 使用pyzbar检测QR码
            qr_codes = pyzbar.decode(gray)

            for qr in qr_codes:
                try:
                    # 解码数据
                    data = qr.data.decode('utf-8')

                    # 获取边界框
                    rect = qr.rect

                    # 计算角点
                    if hasattr(qr, 'polygon') and qr.polygon:
                        # 使用多边形角点（更精确）
                        corners = [[p.x, p.y] for p in qr.polygon]
                    else:
                        # 从矩形推导角点
                        corners = [
                            [rect.left, rect.top],
                            [rect.left + rect.width, rect.top],
                            [rect.left + rect.width, rect.top + rect.height],
                            [rect.left, rect.top + rect.height]
                        ]

                    # 计算中心点
                    center_x = rect.left + rect.width // 2
                    center_y = rect.top + rect.height // 2

                    # 解析植物ID
                    plant_id = self.parse_plant_id(data)

                    detected_codes.append({
                        'type': 'qr',
                        'id': plant_id,
                        'data': data,
                        'corners': corners,
                        'center': (center_x, center_y),
                        'confidence': 0.9,  # QR码检测通常很可靠
                        'rect': (rect.left, rect.top, rect.width, rect.height),
                        'quality': qr.quality if hasattr(qr, 'quality') else 100
                    })

                except UnicodeDecodeError:
                    print(f"⚠️ QR码数据解码失败，可能包含非UTF-8字符")
                    continue
                except Exception as e:
                    print(f"⚠️ 处理QR码时出错: {e}")
                    continue

        except Exception as e:
            print(f"❌ QR码检测错误: {e}")

        return detected_codes

    def parse_plant_id(self, data):
        """从QR码数据中解析植物ID"""
        try:
            # 1. 尝试JSON格式
            if data.strip().startswith('{'):
                parsed = json.loads(data)
                if 'id' in parsed:
                    return parsed['id']
                elif 'plant_id' in parsed:
                    return parsed['plant_id']
                elif 'plantId' in parsed:
                    return parsed['plantId']

            # 2. 尝试plant_数字格式
            if 'plant_' in data.lower():
                import re
                match = re.search(r'plant[_-]?(\d+)', data.lower())
                if match:
                    return int(match.group(1))

            # 3. 尝试纯数字
            if data.strip().isdigit():
                return int(data.strip())

            # 4. 尝试提取任何数字
            import re
            numbers = re.findall(r'\d+', data)
            if numbers:
                return int(numbers[0])

            # 5. 使用数据内容作为ID
            return data.strip()[:20]  # 限制长度

        except Exception as e:
            print(f"❌ 解析植物ID失败: {e}")
            return data.strip()[:20]

    def draw_qr_detection(self, frame, qr_info, color=(0, 255, 0)):
        """绘制QR码检测结果"""
        try:
            corners = qr_info.get('corners', [])
            center = qr_info.get('center', (0, 0))
            qr_id = qr_info.get('id', 'Unknown')
            data = qr_info.get('data', '')

            # 绘制边框
            if len(corners) >= 4:
                points = np.array(corners, dtype=np.int32)
                cv2.polylines(frame, [points], True, color, 3)
            else:
                # 使用矩形边框作为备选
                rect = qr_info.get('rect')
                if rect:
                    x, y, w, h = rect
                    cv2.rectangle(frame, (x, y), (x + w, y + h), color, 3)

            # 绘制中心点
            cv2.circle(frame, center, 5, color, -1)

            # 绘制文本信息
            # 优先显示植物ID，如果没有则显示数据的前几个字符
            if isinstance(qr_id, (int, float)):
                text = f'植株: {qr_id}'
            else:
                text = f'QR: {str(qr_id)[:10]}'

            text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]

            # 计算文本位置
            text_x = max(5, center[0] - text_size[0] // 2)
            text_y = max(25, center[1] - 20)

            # 绘制文本背景
            cv2.rectangle(frame,
                          (text_x - 5, text_y - text_size[1] - 5),
                          (text_x + text_size[0] + 5, text_y + 5),
                          color, -1)

            # 绘制文本
            cv2.putText(frame, text, (text_x, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

            # 如果有质量信息，显示
            quality = qr_info.get('quality')
            if quality and quality < 80:
                quality_text = f'质量: {quality}'
                cv2.putText(frame, quality_text, (text_x, text_y + 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)

        except Exception as e:
            print(f"❌ 绘制QR检测结果错误: {e}")

    def handle_qr_detection(self, frame, qr_info):
        """处理QR码检测结果"""
        try:
            qr_id = qr_info.get('id', 'Unknown')
            qr_data = qr_info.get('data', '')

            print(f"🔍 检测到QR码: ID={qr_id}, 数据='{qr_data[:30]}{'...' if len(qr_data) > 30 else ''}'")

            # 发送检测事件到前端
            if self.main_loop and not self.main_loop.is_closed():
                try:
                    future = asyncio.run_coroutine_threadsafe(
                        self.broadcast_message('qr_detected', {
                            'qr_info': qr_info,
                            'timestamp': datetime.now().isoformat()
                        }),
                        self.main_loop
                    )
                    future.result(timeout=0.1)
                except Exception as e:
                    print(f"❌ 发送QR检测事件失败: {e}")

            # 进行AI分析
            if self.crop_analyzer:
                self.analyze_plant_ai(frame, qr_info)
            else:
                print("⚠️ AI分析器不可用，跳过分析")

        except Exception as e:
            print(f"❌ 处理QR检测结果错误: {e}")

    def analyze_plant_ai(self, frame, qr_info):
        """AI分析植物"""
        try:
            plant_id = qr_info.get('id', 'Unknown')

            def ai_analysis_worker():
                try:
                    print(f"🤖 开始AI分析植株 {plant_id}...")

                    result = self.crop_analyzer.analyze_crop_health(frame)

                    if result['status'] == 'ok':
                        if self.main_loop and not self.main_loop.is_closed():
                            try:
                                future = asyncio.run_coroutine_threadsafe(
                                    self.broadcast_message('ai_analysis_complete', {
                                        'plant_id': plant_id,
                                        'timestamp': datetime.now().isoformat(),
                                        'analysis': result,
                                        'qr_info': qr_info
                                    }),
                                    self.main_loop
                                )
                                future.result(timeout=2.0)
                            except Exception as e:
                                print(f"❌ 发送AI分析结果失败: {e}")

                        health_score = result.get('health_score', 0)
                        print(f"✅ 植株 {plant_id} AI分析完成，健康评分: {health_score}/100")
                    else:
                        print(f"❌ 植株 {plant_id} AI分析失败: {result.get('message')}")

                except Exception as e:
                    print(f"❌ AI分析执行错误: {e}")

            # 在单独线程中运行AI分析
            ai_thread = threading.Thread(target=ai_analysis_worker)
            ai_thread.daemon = True
            ai_thread.start()

        except Exception as e:
            print(f"❌ AI分析启动错误: {e}")

    def add_frame_overlay(self, frame):
        """添加帧覆盖信息"""
        try:
            # 时间戳
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cv2.putText(frame, timestamp, (10, frame.shape[0] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            # FPS
            cv2.putText(frame, f'FPS: {self.fps}', (frame.shape[1] - 80, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            # 状态信息
            status_text = []
            if self.drone_state['connected']:
                status_text.append('CONNECTED')
            if self.drone_state['flying']:
                status_text.append('FLYING')
            if self.drone_state['mission_active']:
                status_text.append('MISSION')
            if self.qr_detection_enabled and PYZBAR_AVAILABLE:
                status_text.append('QR_READY')

            if status_text:
                cv2.putText(frame, ' | '.join(status_text), (10, 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

            # QR检测统计
            detected_count = len(self.detection_cooldown)
            if detected_count > 0:
                cv2.putText(frame, f'QR Detected: {detected_count}', (10, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

            # 检测状态
            if not PYZBAR_AVAILABLE:
                cv2.putText(frame, 'QR DETECTION DISABLED - INSTALL PYZBAR', (10, 75),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

        except Exception as e:
            print(f"❌ 添加帧覆盖错误: {e}")

    def update_fps_stats(self):
        """更新FPS统计"""
        self.frame_count += 1
        current_time = time.time()

        if current_time - self.last_fps_time >= 1.0:
            self.fps = self.frame_count
            self.frame_count = 0
            self.last_fps_time = current_time

    # WebSocket消息处理方法
    async def handle_websocket_message(self, websocket, message):
        """处理WebSocket消息"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            message_data = data.get('data', {})

            print(f"📨 收到消息: {message_type}")

            if message_type == 'drone_connect':
                await self.handle_drone_connect(websocket, message_data)
            elif message_type == 'drone_disconnect':
                await self.handle_drone_disconnect(websocket, message_data)
            elif message_type == 'mission_start':
                await self.handle_mission_start(websocket, message_data)
            elif message_type == 'mission_stop':
                await self.handle_mission_stop(websocket, message_data)
            elif message_type == 'qr_reset':
                await self.handle_qr_reset(websocket, message_data)
            elif message_type == 'ai_test':
                await self.handle_ai_test(websocket, message_data)
            elif message_type == 'heartbeat':
                await self.handle_heartbeat(websocket, message_data)
            elif message_type == 'connection_test':
                await self.handle_connection_test(websocket, message_data)
            else:
                print(f"⚠️ 未知消息类型: {message_type}")

        except json.JSONDecodeError:
            print("❌ WebSocket消息JSON解析失败")
            await self.send_error(websocket, "消息格式错误")
        except Exception as e:
            print(f"❌ 处理WebSocket消息失败: {e}")
            await self.send_error(websocket, str(e))

    async def handle_qr_reset(self, websocket, data):
        """处理QR码检测重置"""
        try:
            self.processed_qr_data.clear()
            self.detection_cooldown.clear()
            await self.broadcast_message('status_update', '🔄 QR码检测已重置')
            print("✅ QR码检测状态已重置")
        except Exception as e:
            print(f"❌ 重置QR码检测失败: {e}")
            await self.send_error(websocket, f"重置失败: {str(e)}")

    async def handle_mission_start(self, websocket, data):
        """处理任务开始"""
        try:
            if not PYZBAR_AVAILABLE:
                await self.send_error(websocket, "QR码检测库未安装，无法启动任务")
                return

            self.drone_state['mission_active'] = True
            self.qr_detection_enabled = True
            self.processed_qr_data.clear()
            self.detection_cooldown.clear()

            await self.broadcast_message('status_update', '🎯 QR码分析任务已启动')
            await self.broadcast_drone_status()

        except Exception as e:
            print(f"❌ 启动任务失败: {e}")
            await self.send_error(websocket, f"启动任务失败: {str(e)}")

    async def handle_ai_test(self, websocket, data):
        """处理AI测试"""
        try:
            if not self.crop_analyzer:
                await self.send_error(websocket, "AI分析器未初始化")
                return

            # 创建测试图像
            test_image = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.circle(test_image, (320, 240), 100, (0, 150, 0), -1)

            await self.broadcast_message('status_update', '🧪 正在进行AI分析测试...')

            result = self.crop_analyzer.analyze_crop_health(test_image)

            if result['status'] == 'ok':
                health_score = result.get('health_score', 0)
                analysis_id = result.get('analysis_id', 'N/A')

                await self.broadcast_message('status_update',
                                             f'✅ AI测试成功 - 评分: {health_score}/100')

                await self.broadcast_message('ai_analysis_complete', {
                    'plant_id': 'TEST-QR',
                    'timestamp': datetime.now().isoformat(),
                    'analysis': result
                })
            else:
                await self.send_error(websocket, f"AI测试失败: {result.get('message', '未知错误')}")

        except Exception as e:
            print(f"❌ AI测试失败: {e}")
            await self.send_error(websocket, f"AI测试失败: {str(e)}")

    # 其他必要的方法保持与原版相同，但移除所有ArUco相关代码
    async def handle_drone_connect(self, websocket, data):
        """处理无人机连接"""
        try:
            if not TELLO_AVAILABLE:
                await self.send_error(websocket, "djitellopy库未安装，无法连接无人机")
                return

            if self.drone is None:
                print("🔌 正在连接无人机...")
                self.drone = Tello()
                self.drone.connect()

                await asyncio.sleep(2)

                try:
                    battery = self.drone.get_battery()
                    self.drone_state.update({
                        'connected': True,
                        'battery': battery
                    })
                except Exception:
                    self.drone_state.update({
                        'connected': True,
                        'battery': 50
                    })

                print("📹 启动视频流...")
                self.drone.streamon()
                await asyncio.sleep(1)

                self.start_video_streaming()

                await self.broadcast_message('status_update',
                                             f'✅ 无人机连接成功，QR码检测就绪')
                await self.broadcast_drone_status()

        except Exception as e:
            print(f"❌ 连接无人机失败: {e}")
            if self.drone:
                try:
                    self.drone.end()
                except:
                    pass
                self.drone = None
            await self.send_error(websocket, f"连接失败: {str(e)}")

    def start_video_streaming(self):
        """启动视频流"""
        if self.video_thread is None or not self.video_thread.is_alive():
            self.video_streaming = True
            self.video_thread = threading.Thread(target=self.video_stream_worker)
            self.video_thread.daemon = True
            self.video_thread.start()
            print("📹 QR码检测视频流已启动")

    def stop_video_streaming(self):
        """停止视频流"""
        self.video_streaming = False
        if self.video_thread and self.video_thread.is_alive():
            self.video_thread.join(timeout=2)
        print("📹 QR码检测视频流已停止")

    # 保持其他必要的方法...
    async def handle_drone_disconnect(self, websocket, data):
        """处理无人机断开"""
        try:
            if self.drone:
                self.stop_video_streaming()
                try:
                    self.drone.streamoff()
                    await asyncio.sleep(0.5)
                    self.drone.end()
                except:
                    pass
                self.drone = None

                self.drone_state.update({
                    'connected': False,
                    'flying': False,
                    'battery': 0,
                    'mission_active': False
                })

                await self.broadcast_message('status_update', '📴 无人机已断开连接')
                await self.broadcast_drone_status()

        except Exception as e:
            await self.send_error(websocket, f"断开失败: {str(e)}")

    async def handle_mission_stop(self, websocket, data):
        """处理任务停止"""
        try:
            self.drone_state['mission_active'] = False
            self.qr_detection_enabled = False
            await self.broadcast_message('status_update', '⏹️ QR码分析任务已停止')
            await self.broadcast_drone_status()
        except Exception as e:
            await self.send_error(websocket, f"停止任务失败: {str(e)}")

    async def handle_heartbeat(self, websocket, data):
        """处理心跳"""
        try:
            await websocket.send(json.dumps({
                'type': 'heartbeat_ack',
                'data': {
                    'server_time': datetime.now().isoformat(),
                    'qr_detection_ready': PYZBAR_AVAILABLE
                }
            }, ensure_ascii=False))
        except Exception as e:
            print(f"❌ 处理心跳失败: {e}")

    async def handle_connection_test(self, websocket, data):
        """处理连接测试"""
        try:
            await websocket.send(json.dumps({
                'type': 'connection_test_ack',
                'data': {
                    'message': 'QR码检测服务连接正常',
                    'server_time': datetime.now().isoformat(),
                    'qr_detection_available': PYZBAR_AVAILABLE
                },
                'timestamp': datetime.now().isoformat()
            }, ensure_ascii=False))
        except Exception as e:
            print(f"❌ 连接测试失败: {e}")

    async def broadcast_message(self, message_type, data=None):
        """广播消息"""
        if not self.connected_clients:
            return

        message = {
            'type': message_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        }

        message_json = json.dumps(message, ensure_ascii=False)
        disconnected_clients = set()

        for client in self.connected_clients:
            try:
                await client.send(message_json)
            except:
                disconnected_clients.add(client)

        self.connected_clients -= disconnected_clients

    async def send_error(self, websocket, error_message):
        """发送错误消息"""
        try:
            await websocket.send(json.dumps({
                'type': 'error',
                'data': {'message': error_message},
                'timestamp': datetime.now().isoformat()
            }, ensure_ascii=False))
        except Exception as e:
            print(f"❌ 发送错误消息失败: {e}")

    async def broadcast_drone_status(self):
        """广播无人机状态"""
        await self.broadcast_message('drone_status', self.drone_state)

    def cleanup(self):
        """清理资源"""
        print("🧹 清理QR码检测服务资源...")
        self.is_running = False
        self.stop_video_streaming()

        if self.drone:
            try:
                self.drone.streamoff()
                self.drone.end()
            except:
                pass
            self.drone = None

        for client in self.connected_clients.copy():
            try:
                asyncio.create_task(client.close())
            except:
                pass
        self.connected_clients.clear()


# 主函数
async def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='专用QR码检测无人机后端')
    parser.add_argument('--ws-port', type=int, default=3002, help='WebSocket服务端口')
    parser.add_argument('--debug', action='store_true', help='启用调试模式')

    args = parser.parse_args()

    print("🔍 专用QR码检测无人机系统后端服务")
    print("=" * 50)
    print(f"WebSocket端口: {args.ws_port}")
    print(f"QR码检测库: {'✅ 已安装' if PYZBAR_AVAILABLE else '❌ 未安装'}")
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    if not PYZBAR_AVAILABLE:
        print("\n⚠️ 重要提醒：pyzbar库未安装！")
        print("QR码检测功能将不可用")
        print("解决方案：pip install pyzbar")
        print("Windows用户可能还需要：pip install zbar-py")

    print("=" * 50)

    backend = QRDroneBackendService(ws_port=args.ws_port)

    try:
        server = await backend.start_websocket_server()
        print("✅ QR码检测服务启动成功")
        print("🔌 等待客户端连接...")
        await server.wait_closed()

    except KeyboardInterrupt:
        print("\n\n⏹️ 收到停止信号，正在关闭服务...")
    except Exception as e:
        print(f"\n\n❌ 服务运行错误: {e}")
        traceback.print_exc()
    finally:
        backend.cleanup()
        print("👋 QR码检测服务已停止")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n服务被用户中断")
    except Exception as e:
        print(f"启动失败: {e}")
        traceback.print_exc()