# CreatorHub 数据监控

> **版本**: v1.0 | **日期**: 2026-06-03 | **阶段**: 7 — 迭代与优化

---

## 一、监控体系架构

```
┌─────────────────────────────────────────────────┐
│                  CreatorHub 监控                  │
├─────────────┬─────────────┬─────────────────────┤
│  产品指标    │  技术指标    │  用户反馈            │
│ (埋点数据)   │ (前端性能)   │ (定性数据)           │
├─────────────┼─────────────┼─────────────────────┤
│ DAU         │ JS 错误     │ Beta 问卷评分        │
│ 留存率       │ 页面加载时间 │ 用户访谈             │
│ 互动率       │ 内存占用    │ 社群反馈             │
│ 转化漏斗     │ 文件大小    │ NPS 净推荐值         │
│ 对接率       │ Console 报错 │ 功能请求投票         │
└─────────────┴─────────────┴─────────────────────┘
```

---

## 二、产品指标监控

### 2.1 日常监控脚本

每天在浏览器 Console 中运行一次（与北极星仪表盘脚本共用）：

```js
// ===== CreatorHub 日常健康检查 =====
(function DailyCheck() {
  const events = JSON.parse(localStorage.getItem('creatorhub_events') || '[]');
  const users = JSON.parse(localStorage.getItem('creatorhub_users') || '{}');
  const today = new Date().toDateString();
  const DAY = 86400000;
  const now = Date.now();
  
  const todayEvents = events.filter(e => new Date(e.timestamp).toDateString() === today);
  
  // ⚠️ 告警规则
  const alerts = [];
  
  // 1. 零活跃告警
  if (todayEvents.length === 0) {
    alerts.push('🔴 今日零事件！检查页面是否正常访问');
  }
  
  // 2. 注册率告警（今天页面浏览多但零注册）
  const todayViews = todayEvents.filter(e => e.event === 'page_view').length;
  const todayRegs = todayEvents.filter(e => e.event === 'user_register').length;
  if (todayViews > 10 && todayRegs === 0) {
    alerts.push('🟡 今日访问 > 10 但零注册，检查注册流程');
  }
  
  // 3. 错误告警（检查 Console 报错）
  const jsErrors = events.filter(e => e.event === 'js_error' && new Date(e.timestamp).toDateString() === today);
  if (jsErrors.length > 0) {
    alerts.push('🔴 检测到 ' + jsErrors.length + ' 个 JS 错误');
  }
  
  // 4. 留存告警
  const weekAgo = now - 7 * DAY;
  const registered7d = [...new Set(events.filter(e => e.event === 'user_register' && e.timestamp >= weekAgo).map(e => e.user))];
  const retained7d = registered7d.filter(u => events.some(e => e.event === 'user_login' && e.user === u && new Date(e.timestamp).toDateString() === today));
  const retentionRate = registered7d.length ? retained7d.length / registered7d.length : 0;
  if (registered7d.length >= 5 && retentionRate < 0.15) {
    alerts.push('🟡 7日留存低于 15%: ' + (retentionRate*100).toFixed(0) + '%');
  }
  
  // 5. 空城告警
  const postsToday = todayEvents.filter(e => e.event === 'post_create').length;
  if (todayEvents.filter(e => e.event === 'user_login').length >= 5 && postsToday === 0) {
    alerts.push('🟡 有活跃用户但无人发帖（空城风险）');
  }
  
  // 6. 文件大小告警
  const SIZE_LIMIT = 450 * 1024; // 450KB 告警线
  
  // 输出
  console.log('%c📊 Daily Health Check %c' + today,
    'font-size:16px;font-weight:bold;', 'font-size:12px;color:#888;');
  
  if (alerts.length === 0) {
    console.log('🟢 一切正常');
  } else {
    alerts.forEach(a => console.warn(a));
  }
  
  console.log('  👥 今日登录:', todayEvents.filter(e => e.event === 'user_login').length);
  console.log('  🆕 今日注册:', todayRegs);
  console.log('  👀 今日浏览:', todayViews);
  console.log('  📝 今日发帖:', postsToday);
  console.log('  💌 今日消息:', todayEvents.filter(e => e.event === 'chat_message_send').length);
  console.log('  🔁 7日留存:', (retentionRate*100).toFixed(1) + '%');
})();
```

### 2.2 监控频率与负责人

| 指标 | 检查频率 | 检查方式 | 当前责任人 |
|------|:---:|------|:---:|
| DAU | 每日 | Console 脚本 | 产品作者 |
| 注册转化率 | 每日 | Console 脚本 | 产品作者 |
| 7 日留存 | 每周 | Console 脚本 | 产品作者 |
| 发帖数 | 每日 | Console 脚本 | 产品作者 |
| 对接意向数 | 每周 | Console 脚本 | 产品作者 |
| JS 报错 | 每次修改后 | DevTools Console | 开发者 |
| 页面加载时间 | 每周 | Lighthouse | 开发者 |
| 文件大小 | 每次 push | CI 自动 | CI |
| 用户反馈评分 | Beta 期 | 问卷 | 产品作者 |

