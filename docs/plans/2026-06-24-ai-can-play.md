# Round 2 · AI 上场 · 2026-06-24

> 目标：**AI 代理能完成完整比赛闭环**——注册账号 → 创建球队 → 生成 API Key → AI 读自己球队/对手 → AI 更新战术 → 系统排程比赛 → 真实算法模拟 → 双方 AI/人类查看结果。
>
> 范围最小化，**先做到能跑通**，再迭代 UX 与性能。

---

## 阶段

| Phase | 内容 | 依赖 |
|---|---|---|
| **R2-0** | D1 完整 schema + Drizzle 迁移 + seed 工具 | — |
| **R2-1** | 鉴权：argon2id 密码、JWT、session cookie、API Key 哈希 | R2-0 |
| **R2-2** | 用户与球队 CRUD：注册、登录、创建球队（含默认 11 人） | R2-1 |
| **R2-3** | API Key CRUD + Agent 鉴权中间件 | R2-2 |
| **R2-4** | Agent 端点：get team / get opponent / update strategy（带截止时间） | R2-3 |
| **R2-5** | 比赛端点：list / create（手动触发排程）/ get detail（带 events） | R2-4 |
| **R2-6** | 真实模拟算法（替换 skeleton runMatch） | — |
| **R2-7** | 前端：register / login / dashboard / team / api-keys / match | 后端 |
| **R2-8** | 端到端冒烟 | 全部 |

---

## R2-0 · 完整 schema

`apps/api/migrations/0002_full.sql` 包含（按 CLAUDE.md §4.1）：
- `seasons`（已有，扩展）
- `users`
- `teams`
- `players`
- `strategies`
- `matches`
- `api_keys`

Drizzle schema 全套：
- `apps/api/src/db/schema.ts` 拆为多文件：`schema/{users,teams,players,strategies,matches,seasons,apiKeys,index}.ts`
- 使用 `drizzle-kit generate` 生成 SQL

种子工具：
- `apps/api/src/db/seed.ts` — 给本地 dev 注入一个赛季 + 几只球队（用于手动排程测试）

---

## R2-1 · 鉴权

- 密码哈希：argon2id via `@node-rs/argon2`（Workers 兼容？需验证；备选用 `crypto.subtle` 派生 scrypt）
- JWT：`jose` 签 HS256，payload `{ sub, iat, exp }`，TTL 7 天
- 工具：`apps/api/src/lib/auth.ts` — `hashPassword`、`verifyPassword`、`signSession`、`verifySession`
- API Key：`aif_` + 32 字节 base64url；`crypto.subtle.digest('SHA-256')` 存哈希；明文仅创建时返回

---

## R2-2 · 用户/球队

API：
- `POST /api/v1/auth/register` — 邮箱/密码/显示名
- `POST /api/v1/auth/login` — 返回 Set-Cookie + body 含 token
- `POST /api/v1/auth/logout`
- `GET  /api/v1/me`
- `POST /api/v1/me/teams` — 创建球队 + 11 名随机生成球员 + 默认策略
- `GET  /api/v1/me/teams`
- `GET  /api/v1/me/teams/:id`
- `PATCH /api/v1/me/teams/:id/strategy` — 校验截止时间，未到可改

中间件：
- `sessionAuth` — 从 cookie 或 Authorization 解析 JWT → 注入 `c.get('user')`
- `requireUser` — 401 若无

---

## R2-3 · API Key + Agent 中间件

API：
- `GET    /api/v1/me/api-keys` — 列表（不含 secret）
- `POST   /api/v1/me/api-keys` — 创建，**响应含明文 secret 一次**
- `DELETE /api/v1/me/api-keys/:id` — 撤销（软删：`revoked_at` 置当前）

中间件：
- `apiKeyAuth` — 从 `Authorization: Bearer aif_xxx` 解析；查 D1；未找到/已撤销 → 401
- `requireApiKey` — 注入 `c.get('agentUser')`

---

## R2-4 · Agent 端点

| 路径 | 说明 |
|---|---|
| `GET /api/v1/agent/me` | 自描述：用户、球队、API Key 标签、能力清单 |
| `GET /api/v1/agent/team` | 完整球队 + 11 球员 + 当前策略 |
| `GET /api/v1/agent/team/strategy` | 当前策略 |
| `PATCH /api/v1/agent/team/strategy` | 更新策略（截止前） |
| `GET /api/v1/agent/matches/upcoming` | 未来 7 天的比赛（仅含己方） |
| `GET /api/v1/agent/matches/:id` | 比赛详情 |
| `GET /api/v1/agent/matches/:id/opponent` | 对手画像（隐藏其 API Key 等敏感字段） |

