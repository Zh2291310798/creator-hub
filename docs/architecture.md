# CreatorHub 架构方案

> **版本**: v1.0 | **日期**: 2026-06-02 | **阶段**: 3 — 技术设计

---

## 一、当前架构

```
creator-hub/
└── index.html    ← 单文件 3707 行，包含全部 HTML/CSS/JS
     ├── <style>      CSS (~600 行)
     ├── <body>       HTML (~700 行)
     └── <script>     JS (~2400 行)
```

### 运行时架构

```
┌─────────────────────────────────────────┐
│               index.html                 │
│                                          │
│  ┌──────────┐  ┌───────────────────┐    │
│  │  HTML    │  │   JavaScript      │    │
│  │  Panels  │  │                   │    │
│  │          │  │  Auth Layer       │    │
│  │  home    │  │  ├─ initAuth()    │    │
│  │  square  │  │  ├─ doLogin()     │    │
│  │  chat    │  │  └─ doRegister()  │    │
│  │  recruit │  │                   │    │
│  │  match   │  │  Router           │    │
│  │  community│  │  └─ switchTab()  │    │
│  │  friends │  │                   │    │
│  │  profile │  │  Data Layer       │    │
│  │          │  │  └─ localStorage  │    │
│  └──────────┘  │                   │    │
│                │  Render Engines   │    │
│                │  ├─ renderFeed()  │    │
│                │  ├─ renderMatch() │    │
│                │  ├─ renderPosts() │    │
│                │  └─ ...           │    │
│                └───────────────────┘    │
└─────────────────────────────────────────┘
```

### 代码分层（逻辑）

| 层 | 职责 | 关键函数 |
|----|------|---------|
| **认证层** | 登录/注册/Session | `initAuth`, `doLogin`, `doRegister` |
| **路由层** | 页面切换 | `switchTab(tab)` |
| **渲染层** | UI 更新 | `renderFeed`, `renderMatch`, `renderPosts`, `renderChatMessages`, `renderRecruits`, `renderFriendsList`, `renderProfile`, `renderAvatarPicker`, `renderWorldChat`, `renderChatContacts` |
| **数据层** | localStorage 读写 | 直接操作 `localStorage.getItem/setItem` |
| **交互层** | 用户操作响应 | `sendMessage`, `createPost`, `deletePost`, `addXP`, `openMatchMsg`, `publishMatch`, `openPostDetail` |
| **工具层** | 辅助函数 | `showToast`, `escapeHtml`, `getSessionId` |

---

## 二、v1.1 架构演进

### 目标架构

```
creator-hub/
├── index.html              ← 主入口（HTML 骨架 + 标签引用）
├── css/
│   ├── variables.css       ← CSS 变量
│   ├── base.css            ← 重置 + 排版
│   ├── components.css      ← 按钮/卡片/输入框等组件
│   ├── pages.css           ← 各面板样式
│   └── auth.css            ← 登录注册样式
├── js/
│   ├── app.js              ← 入口 init()
│   ├── auth.js             ← 认证模块
│   ├── router.js           ← 路由 + switchTab
│   ├── data.js             ← 数据 CRUD（localStorage 抽象层）
│   ├── track.js            ← 🆕 埋点模块
│   ├── xp.js               ← 经验值系统
│   ├── pages/
│   │   ├── home.js         ← 首页
│   │   ├── square.js       ← 动态广场
│   │   ├── chat.js         ← 聊天
│   │   ├── recruit.js      ← 招募
│   │   ├── match.js        ← 对接
│   │   ├── local.js        ← 🆕 本地匹配
│   │   ├── community.js    ← 社区
│   │   ├── friends.js      ← 好友
│   │   └── profile.js      ← 个人主页+设置
│   └── components/
│       ├── toast.js        ← Toast 通知
│       ├── modal.js        ← 🆕 通用弹窗
│       ├── emoji-picker.js ← 表情选择器
│       └── avatar.js       ← 头像渲染
└── docs/                   ← 文档（不变）
```

