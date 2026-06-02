# CreatorHub 埋点实施设计

> **版本**: v1.0 | **日期**: 2026-06-02 | **阶段**: 3 — 技术设计

---

## 一、实施概览

| 项目 | 说明 |
|------|------|
| 埋点函数 | `track(eventName, props)` |
| 存储方式 | `localStorage` → `creatorhub_events` |
| 最大保留 | 1000 条 |
| 自动附加 | `user`, `timestamp`, `session_id` |
| 调用位置 | 29 个事件点，分散在现有函数中 |

---

## 二、核心埋点函数

```js
// ===== 埋点模块（放在 <script> 顶部）=====

// 生成简单会话 ID
function getSessionId() {
  let sid = sessionStorage.getItem('_sid');
  if (!sid) {
    sid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    sessionStorage.setItem('_sid', sid);
  }
  return sid;
}

// 埋点函数
function track(eventName, props = {}) {
  try {
    const events = JSON.parse(localStorage.getItem('creatorhub_events') || '[]');
    events.push({
      event: eventName,
      props: props,
      user: localStorage.getItem('creatorhub_session') || 'anonymous',
      timestamp: Date.now(),
      session_id: getSessionId()
    });
    // 保留最近 1000 条
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    localStorage.setItem('creatorhub_events', JSON.stringify(events));
  } catch(e) {
    // 静默失败，不影响主流程
  }
}
```

---

## 三、埋点插入位置

### 3.1 用户生命周期（5 个事件）

#### `user_register`
**文件位置**: `doRegister()` 函数内，注册成功后

```js
function doRegister() {
  // ... 现有注册逻辑 ...
  if (users[username]) { showToast('用户名已存在'); return; }
  // ... 创建用户 ...
  localStorage.setItem('creatorhub_users', JSON.stringify(users));
  setSession(username);

  // === 插入埋点 ===
  track('user_register', { role: roleSelect.value });
  // ===============
  showToast('注册成功！欢迎加入 CreatorHub 🎉');
}
```

#### `user_login`
**文件位置**: `doLogin()` 函数内，登录成功后

```js
function doLogin() {
  // ... 验证密码 ...
  setSession(username);
  const today = new Date().toDateString();
  const lastLogin = localStorage.getItem('creatorhub_lastLogin');
  const isNewDay = lastLogin !== today;
  const dayStreak = /* 计算连续登录天数 */;

  // === 插入埋点 ===
  track('user_login', {
    is_new: false,
    day_streak: dayStreak
  });
  // ===============
  if (isNewDay) addXP(25, '每日登录');
}
```

#### `user_onboarding_view` ← 🆕
**文件位置**: 新手引导覆盖层的每个步骤切换时

```js
function showOnboardingStep(step) {
  // === 插入埋点 ===
  track('user_onboarding_view', {
    user_role: myProfile.role,
    step: step,
    completed: false
  });
  // ===============
  // ... 渲染步骤内容 ...
}
```

#### `user_onboarding_complete` ← 🆕
**文件位置**: 新手引导最后一步完成时

```js
function completeOnboarding() {
  updateOnboarding(myProfile.name, 5);
  addXP(100, '完成新手引导');

  // === 插入埋点 ===
  const status = getOnboardingStatus(myProfile.name);
  track('user_onboarding_complete', {
    followed_count: status.followedUsers.length,
    articles_read: status.articlesRead.length
  });
  // ===============
  showToast('欢迎加入 CreatorHub！🎉');
  switchTab('home');
}
```

---

### 3.2 社区互动（5 个事件）

#### `post_create`
**文件位置**: `createPost()` 函数内，发帖成功后

```js
function createPost() {
  // ... 获取内容 ...
  posts.unshift({ id, author, content, category: cat, subTag, time, date, likes: 0, commentCount: 0 });

  // === 插入埋点 ===
  track('post_create', {
    category: cat,
    sub_tag: subTag || '',
    length: content.length
  });
  // ===============
  renderPosts(currentFilter);
  addXP(50, '发帖');
}
```

#### `post_view`
**文件位置**: `openPostDetail()` 函数内

