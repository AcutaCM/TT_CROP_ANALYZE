# TT_CROP_ANALYZE - 智能农业无人机分析系统

[image:https://www-cdn.djiits.com/cms/uploads/0473fcbd4798e8234950eaf4b8535bf8.png]

这是TTtalentDev开发的智能农业无人机分析系统，用于农业领域的智能分析和监控。

## 功能特点

- 实时无人机视频流监控
- 作物健康状态分析
- 智能图像处理和分析
- 用户友好的图形界面
- 数据可视化展示
- 自动化报告生成

## 系统要求

### 硬件要求
- 支持WiFi的Tello无人机
- 摄像头（用于人脸识别功能）
- 至少4GB RAM的计算机
- 稳定的网络连接

### 软件要求
- Windows 10/11 或 Linux
- Node.js v14.0.0 或更高版本
- Python 3.8+
- Git

## 详细安装步骤

### 1. 克隆项目
```bash
git clone https://github.com/AcutaCM/TT_CROP_ANALYZE.git
cd TT_CROP_ANALYZE
```

### 2. Python环境配置
1. 创建虚拟环境：
```bash
python -m venv .venv
```

2. 激活虚拟环境：
- Windows:
```bash
.venv\Scripts\activate
```
- Linux/Mac:
```bash
source .venv/bin/activate
```

3. 安装Python依赖：
```bash
pip install -r requirements.txt
```

### 3. Node.js环境配置
1. 安装Node.js依赖：
```bash
npm install
```

2. 安装Electron：
```bash
npm install electron --save-dev
```

### 4. 配置文件设置
1. 复制配置文件模板：
```bash
cp config.json.example config.json
```

2. 修改`config.json`中的配置：
```json
{
    "drone": {
        "ip": "192.168.10.1",
        "port": 8889
    },
    "api": {
        "dashscope_key": "你的DashScope API密钥"
    }
}
```

### 5. 模型文件准备
1. 下载YOLOv8模型：
```bash
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt
```

2. 将模型文件放置在`models`目录下

## 运行应用

### 开发模式
1. 启动Python后端：
```bash
python drone_backend.py
```

2. 启动Electron前端：
```bash
npm start
```

### 生产模式
使用提供的批处理文件：
```bash
.\restart.bat
```

## 项目结构说明

```
TT_CROP_ANALYZE/
├── main.js              # Electron主进程
├── index.html           # 主界面
├── styles/             # CSS样式文件
├── scripts/            # 前端脚本
├── python_backend/     # Python后端代码
├── drone_backend.py    # 无人机控制后端
├── crop_analyzer_dashscope.py  # 作物分析模块
├── error_check.py      # 错误检测模块
├── config.json         # 配置文件
└── models/            # AI模型文件
```

## 主要模块功能

- `drone_backend.py`: 
  - 无人机连接控制
  - 视频流处理
  - 飞行指令发送
  - 状态监控

- `crop_analyzer_dashscope.py`: 
  - 作物图像分析
  - 健康状态评估
  - 数据统计处理

- `error_check.py`: 
  - 系统状态监控
  - 错误日志记录
  - 异常处理

## 使用说明

1. 启动前检查：
   - 确保无人机电量充足（>50%）
   - 检查网络连接状态
   - 确认摄像头权限

2. 操作流程：
   - 启动应用
   - 等待系统初始化
   - 连接无人机
   - 选择分析模式
   - 开始任务

3. 数据分析：
   - 实时查看分析结果
   - 导出分析报告
   - 查看历史数据

## 常见问题解决

1. 无人机连接失败：
   - 检查WiFi连接
   - 确认IP地址配置
   - 重启无人机

2. 视频流卡顿：
   - 检查网络带宽
   - 降低视频质量
   - 关闭其他占用带宽的应用

3. 分析结果不准确：
   - 确保光照充足
   - 调整飞行高度
   - 更新AI模型

## 技术支持

- 项目地址：[https://github.com/AcutaCM/TT_CROP_ANALYZE](https://github.com/AcutaCM/TT_CROP_ANALYZE)
- 问题反馈：请提交Issue
- 邮件支持：[actuacm@163.com]

## 许可证

[MIT]

## 贡献指南

1. Fork项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 更新日志

### v1.0.0
- 初始版本发布
- 基础功能实现
- 用户界面优化
