# CreatorHub 设计方案 v1.3

> **版本**: v1.0 | **日期**: 2026-06-03 | **作者**: P10/CTO
> **基于**: v1.1 代码审查 + 19 项 Bug 审计 + Supabase 迁移状态

---

## 一、当前架构评估

### 现实 vs 文档

| 维度 | HANDOFF.md 声称 | 实际代码 | 差距 |
|------|----------------|---------|------|
| 后端 | localStorage | Supabase (12 表 + RLS + Realtime) | 文档严重滞后 |
| 文件 | 单文件 3700 行 | 单文件 4256 行 | 逼近拆分阈值 |
| 安全 | escapeHtml() | ~60% 覆盖率，RLS 全员可读 | P0 阻断上线 |
| 实时 | 无 | Realtime × 4 channel + 3s 轮询兜底 | 双触发去重缺失 |
| 注册 | 纯前端 | Supabase Auth + 手动建 profile | fire-and-forget |

### 健康度评分

```
安全:   ████░░░░░░ 3/10 (P0: RLS泄露 + XSS)
一致性: █████░░░░░ 5/10 (P1: 双触发 + 字段映射散落)
架构:   ██████░░░░ 6/10 (单文件4256行, 逼近阈值5000)
UI/UX:  ███████░░░ 7/10 (手账美学独特, 缺loading/empty/error态)
文档:   ████░░░░░░ 4/10 (HANDOFF过时, 25份doc未同步代码)
```

---

## 二、v1.2 → v1.3 架构演进路线

### v1.2-hardening (当前)

```
目的: 把产品从"可用的原型"升级为"可信的生产平台"
范围: P0安全 + P1一致性 + 文件拆分
不改: UI外观, DB Schema, 零依赖原则
```

| Phase | 内容 | 交付 | Owner |
|-------|------|------|-------|
| Phase 1 | P0: RLS收紧 + XSS防御 + 注册/登出硬化 | 3 commits | P9-A (Codex) |
| Phase 2 | P1: 实时去重 + UI防御 + 字段映射统一 | 5 commits | P9-B (Codex) |
| Phase 3 | 架构: 4256行拆成 css/js 模块 | 1 commit | P9-B (Codex) |
| Phase 4 | 验收: /cso安全审计 + /browse浏览器回归 | 签收报告 | Claude (CTO) |

### v1.3-feature (下一版本)

```
目的: 补齐差异化能力——新手引导全流程 + 行业讨论区 + 本地匹配城市选择器
范围: PRD v1.1 中标 ❌ 的 P1 功能
```

| Epic | 功能 | 优先级 |
|------|------|:---:|
| H4 新人入行 | 新手引导完整流程（入门文章+推荐前辈+新人报到分类） | P1 |
| H1 社区 | 行业讨论区（子标签: 报价/避坑/工具/政策） | P1 |
| H3 本地匹配 | 城市三级选择器（省→市→区）+ 商家入驻入口 | P1 |
| H2 对接 | 粉丝量区间筛选 + 报价区间筛选 + 达人城市标签 | P1 |
| H4 招募 | 岗位类型标签 + 工作模式标签（全职/兼职/项目制/实习） | P1 |

---

## 三、目标架构（v1.2 完成后）

