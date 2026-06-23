# Bootstrap 端到端验证 · 2026-06-23

> 验证 `docs/plans/2026-06-23-bootstrap.md` P0–P5 全部完成，链路通畅。

## 验证环境
- Node 24.11.1
- pnpm 10.29.2
- Windows 10 + PowerShell（通过 Git Bash 桥接）
- Cloudflare workerd（@cloudflare/vitest-pool-workers 拉取）

## 启动方式
```bash
# 终端 A
pnpm --filter @ai-fifa/api exec wrangler dev --port 8787 --local

# 终端 B
pnpm --filter @ai-fifa/web dev
```

## 验证矩阵

| # | 检查项 | 命令 | 预期 | 实际 |
|---|---|---|---|---|
| 1 | API 健康检查 | `curl http://127.0.0.1:8787/healthz` | 200 + `{"status":"ok",...}` | ✅ 200 + `{"status":"ok","env":"development","ts":...}` |
| 2 | 公开读：当前赛季 | `curl http://127.0.0.1:8787/api/v1/seasons/current` | 200 + season data | ✅ 200 + `{"data":{"id":"...","name":"Season 1 · Kickoff",...}}` |
| 3 | OpenAPI 文档 | `curl http://127.0.0.1:8787/api/v1/docs` | 200 + OpenAPI 3.1.0 JSON | ✅ 200, 1994 bytes, openapi=3.1.0, paths=[/healthz, /api/v1/seasons/current] |
| 4 | API 文档 UI（Stoplight Elements） | `curl http://127.0.0.1:8787/api/v1/docs/ui` | 200 + HTML 含 `<elements-api>` | ✅ 200, 528 bytes, 含 stoplight CDN + elements-api 标签 |
| 5 | 前端 SPA | `curl http://127.0.0.1:5173/` | 200 + HTML 含 #root | ✅ 200, 含 "AI FIFA" 与 "root" |
| 6 | 跨域代理：API 经 vite | `curl http://127.0.0.1:5173/api/v1/seasons/current` | 200 + 同 #2 数据 | ✅ 200, 数据完全一致 |
| 7 | 跨域代理：文档 UI 经 vite | `curl http://127.0.0.1:5173/api/v1/docs/ui` | 200 + 同 #4 | ✅ 200, stoplight/elements-api 完整 |
| 8 | 工作区 typecheck | `pnpm -r typecheck` | 0 错误 | ✅ shared + api + web 全过 |
| 9 | 工作区 test | `pnpm -r test` | 全绿 | ✅ shared 16/16, api 3/3 |
| 10 | Web 生产构建 | `pnpm --filter @ai-fifa/web build` | dist 产出 | ✅ 2.33s, 96 modules, 290.58 kB JS (gzip 86.49 kB) |

## 文件清单

### 配置
- `package.json`（根）、`pnpm-workspace.yaml`、`tsconfig.base.json`、`.gitignore`、`.editorconfig`、`.npmrc`
- `apps/api/wrangler.toml`、`apps/api/.dev.vars.example`
- `apps/web/vite.config.ts`、`apps/web/tailwind.config.ts`、`apps/web/postcss.config.js`、`apps/web/public/_headers`
- `.github/workflows/deploy.yml`、`.github/dependabot.yml`、`.github/CODEOWNERS`

### packages/shared
- `src/schemas/index.ts`：player / team / strategy / match / event / season / user / apiKey
- `src/simulator/{types,seed,rng,runMatch,elo,index}.ts` + 4 个测试文件
- `dist/` 已生成（被 api 引用）

### apps/api
- `src/index.ts`、`src/app.ts`、`src/bindings.ts`
- `src/middleware/{error,cors}.ts`
- `src/db/{schema,client}.ts`
- `src/routes/{health,seasons,docs}.ts` + 1 个测试
- `src/docs.ts`（OpenAPI 生成器）
- `migrations/0001_init.sql`

### apps/web
- `src/main.tsx`、`src/App.tsx`、`src/index.css`
- `src/lib/{api,query-client}.ts`
- `src/routes/Home.tsx`

## 验证结论

✅ **P0–P6 全部完成。** 端到端链路（浏览器 → Vite → Workers → D1 mock）通畅，文档可访问，类型与测试均通过。

## 待办（不在本轮 bootstrap 范围）

- 用户注册/登录（argon2id + JWT）
- API Key CRUD + AI 代理鉴权中间件
- 球队创建与球员管理
- 比赛模拟生产化（Cron Trigger、ELO 写回）
- 排行榜（KV 缓存）
- 比赛回放前端（Canvas 2D）
- 限流中间件（KV 滑动窗口）
- 真实部署到 Cloudflare（创建 D1、设 secrets、跑 wrangler deploy）
