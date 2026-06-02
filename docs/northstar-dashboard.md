# CreatorHub 北极星仪表盘

> **版本**: v1.0 | **日期**: 2026-06-03 | **阶段**: 6 — 发布与运营

---

## 一、北极星指标

> **DAU（日活跃用户）** — 每天至少登录一次的去重用户数。

选择理由：DAU 同时捕获了用户规模（注册转化 × 推广效果）和用户粘性（留存 × 社区活跃），是衡量创作者社交平台健康度的核心指标。

---

## 二、指标树

```
DAU（北极星）
├── 新用户
│   ├── 访问量（page_view）
│   ├── 注册量（user_register）
│   └── 注册转化率 = 注册 / 访问
│
├── 留存用户
│   ├── 昨日留存 = 昨日 DAU 中今天也有 login 的比例
│   ├── 7 日留存 = 7 天前注册用户今天仍有 login 的比例
│   └── 30 日留存
│
├── 活跃度
│   ├── 社区活跃
│   │   ├── 日发帖数（post_create）
│   │   ├── 日评论数（comment_create）
│   │   └── 周活跃发帖用户数
│   ├── 对接活跃
│   │   ├── 日对接意向数（match_intent_send）
│   │   ├── 日需求发布数（match_demand_publish + local_demand_publish + recruit_publish）
│   │   └── 日浏览对接页用户数（match_view + local_match_view）
│   └── 社交活跃
│       ├── 日私聊消息数（chat_message_send private）
│       ├── 日世界频道消息数（chat_message_send world）
│       └── 日新增好友数（friend_add）
│
└── 新人漏斗
    ├── 新手引导开始数（user_onboarding_view step=1）
    ├── 新手引导完成率 = complete / start
    └── 新人首周发帖率 = 注册7天内发过帖的占比
```

---

## 三、仪表盘设计

### 3.1 变现前方案：Console 查询面板

在 MVP 阶段（无后端），在浏览器 Console 中运行以下脚本即可获得当日仪表盘数据：

```js
// ===== CreatorHub 北极星仪表盘 v1 =====
// 在浏览器 Console 中运行

(async function Dashboard() {
  const events = JSON.parse(localStorage.getItem('creatorhub_events') || '[]');
  const users = JSON.parse(localStorage.getItem('creatorhub_users') || '{}');
  const now = Date.now();
  const DAY = 86400000;
  
  // 时间窗口
  const today = new Date().toDateString();
  const yesterday = new Date(now - DAY).toDateString();
  const weekAgo = now - 7 * DAY;
  const monthAgo = now - 30 * DAY;
  
  // 辅助函数
  const inRange = (ts, start) => ts >= start;
  const unique = arr => [...new Set(arr)];
  
  // ===== 今日概览 =====
  const todayEvents = events.filter(e => new Date(e.timestamp).toDateString() === today);
  const todayUsers = unique(todayEvents.map(e => e.user));
  
  // ===== DAU =====
  const dau = unique(
    events.filter(e => e.event === 'user_login' && new Date(e.timestamp).toDateString() === today)
      .map(e => e.user)
  ).length;
  
  const yesterdayDAU = unique(
    events.filter(e => e.event === 'user_login' && new Date(e.timestamp).toDateString() === yesterday)
      .map(e => e.user)
  ).length;
  
  // ===== 新用户 =====
  const newUsersToday = events.filter(e => e.event === 'user_register' && new Date(e.timestamp).toDateString() === today).length;
  
  // ===== 留存 =====
  const registered7d = unique(
    events.filter(e => e.event === 'user_register' && e.timestamp >= weekAgo).map(e => e.user)
  );
  const retained7d = registered7d.filter(u =>
    events.some(e => e.event === 'user_login' && e.user === u && new Date(e.timestamp).toDateString() === today)
  ).length;
  const retention7d = registered7d.length ? (retained7d / registered7d.length * 100).toFixed(1) + '%' : 'N/A';
  
  // ===== 活跃度 =====
  const postsToday = events.filter(e => e.event === 'post_create' && new Date(e.timestamp).toDateString() === today).length;
  const commentsToday = events.filter(e => e.event === 'comment_create' && new Date(e.timestamp).toDateString() === today).length;
  const intentsToday = events.filter(e => e.event === 'match_intent_send' && new Date(e.timestamp).toDateString() === today).length;
  const msgsToday = events.filter(e => e.event === 'chat_message_send' && new Date(e.timestamp).toDateString() === today).length;
  
  // ===== MVP 假设验证 =====
  const onboardingComplete = events.filter(e => e.event === 'user_onboarding_complete').length;
  const onboardingStart = events.filter(e => e.event === 'user_onboarding_view' && e.props.step === 1).length;
  const onboardingRate = onboardingStart ? (onboardingComplete / onboardingStart * 100).toFixed(1) + '%' : 'N/A';
  
  const localDemands = events.filter(e => e.event === 'local_demand_publish').length;
  
  // ===== 输出 =====
  console.log('%c📊 CreatorHub 北极星仪表盘 %c' + today,
    'font-size:20px;font-weight:bold;', 'font-size:14px;color:#666;');
  console.log('');
  
  console.log('%c━━━ 👥 用户 ━━━', 'color:#4A90D9;font-weight:bold;');
  console.log(`  🎯 DAU:          ${dau} (昨日 ${yesterdayDAU} ${dau>=yesterdayDAU?'📈':'📉'})`);
  console.log(`  🆕 今日新用户:    ${newUsersToday}`);
  console.log(`  👥 今日活跃用户:  ${todayUsers.length}`);
  console.log(`  📦 总注册用户:    ${Object.keys(users).length}`);
  console.log(`  🔁 7日留存:       ${retention7d} (${retained7d}/${registered7d.length})`);
  
  console.log('');
  console.log('%c━━━ 💬 活跃度 ━━━', 'color:#E8A838;font-weight:bold;');
  console.log(`  📝 今日发帖:      ${postsToday}`);
  console.log(`  💬 今日评论:      ${commentsToday}`);
  console.log(`  🤝 今日对接意向:  ${intentsToday}`);
  console.log(`  💌 今日聊天消息:  ${msgsToday}`);
  
  console.log('');
  console.log('%c━━━ 🎯 MVP 假设 ━━━', 'color:#7B68EE;font-weight:bold;');
  console.log(`  🧭 H4 新人引导完成率: ${onboardingRate}`);
  console.log(`  📍 H3 本地需求发布数: ${localDemands}`);
  console.log(`  💬 H1 今日互动事件:   ${postsToday + commentsToday + msgsToday}`);
  console.log(`  🤝 H2 今日对接事件:   ${intentsToday}`);
  
  console.log('');
  console.log('%c━━━ 📈 趋势 (近7日) ━━━', 'color:#50B86C;font-weight:bold;');
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * DAY).toDateString();
    const logins = events.filter(e => e.event === 'user_login' && new Date(e.timestamp).toDateString() === d).length;
    const dayPosts = events.filter(e => e.event === 'post_create' && new Date(e.timestamp).toDateString() === d).length;
    const bar = '█'.repeat(Math.min(logins, 30));
    console.log(`  ${d.slice(0,10)} | 👥${String(logins).padStart(2)}| 📝${String(dayPosts).padStart(2)}| ${bar}`);
  }
  
  console.log('');
  console.log('%c💡 提示: 随着用户增长，建议接入 Vercel Analytics 或自建后端数据仓库。', 'color:#999;');
})();
```

