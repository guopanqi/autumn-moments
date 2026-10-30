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

## 2026-10-30 / V0.2 分阶段交互

**决定**：采用有限动作种类 + 明确关键时刻（cue） + 统一取消回调，而不是把效果直接绑定点击，也不引入通用行为树或 Timeline 编辑器。

**原因**：角色行为的可读性是玩家相信世界存在的条件；另一方面早期资源主要是程序化模型，需要先验证动作时序接口，再替换为 GLB 和骨骼动画。相机与行走支持保留原接口。

**边界**：当前动作只有姿态与手持物演示，没有骨骼或真实椅面、床面约束；动物是局部自主表现而非全世界持续后台模拟。保留未来替换空间，不夸大完成度。

## 2026-10-30 / V0.3 家具编辑入口

**决定**：家具暂采用房间内的独立 `HomeDecoration`，而不是全局通用编辑器。几何来自程序化 prefab；持久化 ID 与 `Object3D` 分离，圆形代理进入当前地点的导航障碍。

**原因**：先验证点击布置与空间反馈是否有趣，避免过早投入资产编辑器、背包和复杂家具权限。存档使用 v2 键并兼容 v1，而非破坏已保存的心情/经济。

**待验证**：实际鼠标/触摸操作是否直观；可摆放区域是否过小、圆形代理是否太保守，以及房间内家具总体的表现力。

## V0.4 — Edit committed furniture, not duplicated prefabs

Keep one stable furniture ID through reposition/rotation. Editing uses a translucent independent preview, hides the old mesh temporarily, and updates the old navigation obstacle only at commit. A cancel restores the original mesh. Validations run on both preview and commit and temporarily exclude the selected object's prior obstacle. Snapshot-based undo/redo is scoped to one room and only persists final furniture data; it does not expand the global save schema.
