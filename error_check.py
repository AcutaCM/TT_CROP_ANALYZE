# 在你的 qr_drone_backend.py 文件中找到 init_ai_analyzer 方法，替换为以下内容：
import os

from cropFactory.crop_analyzer_dashscope import CropAnalyzer


def init_ai_analyzer(self, ANALYZER_AVAILABLE=None):
    """初始化AI分析器 - 增强调试版本"""
    print("🔧 开始初始化AI分析器...")

    try:
        # 检查模块是否可用
        if not ANALYZER_AVAILABLE:
            print("❌ AI分析器模块不可用 - 检查导入")
            print("请确保 crop_analyzer_dashscope.py 文件在正确位置")
            return

        print("✅ AI分析器模块导入成功")

        # 从环境变量获取API配置
        api_key = os.getenv('DASHSCOPE_API_KEY')
        app_id = os.getenv('DASHSCOPE_APP_ID')

        print(f"环境变量 API Key: {'✅ 已设置' if api_key else '❌ 未设置'}")
        print(f"环境变量 App ID: {'✅ 已设置' if app_id else '❌ 未设置'}")

        # 从配置文件获取API配置
        if not api_key or not app_id:
            config_path = os.path.join(os.path.dirname(__file__), 'config.json')
            print(f"尝试从配置文件加载: {config_path}")

            if os.path.exists(config_path):
                print("✅ 配置文件存在")
                try:
                    with open(config_path, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                        api_key = api_key or config.get('dashscope_api_key')
                        app_id = app_id or config.get('dashscope_app_id')

                    print(f"配置文件 API Key: {'✅ 已设置' if api_key else '❌ 未设置'}")
                    print(f"配置文件 App ID: {'✅ 已设置' if app_id else '❌ 未设置'}")

                except Exception as config_error:
                    print(f"❌ 读取配置文件失败: {config_error}")
            else:
                print("❌ 配置文件不存在，创建默认配置...")
                self.create_default_config(config_path)

        # 验证API配置
        if api_key and app_id:
            # 检查是否是默认值
            if api_key in ['', 'your-api-key-here', 'test-key']:
                print("⚠️ 检测到默认API密钥，将使用模拟模式")
                api_key = 'simulation_mode'

            if app_id in ['', 'your-app-id-here', 'test-app']:
                print("⚠️ 检测到默认App ID，将使用模拟模式")
                app_id = 'simulation_mode'

            try:
                print("🤖 正在创建AI分析器实例...")
                self.crop_analyzer = CropAnalyzer(api_key=api_key, app_id=app_id)
                print("✅ AI分析器初始化成功")

                # 测试分析器
                print("🧪 测试AI分析器功能...")
                import numpy as np
                test_image = np.zeros((100, 100, 3), dtype=np.uint8)
                test_result = self.crop_analyzer.analyze_crop_health(test_image)

                if test_result.get('status') == 'ok':
                    print("✅ AI分析器功能测试成功")
                else:
                    print(f"⚠️ AI分析器测试返回: {test_result.get('message', '未知状态')}")

            except Exception as analyzer_error:
                print(f"❌ 创建AI分析器失败: {analyzer_error}")
                import traceback
                traceback.print_exc()
                self.crop_analyzer = None
        else:
            print("❌ API配置不完整，AI分析器将不可用")
            print("解决方案:")
            print("1. 设置环境变量:")
            print("   export DASHSCOPE_API_KEY='your-key'")
            print("   export DASHSCOPE_APP_ID='your-app-id'")
            print("2. 或在config.json中设置API密钥")
            self.crop_analyzer = None

    except Exception as e:
        print(f"❌ AI分析器初始化过程异常: {e}")
        import traceback
        traceback.print_exc()
        self.crop_analyzer = None


def create_default_config(self, config_path):
    """创建默认配置文件"""
    try:
        default_config = {
            "dashscope_api_key": "your-dashscope-api-key-here",
            "dashscope_app_id": "your-dashscope-app-id-here",
            "note": "请填写正确的阿里云百炼API配置",
            "instructions": [
                "1. 注册阿里云账号",
                "2. 开通百炼服务",
                "3. 获取API Key和App ID",
                "4. 填写到此配置文件中"
            ],
            "created_time": datetime.now().isoformat()
        }

        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=4, ensure_ascii=False)
        print(f"✅ 已创建默认配置文件: {config_path}")

    except Exception as e:
        print(f"❌ 创建配置文件失败: {e}")


# 同时，修改 handle_ai_test 方法，添加更详细的错误信息：

async def handle_ai_test(self, websocket, data):
    """处理AI测试 - 增强调试版本"""
    try:
        print("🧪 开始AI测试...")
        print(f"AI分析器状态: {self.crop_analyzer is not None}")

        if not self.crop_analyzer:
            error_msg = "AI分析器未初始化。可能的原因："
            reasons = [
                "1. crop_analyzer_dashscope.py 文件不存在或导入失败",
                "2. API配置未正确设置",
                "3. 依赖库缺失",
                "4. 初始化过程中发生错误"
            ]
            full_error = error_msg + "\n" + "\n".join(reasons)

            await self.send_error(websocket, full_error)
            print("❌ AI测试失败 - 分析器未初始化")

            # 尝试重新初始化
            print("🔄 尝试重新初始化AI分析器...")
            self.init_ai_analyzer()

            if self.crop_analyzer:
                print("✅ 重新初始化成功，继续测试...")
            else:
                print("❌ 重新初始化失败")
                return

        # 创建测试图像
        test_image = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.circle(test_image, (320, 240), 100, (0, 150, 0), -1)

        await self.broadcast_message('status_update', '🧪 正在进行AI分析测试...')

        print("🤖 调用AI分析器...")
        result = self.crop_analyzer.analyze_crop_health(test_image)
        print(f"AI分析结果: {result}")

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

            print("✅ AI测试完全成功")
        else:
            error_message = result.get('message', '未知错误')
            await self.send_error(websocket, f"AI测试失败: {error_message}")
            print(f"❌ AI测试失败: {error_message}")

    except Exception as e:
        print(f"❌ AI测试异常: {e}")
        import traceback
        traceback.print_exc()
        await self.send_error(websocket, f"AI测试异常: {str(e)}")