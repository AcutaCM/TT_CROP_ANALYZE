/**
 * 视频管理模块
 * 负责视频流显示和处理
 */
class VideoManager {
    constructor() {
        this.canvas = document.getElementById('video-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.videoDisplay = document.getElementById('video-display');
        this.isStreaming = false;
        this.currentFrame = null;
        this.frameCount = 0;
        this.lastFpsTime = Date.now();
        this.fps = 0;

        this.initCanvas();
        this.bindEvents();
    }

    /**
     * 初始化画布
     */
    initCanvas() {
        this.canvas.width = 640;
        this.canvas.height = 480;
        this.resizeCanvas();

        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    /**
     * 调整画布大小以适应容器
     */
    resizeCanvas() {
        const container = this.videoDisplay;
        const containerRect = container.getBoundingClientRect();

        // 计算适合的尺寸，保持16:9比例
        const aspectRatio = 4/3; // 640x480
        let width = containerRect.width - 40; // 留出padding
        let height = width / aspectRatio;

        if (height > containerRect.height - 40) {
            height = containerRect.height - 40;
            width = height * aspectRatio;
        }

        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 全屏按钮
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }

        // 截图按钮
        const screenshotBtn = document.getElementById('screenshot-btn');
        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => {
                this.takeScreenshot();
            });
        }

        // 双击全屏
        this.canvas.addEventListener('dblclick', () => {
            this.toggleFullscreen();
        });

