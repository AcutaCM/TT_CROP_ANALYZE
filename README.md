<div align="center"><h1>  TT_CROP_ANALYZE · 智能农业无人机分析系统</h1></div>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Electron](https://img.shields.io/badge/Electron-27.0+-purple.svg)](https://electronjs.org)

**一个基于 Electron + Python 的无人机农作物智能分析系统**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [用户手册](User_Guide.md) • [更新日志](CHANGELOG.md)

</div>

---

##  项目简介

TT_CROP_ANALYZE 是一款专业的智能农业无人机分析系统，集成了实时视频监控、AI 作物健康分析、挑战卡巡航、数据可视化等功能。支持跨平台部署，提供直观的用户界面和丰富的个性化选项。

###  核心亮点

- AI 智能分析：基于 DashScope 的专业农作物健康评估
- 实时控制：Tello 无人机实时视频流与飞行控制
- 挑战卡巡航：支持自定义航线参数的智能巡航
- 数据可视化：实时统计面板与分析报告导出
- 个性化：6+ 主题与壁纸，支持自定义上传
- 跨平台：Windows/macOS/Linux 一键打包部署

---

##  功能特性

###  核心功能
- **实时视频监控**：高清视频流处理，状态叠加显示（FPS、连接状态、识别框等）
- **AI 作物分析**：
  - 作物健康评分与病虫害检测
  - 营养状态分析与生长阶段判断
  - 专业模拟模式（无需 API 即可体验）
- **挑战卡巡航**：
  - 参数化航线设置
  - 自动起降与寻迹
  - 实时状态回传与异常处理

###  用户体验
- **模块化面板**：连接/控制/分析/报告/配置分离式界面
- **主题系统**：深色、浅色、赛博朋克、自然、极简、日落 6 种预设主题
- **壁纸系统**：
  - 6+ 预设壁纸（太空星云、农场风景、科技电路等）
  - 自定义图片上传
  - 透明度与模糊度实时调节
- **快捷键支持**：Ctrl/Cmd + E 一键导出报告
- **智能通知**：操作反馈与错误提示

###  数据管理
- **报告导出**：支持 CSV/JSON 格式，包含完整分析数据
- **设置持久化**：主题、壁纸、配置自动保存
- **安全管理**：API Key 环境变量优先，避免硬编码泄露

---

##  环境要求

###  系统要求
- **操作系统**：Windows 10/11（推荐）/ macOS / Linux
- **运行时**：
  - Node.js 18+
  - Python 3.8+
- **硬件**：支持 WiFi 的 Tello 无人机（可选）

###  依赖库
- **前端**：Electron, Express, WebSocket
- **后端**：OpenCV, NumPy, DashScope SDK, djitellopy
- **AI 分析**：可选安装 DashScope（未安装时自动启用模拟模式）

---

##  快速开始

###  克隆项目
```bash
git clone https://github.com/ActuaCM/TT_CROP_ANALYZE.git
cd TT_CROP_ANALYZE/electron-drone-analyzer2/electron-drone-analyzer
```

###  Python 环境配置
```bash
# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境 (Windows)
.\.venv\Scripts\activate

# 激活虚拟环境 (macOS/Linux)
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

###  Node.js 环境配置
```bash
# 安装前端依赖
npm install
```

###  API 配置（推荐）
```bash
# 设置环境变量 (Windows)
setx DASHSCOPE_API_KEY "your-dashscope-api-key"
setx DASHSCOPE_APP_ID "your-dashscope-app-id"

# 设置环境变量 (macOS/Linux)
export DASHSCOPE_API_KEY="your-dashscope-api-key"
export DASHSCOPE_APP_ID="your-dashscope-app-id"
```

###  启动应用

**开发模式（推荐/选择其一即可）：**
```bash
# 终端 1：启动后端
python drone_backend.py

# 终端 2：启动前端
npm start
```

**生产模式：**
```bash
# 一键启动（Windows）
.\start_with_python.bat

# 或构建可执行文件
npm run build-win  # Windows
npm run build-mac  # macOS
npm run build-linux  # Linux
```

---

##  配置与安全建议

### API Key 管理
为确保安全，系统采用以下优先级获取 API 配置：

1. **环境变量**（推荐）：`DASHSCOPE_API_KEY`, `DASHSCOPE_APP_ID`
2. **前端界面**：配置面板输入（保存到 localStorage）
3. **配置文件**：`config.json`（仅开发调试）

**配置模板示例：**
```json
{
  "dashscope_api_key": "",
  "dashscope_app_id": "",
  "note": "请通过环境变量或前端界面设置 API 密钥"
}
```

---

##  个性化设置

###  主题系统
- **预设主题**：深色、浅色、赛博朋克、自然、极简、日落
- **特性**：一键切换、自动保存、即时预览

###  壁纸系统
- **预设壁纸**：默认渐变、太空星云、农场风景、科技电路、自然风光、抽象艺术
- **自定义功能**：
  - 本地图片上传
  - 透明度调节（0-100%）
  - 模糊度调节（0-20px）
  - 一键删除自定义壁纸

###  使用方法
1. 点击顶部工具栏的主题/壁纸按钮
2. 在弹出面板中选择或上传
3. 设置即刻生效并自动保存

---

##  快捷键

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl/Cmd + E` | 导出报告 | 一键导出当前分析数据 |

>  更多快捷键将在后续版本中添加，详见 [CHANGELOG.md](CHANGELOG.md)

---


##  常见问题 (FAQ)

<details>
<summary><strong> 无人机连接失败</strong></summary>

**解决方案：**
1. 确保已连接到 Tello 无人机的 WiFi 网络
2. 检查防火墙设置，允许应用访问网络
3. Windows 用户：关闭多余网卡或热点共享
4. 重启无人机并在应用中重新连接
5. 检查无人机电量是否充足（建议 >30%）
</details>

<details>
<summary><strong> 视频卡顿或延迟</strong></summary>

**解决方案：**
1. 检查网络连接质量和稳定性
2. 关闭其他占用带宽的应用程序
3. 降低视频处理强度（暂停 AI 分析）
4. 确保计算机性能充足，关闭不必要的后台程序
</details>

<details>
<summary><strong> AI 分析失败</strong></summary>

**解决方案：**
1. 确认已正确设置 `DASHSCOPE_API_KEY` 和 `DASHSCOPE_APP_ID`
2. 检查网络连接，确保可访问 DashScope 服务
3. 使用应用内的"连接测试"功能验证 API 配置
4. 如无 API 密钥，系统会自动启用"专业模拟模式"
</details>

<details>
<summary><strong> 主题或壁纸无法加载</strong></summary>

**解决方案：**
1. 检查浏览器 localStorage 权限
2. 清除浏览器缓存并重启应用
3. 确保上传的图片格式正确（JPG/PNG）
4. 检查图片文件大小（建议 <5MB）
</details>

<details>
<summary><strong> 报告导出失败</strong></summary>

**解决方案：**
1. 确保有分析数据可供导出
2. 检查文件写入权限
3. 尝试使用快捷键 `Ctrl/Cmd + E`
4. 重启应用后重试
</details>

---

##  开发与贡献

我们欢迎社区贡献！参与方式：

###  报告问题
- 使用 [GitHub Issues](https://github.com/AcutaCM/TT_CROP_ANALYZE/issues) 报告 Bug
- 提供详细的重现步骤和环境信息
- 附上相关日志或截图

###  功能建议
- 通过 Issues 提交功能请求
- 详细描述预期功能和使用场景
- 参与讨论和设计

###  代码贡献
1. **Fork** 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 **Pull Request**

### 开发规范
- 遵循现有代码风格和命名约定
- 添加必要的注释和文档
- 确保新功能与现有功能兼容
- 提交前进行充分测试

---

##  许可证

本项目采用 [MIT License](LICENSE) 开源协议。
MIT License

Copyright (c) 2025 TTtalentDev Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

---

##  致谢

感谢以下开源项目和社区的贡献：

- **[Electron](https://electronjs.org/)** - 跨平台桌面应用框架
- **[DashScope](https://dashscope.aliyun.com/)** - 阿里云大模型服务平台
- **[djitellopy](https://github.com/damiafuentes/DJITelloPy)** - DJI Tello 无人机 Python SDK
- **[OpenCV](https://opencv.org/)** - 计算机视觉库
- **Node.js** 和 **Python** 开源社区

---

##  联系我们

-  **邮箱**：[actuacm@163.com](mailto:actuacm@163.com)
-  **问题反馈**：[GitHub Issues](https://github.com/ActuaCM/TT_CROP_ANALYZE/issues)
-  **文档**：[用户手册](docs/USER_GUIDE.md) | [更新日志](CHANGELOG.md)
-  **支持项目**：如果觉得有用，请给我们一个 Star

---

<div align="center">

 让智能农业触手可及 | Making Smart Agriculture Accessible

Made with ❤️ by TTtalentDev Team

</div>
