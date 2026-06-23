# AI 足球对战平台 · Claude 开发指南

> **这是项目宪法。** 任何 Claude 会话在开始工作前都必须先完整阅读本文件。
> 一切与本文冲突的临时指令以本文为准；如有疑义应主动向用户确认。

---

## 0. 速查表（必读）

- **项目目标**：构建一个由 AI（外部 LLM/Agent）操控球队、对战模拟在服务端进行、用户在前端观看与运维的足球对战竞技平台。
- **强制技术栈**：Cloudflare 全家桶（Pages + Workers + D1 + KV）+ TypeScript 严格模式 + pnpm。
- **禁止事项**：禁止引入任何非 Cloudflare 生态的运行时依赖（无 Node 专属服务、无外部数据库、无 Vercel/AWS/GCP 资源）。
- **AI 优先**：API 是一等公民。所有用户能在前端做的操作都必须有等价 API；AI 代理不是后门。
- **模拟必须确定性**：相同输入（双方球队 + 策略 + 比赛 ID）必须产生完全相同的事件流。
- **GitHub → Cloudflare**：代码托管在 GitHub，自动部署到 Cloudflare，PR 预览走 Pages Preview。

---

## 1. 项目愿景

### 1.1 一句话定义
**一个让 AI 球队互相对战、用户在前端观看与运维的足球模拟竞技平台。**

### 1.2 核心角色
| 角色 | 行为 | 接入方式 |
|---|---|---|
| **AI 代理** | 读取对手信息、调整战术、提交比赛响应 | REST API + API Key |
| **人类用户** | 注册、创建球队、查看比赛、管理 API Key | 前端 + Session |
| **平台服务** | 编排赛程、运行模拟、累积战绩、生成排行榜 | Cloudflare Workers |

### 1.3 关键能力清单（MUST）
1. AI 代理可通过 API Key 鉴权调用 API
2. AI 可读取己方球队状态、对手画像、即将到来的比赛
3. AI 可在截止时间前更新战术（formation / style / mentality / 等参数）
4. 比赛在服务端模拟，产出确定性的事件流（kickoff、possession、attack、shot、goal、foul、card、halftime、fulltime 等）
5. 前端可视化比赛回放（基于事件流 + 时间轴）
6. 排行榜（按 ELO 或自定义积分）
7. 战队战绩详情（胜/平/负、进球/失球、连胜连负）
8. API 文档站（OpenAPI + 可试调用页面）
9. 一键 GitHub → Cloudflare 部署
10. 联赛/赛季管理（schedule 自动生成）

### 1.4 明确不做（YAGNI · 严禁越界）
- ❌ 真实球员授权/版权数据（使用合成数据）
- ❌ 3D/UE/Unity 重客户端（2D Canvas / SVG 即可）
- ❌ 直播流媒体 / WebRTC
- ❌ 支付与真实货币下注
- ❌ 移动端原生 App
- ❌ 任何需要 Node 专属 API 或非 Cloudflare 兼容运行时的依赖

---

## 2. 技术栈与平台约束（硬约束）

### 2.1 平台
| 用途 | 服务 | 备注 |
|---|---|---|
| 前端托管 | **Cloudflare Pages** | 静态资源 + 边缘 SSR（如选 SvelteKit） |
| 后端 API | **Cloudflare Workers** | 单一 Worker，`itty-router` 或 `Hono` |
| 关系数据 | **Cloudflare D1** | SQLite 兼容，存用户/球队/比赛/策略/战绩 |
| 缓存/计数器 | **Cloudflare KV** | 排行榜缓存、速率限制计数器、API Key 索引 |
| 实时状态（可选） | **Durable Objects** | 赛季进行中的"赛季对象"，持有 in-memory 状态 |
| 定时任务 | **Cron Triggers** | 模拟对战的"开赛"事件、过期清理 |
| 密钥 | **Cloudflare Secrets / Wrangler `--secret`** | 严禁进 git |
| 鉴权 JWT 签名 | **jose**（Web Crypto 兼容） | 不使用 jsonwebtoken |
| 监控 | **Cloudflare Analytics + Workers Logs** | 不接 Datadog/Sentry 外部服务 |

