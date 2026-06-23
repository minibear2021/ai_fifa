# Bootstrap Plan · 2026-06-23

> 目标：按 `CLAUDE.md` §14 完成项目脚手架，端到端跑通 **前端 → API → D1** 链路。
> 本计划只覆盖**脚手架与第一轮端到端**，后续特性（用户、球队、比赛、排行榜、API 文档、部署）分独立计划。

---

## 阶段总览

| Phase | 内容 | 依赖 | 预计产出 |
|---|---|---|---|
| **P0** | Monorepo 骨架 | — | `pnpm install` 成功，根级 typecheck 通过 |
| **P1** | `packages/shared` | P0 | zod schema + 模拟器骨架 + 单测 |
| **P2** | `apps/api` | P1 | Hono + D1 + Drizzle + 一个可用端点 |
| **P3** | `apps/web` | P2 | Vite + React + Tailwind + 首页 |
| **P4** | API 文档（OpenAPI + UI） | P2 | `/api/v1/docs` + `/api/v1/docs/ui` |
| **P5** | CI/CD 配置 | P2 | `.github/workflows/deploy.yml` + `wrangler.toml` |
| **P6** | 端到端冒烟 | 全部 | 本地 `wrangler dev` + `pnpm dev` 跑通 |

---

## P0 · Monorepo 骨架

### 任务
- 创建 `pnpm-workspace.yaml`（含 `apps/*` 与 `packages/*`）
- 创建根 `package.json`（name 私有，scripts: `dev` / `build` / `typecheck` / `test` / `lint`）
- 创建 `tsconfig.base.json`（`strict: true`、`noUncheckedIndexedAccess: true`、`target: ES2022`、`module: ESNext`、`moduleResolution: bundler`）
- 创建 `.gitignore`（node_modules、dist、.wrangler、.env、.DS_Store、*.log）
- 创建 `.editorconfig`（LF、2 空格、UTF-8）
- 创建 `.npmrc`（`shamefully-hoist=false`，`auto-install-peers=true`）
- 创建根 `README.md`（项目介绍 + 本地开发命令）
- 创建目录骨架：`apps/`、`packages/`、`docs/plans/`、`.github/workflows/`

### 验收
- `pnpm install` 在根目录 0 错误
- `pnpm -r typecheck` 通过（即使子包为空，至少根能跑）
- 目录结构与 `CLAUDE.md` §2.5 一致

---

## P1 · `packages/shared`

### 任务
- `packages/shared/package.json`
  - `name: @ai-fifa/shared`
  - `type: module`
  - `exports`: `.` 与 `./simulator`、`./schemas`
  - `dependencies`: `zod`
  - `devDependencies`: `typescript`、`vitest`、`@types/node`
- `packages/shared/tsconfig.json`（继承 base）
- `packages/shared/src/index.ts`（聚合导出）
- `packages/shared/src/schemas/index.ts`：
  - `playerSchema`、`teamSchema`、`strategySchema`、`matchEventSchema`、`matchSchema`、`userSchema`、`apiKeySchema`
- `packages/shared/src/simulator/types.ts`：`MatchInput`、`MatchOutput`、`MatchEvent`、`MatchStats`、`TeamSnapshot`、`Strategy`
- `packages/shared/src/simulator/seed.ts`：`seedFromMatchId(matchId: string): number`（FNV-1a）
- `packages/shared/src/simulator/rng.ts`：`mulberry32(seed: number): () => number`
- `packages/shared/src/simulator/runMatch.ts`：`runMatch(input, rng): MatchOutput`（**本阶段只返回空 `events` 与 `finalScore: [0,0]`**，留 TODO 给后续模拟器迭代）
- `packages/shared/src/simulator/elo.ts`：`updateElo(...)`（**本阶段返回原 rating**）
- `packages/shared/src/simulator/runMatch.test.ts`：种子确定性测试（同一 input + rng → 同样 output）

