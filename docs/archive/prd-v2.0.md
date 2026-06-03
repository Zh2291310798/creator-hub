# CreatorHub 产品需求文档 (PRD) v2.0

> **版本**: v2.0 | **日期**: 2026-06-03 | **阶段**: 3 — 产品化 (信任 + 冷启动 + 交易闭环)
> **基于**: PRD v1.3 + 产品差距分析 + 冷启动方案 + 信任体系设计

---

## 零、版本定位

| 版本 | 定位 | 核心问题 |
|------|------|---------|
| v1.0 | MVP 原型 | "这个想法能做出来吗？" |
| v1.2 | 安全硬化 | "这个东西能安全上线吗？" |
| v1.3 | 差异化补齐 | "和竞品比有什么不同？" |
| **v2.0** | **产品化** | **"用户为什么会留下来？"** |

v2.0 回答的是**留存和信任**，不是功能堆叠。

---

## 一、产品概述

### 一句话

让创作者在一个有信任、有同伴、有真实机会的地方，被品牌方看见。

### v2.0 要解决的核心问题

```
当前:
  访客打开 → 看看对接广场 → 全是种子内容 → 注册 → 逛逛 → 离开 → 不回来

v2.0 目标:
  访客打开 → 看到真实创作者+验证数据 → 注册 → 
  新人引导 → 发第一帖 → 获得 XP+回应 → 
  连接平台 → 展示真实数据 → 收到对接意向 → 
  完成合作 → 互评 → 信任分提升 → 更多机会 → 留下来
```

### v2.0 北极星指标

**周活跃创作者完成对接数** (Weekly Active Creator Deals)

---

## 二、用户故事

### Epic 1：信任建立 (新)

| ID | 用户故事 | 验收标准 | 优先级 |
|----|---------|---------|:---:|
| US-T1 | 作为创作者，我想连接我的小红书/抖音/B站主页，让品牌方看到我的真实数据 | 支持 6 个平台 URL 校验 + 手动填粉丝数 + 截图上传；连接后在个人主页+对接卡片展示 🏅 | P0 |
| US-T2 | 作为品牌方，我想在搜索达人时优先看到数据真实的创作者 | 对接搜索结果默认按信任分降序；达人卡片展示已连接平台标签 | P0 |
| US-T3 | 作为品牌方，我想在合作完成后评价达人，帮助其他品牌判断 | 5 星 × 4 维度评价；评价在达人主页展示 | P1 |
| US-T4 | 作为达人，我想评价合作过的品牌方，帮助其他达人避坑 | 5 星 × 3 维度评价；评价在品牌主页展示 | P1 |

### Epic 2：冷启动 (新)

| ID | 用户故事 | 验收标准 | 优先级 |
|----|---------|---------|:---:|
| US-C1 | 作为早期用户，我想邀请朋友入驻并获得 XP 奖励 | 生成邀请链接；邀请成功 +50 XP；被邀请人发帖 +30 XP；被邀请人首次对接 +100 XP | P0 |
| US-C2 | 作为被邀请的新人，我想通过专属链接注册并自动关注邀请人 | 邀请链接注册自动绑定关系；邀请人自动加入好友列表 | P0 |
| US-C3 | 作为访客，我想看到真实的需求和帖子，而不是空荡荡的页面 | 种子内容 50+ 条（需求+帖子），有 [搬运] 标识；真实内容优先排序 | P0 |
| US-C4 | 作为新人，我想在 3 步引导后立即有内容可看、有人可关注 | 选平台偏好 → 关注推荐前辈 → 发新人报到帖 | P0 |
| US-C5 | 作为邀请人，我想看到我邀请的用户和他们带来的贡献 | 个人主页展示"已邀请 X 人"+"他们贡献了 Y 条帖子+Z 次对接" | P2 |

### Epic 3：对接交易闭环 (新)

