# Phased Roadmap / 可迭代交付计划

总体准则：**先检验想要的感觉，再扩展世界；每一阶段都应有可以被体验、截图和观察的结果。**

## Phase 0 — 项目与视觉走通（V0.1）

- [x] 独立 GitHub 仓库与浏览器开发配置
- [x] TypeScript + Three.js + Vite 基本结构
- [x] 公园、家两个简化可游玩场景
- [x] 程序 Q 版人物、走路/站立和简化生活动作
- [x] 公园透视跟随 vs 室内等距正交镜头
- [x] 地面点击移动、互动对象点击走近、基本路径避障
- [x] 简单心情/经济、会话内时间与本地存档
- [x] GitHub Actions 构建与 Pages 发布配置
- [ ] **浏览器人工试玩确认**：模型没有穿帮、点击可以抵达、小屋镜头构图正确
- [x] **Pages 工作流发布成功**（2026-10-30；匿名与无痕浏览器访问仍待人工验收）
- [ ] **真实画面对照评价**：人物、颜色、光照和整体构图是否达目标

通过标准：在电脑浏览器中能于公园行走、摸狗、通过入口回家、在小屋喝茶、回公园，整个过程无控制台异常。视觉上至少有统一的微缩场景感。

## Phase 1 — 角色动作与家居感（当前 V0.2–0.4）

### V0.2：动画与反馈（代码已提交，真实浏览器验收待完成）

- [x] 阶段式可取消动作：靠近→面向→动作时刻→效果→收尾
- [x] 手持茶杯和桌面茶杯同步；取消动作时恢复
- [x] 休息、坐下、摸狗的程序姿态与减速过渡
- [x] 狗的自主环顾、摆尾及宠爱反馈；不读取玩家输入事件做动画
- [x] 地点淡入淡出过场，消除硬切
- [ ] 浏览器真实验收：点击中断不重复领心情，返回小屋不残留杯子状态；桌面/手机无动作卡死
- [ ] V0.2 参考视觉截图对照与角色动作品质调优

### V0.3–0.4：美术替换与更复杂的生活互动


- 程序角色替换为许可合规的骨骼 glTF 角色；统一模型朝向、尺度和锚点。
- 动作状态机：idle/walk/turn/sit/sip，带 blend、打断和行动事件。
- 小屋增强：家具级碰撞、视线处理、窗外层次、统一物体高光提示。
- 茶杯互动完整闭环：拿取、饮用、杯中液体状态、放回；床休息完整闭环。
- 地点切换加入短暂镜头/场景演出，不只是瞬间换场景。

通过标准：不依赖 UI 文案，观察动作也能读出角色做了什么。输入不会留下动作僵死或跨场所回调。

## Phase 2 — 装饰自己的家（V0.3 基础已实现；V0.5 继续深化）

### V0.3：简单布置（代码已实现，浏览器验收待完成）

- [x] 家具预设：绿植、软凳、落地灯；光标预览和红绿摆放提示
- [x] 90° 旋转、撤销上一次放置、退出摆放模式
- [x] 避免与现有家具/玩家重叠并检查关键互动入口的寻路连通
- [x] 存档 v2 + v1 数据兼容，刷新后恢复玩家经济/心情/地点与家具
- [ ] 在桌面和移动端实机验证交互、家具布局可用空间与可达性
- [x] 房间物品可选中并直接移动/旋转/收起/多步撤销与重做（V0.4；桌面 Playwright 浏览器回归通过，2026-10-30）

### V0.5：最小工作—购买—布置闭环

- [x] 不增加地点：公园小型付酬整理活动，使用原有动作 cue 和 Effect.coins（V0.5）
- [x] 小屋现有三类家具定价、购买与可用库存，未购买不能免费创建（V0.5）
- [x] 收起和撤销/重做改变已摆放数量；已拥有总量与金币不因编辑被重复增减（V0.5）
- [x] v3 存档兼容 v1/v2；旧家具视为已拥有，保存金币、家具位置和库存（V0.5）
- [ ] 真正的工作任务玩法与节奏平衡（当前只是重复的短时整理活动，不是办公室系统）
- [ ] 实机手机触控/视觉/手感人工验收

通过标准：换家具并刷新后，摆放保持；人物仍能去喝茶、睡觉，导航不穿模。

### V0.4 浏览器验证记录