```js
function openPostDetail(postId) {
  // ... 渲染帖子详情 ...
  const post = posts.find(p => p.id === postId);

  // === 插入埋点 ===
  track('post_view', {
    post_id: postId,
    from_source: currentTab || 'community'
  });
  // ===============
  // ... 显示全屏详情 ...
}
```

#### `comment_create`
**文件位置**: 评论发送逻辑中

```js
function submitComment(postId) {
  // ... 获取评论内容 ...
  if (!postComments[postId]) postComments[postId] = [];
  postComments[postId].push({ author: myProfile.name, text, time });

  // === 插入埋点 ===
  track('comment_create', {
    post_id: postId,
    post_author: posts.find(p => p.id === postId)?.author
  });
  // ===============
  addXP(10, '评论');
}
```

#### `post_delete`
**文件位置**: `deletePost()` 函数内

```js
function deletePost(postId) {
  // === 插入埋点（删帖前记录） ===
  track('post_delete', { post_id: postId });
  // ===============
  posts = posts.filter(p => p.id !== postId);
  renderPosts(currentFilter);
}
```

#### `community_filter`
**文件位置**: 社区分类 Tab 切换时

```js
function renderPosts(filter) {
  // === 插入埋点（仅当 filter 变化时） ===
  if (filter !== lastCommunityFilter) {
    track('community_filter', { filter_type: filter });
    lastCommunityFilter = filter;
  }
  // ===============
  // ... 渲染帖子列表 ...
}
```

---

### 3.3 对接行为（5 个事件）

#### `page_view(match)` / `match_view`
**文件位置**: `renderMatch()` 函数内

```js
function renderMatch() {
  // ... 现有渲染逻辑 ...

  // === 插入埋点 ===
  track('match_view', {
    view_mode: currentMatchView,  // 'brand_seeking' | 'creator_seeking'
    filter_applied: getActiveFilters(),
    cards_viewed: document.querySelectorAll('.match-card').length
  });
  // ===============
}
```

#### `match_filter_apply`
**文件位置**: 筛选下拉框 change 事件中

```js
document.getElementById('match-filter-platform').addEventListener('change', function(e) {
  // === 插入埋点 ===
  track('match_filter_apply', {
    filter_type: 'platform',
    filter_value: e.target.value
  });
  // ===============
  renderMatch();
});
```

#### `match_intent_send`
**文件位置**: `openMatchMsg()` 的发送逻辑中

```js
function sendMatchIntent(target, message) {
  // ... 存储意向 ...
  addXP(30, '发起对接');

  // === 插入埋点 ===
  track('match_intent_send', {
    target_user: target,
    target_role: getUserRole(target),
    view_mode: currentMatchView
  });
  // ===============
  showToast('留言已发送 💌');
}
```

#### `match_demand_publish`
**文件位置**: `publishMatch()` 函数内

```js
function publishMatch() {
  // ... 获取表单数据 ...
  // ... 添加到 brandSeekingData / creatorSeekingData ...

  // === 插入埋点 ===
  track('match_demand_publish', {
    demand_type: matchType,  // 'seeking_creator' | 'seeking_brand'
    platform: platformSelect.value,
    budget_range: budgetSelect.value
  });
  // ===============
  renderMatch();
  showToast('需求已发布 📢');
}
```

---

### 3.4 🆕 本地匹配（2 个新事件）

#### `local_match_view`
**文件位置**: `renderLocalMatch()` 函数内 ← 🆕

```js
function renderLocalMatch(city, category) {
  // === 插入埋点 ===
  track('local_match_view', {
    city: city || myProfile.city || '未设置',
    district: selectedDistrict || '全部',
    category: category || '全部'
  });
  // ===============
  // ... 渲染本地匹配列表 ...
}
```

#### `local_demand_publish`
**文件位置**: 本地需求发布函数内 ← 🆕

```js
function publishLocalDemand() {
  // ... 获取表单数据 ...
  const demands = JSON.parse(localStorage.getItem('creatorhub_local_demands') || '[]');
  demands.push({ id, businessName, city, district, category, title, description, budget, requirements, contact, postedBy: myProfile.name, postedAt: Date.now(), status: 'open' });
  localStorage.setItem('creatorhub_local_demands', JSON.stringify(demands));

  // === 插入埋点 ===
  track('local_demand_publish', {
    city: city,
    category: category,
    budget: budget
  });
  // ===============
  addXP(40, '发布本地需求');
  renderLocalMatch(city);
}
```