| ID | 用户故事 | 验收标准 | 优先级 |
|----|---------|---------|:---:|
| US-D1 | 作为品牌方，我想追踪每个对接的状态（意向→洽谈→合作→完成） | 对接需求卡片展示状态标签；聊天框顶部展示当前对接状态 | P0 |
| US-D2 | 作为品牌方/达人，我可以在聊天中确认"开始合作"并标记"合作完成" | 聊天框新增"确认合作"/"标记完成"按钮；变更后双方收到通知 | P0 |
| US-D3 | 作为达人，我想在一个页面看到我所有对接的进展 | 新 Tab "我的对接"：待确认/进行中/已完成 分栏 | P1 |

### Epic 4：多角色 + 作品集 (新)

| ID | 用户故事 | 验收标准 | 优先级 |
|----|---------|---------|:---:|
| US-M1 | 作为同时是创作者和品牌方的用户，我想在不同身份之间切换并看到不同视角 | 顶部新增身份切换器；切换后对接广场视图对调（显示对应侧的需求） | P1 |
| US-M2 | 作为创作者，我想展示我的作品案例而不是干巴巴的文字 | 个人主页新增"作品集"模块：标题+描述+平台链接+截图（最多 6 个） | P1 |

### Epic 5：移动端响应式 (新)

| ID | 用户故事 | 验收标准 | 优先级 |
|----|---------|---------|:---:|
| US-R1 | 作为创作者，我想在手机上刷帖子、回消息 | 768px 全功能，375px 基本可用；底部导航折叠；卡片单栏 | P0 |

### Epic 6：通知 + 留存 (新)

| ID | 用户故事 | 验收标准 | 优先级 |
|----|---------|---------|:---:|
| US-N1 | 作为用户，我想收到我对接/评论/好友请求的浏览器通知 | 对接意向/评论/好友请求/合作状态变更时触发 Web Push Notification | P2 |
| US-N2 | 作为超过 3 天没来的用户，我想收到一封"你错过了什么"的通知 | 邮件/站内信汇总：新增的对接口需求、新帖子、新好友请求 | P2 |

---

## 三、功能需求规格

### F1：平台连接 + 数据验证

| 字段 | 说明 | 数据来源 |
|------|------|---------|
| 平台选择 | 小红书/抖音/B站/快手/视频号/微博/YouTube/TikTok | 用户选择 |
| 主页 URL | 平台个人主页链接 | 用户输入 |
| URL 格式校验 | 正则匹配各平台 URL 格式 | 前端 |
| 粉丝数 | 手动输入 + 截图 | 用户 |
| 🆕 数据更新时间 | 每次手动更新记录时间戳 | 系统 |
| 🆕 验证状态 | `connected` / `verified`(有截图) / `auto`(API) | 系统 |

### F2：信任分 + 评价

| 项目 | 说明 |
|------|------|
| 信任分组成 | 社区 30% + 平台认证 40% + 交易评价 30% |
| 评价触发 | 双方聊天 ≥ 5 条消息 |
| 评价维度(品牌→达人) | 内容质量/沟通效率/专业度/数据表现 |
| 评价维度(达人→品牌) | 需求清晰度/付款及时性/合作体验 |
| 展示 | 达人卡片、个人主页、对接列表排序 |

### F3：对接状态机

```
          品牌发布需求
               ↓
          达人留言意向  ←── 可以多个达人留言
               ↓
          品牌查看意向
               ↓
      ┌── 双方聊天确认 ──┐
      ↓                  ↓
  拒绝              确认合作
  (通知达人)         (状态: 进行中)
                        ↓
                    合作完成
                 (任一方标记完成)
                        ↓
                    双方互评
                 (状态: 已完成)
```

### F4：邀请系统

| 项目 | 说明 |
|------|------|
| 邀请链接 | `/?invite=CODE` |
| 邀请码 | 6 位字母数字 |
| 激励 | 注册+50 XP / 发帖+30 XP / 对接+100 XP / 伯乐徽章 |
| 展示 | 邀请人主页展示邀请贡献 |

### F5：作品集

| 字段 | 说明 |
|------|------|
| 标题 | 作品/案例名称 |
| 描述 | ≤ 200 字 |
| 平台 | 发布在哪个平台 |
| 链接 | 作品链接 |
| 截图 | 最多 3 张 |
| 上限 | 最多 6 个作品 |