---

## 三、技术指标监控

### 3.1 JS 错误捕获

在 `index.html` 中添加全局错误监听（轻量级，不上报后端）：

```js
// ===== 前端错误监控 =====
// 在 <script> 顶部添加

// 捕获未处理的 JS 错误
window.addEventListener('error', function(e) {
  // 只记录脚本错误，忽略资源加载失败
  if (e.error) {
    const err = {
      message: e.error.message || 'Unknown error',
      filename: e.filename ? e.filename.split('/').pop() : '',
      lineno: e.lineno || 0,
      colno: e.colno || 0
    };
    console.error('🚨 JS Error:', err);
    // 记录到埋点系统（与 tracker 共享存储）
    track('js_error', err);
  }
});

// 捕获未处理的 Promise rejection
window.addEventListener('unhandledrejection', function(e) {
  console.error('🚨 Unhandled Rejection:', e.reason);
  track('js_error', {
    message: 'UnhandledRejection: ' + (e.reason?.message || String(e.reason)),
    filename: '',
    lineno: 0,
    colno: 0
  });
});
```

### 3.2 性能监控

```js
// ===== 页面性能监控 =====
// 在 <script> 中，页面加载完成后

window.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    try {
      var perf = performance.getEntriesByType('navigation')[0];
      if (perf) {
        var perfData = {
          dom_ready: Math.round(perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart),
          load_complete: Math.round(perf.loadEventEnd - perf.loadEventStart),
          total: Math.round(perf.loadEventEnd)
        };
        
        // 性能告警
        if (perfData.total > 3000) {
          console.warn('⚠️ 页面加载超过 3 秒: ' + perfData.total + 'ms');
        }
        
        // 记录到埋点（低频——每次会话仅首次加载记录）
        var logged = sessionStorage.getItem('_perf_logged');
        if (!logged) {
          track('page_performance', perfData);
          sessionStorage.setItem('_perf_logged', '1');
        }
      }
    } catch(e) {}
  }, 0);
});
```

### 3.3 CI 自动检查

已在 `.github/workflows/ci.yml` 中配置：

| 检查项 | 方法 | 触发 |
|--------|------|:---:|
| 文件大小 ≤ 500KB | `wc -c < index.html` | 每次 push |
| HTML 结构 | `grep -c 'id="panel-'` | 每次 push |
| 函数数量 | `grep -c 'function '` | 每次 push |
| CSS 变量数 | `grep -c '--'` | 每次 push |
| HTML 验证 | `html5validator` | 每次 push |

---

## 四、用户反馈监控

### 4.1 反馈渠道

| 渠道 | 用途 | 工具 |
|------|------|------|
| Beta 问卷 | 结构化反馈收集 | 腾讯问卷 / 飞书问卷 |
| GitHub Issues | Bug 报告 + 功能请求 | GitHub |
| 社群讨论 | 开放式反馈 | 微信群 / 即刻评论区 |
| 埋点行为数据 | 定量行为分析 | localStorage events |

### 4.2 NPS 简易调查（集成到 App 内）

```js
// ===== NPS 弹窗（v1.1 可集成到首页） =====
function showNPS() {
  // 每 30 天弹一次，已注册 7 天以上用户
  var lastNPS = localStorage.getItem('creatorhub_nps_time');
  var registeredAt = JSON.parse(localStorage.getItem('creatorhub_session_created') || '0');
  var now = Date.now();
  
  if (lastNPS && now - parseInt(lastNPS) < 30 * 86400000) return;
  if (now - registeredAt < 7 * 86400000) return;
  
  var score = prompt(
    '👋 你有多愿意把 CreatorHub 推荐给朋友？\n\n' +
    '0 = 绝对不会   10 = 一定会推荐\n' +
    '请打分（0-10）：'
  );
  
  if (score !== null && !isNaN(score)) {
    var s = Math.max(0, Math.min(10, parseInt(score)));
    track('nps_survey', { score: s });
    localStorage.setItem('creatorhub_nps_time', String(now));
    
    if (s >= 9) showToast('感谢你的支持！❤️');
    else if (s >= 7) showToast('感谢反馈，我们会继续改进 💪');
    else showToast('感谢反馈！方便告诉我们哪里做得不好吗？欢迎在社区发帖 🙏');
  }
}
```

---

## 五、异常事件响应流程

| 严重度 | 定义 | 响应时间 | 行动 |
|:---:|------|:---:|------|
| 🔴 P0 | 登录/注册不可用、页面白屏 | < 1h | 立即回滚 → 修复 → 热修复 push |
| 🟠 P1 | 核心功能异常（发帖失败、对接不跳转） | < 24h | 确认 Bug → 修复 → 下一个 patch |
| 🟡 P2 | 体验问题（UI 错位、文案错误） | < 1w | 记录 → 排期 → 下个版本修复 |
| 🟢 P3 | 优化建议 | 无 | 记录 → 按需排期 |

---

*属于 CreatorHub 产品工程化管线 — 阶段 7：迭代与优化*