### 2.2 语言与运行时
- **TypeScript 5.x，`strict: true`，`noUncheckedIndexedAccess: true`**
- **ESM only**（`"type": "module"`）
- **Cloudflare Workers 兼容**：禁止 `fs`、`path`、`child_process`、Node 内置
- 使用 `Web standard`：`fetch`、`crypto.subtle`、`URL`、`Request`、`Response`
- 日期处理用 `Temporal` 提案的 polyfill 或 `date-fns`，不要 `moment`

### 2.3 前端
- **构建工具**：Vite 5+
- **框架**：React 18+（可路由用 `react-router`，状态用 `zustand` 或 `tanstack-query`）
- **样式**：TailwindCSS（不要 styled-components/emotion）
- **图表/回放**：原生 Canvas 2D + 自研轻量动画（**不要 Three.js**）
- **HTTP 客户端**：`fetch` 封装 + `tanstack-query`
- **数据校验**：与后端共享 `zod` schema（来自 `packages/shared`）

### 2.4 后端
- **HTTP 框架**：Hono（轻量、Workers 友好、TS-first）
- **ORM**：Drizzle ORM + `drizzle-kit` 迁移
- **校验**：zod（**所有** API 入参必须 zod parse）
- **日志**：`console.*`（Workers 自带，结构化 JSON）
- **测试**：`vitest`（Workers 兼容）+ `@cloudflare/vitest-pool-workers`（首选）或 `miniflare`

### 2.5 包管理与 monorepo
- **pnpm workspaces**（不要 npm/yarn workspaces）
- 目录：
  ```
  ai_fifa/
  ├── apps/
  │   ├── api/        # Cloudflare Workers
  │   └── web/        # Cloudflare Pages 静态资源
  ├── packages/
  │   └── shared/     # 共享类型、zod schema、纯函数（模拟器核心、积分计算）
  ├── docs/
  │   ├── api/        # 生成的 API 文档
  │   └── plans/      # 设计文档与计划
  ├── .github/workflows/  # CI/CD
  ├── CLAUDE.md       # 本文件
  ├── README.md
  ├── pnpm-workspace.yaml
  └── package.json
  ```

### 2.6 严禁引入的依赖（黑名单）
- `jsonwebtoken`（用 `jose`）
- `pg`、`mysql2`、`mongodb`、`redis`（无外部 DB）
- `@sentry/*`、`@datadog/*`（外部 APM 禁止）
- `express`、`koa`、`fastify`（用 Hono）
- `axios`（用 `fetch`）
- `lodash`（用 ES 原生方法或 `lodash-es` 按需）
- `moment`、`uuid`（用 `crypto.randomUUID()`）

---

## 3. 架构总览

### 3.1 请求流（读路径）
```
浏览器/AI Agent
    │  HTTPS
    ▼
Cloudflare 边缘（Pages / Workers 入口）
    │
    ├─ /api/v1/*         → Worker 路由 → 中间件（auth、rate-limit、zod）→ 业务逻辑 → D1/KV
    ├─ /api/v1/docs      → 静态 OpenAPI 文档（构建时生成）
    └─ /*                → Pages 静态资源（React SPA）
```

### 3.2 模拟流（写路径 · 关键）
```
Cron Trigger（每 5 分钟） / 手动触发
    │
    ▼
Worker pickDueMatches()
    │
    ▼
D1 读两队：players[] + strategy
    │
    ▼
packages/shared/simulator.runMatch(matchId, home, away, rngSeed)
    │ 纯函数，无副作用，确定性
    ▼
events: MatchEvent[] + finalStats
    │
    ▼
D1 写入 matches.events / matches.result / teams.stats（事务）
    │
    ▼
KV 失效排行榜缓存
```

### 3.3 关键不变量
- **模拟器是纯函数**：输入只来自参数，无 IO、无 `Date.now()`、无 `Math.random()`。`rngSeed` 必须由 `matchId` 派生。
- **策略更新有截止时间**：比赛开始前 N 分钟（默认 30）锁定，之后任何 PATCH 都被拒绝（409）。
- **API Key 与 userId 强绑定**：每次请求都必须校验 `key.userId === param.userId`，跨用户访问返回 403。
- **D1 写操作必须显式事务**：`batch()` 或 `transaction()`，确保积分、统计、事件原子写入。

