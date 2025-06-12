/**
 * 主应用程序文件
 * 整合所有模块，初始化应用程序
 */
class DroneAnalyzerApp {
    constructor() {
        this.isInitialized = false;
        this.connectionCheckInterval = null;
        this.heartbeatInterval = null;
        this.init();
    }

    /**
     * 初始化应用程序
     */
    async init() {
        try {
            ui.addLog('info', '正在初始化无人机农作物AI分析系统...');

            // 检查所有模块是否已加载
            await this.waitForModules();

            // 初始化应用程序状态
            this.initializeState();

            // 启动连接检查
            this.startConnectionCheck();

            // 启动心跳检测
            this.startHeartbeat();

            // 绑定全局事件
            this.bindGlobalEvents();

            // 加载保存的配置
            await this.loadSavedConfig();

            this.isInitialized = true;
            ui.addLog('success', '系统初始化完成');

            // 显示欢迎信息
            this.showWelcomeMessage();

        } catch (error) {
            console.error('应用程序初始化失败:', error);
            ui.addLog('error', `初始化失败: ${error.message}`);
            this.showInitializationError(error);
        }
    }

    /**
     * 等待所有模块加载完成
     */
    async waitForModules() {
        const requiredModules = ['api', 'ui', 'videoManager', 'reportManager'];
        const maxWaitTime = 10000; // 10秒超时
        const checkInterval = 100; // 检查间隔100ms

        let waitTime = 0;

        while (waitTime < maxWaitTime) {
            const allLoaded = requiredModules.every(module => window[module] !== undefined);

            if (allLoaded) {
                console.log('所有模块已加载完成');
                return;
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitTime += checkInterval;
        }

        throw new Error('模块加载超时');
    }

    /**
     * 初始化应用程序状态
     */
    initializeState() {
        // 设置初始状态
        ui.state = {
            droneConnected: false,
            flying: false,
            missionActive: false,
            aiReady: false,
            batteryLevel: 0,
            analyzedCount: 0
        };

        ui.updateUI();
    }

    /**
     * 启动连接检查
     */
    startConnectionCheck() {
        this.connectionCheckInterval = setInterval(async () => {
            try {
                // 检查后端服务连接状态
                const response = await fetch('http://localhost:3001/api/health', {
                    method: 'GET',
                    timeout: 3000
                });

                if (response.ok) {
                    ui.updateBackendStatus(true);
                } else {
                    ui.updateBackendStatus(false);
                }
            } catch (error) {
                ui.updateBackendStatus(false);
            }
        }, 5000); // 每5秒检查一次
    }

    /**
     * 启动心跳检测
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (api.websocket && api.websocket.readyState === WebSocket.OPEN) {
                api.sendWebSocketMessage('heartbeat', {
                    timestamp: new Date().toISOString(),
                    client_id: 'electron_frontend'
                });
            }
        }, 30000); // 每30秒发送一次心跳
    }

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // 窗口关闭事件
        window.addEventListener('beforeunload', (e) => {
            this.cleanup();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // 错误处理
        window.addEventListener('error', (e) => {
            console.error('全局错误:', e.error);
            ui.addLog('error', `系统错误: ${e.error.message}`);
        });

        // Promise错误处理
        window.addEventListener('unhandledrejection', (e) => {
            console.error('未处理的Promise错误:', e.reason);
            ui.addLog('error', `异步错误: ${e.reason}`);
        });

        // 网络状态监测
        window.addEventListener('online', () => {
            ui.addLog('success', '网络连接已恢复');
        });

        window.addEventListener('offline', () => {
            ui.addLog('warning', '网络连接已断开');
        });
    }

    /**
     * 处理键盘快捷键
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + R: 重置二维码检测
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            if (ui.state.droneConnected) {
                api.resetQRDetection();
            }
        }

        // Ctrl/Cmd + S: 截图
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (videoManager.isStreaming) {
                videoManager.takeScreenshot();
            }
        }

        // F11: 全屏
        if (e.key === 'F11') {
            e.preventDefault();
            videoManager.toggleFullscreen();
        }

        // Ctrl/Cmd + E: 导出报告
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            reportManager.exportReports();
        }

        // Ctrl/Cmd + T: 测试AI
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            api.testAI();
        }

        // 空格键: 起飞/降落切换
        if (e.key === ' ' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            if (ui.state.droneConnected) {
                if (ui.state.flying) {
                    api.land();
                } else {
                    api.takeoff();
                }
            }
        }
    }

    /**
     * 加载保存的配置
     */
    async loadSavedConfig() {
        try {
            const config = await api.getConfig();

            if (config.dashscope_api_key && config.dashscope_app_id) {
                ui.state.aiReady = true;
                ui.updateUI();
                ui.addLog('success', 'AI配置已加载');
            } else {
                ui.addLog('warning', '未找到AI配置，请先配置API密钥');
                this.showConfigReminder();
            }
        } catch (error) {
            console.error('加载配置失败:', error);
            ui.addLog('warning', '配置文件加载失败，使用默认设置');
        }
    }

    /**
     * 显示配置提醒
     */
    showConfigReminder() {
        setTimeout(() => {
            const reminder = document.createElement('div');
            reminder.className = 'config-reminder';
            reminder.innerHTML = `
                <div class="reminder-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>AI配置提醒</h3>
                    <p>检测到您还没有配置阿里云百炼API密钥</p>
                    <p>请点击"AI配置"按钮进行设置以启用AI分析功能</p>
                    <button onclick="this.parentElement.parentElement.remove(); ui.showConfigModal();" class="btn btn-primary">
                        <i class="fas fa-cog"></i> 立即配置
                    </button>
                    <button onclick="this.parentElement.parentElement.remove();" class="btn btn-secondary">
                        稍后配置
                    </button>
                </div>
            `;

            document.body.appendChild(reminder);

            // 自动消失
            setTimeout(() => {
                if (document.body.contains(reminder)) {
                    reminder.remove();
                }
            }, 10000);

        }, 2000);
    }

    /**
     * 显示欢迎消息
     */
    showWelcomeMessage() {
        const welcomeMessages = [
            '🚁 欢迎使用无人机农作物AI分析系统',
            '🤖 基于阿里云百炼AI技术驱动',
            '🌱 支持作物识别、病害诊断、健康评估',
            '📊 提供专业的农业分析报告',
            '🔧 请连接无人机开始使用'
        ];

        welcomeMessages.forEach((message, index) => {
            setTimeout(() => {
                ui.addLog('info', message);
            }, index * 800);
        });
    }

    /**
     * 显示初始化错误
     */
    showInitializationError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'initialization-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-times-circle"></i>
                <h2>系统初始化失败</h2>
                <p>无法启动无人机农作物AI分析系统</p>
                <div class="error-details">
                    <strong>错误信息:</strong> ${error.message}
                </div>
                <div class="error-actions">
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-refresh"></i> 重新加载
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-secondary">
                        关闭
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(errorDiv);
    }