### F6：移动端适配

| 断点 | 布局 |
|------|------|
| ≥ 1024px | 全功能双栏 |
| 768-1023px | 单栏 + 侧边抽屉菜单 |
| 375-767px | 单栏 + 底部导航 5 图标 + 卡片全宽 |

### F7：多角色

| 项目 | 说明 |
|------|------|
| 角色切换 | 顶部头像区域下拉：当前身份 + 切换入口 |
| 添加角色 | 设置页 → 添加新身份 |
| 视角差异 | 对接广场默认显示当前角色的需求（品牌→找达人 / 达人→找品牌） |
| 数据隔离 | XP/等级/好友跨身份共享；对接记录按身份分开展示 |

---

## 四、优先级矩阵

```
重要 ┤  P1 (v2.0)                  P0 (v2.0 — 立即做)
     │  交易评价                    平台连接+数据验证
     │  多角色切换                  邀请系统+冷启动
     │  作品集                      种子内容管理
     │  对接状态追踪                 新人3步引导
     │  我的对接页面                 移动端响应式
     │
     │  P3 (v3.0)                   P2 (v2.1)
     │  API 自动同步数据            浏览器推送通知
     │  企业认证                     邮件召回
     │  支付/担保                    邀请贡献展示
     │  高级搜索                     品牌主页
     └─────────────────────────────────────
       不紧急                          紧急
```

---

## 五、版本规划（修订）

| 版本 | 内容 | 周期 |
|------|------|------|
| v1.2-hardening | P0 安全 + P1 一致性 + 文件拆分 | 当前 |
| v1.3-feature | 新手引导 + 行业讨论 + 城市选择器 + 筛选增强 + 岗位标签 | 2 周 |
| **v2.0-product** | **平台连接 + 信任分 + 邀请系统 + 对接状态机 + 移动端** | **4 周** |
| v2.1-retention | 交易评价 + 多角色 + 作品集 + 通知推送 | 2 周 |
| v3.0-scale | API 数据同步 + 企业认证 + 支付担保 + 搜索 | 远期 |

---

## 六、v2.0 成功指标

| 指标 | 当前 | v2.0 目标 |
|------|------|----------|
| 周活跃用户 | — | 200 |
| 平台连接率 | 0% | ≥ 30% 注册用户 |
| 邀请转化率 | — | ≥ 15% |
| 对接完成率 | 0 (无闭环) | ≥ 10 笔/周 |
| 评价参与率 | 0 | ≥ 50% 完成合作后互评 |
| 次日留存 | — | ≥ 30% |
| 7 日留存 | — | ≥ 15% |
| 移动端可用性 | 0 | 375px 基本可用 |

---

## 七、不做的事情（明确排除）

- 不做支付/担保交易（v3.0，需要合规资质）
- 不做 AI 匹配推荐（v3.0）
- 不做视频/直播功能
- 不做小程序版本
- 不做英文版/海外版
- 不接入微信/支付宝登录（保持邮箱注册，降低合规成本）

---

## 八、与竞品的完整定位（修订）

```
                    数据透明 →                    ← 社区归属
              蝉妈妈/新榜                         CreatorHub
              (纯数据)                            (社区+交易)
                    ↓                                ↓
              ┌──────────┐                   ┌──────────────┐
              │ 看数据    │                   │ 连接平台     │
              │ 找达人    │     CreatorHub    │ 验证数据     │
              │ 投广告    │     v2.0          │ 社交资本     │
              │           │ ←────────────── → │ 对接交易     │
              │ 无社交    │   两者之间         │ 互评信任     │
              │ 无交易    │                   │ 等级成长     │
              └──────────┘                   └──────────────┘
                    ↑                                ↑
              Boss直聘                          即合(抖音)
              (招聘)                            (平台内撮合)
```

**v2.0 的 CreatorHub = 数据平台的"信任" + 招聘的"对接" + 社区的"归属" + 交易的"闭环"**

