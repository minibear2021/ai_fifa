# Round 3 · 前端 + 部署就绪 · 2026-06-25

> 目标：让 Round 2 的 API 后端在浏览器里可被人类使用，并完成 Cloudflare 部署所需的全部配置（实际部署需要用户提供的 `CF_API_TOKEN` 与 `CF_ACCOUNT_ID`）。

---

## 阶段

| Phase | 内容 | 依赖 |
|---|---|---|
| **R3-1** | 前端基础设施：API 客户端扩展、auth store、react-hook-form、sonner toast 集成 | — |
| **R3-2** | 注册/登录页 | R3-1 |
| **R3-3** | 顶部布局 + 受保护路由 + 登出 | R3-1 |
| **R3-4** | Dashboard（我的球队 + 即将到来的比赛） | R3-3 |
| **R3-5** | 球队详情 + 战术编辑器（formation/style/mentality 滑块 + 数字） | R3-4 |
| **R3-6** | API Key 管理页（创建/列表/撤销，明文只显示一次） | R3-4 |
| **R3-7** | 比赛列表 + 比赛详情（事件时间轴 + 比分） | R3-4 |
| **R3-8** | Leaderboard 简单查询（公开） | — |
| **R3-9** | drizzle-kit 配置 + 部署文档 + OpenAPI 扩展到新端点 | — |
| **R3-10** | 端到端冒烟（人类 UI 走一遍） | 全部 |

---

## R3-1 · 前端基础设施

- `src/lib/api.ts` 扩展：401 自动跳 `/login`；支持 `credentials: 'include'` 携带 cookie
- `src/lib/auth.ts`：登录态 hook（基于 `/me` 查询结果）
- `src/components/Layout.tsx`：顶栏 + 容器
- `src/components/ProtectedRoute.tsx`：未登录跳 `/login`
- `src/components/FormField.tsx`：通用表单项

## R3-2 · 注册/登录

- `/register`：email、password（≥8）、display_name
- `/login`：email、password
- 成功后跳 `/dashboard`，失败 toast

## R3-3 · 顶部布局

- 顶栏：Logo、当前赛季名、用户菜单（display_name、登出）
- `<ProtectedRoute>` 包裹所有需登录页

## R3-4 · Dashboard

- 我的球队卡片：名称、阵型、ELO、球员数
- 即将到来的比赛：列出 `status=scheduled` 且 `kickoff_at > now` 且包含我的球队
- 创建球队按钮（弹窗：name + formation）

## R3-5 · 球队详情

- 球队基本信息（name、formation、rating、created_at）
- 球员列表（11 人按位置分组）
- 战术编辑器：
  - Formation：select（6 个选项）
  - Style：select（5 个选项）
  - Mentality：select（5 个选项）
  - Pressing / Passing risk / Width：range 0-100
  - Fouls tactical：checkbox
  - 提交：PATCH `/me/teams/:id/strategy`
  - 截止时间提示：未来 30 分钟内有比赛时显示警告并禁用

## R3-6 · API Key 管理

- 列表：label、prefix（`aif_AbCd…`）、last_used_at、revoked_at
- 创建按钮：弹窗输入 label，提交后**弹窗显示完整 secret 一次** + 复制按钮
- 撤销：确认后 DELETE
- 帮助文本：链接到 `/api/v1/docs/ui` 介绍 AI 协议

## R3-7 · 比赛

- `/matches`：全部比赛（按 kickoff 倒序）
  - 状态过滤 tab：all / scheduled / finished
- `/matches/:id`：
  - 比分 + 状态
  - 双方球队链接
  - 战术摘要（两边）
  - 事件时间轴（按 t 升序）：kickoff/shot/goal/foul/card/halftime/fulltime
  - Stats：控球、射门、角球、犯规、黄红牌

## R3-8 · Leaderboard

- `/leaderboard`：公开页
- 拉取 `GET /teams?limit=50`（用 D1 的 `ORDER BY rating DESC`），客户端组装
- 展示：排名、球队、用户 display_name、ELO

## R3-9 · 部署就绪

- 顶层 `drizzle.config.ts`（位于 `apps/api/`）生成迁移（备选，本轮不强求用 drizzle-kit）
- `apps/api/wrangler.toml` 加 `production` env 的 custom domain 占位
- `README.md` 部署章节补充：d1 create → secrets put → deploy 命令清单
- `docs/api/deploy.md` 详细步骤
- OpenAPI 文档扩展：把新端点都注册到 `docs.ts`

## R3-10 · 端到端冒烟

- 启 wrangler dev + pnpm dev
- 浏览器走通：注册 → 建队 → 拿 API Key → 改战术 → 手动排程（curl）→ simulate → 看比赛详情
- 记录到 `docs/plans/2026-06-25-r3-verify.md`

---

## 范围外（明确不做）

- 真实 `wrangler deploy`（需用户 secrets）
- Cron Trigger 自动开赛
- 赛季调度
- Canvas 2D 回放（事件时间轴已够用）
- 限流中间件
- 多语言、暗色模式切换（默认暗色）

## 风险

- **Drizzle 类型与 schema 同步**：drizzle-kit 在 win 上可能慢；不强求，hand-written migration 已够用
- **OpenAPI 文档维护**：手写注册比较繁琐；接受
- **react-hook-form + zod resolver 类型**：先跑通即可，UX 改进留 Round 4
