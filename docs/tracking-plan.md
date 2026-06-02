# CreatorHub 埋点方案

> **版本**: v1.0 | **日期**: 2026-06-02 | **阶段**: 2 — 需求与数据定义

---

## 一、埋点概览

| 类别 | 事件数 | 覆盖假设 |
|------|:-----:|---------|
| 用户生命周期 | 5 | H1, H4 |
| 社区互动 | 5 | H1 |
| 对接行为 | 5 | H2, H3 |
| 社交行为 | 4 | H1, H4 |
| 页面浏览 | 10 | 全部 |
| **总计** | **29** | |

---

## 二、事件定义

### 2.1 用户生命周期

#### `user_register`
用户完成注册
| 属性 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `role` | string | 注册选择的身份 | `creator` / `brand` / `recruiter` / `freelancer` / `student` / `career_switcher` |
| `timestamp` | number | 注册时间戳 | `1717334400000` |

#### `user_login`
用户登录
| 属性 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `is_new` | boolean | 是否首次登录 | `true` / `false` |
| `day_streak` | number | 连续登录天数 | `3` |
| `timestamp` | number | 登录时间戳 | |

#### `user_logout` / `session_end`
用户登出或会话结束
| 属性 | 类型 | 说明 |
|------|------|------|
| `session_duration_sec` | number | 本次会话时长（秒） |
| `actions_count` | number | 本次会话操作数 |

#### `user_onboarding_view`
查看新手引导页 ← 🆕 H4
| 属性 | 类型 | 说明 |
|------|------|------|
| `user_role` | string | 用户身份 |
| `step` | number | 当前引导步骤 |
| `completed` | boolean | 是否完成引导 |

#### `user_onboarding_complete`
完成新手引导 ← 🆕 H4
| 属性 | 类型 | 说明 |
|------|------|------|
| `followed_count` | number | 关注的前辈数 |
| `articles_read` | number | 阅读的入门文章数 |

---

### 2.2 社区互动

#### `post_create`
用户发帖
| 属性 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `category` | string | 帖子分类 | `新人报到` / `行业讨论` / `经验分享` / `其他` |
| `sub_tag` | string | 子标签（行业讨论） | `报价` / `避坑` / `工具` / `政策` |
| `length` | number | 帖子字数 | `256` |
| `timestamp` | number | 发帖时间戳 | |

#### `post_view`
查看帖子详情
| 属性 | 类型 | 说明 |
|------|------|------|
| `post_id` | string | 帖子 ID |
| `view_duration_sec` | number | 停留时长 |
| `from_source` | string | 来源（列表/推荐/好友主页） |

#### `comment_create`
用户评论
| 属性 | 类型 | 说明 |
|------|------|------|
| `post_id` | string | 被评论帖子 ID |
| `post_author` | string | 帖子作者 |
| `timestamp` | number | 评论时间戳 |

#### `post_delete`
用户删帖
| 属性 | 类型 | 说明 |
|------|------|------|
| `post_id` | string | 帖子 ID |
| `reason` | string | 删除原因（可选） |

#### `community_filter`
社区分类筛选
| 属性 | 类型 | 说明 |
|------|------|------|
| `filter_type` | string | 筛选类型 |

---

### 2.3 对接行为

#### `match_view`
浏览对接卡片
| 属性 | 类型 | 说明 |
|------|------|------|
| `view_mode` | string | 品牌找达人 / 达人找品牌 |
| `filter_applied` | object | 应用的筛选条件 `{platform, category, city, fans_range, budget_range}` |
| `cards_viewed` | number | 浏览卡片数 |

#### `match_filter_apply`
应用对接筛选
| 属性 | 类型 | 说明 |
|------|------|------|
| `filter_type` | string | 筛选维度 |
| `filter_value` | string | 筛选值 |

#### `match_intent_send`
发送对接意向留言
| 属性 | 类型 | 说明 |
|------|------|------|
| `target_user` | string | 目标用户名 |
| `target_role` | string | 目标身份 |
| `view_mode` | string | 品牌找达人 / 达人找品牌 |
| `timestamp` | number | 留言时间 |

#### `match_demand_publish`
发布对接需求
| 属性 | 类型 | 说明 |
|------|------|------|
| `demand_type` | string | 需求类型（找达人/找品牌） |
| `platform` | string | 目标平台 |
| `budget_range` | string | 预算区间 |