**关键约束**：`/agent/*` 与 `/me/*` 业务 1:1 等价（CLAUDE.md §5.2）。

---

## R2-5 · 比赛端点

- `GET  /api/v1/matches?status=&team_id=&limit=&cursor=` — 公开
- `GET  /api/v1/matches/:id` — 公开（比赛已结束）
- `POST /api/v1/matches` — 手动创建：body `{ home_id, away_id, kickoff_at }`（admin 或自助）
- `POST /api/v1/matches/:id/simulate` — **手动触发模拟**（本轮不接 Cron；后续 R3 上 Cron Trigger）

模拟流程（手动 simulate 端点）：
1. 读两队 + 两份最新策略
2. `seedFromMatchId(matchId)` → `mulberry32`
3. `runMatch(input, rng)` → events + stats
4. D1 事务：更新 `matches.events_json / stats_json / status / home_score / away_score`
5. `updateElo` 写回两队 `teams.rating`

---

## R2-6 · 真实模拟算法

替换 skeleton `runMatch`：
- 90 分钟步进（每分钟）
- 控球：双方 strength + 战术 modifier → 概率
- 攻门：基于控球 + 进攻 modifier → 概率
- 进球：xG + 随机
- 事件流：kickoff / possession / attack / shot / goal / foul / card / halftime / fulltime / possession_update
- **确定性**保证（CLAUDE.md §6.4）

确定性测试：
- 同样 input + rng 跑两遍 → JSON 相等
- 跑 1000 场统计主队胜率 45-55%
- 完全相同 input 100 场几乎全平

---

## R2-7 · 前端

| 路由 | 内容 |
|---|---|
| `/register` `/login` | 表单 + 调用 API + 存 cookie |
| `/dashboard` | 我的球队卡片、即将到来的比赛、最近战绩 |
| `/team/:id` | 球员列表、当前策略（只读 + 编辑） |
| `/api-keys` | 列表 + 创建（弹窗显示明文一次）+ 撤销 |
| `/matches` | 比赛列表（全部 / 我参与 / 即将到来） |
| `/matches/:id` | 比分 + 事件时间轴 + 战术摘要 |
| `/agent-docs`（前端辅助） | AI 协议快速参考卡（链接到 API 文档站） |

技术：
- `react-hook-form` + `zod` 校验
- `react-query` 缓存
- 事件时间轴用纯 CSS 列表（先不做 Canvas）

---

## R2-8 · 端到端冒烟

脚本 `scripts/smoke-r2.sh`（手跑 + CI 也跑）：
1. 注册两个用户 A、B
2. 各自创建球队
3. 各自生成 API Key
4. 模拟 AI：用 A 的 Key `GET /agent/me`、`GET /agent/team`、`PATCH /agent/team/strategy` 改成 attacking
5. 模拟 AI：B 同上，改成 defensive
6. 排程 A vs B 比赛（kickoff = now + 60s）
7. 触发模拟 `/matches/:id/simulate`
8. 验证：
   - 比赛 status = `finished`
   - 双方 rating 按 ELO 更新
   - events 包含 kickoff/halftime/fulltime/至少一个 goal 或 0-0
   - 双方 `/agent/me` 看到新 rating
9. 记录到 `docs/plans/2026-06-24-ai-can-play-verify.md`

---

## 验收门槛

- `pnpm -r typecheck` 0 错误
- `pnpm -r test` 全绿（目标 30+ 测试）
- `pnpm -r build` 0 错误
- smoke 脚本一次过

## 范围外（明确不做）

- ❌ Cron Trigger 自动开赛（→ Round 3）
- ❌ 真实赛季 schedule 自动生成（→ Round 3）
- ❌ Canvas 2D 回放（→ Round 4）
- ❌ 限流中间件（→ Round 4）
- ❌ 多设备 session 管理
- ❌ 邮箱验证、密码重置

## 风险

- **argon2id 在 Workers 兼容**：如 `@node-rs/argon2` 不兼容，备选 scrypt via `crypto.subtle`（自实现 ~50 行）
- **scrypt 自实现安全性**：自实现密码学是红线，必须用经审计的实现。如果 `@node-rs/argon2` 不行，回退到 scrypt via wasm 或推迟到后端专用服务（违背 Cloudflare 约束，**不**采用）
- **Drizzle 迁移生成器在 Windows**：drizzle-kit 应可用，但需注意 schema 改动顺序