- [x] 家具点击选择→移动→旋转→撤销→重做→刷新保存，Playwright Chromium 测试通过（GitHub Actions run `41011398193`）。
- [x] 视觉截图包含公园、小屋、布置完成的房间，可在 Actions artifact 中对照。
- [ ] 真实手机触控与操作手感人工验收；浏览器自动化不等于美术完成。

### V0.5 GitHub 回归记录（2026-10-30）

- [x] GitHub Actions TypeScript/Vite 构建成功：[run 41022045056](https://github.com/guopanqi/autumn-moments/actions/runs/41022045056)。
- [x] Playwright Chromium 四项浏览器测试通过：[run 41022045104](https://github.com/guopanqi/autumn-moments/actions/runs/41022045104)。涵盖公园到家、既有家具编辑、工作中断不发薪、完成工作获得 12 金币、购买落地灯并摆放、刷新后库存/金币/家具状态一致、移除/撤销/重做与 v2 旧档迁移。
- [x] GitHub Pages 自动发布成功：[run 41022045053](https://github.com/guopanqi/autumn-moments/actions/runs/41022045053)。
- [x] CI artifact 包含公园、室内、编辑家具与购买落地灯后室内截图；截图已用于确认场景实际渲染，但**不是**美术验收。
- [ ] 真实手机触控（选择、购买、拖动、移动与视角）和游戏手感由用户本人检验；不得因为 Playwright Chromium 成功而勾选。
- [ ] 人工视觉验收：工作台与人物交互表现、家具布置 UI 的清晰度、尺寸较小时的遮挡。

V0.5 的“工作”只是一项公园内可重复的短动作，尚无工作日程、风险、策略或完整小游戏；这一范围限制是刻意的，不能将其描述为办公室工作玩法已经实现。

## Phase 3 — 牧场与动物（V0.6）

- 一只小狗：自主活动、关注玩家、互动、跟随和情绪反馈。
- 一种牧场动物：喂食、回应、等待、积累与简单收获。
- 引入低频生活模拟，后台时间变化不依赖渲染帧率。

通过标准：即使不点击，动物也呈现可以被观察的生活；照料带来可辨认的变化。

## Phase 4 — 办公室及地点专属玩法（V0.7）

- 等距视角下可精确控制角色移动，NPC 行动循环。
- 老板视锥、遮挡和可理解的侦测反馈；一场可重复游玩的“下班”小游戏。
- 工作与钱、精力、家居购买形成跨地点权衡。
- 通过玩法模式接口注册，不污染原有生活互动。

通过标准：玩家能够解释自己的策略，不只是被随机视锥抓住；所得工资在家有用途。

## Phase 5 — 生活世界连贯性（V0.8–1.0）

- 时间段、天气、角色关系、轻事件；有节制的游戏循环。
- 故事/对话表达与情绪节奏，不只加任务数量。
- 资产优化、场景流送、性能监控、触摸控制完整化。
- 新增地点无需修改全局行为接口；有配套测试与资源登记。

通过标准：玩家在不同地点度过的一天，可以被讲成一段短小的生活故事；扩充地点而不失去审美一致性。

## 每阶段的质量门槛

- **美术**：固定截图对比，关注角色比例、材质、光照、构图和动作完整性。
- **玩法**：记录玩家到底重复做什么、为什么做、做完如何变化；只有内容新增不算成功。
- **技术**：类型检查/构建通过、控制无卡死、刷新保留承诺的数据、不出现额外本地工具依赖。
- **范围**：每阶段只新增一个关键体验变量，避免全面重写。


## Spatial exploration & motion pass / 2026-10-30
- [x] Diagnosed short-grid waypoint yaw corrections; direct segment bypass, safe string-pull routes and damped heading.
- [x] Separate Shift (mobile run button) and ground double-click run; gait cadence, body lean and outdoor camera FOV respond to locomotion.
- [x] Expand the **same outdoor Location** from ~21×16 units of navigable bounds to 70×64 units. Keep the original park/home/earn-and-shop flow in place; add three connected walks, residential edges, flower garden and a pond without creating a new gameplay location.
- [x] Distant ridges, warm long sightlines, grouped tree silhouettes and instanced meadow details; no source or assets copied from Summer Afternoon.
- [ ] Verify outdoors on actual desktop and phone: navigation, run cadence, camera height, path visual rhythm, real-device FPS, and whether edges feel too empty.
- [ ] More advanced animation and level-of-detail / occlusion remain optional pending performance measurements.


### Browser low-FPS follow-up
- [x] Investigated slow expanded-neighborhood Chromium screenshot playback. Reduced repeat tree draw calls through instancing and corrected render-time step loss via substepped simulation; retaining performance profiling as an explicit follow-up.
- [ ] Profile real devices (FPS, draw calls, GPU memory, scene loading) and tune sky/landscape materials using screenshot review; low-FPS headless SwiftShader is not a substitute for hardware benchmarking.


## V0.6a — 公园里的一只有自己生活的小狗（2026-10-30）

- [x] 原有公园小狗不再固定：自行决定短距离散步、嗅闻、坐下与观察，中央草地有安全活动范围，不新增地点或导航框架。
- [x] 接近玩家时能注视；互动 2 次以上后会主动向附近玩家靠近，达到 4 次时靠近速度更积极。
- [x] 点击移动中的小狗会暂时固定其位置，交互锚点跟随位置更新；动作关键时刻才增加亲密度，取消前不会提前记账。
- [x] `autumn-moments:v3` 保留现有金币/心情/家具字段，新增可选 `dogBond:0..5`，旧档默认 0；没有新存档键或重型宠物系统。
- [ ] 用户在真实桌面/手机验收：是否能看出不同活动、靠近与抚摸是否自然，路径与镜头是否有冲突。
- [ ] 更复杂的动物、牧场、新地点以及长期背景模拟不属于此切片。

设计验证问题：不发放金币、不额外放置任务，玩家是否愿意停下来观察小狗？不能把程序状态存在视为已经验证情绪价值。


### V0.6a 自动化图像证据注意
最初的公园基准截图捕获了正在淡出的加载页（`#loading.hidden` 并不意味着完全不可见），不能当作公园视觉验收。现已在截图前等待 `#loading` 真正隐藏，并在小狗关系互动后记录单独截图。截图只保证取样时刻的场景出现，**真实动物动作流畅度和主观趣味仍由用户实机判断**。

### V0.6a GitHub 验证证据（2026-10-30）
- [x] 动作/关系测试和 V0.5 既有功能共 8 项 Playwright Chromium 回归通过：[run 41035510315](https://github.com/guopanqi/autumn-moments/actions/runs/41035510315)。包括主动活动边界、熟悉后的迎接、抚摸中断不加亲密度及刷新恢复。
- [x] 修正移动目标的命中区域和鼠标悬停/点击瞬间的容错，并在取截图前等待加载遮罩真正隐藏。
- [x] 该版本改动的构建和 Pages 发布已通过（最新工作流状态以后续提交为准）。
- [ ] 玩家实际试玩：小狗在没有命令时是否真的值得观察，奔跑与迎接是否有滑步，以及手机上是否能轻松点击。


## V0.6b — 小狗捡球的连续空间互动（2026-10-30）
- [x] 公园原地点加入一个小型玩具架，可点击「把球抛给小狗」；靠近、抛球姿势与真正的起飞时刻分开。
- [x] 小狗观察飞球→跑到球边→叼回玩家附近→把球归位；球在飞行、口中和架上只有一个可见状态。不增加金币、亲密度或任务奖励。
- [x] 正常互动中断与移动途中取消都能清理临时目标冻结，不再依靠 15 秒超时；抚摸可以中断捡球并使玩具恢复。
- [ ] 用户实机判断：球和小狗的移动节奏是否自然、大小是否可读、有无碰撞穿插、动作是否真的有情绪价值。
- [ ] 本阶段没有新地点、背包/道具系统、全局 AI 或复杂小游戏。

- [x] Visual screenshot follow-up: replaced the oversized ball sign with an unobtrusive rack and transparent touch target; added a regression asserting that a pet request restores the toy even during a fetch.

- [x] Corrected the expanded-neighborhood browser regression to evaluate 60 fixed movement steps instead of elapsed wall-clock seconds; GitHub SwiftShader frame pacing is not a valid measure of navigation or production FPS. Actual device performance remains open.

## V0.6c — 牧场照料最小可玩切片（已合入，待 GitHub 验收）
- [x] 增加第三个 Location：牧场与奶牛，连通公园和小屋。
- [x] 采草 → 喂牛 → 等待 → 牛奶一次性收取 (+8 金币)；无需新背包/任务系统。
- [x] v3 可选 farmCare 字段兼容旧存档，取消动作不变更状态。
- [ ] GitHub CI、Playwright 与 Pages 验证结果待确认；构建通过不等于人工视觉验收。
- [ ] 人工体验：空间大小、牛的反馈、触控可达性、是否值得重复、跨地点动机。
