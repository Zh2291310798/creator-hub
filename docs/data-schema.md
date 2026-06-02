# CreatorHub 数据 Schema

> **版本**: v1.0 | **日期**: 2026-06-02 | **阶段**: 2 — 需求与数据定义

---

## 一、存储架构

```
浏览器 localStorage
├── creatorhub_users       ← 用户账号数据
├── creatorhub_session     ← 当前登录用户名
├── creatorhub_xp          ← 用户经验值
├── creatorhub_lastLogin   ← 上次登录日期
├── creatorhub_events      ← 🆕 埋点事件
├── creatorhub_local_demands ← 🆕 本地需求
├── creatorhub_onboarding  ← 🆕 新手引导状态
│
内存（JS 变量）
├── myProfile              ← 当前用户资料
├── contacts               ← 聊天联系人
├── posts                  ← 社区帖子
├── postComments           ← 帖子评论
├── recruits               ← 招募信息
├── brandSeekingData       ← 品牌方对接需求
├── creatorSeekingData     ← 达人对接需求
├── allUsers               ← 可发现用户
├── myFriends              ← 好友列表
├── friendRequests         ← 好友请求
├── worldChat              ← 世界频道消息
└── avatarGradients        ← 渐变色方案
```

---

## 二、localStorage 数据定义

### 2.1 `creatorhub_users`
```json
{
  "用户名": {
    "name": "string — 用户名",
    "password": "string — 明文密码（MVP）",
    "role": "string — brand | creator | recruiter | freelancer | student | career_switcher",
    "roleLabel": "string — 身份中文标签",
    "avatarChoice": "string — gradient-0~15 | emoji-0~19",
    "bio": "string — 个人简介",
    "platforms": ["string — 平台名"],
    "tags": ["string — 标签"],
    "city": "string — 🆕 所在城市",
    "district": "string — 🆕 所在区域",
    "workStatus": "string — 🆕 fulltime | parttime | project | not_looking",
    "createdAt": "number — 注册时间戳"
  }
}
```

### 2.2 `creatorhub_session`
```json
"当前登录的用户名（string）"
```

### 2.3 `creatorhub_xp`
```json
{
  "用户名": 1250  // number — 累计经验值
}
```

### 2.4 `creatorhub_lastLogin`
```json
"2026-06-02"  // DateString
```

### 2.5 `creatorhub_events` ← 🆕
```json
[
  {
    "event": "string — 事件名",
    "props": {},          // object — 事件属性
    "user": "string — 用户名",
    "timestamp": 1717334400000,
    "session_id": "string — UUID"
  }
]
// 最多保留 1000 条，超出删除旧数据
```

### 2.6 `creatorhub_local_demands` ← 🆕
```json
[
  {
    "id": "string — UUID",
    "businessName": "string — 商家名称",
    "city": "string — 城市",
    "district": "string — 区域",
    "category": "string — 品类: food|beauty|fitness|entertainment|hotel|retail|other",
    "title": "string — 需求标题",
    "description": "string — 需求描述",
    "budget": "string — 预算区间",
    "requirements": "string — 达人要求",
    "contact": "string — 联系方式",
    "postedBy": "string — 发布者用户名",
    "postedAt": "number — 时间戳",
    "status": "string — open|closed"
  }
]
```

### 2.7 `creatorhub_onboarding` ← 🆕
```json
{
  "用户名": {
    "completed": false,
    "currentStep": 1,
    "followedUsers": ["string — 关注的前辈"],
    "articlesRead": ["string — 阅读的文章 ID"],
    "firstPostDone": false
  }
}
```

---

## 三、内存数据结构

### 3.1 `myProfile`
```ts
{
  name: string;          // 用户名
  role: string;          // 身份 key
  roleLabel: string;     // 身份中文名
  bio: string;           // 简介
  platforms: string[];   // 关联平台
  tags: string[];        // 标签
  avatarChoice: string;  // 头像选择
  level: number;         // 等级 (1-10)
  xp: number;            // 当前经验值
  city: string;          // 🆕 城市
  workStatus: string;    // 🆕 工作状态
}
```

### 3.2 `posts`
```ts
Array<{
  id: string;            // UUID
  author: string;        // 作者用户名
  content: string;       // 正文
  category: string;      // 分类: 经验分享|新人报到|行业讨论|其他
  subTag: string;        // 🆕 子标签: 报价|避坑|工具|政策
  time: string;          // 发布时间 "HH:MM"
  date: string;          // 发布日期 "YYYY-MM-DD"
  likes: number;         // 点赞数
  commentCount: number;  // 评论数
  isLiked: boolean;      // 当前用户是否点赞
}>
```

