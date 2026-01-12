# 🌐 个人导航网站（极简 · 科技感）

这是一个 **基于纯静态技术栈的个人导航网站**，主打 **极简设计 + 科技感视觉**，适合部署在 **GitHub + Zeabur** 等平台，国内访问稳定，维护成本极低。

> ✅ 无数据库
>
> ✅ 无后端依赖
>
> ✅ 修改 JSON 即可更新导航
>
> ✅ 适合长期自用 / 轻量分享

---

## ✨ 功能特性

* 📌 **分类导航卡片**（支持本地图标）
* 🖼️ **自定义背景图片**（支持全屏铺满）
* 🌙 极简 + 科技感 UI 设计
* 🔍 内置搜索框（可选）
* 🌦️ 天气信息显示（IP 定位，多接口兜底）
* 🕒 实时时间与日期展示
* 📱 完整响应式设计（桌面 / 手机）
* 🚀 适合 Zeabur 免费实例部署

---

## 📁 项目结构

```text
zeabur-navigation/
├── index.html             # 主页面（包含css和天气插件）
├── nav-data.json          # 导航数据配置
├── zeabur.json            # Zeabur平台配置
├── assets/
│   ├── backgrounds/       # 背景图片目录
│   └── icons/             # 网站图标目录
└── README.md              # 部署说明
```

---

## ⚙️ 使用方法

### 1️⃣ 修改导航内容

所有导航数据都在：

```json
sites.json
```

示例：

```json
{
  "开发工具": [
    {
      "name": "GitHub",
      "url": "https://github.com",
      "icon": "assets/icons/github.png"
    }
  ]
}
```

* `name`：显示名称
* `url`：点击跳转地址
* `icon`：本地图标路径（可选）

---

### 2️⃣ 更换背景图片

将图片放入：

```text
assets/backgrounds/
```

在 `style.css` 中修改：

```css
body {
  background: url('assets/backgrounds/kumtanom.jpg') no-repeat center center fixed;
  background-size: cover;
}
```

> ⚠️ 注意：路径大小写需与仓库完全一致（Linux 区分大小写）

---

## 🚀 部署到 Zeabur（推荐）

1. 将本仓库推送到 GitHub
2. 打开 [https://zeabur.com](https://zeabur.com)
3. New Project → Deploy from GitHub
4. 选择本仓库
5. 类型选择 **Static Site**
6. Build / Output 留空
7. 点击 Deploy

部署完成后即可通过：

```text
https://你的项目名.zeabur.app
```

访问。

---

## 🧩 技术说明

* 本项目为 **纯静态网站**，不依赖任何后端服务
* 天气数据使用第三方公开 API（已做缓存与兜底）
* 所有资源均为本地文件，避免 CDN / DNS 不稳定问题
* 适合中国大陆网络环境

---

## 🛠️ 可扩展方向

* 🌙 深色 / 浅色模式切换
* 🔍 本地搜索增强
* 🔐 私人访问密码
* 📦 改为 JSON + 后台管理（Node.js）
* 📄 PWA / 离线访问

---

## 📄 License

MIT License

---

如果你觉得这个项目对你有帮助，欢迎 ⭐ Star 或 Fork 自用。

Enjoy it 🚀