        // 右键菜单
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e);
        });
    }

    /**
     * 更新视频帧
     */
    updateFrame(frameData) {
        try {
            if (!frameData) return;

            // 如果是base64数据，创建图像
            if (typeof frameData === 'string') {
                const img = new Image();
                img.onload = () => {
                    this.drawFrame(img);
                    this.updateFrameStats();
                };
                img.src = frameData.startsWith('data:') ? frameData : `data:image/jpeg;base64,${frameData}`;
            } else if (frameData instanceof ImageData) {
                // 如果是ImageData，直接绘制
                this.ctx.putImageData(frameData, 0, 0);
                this.updateFrameStats();
            }

            this.currentFrame = frameData;
            this.showCanvas();

        } catch (error) {
            console.error('更新视频帧失败:', error);
        }
    }

    /**
     * 绘制帧到画布
     */
    drawFrame(img) {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 计算绘制尺寸以保持比例
        const canvasAspect = this.canvas.width / this.canvas.height;
        const imgAspect = img.width / img.height;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspect > canvasAspect) {
            // 图像更宽，以宽度为准
            drawWidth = this.canvas.width;
            drawHeight = this.canvas.width / imgAspect;
            drawX = 0;
            drawY = (this.canvas.height - drawHeight) / 2;
        } else {
            // 图像更高，以高度为准
            drawHeight = this.canvas.height;
            drawWidth = this.canvas.height * imgAspect;
            drawX = (this.canvas.width - drawWidth) / 2;
            drawY = 0;
        }

        // 绘制图像
        this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // 添加覆盖信息
        this.drawOverlay();
    }

    /**
     * 绘制覆盖信息
     */
    drawOverlay() {
        const ctx = this.ctx;

        // 设置字体样式
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;

        // 时间戳
        const timestamp = new Date().toLocaleTimeString();
        const timestampText = `时间: ${timestamp}`;
        const timestampX = 10;
        const timestampY = this.canvas.height - 10;

        ctx.strokeText(timestampText, timestampX, timestampY);
        ctx.fillText(timestampText, timestampX, timestampY);

        // FPS
        const fpsText = `FPS: ${this.fps}`;
        const fpsX = this.canvas.width - 80;
        const fpsY = 25;

        ctx.strokeText(fpsText, fpsX, fpsY);
        ctx.fillText(fpsText, fpsX, fpsY);

        // 如果检测到二维码，绘制边框和信息
        if (this.detectedQR) {
            this.drawQROverlay(this.detectedQR);
        }
    }

    /**
     * 绘制二维码检测覆盖
     */
    drawQROverlay(qrData) {
        const ctx = this.ctx;

        if (qrData.corners && qrData.corners.length === 4) {
            // 绘制二维码边框
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.beginPath();

            for (let i = 0; i < qrData.corners.length; i++) {
                const corner = qrData.corners[i];
                if (i === 0) {
                    ctx.moveTo(corner.x, corner.y);
                } else {
                    ctx.lineTo(corner.x, corner.y);
                }
            }
            ctx.closePath();
            ctx.stroke();

            // 绘制二维码信息
            const centerX = qrData.corners.reduce((sum, corner) => sum + corner.x, 0) / 4;
            const centerY = qrData.corners.reduce((sum, corner) => sum + corner.y, 0) / 4;

            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.font = '16px Arial';
            const infoText = `植株ID: ${qrData.plantId}`;
            const textWidth = ctx.measureText(infoText).width;

            // 绘制背景
            ctx.fillRect(centerX - textWidth/2 - 5, centerY - 25, textWidth + 10, 20);

            // 绘制文字
            ctx.fillStyle = 'black';
            ctx.fillText(infoText, centerX - textWidth/2, centerY - 10);
        }
    }

    /**
     * 更新帧统计信息
     */
    updateFrameStats() {
        this.frameCount++;
        const now = Date.now();
        const elapsed = now - this.lastFpsTime;

        if (elapsed >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / elapsed);
            this.frameCount = 0;
            this.lastFpsTime = now;

            // 更新UI显示
            ui.updateVideoInfo(this.fps, `${this.canvas.width}x${this.canvas.height}`);
        }
    }

    /**
     * 显示画布
     */
    showCanvas() {
        if (!this.isStreaming) {
            this.isStreaming = true;
            this.canvas.style.display = 'block';

            // 隐藏占位符
            const placeholder = this.videoDisplay.querySelector('.video-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }
    }

    /**
     * 隐藏画布
     */
    hideCanvas() {
        this.isStreaming = false;
        this.canvas.style.display = 'none';

        // 显示占位符
        const placeholder = this.videoDisplay.querySelector('.video-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }

        // 重置统计
        this.fps = 0;
        this.frameCount = 0;
        ui.updateVideoInfo(0, '--');
    }

    /**
     * 切换全屏
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.videoDisplay.requestFullscreen().catch(err => {
                console.error('进入全屏失败:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * 截图
     */
    takeScreenshot() {
        if (!this.currentFrame) {
            ui.addLog('error', '没有可截图的画面');
            return;
        }

        try {
            // 创建下载链接
            this.canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                link.download = `drone_screenshot_${timestamp}.png`;
                link.href = url;
                link.click();

                // 清理URL
                setTimeout(() => URL.revokeObjectURL(url), 100);

                ui.addLog('success', '截图已保存');
            }, 'image/png');

        } catch (error) {
            console.error('截图失败:', error);
            ui.addLog('error', '截图失败');
        }
    }

    /**
     * 显示右键菜单
     */
    showContextMenu(event) {
        // 创建右键菜单
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        menu.style.background = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        menu.style.zIndex = '9999';
        menu.style.minWidth = '150px';

        const menuItems = [
            { text: '截图', action: () => this.takeScreenshot() },
            { text: '全屏', action: () => this.toggleFullscreen() },
            { text: '重置检测', action: () => api.resetQRDetection() }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.text;
            menuItem.style.padding = '8px 12px';
            menuItem.style.cursor = 'pointer';
            menuItem.style.borderBottom = '1px solid #eee';

            menuItem.addEventListener('click', () => {
                item.action();
                document.body.removeChild(menu);
            });

            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f0f0f0';
            });

            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'white';
            });

            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                if (document.body.contains(menu)) {
                    document.body.removeChild(menu);
                }
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    /**
     * 设置二维码检测结果
     */
    setQRDetection(qrData) {
        this.detectedQR = qrData;
    }

    /**
     * 清除二维码检测结果
     */
    clearQRDetection() {
        this.detectedQR = null;
    }

    /**
     * 开始视频流
     */
    startStream() {
        ui.addLog('info', '视频流已启动');
        ui.updateQRStatus('等待检测');
    }

    /**
     * 停止视频流
     */
    stopStream() {
        this.hideCanvas();
        this.clearQRDetection();
        ui.addLog('info', '视频流已停止');
        ui.updateQRStatus('已停止');
    }

    /**
     * 获取当前帧的数据URL
     */
    getCurrentFrameDataURL() {
        if (this.canvas && this.isStreaming) {
            return this.canvas.toDataURL('image/png');
        }
        return null;
    }

    /**
     * 处理视频流错误
     */
    handleStreamError(error) {
        console.error('视频流错误:', error);
        ui.addLog('error', `视频流错误: ${error.message || error}`);
        this.stopStream();
    }

    /**
     * 更新视频质量设置
     */
    updateQuality(width, height, fps) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.targetFps = fps;
        this.resizeCanvas();

        ui.addLog('info', `视频质量已更新: ${width}x${height}@${fps}fps`);
    }

    /**
     * 获取视频统计信息
     */
    getStats() {
        return {
            fps: this.fps,
            resolution: `${this.canvas.width}x${this.canvas.height}`,
            isStreaming: this.isStreaming,
            frameCount: this.frameCount
        };
    }
}

// 创建全局视频管理器实例
const videoManager = new VideoManager();

// 导出视频管理器
window.videoManager = videoManager;