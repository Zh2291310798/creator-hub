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

---

## 七、2026-06-03 Handoff — 安全硬化 P0/P1

### 测试状态
- `node tests/unit.test.js` → **93/93** assertions pass
- `npx playwright test tests/smoke.spec.js` → **5/5** smoke pass
- `npx playwright test tests/security.spec.js` → 本地无 `SUPABASE_SERVICE_ROLE_KEY`，按预期 **0 run / skipped**

### 安全审计状态
- [x] P0 写入身份冒充：`supabase/migration-v3-security.sql` 已替换 14 张表 INSERT policy 为 `<table>_insert_own_v2`，绑定 caller username。
- [x] P0 XP / level / trust_score 客户端直写：已 `REVOKE UPDATE`，前端 XP 写入改走 `award_xp` RPC，评价信任分改为 reviews trigger 触发。
- [x] P0 SECURITY DEFINER caller checks：`confirm_deal` / `complete_deal` / `can_review` / `get_poll_updates` 已校验 caller，不匹配抛 `forbidden`。
- [x] P0 tracking_events SELECT：`track_read_own` 已收紧为 `current_username() = username`，登录态 INSERT 由 trigger 覆盖 username。
- [x] P1 保留用户名：注册前调用 `is_username_allowed(p_username)`；禁止 `admin/root/官方/客服/支付宝/微信/抖音/小红书/creatorhub/系统`。
- [x] P1 注册 race：已删除 `doRegister` 手动 `profiles.insert`，依赖 `handle_new_user` trigger。
- [x] P1 邀请奖励上限：`award_xp` 限制每日总 XP 500，`邀请好友注册` 每日 250；邀请兑换改为 `redeem_invite_code(p_code)` SECURITY DEFINER。
- [x] P1 聊天速率限制：`chat_messages` 30/60s、`world_messages` 10/60s trigger 已加入。
- [x] P1 安全头和缓存：`vercel.json` 已按 PRD A.3.2 改写。

### 应用 migration
1. 打开 Supabase Dashboard。
2. 进入 **SQL Editor**。
3. 新建 query。
4. 粘贴 `supabase/migration-v3-security.sql` 全文。
5. 点击 **Run**，确认无报错。
6. 立即再次点击 **Run** 执行第二遍，确认 migration 幂等且无报错。
7. 进入 **Authentication → Emails**，开启 Email Confirmation。
8. 进入 **Authentication → Rate Limits**，将 signup rate limit 调低（建议 5/h/IP）。
9. 再部署前端。

*Security hardening updated: 2026-06-03*

---

## 八、2026-06-04 产品完善度全面体检

> 安全补丁应用后做的全面盘点：哪些是真实跑通的，哪些是壳子，哪些 PRD 写了但没做。
> 评分基线：**PRD v2.0 + v2.1**（P0+P1 范围）。

### 8.1 总体评分

| 维度 | 实现度 | 备注 |
|------|:-----:|------|
| 核心信任体系 (Trust Epic) | **85%** | 信任分、平台连接、互评全在；缺：截图凭证上传、API 自动同步 |
| 冷启动 (Cold Start Epic) | **80%** | 邀请、3 步引导、种子内容全在；缺：邀请贡献仪表盘、被邀请人发帖/对接 +XP 奖励链 |
| 对接交易闭环 (Deal Epic) | **90%** | 状态机、确认/完成、我的对接 Tab、聊天 deal bar 全在 |
| 多角色 + 作品集 (Epic 4) | **0%** | 完全没做（PRD 列为 v2.1） |
| 移动端响应式 (Epic 5) | **70%** | 多个 @media 断点覆盖 900/768/600/375，但底部导航折叠未实现 |
| 通知 + 留存 (Epic 6) | **20%** | 站内通知 + 铃铛 dropdown 在；缺：Web Push、邮件召回 |
| 安全 | **95%** | 见第七节；Supabase Dashboard 两步配置后即可上线 |
| 工程基线 | **60%** | 见 8.6 |
| **加权综合** | **≈ 72%** | 距离 v2.0 PRD 北极星 (周对接 ≥10) 还差留存机制 |

### 8.2 已实现且真实跑通

