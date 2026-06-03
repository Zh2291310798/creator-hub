# CreatorHub · 创作者对接广场

> 让创作者在一个有信任、有同伴、有真实机会的地方，被品牌方看见。

跨平台（小红书 / 抖音 / B站 / 快手 / YouTube / TikTok）创作者对接 SPA。
品牌找达人、达人找品牌、本地商家撮合、社区交流、信任分与互评一站式。

[![Tests](https://img.shields.io/badge/unit-93%2F93-brightgreen)]()
[![Smoke](https://img.shields.io/badge/smoke-5%2F5-brightgreen)]()
[![Security](https://img.shields.io/badge/RLS-hardened-blue)]()

---

## ✨ 功能模块

| 模块 | 功能 |
|------|------|
| 🎪 首页 | 平台芯片墙 + 在线创作者 + 身份选择 |
| 📡 动态 | 实时信息流（招募 / 对接 / 帖子） |
| 💬 聊天 | 1:1 私聊 + 🌍 世界频道 + Realtime 推送 |
| 💼 招募 | 多平台招聘发布 / 筛选 / 详情抽屉 |
| 🤝 对接 | 品牌 ⇄ 达人 双向撮合 + 状态机闭环 |
| 📍 本地 | 同城商家 × 本地达人 |
| 📝 社区 | 发帖 / 评论 / 点赞 / 全屏阅读 |
| 👥 好友 | 列表 / 请求 / 发现 / 一键添加 |
| 👤 个人主页 | 资料 / 平台连接 / 信任分 / 互评 |
| ⚙ 设置 | 头像选择器 / 通知 / 隐私 |

### 特色系统

- **信任体系** — 信任分（社区 30% + 平台认证 40% + 交易评价 30%）+ 5 星 × 4 维度互评
- **对接闭环** — `open → negotiating → active → completed`，含聊天框 deal bar
- **等级系统** — 10 级（萌新 → 创世神），统一走 `award_xp` RPC（日上限 500）
- **邀请系统** — 6 位邀请码 + `redeem_invite_code` RPC + 双向自动加好友
- **3 步新人引导** — 选平台 → 跟随导师 → 写第一帖

---

## 🏗 技术栈

- **前端**：纯 Vanilla JS，零构建工具
- **样式**：CSS 变量 + 手账/便签风格
- **数据**：Supabase（PostgreSQL + Auth + Realtime + RLS）
- **部署**：Vercel / GitHub Pages / 拖到浏览器

```
creator-hub/
├── index.html               # 主页面（含 onboarding + 全部 panel）
├── css/
│   ├── variables.css        # 设计 token
│   ├── base.css             # reset + 字体
│   ├── components.css       # 通用组件
│   └── pages.css            # 各 panel 样式
├── js/
│   ├── app.js               # 业务逻辑 (2346 行)
│   └── utils.js             # 纯函数（escapeHtml / formatTime / ...）
├── supabase/
│   ├── migration.sql        # v1 基线表 + RLS
│   ├── migration-v2.sql     # v2 信任分 + 对接状态机 + 邀请码
│   └── migration-v3-security.sql  # v3 安全加固（必须应用）
├── tests/
│   ├── unit.test.js         # 93 个纯函数 assertions
│   ├── smoke.spec.js        # 5 个 Playwright 烟测
│   └── security.spec.js     # 8 个 RLS 实测
└── docs/
    ├── archive/prd-v2.0.md  # 完整 PRD（含安全/产品附录）
    ├── security-audit-2026-06-03.md
    └── ...
```

---

## 🚀 本地运行

### 1. 拉代码

```bash
git clone https://github.com/Eliotcute/creator-hub.git
cd creator-hub
```

### 2. 配置 Supabase

需要在 `js/app.js` 顶部填入你的 Supabase URL 和 anon key（或改成 env 注入）。

### 3. 应用 SQL Migration（**必须按顺序**）

到 [Supabase Dashboard](https://supabase.com) → SQL Editor → 依次粘贴执行：

1. `supabase/migration.sql`
2. `supabase/migration-v2.sql`
3. `supabase/migration-v3-security.sql`（**安全加固，必须**）

### 4. 配置 Auth

Supabase Dashboard → Authentication：

- **Emails** → 开启 Email Confirmation
- **Rate Limits** → signup ≤ 5/h/IP

### 5. 启动

任何静态服务器都行：

```bash
# 或者：python3 -m http.server 8000
npx serve .
```

访问 `http://localhost:8000`。

---

## 🧪 测试

```bash
# 纯函数单测（无依赖）
node tests/unit.test.js                  # 93/93

# Playwright 烟测
npx playwright test tests/smoke.spec.js  # 5/5

# RLS 安全实测（需 SUPABASE_SERVICE_ROLE_KEY 环境变量）
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npx playwright test tests/security.spec.js
```

---

## 🔒 安全

本仓库已通过完整安全审计（详见 [`docs/security-audit-2026-06-03.md`](docs/security-audit-2026-06-03.md)），关键加固：

- **写入身份绑定** — 14 张表 INSERT 策略绑定 `auth.uid()` 对应的 username，防身份冒充
- **XP / 等级 / 信任分服务端化** — `REVOKE UPDATE` + `award_xp` SECURITY DEFINER RPC（日上限 500）
- **SECURITY DEFINER 函数调用者校验** — `confirm_deal / complete_deal / can_review / get_poll_updates`
- **聊天速率触发器** — `chat_messages` 30/60s、`world_messages` 10/60s
- **跨用户写入封装为 RPC** — `redeem_invite_code / follow_mentor`
- **HTTP 安全头** — CSP / HSTS / X-Content-Type-Options（见 `vercel.json`）

---

## 📚 文档

- [`HANDOFF.md`](HANDOFF.md) — 完整开发交接（架构 / 安全 / 产品完善度体检）
- [`docs/archive/prd-v2.0.md`](docs/archive/prd-v2.0.md) — PRD v2.0 + 附录 A（安全合同）+ 附录 B（产品紧急修复）
- [`docs/security-audit-2026-06-03.md`](docs/security-audit-2026-06-03.md) — 安全审计报告
- [`docs/architecture.md`](docs/architecture.md) — 架构说明
- [`docs/vision.md`](docs/vision.md) — 产品愿景
- [`docs/trust-system-design.md`](docs/trust-system-design.md) — 信任体系设计
- [`docs/cold-start-plan.md`](docs/cold-start-plan.md) — 冷启动方案

---

## 🗺 路线图

| 版本 | 状态 | 内容 |
|------|:----:|------|
| v1.0 | ✅ | MVP 原型 |
| v1.2 | ✅ | 安全硬化 + RLS |
| v2.0 | ✅ | 信任 + 冷启动 + 对接闭环 + 移动端 |
| v2.1 | 🚧 | 作品集 + 多角色 + 通知推送 + 邀请仪表盘 |
| v3.0 | 📋 | API 数据同步 + 企业认证 + 支付担保 + 全局搜索 |

详细优先级见 PRD 附录 B。

---

## 📝 License

待定。