### 验收
- `pnpm --filter @ai-fifa/shared test` 通过
- `pnpm --filter @ai-fifa/shared build` 产出 `dist/`
- 模拟器函数签名与 `CLAUDE.md` §6.2 完全一致

---

## P2 · `apps/api`

### 任务
- `apps/api/package.json`
  - `name: @ai-fifa/api`
  - `type: module`
  - `dependencies`: `hono`、`drizzle-orm`、`zod`、`jose`、`@ai-fifa/shared`
  - `devDependencies`: `wrangler`、`@cloudflare/workers-types`、`@cloudflare/vitest-pool-workers`、`drizzle-kit`、`vitest`、`typescript`
- `apps/api/wrangler.toml`
  - `name: aififa-api`
  - `main: src/index.ts`
  - `compatibility_date: 2025-05-01`
  - `[[d1_databases]]` binding: `DB`、`database_id` 留 TODO（本地用 `--local` 模式无需 id）
- `apps/api/tsconfig.json`（继承 base，lib 含 `WebWorker`）
- `apps/api/src/index.ts`：`export default { fetch: app.fetch }` 形式导出 Hono app
- `apps/api/src/app.ts`：`new Hono()` + 全局中间件 + 路由挂载
- `apps/api/src/middleware/error.ts`：统一错误响应壳
- `apps/api/src/middleware/cors.ts`：开发环境放行 `http://localhost:5173`
- `apps/api/src/db/schema.ts`：Drizzle schema（与 `CLAUDE.md` §4.1 对齐，本阶段先定义 `seasons` 与 `users` 两个表够用）
- `apps/api/src/db/client.ts`：从 `c.env.DB` 构造 D1 客户端
- `apps/api/src/routes/health.ts`：`GET /healthz`
- `apps/api/src/routes/seasons.ts`：`GET /api/v1/seasons/current`（先返回硬编码 `{ id, name, starts_at, ends_at }`）
- `apps/api/migrations/0001_init.sql`：创建 `seasons` 与 `users` 表
- `apps/api/src/routes/seasons.test.ts`：集成测试（用 `@cloudflare/vitest-pool-workers` 注入 D1）

### 验收
- `pnpm --filter @ai-fifa/api exec wrangler dev` 启动并监听 `:8787`
- `curl http://localhost:8787/healthz` 返回 `{"status":"ok"}`
- `curl http://localhost:8787/api/v1/seasons/current` 返回 200 + JSON
- 集成测试通过

---

## P3 · `apps/web`

### 任务
- `apps/web/package.json`
  - `name: @ai-fifa/web`
  - `type: module`
  - `dependencies`: `react`、`react-dom`、`react-router-dom`、`@tanstack/react-query`、`sonner`
  - `devDependencies`: `vite`、`@vitejs/plugin-react`、`typescript`、`@types/react`、`@types/react-dom`、`tailwindcss`、`postcss`、`autoprefixer`
- `apps/web/vite.config.ts`：插件、别名 `@/` → `src/`、dev server `:5173`、proxy `/api` → `http://localhost:8787`
- `apps/web/tailwind.config.ts`、`apps/web/postcss.config.js`
- `apps/web/index.html`
- `apps/web/src/main.tsx`、`apps/web/src/App.tsx`、`apps/web/src/index.css`
- `apps/web/src/routes/Home.tsx`：调用 `/api/v1/seasons/current` 并显示赛季名（用 `react-query`）
- `apps/web/src/lib/api.ts`：`fetch` 封装（统一响应壳解析、错误抛 `ApiError`）
- `apps/web/src/lib/query-client.ts`

### 验收
- `pnpm --filter @ai-fifa/web dev` 启动并监听 `:5173`
- 浏览器访问首页显示当前赛季名（来自 API）
- 任意 fetch 错误通过 `sonner` toast 显示

---

## P4 · API 文档

