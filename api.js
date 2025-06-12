/**
 * API通信模块 - 修复版本
 * 只连接Python后端WebSocket服务，避免冲突
 */
class APIManager {
    constructor() {
        this.wsUrl = 'ws://localhost:3002';  // 只连接Python后端
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 8;
        this.reconnectDelay = 2000;
        this.connectionTimeout = 5000;
        this.isConnecting = false;
        this.messageQueue = [];
        this.heartbeatInterval = null;

        console.log('🔌 初始化API管理器 - 连接Python后端');

        // 等待页面加载完成后初始化连接
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.initWebSocket(), 1000);
            });
        } else {
            setTimeout(() => this.initWebSocket(), 1000);
        }
    }

    /**
     * 初始化WebSocket连接到Python后端
     */
    initWebSocket() {
        if (this.isConnecting) {
            console.log('🔄 WebSocket连接正在进行中...');
            return;
        }

        this.isConnecting = true;
        console.log(`🔌 连接Python后端WebSocket: ${this.wsUrl} (尝试 ${this.reconnectAttempts + 1})`);

        try {
            this.websocket = new WebSocket(this.wsUrl);

            // 设置连接超时
            const connectionTimeout = setTimeout(() => {
                if (this.websocket.readyState === WebSocket.CONNECTING) {
                    console.log('⏰ 连接Python后端超时');
                    this.websocket.close();
                    this.handleConnectionFailure('连接超时');
                }
            }, this.connectionTimeout);

            this.websocket.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log('✅ Python后端WebSocket连接成功');
                this.isConnecting = false;
                this.reconnectAttempts = 0;

                this.updateConnectionStatus(true);
                this.processMessageQueue();
                this.startHeartbeat();

                // 发送连接确认
                this.sendMessage('connection_test', {
                    client_type: 'electron_frontend',
                    timestamp: new Date().toISOString()
                });
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('❌ Python后端消息解析失败:', error);
                }
            };

            this.websocket.onclose = (event) => {
                clearTimeout(connectionTimeout);
                this.isConnecting = false;
                this.stopHeartbeat();

                console.log(`📴 Python后端连接关闭 (代码: ${event.code})`);
                this.updateConnectionStatus(false);

                // 如果不是正常关闭，尝试重连
                if (event.code !== 1000) {
                    this.handleConnectionFailure(`连接关闭: ${event.code}`);
                }
            };

            this.websocket.onerror = (error) => {
                clearTimeout(connectionTimeout);
                this.isConnecting = false;
                console.error('❌ Python后端WebSocket错误:', error);
                this.updateConnectionStatus(false);
            };

        } catch (error) {
            this.isConnecting = false;
            console.error('❌ WebSocket初始化失败:', error);
            this.handleConnectionFailure(error.message);
        }
    }

    /**
     * 处理连接失败
     */
    handleConnectionFailure(reason) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(this.reconnectDelay * Math.pow(1.2, this.reconnectAttempts - 1), 10000);

            console.log(`🔄 Python后端重连 ${this.reconnectAttempts}/${this.maxReconnectAttempts}，${delay}ms后重试`);
            console.log(`   失败原因: ${reason}`);

            if (window.ui) {
                ui.addLog('warning', `Python后端重连中... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            }

            setTimeout(() => {
                this.initWebSocket();
            }, delay);
        } else {
            console.error('❌ Python后端重连失败，已达到最大尝试次数');
            this.showConnectionError();
        }
    }

    /**
     * 显示连接错误
     */
    showConnectionError() {
        if (window.ui) {
            ui.addLog('error', '无法连接到Python后端服务');
            ui.addLog('error', '请确保Python后端正在运行：python drone_backend.py');
            ui.addLog('warning', '检查依赖：pip install djitellopy opencv-python websockets');
            ui.showNotification('Python后端连接失败，无人机功能不可用', 'error');
        }
    }

    /**
     * 处理来自Python后端的消息
     */
    handleMessage(data) {
        console.log('📨 收到Python后端消息:', data.type);

        switch (data.type) {
            case 'connection_established':
                console.log('🤝 Python后端连接确认');
                if (window.ui) {
                    ui.addLog('success', '🐍 Python后端连接已建立');
                }
                break;

            case 'status_update':
                if (window.ui) {
                    ui.addLog('info', data.data);
                }
                break;

            case 'drone_status':
                this.updateDroneStatus(data.data);
                break;

            case 'video_frame':
                if (window.videoManager && data.data && data.data.frame) {
                    videoManager.updateFrame(data.data.frame);
                    if (data.data.fps) {
                        videoManager.fps = data.data.fps;
                    }
                }
                break;

            case 'qr_detected':
                this.handleQRDetection(data.data.qr_info);
                break;

            case 'ai_analysis_complete':
                if (window.reportManager) {
                    reportManager.displayAnalysis(data.data);
                }
                break;

            case 'error':
                if (window.ui) {
                    ui.addLog('error', data.data.message || data.data);
                }
                break;

            case 'heartbeat_ack':
                console.log('💓 Python后端心跳响应');
                break;

            default:
                console.log('❓ 未知Python后端消息类型:', data.type);
        }
    }

    /**
     * 发送消息到Python后端
     */
    sendMessage(type, data = {}) {
        const message = {
            type,
            data,
            timestamp: new Date().toISOString()
        };

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            try {
                this.websocket.send(JSON.stringify(message));
                console.log(`📤 发送到Python后端: ${type}`);
                return true;
            } catch (error) {
                console.error('❌ 发送消息到Python后端失败:', error);
                return false;
            }
        } else {
            // 将消息加入队列
            this.messageQueue.push(message);
            console.log(`📦 消息已排队等待Python后端连接: ${type}`);

            if (window.ui) {
                ui.addLog('warning', `Python后端未连接，消息已排队: ${type}`);
            }
            return false;
        }
    }

    /**
     * 处理消息队列
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendMessage(message.type, message.data);
        }

        if (this.messageQueue.length > 0) {
            console.log(`📦 处理了排队消息，剩余: ${this.messageQueue.length}`);
        }
    }

    /**
     * 启动心跳检测
     */
    startHeartbeat() {
        this.stopHeartbeat(); // 清除旧的心跳

        this.heartbeatInterval = setInterval(() => {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.sendMessage('heartbeat', {
                    timestamp: new Date().toISOString(),
                    client_id: 'electron_frontend'
                });
            }
        }, 30000); // 30秒心跳
    }

    /**
     * 停止心跳检测
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * 无人机控制API - 发送到Python后端
     */
    async connectDrone() {
        if (window.ui) {
            ui.addLog('info', '🔌 正在连接RoboMaster TT无人机...');
        }
        return this.sendMessage('drone_connect');
    }

    async disconnectDrone() {
        if (window.ui) {
            ui.addLog('info', '📴 正在断开无人机连接...');
        }
        return this.sendMessage('drone_disconnect');
    }

    async takeoff() {
        if (window.ui) {
            ui.addLog('info', '🚁 正在起飞...');
        }
        return this.sendMessage('drone_takeoff');
    }

    async land() {
        if (window.ui) {
            ui.addLog('info', '🛬 正在降落...');
        }
        return this.sendMessage('drone_land');
    }

    /**
     * 任务控制API
     */
    async startMission(params = {}) {
        if (window.ui) {
            ui.addLog('info', '🎯 正在启动AI分析任务...');
        }
        return this.sendMessage('mission_start', params);
    }

    async stopMission() {
        if (window.ui) {
            ui.addLog('info', '⏹️ 正在停止任务...');
        }
        return this.sendMessage('mission_stop');
    }

    /**
     * AI功能API
     */
    async testAI() {
        if (window.ui) {
            ui.addLog('info', '🧪 正在测试AI分析功能...');
        }
        return this.sendMessage('ai_test');
    }

    async resetQRDetection() {
        if (window.ui) {
            ui.addLog('info', '🔄 正在重置二维码检测...');
        }
        return this.sendMessage('qr_reset');
    }

    /**
     * 配置管理 - 使用localStorage（避免依赖后端）
     */
    async saveConfig(config) {
        try {
            // 保存到localStorage
            localStorage.setItem('drone_config', JSON.stringify({
                ...config,
                saved_time: new Date().toISOString()
            }));

            if (window.ui) {
                ui.addLog('success', '✅ 配置已保存到本地存储');
            }

            // 如果后端连接，也发送到后端
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.sendMessage('config_update', config);
            }

            return { success: true };
        } catch (error) {
            console.error('❌ 保存配置失败:', error);
            if (window.ui) {
                ui.addLog('error', '❌ 保存配置失败');
            }
            throw error;
        }
    }

    async getConfig() {
        try {
            const configStr = localStorage.getItem('drone_config');
            if (configStr) {
                const config = JSON.parse(configStr);
                console.log('📖 从本地存储加载配置');
                return config;
            } else {
                console.log('📖 使用默认配置');
                return {
                    dashscope_api_key: "",
                    dashscope_app_id: "",
                    note: "请填写正确的阿里云百炼API配置"
                };
            }
        } catch (error) {
            console.error('❌ 获取配置失败:', error);
            return {
                dashscope_api_key: "",
                dashscope_app_id: "",
                error: "配置加载失败"
            };
        }
    }

    /**
     * 更新无人机状态
     */
    updateDroneStatus(status) {
        console.log('📊 无人机状态更新:', status);

        if (window.ui) {
            if (typeof status.connected !== 'undefined') {
                ui.updateDroneConnectionStatus(status.connected);
            }

            if (typeof status.flying !== 'undefined') {
                ui.updateFlightStatus(status.flying);
            }

            if (typeof status.battery !== 'undefined') {
                ui.updateBatteryLevel(status.battery);
            }

            if (typeof status.mission_active !== 'undefined') {
                ui.updateMissionStatus(status.mission_active);
            }

            if (typeof status.wifi_signal !== 'undefined') {
                ui.addLog('info', `📶 WiFi信号强度: ${status.wifi_signal}`);
            }

            if (typeof status.temperature !== 'undefined') {
                ui.addLog('info', `🌡️ 无人机温度: ${status.temperature}°C`);
            }
        }
    }

    /**
     * 处理二维码检测
     */
    handleQRDetection(qrInfo) {
        console.log('🔍 检测到ArUco码:', qrInfo);
        if (window.ui) {
            ui.addLog('info', `🎯 检测到植株ID: ${qrInfo.id}，准备AI分析`);
            ui.updateQRStatus(`检测到: ${qrInfo.id}`);
        }

        // 更新视频管理器的QR检测状态
        if (window.videoManager) {
            videoManager.setQRDetection(qrInfo);
        }
    }

    /**
     * 更新连接状态
     */
    updateConnectionStatus(connected) {
        console.log(`📊 Python后端连接状态:`, connected);

        if (window.ui) {
            ui.updateWebSocketStatus(connected);
            ui.updateBackendStatus(connected);
        }
    }

    /**
     * 获取连接状态
     */
    getConnectionStatus() {
        return {
            websocket: this.websocket && this.websocket.readyState === WebSocket.OPEN,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            queuedMessages: this.messageQueue.length,
            backend: 'python'
        };
    }

    /**
     * 手动重连Python后端
     */
    reconnect() {
        console.log('🔄 手动重连Python后端...');
        if (this.websocket) {
            this.websocket.close();
        }
        this.reconnectAttempts = 0;
        setTimeout(() => this.initWebSocket(), 1000);
    }

    /**
     * 测试连接
     */
    async testConnection() {
        console.log('🧪 测试Python后端连接...');

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.sendMessage('connection_test', {
                test_time: new Date().toISOString()
            });
            return true;
        } else {
            console.log('❌ Python后端未连接');
            return false;
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        console.log('🧹 清理API管理器资源...');

        this.stopHeartbeat();

        if (this.websocket) {
            this.websocket.close(1000, 'Client shutdown');
            this.websocket = null;
        }

        this.messageQueue = [];
    }
}

// 创建全局API管理器实例
console.log('🚀 初始化API管理器...');
const api = new APIManager();

// 导出API管理器
window.api = api;

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (api && api.cleanup) {
        api.cleanup();
    }
});