---

*属于 CreatorHub 产品工程化管线 — 阶段 3：产品化*

---

## 附录 A — 安全硬化 PRD（2026-06-03 增量）

> **状态**: P0 必须本周修；P1 两周内交付。审计源文档：[`docs/security-audit-2026-06-03.md`](./security-audit-2026-06-03.md)
>
> **背景**: 审计发现现有 RLS 只验证 "是否登录"，不验证 "username 列是否属于登录者本人"。叠加自助注册无门槛，整个写入面都是身份冒充入口。

### A.1 验收口径（必须满足才能签收）

| 项 | 验收命令 | 通过标准 |
|----|---------|---------|
| 单元测试 | `node tests/unit.test.js` | 93/93 全过 |
| 冒烟测试 | `npx playwright test` | 5/5 全过 |
| 新增 RLS 测试 | `npx playwright test`（含新增用例） | 所有"冒充他人写入"用例返回 RLS 拒绝 |
| Migration 幂等性 | `psql ... -f supabase/migration-v3-security.sql`（执行两次） | 第二次执行不报错 |

### A.2 P0 — 必修

#### A.2.1 写入身份绑定（RLS WITH CHECK）

**目标**: 任何 INSERT 必须满足 `username 列 = (select username from profiles where id = auth.uid())`。

**新增 migration**: `supabase/migration-v3-security.sql`

需要为以下表新增/替换 INSERT 策略（按"列名 = caller 用户名"绑定）：

| 表 | 绑定列 |
|----|--------|
| `posts` | `author` |
| `comments` | `author` |
| `chat_messages` | `sender` |
| `world_messages` | `sender` |
| `notifications` | `from_user`（target `username` 可为任意人） |
| `recruits` | `poster` |
| `match_demands` | `poster` |
| `local_demands` | `poster` |
| `friends` | `username` |
| `friend_requests` | `from_user` |
| `xp_records` | `username` |
| `reviews` | `reviewer` |
| `invitation_codes` | `inviter_username` |
| `post_likes` | `username` |

**实现要点**:
- 每条策略命名 `<table>_insert_own_v2`，先 `DROP POLICY IF EXISTS` 旧的 `allow_insert_auth`，再创建新策略。
- 用 `auth.jwt() ->> 'sub'` 或 `(select username from profiles where id = auth.uid())` 作为身份源。
- `tracking_events` 保留 `WITH CHECK (true)` 以支持匿名埋点，但加一个 `BEFORE INSERT` 触发器在登录态下强制覆盖 `username := caller_username`。

#### A.2.2 profiles 关键列只读化

**目标**: `xp / level / trust_score` 不能由客户端直写。

- `REVOKE UPDATE (xp, level, trust_score) ON profiles FROM authenticated;`
- 新增 `award_xp(p_amount int, p_reason text)` — `SECURITY DEFINER`，校验调用者，写入 `xp_records` 并更新 `profiles.xp/level`。每日总量 cap 500。
- 新增 `recompute_trust_score(p_username text)` — `SECURITY DEFINER`，**只能被** `reviews` 表的 AFTER INSERT 触发器调用（在函数体内 assert `current_setting('caller_is_trigger', true) = 'yes'` 或简化为：只检查 `pg_trigger_depth() > 0`）。删除现有 `app.js:846` 中客户端写 `profiles.trust_score` 的代码。
- 前端改造：`saveXP` / `addXPForUser` / 每日登录奖励 → 全部走 `award_xp` RPC。

#### A.2.3 SECURITY DEFINER 函数补调用者校验

| 函数 | 校验逻辑 |
|------|---------|
| `confirm_deal(p_deal_id, p_partner)` | 调用者必须是 `match_demands.poster` |
| `complete_deal(p_deal_id)` | 调用者必须是 `poster` 或 `deal_partner` |
| `can_review(p_reviewer, p_reviewee, p_deal_id)` | `p_reviewer` 必须 = 调用者用户名 |
| `get_poll_updates(since_ts, username_query, post_ids)` | `username_query` 必须 = 调用者用户名 |