    /**
     * 处理应用程序生命周期事件
     */
    onDroneConnected() {
        ui.addLog('success', '无人机连接成功');
        videoManager.startStream();

        // 启动状态监控
        this.startDroneMonitoring();
    }

    onDroneDisconnected() {
        ui.addLog('info', '无人机已断开连接');
        videoManager.stopStream();

        // 停止状态监控
        this.stopDroneMonitoring();
    }

    onMissionStarted() {
        ui.addLog('success', 'AI分析任务已启动');

        // 启动任务监控
        this.startMissionMonitoring();
    }

    onMissionCompleted() {
        ui.addLog('success', 'AI分析任务已完成');

        // 停止任务监控
        this.stopMissionMonitoring();

        // 显示统计信息
        this.showMissionStatistics();
    }

    /**
     * 启动无人机监控
     */
    startDroneMonitoring() {
        this.droneMonitorInterval = setInterval(() => {
            // 请求无人机状态更新
            api.sendWebSocketMessage('get_drone_status');
        }, 2000);
    }

    /**
     * 停止无人机监控
     */
    stopDroneMonitoring() {
        if (this.droneMonitorInterval) {
            clearInterval(this.droneMonitorInterval);
            this.droneMonitorInterval = null;
        }
    }

    /**
     * 启动任务监控
     */
    startMissionMonitoring() {
        this.missionMonitorInterval = setInterval(() => {
            // 请求任务进度更新
            api.sendWebSocketMessage('get_mission_progress');
        }, 1000);
    }

    /**
     * 停止任务监控
     */
    stopMissionMonitoring() {
        if (this.missionMonitorInterval) {
            clearInterval(this.missionMonitorInterval);
            this.missionMonitorInterval = null;
        }
    }

    /**
     * 显示任务统计信息
     */
    showMissionStatistics() {
        const stats = reportManager.getReportStats();

        ui.addLog('info', '=== 任务完成统计 ===');
        ui.addLog('info', `总分析植株: ${stats.totalReports} 株`);
        ui.addLog('info', `平均健康评分: ${stats.avgHealthScore}/100`);

        if (stats.mostCommonIssues.length > 0) {
            ui.addLog('info', `最常见问题: ${stats.mostCommonIssues[0].type} (${stats.mostCommonIssues[0].count}次)`);
        }

        const urgency = stats.urgencyDistribution;
        ui.addLog('info', `紧急程度分布: 低=${urgency.low}, 中=${urgency.medium}, 高=${urgency.high}`);
    }

