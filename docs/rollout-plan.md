# CreatorHub 灰度发布方案

> **版本**: v1.0 | **日期**: 2026-06-03 | **阶段**: 5 — 测试与质量保障

---

## 一、发布策略总览

CreatorHub 是单文件 SPA，部署在 GitHub Pages + Vercel 双通道。采用**渐进式灰度**策略：

```
内部测试(5人) → 小范围Beta(20-50人) → 公开发布 → 持续迭代
     ↓                ↓                    ↓
  Week 1           Week 2               Week 3+
```

---

## 二、发布阶段

### 阶段 0: 内部测试（当前 → Week 1）

| 项目 | 详情 |
|------|------|
| **测试人员** | 产品作者 + 3-5 名朋友/同事 |
| **部署方式** | 本地 `file://` + GitHub Pages |
| **持续时间** | 3-5 天 |
| **测试重点** | 全部 P0 功能、数据持久化、多浏览器兼容 |
| **通过标准** | 0 个 P0/P1 未修复 Bug，测试用例 100% 通过 |

**阶段 0 入口检查清单：**
- [ ] `node --check` 通过
- [ ] 所有 7 个 tab 页面正常切换
- [ ] 注册 + 登录 + 新手引导完整流程
- [ ] 社区发帖 + 评论 + 删除
- [ ] 对接浏览 + 筛选 + 意向发送
- [ ] 本地匹配浏览 + 发布 + 删除 + 邀约
- [ ] 招聘浏览 + 发布
- [ ] 聊天私聊 + 世界频道
- [ ] 通知铃铛 + 红点 + 跳转 + 清空
- [ ] 好友添加 + 主页查看
- [ ] 设置修改 + 保存
- [ ] 埋点事件写入验证
- [ ] Chrome + Edge + Firefox + Safari 兼容

### 阶段 1: 小范围 Beta（Week 2）

| 项目 | 详情 |
|------|------|
| **用户规模** | 20-50 人 |
| **用户来源** | 社交媒体招募、目标社群邀请、朋友圈 |
| **部署方式** | GitHub Pages（主）+ Vercel（备） |
| **持续时间** | 1 周 |
| **核心指标** | 注册转化率、7日留存、发帖数、对接意向数 |

**Beta 邀请文案模板：**
```
🎬 CreatorHub Beta 测试邀请

嗨！我们正在做一个创作者对接平台——帮达人找品牌、帮品牌找达人、帮本地商家找推广资源。

目前是 Beta 阶段，功能包括：
• 🏠 首页动态 & 行业资源
• 💬 创作者社区 & 行业讨论
• 🤝 跨平台对接（抖音/小红书/B站/视频号）
• 📍 本地达人匹配
• 💼 行业招聘
• 💬 即时聊天 & 世界频道

👉 体验地址：[GitHub Pages URL]
🕐 体验时间：5-10 分钟
📝 反馈问卷：[链接]

你的每一个反馈对产品都很重要！感谢 🙏
```

**Beta 用户反馈收集表：**

| 问题 | 类型 |
|------|------|
| 你是什么身份？（达人/品牌方/学生/招聘方/本地商家） | 单选 |
| 你成功完成了一次对接/发帖/聊天吗？ | 是/否 |
| 哪个功能对你最有用？ | 多选 |
| 哪个功能最没用/看不懂？ | 多选 |
| 遇到过 Bug 吗？请描述 | 开放 |
| 你还希望增加什么功能？ | 开放 |
| 给 CreatorHub 打分（1-10） | 评分 |

### 阶段 2: 公开发布（Week 3+）

| 项目 | 详情 |
|------|------|
| **目标用户** | 不限 |
| **部署方式** | Vercel（主）+ GitHub Pages（镜像） |
| **推广渠道** | 小红书/抖音/即刻/Product Hunt |
| **监控频率** | 每日检查埋点数据和用户反馈 |
| **迭代节奏** | 每周一个小版本 |

---

## 三、部署配置

### 3.1 GitHub Pages（已配置）

```
仓库: creator-hub
分支: main
路径: / (root)
URL: https://<username>.github.io/creator-hub/
```

CI/CD 自动部署（`.github/workflows/ci.yml`）：
- Push 到 main → 自动 HTML 验证 → 自动部署到 GitHub Pages

### 3.2 Vercel（已配置，vercel.json）

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600" }
      ]
    }
  ]
}
```

Vercel 优势：
- 全球 CDN 加速
- 自动 HTTPS
- 自定义域名支持
- Analytics 集成（后续接入）

### 3.3 自定义域名（计划）

| 项目 | 状态 |
|------|:---:|
| 域名购买 | ⬜ 待定 |
| DNS 配置 → Vercel | ⬜ |
| SSL 证书 | Vercel 自动 |

---

## 四、特性开关（Feature Flag）

针对灰度期间，通过简单的 localStorage flag 控制功能可见性：

```js
// 特性开关（在 <script> 中添加）
const FEATURE_FLAGS = {
  // 从 localStorage 读取，默认全部开启
  enableRecruit: localStorage.getItem('ff_recruit') !== 'off',
  enableLocalMatch: localStorage.getItem('ff_local') !== 'off',
  enableWorldChat: localStorage.getItem('ff_world') !== 'off',
  enableOnboarding: localStorage.getItem('ff_onboarding') !== 'off',
  enableNotifications: localStorage.getItem('ff_notifications') !== 'off',
};

