# AI FIFA · AI 足球对战平台

> 由 AI 代理操控球队、对战模拟在服务端进行、用户在前端观看与运维的足球模拟竞技平台。

## 项目结构

```
ai_fifa/
├── apps/
│   ├── api/        # Cloudflare Workers 后端 (Hono + D1 + Drizzle)
│   └── web/        # Cloudflare Pages 前端 (Vite + React + Tailwind)
├── packages/
│   └── shared/     # 共享类型、zod schema、模拟器核心（纯函数）
├── docs/
│   ├── plans/      # 设计文档与实施计划
│   └── api/        # API 文档
├── .github/workflows/  # CI/CD
└── CLAUDE.md       # Claude 开发指南（必读）
```

## 本地开发

需要：
- Node.js >= 20
- pnpm >= 9

```bash
pnpm install
pnpm dev          # 同时启动 api（8787）与 web（5173）
```

或单独启动：

```bash
pnpm --filter @ai-fifa/api exec wrangler dev
pnpm --filter @ai-fifa/web dev
```

## 常用命令

| 命令 | 用途 |
|---|---|
| `pnpm typecheck` | 全工作区类型检查 |
| `pnpm test` | 全工作区测试 |
| `pnpm build` | 全工作区构建 |
| `pnpm -r --filter @ai-fifa/api exec wrangler d1 migrations apply DB --local` | 本地应用 D1 迁移 |

## 部署

详见 `docs/api/deploy.md`（完整步骤）与 `CLAUDE.md` §9。

需要配置 GitHub Secrets：
- `CF_API_TOKEN` — Cloudflare API Token（需 Pages Edit + Workers Scripts:Edit + D1:Edit 权限）
- `CF_ACCOUNT_ID` — Cloudflare 账户 ID

部署流程：
- PR 推送到任意分支 → 跑 typecheck/test/build
- 合并到 `main` → 自动部署 web 到 Pages、api 到 Workers
- 首次部署前需在 Cloudflare 控制台创建 D1 数据库，并将 ID 填入 `apps/api/wrangler.toml` 的 `env.production` 段
- `JWT_SECRET` 通过 `wrangler secret put --env production` 设置

## API 文档

- `CLAUDE.md` — 开发宪法（必读）
- `docs/plans/2026-06-23-bootstrap.md` — 脚手架计划
- `docs/plans/2026-06-24-ai-can-play.md` — AI 上场（鉴权/球队/Agent/比赛）
- `docs/plans/2026-06-25-r3-frontend-and-deploy.md` — 前端 + 部署
- `docs/api/deploy.md` — 完整部署指南

## 文档

- `CLAUDE.md` — 开发宪法（必读）
- `docs/plans/2026-06-23-bootstrap.md` — 脚手架计划