---

## 4. 数据模型（D1 · SQLite）

### 4.1 表结构（DDL 概要）
```sql
-- 用户（人类）
CREATE TABLE users (
  id            TEXT PRIMARY KEY,            -- crypto.randomUUID()
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                -- argon2id via Web Crypto 实现
  display_name  TEXT NOT NULL,
  created_at    INTEGER NOT NULL,            -- unix ms
  is_admin      INTEGER NOT NULL DEFAULT 0
);

-- 球队
CREATE TABLE teams (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  formation   TEXT NOT NULL,                 -- '4-3-3' etc.
  rating      INTEGER NOT NULL DEFAULT 1500, -- ELO 基线
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_teams_user ON teams(user_id);
CREATE INDEX idx_teams_rating ON teams(rating DESC);

-- 球员
CREATE TABLE players (
  id        TEXT PRIMARY KEY,
  team_id   TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  position  TEXT NOT NULL,                   -- GK/DF/MF/FW
  pace      INTEGER NOT NULL,                -- 0-100
  shooting  INTEGER NOT NULL,
  passing   INTEGER NOT NULL,
  defending INTEGER NOT NULL,
  stamina   INTEGER NOT NULL,
  overall   INTEGER NOT NULL                 -- 加权综合
);
CREATE INDEX idx_players_team ON players(team_id);

-- 战术（一份球队同时只保留最新一份）
CREATE TABLE strategies (
  team_id        TEXT PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  formation      TEXT NOT NULL,
  style          TEXT NOT NULL,              -- possession | counter-attack | pressing | direct | park-the-bus
  mentality      TEXT NOT NULL,              -- defensive | cautious | balanced | attacking | all-out
  pressing       INTEGER NOT NULL,           -- 0-100
  passing_risk   INTEGER NOT NULL,           -- 0-100
  width          INTEGER NOT NULL,           -- 0-100
  fouls_tactical INTEGER NOT NULL,           -- 0/1
  updated_at     INTEGER NOT NULL
);

-- 比赛
CREATE TABLE matches (
  id          TEXT PRIMARY KEY,
  season_id   TEXT NOT NULL REFERENCES seasons(id),
  home_id     TEXT NOT NULL REFERENCES teams(id),
  away_id     TEXT NOT NULL REFERENCES teams(id),
  kickoff_at  INTEGER NOT NULL,
  status      TEXT NOT NULL,                 -- scheduled | locked | simulated | finished
  home_score  INTEGER,
  away_score  INTEGER,
  events_json TEXT,                          -- JSON.stringify(MatchEvent[])
  stats_json  TEXT,                          -- JSON.stringify(MatchStats)
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_matches_season ON matches(season_id);
CREATE INDEX idx_matches_kickoff ON matches(kickoff_at);
CREATE INDEX idx_matches_status ON matches(status);

-- 赛季
CREATE TABLE seasons (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  starts_at    INTEGER NOT NULL,
  ends_at      INTEGER NOT NULL,
  registration_deadline INTEGER NOT NULL
);

-- API Key
CREATE TABLE api_keys (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  key_hash    TEXT NOT NULL,                 -- SHA-256(secret)，原值只在创建时返回一次
  key_prefix  TEXT NOT NULL,                 -- 用于 UI 列表展示：'aif_AbCd…'
  last_used_at INTEGER,
  created_at  INTEGER NOT NULL,
  revoked_at  INTEGER
);
CREATE INDEX idx_apikey_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
```

### 4.2 数据完整性规则
- 球队至少有 11 名球员（首发），替补可选
- 一名用户同时只能加入一个进行中的赛季
- 比赛一旦 `simulated` 或 `finished`，`events_json` 与 `stats_json` 不可变
- 任何 `ON DELETE CASCADE` 路径必须在迁移中显式声明

---

## 5. API 设计

### 5.1 全局约定
- **Base URL**：`/api/v1`
- **Content-Type**：`application/json; charset=utf-8`
- **认证方式**：
  - 用户会话：`Authorization: Bearer <session_jwt>`（HttpOnly Cookie + 头部双通道）
  - AI 代理：`Authorization: Bearer aif_<secret>`（API Key）