- 邮箱注册/登录（Supabase Auth + handle_new_user trigger）
- 3 步新人引导：选平台 → 选导师 → 写第一帖（含 follow_mentor RPC）
- 社区帖子：分类筛选、详情抽屉、评论、点赞、删除（按用户所有权）
- 招募板：4 种岗位类型 + 9 个平台 filter + 发布表单
- 对接板：品牌⇄达人 分屏 + 留言意向 → 自动开聊天
- 本地需求：6 品类 + 城市筛选 + 本地达人推荐
- 好友：列表 + 请求 + 发现 + 搜索
- 聊天：1:1 + 世界频道 + 表情选择器 + 实时（postgres_changes + 10s 轮询兜底）
- 个人主页：城市、工作状态、头像渐变、平台展示、等级条
- 平台连接：8 个平台 URL 正则校验 + 手动填粉丝数（无截图、无 API 同步）
- 信任分：social 30% + platform 40% + review 30%，AFTER INSERT ON reviews 触发器自动重算（安全修复后）
- 评价：5 星 × 4 维度（品牌→达人）/ 3 维度（达人→品牌），由 `can_review` 守门（caller + ≥5 条聊天）
- 对接状态机：open → negotiating → active → completed，含聊天框 deal bar
- 邀请系统：6 位邀请码 + `redeem_invite_code` SECURITY DEFINER + 双向加好友 + 邀请人 +50 XP
- XP 系统：10 级 + 每日登录 +25 + 发帖/聊天/对接 XP（统一走 `award_xp` RPC，日上限 500）
- 通知中心：铃铛下拉 + 100 条上限 + 跨标签跳转
- 种子内容：10 帖 + 5 本地需求 + 5 对接（含 [搬运] is_seed 标识）
- 移动响应：4 个断点（900/768/600/375）

### 8.3 ⚠ 是壳子，未真实工作

| 位置 | 表面行为 | 真实情况 | 风险 |
|------|---------|---------|------|
| `index.html` 通用抽屉 `🤝 我有意向` 按钮 | `showToast('已发送意向！对方会收到通知')` | **不发任何通知** | 用户以为发了 |
| `index.html` 通用抽屉 `📋 复制联系方式` | `showToast('已复制联系方式')` | **不写剪贴板** | 同上 |
| `handleImageUpload` (app.js:801) | `showToast("图片已选择（前端演示模式）")` | **不上传** | imgUploader 是死链 |
| 通知设置 4 个 checkbox（"新消息通知"等） | `onchange="showToast('通知设置已更新')"` | **不持久化，不生效** | 设置是装饰 |
| 隐私设置 3 个 checkbox（"显示在线状态"等） | 同上 | 同上 | 同上 |
| 首页统计 `1284 / 56 / 38 / 203` | data-count 滚动动画 | **硬编码假数** | 没接真实 count(*) |
| profile `1284 关注 / 6892 粉丝` | 显示数字 | **硬编码假数** | |
| 底部 `CreatorHub v1.0.0 · Built with ❤️` | 版本号 | **PRD 已 v2.0** | 版本号脱节 |

招募卡片的"我有意向"按钮（app.js:1398）是真的会 `deliverNotification`，这是好的。**问题是通用抽屉（对接/本地通用入口）的两个按钮是 stub**，建议下一个迭代统一行为。

### 8.4 ⚠ PRD 要求但未实现

| PRD 条目 | 优先级 | 状态 | 影响 |
|---------|:-----:|:-----:|------|
| 忘记密码 / 重置密码流程 | 隐含 P0 | ❌ | 用户忘密码无法自救；登录页文案"用于登录和找回密码"是空话 |
| Email Confirmation UI 反馈 | P0（隐含） | ❌ | 开启 Email Confirm 后注册流程会"看似失败"——`doRegister` 不告诉用户去查邮箱 |
| 平台数据截图上传 (F1) | P0 | ⚠ | UI 只有 URL + 粉丝数输入，没有截图字段（PRD F1 表格里有"截图"） |
| 作品集 (F5 / US-M2) | P1 | ❌ | v2.1 范围 |
| 多角色切换 (F7 / US-M1) | P1 | ❌ | v2.1 范围 |
| 邀请贡献展示 (US-C5) | P2 | ❌ | "已邀请 X 人 + 他们贡献 Y" 没做 |
| Web Push Notifications (US-N1) | P2 | ❌ | 留存抓手缺位 |
| 邮件召回 (US-N2) | P2 | ❌ | 同上 |
| 品牌主页 (PRD v2.1 矩阵) | P2 | ❌ | 品牌方没有自己的展示页 |
| 全局搜索（帖子/招募/达人） | 隐含 | ⚠ | 只有好友搜索 + 城市筛选，没有跨类型搜索 |
| 北极星指标 dashboard | 内部需要 | ❌ | "周对接完成数 ≥10" 没有看板，运营盲飞 |

### 8.5 UX / 完成度细节扣分

- 抽屉「联系方式」**真的是字段**吗？看 `drawerActions` 没有 `drawerContact` 字段渲染，意味着抽屉里"复制联系方式"无数据可复制。
- **登录态丢失**：`sb.auth.onAuthStateChange` 监听了 SIGNED_IN，但没监听 `SIGNED_OUT`/`TOKEN_REFRESHED`。若 token 过期，用户会卡在加载态。
- **网络失败无降级**：`pollUpdates` 每 10s 跑一次，挂掉时 `console.error` 但不告诉用户"连接断开"。Realtime channel 进入 `CHANNEL_ERROR` 状态也只有 `console.error`。
- **错误吞没**：大量 `.insert(...).then(function(){})` 模式，DB 写失败用户无感知（例：发帖、发招募、发对接、发本地需求、发邀请）。
- **空状态文案不一致**：有的写"还没有..."，有的写"暂无..."，有的"📋 还没有对接记录"，统一性差。
- **Logout 后 `location.reload()` 是粗暴的**：保留 URL 上的 `?invite=...` 会无意义重复触发 captureInviteCode。
- **`showModal` 的 `opts.body` 是裸 HTML**（app.js:818），调用者要自己负责转义——可重构。
- **Accessibility 接近 0**：无 `aria-label`、无 `role="dialog"`、无 keyboard nav、对比度未测。
- **i18n**：纯中文，无 i18n 框架（PRD 明确排除多语言，这是有意为之，但写在 8.5 提醒）。