### 任务
- `apps/api/src/docs.ts`：用 `@asteasolutions/zod-to-openapi` 从 `packages/shared` 的 schemas 生成 OpenAPI 3.1
- `apps/api/src/routes/docs.ts`：
  - `GET /api/v1/docs` 返回 OpenAPI JSON
  - `GET /api/v1/docs/ui` 返回内嵌 **Stoplight Elements** 的 HTML
- 在 `app.ts` 挂载
- `apps/api/package.json` 加 `@asteasolutions/zod-to-openapi`、`swagger-ui-dist`（用于元素）— **实际**用 CDN 引用 Stoplight Elements，0 依赖

### 验收
- `curl http://localhost:8787/api/v1/docs` 返回合法 OpenAPI JSON
- 浏览器访问 `/api/v1/docs/ui` 看到可交互文档

---

## P5 · CI/CD

### 任务
- `.github/workflows/deploy.yml`（参考 `CLAUDE.md` §9.2）：test → typecheck → Pages deploy → Worker deploy
- `.github/workflows/pr-preview.yml`：PR 触发 Pages preview（可选，P5 简化为占位）
- `.github/dependabot.yml`：周更依赖
- `.github/CODEOWNERS`：占位
- `apps/web/wrangler.toml`（Pages 兼容）或 `apps/web/public/_headers`（CSP、CORS）
- 根 `README.md` 增补"部署到 Cloudflare"小节（指向 `CLAUDE.md` §9）

### 验收
- YAML 合法（GitHub Actions 在线校验）
- secrets 占位 `CF_API_TOKEN`、`CF_ACCOUNT_ID` 在 README 中有说明

---

## P6 · 端到端冒烟

### 任务
- 终端 A：`pnpm --filter @ai-fifa/api exec wrangler dev`
- 终端 B：`pnpm --filter @ai-fifa/web dev`
- 浏览器访问 `http://localhost:5173`
- 检查：
  1. 首页正常渲染
  2. 看到当前赛季名（来自 API）
  3. 浏览器 Network 面板：`/api/v1/seasons/current` 200
  4. 访问 `http://localhost:5173/api/v1/docs/ui`（经 vite proxy）看到文档
- 关闭两进程，编写 `docs/plans/2026-06-23-bootstrap-verify.md` 记录验证结果

### 验收
- 上述 4 步全部通过
- 文档可读

---

## 范围外（不在这份计划内）

以下功能**不在**本轮 bootstrap 范围，将另起计划：

- 用户注册/登录（`/auth/*`、`/me/*`）
- API Key 管理（`/me/api-keys/*`、`/agent/*`）
- 球队创建与球员管理
- 比赛模拟生产化（含 Cron Trigger、ELO 写回）
- 排行榜（缓存 + 查询）
- 比赛回放前端（Canvas 2D）
- 用户级 / Agent 级鉴权中间件
- 限流中间件
- 真实部署到 Cloudflare（CI 配置先到位，真实发布待后续）

---

## 风险与备选

- **Wrangler 在 Windows 的兼容**：使用 `wrangler dev --local` 模式，避免远程 dev tunnel 在 Windows 的偶发问题。
- **vitest-pool-workers 初次跑慢**：首次会下载 workerd 运行时，给 5-10 分钟。
- **pnpm 9 vs 10**：选 9.x（稳定），避免 10 的 breaking change。
- **Tailwind 3 vs 4**：选 3.4.x（稳定，文档丰富），4 的 PostCSS 集成有变更。

---

## 关键决策（追加到 `CLAUDE.md` §15）

待 P0-P6 完成后追加：
- `2026-06-23 · 模拟器骨架首版：runMatch 返回空 events + 0-0，留待下个 plan 接入完整算法`
- `2026-06-23 · OpenAPI 文档用 Stoplight Elements CDN：0 打包成本、视觉现代、Workers 友好`
- `2026-06-23 · 团队代号：@ai-fifa/*（scope）`