// 使用示例——招募 tab 按钮
// if (!FEATURE_FLAGS.enableRecruit) { hide recruit tab button }
```

**灰度期间开关策略：**

| 特性 | 阶段 0 | 阶段 1 | 阶段 2 |
|------|:---:|:---:|:---:|
| 用户系统 | ✅ | ✅ | ✅ |
| 社区 | ✅ | ✅ | ✅ |
| 对接 | ✅ | ✅ | ✅ |
| 本地匹配 | ✅ | ✅ | ✅ |
| 招聘 | ✅ | ✅ | ✅ |
| 聊天 | ✅ | ✅ | ✅ |
| 通知 | ✅ | ✅ | ✅ |
| 新手引导 | ✅ | ✅ | ✅ |

---

## 五、监控与告警

### 5.1 实时监控（手动 + 半自动）

| 监控项 | 方法 | 频率 | 告警阈值 |
|--------|------|:---:|---------|
| 页面可访问 | 浏览器打开 URL | 每日 | 打不开 |
| JS 报错 | Console 检查 | 每次改动后 | 任何红色报错 |
| 埋点写入 | localStorage 检查 | 每次测试后 | 事件数为 0 |
| 注册转化 | 埋点数据 | Beta 期每日 | 注册/访问 < 5% |
| 文件大小 | CI 自动检查 | 每次 push | > 500KB |

### 5.2 埋点监控查询

```js
// 每日在 Console 运行——快速健康检查
(() => {
  const events = JSON.parse(localStorage.getItem('creatorhub_events') || '[]');
  const today = new Date().toDateString();
  
  const todayEvents = events.filter(e => new Date(e.timestamp).toDateString() === today);
  const uniqueUsers = new Set(todayEvents.map(e => e.user));
  
  console.log(`📅 ${today}`);
  console.log(`   今日事件: ${todayEvents.length}`);
  console.log(`   今日用户: ${uniqueUsers.size}`);
  
  const byType = {};
  todayEvents.forEach(e => { byType[e.event] = (byType[e.event] || 0) + 1; });
  console.table(byType);
})();
```

---

## 六、回滚方案

### 触发条件
以下任一条件满足时，立即回滚：
- P0 功能（登录/注册/社区发帖）完全不可用
- 页面白屏/JS 全部报错
- 用户数据丢失（localStorage 被清空）
- 安全漏洞（XSS 可执行任意脚本）

### 回滚步骤（GitHub Pages）
```bash
# 1. 找到上一个正常版本的 commit
git log --oneline -5

# 2. 回滚
git revert <bad-commit-hash>

# 3. 推送（CI 自动部署）
git push origin main

# 4. 验证
# 打开 GitHub Pages URL，确认功能恢复
```

### 回滚步骤（Vercel）
```bash
# Vercel 支持一键回滚到上一个部署
# 在 Vercel Dashboard → Deployments → 选择上一个版本 → Promote to Production
```

---

## 七、发布检查清单

### 阶段 0 → 阶段 1 放行条件

- [ ] 全部 P0 测试用例通过（9 类 × 平均 5 用例 = 45 用例）
- [ ] 0 个 P0 未修复 Bug
- [ ] 0 个 P1 未修复 Bug（或 P1 已记录+有 workaround）
- [ ] Chrome / Edge / Firefox / Safari / 移动端 Chrome 均可用
- [ ] `node --check` 通过
- [ ] CI 绿色
- [ ] 埋点事件正常写入
- [ ] 通知系统正常（铃铛 + 红点 + 跳转）
- [ ] 新手引导完整流程正常
- [ ] 文件大小 < 500KB

### 阶段 1 → 阶段 2 放行条件

- [ ] Beta 用户 ≥ 10 人完成完整体验
- [ ] 反馈评分平均 ≥ 6/10
- [ ] 无 Beta 期间发现的 P0 未修复 Bug
- [ ] 注册转化率 ≥ 30%（访问→注册）
- [ ] 7 日留存有至少 3 个用户数据点
- [ ] 所有特性 flag 已确认开启

---

## 八、推广发布（GTM 前置）

### 发布当天行动清单

| 时间 | 行动 |
|------|------|
| 发布前 1 天 | 确认所有检查清单项通过 |
| 发布前 1 小时 | 最后一遍回归测试 |
| 发布时 | 切换 Vercel 生产域名 |
| 发布后 30 分钟 | 检查埋点数据是否正常上报 |
| 发布后 2 小时 | 发布小红书/即刻/朋友圈推广帖 |
| 发布后 24 小时 | 首次数据复盘 |
| 发布后 1 周 | 首次迭代决策（基于埋点 + 反馈） |

### 推广素材准备

- [ ] 产品截图 × 5（首页、社区、对接、本地、聊天）
- [ ] 30 秒演示 GIF/视频
- [ ] 小红书文案 × 2（产品介绍 + 使用教程）
- [ ] 即刻/朋友圈短文案
- [ ] Product Hunt 英文介绍（可选）

---

## 九、风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:---:|:---:|---------|
| 单文件过大导致加载慢 | 中 | 中 | CI 自动检查大小；超过 500KB 拆分 |
| localStorage 容量不足 | 低 | 中 | 埋点截断 1000 条；关键数据优先 |
| XSS 攻击 | 中 | 高 | `escapeHtml()` 全局使用；CSP header |
| 移动端体验差 | 中 | 中 | Beta 阶段重点收集移动端反馈 |
| 用户量超预期（好事） | 低 | 低 | 单文件 SPA 无后端，没有扩容问题 |
| GitHub Pages 被墙 | 低 | 高 | Vercel 作为备用通道 |

---

*属于 CreatorHub 产品工程化管线 — 阶段 5：测试与质量保障*