- **统一响应壳**：
  ```ts
  // 成功
  { "data": T, "meta"?: { "next_cursor"?: string, "total"?: number } }
  // 失败
  { "error": { "code": "STRING_CODE", "message": "人类可读", "details"?: unknown } }
  ```
- **错误码规范**（HTTP 状态码 → 业务 code）：
  - `400` `INVALID_INPUT` · `VALIDATION_FAILED`
  - `401` `UNAUTHENTICATED`
  - `403` `FORBIDDEN` · `KEY_REVOKED` · `TEAM_LOCKED`
  - `404` `NOT_FOUND`
  - `409` `CONFLICT` · `STRATEGY_LOCKED` · `ALREADY_JOINED`
  - `429` `RATE_LIMITED`
  - `500` `INTERNAL`

### 5.2 端点清单

#### 公开（无需认证）
| Method | Path | 说明 |
|---|---|---|
| `POST` | `/auth/register` | 邮箱+密码注册 |
| `POST` | `/auth/login` | 登录拿 JWT |
| `GET` | `/leaderboard?season=&limit=&cursor=` | 排行榜 |
| `GET` | `/teams/:id` | 公开球队画像（不含 API Key 字段） |
| `GET` | `/matches/:id` | 比赛详情（含 events） |
| `GET` | `/seasons/current` | 当前赛季信息 |
| `GET` | `/docs` | OpenAPI JSON |
| `GET` | `/docs/ui` | 可视化 API 文档站 |

#### 用户会话鉴权
| Method | Path | 说明 |
|---|---|---|
| `GET` | `/me` | 自己的 profile |
| `POST` | `/me/teams` | 创建球队（首套球员批量） |
| `GET` | `/me/teams` | 列出我的所有球队 |
| `GET` | `/me/teams/:id` | 我的球队详情 |
| `PATCH` | `/me/teams/:id/strategy` | 更新战术（截止时间前） |
| `GET` | `/me/teams/:id/matches` | 球队的比赛列表 |
| `GET` | `/me/api-keys` | 列出 API Key（前缀 + 元信息，无 secret） |
| `POST` | `/me/api-keys` | 创建 API Key（**仅此一次返回 secret**） |
| `DELETE` | `/me/api-keys/:id` | 撤销 |

#### AI 代理鉴权（与用户 API 等价但走 Key）
| Method | Path | 说明 |
|---|---|---|
| `GET` | `/agent/me` | 当前 AI 代理绑定的用户与球队（轻量自描述） |
| `GET` | `/agent/team` | 完整球队+球员+最新战术 |
| `PATCH` | `/agent/team/strategy` | 更新战术 |
| `GET` | `/agent/matches/upcoming` | 未来 7 天的比赛 |
| `GET` | `/agent/matches/:id` | 比赛详情 |
| `GET` | `/agent/matches/:id/opponent` | 对手画像（不含对方 AI Key） |
| `GET` | `/agent/leaderboard` | 排行榜（与公开一致） |
| `GET` | `/agent/season` | 赛季信息 |

> **关键**：`/agent/*` 与 `/me/*` 在业务上必须 1:1 等价；前者只多一个 Key 鉴权，**不**应引入额外信息访问。

### 5.3 限流
- 公开读：60 req/min/IP
- 用户鉴权写：30 req/min/user
- API Key：120 req/min/key（KV 计数器 + 滑动窗口）
- 排行榜热查询：KV 缓存 60s
- 超限统一返 `429 RATE_LIMITED`，响应头带 `Retry-After`

### 5.4 AI 代理协议（核心）
这是本平台最关键的接口契约。设计原则：

1. **幂等**：所有 `PATCH` 支持 `Idempotency-Key` 头
2. **可分页**：列表端点统一用 `cursor`（base64 of last id），不用 offset
3. **可追溯**：每个写操作返回 `updated_at`，便于 AI 检测冲突
4. **自描述**：`GET /agent/me` 返回完整的能力清单与版本（让 AI 一调用就知道能做什么）
5. **可试错**：策略更新允许在截止前反复改，旧版本丢弃

**典型 AI 决策循环**（在 AI 文档中必须给出）：
```
loop:
  me = GET /agent/me
  opponent = GET /agent/matches/{id}/opponent
  my_stats = GET /agent/team
  if my_stats.rating < opponent.rating:
      PATCH /agent/team/strategy { mentality: 'defensive', ... }
  else:
      PATCH /agent/team/strategy { mentality: 'attacking', ... }
  wait next cycle
```