### 3.3 `postComments`
```ts
{
  [postId: string]: Array<{
    author: string;      // 评论者
    text: string;        // 内容
    time: string;        // 时间
  }>
}
```

### 3.4 `recruits`
```ts
Array<{
  id: string;
  title: string;         // 岗位标题
  company: string;       // 公司/品牌
  platform: string;      // 平台
  type: string;          // 🆕 岗位类型: host|editor|operation|design|other
  mode: string;          // 🆕 工作模式: fulltime|parttime|project|intern
  description: string;   // 岗位描述
  requirements: string;  // 要求
  salary: string;        // 薪资
  city: string;          // 🆕 城市
  postedBy: string;      // 发布者
  postedAt: number;      // 时间戳
}>
```

### 3.5 `brandSeekingData` / `creatorSeekingData`
```ts
Array<{
  id: string;
  name: string;          // 品牌名/达人名
  role: string;          // 身份
  platforms: string[];   // 平台
  categories: string[];  // 类目
  description: string;   // 描述
  budget: string;        // 预算/报价
  city: string;          // 🆕 城市
  postedBy: string;      // 发布者
  postedAt: number;      // 时间戳
}>
```

### 3.6 `allUsers`
```ts
Array<{
  id: string;            // 用户名
  name: string;          // 显示名
  role: string;          // 身份
  roleLabel: string;     // 身份标签
  bio: string;           // 简介
  platforms: string[];   // 平台
  tags: string[];        // 标签
  avatarChoice: string;  // 头像
  level: number;         // 等级
  city: string;          // 🆕 城市
  workStatus: string;    // 🆕 工作状态
  localCompleted: number;// 🆕 本地推广完成数
}>
```

### 3.7 `myFriends` / `friendRequests`
```ts
myFriends: string[]           // 好友用户名列表
friendRequests: Array<{
  from: string;               // 发起者
  to: string;                 // 接收者
  status: string;             // pending|accepted|rejected
  timestamp: number;
}>
```

### 3.8 `worldChat`
```ts
Array<{
  id: string;            // UUID
  user: string;          // 发送者
  text: string;          // 内容
  time: string;          // 时间
}>
// 最多保留 200 条
```

---

## 四、实体关系

```
User (用户)
 ├─ has one Profile (个人资料)
 ├─ has one XP (经验值)
 ├─ has many Posts (帖子)
 ├─ has many Comments (评论)
 ├─ has many Friends (好友) → User
 ├─ has many FriendRequests (好友请求)
 ├─ belongs to City (城市)
 ├─ has WorkStatus (工作状态)
 │
 ├─ as Brand (品牌方)
 │   ├─ has many BrandSeeking (品牌对接需求)
 │   ├─ has many LocalDemands (本地需求)
 │   └─ has many Recruits (招募信息)
 │
 └─ as Creator (创作者)
     ├─ has many CreatorSeeking (达人对接需求)
     └─ has LocalRank (本地排名) in City
```

---

## 五、等级系统

| 等级 | 称号 | 所需 XP | 累计 XP |
|:---:|------|:------:|:------:|
| 1 | 萌新 | 0 | 0 |
| 2 | 见习 | 100 | 100 |
| 3 | 入门 | 200 | 300 |
| 4 | 进阶 | 350 | 650 |
| 5 | 熟练 | 500 | 1,150 |
| 6 | 达人 | 700 | 1,850 |
| 7 | 专家 | 1,000 | 2,850 |
| 8 | 大咖 | 1,500 | 4,350 |
| 9 | 传说 | 2,500 | 6,850 |
| 10 | 创世神 | 5,000 | 11,850 |

---

## 六、XP 获取规则

| 行为 | XP | 日上限 |
|------|:--:|:-----:|
| 每日登录 | +25 | 1 次 |
| 发帖 | +50 | 3 次 |
| 评论 | +10 | 10 次 |
| 私聊消息 | +5 | 20 次 |
| 添加好友 | +20 | 5 次 |
| 发起对接意向 | +30 | 5 次 |
| 完成新手引导 | +100 | 1 次 |
| 🆕 发布本地需求 | +40 | 3 次 |
| 🆕 首次新人报到帖 | +50 | 1 次 |

---

*属于 CreatorHub 产品工程化管线 — 阶段 2：需求与数据定义*
