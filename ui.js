/**
 * UI管理模块
 * 负责界面状态更新和用户交互
 */
class UIManager {
    constructor() {
        this.elements = {};
        this.state = {
            droneConnected: false,
            flying: false,
            missionActive: false,
            aiReady: false,
            batteryLevel: 0,
            analyzedCount: 0,
            backendConnected: false,
            websocketConnected: false
        };

        this.initElements();
        this.bindEvents();
        this.updateUI();
    }

    /**
     * 初始化DOM元素引用
     */
    initElements() {
        // 按钮元素
        this.elements.connectBtn = document.getElementById('connect-btn');
        this.elements.disconnectBtn = document.getElementById('disconnect-btn');
        this.elements.takeoffBtn = document.getElementById('takeoff-btn');
        this.elements.landBtn = document.getElementById('land-btn');
        this.elements.startMissionBtn = document.getElementById('start-mission-btn');
        this.elements.stopMissionBtn = document.getElementById('stop-mission-btn');
        this.elements.generateQRBtn = document.getElementById('generate-qr-btn');
        this.elements.resetQRBtn = document.getElementById('reset-qr-btn');
        this.elements.configBtn = document.getElementById('config-btn');
        this.elements.testAIBtn = document.getElementById('test-ai-btn');
        this.elements.clearLogBtn = document.getElementById('clear-log-btn');

        // 状态显示元素
        this.elements.aiStatus = document.getElementById('ai-status');
        this.elements.droneStatus = document.getElementById('drone-status');
        this.elements.missionStatus = document.getElementById('mission-status');
        this.elements.batteryLevel = document.getElementById('battery-level');
        this.elements.analyzedCount = document.getElementById('analyzed-count');
        this.elements.detectionMode = document.getElementById('detection-mode');

        // 视频相关元素
        this.elements.fpsDisplay = document.getElementById('fps-display');
        this.elements.resolutionDisplay = document.getElementById('resolution-display');
        this.elements.qrStatus = document.getElementById('qr-status');
        this.elements.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.elements.screenshotBtn = document.getElementById('screenshot-btn');

        // 日志元素
        this.elements.logContent = document.getElementById('log-content');

        // 报告面板元素
        this.elements.exportReportBtn = document.getElementById('export-report-btn');
        this.elements.clearReportBtn = document.getElementById('clear-report-btn');

        // 模态对话框元素
        this.elements.configModal = document.getElementById('config-modal');
        this.elements.qrModal = document.getElementById('qr-modal');
        this.elements.apiKey = document.getElementById('api-key');
        this.elements.appId = document.getElementById('app-id');
        this.elements.connectionStatus = document.getElementById('connection-status');
        this.elements.testConnectionBtn = document.getElementById('test-connection-btn');
        this.elements.saveConfigBtn = document.getElementById('save-config-btn');

        // 二维码生成元素
        this.elements.plantId = document.getElementById('plant-id');
        this.elements.qrSize = document.getElementById('qr-size');
        this.elements.qrPreview = document.getElementById('qr-preview');
        this.elements.generateQRPreviewBtn = document.getElementById('generate-qr-preview-btn');
        this.elements.saveQRBtn = document.getElementById('save-qr-btn');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 无人机控制按钮
        if (this.elements.connectBtn) {
            this.elements.connectBtn.addEventListener('click', () => this.handleConnect());
        }
        if (this.elements.disconnectBtn) {
            this.elements.disconnectBtn.addEventListener('click', () => this.handleDisconnect());
        }
        if (this.elements.takeoffBtn) {
            this.elements.takeoffBtn.addEventListener('click', () => this.handleTakeoff());
        }
        if (this.elements.landBtn) {
            this.elements.landBtn.addEventListener('click', () => this.handleLand());
        }

        // 任务控制按钮
        if (this.elements.startMissionBtn) {
            this.elements.startMissionBtn.addEventListener('click', () => this.handleStartMission());
        }
        if (this.elements.stopMissionBtn) {
            this.elements.stopMissionBtn.addEventListener('click', () => this.handleStopMission());
        }

        // 工具按钮
        if (this.elements.generateQRBtn) {
            this.elements.generateQRBtn.addEventListener('click', () => this.showModal('qr-modal'));
        }
        if (this.elements.resetQRBtn) {
            this.elements.resetQRBtn.addEventListener('click', () => this.handleResetQR());
        }
        if (this.elements.configBtn) {
            this.elements.configBtn.addEventListener('click', () => this.showConfigModal());
        }
        if (this.elements.testAIBtn) {
            this.elements.testAIBtn.addEventListener('click', () => this.handleTestAI());
        }
        if (this.elements.clearLogBtn) {
            this.elements.clearLogBtn.addEventListener('click', () => this.clearLog());
        }

        // 视频控制按钮
        if (this.elements.fullscreenBtn) {
            this.elements.fullscreenBtn.addEventListener('click', () => {
                if (window.videoManager) {
                    window.videoManager.toggleFullscreen();
                }
            });
        }
        if (this.elements.screenshotBtn) {
            this.elements.screenshotBtn.addEventListener('click', () => {
                if (window.videoManager) {
                    window.videoManager.takeScreenshot();
                }
            });
        }

        // 报告控制按钮
        if (this.elements.exportReportBtn) {
            this.elements.exportReportBtn.addEventListener('click', () => {
                if (window.reportManager) {
                    window.reportManager.exportReports();
                }
            });
        }
        if (this.elements.clearReportBtn) {
            this.elements.clearReportBtn.addEventListener('click', () => {
                if (window.reportManager) {
                    window.reportManager.clearReports();
                }
            });
        }

        // 配置对话框按钮
        if (this.elements.testConnectionBtn) {
            this.elements.testConnectionBtn.addEventListener('click', () => this.testConnection());
        }
        if (this.elements.saveConfigBtn) {
            this.elements.saveConfigBtn.addEventListener('click', () => this.saveConfig());
        }

        // 二维码生成按钮
        if (this.elements.generateQRPreviewBtn) {
            this.elements.generateQRPreviewBtn.addEventListener('click', () => this.generateQRPreview());
        }
        if (this.elements.saveQRBtn) {
            this.elements.saveQRBtn.addEventListener('click', () => this.saveQRCode());
        }

        // 模态对话框关闭事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // ESC键关闭模态对话框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // 快捷键支持
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.handleResetQR();
                        break;
                    case 's':
                        e.preventDefault();
                        if (window.videoManager) {
                            window.videoManager.takeScreenshot();
                        }
                        break;
                    case 'e':
                        e.preventDefault();
                        if (window.reportManager) {
                            window.reportManager.exportReports();
                        }
                        break;
                    case 't':
                        e.preventDefault();
                        this.handleTestAI();
                        break;
                }
            } else if (e.key === 'F11') {
                e.preventDefault();
                if (window.videoManager) {
                    window.videoManager.toggleFullscreen();
                }
            } else if (e.key === ' ' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                if (this.state.droneConnected) {
                    if (this.state.flying) {
                        this.handleLand();
                    } else {
                        this.handleTakeoff();
                    }
                }
            }
        });
    }

    /**
     * 事件处理函数
     */
    async handleConnect() {
        if (!window.api) {
            this.addLog('error', 'API管理器未初始化');
            return;
        }

        this.setButtonLoading(this.elements.connectBtn, true);
        try {
            await window.api.connectDrone();
            this.state.droneConnected = true;
            this.updateUI();
        } catch (error) {
            console.error('连接失败:', error);
        } finally {
            this.setButtonLoading(this.elements.connectBtn, false);
        }
    }

    async handleDisconnect() {
        if (!window.api) {
            this.addLog('error', 'API管理器未初始化');
            return;
        }

        this.setButtonLoading(this.elements.disconnectBtn, true);
        try {
            await window.api.disconnectDrone();
            this.state.droneConnected = false;
            this.state.flying = false;
            this.state.missionActive = false;
            this.updateUI();
        } catch (error) {
            console.error('断开连接失败:', error);
        } finally {
            this.setButtonLoading(this.elements.disconnectBtn, false);
        }
    }

    async handleTakeoff() {
        if (!window.api) {
            this.addLog('error', 'API管理器未初始化');
            return;
        }

        this.setButtonLoading(this.elements.takeoffBtn, true);
        try {
            await window.api.takeoff();
            this.state.flying = true;
            this.updateUI();
        } catch (error) {
            console.error('起飞失败:', error);
        } finally {
            this.setButtonLoading(this.elements.takeoffBtn, false);
        }
    }

    async handleLand() {
        if (!window.api) {
            this.addLog('error', 'API管理器未初始化');
            return;
        }

        this.setButtonLoading(this.elements.landBtn, true);
        try {
            await window.api.land();
            this.state.flying = false;
            this.state.missionActive = false;
            this.updateUI();
        } catch (error) {
            console.error('降落失败:', error);
        } finally {
            this.setButtonLoading(this.elements.landBtn, false);
        }
    }

    async handleStartMission() {
        if (!window.api) {
            this.addLog('error', 'API管理器未初始化');
            return;
        }

        this.setButtonLoading(this.elements.startMissionBtn, true);
        try {
            await window.api.startMission();
            this.state.missionActive = true;
            this.updateUI();
        } catch (error) {
            console.error('启动任务失败:', error);
        } finally {
            this.setButtonLoading(this.elements.startMissionBtn, false);
        }
    }

    async handleStopMission() {
        if (!window.api) {
            this.addLog('error', 'API管理器未初始化');
            return;
        }

        this.setButtonLoading(this.elements.stopMissionBtn, true);
        try {
            await window.api.stopMission();
            this.state.missionActive = false;
            this.updateUI();
        } catch (error) {
            console.error('停止任务失败:', error);
        } finally {
            this.setButtonLoading(this.elements.stopMissionBtn, false);
        }
    }

    async handleResetQR() {
        if (!window.api) {
            this.addLog('error', 'API管理器未初始化');
            return;
        }

        this.setButtonLoading(this.elements.resetQRBtn, true);
        try {
            await window.api.resetQRDetection();
            this.state.analyzedCount = 0;
            this.updateUI();
        } catch (error) {
            console.error('重置失败:', error);
        } finally {
            this.setButtonLoading(this.elements.resetQRBtn, false);
        }
    }

    async handleTestAI() {
        if (!window.api) {
            this.addLog('error', 'API管理器未初始化');
            return;
        }

        this.setButtonLoading(this.elements.testAIBtn, true);
        try {
            await window.api.testAI();
        } catch (error) {
            console.error('AI测试失败:', error);
        } finally {
            this.setButtonLoading(this.elements.testAIBtn, false);
        }
    }

    /**
     * 配置管理
     */
    async showConfigModal() {
        if (!window.api) {
            this.addLog('error', 'API管理器未初始化');
            this.showModal('config-modal');
            return;
        }

        try {
            const config = await window.api.getConfig();
            if (this.elements.apiKey) {
                this.elements.apiKey.value = config.dashscope_api_key || '';
            }
            if (this.elements.appId) {
                this.elements.appId.value = config.dashscope_app_id || '';
            }
            this.showModal('config-modal');
        } catch (error) {
            console.error('获取配置失败:', error);
            this.showModal('config-modal');
        }
    }

    async testConnection() {
        if (!this.elements.apiKey || !this.elements.appId) {
            this.updateConnectionStatus('error', '配置元素未找到');
            return;
        }

        const apiKey = this.elements.apiKey.value.trim();
        const appId = this.elements.appId.value.trim();

        if (!apiKey || !appId) {
            this.updateConnectionStatus('error', '请填写完整的API配置');
            return;
        }

        this.setButtonLoading(this.elements.testConnectionBtn, true);
        this.updateConnectionStatus('testing', '正在测试连接...');

        try {
            // 模拟测试过程
            await new Promise(resolve => setTimeout(resolve, 2000));
            this.updateConnectionStatus('success', '连接测试成功');
        } catch (error) {
            this.updateConnectionStatus('error', `连接失败: ${error.message}`);
        } finally {
            this.setButtonLoading(this.elements.testConnectionBtn, false);
        }
    }

    async saveConfig() {
        if (!window.api || !this.elements.apiKey || !this.elements.appId) {
            this.updateConnectionStatus('error', '必要元素未找到');
            return;
        }

        const config = {
            dashscope_api_key: this.elements.apiKey.value.trim(),
            dashscope_app_id: this.elements.appId.value.trim(),
            updated_time: new Date().toISOString()
        };

        if (!config.dashscope_api_key || !config.dashscope_app_id) {
            this.updateConnectionStatus('error', '请填写完整的API配置');
            return;
        }

        this.setButtonLoading(this.elements.saveConfigBtn, true);
        try {
            await window.api.saveConfig(config);
            this.addLog('success', '配置已保存');
            this.closeModal('config-modal');
            this.state.aiReady = true;
            this.updateUI();
        } catch (error) {
            console.error('保存配置失败:', error);
        } finally {
            this.setButtonLoading(this.elements.saveConfigBtn, false);
        }
    }

    updateConnectionStatus(type, message) {
        if (!this.elements.connectionStatus) return;

        const statusEl = this.elements.connectionStatus;
        statusEl.className = `connection-status ${type}`;

        const icons = {
            testing: 'fa-spinner fa-spin',
            success: 'fa-check-circle',
            error: 'fa-times-circle'
        };

        statusEl.innerHTML = `
            <i class="fas ${icons[type] || 'fa-question-circle'}"></i>
            <span>${message}</span>
        `;
    }

    /**
     * 二维码生成
     */
    generateQRPreview() {
        if (!this.elements.plantId || !this.elements.qrSize || !this.elements.qrPreview) {
            this.addLog('error', '二维码生成元素未找到');
            return;
        }

        const plantId = this.elements.plantId.value;
        const size = this.elements.qrSize.value;

        if (!plantId) {
            this.addLog('error', '请输入植株ID');
            return;
        }

        try {
            // 检查qrcode库是否可用
            if (typeof qrcode === 'undefined') {
                this.addLog('error', '二维码生成库未加载');
                return;
            }

            const qrData = {
                type: 'plant',
                id: parseInt(plantId),
                size: parseFloat(size)
            };

            const qr = qrcode(0, 'H');
            qr.addData(JSON.stringify(qrData));
            qr.make();

            const qrImage = qr.createDataURL(8, 4);

            this.elements.qrPreview.innerHTML = `
                <img src="${qrImage}" alt="二维码预览" class="qr-image">
                <p>植株ID: ${plantId} | 大小: ${size}cm</p>
            `;

            if (this.elements.saveQRBtn) {
                this.elements.saveQRBtn.disabled = false;
                this.elements.saveQRBtn.dataset.qrData = qrImage;
            }

        } catch (error) {
            console.error('生成二维码失败:', error);
            this.addLog('error', '生成二维码失败');
        }
    }

    async saveQRCode() {
        if (!this.elements.saveQRBtn || !this.elements.plantId) {
            this.addLog('error', '保存二维码元素未找到');
            return;
        }

        const qrData = this.elements.saveQRBtn.dataset.qrData;
        const plantId = this.elements.plantId.value;

        if (!qrData) {
            this.addLog('error', '请先生成二维码预览');
            return;
        }

        try {
            const link = document.createElement('a');
            link.download = `plant_${plantId}_qr.png`;
            link.href = qrData;
            link.click();

            this.addLog('success', `二维码已保存: plant_${plantId}_qr.png`);
            this.closeModal('qr-modal');
        } catch (error) {
            console.error('保存二维码失败:', error);
            this.addLog('error', '保存二维码失败');
        }
    }

    /**
     * 状态更新函数
     */
    updateUI() {
        // 更新按钮状态
        if (this.elements.disconnectBtn) {
            this.elements.disconnectBtn.disabled = !this.state.droneConnected;
        }
        if (this.elements.takeoffBtn) {
            this.elements.takeoffBtn.disabled = !this.state.droneConnected || this.state.flying;
        }
        if (this.elements.landBtn) {
            this.elements.landBtn.disabled = !this.state.droneConnected || !this.state.flying;
        }
        if (this.elements.startMissionBtn) {
            this.elements.startMissionBtn.disabled = !this.state.droneConnected || this.state.missionActive;
        }
        if (this.elements.stopMissionBtn) {
            this.elements.stopMissionBtn.disabled = !this.state.missionActive;
        }

        // 更新连接按钮文本
        if (this.elements.connectBtn) {
            this.elements.connectBtn.innerHTML = this.state.droneConnected
                ? '<i class="fas fa-unlink"></i> 已连接'
                : '<i class="fas fa-plug"></i> 连接无人机';
        }

        // 更新状态指示器
        this.updateStatusIndicators();

        // 更新信息显示
        if (this.elements.batteryLevel) {
            this.elements.batteryLevel.textContent = this.state.batteryLevel + '%';
        }
        if (this.elements.analyzedCount) {
            this.elements.analyzedCount.textContent = this.state.analyzedCount;
        }
    }

    updateStatusIndicators() {
        // AI状态
        if (this.elements.aiStatus) {
            const aiStatusText = this.state.aiReady ? 'AI: 就绪' : 'AI: 未配置';
            const aiStatusClass = this.state.aiReady ? 'online' : '';
            this.elements.aiStatus.innerHTML = `<i class="fas fa-robot"></i><span>${aiStatusText}</span>`;
            this.elements.aiStatus.className = `status-item ${aiStatusClass}`;
        }

        // 无人机状态
        if (this.elements.droneStatus) {
            const droneStatusText = this.state.droneConnected ? '无人机: 已连接' : '无人机: 未连接';
            const droneStatusClass = this.state.droneConnected ? 'online' : '';
            this.elements.droneStatus.innerHTML = `<i class="fas fa-helicopter"></i><span>${droneStatusText}</span>`;
            this.elements.droneStatus.className = `status-item ${droneStatusClass}`;
        }

        // 任务状态
        if (this.elements.missionStatus) {
            const missionStatusText = this.state.missionActive ? '任务: 进行中' : '任务: 待机';
            const missionStatusClass = this.state.missionActive ? 'active' : '';
            this.elements.missionStatus.innerHTML = `<i class="fas fa-tasks"></i><span>${missionStatusText}</span>`;
            this.elements.missionStatus.className = `status-item ${missionStatusClass}`;
        }
    }

    updateDroneConnectionStatus(connected) {
        this.state.droneConnected = connected;
        this.updateUI();
    }

    updateFlightStatus(flying) {
        this.state.flying = flying;
        this.updateUI();
    }

    updateMissionStatus(active) {
        this.state.missionActive = active;
        this.updateUI();
    }

    updateAIStatus(ready) {
        this.state.aiReady = ready;
        this.updateUI();
    }

    updateBackendStatus(connected) {
        this.state.backendConnected = connected;
        console.log('后端连接状态:', connected);
        if (connected) {
            this.addLog('success', '后端服务连接成功');
        } else {
            this.addLog('warning', '后端服务连接断开');
        }
    }

    updateWebSocketStatus(connected) {
        this.state.websocketConnected = connected;
        console.log('WebSocket连接状态:', connected);
        if (connected) {
            this.addLog('success', 'WebSocket连接已建立');
        } else {
            this.addLog('warning', 'WebSocket连接已断开');
        }
    }

    updateBatteryLevel(level) {
        this.state.batteryLevel = level;
        this.updateUI();
    }

    updateQRStatus(status) {
        if (this.elements.qrStatus) {
            this.elements.qrStatus.textContent = `二维码: ${status}`;
        }
    }

    updateVideoInfo(fps, resolution) {
        if (this.elements.fpsDisplay) {
            this.elements.fpsDisplay.textContent = `FPS: ${fps}`;
        }
        if (this.elements.resolutionDisplay) {
            this.elements.resolutionDisplay.textContent = `分辨率: ${resolution}`;
        }
    }

    updateMissionProgress(progress) {
        console.log('任务进度:', progress);
        this.addLog('info', `任务进度: ${progress.message || '进行中'}`);
    }

    incrementAnalyzedCount() {
        this.state.analyzedCount++;
        this.updateUI();
    }

    /**
     * 日志管理
     */
    addLog(type, message) {
        if (!this.elements.logContent) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="message">${message}</span>
        `;

        this.elements.logContent.appendChild(logEntry);
        this.elements.logContent.scrollTop = this.elements.logContent.scrollHeight;

        // 限制日志条数
        const entries = this.elements.logContent.children;
        if (entries.length > 100) {
            entries[0].remove();
        }
    }

    clearLog() {
        if (this.elements.logContent) {
            this.elements.logContent.innerHTML = '';
            this.addLog('info', '日志已清空');
        }
    }

    /**
     * 模态对话框管理
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }

    /**
     * 工具函数
     */
    setButtonLoading(button, loading) {
        if (!button) return;

        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
            <span>${message}</span>
        `;

        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        // 添加到页面
        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 获取当前状态信息
     */
    getStatus() {
        return {
            ...this.state,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 重置所有状态
     */
    resetAllStates() {
        this.state = {
            droneConnected: false,
            flying: false,
            missionActive: false,
            aiReady: false,
            batteryLevel: 0,
            analyzedCount: 0,
            backendConnected: false,
            websocketConnected: false
        };
        this.updateUI();
        this.addLog('info', '所有状态已重置');
    }
}

// 全局模态对话框控制函数
window.closeModal = function(modalId) {
    if (window.ui) {
        window.ui.closeModal(modalId);
    }
};

// 创建全局UI管理器实例
const ui = new UIManager();

// 导出UI管理器
window.ui = ui;