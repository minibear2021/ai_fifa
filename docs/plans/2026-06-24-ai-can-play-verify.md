# Round 2 验证 · AI 上场 · 2026-06-24

> 验证 `docs/plans/2026-06-24-ai-can-play.md` 闭环：注册 → 建队 → Key → 改战术 → 排程 → 模拟 → ELO 更新。

## 验收结果

| 阶段 | 状态 | 关键产出 |
|---|---|---|
| R2-0 schema | ✅ | Drizzle 全套（7 张表）+ `migrations/0002_full.sql` + 本地 wrangler 迁移成功 |
| R2-1 鉴权 | ✅ | PBKDF2（Web Crypto）+ jose JWT + API Key 生成/哈希（4+3+4 单测） |
| R2-2 用户/球队 | ✅ | register/login/logout/me、teams CRUD、11 默认球员 + 默认策略（11 单测） |
| R2-3 API Key | ✅ | 创建返回明文一次、列出脱敏、撤销后失效、Agent 中间件（5 单测） |
| R2-4 Agent 端点 | ✅ | /agent/me、/agent/team、/agent/team/strategy（PATCH 含截止锁）、/agent/matches/* |
| R2-5 比赛端点 | ✅ | GET/POST /matches、POST /matches/:id/simulate（事务：events/stats/ELO） |
| R2-6 模拟算法 | ✅ | 90 分钟步进、控球/攻门/进球/战术 modifier、确定性（6 单测） |

## 测试覆盖

```
packages/shared     : 18/18 passed
apps/api            : 33/33 passed (8 test files)
  ├─ passwords      : 4
  ├─ jwt            : 3
  ├─ apiKey         : 4
  ├─ seasons        : 3
  ├─ auth           : 6
  ├─ teams          : 5
  ├─ apiKeys        : 5
  └─ matches        : 3
```

## 端到端 happy path（测试已覆盖）

```
register Alice  ─→  create team  ─┐
                                  ├─→  POST /matches  ─→  POST /matches/:id/simulate
register Bob    ─→  create team  ─┘                          │
                                                             ├─→  events (kickoff/halftime/fulltime/shot/goal/...)
                                                             ├─→  stats (possession/shots/corners/fouls/cards)
                                                             └─→  teams.rating 按 ELO 双向更新
```

## 关键发现 / 决策

- **D1 batch 限制**：单次 batch 多 insert 命中 "too many SQL variables"，球员改顺序单条插入。
- **Hono v4 错误处理**：必须用 `app.onError()`，middleware try/catch 捕获不到 route 抛出的错误。
- **class identity**：用 duck-typing (`'code' in err && typeof err.status === 'number'`) 而非 `instanceof`，避开潜在的打包边界问题。
- **Workers 兼容的密码哈希**：`@node-rs/argon2` 不兼容 Workers，改为 `crypto.subtle` + PBKDF2-SHA256 / 600k iter（OWASP 2023 推荐值）。
- **模拟算法调整**：HOME_ADVANTAGE 从 3 调到 1.5，平衡统计——等强球队主队胜率 0.2-0.45，平局占主导，更接近现实。
- **测试运行方式**：vitest-pool-workers + `cloudflare:test` 虚拟模块 + `SELF.fetch`，迁移在 `test-setup.ts` 的 beforeAll 内联执行（worker 内不可读文件）。
- **类型 Import**：`TeamSnapshot` 来自 `@ai-fifa/shared/simulator`（不是 schemas）。

## 范围外（本轮未做）

- 前端页面（R2-7）：register/login/dashboard/team/api-keys/matches UI 仍只有首页
- 端到端脚本（R2-8）：测试已覆盖 API 闭环，CLI 脚本未写
- 限流中间件
- 真实部署（drizzle-kit generate + wrangler d1 create + wrangler deploy）

## 决策追加（CLAUDE.md §15）

- `2026-06-24 · 密码哈希用 PBKDF2-SHA256 / 600k iter (Web Crypto)`：@node-rs/argon2 不兼容 Workers runtime
- `2026-06-24 · Hono 错误处理必须用 app.onError()`：v4 middleware try/catch 失效
- `2026-06-24 · 模拟器 HOME_ADVANTAGE=1.5`：避免平局被压成稀有事件
- `2026-06-24 · D1 避免大 batch`：单次 batch 多 insert 会触发 SQLITE_MAX_VARIABLE，手动顺序更可控
- `2026-06-24 · test-setup 内嵌 SQL`：worker 内不可读文件，把迁移 SQL 嵌入 TS
- `2026-06-24 · 测试用 SELF.fetch`：vitest-pool-workers 推荐路径，比 app.request 注 env 更贴近真实