### 拆分策略

| 阶段 | 行动 | 触发条件 |
|------|------|---------|
| 当前 v1.0 | 单文件 3707 行 | — |
| v1.1 | CSS 拆出 → `<link>` 引用 | 达到 800 行 CSS |
| v1.1 | JS 拆出 → `<script src>` | 达到 3000 行 JS |
| v1.2 | 模块化（ES Modules 或 IIFE） | JS 超过 5 个文件 |

---

## 三、数据流

```
用户操作 → 事件处理函数
              │
              ├─→ 更新内存数据（posts, contacts, myFriends ...）
              │
              ├─→ 持久化到 localStorage（有副作用的操作）
              │
              ├─→ 调用 render*() 更新 DOM
              │
              └─→ 🆕 调用 track() 记录事件
```

### 数据流原则
1. **内存是真相来源** — 所有渲染从内存读，不从 DOM 读
2. **localStorage 是持久层** — 刷新不丢数据
3. **渲染是单向的** — 数据变 → render 函数 → DOM 更新
4. **track 是副作用** — 不影响主流程，异步写入

---

## 四、路由设计

当前：基于 CSS `display` 切换的伪路由

```js
function switchTab(tab) {
  // 1. 隐藏所有 panel
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  // 2. 显示目标 panel
  document.getElementById('panel-' + tab).classList.add('active');
  // 3. 更新底部导航高亮
  // 4. 🆕 触发 page_view 埋点
  track('page_view', { page_name: tab, previous_page: currentTab });
  // 5. 触发页面初始化
  if (tab === 'home') initHomepage();
  if (tab === 'match') renderMatch();
  if (tab === 'chat') { renderChatContacts(); renderWorldChat(); }
  // ...
}
```

路由表：

| Tab | Panel ID | 初始化函数 | 假设 |
|-----|----------|-----------|:---:|
| `home` | `panel-home` | `initHomepage()` | H1 |
| `square` | `panel-square` | `renderFeed()` | H1 |
| `chat` | `panel-chat` | `renderChatContacts()` + `renderWorldChat()` | H1 |
| `recruit` | `panel-recruit` | `renderRecruits()` | H4 |
| `match` | `panel-match` | `renderMatch()` | H2 |
| `local` | `panel-local` ← 🆕 | `renderLocalMatch()` ← 🆕 | H3 |
| `community` | `panel-community` | `renderPosts()` | H1, H4 |
| `friends` | `panel-friends` | `renderFriendsList()` | H1 |
| `profile` | `panel-profile` | `renderProfile()` | H1 |

---

## 五、渲染策略

| 策略 | 适用场景 | 说明 |
|------|---------|------|
| **全量重渲染** | 帖子列表、对接卡片、招募列表 | `innerHTML` 替换整个容器 |
| **增量更新** | 聊天消息（新消息追加） | `insertAdjacentHTML` |
| **CSS 切换** | Toast、弹窗、面板切换 | 用 class 控制显示隐藏 |
| **事件委托** | 帖子/卡片上的按钮 | 在父容器上监听，通过 `data-*` 属性识别目标 |

---

## 六、约束与边界

| 约束 | 值 |
|------|-----|
| 最大文件行数 | 5000（超限强制拆分） |
| 最大 DOM 节点 | ~500 |
| localStorage 总容量 | ~5MB（浏览器限制） |
| 埋点事件保留 | 1000 条 |
| 世界频道消息保留 | 200 条 |
| 无外部依赖 | ✅ |
| 目标浏览器 | Chrome/Firefox/Safari/Edge |

---

## 七、安全注意事项（MVP 阶段）

| 风险 | 缓解措施 |
|------|---------|
| 明文密码在 localStorage | 标注为 MVP 阶段；v2.0 迁移后端 |
| XSS | `escapeHtml()` 处理所有用户输入 |
| localStorage 被清除 | 数据在客户端，无法恢复（告知用户） |

---

*属于 CreatorHub 产品工程化管线 — 阶段 3：技术设计*
