# Art Direction：Soft Anime Diorama

## 本阶段视觉目标

不是写实，不是纯 Low Poly，也不是黑色描边的传统 Cel Shading。目标是 **soft, handcrafted, playable 3D diorama**：高位斜视、温柔的色调、饱满的轮廓、清楚的空间关系，整体像一座会活动的微缩生活世界。

用户提供的参考画面呈现：柔和的草地/沙地、Q 版角色、明亮无压迫的天空、简单但有辨识度的公园设施、柔软的阴影和良好的纵深可读性。

## 视觉支柱

1. **形体优于多边形数量**：人物头身比约 1:2.3–2.8；造型轮廓要能从远镜头读懂。道具适度夸张，茶杯/门把/长椅比例按可辨识性调整。
2. **受控的色彩**：低对比偏暖中间色，少量珊瑚色、雾蓝、青绿色作为醒目点；避免所有物体同时高饱和。
3. **软而有方向的光**：统一暖主光 + 冷天光 + 可信接触暗部，少量 AO，避免泛白 Bloom；整体曝光通过单一参数调节。
4. **材质一致性**：哑光、少金属，不同地点不突然更换 PBR 语言。地表适当分层/轻微贴图细节，不能像纯无阴影色块。
5. **镜头负责空间叙事**：户外偏跟随的透视相机；室内等距正交展示完整布局。过渡时先维护空间方向，再追求电影感。
6. **动画优先级**：人物步态、停下/转身、眼神、动物回应、拿起-喝下-放回，比高级 Shader 更直接地决定生命感。

## 可调参数与首版实现

| 层 | V0.1 实现 | 后续目标 |
|---|---|---|
| 几何 | Three.js 基础几何生成角色、树、道具 | glTF 美术替换，统一体素感/平滑度 |
| 材质 | `MeshStandardMaterial`, 哑光、无贴图 | 少量手绘渐变、细节贴图、定向明暗 |
| 光 | Hemisphere + Directional + PCF soft shadows | 风格化 AO、接触阴影、分地点调色 |
| 地面 | 叠层圆形小路、木板、散布装饰 | 建筑尺度规范、程序化路网、地表混合 |
| 角色 | 模块化头身、眼睛、肢体摆动 | 骨骼动画、眼神、转身预备、互动配套动作 |
| 反馈 | 提示文案、简单手势、音符 | 粒子、表情、停顿、状态与道具联动 |

集中调节 `src/art/style.ts`。不要在每个地点复制完全不同的光照和角色材质。场景特有参数保留空间。

## 动画动作规范（未来资产协议）

- `idle`: 呼吸、微小视线变化，每 3–6 秒一组变体；不要有机械同步感。
- `walk`: 起步、循环、停步的连贯序列；角色朝目标转向后再迈步。
- `interact/tea`: 抬手/拿杯 → 等一拍 → 饮用 → 放回；杯子状态需要与动作同步。
- `interact/bed`: 走到床侧 → 坐下 → 躺下 → 休息/起身；需要明确锚点。
- `pet`: 蹲下/伸手 → 动物看过来 → 接触 → 反馈。
- `animal/idle`: 东张西望、走动、趴下、摆尾，动作不应完全由玩家点击触发。

V0.1 的动作是临时姿态。不得把临时动画视为“已达到最终演出目标”。

## 下一轮视觉验收

1. 固定三个测试截图：公园全景、公园角色近景、室内等距图；每次渲染改动对照。
2. 在桌面 1280×800 和手机 390×844 上检查可读性。
3. 角色在公园必须在 1 秒内能被识别；茶杯、出入口和可互动对象不需要反复猜测。
4. 画面构图要留空间，绝不为了填满画面加入无意义的道具。
5. 低端设备首次加载不依赖大型外部资源；后续性能预算优先避免多光源投影和过多 draw calls。

## 美术替换与资产边界

代码只引用语义资产 ID（`character/default`, `furniture/tea_table` 等），后续使用 GLB 替换同 ID 下的可视 Mesh；碰撞、互动锚点与表现对象分离。资源可以先在 GitHub 内上传许可合规的 glTF；Blender 在后期作为制作工具加入，不应改变运行时接口。

**注意**：V0.1 的“好看”要靠实际截图验证。当前只是一套有审美取向的候选参数，不是经过玩家和美术评审的终稿。


## Summer Afternoon reference study / 2026-10-30
- Research source: https://summer-afternoon.vlucendo.com/ and https://discourse.threejs.org/t/summer-afternoon/46963 . Original author explicitly states his project source is **not open source and not reusable**; our work recreates only independently observed visual principles.
- Separate approachable foreground landmarks from far-reaching road silhouettes; lower outdoor camera retains a readable 3/4 character, higher ceiling of sky, trees and distant architecture.
- Prioritize turning coherence, running cadence, grounded feet and a slightly widening running FOV over expensive bloom/shader stacks; retain existing warm diorama color language.
- Desktop and mobile comparison must evaluate actual perspective, navigation, perceived depth, and animation. Automated screenshots are review artifacts, not visual acceptance.