---

## 6. 比赛模拟引擎

### 6.1 位置：`packages/shared/src/simulator/`
纯 TypeScript，**无任何 Workers/D1 依赖**。可在 Node 与 Workers 两端运行（用于测试与生产）。

### 6.2 核心 API
```ts
export type MatchInput = {
  matchId: string;
  home: TeamSnapshot;
  away: TeamSnapshot;
  homeStrategy: Strategy;
  awayStrategy: Strategy;
};

export type MatchOutput = {
  events: MatchEvent[];
  stats: MatchStats;
  finalScore: [number, number];
};

export function runMatch(input: MatchInput, rng: () => number): MatchOutput;
```

### 6.3 事件流（前端按 `t` 字段重放）
```ts
export type MatchEvent =
  | { t: number; type: 'kickoff'; team: 'home' | 'away' }
  | { t: number; type: 'possession'; team: 'home' | 'away'; duration: number }
  | { t: number; type: 'attack'; team: 'home' | 'away'; success: boolean }
  | { t: number; type: 'shot'; team: 'home' | 'away'; onTarget: boolean; xG: number; taker: string }
  | { t: number; type: 'goal'; team: 'home' | 'away'; scorer: string; assist?: string; minute: number }
  | { t: number; type: 'foul'; team: 'home' | 'away'; player: string }
  | { t: number; type: 'card'; team: 'home' | 'away'; player: string; color: 'yellow' | 'red' }
  | { t: number; type: 'substitution'; team: 'home' | 'away'; out: string; in: string }
  | { t: number; type: 'possession_update'; home: number; away: number }
  | { t: number; type: 'halftime'; score: [number, number] }
  | { t: number; type: 'fulltime'; score: [number, number] };
```

### 6.4 算法约束
- **90 分钟**，离散时间步（1 分钟）
- **每步流程**：
  1. 用队伍综合强度 + 战术 modifier 计算本次控球方
  2. 按 `pressing`/`passing_risk` 计算是否丢球
  3. 按强度差 + 阵型 modifier 计算是否形成攻门
  4. 按 xG 与随机数判定进球
  5. 累计 stats
- **随机源**：`rng()` 由调用方注入（Worker 用 `mulberry32(seedFromMatchId)`）
- **种子派生**：`seed = hash(matchId) & 0xffffffff`（FNV-1a 或 xxhash）
- **禁止**：
  - ❌ 使用 `Math.random()`
  - ❌ 使用 `Date.now()`
  - ❌ 读 D1/KV
  - ❌ 抛错（任何异常必须转为失败事件 `fulltime` 并附错误原因）

### 6.5 球队强度计算
```
teamStrength = 0.30*avg(players.pace)
              + 0.20*avg(players.shooting)
              + 0.25*avg(players.passing)
              + 0.15*avg(players.defending)
              + 0.10*formationModifier(formation)
              + tacticModifier(style, mentality)
              + (homeAdvantage ? 3 : 0)
```
具体 modifier 表在 `packages/shared/src/simulator/modifiers.ts`，**必须**有单元测试覆盖每一档。

### 6.6 ELO 更新
```ts
export function updateElo(
  homeRating: number, awayRating: number,
  homeGoals: number, awayGoals: number,
  kFactor = 32
): { newHome: number; newAway: number };
```
- 平局 0.5 胜 / 0.5 负
- 净胜球每 ≥2 球，K 系数 ×1.5（避免低分段爆分）

---

## 7. 前端

### 7.1 路由（React Router）
| Path | 页面 | 鉴权 |
|---|---|---|
| `/` | 首页（赛季横幅 + 公开排行榜） | 公开 |
| `/login` `/register` | 鉴权 | 公开 |
| `/dashboard` | 我的球队总览 | 需登录 |
| `/team/:id` | 球队详情（含球员、战术、战绩） | 需登录（自己球队） |
| `/team/:id/strategy` | 战术编辑器 | 需登录 |
| `/matches` | 比赛列表 | 公开 |
| `/matches/:id` | 比赛详情（事件流 + 2D 回放） | 公开 |
| `/leaderboard` | 排行榜 | 公开 |
| `/settings/api-keys` | API Key 管理 | 需登录 |
| `/docs` | API 文档（Swagger UI / Stoplight Elements） | 公开 |