```
creator-hub/
├── index.html              ← 骨架 (~300行): <html> + panel divs + <link>/<script>
├── css/
│   ├── variables.css       ← :root { --paper, --ink, --wobbly, --xhs, --douyin... }
│   ├── base.css            ← reset, typography, layout
│   ├── components.css      ← .btn, .card, .toast, .modal, .avatar, .badge
│   └── pages.css           ← #panel-home, #panel-chat, #panel-match...
├── js/
│   ├── app.js              ← init(), global state
│   ├── auth.js             ← initAuth, doLogin, doRegister, doLogout, loadSession
│   ├── data.js             ← sb client, CRUD, normalizePost, loadAllData
│   ├── router.js           ← switchTab + tab dispatch
│   ├── track.js            ← track(), AB testing
│   ├── utils.js            ← escapeHtml, showToast, avatarGradient, fmtTime
│   ├── xp.js               ← addXP, saveXP, updateLevelDisplay
│   ├── realtime.js         ← subscribeAll, pollUpdates (deduped)
│   ├── pages/
│   │   ├── home.js         ← initHomepage
│   │   ├── square.js       ← renderFeed
│   │   ├── chat.js         ← renderChatContacts, sendMessage, renderWorldChat
│   │   ├── recruit.js      ← renderRecruits, openRecruitDrawer
│   │   ├── match.js        ← renderMatch, openMatchMsg, publishMatch
│   │   ├── local.js        ← renderLocalMatch
│   │   ├── community.js    ← renderPosts, createPost, openPostDetail
│   │   ├── friends.js      ← renderFriendsList, showFriendProfile
│   │   └── profile.js      ← renderProfile, saveProfile, renderAvatarPicker
│   └── components/
│       ├── toast.js
│       ├── modal.js
│       ├── emoji-picker.js
│       └── avatar.js
├── supabase/
│   └── migration.sql       ← 12 tables + tightened RLS (v1.2)
├── docs/                   ← 25 + 3 new (design-plan, prd-v1.3, architecture-v1.2)
└── vercel.json
```

### 加载顺序

```html
<!-- index.html <head> -->
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/pages.css">

<!-- index.html </body>前 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="js/utils.js"></script>
<script src="js/data.js"></script>
<script src="js/track.js"></script>
<script src="js/auth.js"></script>
<script src="js/xp.js"></script>
<script src="js/realtime.js"></script>
<script src="js/components/toast.js"></script>
<script src="js/components/modal.js"></script>
<script src="js/components/emoji-picker.js"></script>
<script src="js/components/avatar.js"></script>
<script src="js/pages/home.js"></script>
<script src="js/pages/square.js"></script>
<script src="js/pages/chat.js"></script>
<script src="js/pages/recruit.js"></script>
<script src="js/pages/match.js"></script>
<script src="js/pages/local.js"></script>
<script src="js/pages/community.js"></script>
<script src="js/pages/friends.js"></script>
<script src="js/pages/profile.js"></script>
<script src="js/router.js"></script>
<script src="js/app.js"></script>
```

---

## 四、数据流（v1.2 加强版）

```
                    ┌──────────────┐
                    │  Supabase    │
                    │  (12 tables) │
                    └──┬───────┬──┘
                       │       │
              Realtime │       │ Poll (3s, server-cursor)
              (INSERT) │       │
                       ↓       ↓
              ┌────────────────────┐
              │   data.js          │
              │   normalizePost()  │  ← 统一字段映射
              │   dedup by id/key  │  ← 去重
              └────────┬───────────┘
                       │
                       ↓
              ┌────────────────────┐
              │   内存状态          │
              │   posts[], contacts │
              │   myFriends[], ...  │
              └────────┬───────────┘
                       │
                       ↓
              ┌────────────────────┐
              │   render*()         │
              │   escapeHtml() 全覆盖│  ← XSS 防御
              │   data-* + delegate │  ← onclick 安全
              └────────┬───────────┘
                       │
                       ↓
              ┌────────────────────┐
              │   DOM              │
              │   (skeleton → data │
              │    → empty state)  │  ← 三态 UI
              └────────────────────┘
```

### 原则（不变 + 新增）

1. **内存是真相来源** — 渲染从内存读
2. **Supabase 是持久层** — 刷新不丢
3. **渲染是单向的** — 数据变 → render → DOM
4. **🆕 统一 normalize** — 所有入站数据走 normalizePost/normalizeRecruit 等
5. **🆕 去重优先** — Realtime + 轮询用稳定 key 去重
6. **🆕 三态 UI** — 每个 panel: loading skeleton → 数据 → empty/error

---

## 五、UI 设计系统（手账/便签美学 v1.2 加强）

### 色板（不变）

| Token | 值 | 用途 |
|-------|-----|------|
| `--paper` | `#fdfbf7` | 页面背景（纸色） |
| `--ink` | `#2d2d2d` | 正文、边框 |
| `--muted` | `#e5e0d8` | 分割线、禁用态 |
| `--red` | `#ff4d4d` | 强调、通知徽章 |
| `--blue` | `#2d5da1` | 链接、主按钮 |
| `--sage` | `#7aa874` | 成功、在线状态 |
| `--postit` | `#fff9c4` | 便签黄（卡片 hover） |
| `--green` | `#bdeca6` | 标签、徽章 |
| `--orange` | `#ffd49a` | 警告、XP 进度条 |

