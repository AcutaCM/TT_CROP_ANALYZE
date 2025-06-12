const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;

class DroneAnalyzerApp {
    constructor() {
        this.mainWindow = null;
        this.pythonProcess = null;
        this.backendReady = false;
    }

    async createWindow() {
        // 创建主窗口
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1200,
            minHeight: 700,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
                webSecurity: false
            },
            titleBarStyle: 'default',
            icon: path.join(__dirname, 'assets', 'icon.png'),
            show: false
        });

        // 加载HTML文件
        await this.mainWindow.loadFile('index.html');

        // 窗口准备好后显示
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();

            // 开发模式下打开DevTools
            if (process.argv.includes('--dev')) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // 窗口关闭事件
        this.mainWindow.on('closed', () => {
            this.cleanup();
            this.mainWindow = null;
        });

        // 只启动Python后端，不启动任何其他服务器
        await this.startPythonBackend();
    }

    async startPythonBackend() {
        try {
            const pythonScript = path.join(__dirname, 'drone_backend.py');

            // 检查Python脚本是否存在
            try {
                await fs.access(pythonScript);
                console.log('✅ 找到Python后端脚本');
            } catch (error) {
                console.log('❌ Python后端脚本不存在:', pythonScript);
                this.showPythonMissingDialog();
                return;
            }

            console.log('🚀 启动Python后端服务...');

            // 启动Python后端进程
            this.pythonProcess = spawn('python', [pythonScript], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: __dirname
            });

            // 处理输出
            this.pythonProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`🐍 Python后端: ${output}`);

                // 检测后端启动成功
                if (output.includes('WebSocket服务器已启动')) {
                    this.backendReady = true;
                    console.log('✅ Python后端启动成功');

                    // 通知渲染进程后端已就绪
                    if (this.mainWindow) {
                        this.mainWindow.webContents.send('backend-ready');
                    }
                }
            });

            this.pythonProcess.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`❌ Python后端错误: ${error}`);

                // 检查是否是依赖缺失
                if (error.includes('djitellopy') || error.includes('opencv') || error.includes('websockets')) {
                    this.showDependencyError(error);
                }
            });

            this.pythonProcess.on('close', (code) => {
                console.log(`🐍 Python后端进程退出，代码: ${code}`);
                this.backendReady = false;

                if (code !== 0 && this.mainWindow) {
                    this.showPythonExitError(code);
                }
            });

            this.pythonProcess.on('error', (error) => {
                console.error('❌ Python后端启动失败:', error);
                this.showPythonError(error);
            });

        } catch (error) {
            console.error('❌ 启动Python后端失败:', error);
            this.showPythonError(error);
        }
    }

    showPythonMissingDialog() {
        dialog.showErrorBox(
            'Python后端脚本缺失',
            'drone_backend.py文件不存在。请确保文件位于正确的位置。'
        );
    }

    showDependencyError(error) {
        const message = `Python依赖库缺失。\n\n错误信息:\n${error}\n\n请运行以下命令安装依赖:\npip install djitellopy opencv-python websockets numpy`;

        dialog.showMessageBox(this.mainWindow, {
            type: 'error',
            title: 'Python依赖缺失',
            message: 'Python依赖库缺失',
            detail: message,
            buttons: ['确定', '复制安装命令']
        }).then((result) => {
            if (result.response === 1) {
                const { clipboard } = require('electron');
                clipboard.writeText('pip install djitellopy opencv-python websockets numpy');
            }
        });
    }

    showPythonError(error) {
        dialog.showErrorBox(
            'Python后端启动失败',
            `无法启动Python后端服务。\n\n错误信息: ${error.message}\n\n请确保已安装Python和相关依赖。`
        );
    }

    showPythonExitError(code) {
        dialog.showMessageBox(this.mainWindow, {
            type: 'warning',
            title: 'Python后端异常退出',
            message: `Python后端进程异常退出 (代码: ${code})`,
            detail: '无人机功能可能不可用。请检查Python环境和依赖。',
            buttons: ['确定', '重启后端']
        }).then((result) => {
            if (result.response === 1) {
                this.restartPythonBackend();
            }
        });
    }

    async restartPythonBackend() {
        console.log('🔄 重启Python后端...');

        // 停止现有进程
        if (this.pythonProcess) {
            this.pythonProcess.kill();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 重新启动
        await this.startPythonBackend();
    }

    // IPC事件处理
    setupIPC() {
        // 打开外部链接
        ipcMain.handle('open-external', async (event, url) => {
            await shell.openExternal(url);
        });

        // 选择文件
        ipcMain.handle('select-file', async (event, options) => {
            const result = await dialog.showOpenDialog(this.mainWindow, options);
            return result;
        });

        // 保存文件
        ipcMain.handle('save-file', async (event, options) => {
            const result = await dialog.showSaveDialog(this.mainWindow, options);
            return result;
        });

        // 显示消息框
        ipcMain.handle('show-message', async (event, options) => {
            const result = await dialog.showMessageBox(this.mainWindow, options);
            return result;
        });

        // 获取后端状态
        ipcMain.handle('get-backend-status', async (event) => {
            return {
                backendReady: this.backendReady,
                pythonProcess: !!this.pythonProcess,
                processRunning: this.pythonProcess && !this.pythonProcess.killed
            };
        });

        // 重启后端
        ipcMain.handle('restart-backend', async (event) => {
            try {
                await this.restartPythonBackend();
                return { success: true, message: '后端重启成功' };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // 检查Python环境
        ipcMain.handle('check-python-env', async (event) => {
            return new Promise((resolve) => {
                const { spawn } = require('child_process');
                const pythonCheck = spawn('python', ['--version']);

                let output = '';
                pythonCheck.stdout.on('data', (data) => {
                    output += data.toString();
                });

                pythonCheck.stderr.on('data', (data) => {
                    output += data.toString();
                });

                pythonCheck.on('close', (code) => {
                    resolve({
                        success: code === 0,
                        version: output.trim(),
                        error: code !== 0 ? 'Python未安装或不在PATH中' : null
                    });
                });

                pythonCheck.on('error', (error) => {
                    resolve({
                        success: false,
                        error: error.message
                    });
                });
            });
        });
    }

    cleanup() {
        console.log('🧹 清理Electron主进程资源...');

        // 终止Python进程
        if (this.pythonProcess) {
            console.log('🛑 终止Python后端进程...');

            // 尝试优雅关闭
            this.pythonProcess.kill('SIGTERM');

            // 如果优雅关闭失败，强制终止
            setTimeout(() => {
                if (this.pythonProcess && !this.pythonProcess.killed) {
                    console.log('🔫 强制终止Python进程...');
                    this.pythonProcess.kill('SIGKILL');
                }
            }, 3000);

            this.pythonProcess = null;
        }

        console.log('✅ Electron主进程资源清理完成');
    }
}

// 应用实例
const droneApp = new DroneAnalyzerApp();

// 应用事件处理
app.whenReady().then(async () => {
    droneApp.setupIPC();
    await droneApp.createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        droneApp.cleanup();
        app.quit();
    }
});

app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        await droneApp.createWindow();
    }
});

app.on('before-quit', () => {
    droneApp.cleanup();
});

// 导出应用实例供其他模块使用
module.exports = droneApp;