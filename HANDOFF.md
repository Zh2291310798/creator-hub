# CreatorHub — 跨平台创作者对接广场

> **版本**: v1.0.0  
> **仓库**: https://github.com/Zh2291310798/creator-hub  
> **类型**: 纯前端单文件应用 (SPA)  
> **部署**: 拖到浏览器直接打开 / Vercel / GitHub Pages

---

## 一、项目概述

面向小红书、抖音、B站、快手、YouTube、TikTok 等全平台创作者的对接广场。

### 核心功能

| 模块 | 功能 |
|------|------|
| 🎪 首页 | 浮动 emoji + 平台芯片墙 + 统计数字滚动 + 身份选择卡 |
| 📡 动态 | 实时信息流（招募/对接/帖子动态） |
| 💬 聊天 | 私聊 + 🌍 世界频道（模拟回复） |
| 💼 招募 | 多平台招聘信息发布/筛选/查看 |
| 🤝 对接 | 品牌⇄达人 双向匹配 + 留言意向 + 分屏筛选 |
| 📝 社区 | 发帖/评论/删帖 + 全屏阅读模式 |
| 👥 好友 | 好友列表 + 请求 + 发现新朋友 + 一键添加 |
| 👤 个人主页 | 资料展示 + 我的帖子 + 好友列表 |
| ⚙ 设置 | 编辑资料 + 头像选择器（渐变/表情） + 通知/隐私 |

### 特色系统

- **登录/注册** — localStorage 模拟用户系统，支持多账号
- **等级系统** — 10级称号（萌新→创世神），发帖/评论/聊天/加好友/对接获得 XP
- **头像系统** — 16 套渐变色 + 20 个表情头像可选，根据用户名哈希分配默认色
- **表情选择器** — 60 个常用 emoji，聊天框一键插入
- **每日奖励** — 每天登录 +25 XP

---

## 二、技术架构

```
creator-hub/
└── index.html    ← 单文件，包含全部 HTML/CSS/JS（约 3700 行）
```

- **前端框架**: 无，纯 Vanilla JS
- **样式**: CSS 变量 + 手账/便签风格 (Builder Jam 美学)
- **数据存储**: localStorage（用户数据、XP、等级、头像选择、登录状态）
- **字体**: Kalam (标题) + PingFang SC (正文)
- **无外部依赖**: 零 npm、零构建工具

---

## 三、数据结构

### localStorage 键名

| 键 | 内容 |
|----|------|
| `creatorhub_users` | JSON `{用户名: {name, password, role, roleLabel, avatarChoice}}` |
| `creatorhub_session` | 当前登录用户名 |
| `creatorhub_xp` | JSON `{用户名: xp数值}` |
| `creatorhub_lastLogin` | 上次登录日期 `DateString`，用于每日奖励 |

### 核心 JS 对象

| 变量 | 说明 |
|------|------|
| `myProfile` | 当前用户资料 `{name, role, roleLabel, bio, platforms, tags}` |
| `contacts` | 聊天联系人列表 |
| `posts` | 社区帖子数组 |
| `postComments` | 帖子评论 `{postId: [{author, text, time}]}` |
| `recruits` | 招募信息数组 |
| `brandSeekingData` / `creatorSeekingData` | 对接需求数组 |
| `allUsers` | 系统内所有可发现用户 |
| `myFriends` | 当前用户好友 ID 列表 |
| `friendRequests` | 待处理好友请求 |
| `worldChat` | 世界频道消息 |
| `avatarGradients` | 16 套渐变色方案 |

---

## 四、关键函数速查

| 函数 | 用途 |
|------|------|
| `initAuth()` | 检查 localStorage 自动登录 |
| `doLogin()` / `doRegister()` | 登录/注册 |
| `initHomepage()` | 渲染首页浮动 emoji + 平台墙 + 计数器 + 在线用户 |
| `switchTab(tab)` | 切换主标签页 |
| `openPostDetail(id)` | 全屏帖子详情 + 评论区 |
| `sendMessage()` | 发送私聊 → 自动模拟回复 |
| `sendWorldMessage()` | 发送世界频道消息 |
| `addXP(amount, reason)` | 增加经验值 → 自动升级检测 + 纸屑 |
| `updateLevelDisplay()` | 刷新等级条和徽章 |
| `toggleEmojiPicker(targetId, e)` | 打开表情选择器 |
| `openMatchMsg(e, name, role)` | 对接意向留言弹窗 |
| `publishMatch()` | 发布对接需求 |
| `createPost()` / `deletePost()` | 发帖/删帖 |
| `renderAvatarPicker()` | 渲染头像选择器 |
| `saveProfile()` | 保存个人资料到 localStorage |

---

## 五、后续可做

- [ ] 接真实后端 (Firebase / Supabase)
- [ ] WebSocket 实时聊天
- [ ] 图片真实上传 (Cloudinary / S3)
- [ ] OAuth 登录 (GitHub / Google / 微信)
- [ ] 通知系统
- [ ] 搜索功能
- [ ] 移动端 PWA 适配
- [ ] 多语言支持

---

## 六、修改指南

1. **改样式**: CSS 变量在 `:root` 块，改颜色直接改变量
2. **加页面**: 复制 `#panel-xxx` 的 HTML 结构 + 注册到 `switchTab()`
3. **改数据**: 找对应的 JS 数组/对象
4. **部署**: 直接推到 `main` 分支，Vercel 自动部署

---

*Last updated: 2026-06-02 · v1.0.0*