#### `local_match_view` ← 🆕 H3
浏览本地匹配页
| 属性 | 类型 | 说明 |
|------|------|------|
| `city` | string | 选择的城市 |
| `district` | string | 选择的区域 |
| `category` | string | 品类筛选 |

#### `local_demand_publish` ← 🆕 H3
发布本地需求
| 属性 | 类型 | 说明 |
|------|------|------|
| `city` | string | 城市 |
| `category` | string | 品类 |
| `budget` | string | 预算区间 |

---

### 2.4 社交行为

#### `friend_add`
添加好友
| 属性 | 类型 | 说明 |
|------|------|------|
| `target_user` | string | 被添加用户名 |
| `source` | string | 来源（发现/帖子/对接/聊天/推荐） |

#### `chat_message_send`
发送私聊消息
| 属性 | 类型 | 说明 |
|------|------|------|
| `chat_type` | string | `private` / `world` |
| `target_user` | string | 私聊对象（世界频道为 null） |
| `has_emoji` | boolean | 是否含表情 |
| `timestamp` | number | 发送时间 |

#### `world_chat_send`
发送世界频道消息
→ 等同于 `chat_message_send` 且 `chat_type = world`

#### `profile_view`
查看他人主页
| 属性 | 类型 | 说明 |
|------|------|------|
| `target_user` | string | 被查看的用户 |
| `source` | string | 来源（对接/社区/好友/聊天） |

---

### 2.5 页面浏览

#### `page_view`
页面浏览（自动触发）
| 属性 | 类型 | 说明 |
|------|------|------|
| `page_name` | string | 页面名称 |
| `previous_page` | string | 上一页 |
| `timestamp` | number | 进入时间 |

| `page_name` 枚举值 |
|---------------------|
| `home` |
| `square` |
| `chat` |
| `recruit` |
| `match` |
| `local_match` ← 🆕 |
| `community` |
| `friends` |
| `profile` |
| `settings` |

---

## 三、OKR 指标 → 埋点映射

| OKR 指标 | 计算方式 | 依赖事件 |
|----------|---------|---------|
| **DAU** | 每日 `user_login` 去重用户数 | `user_login` |
| **7日留存** | 注册后 7 天仍有 `user_login` 的比例 | `user_register` + `user_login` |
| **注册转化率** | `user_register` / `page_view(home)` | `page_view` + `user_register` |
| **周活跃发帖用户** | 每周 `post_create` 去重用户数 | `post_create` |
| **月对接意向** | 每月 `match_intent_send` 总数 | `match_intent_send` |
| **月帖子数** | 每月 `post_create` 总数 | `post_create` |
| **首屏加载时间** | Performance API | 前端性能埋点 |
| **P0 缺陷数** | GitHub Issues 手动统计 | 非埋点 |

---

## 四、MVP 假设 → 埋点映射

| 假设 | 验证指标 | 依赖事件 |
|------|---------|---------|
| H1 归属感 | 7 日留存、互动用户占比 | `user_login`, `post_create`, `comment_create`, `chat_message_send` |
| H2 跨平台对接 | 对接意向发起数、从筛选到意向的时间 | `match_filter_apply`, `match_intent_send`, `match_view` |
| H3 本地匹配 | 本地需求发布数、本地达人响应率 | `local_match_view`, `local_demand_publish`, `match_intent_send(city)` |
| H4 入行入口 | 新人引导完成率、新人首次互动转化 | `user_onboarding_view`, `user_onboarding_complete`, `post_create(新人)` |

---

## 五、技术实施

### MVP 阶段埋点方案
使用 `navigator.sendBeacon` 或简单的 `console.log` + localStorage 存储：

```js
// 埋点函数（MVP 版本——存储到 localStorage，后续可替换为后端上报）
function track(eventName, props = {}) {
  const events = JSON.parse(localStorage.getItem('creatorhub_events') || '[]');
  events.push({
    event: eventName,
    props: props,
    user: localStorage.getItem('creatorhub_session'),
    timestamp: Date.now(),
    session_id: getSessionId()
  });
  // 保留最近 1000 条
  if (events.length > 1000) events.splice(0, events.length - 1000);
  localStorage.setItem('creatorhub_events', JSON.stringify(events));
}
```

### 后续升级
- Vercel Analytics / Google Analytics 接入
- 自建后端 → 数据仓库 → BI 看板

---

*属于 CreatorHub 产品工程化管线 — 阶段 2：需求与数据定义*