所有函数都用同一 helper：
```sql
CREATE OR REPLACE FUNCTION current_username() RETURNS text AS $$
  SELECT username FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY INVOKER;
```

#### A.2.4 tracking_events SELECT 收紧

- 替换 `track_read_own USING (true)` → `USING (current_username() = username)`。

### A.3 P1 — 两周内

#### A.3.1 注册抗滥用

- **Supabase Dashboard 配置**（不在代码里）：开 Email Confirmation；调低 signup rate limit（建议 5/h/IP）。在 PRD 里登记好这两步是上线前置条件。
- **保留用户名**: 在 `doRegister` 前调用 `is_username_allowed(p_username text)` SECURITY DEFINER RPC，黑名单 regex：`^(admin|root|官方|客服|支付宝|微信|抖音|小红书|creatorhub|系统)$`（大小写不敏感）。
- **去掉 doRegister 中的手动 profiles.insert**（`app.js:153-161`）：依赖现有 `handle_new_user` 触发器；如果 `signUp` 错误是 username 冲突，前端展示"该用户名已被占用"。
- **邀请奖励上限**: 在 `award_xp` 内对 `reason = '邀请好友注册'` 做每日累计上限 250 XP（即 ≤5 个有效邀请/天）。

#### A.3.2 vercel.json 安全头 + 缓存

```json
{
  "headers": [
    {
      "source": "/(.*)\\.(html)",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, must-revalidate" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; object-src 'none'" }
      ]
    },
    {
      "source": "/js/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, must-revalidate" }
      ]
    },
    {
      "source": "/css/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600" }
      ]
    }
  ]
}
```

#### A.3.3 聊天速率限制

- `chat_messages` 加 BEFORE INSERT 触发器：同一 sender 在过去 60 秒内 ≥ 30 条 → 抛错。
- `world_messages` 同理：60 秒内 ≥ 10 条 → 抛错。

#### A.3.4 注册 race 修复

- 删除 `app.js:153-161` 的手动 `profiles.insert`。
- 确认 `handle_new_user` 触发器读取 `raw_user_meta_data->>'username'` 正确。
- 测试：并发 register 同一 username，期望第二个收到明确的"用户名已被占用"。

### A.4 测试要求

新增 `tests/security.spec.js`（Playwright + Supabase 客户端实测，**用临时 anon 账号**）：

| 用例 | 期望 |
|------|------|
| 用户 A 登录，尝试 INSERT posts 时 `author='userB'` | 返回 RLS 拒绝 |
| 用户 A 尝试 UPDATE profiles SET trust_score=999 WHERE username='userA' | 列被 REVOKE，返回拒绝或字段被忽略（推荐前者，明确报错） |
| 未登录用户尝试 INSERT chat_messages | 拒绝 |
| 用户 A 调用 `get_poll_updates(now-1h, 'userB', [])` | 抛 'forbidden' |
| 用户 A 调用 `confirm_deal('deal_of_B', 'userA')` | 抛 'forbidden: not your deal' |
| 用户 A 调用 `award_xp(50, 'test')` 后查 `xp_records` | 看到 1 条 `username='userA'` 记录 |
| 用户 A 一天内调用 `award_xp(150, '邀请好友注册')` 3 次 | 第 3 次抛 'daily cap exceeded' |
| 用户 A 60s 内发 31 条聊天 | 第 31 条被触发器拒绝 |

**测试隔离**: 用 service_role key 在 `beforeAll` 创建两个一次性账号 `audit_a_<ts>@example.test` / `audit_b_<ts>@example.test`，`afterAll` 清理（直接删 auth.users，cascade 走完）。**service_role 不进 git**——从环境变量读 `SUPABASE_SERVICE_ROLE_KEY`，缺失时 `test.skip`。

### A.5 不在本期范围

- 单点登录（OAuth）
- 客户端 anon key 轮换
- 邮箱发件域 SPF/DKIM 配置
- WAF / Cloudflare Turnstile 接入（PRD 里列为 P2，留 issue 跟进）
- 完整 XSS 扫描（保留为人工 code-review 任务，不写自动化）

