# Architectural Decision Records

## ADR-001 — GitHub-first delivery (2026-10-30)

**选择**：GitHub 仓库为唯一源、Codespaces 开发、Actions 构建、Pages 部署。首轮不依赖本地 Blender。

**理由**：减少环境摩擦，允许 Agent 高频小步修改，所有产出可追溯。

**代价**：Codespaces 有配额，GitHub Pages 只提供静态托管；高品质角色资产后续仍可能需要专业工具。

## ADR-002 — Three.js + small TypeScript modules

**选择**：直接使用 Three.js，不加 React、ECS、状态机框架或物理引擎作为初始依赖。

**理由**：当前一两个地点能通过简单契约完成验证；过早的抽象会锁定尚未测试的玩法形态。

**重新评估条件**：5+ 地点、复杂角色行为、多人共享状态或广泛复用的系统出现。

## ADR-003 — Stylized procedural placeholder art

**选择**：起步时使用程序化几何而不是美术资源包；用可替换的 prefab 语义构造空间。

**理由**：对视觉构图、交互、角色尺寸和镜头迭代速度快；避免浏览器环境下重资产制作者依赖。

**代价**：角色动作、家具曲面和材质细节还远不及最终参考图；这是明确的临时方案。

## ADR-004 — Shared world, site-specific games

**选择**：共享人物/对象/状态/输入意图/镜头系统；不强制每个地点共享小游戏规则。

**理由**：家的点击指挥、牧场照料和办公室潜行，玩家动作与心理不同；强制统一游戏规则会扼杀地点的个性。

## ADR-005 — Navigation scoped to prototype

**选择**：当前用 A* 规则网格与圆形障碍，明确未来可替换。

**理由**：小型室内可使用，成本有限；不承诺复杂动态碰撞。

## ADR-006 — Save model versioned from the start

**选择**：`autumn-moments:v1` 存档；V0.1 只保存有真实逻辑的三项，不保存虚假的人物家具状态。

**理由**：保证承诺的可预期性；以后升级带迁移函数。