---

### 3.5 社交行为（4 个事件）

#### `friend_add`
**文件位置**: 添加好友逻辑中

```js
function addFriend(targetUser) {
  myFriends.push(targetUser);
  // 清理请求
  friendRequests = friendRequests.filter(r => r.from !== targetUser);

  // === 插入埋点 ===
  track('friend_add', {
    target_user: targetUser,
    source: currentTab  // 从哪个页面添加的
  });
  // ===============
  addXP(20, '添加好友');
  renderFriendsList();
}
```

#### `chat_message_send`
**文件位置**: `sendMessage()` 函数内

```js
function sendMessage() {
  // ... 发送逻辑 ...
  contacts[activeContact].messages.push({ from: 'me', text, time });

  // === 插入埋点 ===
  track('chat_message_send', {
    chat_type: 'private',
    target_user: activeContact,
    has_emoji: /[\u{1F300}-\u{1F9FF}]/u.test(text)
  });
  // ===============
  addXP(5, '聊天');
  renderChatMessages();
}
```

#### `world_chat_send`
**文件位置**: `sendWorldMessage()` 函数内

```js
function sendWorldMessage() {
  // ... 发送逻辑 ...

  // === 插入埋点 ===
  track('chat_message_send', {
    chat_type: 'world',
    has_emoji: /[\u{1F300}-\u{1F9FF}]/u.test(text)
  });
  // ===============
  renderWorldChat();
}
```

#### `profile_view`
**文件位置**: `showFriendProfile()` + 从其他地方查看用户主页时

```js
function showFriendProfile(uid) {
  // === 插入埋点 ===
  track('profile_view', {
    target_user: uid,
    source: currentTab
  });
  // ===============
  // ... 渲染好友资料弹窗 ...
}
```

---

### 3.6 页面浏览（自动触发）

**文件位置**: `switchTab()` 函数内

```js
let currentTab = 'home';

function switchTab(tab) {
  if (tab === currentTab) return;  // 避免重复记录

  // === 插入埋点 ===
  track('page_view', {
    page_name: tab,
    previous_page: currentTab
  });
  // ===============

  currentTab = tab;
  // ... 面板切换逻辑 ...
}
```

---

## 四、实施检查清单

| # | 事件 | 插入位置 | 状态 |
|---|------|---------|:---:|
| 1 | `user_register` | `doRegister()` | ⬜ |
| 2 | `user_login` | `doLogin()` | ⬜ |
| 3 | `user_onboarding_view` | 新手引导步骤切换 | ⬜ 🆕 |
| 4 | `user_onboarding_complete` | 新手引导完成 | ⬜ 🆕 |
| 5 | `post_create` | `createPost()` | ⬜ |
| 6 | `post_view` | `openPostDetail()` | ⬜ |
| 7 | `comment_create` | 评论提交 | ⬜ |
| 8 | `post_delete` | `deletePost()` | ⬜ |
| 9 | `community_filter` | `renderPosts()` | ⬜ |
| 10 | `match_view` | `renderMatch()` | ⬜ |
| 11 | `match_filter_apply` | 筛选 change 事件 | ⬜ |
| 12 | `match_intent_send` | 留言发送 | ⬜ |
| 13 | `match_demand_publish` | `publishMatch()` | ⬜ |
| 14 | `local_match_view` | `renderLocalMatch()` | ⬜ 🆕 |
| 15 | `local_demand_publish` | 本地需求发布 | ⬜ 🆕 |
| 16 | `friend_add` | 添加好友 | ⬜ |
| 17 | `chat_message_send` | `sendMessage()` | ⬜ |
| 18 | `chat_message_send(world)` | `sendWorldMessage()` | ⬜ |
| 19 | `profile_view` | `showFriendProfile()` | ⬜ |
| 20 | `page_view` | `switchTab()` | ⬜ |

---

*属于 CreatorHub 产品工程化管线 — 阶段 3：技术设计*