### A.6 交付物清单

- `supabase/migration-v3-security.sql` — 幂等，含 P0 全部 SQL + P1 中的 SQL 部分（保留名 RPC、award_xp、聊天速率触发器）
- `js/app.js` — 改造：删除手动 profiles.insert / 改用 award_xp RPC / 删除客户端写 trust_score / 移除 profiles.update 中的 xp/level 字段
- `vercel.json` — 按 A.3.2 改写
- `tests/security.spec.js` — 按 A.4 编写，service_role 缺失时优雅跳过
- 更新 `HANDOFF.md` 第七节"安全审计"状态：将 P0/P1 各项打勾，并附上 migration 应用步骤

---

## 附录 B — 产品完善度紧急修复（2026-06-04 增量）

> **来源**: 安全修复完成后的全面产品完善度体检（详见 `HANDOFF.md` 第八节）
> **定位**: 加权完成度 ≈72%，距 v2.0 北极星指标"周对接 ≥10"还差临门一脚
> **状态**: 仅审计完成，代码未修复——本附录是修复合同

### B.1 三大发现（按严重度）

#### 🔴 B-1 八处 stub 按钮在骗用户

| 位置 | 表面行为 | 真实情况 |
|------|---------|---------|
| 通用抽屉 `🤝 我有意向`（`index.html` `drawerActions`） | `showToast('已发送意向！对方会收到通知')` | 不发任何通知 |
| 通用抽屉 `📋 复制联系方式` | `showToast('已复制联系方式')` | 不写剪贴板；且 `drawerActions` 区域无 `drawerContact` 字段，没有数据可复制 |
| `handleImageUpload` (`js/app.js:801`) | `showToast("图片已选择（前端演示模式）")` | 不上传；`#imgUploader` 是死链 |
| 通知设置 4 个 checkbox（新消息/好友请求/招募/社区） | `onchange="showToast('通知设置已更新')"` | 不持久化、不影响任何行为 |
| 隐私设置 3 个 checkbox（在线状态/陌生人消息/平台数据公开） | 同上 | 同上 |
| 首页统计 `1284 / 56 / 38 / 203` | data-count 滚动动画 | 硬编码假数 |
| profile `1284 关注 / 6892 粉丝`（`profileFollowing` / `profileFollowers`） | 数字展示 | 硬编码假数 |
| 底部 `CreatorHub v1.0.0 · Built with ❤️` | 版本号 | PRD 已 v2.0，stale |

**为什么 P0a**: 内测用户点了"发意向"以为发出去了，对方收不到，复购信任崩塌。

**验收**: 内测前每个按钮要么真的工作，要么明确灰态（"即将推出"），不能"看起来能用但不工作"。

#### 🟠 B-2 上线前必修但 PRD v2.0 没写的隐藏 P0

| 项 | 缺什么 | 影响 |
|----|--------|------|
| 忘记密码 / 重置密码 | 登录页文案"用于登录和找回密码"是空话，`sb.auth.resetPasswordForEmail()` 没调用 | 用户忘密码无法自救，邮件等于注册唯一 ID |
| Email Confirmation UI 反馈 | `doRegister` 在 `_r.data.session` 为空时 fallback 到"注册成功！请登录"，**不告诉用户去查邮箱** | 第七节让 Dashboard 开了 Email Confirm 后，这个流程"看似失败" |
| 平台连接的"截图凭证"字段 | PRD F1 表格列了"截图"，UI `showConnectPlatform` 只有 URL+粉丝数输入 | PRD ↔ 实现不一致；信任分公式里"verified"档位无凭证可走 |

**为什么 P0a**: 这三项不是新功能，是 PRD v2.0 写了/暗示了的现有承诺。

#### 🟡 B-3 北极星指标无看板

PRD v2.0 §六 把"周对接完成数 ≥10/周"定为成功指标，但代码侧没有任何聚合查询、没有 admin dashboard、没有埋点告警。运营盲飞。

