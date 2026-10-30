# Engineering Architecture

## 设计要求

- **Browser-first**: GitHub 为权威，Codespaces / Actions / Pages 完成开发闭环。
- **Separate data, simulation, presentation**: 地点独立；状态不可藏在 Mesh 中。
- **Few stable contracts**: 只抽象已经至少有两个例子共同使用的能力。
- **Replaceable visuals**: 美术资产不参与路线、存档、玩法身份判断。
- **No engine within an engine**: 不构建自制 ECS、可视化脚本编辑器或无限通用的事件系统。

## 当前结构

```text
src/
  art/style.ts          全局画面参数
  core/geo.ts           当前阶段的程序化模型语法
  core/types.ts         PlaceId, Interaction, Effect, Location
  core/World.ts         主循环、输入、地点生命周期、跨地点状态
  core/CameraRig.ts     透视跟随与正交等距相机
  core/character.ts     程序化角色 + 阶段式可取消动作表演层
  actors/dog.ts         有独立时钟与反馈的公园动物行为
  core/navigation.ts    小型场景 A* 寻路
  locations/park.ts     公园组装、互动注册、局部行为
  locations/home.ts     小屋组装、互动注册、局部行为
  main.ts               浏览器入口
```

## 地点契约

每个 `Location` 提供 `{ id, root, floor, bounds, obstacles, spawn, camera, interactions, tick }`。`World` 对一个活动地点执行渲染和 `tick`，并保留共享 `actor`、`saved` 与相机。

首版采用**单活动地点**而非多个地点一起模拟。未来需要后台模拟时，给地点增加独立的低频 `simulate(dt)`，不依赖渲染调用，不把全部场景留在显存。

新增地点应只做四件事：创建几何/载入资源、声明行走区域/障碍、注册互动与局部行为、配置镜头。改变 `World` 只应是增补地点注册的一行，后续会改为内容清单动态注册。

## 互动契约

```text
Interaction { id, label, root, approach, use() -> Effect }

玩家输入（点击/触摸）
  -> Raycast 找互动对象
  -> 导航到 approach 锚点
  -> 抵达后执行 use() 获取意图/效果（不提前修改状态）
  -> action.start → 动作 progress 触发 moment cue
  -> World 在 cue 时应用 Effect（心情/经济）
  -> action.finish / action.cancel 释放表现对象
  -> UI/声音/保存反馈
```

V0.2 已使用 `Character.act(kind, onMoment, onFinish, onCancel)`：`use()` 只计算要返回的 `Effect`，所有状态变更在动作 cue 后进行；`onActionStart/onActionEnd` 挂在互动对象上，负责桌面茶杯显隐等表现资源；被新移动或切换地点打断时，必须走相同的结束清理。参见 [ACTIONS.md](ACTIONS.md)。未来再将简单程序动作替换为骨骼动画，暂不创建万能行为树。

## 输入与镜头

输入遵循 **intent rather than direct scene mutation**：键盘/触摸发出移动意图，场景对象点击发出交互意图。`CameraRig` 不知道具体的房间是什么，只知道镜头模式。使用同一个玩家模型与世界坐标。室内等距/户外透视都由 `CameraRig` 管理。

下一阶段要保证输入相对于屏幕方向一致、支持拖动旋转、鼠标悬停提示与触摸拾取。这些还不是首版的完整实现。

## 寻路与碰撞

V0.1 使用 0.45m 规则网格 A* + 圆形静态障碍，能够避免走过桌椅/树干。它不是 NavMesh，不支持复杂多层、移动障碍或攀爬；未来场景较大时替换为 `three-pathfinding` 或 Recast NavMesh。`World` 只依赖 `findPath()` 输出世界空间路点，算法可替换。

## 世界状态与存档

V0.2 仍沿用 V0.1 的浏览器存档，仅包含 `{ mood, coins, place }`。键 `autumn-moments:v1`。**时间仅在会话内**，人物位置和家具摆放不保存；不宣称实现完整世界持久化。

未来的状态形式：

```json
{
  "version": 2,
  "player": { "coins": 30, "mood": 72, "energy": 65, "locationId": "home" },
  "locations": {
    "home": { "furniture": [{ "id": "desk-01", "prefab": "desk", "position": [1, 0, 2], "rotation": 0 }] },
    "farm": { "animals": [{ "id": "dog-01", "name": "Mochi", "affection": 12 }] }
  },
  "flags": {}
}
```

采用 schema 版本与迁移函数；所有对象采用稳定 ID 而非对象数组下标。开发数据与运行时存档分开。以后如果需要云端存档再增加适配层。

## 扩展小游戏

每个小游戏定义 `enter(ctx)`, `tick(dt)`, `exit()`, `getResult()`，拥有局部输入映射、相机预设、临时状态，不得直接改写全局 UI 或随意修改金钱。通过统一 `Effect` 回传报酬/关系/资源。

办公室视锥潜行可以与家中点击互动使用同一“人物、场景、目标、结果”框架，但不共享同一移动规则。是否采用俯视手动 WASD、点击移动等，要以真实玩法测试决定。

## 风险与欠债清单（必须显式追踪）

- 摄像机尚未做到角色与场景遮挡时的透明化/绕行。
- 障碍物是圆形近似；室内家具边缘体验仍需改良。
- 角色没有骨骼，当前动作有明确事件时机但仍是程序姿态；需要 GLB 的动画 clip 与手部 attachment 适配。
- 地点布局代码化，尚未移到声明式场景 JSON。
- 数据层与表现层在 V0.1 仍有耦合，扩大前需要抽出 action controller。
- 没有真实的资产替换过程与视觉回归截图流程。

不要因为写了接口就宣称实现了对应的完整系统。