### 8.6 工程基线

- **`js/auth.js / data.js / router.js / track.js / xp.js` 是 1 字节空文件** — 模块拆分是 aspirational，所有逻辑挤在 `js/app.js` 2346 行单文件里。
- **`index.html` 是 4 行的"超长行"**，几乎无法人工 diff，编辑器渲染卡顿。建议放一份非压缩源，构建时压缩。
- **无 CI/CD**：`.github/workflows/` 不存在；测试要手动跑。
- **Migration 应用纯手动**：没有 `supabase` CLI 集成，dashboard 粘贴的方式无法 review、无法回滚。
- **`favicon` 是 `data:`（空）**，浏览器 tab 上是默认图标。
- **无 PWA manifest**、无 service worker，"添加到主屏"体验缺失。
- **无 SEO/OG tags**：除 `<meta name=description>` 外，没有 `og:image / og:title / twitter:card`，分享到任何 IM 都是裸链。
- **CDN 加载 Supabase JS 无 SRI** — `<script src="https://cdn.jsdelivr.net/...supabase.min.js">` 没有 `integrity` 属性，供应链劫持风险。
- **HANDOFF 第二节说"零外部依赖"** 但 supabase-js 是 CDN 依赖；文档与现状不符。

### 8.7 建议的下一步顺序（按 ROI）

1. **本周必做（不上线就出事）** — 把 8.3 里的壳子按钮去壳或砍掉：
   - 通用抽屉的"我有意向"/"复制联系方式"：要么接 `deliverNotification` + `navigator.clipboard.writeText`，要么直接删除按钮（误导比缺功能更坏）。
   - 通知/隐私设置的 7 个 checkbox：要么持久化到 `profiles.preferences JSONB`，要么改成"即将推出"灰态。
   - 首页/profile 的硬编码统计数字：要么接 `count(*) FROM profiles` 等真实 RPC，要么挂上"演示数据"标签。
   - 底部版本号：改成 `v2.0.0`，或动态从某处读。

2. **上线前必做（PRD 隐含 P0）**：
   - 忘记密码流程：登录页 `<a>` 触发 `sb.auth.resetPasswordForEmail()` + 接收 `PASSWORD_RECOVERY` 事件后展示重置 UI。
   - Email Confirmation 状态反馈：当 `signUp` 返回 `user` 但无 `session` 时，明确弹"📧 已发送验证邮件到 xxx，请查收"。
   - 平台连接截图上传字段：要么接 Supabase Storage，要么明确删除 PRD F1 中的"截图"行（对齐 PRD ↔ 实现）。

3. **冷启动效率（PRD 北极星）**：
   - 邀请贡献仪表盘（US-C5）：profile 加一行"已邀请 N 人，他们贡献了 X 帖 + Y 对接"。这是邀请人继续转发的最大动力。
   - 北极星 dashboard：先做最简版本——管理员看 `SELECT count(*) FROM match_demands WHERE deal_status='completed' AND deal_closed_at > now() - interval '7 days'`。

4. **v2.1 范围（PRD 已规划）**：
   - 作品集（US-M2）：profile 加 `portfolio` 表（标题/描述/链接/截图最多 3 张/上限 6 项）。
   - 多角色切换（US-M1）：profile 加 `roles JSONB`，顶部头像区下拉切换，对接广场对调。

5. **工程基线（不会拖延业务但拖延迭代）**：
   - `index.html` 拆成非压缩源；CI 跑测试；migration 走 `supabase db push`。
   - 加 PWA manifest + SRI + favicon + OG tags（一次性 1 小时收尾）。

### 8.8 ship 决策

**当前可不可以上线？** 可以软上（邀请制内测），不可硬上（公开 launch）。

- ✅ 安全已硬化（第七节）
- ✅ 核心闭环跑通（注册→引导→发帖/对接→评价→信任分）
- ❌ 忘记密码、Email Confirm 反馈、壳子按钮是上线前必修
- ❌ 留存机制（推送/召回/邀请仪表盘）是冷启动期会赔本买流量的"漏桶"

建议节奏：
1. 本周修 8.3 + 8.7 第 1、2 项 → **内测 ship**（邀请制 50 人）
2. 下周做 8.7 第 3 项 + 北极星 dashboard → **小范围公测 200 人**
3. v2.1 做 8.7 第 4 项 → **正式 launch**

*Product audit: 2026-06-04*