### 🆕 三态 UI 模式

每个数据面板遵循：

```
加载中 (skeleton shimmer)
    ↓ 数据到达
有数据 → 正常渲染
无数据 → Empty State (友好插画 + CTA)
    ↓ 请求失败
Error State (toast + retry 按钮)
```

**Skeleton 规格**:
```css
.skeleton {
  height: 80px;
  border-radius: var(--wobbly-sm);
  background: linear-gradient(90deg, var(--muted) 25%, var(--gray) 50%, var(--muted) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

**Empty State 规格**:
```html
<div class="empty-state">
  <div class="empty-icon">🕳️</div>
  <p class="empty-title">还没有帖子</p>
  <p class="empty-desc">发表你的第一篇帖子，和创作者们交流吧</p>
  <button class="btn" onclick="...">✨ 发帖</button>
</div>
```

### 🆕 Toast 加强

- 位置: `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999`
- 类型: success (✅绿), error (❌红), warning (⚠️橙), info (💬蓝)
- 动画: slideDown 0.3s → stay 2s → fadeOut 0.3s

### 🆕 Modal 统一

所有弹窗（留言意向、招募详情、确认删除）共用 modal 组件:
```js
function showModal({ title, body, actions, onClose }) { ... }
```

---

## 六、安全架构（v1.2 P0 修复后）

### RLS 策略矩阵

| 表 | SELECT | INSERT | UPDATE | DELETE |
|----|--------|--------|--------|--------|
| profiles | 全员可读 | 仅自己 | 仅自己 | — |
| posts | 全员可读 | auth用户 | — | auth用户 |
| comments | 全员可读 | auth用户 | — | — |
| chat_messages | sender或recipient | auth用户 | — | — |
| world_messages | 全员可读 | auth用户 | — | — |
| notifications | 接收者本人 | auth用户 | 接收者本人 | — |
| recruits | 全员可读 | auth用户 | — | 发布者 |
| match_demands | 全员可读 | auth用户 | — | 发布者 |
| local_demands | 全员可读 | auth用户 | — | 发布者 |
| friends | 用户本人 | auth用户 | — | 用户本人 |
| friend_requests | from_user或to_user | auth用户 | — | — |
| xp_records | 用户本人 | auth用户 | — | — |
| onboarding_status | 用户本人 | auth用户 | 用户本人 | — |
| tracking_events | 全员可读 | 全员(含匿名) | — | — |

### XSS 防御分层

```
Layer 1: escapeHtml() — 所有用户文本走 HTML entity 转义
Layer 2: data-* + event delegation — onclick 不拼用户数据
Layer 3: textContent — 纯文本场景优先用 textContent 而非 innerHTML
Layer 4: CSP — vercel.json 加 Content-Security-Policy header (v1.3)
```

---

## 七、质量门禁

| 阶段 | 检查项 | 工具 |
|------|--------|------|
| 代码提交 | P0 修复完整性 | `/review` |
| 代码提交 | XSS 覆盖率 | grep 验证 |
| 安全审计 | RLS + XSS + 依赖 | `/cso` |
| 浏览器验收 | 登录→帖子→聊天→对接 全流程 | `/browse` |
| 回归 | 所有 panel 切换 + CRUD | `/qa` (standard tier) |
| 性能 | 首屏 ≤ 2s, 切换 ≤ 200ms | Lighthouse |

---

## 八、v1.3 预览（不在本次 scope）

```
v1.3 差异化补齐:
├── 新手引导全流程 (onboarding wizard)
├── 行业讨论区 (报价/避坑/工具/政策 子标签)
├── 城市三级选择器 (省→市→区)
├── 粉丝量/报价区间筛选器
├── 岗位类型+工作模式标签
└── Content-Security-Policy header
```

---

*属于 CreatorHub 产品工程化管线 — 阶段 3.5：修复硬化 + 架构演进*
