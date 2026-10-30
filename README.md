# Autumn Moments · 秋日片刻

一个关于**住在世界里**的 Three.js 小型生活游戏。玩家可以在不同的生活地点之间往返，走路、休息、与物体和动物互动，并逐渐拥有自己的空间。

**当前状态：V0.2 生活动作与动物行为原型**。目标不是一次性建成生活模拟器，而是先证明：柔和的 3D 美术 + 可爱的人物动作 + 可漫步的空间 + 真实的生活互动，可以形成令人愿意停留的体验。

> 技术原则：第一阶段全部使用 GitHub + Codespaces + Actions + Pages；不需要本地安装 Blender、Node.js 或任何编辑器。之后允许在收益明确时引入 Blender 和专业 3D 资产。

## 直接体验

- [在线地址（配置 Pages 后生效）](https://guopanqi.github.io/autumn-moments/)
- [GitHub Actions](https://github.com/guopanqi/autumn-moments/actions)
- [打开 Codespaces](https://github.com/codespaces/new?hide_repo_select=true&repo=1439203591)

## V0.1 基础与 V0.2 新增

- 程序化生成的公园、小屋、树木、家具和 Q 版人物（不依赖外部模型）
- 公园跟随透视镜头，小屋等距正交镜头；进出地点切换
- WASD / 方向键、点地行走；小规模网格 A* 避障
- 点击小狗、长椅、茶杯、床进行靠近与互动
- V0.2：人物行动包含走近、面向物体、预备动作、反馈时机和收尾；可通过移动取消且不会提前领取奖励
- V0.2：茶杯在饮用时从桌上移到人物手中，结束或中断后恢复；小狗平时自主环顾、摇尾，摸狗时跳起并出现短暂爱心
- V0.2：两处场所间的柔和淡入淡出过场、人物眨眼和动作缓入缓出
- 独立的交互定义、地点契约、镜头策略、全局艺术参数
- 心情、金币、虚拟时间和浏览器存档
- 移动端方向按钮、响应式 UI
- GitHub Actions 自动类型检查与构建、Pages 构建部署

本版仍使用程序化几何，不是最终骨骼模型。V0.2 的动作系统是可替换的表演适配层；**真人浏览器视觉/交互回归验收仍然必要**。尚未实现家具编辑、牧场或办公室潜行。

## 操作

| 操作 | 电脑 | 手机/平板 |
|---|---|---|
| 走路 | WASD 或方向键 | 左下方向按钮 |
| 指定目的地 | 点击地面 | 触摸地面 |
| 和物体互动 | 点击小狗、茶杯、床、路牌等 | 触摸物体 |
| 访问地点 | 在场景里使用地点出入口；右下角有测试快捷入口 | 同左 |
| 室内缩放 | 滚轮 | 首版未实现双指缩放 |

## GitHub-only 开发

1. 在仓库的 **Code → Codespaces → Create codespace on main** 打开云端工作空间。
2. `postCreateCommand` 自动执行 `npm install`；终端运行 `npm run dev`。
3. 在自动转发的 **5173** 端口打开浏览器预览；修改代码即可热更新。
4. 提交分支、开 Pull Request；CI 检查通过后合并到 `main`。
5. Pages 使用仓库 **Settings → Pages → Build and deployment → Source: GitHub Actions**。工作流见 `.github/workflows/pages.yml`。

如果没有 Codespaces，也可以直接在 GitHub 网页编辑源码；提交后由 Actions 自动构建。但 `github.dev` 本身不能运行 Vite 服务。

## 长期文档

| 文档 | 用途 |
|---|---|
| [VISION.md](docs/VISION.md) | 体验目标、玩法边界、场所设计原则 |
| [ART_DIRECTION.md](docs/ART_DIRECTION.md) | 视觉目标、美术规格、演出、动画、音效 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 运行时架构、交互协议、地点和状态规则 |
| [ROADMAP.md](docs/ROADMAP.md) | 阶段目标、验收标准、风险及不做什么 |
| [WORKFLOW.md](docs/WORKFLOW.md) | GitHub-only 日常流程、验证、部署、许可证 |
| [ACTIONS.md](docs/ACTIONS.md) | V0.2 动作协议、取消语义、互动验收 |
| [DECISIONS.md](docs/DECISIONS.md) | 架构决策与取舍记录 |

## Tech

Three.js + TypeScript + Vite；代码生成场景/道具；不需要后端。开发期优先保持简单：不是 ECS 框架，不是全场景物理模拟，也不是万能游戏编辑器。明确的需求出现后再增加 NavMesh、glTF、动画状态机、家具编辑与剧情系统。

## 授权

此仓库代码未来的公开授权方式待定。所有第三方素材须在 `docs/ASSET_SOURCES.md` 中登记来源、版本与许可，未核实许可不得直接拷入。当前 V0.2 无第三方美术资源。