**为什么 P0a**: 没有看板就没有"产品在工作"的反馈回路。冷启动期最痛苦的是不知道下一步该推什么——是 inviting 不够，还是匹配没成？

### B.2 修复合同（按 ROI 排序）

#### B.2.1（最高 ROI）通用抽屉接真行为 — `js/app.js`

```js
// 在 openDrawer(item, type) 里渲染 drawerActions 时，替换硬编码 onclick：
drawerActions.innerHTML =
  '<button class="btn" onclick="drawerSendIntent(\'' + escapeHtml(item.poster) + '\',\'' + escapeHtml(item.title) + '\')" style="font-size:18px;">🤝 我有意向</button>' +
  (item.contact ? '<button class="btn secondary" onclick="copyContact(\'' + escapeHtml(item.contact) + '\')">📋 复制联系方式</button>' : '');

function drawerSendIntent(target, title) {
  deliverNotification(target, '🤝 对「' + title + '」感兴趣', '对接');
  addXP(20, '发起对接意向');
  showToast('已发送意向给 ' + target + '，对方将在聊天中收到通知 💌');
  closeDrawer();
}
function copyContact(text) {
  if (!text) { showToast('该需求未填联系方式', 'warn'); return; }
  navigator.clipboard.writeText(text).then(
    function() { showToast('已复制：' + text, 'success'); },
    function() { showToast('复制失败，请手动选择文本', 'error'); }
  );
}
```

并且在 `openDrawer` 渲染流程里**新增 `drawerContact` 字段**展示（如果 item 有 `contact` 字段）。

#### B.2.2 设置 checkbox 持久化 — `supabase/migration-v4-prefs.sql` + `js/app.js`

最简方案：profiles 加一列 `preferences JSONB DEFAULT '{}'`。每个 checkbox 直写 `profiles.preferences.<key>`，并在 `loadSession` 时回读勾选状态。**至少先让它能记住勾选**——执行端的逻辑（真的关闭新消息推送）可以等 push 通知功能上线时再接。

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
```

```js
function updatePref(key, val) {
  myProfile.preferences = Object.assign({}, myProfile.preferences || {}, {[key]: val});
  sb.from('profiles').update({preferences: myProfile.preferences}).eq('username', currentUser).then(function(){});
}
// HTML 改为 onchange="updatePref('notify_new_msg', this.checked)" 等
```

#### B.2.3 硬编码统计数字接真 — `supabase/migration-v4-prefs.sql` + `js/app.js`

新增 RPC：

```sql
CREATE OR REPLACE FUNCTION get_home_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT jsonb_build_object(
    'online_creators', (SELECT count(*) FROM profiles WHERE last_seen > now() - interval '5 minutes'),
    'weekly_recruits', (SELECT count(*) FROM recruits WHERE created_at > now() - interval '7 days'),
    'successful_deals', (SELECT count(*) FROM match_demands WHERE deal_status = 'completed'),
    'daily_posts', (SELECT count(*) FROM posts WHERE created_at > now() - interval '24 hours' AND COALESCE(is_seed,false) = false)
  );
