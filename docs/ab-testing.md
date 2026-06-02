# CreatorHub A/B 实验方案

> **版本**: v1.0 | **日期**: 2026-06-03 | **阶段**: 7 — 迭代与优化

---

## 一、A/B 实验架构

MVP 阶段用 localStorage 做客户端分流，零依赖、即时生效。

```js
// ===== A/B 实验引擎 =====
// 在 <script> 中添加

var AB = {
  // 获取实验分组
  get: function(experimentId) {
    var key = 'ab_' + experimentId;
    var bucket = localStorage.getItem(key);
    if (!bucket) {
      // 首次访问：随机分配到 A 或 B
      bucket = Math.random() < 0.5 ? 'A' : 'B';
      localStorage.setItem(key, bucket);
      // 记录实验曝光
      track('ab_exposure', { experiment: experimentId, bucket: bucket });
    }
    return bucket;
  },
  
  // 强制分组（调试用）
  force: function(experimentId, bucket) {
    localStorage.setItem('ab_' + experimentId, bucket);
    console.log('🧪 AB[' + experimentId + '] → ' + bucket);
  },
  
  // 列出所有实验
  list: function() {
    var result = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.startsWith('ab_')) {
        result[k.slice(3)] = localStorage.getItem(k);
      }
    }
    return result;
  },
  
  // 清除分组（重新随机）
  reset: function(experimentId) {
    localStorage.removeItem('ab_' + experimentId);
  }
};

// 使用示例:
// var bucket = AB.get('onboarding_v2');
// if (bucket === 'B') { showNewOnboarding(); }
// else { showOldOnboarding(); }
```

---

## 二、实验流程

```
1. 提出假设
   "如果把注册后直接进首页 改为 注册后自动弹出新手引导，
    引导完成率能提升 20%"

2. 设计实验
   ├── 对照组 A: 现状（注册后进首页，可选择跳过引导）
   ├── 实验组 B: 注册后强制弹出新手引导（不可跳过第一步）
   └── 分流比例: 50/50

3. 配置分流
   var bucket = AB.get('onboarding_mandatory');
   
4. 运行实验（≥ 1 周或样本量 ≥ 50）
   
5. 分析结果
   └── 对比 A/B 组的新手引导完成率、7日留存

6. 决策
   ├── B 显著更好 → 全量上线
   ├── 无明显差异 → 保持 A
   └── B 显著更差 → 终止实验，回退 A
```

---

## 三、实验画布

| 实验 ID | 假设 | 对照组 A | 实验组 B | 核心指标 | 状态 |
|------|------|---------|---------|---------|:---:|
| `onboarding_mandatory` | 强制引导提升完成率 | 可选跳过引导 | 第一步不可跳过 | 引导完成率 | 📋 计划中 |
| `home_feed_v2` | 卡片式 Feed 提升浏览时长 | 列表式 Feed | 卡片大图 Feed | 首页停留时长 | 📋 计划中 |
| `cta_color` | 绿色按钮比蓝色更有吸引力 | 蓝色主按钮 | 绿色主按钮 | CTA 点击率 | 📋 计划中 |
| `local_default_city` | 自动定位城市提升本地匹配使用 | 手动选城市 | 自动定位当前城市 | 本地页 PV | 📋 计划中 |
| `register_short` | 减少注册字段提升转化 | 用户名+密码+身份 | 仅用户名+密码（身份后选） | 注册转化率 | 📋 计划中 |

---

## 四、实验代码模板

```js
// ===== 实验: onboarding_mandatory =====

// 在 showOnboarding() 函数中:
function showOnboarding() {
  var bucket = AB.get('onboarding_mandatory');
  _onboardingStep = 1;
  _onboardingData = { followed: [], articlesRead: [] };
  
  var el = document.getElementById('onboardingOverlay');
  if (!el) return;
  el.classList.add('show');
  
  // 实验组 B: 隐藏跳过按钮（第一步）
  if (bucket === 'B' && _onboardingStep === 1) {
    document.getElementById('skipOnboarding').style.display = 'none';
  }
  
  renderOnboardingStep();
}

// 记录实验结果
function completeOnboarding() {
  var bucket = AB.get('onboarding_mandatory');
  updateOnboarding(myProfile.name, 5);
  addXP(100, '完成新手引导');
  
  track('user_onboarding_complete', {
    followed_count: _onboardingData.followed.length,
    articles_read: _onboardingData.articlesRead.length,
    ab_bucket: bucket  // ← 关键：标记实验分组
  });
  
  showToast('欢迎加入 CreatorHub！🎉');
  switchTab('home');
}
```

---

## 五、实验结果分析

### 分析脚本（在 Console 运行）

```js
// ===== A/B 实验结果分析 =====
(function analyzeAB(experimentId) {
  var events = JSON.parse(localStorage.getItem('creatorhub_events') || '[]');
  
  // 分组统计
  var groups = {};
  events.filter(function(e) {
    return e.event === 'ab_exposure' && e.props.experiment === experimentId;
  }).forEach(function(e) {
    var bucket = e.props.bucket;
    if (!groups[bucket]) groups[bucket] = { users: new Set(), conversions: 0, total: 0 };
    groups[bucket].users.add(e.user);
    groups[bucket].total++;
  });
  
  // 目标事件统计（示例：onboarding_complete）
  var goalEvent = 'user_onboarding_complete';
  events.filter(function(e) {
    return e.event === goalEvent && e.props.ab_bucket;
  }).forEach(function(e) {
    var b = e.props.ab_bucket;
    if (groups[b]) groups[b].conversions++;
  });
  
  console.log('%c🧪 A/B 实验结果: ' + experimentId,
    'font-size:16px;font-weight:bold;');
  console.log('');
  
  for (var bucket in groups) {
    var g = groups[bucket];
    var rate = g.users.size > 0 ? (g.conversions / g.users.size * 100).toFixed(1) : '0.0';
    console.log('  ' + bucket + ': ' + g.users.size + ' 用户 | ' + g.conversions + ' 转化 | ' + rate + '%');
  }
  
  // 显著性提示
  console.log('');
  console.log('💡 样本量 < 100 时差异可能不显著，建议延长实验时间。');
})('onboarding_mandatory');
```

---

## 六、实验纪律

| 规则 | 说明 |
|------|------|
| 同时只跑 1-2 个实验 | 避免实验间相互干扰 |
| 最小样本量 | 每组至少 25 个用户才看数据 |
| 最短运行时间 | ≥ 7 天（覆盖工作日+周末周期） |
| 偷看数据 | 允许随时查看（小团队没那么多规矩），但决策等满 7 天 |
| 负结果也记录 | "B 组无显著差异"也是有效结论，避免后续重复实验 |
| 全量上线后清理 | 实验结束 → 全量上线 → 删除 AB 代码 |

---

## 七、实验记录模板

```md
## 实验: onboarding_mandatory

| 项目 | 内容 |
|------|------|
| 实验 ID | onboarding_mandatory |
| 假设 | 强制引导第一步能提升引导完成率 20% |
| 对照组 A | 注册后可跳过引导 |
| 实验组 B | 第一步不可跳过 |
| 核心指标 | 引导完成率 |
| 观察指标 | 7日留存、注册转化率 |
| 开始日期 | 2026-07-01 |
| 结束日期 | 2026-07-14 |
| 样本量 | A=30, B=28 |
| 结果 | A 完成率 55%, B 完成率 72% (+17%) |
| 决策 | ✅ 全量上线 B |
```

---

*属于 CreatorHub 产品工程化管线 — 阶段 7：迭代与优化*