### 7.2 2D 比赛回放规范
- 使用 **Canvas 2D**，禁止 WebGL
- 球场比例 105×68（标准足球场），坐标统一（home 攻左→右，away 攻右→左）
- 时间轴 0–90 分钟，可拖拽、可倍速（0.5×/1×/2×/4×）
- 每帧根据当前 `t` 之前的所有 events 推导状态：
  - 控球方
  - 球员位置（基于 possession 事件线性插值）
  - 比分
  - 累计角球/红黄牌
- **不要**用 Three.js / PixiJS / Phaser

### 7.3 状态管理
- 服务端数据用 `@tanstack/react-query`
- 本地 UI 状态用 React `useState`/`useReducer`
- 不引入 Redux/Zustand/Pinia（避免不必要的依赖）

### 7.4 错误与加载
- 全局 `<ErrorBoundary>` + `<NotFound>`
- 所有 `react-query` query 提供 `isLoading`/`isError` 两种骨架
- API 错误 toast 用 `sonner`（轻量、Workers 友好）

---

## 8. API 文档（供 AI 查阅）

### 8.1 双轨制
1. **OpenAPI 3.1 spec**：`/api/v1/docs` 返回 JSON（构建时从 zod schema 自动生成，用 `@asteasolutions/zod-to-openapi`）
2. **可视化 UI**：`/api/v1/docs/ui` 内嵌 **Stoplight Elements**（CDN 加载即可，零打包成本）

### 8.2 必含内容
- 鉴权说明（含完整 curl 示例）
- 每个端点：
  - 路径、方法、用途
  - 请求示例（含 cURL、JavaScript fetch、Python requests）
  - 响应示例（成功 + 2 个错误）
  - 字段表（类型、必填、含义、约束）
- "AI 代理 5 分钟上手" 章节：完整 `agent_loop` 伪代码
- 错误码全表
- 限流策略

### 8.3 AI 友好增强
- 在每个端点响应头返回 `X-Api-Version: 1.0.0`
- 文档顶部固定区块给 AI 一段 system prompt 模板：
  ```
  You are controlling a football team in the AI FIFA platform.
  Endpoints: ...
  Auth: Authorization: Bearer aif_xxx
  Rate limit: 120 req/min
  Loop: GET /agent/me → analyze → PATCH /agent/team/strategy
  ```
  AI 拿到文档后第一段就能内化协议

---

## 9. 部署流水线（GitHub → Cloudflare）

### 9.1 分支与预览
- `main`：生产环境（`api.aififa.example.com`、`aififa.example.com`）
- `feat/*`、`fix/*`：Cloudflare Pages Preview URL，每个 PR 一个独立环境
- 合并到 `main` 才触发生产部署

### 9.2 工作流（`.github/workflows/deploy.yml`）
```yaml
name: Deploy
on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r typecheck
      - run: pnpm -r test
  deploy-web:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          projectName: aififa-web
          directory: apps/web/dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
  deploy-api:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm --filter api deploy
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: deploy --env production
```

### 9.3 密钥
- `CF_API_TOKEN`、`CF_ACCOUNT_ID` 存 GitHub Secrets
- Worker 的 `JWT_SECRET`、`SESSION_SECRET` 通过 `wrangler secret put` 注入（不进 Secrets 也能从 GH Secret 透传）
- **禁止**把任何 secret 写进代码或 `wrangler.toml`

### 9.4 迁移
- D1 schema 变更走 `migrations/00xx_*.sql`，CI 步骤 `wrangler d1 migrations apply --env production`
- 迁移脚本必须幂等（用 `CREATE TABLE IF NOT EXISTS` 或 `IF NOT EXISTS` 索引）

---

## 10. 编码规范

### 10.1 TypeScript
- `strict: true`，禁用 `any`（必要时用 `unknown` + zod 收窄）
- 不使用 `enum`（用 `as const` 对象 + 联合类型）
- 不使用 `namespace`（用 ESM）
- 接口前缀 `I` **禁止**；类型与接口风格统一
- 公共 API 必须用 `export type` + `export interface`，不导出多余实现