### 3.2 仪表盘输出示例

```
📊 CreatorHub 北极星仪表盘 Tue Jun 03 2026

━━━ 👥 用户 ━━━
  🎯 DAU:          12 (昨日 8 📈)
  🆕 今日新用户:    4
  👥 今日活跃用户:  15
  📦 总注册用户:    28
  🔁 7日留存:       42.9% (3/7)

━━━ 💬 活跃度 ━━━
  📝 今日发帖:      8
  💬 今日评论:      15
  🤝 今日对接意向:  6
  💌 今日聊天消息:  34

━━━ 🎯 MVP 假设 ━━━
  🧭 H4 新人引导完成率: 75.0%
  📍 H3 本地需求发布数: 5
  💬 H1 今日互动事件:   57
  🤝 H2 今日对接事件:   6

━━━ 📈 趋势 (近7日) ━━━
  Wed May 28 | 👥 5| 📝 3| █████
  Thu May 29 | 👥 7| 📝 4| ███████
  Fri May 30 | 👥 6| 📝 5| ██████
  Sat May 31 | 👥 4| 📝 2| ████
  Sun Jun 01 | 👥 3| 📝 1| ███
  Mon Jun 02 | 👥 8| 📝 6| ████████
  Tue Jun 03 | 👥12| 📝 8| ████████████
```

---

## 四、后续升级路径

| 阶段 | 方案 | 工具 |
|------|------|------|
| **MVP（当前）** | Console 脚本 + localStorage | 浏览器 DevTools |
| **Beta** | Vercel Analytics 免费版 | Vercel Dashboard |
| **v1.1** | 内嵌仪表盘页面（`#panel-dashboard`）| 从 localStorage 读取 + Chart.js |
| **v2.0（有后端）** | 数据仓库 + BI 看板 | PostgreSQL + Metabase / Grafana |

### v1.1 内嵌仪表盘设计稿

```
┌──────────────────────────────────────────────┐
│  📊 数据看板                    [本周 ▼]      │
├──────────┬──────────┬──────────┬─────────────┤
│  👥 DAU  │  🆕 新用户 │  🔁 留存  │  💬 互动    │
│   12     │    4     │  42.9%  │   57       │
│  ↑50%    │  ↑33%    │  ↑5.2%  │  ↑22%      │
├──────────┴──────────┴──────────┴─────────────┤
│                                               │
│  📈 DAU 趋势图 (近 30 日)                      │
│  [mini bar chart]                             │
│                                               │
│  📝 内容活跃榜（本周）                          │
│  1. 张三 — 5 篇帖子                           │
│  2. 李四 — 3 篇帖子                           │
│                                               │
│  🤝 对接活跃榜（本月）                          │
│  1. 王五 — 12 次意向                          │
│                                               │
└──────────────────────────────────────────────┘
```

---

## 五、指标健康度阈值

| 指标 | 🔴 危险 | 🟡 警告 | 🟢 健康 |
|------|:---:|:---:|:---:|
| DAU | < 3 | 3-9 | ≥ 10 |
| 7日留存 | < 15% | 15-30% | ≥ 30% |
| 注册转化率 | < 10% | 10-25% | ≥ 25% |
| 人均日发帖 | < 0.3 | 0.3-0.6 | ≥ 0.6 |
| 新人引导完成率 | < 40% | 40-60% | ≥ 60% |
| 首屏加载时间 | > 5s | 2-5s | < 2s |

---

## 六、数据回顾节奏

| 频率 | 时间 | 内容 | 参与人 |
|------|------|------|--------|
| 每日 | 5 分钟 | Console 跑仪表盘脚本，扫一眼 DAU + 新增 | 产品作者 |
| 每周 | 周一 15 分钟 | 完整仪表盘 + 7 日趋势 + 假设验证 | 产品作者 |
| 每月 | 月初 30 分钟 | 全月报表 + MVP 假设评估 + 迭代决策 | 产品作者 + 顾问 |

---

*属于 CreatorHub 产品工程化管线 — 阶段 6：发布与运营*
