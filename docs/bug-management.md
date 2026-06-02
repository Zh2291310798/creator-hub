# CreatorHub Bug 管理

> **版本**: v1.0 | **日期**: 2026-06-03 | **阶段**: 7 — 迭代与优化

---

## 一、Bug 管理流程

```
发现 Bug
    │
    ▼
提交 Issue (GitHub)
    │
    ▼
分级 (P0 / P1 / P2 / P3)
    │
    ▼
┌── P0 ──→ 立即修复 → Hotfix push → 验证关闭
│
├── P1 ──→ 下一个 patch 修复
│
├── P2 ──→ 排入下个 minor 版本
│
└── P3 ──→ Backlog，按需处理
```

---

## 二、严重度定义

| 等级 | 标签 | 定义 | 示例 | 响应时间 |
|:---:|------|------|------|:---:|
| 🔴 P0 | `critical` | 核心功能完全不可用，阻塞所有用户 | 登录无响应、页面白屏 | < 1h |
| 🟠 P1 | `high` | 重要功能异常，影响部分用户 | 通知红点不更新、对接意向发不出去 | < 24h |
| 🟡 P2 | `medium` | 非核心功能异常，有 workaround | UI 错位、文案错误 | < 1w |
| 🟢 P3 | `low` | 体验优化、样式微调 | 按钮颜色不统一、动画不流畅 | 按需 |

---

## 三、Bug 报告模板

### GitHub Issue 模板（`.github/ISSUE_TEMPLATE/bug_report.md`）

```md
---
name: 🐛 Bug 报告
about: 发现问题？请用这个模板
title: "[Bug] "
labels: bug
assignees: ''
---

### 问题描述
<!-- 一句话描述发生了什么 -->

### 复现步骤
1. 
2. 
3. 

### 预期行为
<!-- 应该发生什么 -->

### 实际行为
<!-- 实际发生了什么 -->

### 截图（如有）
<!-- 拖入截图 -->

### 环境信息
- 浏览器: [Chrome / Edge / Firefox / Safari]
- 操作系统: [Windows / macOS / iOS / Android]
- 用户身份: [达人 / 品牌方 / 学生 / ...]

### 补充信息
<!-- Console 错误信息、localStorage 数据等 -->
```

### Feature Request 模板（`.github/ISSUE_TEMPLATE/feature_request.md`）

```md
---
name: 💡 功能建议
about: 有什么好的想法？
title: "[Feature] "
labels: enhancement
---

### 场景
<!-- 什么情况下需要这个功能？ -->

### 建议
<!-- 你希望怎么实现？ -->

### 替代方案
<!-- 目前你用什么方式绕过了这个问题？ -->
```

---

## 四、当前 Bug 面板

### 已修复

| # | 描述 | 严重度 | 发现日期 | 修复日期 | 修复版本 |
|---|------|:---:|------|------|:---:|
| B1 | 登录页 CSS `display:flex` 与 `display:none` 冲突 | 🔴 P0 | 06-01 | 06-01 | v0.5 |
| B2 | 模板字面量嵌套导致 onclick 失效（全局 JS 报错） | 🔴 P0 | 06-01 | 06-01 | v0.5 |
| B3 | 招募发布只有空壳 Toast，无表单逻辑 | 🟠 P1 | 06-02 | 06-02 | v0.5 |
| B4 | 本地需求缺少删除功能 | 🟠 P1 | 06-02 | 06-02 | v0.5 |
| B5 | 本地达人邀约跳到空聊天框 | 🟠 P1 | 06-02 | 06-02 | v0.5 |
| B6 | 通知铃铛不显示（`updateNotifyBadge` 只在 if 内调用） | 🟠 P1 | 06-02 | 06-02 | v0.5 |
| B7 | 自己的聊天消息也在铃铛中提示 | 🟡 P2 | 06-02 | 06-02 | v0.5 |

### 未修复（已知）

| # | 描述 | 严重度 | 计划版本 |
|---|------|:---:|:---:|
| B8 | 页面刷新后滚动位置丢失 | 🟡 P2 | v1.0.1 |
| B9 | 世界频道消息没有持久化存储 | 🟡 P2 | v1.1 |
| B10 | 移动端部分按钮过小（触摸区域 < 44px） | 🟡 P2 | v1.0.1 |
| B11 | 退出登录功能缺失 | 🟢 P3 | v1.1 |
| B12 | 帖子列表无分页/无限滚动 | 🟢 P3 | v1.1 |

---

## 五、修复流程

### P0 Hotfix

```bash
# 1. 确认 Bug（Console 复现）
# 2. 定位根因
# 3. 修复
git checkout -b hotfix/login-broken

# 4. 本地验证
node --check index.html  # 语法
# 手动功能测试

# 5. 合入 + 部署
git add index.html
git commit -m "hotfix: fix login unresponsive (P0)"
git push origin hotfix/login-broken
# → 创建 PR → 合并到 main → CI 自动部署

# 6. 验证线上
# 打开 GitHub Pages，确认修复
```

### P1/P2 正常修复

```bash
git checkout -b fix/notify-badge
git add index.html
git commit -m "fix: notification badge not showing on empty read state (#B6)"
git push origin fix/notify-badge
# → PR → Code Review → 合并 → 部署
```

---

## 六、Bug 预防措施

### 开发阶段

| 措施 | 说明 |
|------|------|
| `node --check` 每次修改后 | 防止语法错误导致全局 JS 不可用 |
| 模板字面量规则 | 禁止 onclick 中嵌套 `` ` ``，见 `.claude/.../js-template-literal-pitfall.md` |
| `escapeHtml()` 全局使用 | 所有用户输入渲染前转义，防 XSS |
| `.show` class 替代 inline style | 避免 `display:none` / `display:flex` 冲突 |
| try/catch 包裹非关键代码 | 埋点、通知等失败不影响主流程 |

### Code Review 检查点

- [ ] 所有 `innerHTML = `` ` 中有没有嵌套 `` ` ``？
- [ ] 新增函数有没有对应的 `escapeHtml()` 调用？
- [ ] CSS 修改有没有检查 `display` 冲突？
- [ ] 新增的 onclick 有没有用正确的方式传参？
- [ ] 有没有在未登录状态下会报错的代码？
- [ ] `node --check` 通过了吗？

---

## 七、Bug 统计看板

```js
// Console 查询 Bug 热力图
(function BugStats() {
  var events = JSON.parse(localStorage.getItem('creatorhub_events') || '[]');
  var errors = events.filter(function(e) { return e.event === 'js_error'; });
  
  console.log('🐛 Bug 统计');
  console.log('  总错误事件: ' + errors.length);
  console.log('  最近 10 条:');
  
  errors.slice(-10).forEach(function(e) {
    console.log('    ' + e.props.message + ' (line ' + e.props.lineno + ')');
  });
  
  // 按错误类型聚合
  var byMsg = {};
  errors.forEach(function(e) {
    var msg = e.props.message.split(':')[0]; // 只取错误类型
    byMsg[msg] = (byMsg[msg] || 0) + 1;
  });
  
  console.log('  错误类型分布:');
  for (var m in byMsg) {
    console.log('    ' + m + ': ' + byMsg[m]);
  }
})();
```

---

*属于 CreatorHub 产品工程化管线 — 阶段 7：迭代与优化*