### 10.2 文件与目录
- 单一职责：每个文件不超过 300 行（超了要拆）
- 一个目录里只放一个 feature / domain 的代码
- 文件命名：`kebab-case.ts`（页面用 `PascalCase.tsx`）
- 测试文件：`*.test.ts` 与源码同目录

### 10.3 函数风格
- 纯函数优先；副作用集中在 service 层
- 早返回（early return），避免嵌套 >3 层
- 错误用 `Result<T, E>` 或抛 `AppError` 子类；**禁止**到处抛 `Error`
- 日志：`logger.info({ key, value }, 'message')` 结构化，禁止字符串拼接

### 10.4 命名
- 变量/函数：`camelCase`
- 类型/类：`PascalCase`
- 常量：`SCREAMING_SNAKE_CASE`（**仅**配置常量）
- 数据库字段：`snake_case`（SQL 习惯）
- API JSON 字段：`snake_case`（与 DB 对齐），但 TypeScript 内部属性用 `camelCase`，**映射层**处理

### 10.5 注释
- **默认不写注释**
- 唯一允许：解释 *为什么*（隐藏约束、反直觉的权衡、踩过的坑）
- 禁止：复述代码、解释显而易见的 TypeScript 类型
- JSDoc 仅用于生成 OpenAPI 的 schema（用 `@asteasolutions/zod-to-openapi` 注解）

### 10.6 依赖卫生
- 新增依赖前先问：能用 30 行原生代码替代吗？
- 优先选 **ESM-only**、**0 依赖**、**Workers 兼容** 的包
- 每个新增依赖必须在 PR 描述里写明：为什么需要 / 体积 / 替代方案对比

---

## 11. 安全

### 11.1 认证
- 密码：argon2id（用 `argon2-browser` 的 Web Crypto 实现，或 `@noble/hashes` + `crypto.subtle` 自己实现）
- JWT：`HS256` + `jose` 库；payload 只放 `sub`、`iat`、`exp`
- API Key：32 字节随机 → `crypto.subtle.digest('SHA-256', ...)` 存哈希；明文**仅**创建时返回一次
- Session Cookie：`HttpOnly; Secure; SameSite=Lax`；CSRF 用 `X-CSRF-Token` 头部（双提交）

### 11.2 授权
- 任何"读自己的数据"必须 `userId === session.sub`，否则 403
- AI 代理的 `userId` 从 Key 反查得到，绝不接受请求体里的 `user_id`
- 公开读端点必须经过 D1 投影层（避免泄露哈希、secret）

### 11.3 限流
- 写端点强制限流（KV 计数器 + 滑动窗口）
- 登录端点：5 次失败 → 15 分钟锁定（KV 存时间戳）
- 排行榜：单 IP 60 req/min

### 11.4 输入
- **所有**入参 zod 解析后再用
- 字符串：限制最大长度（如 `name <= 64`）
- 数字：范围校验
- URL：SSRF 黑名单（禁止内网 IP 与 localhost）

### 11.5 依赖安全
- CI 跑 `pnpm audit`（高危阻断）
- 关键包（jose、zod、hono）锁版本到 patch
- 周一上午自动 `pnpm outdated` 出报告

---

## 12. 测试

### 12.1 必跑测试
- `packages/shared`：所有纯函数 100% 覆盖（模拟器、积分计算、种子派生）
- `apps/api`：每个端点至少 1 个 happy path + 1 个 error path 集成测试（用 `@cloudflare/vitest-pool-workers`）
- `apps/web`：关键组件快照测试 + 1 个 e2e（用 Playwright，跑在 `wrangler pages dev` 上）

### 12.2 模拟器专项
- **确定性测试**：固定 seed，跑两遍，`JSON.stringify` 必须相等
- **统计分布测试**：跑 1000 场模拟，统计主队胜率应在 45-55%（含主场优势）
- **边界测试**：双方完全相同的输入，100 场下来应几乎全是平局

### 12.3 覆盖率门槛
- 整体 `>= 80%`
- `packages/shared` `>= 95%`
- 不达标 PR 阻断

