# CreatorHub API 契约

> **版本**: v1.0 | **日期**: 2026-06-02 | **阶段**: 3 — 技术设计

---

## 一、当前：内部函数契约

由于 CreatorHub v1.x 是纯前端，API 实际是**内部函数签名**和**localStorage 数据访问接口**。以下定义核心模块的调用契约。

---

## 二、数据访问层 (Data Layer)

所有 localStorage 操作应通过以下函数，**不应直接调用** `localStorage.getItem/setItem`。

### 用户数据

```js
// 获取所有用户
function getUsers(): Record<string, UserObject>
// 获取单个用户
function getUser(username: string): UserObject | null
// 保存用户（新增或更新）
function saveUser(username: string, data: UserObject): void
// 检查用户名是否存在
function userExists(username: string): boolean
```

### Session

```js
// 获取当前登录用户
function getSession(): string | null
// 设置当前登录用户
function setSession(username: string): void
// 清除登录状态
function clearSession(): void
```

### 经验值

```js
// 获取用户 XP
function getXP(username: string): number
// 增加 XP（含升级检测 + 纸屑动画）
function addXP(amount: number, reason: string): { newXP: number, leveledUp: boolean, newLevel: number }
// 获取用户等级
function getLevel(username: string): number
```

### 社区数据

```js
// 获取帖子列表
function getPosts(): Post[]
// 添加帖子
function addPost(post: Post): void
// 删除帖子（仅作者可删）
function deletePost(postId: string): boolean
// 获取帖子评论
function getComments(postId: string): Comment[]
// 添加评论
function addComment(postId: string, comment: Comment): void
```

### 对接数据

```js
// 获取品牌方需求
function getBrandSeeking(): MatchDemand[]
// 获取达人需求
function getCreatorSeeking(): MatchDemand[]
// 发布对接需求
function publishDemand(demand: MatchDemand): void
// 发送意向留言
function sendMatchIntent(targetUser: string, message: string): void
```

### 好友数据

```js
// 获取好友列表
function getFriends(): string[]
// 发送好友请求
function sendFriendRequest(targetUser: string): void
// 接受好友请求
function acceptFriendRequest(fromUser: string): void
// 拒绝好友请求
function rejectFriendRequest(fromUser: string): void
// 删除好友
function removeFriend(username: string): void
```

### 🆕 本地匹配数据

```js
// 获取本地需求（可按城市/品类筛选）
function getLocalDemands(filters?: { city?: string, category?: string }): LocalDemand[]
// 发布本地需求
function publishLocalDemand(demand: LocalDemand): void
// 关闭本地需求
function closeLocalDemand(demandId: string): void
```

### 🆕 新手引导数据

```js
// 获取新手引导状态
function getOnboardingStatus(username: string): OnboardingStatus
// 更新引导进度
function updateOnboarding(username: string, step: number, data?: Partial<OnboardingStatus>): void
// 新手引导是否已完成
function isOnboardingComplete(username: string): boolean
```

---

## 三、埋点接口

```js
/**
 * 埋点函数——MVP 阶段写入 localStorage
 * @param eventName - 事件名（见 tracking-plan.md）
 * @param props     - 事件属性（可选）
 */
function track(eventName: string, props?: Record<string, any>): void

// 使用示例
track('user_login', { is_new: true, day_streak: 1 });
track('post_create', { category: '新人报到', length: 256 });
track('match_intent_send', { target_user: '小鹿', view_mode: 'brand_seeking' });
```

**契约**：
- `track()` 必须是非阻塞的（异步写入，不影响 UI 响应）
- 所有用户可见操作都应该调用 `track()`
- `track()` 内部自动附加 `user`、`timestamp`、`session_id`

---

## 四、未来：REST API 端点设计（v2.0 参考）

当 CreatorHub 接入后端时，以下是 API 设计蓝图。

### 认证

```
POST   /api/auth/register        ← 注册
  Body:   { username, password, role }
  Return: { token, user }

POST   /api/auth/login           ← 登录
  Body:   { username, password }
  Return: { token, user }

POST   /api/auth/logout          ← 登出
```

### 用户

```
GET    /api/users/:username      ← 获取用户资料
PATCH  /api/users/:username      ← 更新用户资料
GET    /api/users/:username/xp   ← 获取经验值
POST   /api/users/:username/xp   ← 增加经验值
GET    /api/users/discover       ← 发现用户（推荐/搜索）
```

### 社区

```
GET    /api/posts                ← 帖子列表（支持分页/筛选）
  Query:  ?category=&tag=&page=&limit=
POST   /api/posts                ← 发帖
DELETE /api/posts/:id            ← 删帖
GET    /api/posts/:id/comments   ← 获取评论
POST   /api/posts/:id/comments   ← 添加评论
```

### 对接

```
GET    /api/match/demands        ← 对接需求列表
  Query:  ?type=brand|creator&platform=&category=&city=&fans_min=&fans_max=&budget_range=
POST   /api/match/demands        ← 发布对接需求
POST   /api/match/intent         ← 发送对接意向
  Body:   { target_user, message }
```

### 本地匹配

```
GET    /api/local/demands        ← 本地需求列表
  Query:  ?city=&district=&category=
POST   /api/local/demands        ← 发布本地需求
GET    /api/local/creators       ← 本地达人排行
  Query:  ?city=&category=
```

### 好友

```
GET    /api/friends              ← 好友列表
POST   /api/friends/request      ← 发送好友请求
PATCH  /api/friends/request/:id  ← 处理好友请求（接受/拒绝）
DELETE /api/friends/:username    ← 删除好友
```

### 聊天（WebSocket）

```
WS     /ws/chat                  ← WebSocket 连接
  → { type: "private_message", to, text }
  ← { type: "private_message", from, text, time }
  → { type: "world_message", text }
  ← { type: "world_message", user, text, time }
```

### 新手引导

```
GET    /api/onboarding/:username ← 获取引导状态
PATCH  /api/onboarding/:username ← 更新引导进度
```

---

## 五、错误处理契约

### 当前 MVP 阶段

```js
// 所有操作返回 null 或 false 表示失败，上层调用 showToast()
function doLogin(username, password) {
  const users = getUsers();
  if (!users[username]) {
    showToast('用户不存在');
    return false;
  }
  if (users[username].password !== password) {
    showToast('密码错误');
    return false;
  }
  setSession(username);
  showToast('登录成功 🎉');
  return true;
}
```

### 未来 API 阶段

```json
// 统一错误响应格式
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "用户不存在",
    "details": {}
  }
}
```

| HTTP 状态码 | 含义 |
|:----------:|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未登录 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 冲突（如用户名已存在） |
| 500 | 服务器错误 |

---

*属于 CreatorHub 产品工程化管线 — 阶段 3：技术设计*