$$;
```

`initHomepage` 调用 `sb.rpc('get_home_stats')` 填充。`profileFollowing / profileFollowers` 在没接真社交图前**改为隐藏**（不是显示假数），或显示「— / 关注」。

底部版本号改为 `v2.0.0`。

#### B.2.4 忘记密码流程

- 登录页加 `<a onclick="showResetPasswordDialog()">忘记密码？</a>`。
- 弹窗输入邮箱 → `sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })`。
- `sb.auth.onAuthStateChange` 监听 `PASSWORD_RECOVERY` 事件 → 展示重置密码 UI。

#### B.2.5 Email Confirmation 反馈

修 `doRegister` 在 signUp 成功但 `_r.data.session` 为空时：
```js
showLogin();
showToast('📧 已发送验证邮件到 ' + email + '，请查收后登录');
var err2 = document.getElementById('loginError');
err2.style.color = 'var(--sage)';
err2.textContent = '注册成功！请到邮箱点确认链接后回来登录';
```

#### B.2.6 平台连接对齐 PRD F1

两条路二选一：
- **A（推荐）**：删除 PRD F1 表格里的"截图"和"验证状态"行，对齐现状（URL 校验 + 粉丝数为唯一证据）。
- **B**：`showConnectPlatform` 增加 `<input type="file">` + Supabase Storage 桶上传，把 URL 存到 `connected_platforms[].screenshot_url`。需要先在 Supabase 创建 storage bucket 并配 RLS。

如果选 A，PRD 同步修改；如果选 B，写入 v2.1 范围（不阻塞内测 ship）。

#### B.2.7 北极星 dashboard（最简版本）

新增 `docs/admin-dashboard.md`，列出几条管理员可贴到 Supabase SQL Editor 的查询：
- 周新增对接 / 完成对接 / 完成率
- 周新增注册 / 注册→首帖转化 / 注册→首次对接转化
- 邀请转化漏斗

然后在 v2.1 把这几条做成 admin RPC + 简单 HTML 页面。

### B.3 优先级 + 排期

| 修复项 | 优先级 | 预估 | 阻塞内测 ship？ |
|--------|:------:|:----:|:------:|
| B.2.1 抽屉真行为 | **P0a** | 0.5 天 | ✅ 是 |
| B.2.4 忘记密码 | **P0a** | 0.5 天 | ✅ 是 |
| B.2.5 Email Confirm 反馈 | **P0a** | 0.2 天 | ✅ 是 |
| B.2.2 设置 checkbox 持久化 | P0b | 0.5 天 | ❌（可灰态先上） |
| B.2.3 统计数字接真 | P0b | 0.5 天 | ❌（可加"演示数据"标） |
| B.2.6 平台连接 PRD 对齐（选 A） | P0b | 0.2 天 | ❌ |
| B.2.7 北极星 dashboard | P1 | 1 天 | ❌（内测期间补） |

**总计 P0a：约 1.2 人天** —— 一名工程师 1.5 天搞定，本周内测前完成。

### B.4 验收口径

每条修复对应 1 个 Playwright/手测验收用例：

| 修复 | 验收 |
|------|------|
| B.2.1 抽屉意向 | 打开任一 match/local 卡片抽屉 → 点"我有意向" → 目标用户收到 notification 行（DB 可验证） |
| B.2.1 复制联系方式 | 同上 → 点"复制" → 剪贴板有内容（前端 alert/toast 提示具体值） |
| B.2.4 忘记密码 | 登录页点"忘记密码？" → 输入邮箱 → Supabase Auth 邮件队列收到 |
| B.2.5 Email Confirm 反馈 | 在 Dashboard 开 Email Confirm 后注册 → 登录页 banner 提示"请到邮箱点确认链接" |
| B.2.2 设置持久化 | 勾选"新消息通知" → 刷新页面 → 仍然勾选 |
| B.2.3 统计真实 | 首页四个数字与 DB count(*) 一致（差 ≤ 5s 延迟） |
| B.2.7 北极星 | `gh dashboard` 或 SQL editor 跑出 7 日完成对接数 |

### B.5 交付物

- `supabase/migration-v4-prefs.sql` — `preferences` 列 + `get_home_stats` RPC
- `js/app.js` — 7 处局部改造（drawerSendIntent / copyContact / updatePref / loadHomeStats / showResetPasswordDialog / doRegister 邮件反馈 / 版本号常量）
- `index.html` — 登录页加"忘记密码"链接、checkbox onchange 改为 updatePref()、底部版本号、删除假统计
- `docs/admin-dashboard.md` — 北极星查询合集
- `HANDOFF.md` 第八节追加修复进度复盘

### B.6 不在本附录范围

- 作品集（v2.1）
- 多角色切换（v2.1）
- Web Push / 邮件召回（v2.1）
- 邀请贡献仪表盘 US-C5（v2.0 P2，建议提到 v2.1）
- 全局搜索（v3.0）
- 平台数据 API 自动同步（v3.0）

*Product audit appendix: 2026-06-04*