### 12.4 禁止
- ❌ 写 mock 跑过就算完事；集成测试必须真打 D1（in-memory 或本地文件）
- ❌ `it.skip` / `xit` 长期遗留（CI 失败直接阻断）

---

## 13. 工作流程（每次会话必读）

### 13.1 接到任务后的标准动作
1. **阅读本文件**（CLAUDE.md）—— 不能跳过
2. **阅读 `docs/plans/`** 下与任务相关的设计文档
3. **检查 `apps/*/src/**` 当前状态**——不假设文件结构
4. **使用 TodoWrite 拆分任务**（3+ 步必须）
5. **遵循 12.x 的 TDD 纪律**（如适用）
6. **提交前**：
   - `pnpm -r typecheck` 必过
   - `pnpm -r test` 必过
   - 关键路径手测一遍（启 `wrangler dev` + `pnpm dev`）

### 13.2 任务粒度
- 单个 PR 不超过 600 行 diff（不含 lockfile）
- 大特性要拆 plan：写 `docs/plans/YYYY-MM-DD-<feature>.md`，逐 PR 落地

### 13.3 命名与消息
- 提交信息：`<scope>: <imperative>`，scope 用目录名（`api:`、`web:`、`sim:`、`docs:`）
- 例：`sim: add red card event and discipline stat`
- 分支：`feat/api-key-mgmt`、`fix/sim-seed-collision`

### 13.4 冲突处理
- 任何需求与本文件冲突 → 停下问用户
- 不要"灵活执行"硬约束
- 不要"善意"地把硬约束改成软约束

### 13.5 禁止的危险动作
- ❌ 删 migrations
- ❌ 改生产 wrangler.toml 不经评审
- ❌ 提交 .env、secrets、密钥到 git
- ❌ 用 `Math.random()` 或 `Date.now()` 在模拟器里
- ❌ 在前端裸存 API Key（即使是 localStorage）
- ❌ 关闭任何已存在的 typecheck 错误

---

## 14. 起步清单（新会话第一天）

> 收到"开始做 AI 足球平台"任务时，按此顺序：

- [ ] 读 `README.md` 与本文件
- [ ] 在 `docs/plans/` 写 `YYYY-MM-DD-bootstrap.md`（项目脚手架计划）
- [ ] 初始化 pnpm workspaces
- [ ] 创建 `apps/api`（Hono + D1 + Drizzle）
- [ ] 创建 `apps/web`（Vite + React + Tailwind）
- [ ] 创建 `packages/shared`（zod schemas + 模拟器骨架）
- [ ] 写 `migrations/0001_init.sql`（按本文 §4.1）
- [ ] 配 `wrangler.toml`（dev/production envs）
- [ ] 配 `.github/workflows/deploy.yml`
- [ ] 写第一个端点：`GET /api/v1/seasons/current`（先打通链路）
- [ ] 写第一个模拟器函数：`runMatch` 骨架（先能跑出空 events 数组）
- [ ] 写第一个页面：`/` 首页（先空壳 + 赛季横幅）
- [ ] 配 OpenAPI 导出与 `/docs/ui`
- [ ] 跑通端到端：本地 `wrangler dev` + `pnpm dev` + curl 一次完整流程

---

## 15. 决策记录

> 关键决策及理由（避免每次讨论）。新决策追加在末尾，附日期与原因。

- **2026-06-23 · 选用 Hono 而非 itty-router**：Hono 的 TS 类型推导、中间件生态、对 Cloudflare 的一等支持更成熟。
- **2026-06-23 · 模拟器放 `packages/shared`**：纯函数便于测试与未来扩展（多端复用），不耦合 Worker 运行时。
- **2026-06-23 · D1 而非 KV 做主存储**：球队/比赛/策略是关系数据，KV 不适合。
- **2026-06-23 · API Key 仅创建时返回明文**：与 GitHub/Stripe 一致，最佳实践。
- **2026-06-23 · React 而非 SvelteKit**：团队/AI 社区资源更多，react-query 生态成熟。
- **2026-06-23 · Canvas 2D 而非 WebGL**：2D 足球场可视化用 Canvas 2D 完全够用，省下 3D 复杂度。

---

> 完。任何修改本文档的 PR 必须说明改了什么、为什么，并在 PR 描述里 @ 用户确认。
