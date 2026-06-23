# 部署到 Cloudflare

> 本文档覆盖首次部署到生产 Cloudflare 的完整流程。

## 0. 前置条件

- Cloudflare 账户（[注册](https://dash.cloudflare.com/sign-up)）
- 域名（建议 `aififa.example.com` + `api.aififa.example.com` 两个子域）
- 域名 NS 已切到 Cloudflare（自定义域才需要）
- 本地 `wrangler` CLI 已登录：
  ```bash
  pnpm dlx wrangler login
  ```

## 1. 准备 API Token

到 https://dash.cloudflare.com/profile/api-tokens 创建 **Custom Token**，权限：

- `Account.Workers Scripts:Edit`
- `Account.D1:Edit`
- `Account.Account Settings:Read`（wrangler 验证用）
- `Zone.Zone:Read` + `Zone.Zone Settings:Edit`（仅自定义域需要）
- `Account.Pages:Edit`（仅部署 web 时需要）

把 token 存到 GitHub Secrets：
- `CF_API_TOKEN`：上面创建的 token
- `CF_ACCOUNT_ID`：账户 ID（在 Workers 概览页右上角）

## 2. 创建 D1 数据库

```bash
cd apps/api
pnpm exec wrangler d1 create aififa-db-prod
```

复制输出中的 `database_id`，替换 `wrangler.toml` 中 `env.production.d1_databases.database_id` 的占位值。

## 3. 应用迁移

```bash
pnpm exec wrangler d1 migrations apply DB --env production --remote
```

## 4. 设置密钥

```bash
pnpm exec wrangler secret put JWT_SECRET --env production
# 输入 32+ 字节的随机字符串（用 `openssl rand -hex 32` 生成）
```

## 5. 配置自定义域（可选）

- 登录 Cloudflare Dashboard
- Workers & Pages → `aififa-api` → Settings → Triggers → Add Custom Domain
- 输入 `api.aififa.example.com`

## 6. 部署 API

```bash
pnpm exec wrangler deploy --env production
```

部署成功后输出形如：
```
Published aififa-api (X.XX sec)
  https://aififa-api.<account-subdomain>.workers.dev
  https://api.aififa.example.com (custom domain)
```

冒烟测试：
```bash
curl https://api.aififa.example.com/healthz
# {"status":"ok","env":"production",...}
```

## 7. 部署 Web

### 方式 A：Cloudflare Pages Dashboard（手动）

1. Pages → Create application → Direct Upload
2. 项目名：`aififa-web`
3. 构建命令：`pnpm --filter @ai-fifa/web build`
4. 构建输出目录：`apps/web/dist`
5. 环境变量：暂无（API 地址由 vite proxy 在 dev 用，prod 通过 Pages Functions 或 CORS 直连）
6. 首次上传前先本地 build：
   ```bash
   pnpm --filter @ai-fifa/web build
   ```
7. 拖拽 `apps/web/dist` 到上传区

### 方式 B：GitHub Actions（自动）

`main` 分支 push 后自动部署（`.github/workflows/deploy.yml` 已配）。
需要 GitHub Secrets：`CF_API_TOKEN`、`CF_ACCOUNT_ID`。

## 8. Web 的生产 API 地址

Pages 部署后，Web 仍请求 `/api/...` 相对路径。
- **方案 A（推荐）**：在 Cloudflare Pages 配置 `/_routes.json` + `_redirects`，把 `/api/*` 代理到 Worker custom domain
- **方案 B**：直接改前端 `apiFetch` base URL，跨域靠 API 的 CORS 头（已在 `apps/api/src/middleware/cors.ts` 配 `ALLOWED_ORIGIN`）

本仓库默认方案 B：在生产 wrangler vars 里把 `ALLOWED_ORIGIN` 设为 Pages 域名，Web 直接跨域调用 API 即可。

## 9. 回滚

- Workers：Dashboard → Workers → aififa-api → Deployments → 选旧版本 → Rollback
- Pages：Dashboard → Pages → aififa-web → Deployments → 选旧版本 → Rollback

## 10. 监控

- Workers Logs：Dashboard → Workers → Logs → 实时或历史
- Workers Analytics：Workers → Analytics → 请求量、错误率、CPU 时间
- D1：Dashboard → D1 → 选中数据库 → 读 / 写次数、存储

## 11. CI/CD 检查清单

- [ ] `CF_API_TOKEN` 与 `CF_ACCOUNT_ID` 已配
- [ ] `JWT_SECRET` 已设（`wrangler secret put` 或 GH Secrets 透传）
- [ ] `wrangler.toml` 中 `env.production.d1_databases.database_id` 已替换
- [ ] D1 migrations 已 `--remote` 应用
- [ ] 首次 push 到 `main` 后 Actions 全绿
- [ ] Workers URL 与 Pages URL 互相通