    /**
     * 处理应用程序错误
     */
    handleError(error, context = '') {
        console.error(`应用程序错误 ${context}:`, error);

        const errorMessage = error.message || error.toString();
        ui.addLog('error', `${context} ${errorMessage}`);

        // 发送错误报告（如果需要）
        this.reportError(error, context);
    }

    /**
     * 发送错误报告
     */
    reportError(error, context) {
        try {
            const errorReport = {
                timestamp: new Date().toISOString(),
                context: context,
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                },
                userAgent: navigator.userAgent,
                url: window.location.href,
                state: {
                    droneConnected: ui.state.droneConnected,
                    flying: ui.state.flying,
                    missionActive: ui.state.missionActive,
                    aiReady: ui.state.aiReady
                }
            };

            // 可以发送到后端进行错误统计
            api.sendWebSocketMessage('error_report', errorReport);

        } catch (reportError) {
            console.error('发送错误报告失败:', reportError);
        }
    }

    /**
     * 获取应用程序状态
     */
    getAppStatus() {
        return {
            initialized: this.isInitialized,
            modules: {
                api: typeof window.api !== 'undefined',
                ui: typeof window.ui !== 'undefined',
                videoManager: typeof window.videoManager !== 'undefined',
                reportManager: typeof window.reportManager !== 'undefined'
            },
            drone: ui.state,
            video: videoManager.getStats(),
            reports: reportManager.getReportStats()
        };
    }

    /**
     * 执行系统诊断
     */
    async runDiagnostics() {
        ui.addLog('info', '开始系统诊断...');

        const diagnostics = {
            modules: this.checkModules(),
            network: await this.checkNetworkConnectivity(),
            backend: await this.checkBackendServices(),
            ai: await this.checkAIServices(),
            config: await this.checkConfiguration()
        };

        this.displayDiagnosticResults(diagnostics);
        return diagnostics;
    }

    /**
     * 检查模块状态
     */
    checkModules() {
        const modules = ['api', 'ui', 'videoManager', 'reportManager'];
        const results = {};

        modules.forEach(module => {
            results[module] = typeof window[module] !== 'undefined';
        });

        return results;
    }

    /**
     * 检查网络连接
     */
    async checkNetworkConnectivity() {
        try {
            const response = await fetch('https://httpbin.org/ip', {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查后端服务
     */
    async checkBackendServices() {
        try {
            const response = await fetch('http://localhost:3001/api/health');
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查AI服务
     */
    async checkAIServices() {
        try {
            const config = await api.getConfig();
            return !!(config.dashscope_api_key && config.dashscope_app_id);
        } catch (error) {
            return false;
        }
    }

    /**
     * 检查配置
     */
    async checkConfiguration() {
        try {
            const config = await api.getConfig();
            return {
                hasApiKey: !!config.dashscope_api_key,
                hasAppId: !!config.dashscope_app_id,
                configComplete: !!(config.dashscope_api_key && config.dashscope_app_id)
            };
        } catch (error) {
            return {
                hasApiKey: false,
                hasAppId: false,
                configComplete: false
            };
        }
    }

    /**
     * 显示诊断结果
     */
    displayDiagnosticResults(diagnostics) {
        ui.addLog('info', '=== 系统诊断结果 ===');

        // 模块检查
        const moduleStatus = Object.entries(diagnostics.modules)
            .map(([name, status]) => `${name}: ${status ? '✓' : '✗'}`)
            .join(', ');
        ui.addLog('info', `模块状态: ${moduleStatus}`);

        // 网络状态
        ui.addLog('info', `网络连接: ${diagnostics.network ? '✓ 正常' : '✗ 异常'}`);

        // 后端服务
        ui.addLog('info', `后端服务: ${diagnostics.backend ? '✓ 正常' : '✗ 异常'}`);

        // AI服务
        ui.addLog('info', `AI配置: ${diagnostics.ai ? '✓ 已配置' : '✗ 未配置'}`);

        // 配置状态
        const config = diagnostics.config;
        ui.addLog('info', `配置完整性: ${config.configComplete ? '✓ 完整' : '✗ 不完整'}`);
    }

    /**
     * 清理资源
     */
    cleanup() {
        console.log('开始清理应用程序资源...');

        // 清理定时器
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if (this.droneMonitorInterval) {
            clearInterval(this.droneMonitorInterval);
        }

        if (this.missionMonitorInterval) {
            clearInterval(this.missionMonitorInterval);
        }

        // 清理API连接
        if (api && api.cleanup) {
            api.cleanup();
        }

        // 停止视频流
        if (videoManager && videoManager.isStreaming) {
            videoManager.stopStream();
        }

        console.log('应用程序资源清理完成');
    }
}

// 等待DOM加载完成后初始化应用程序
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，开始初始化应用程序...');

    // 创建全局应用程序实例
    window.app = new DroneAnalyzerApp();
});

// 导出应用程序类供其他模块使用
window.DroneAnalyzerApp = DroneAnalyzerApp;