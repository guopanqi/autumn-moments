# Instructions for code agents

This project is Autumn Moments, a browser-first Three.js life-world. Read `docs/VISION.md`, `docs/ART_DIRECTION.md`, `docs/ARCHITECTURE.md`, and `docs/ROADMAP.md` before major changes.

1. Do not reference or copy from the owner's other GitHub repositories. Use publicly licensed upstream code only when documented.
2. Do not require local Blender or desktop programs for V0.1–V0.4. Keep everything editable, buildable and verifiable through GitHub Codespaces and Actions.
3. Preserve one consistent soft anime diorama visual language. Tune values in `src/art/style.ts` rather than hardcoding competing palettes.
4. A new place implements the `Location` contract; gameplay remains place-specific; shared actions and state are the only intentional global abstractions.
5. Separate interaction arrival, animation timing, state change, and UI feedback as the behavior becomes richer.
6. Add only the smallest abstraction that two real use cases justify. Do not add an ECS, renderer framework, or extensive editor speculatively.
7. Run `npm run build` and test in the browser. Distinguish passing CI from actual visual verification.
8. Maintain documentation, assets license register, and explicit remaining gaps as features evolve.
9. Never claim a GitHub Pages site is live without verifying its deployment URL or a successful Pages run.


## V0.2 interaction invariants

- Do not apply mood/coins when a scene object is first clicked; only apply them at the action cue.
- Any action cancellation must release temporary presentation state (cup visibility, etc.) through the same cleanup callback as normal finish.
- New interactive objects should implement the existing `Interaction` contract; do not introduce action-specific branches in `World`.
- Animal ambient update must remain separate from input handling; player input can cause a temporary reaction, not the entire idle motion.
- Until real browser screenshots are reviewed, describe V0.2 as implemented and build-checked, not visually accepted.

## V0.3 furniture invariants

- Persist furniture as prefab IDs and transforms, never Three.js meshes or scene hierarchy positions.
- Placement must not overlap static furniture or the player and should leave core interaction approaches reachable.
- Undo removes both visual geometry and the navigation obstacle, then persists the updated record.
- Keep the furniture editor room-specific; do not turn every location into the same editor.
- Keep save v1 migration functioning and treat save JSON as untrusted input.

## V0.4 furniture editing invariants

- Editing must retain stable furniture IDs and must not duplicate/remount an item until commit.
- The original item remains in data/nav until confirmation, but preview validation ignores its own obstacle.
- Cancel an uncommitted move before leaving the room; restore the original group and navigation obstacle.
- All placement, moving, rotation, removal, undo, redo paths must persist the latest placement snapshot. Undo/redo history is session-only.
- New UI controls must not intercept ordinary click-to-walk outside of the decoration panel.

## V0.5 economic invariants
- Wages use the existing action moment cue; cancellation before cue never grants money.
- Purchase subtracts the fixed price exactly once and increments owned count; placement is free but requires unplaced owned stock.
- Derived stock = owned - number of placed furniture of that kind; edit/undo/redo never changes owned count or spends/refunds coins.
- Existing v1/v2 placed furniture migrates to owned status; preserve coins and mood. Keep v3 saves consistent on reload.
- Browser tests cover the actual earn-buy-place flow; CI/browser tests do not replace mobile touch or visual approval.


## Summer Afternoon reference / park expansion
- Summer Afternoon source is explicitly **not open source**. Do not copy its JS, shaders, models or textures. Only independently implement observable mood and interaction principles.
- Keep the original park/home anchor, work reward and save inventory semantics stable while expanding the same outdoor location.
- Avoid per-grass Mesh objects: instanced decorative details and clear collision boundaries. New navigation edges must be tested.
- Watch for heading oscillation; do not regress to grid-cell-by-grid-cell yaw. Human evaluation of running and scene richness remains necessary after CI.


## V0.6a dog interaction
- The dog must visibly act without commands, but stay bounded in the existing central park and out of fixed interactions; avoid generic behavior-tree code.
- A moving dog's approach anchor is refreshed each tick; `onTargeted` must freeze the target before computing a path. A canceled interaction cannot grant affection before its cue.
- `dogBond` is an optional backward-compatible v3 field, normalized to 0–5; never break coins, mood or furniture saves.
- The existing pet gesture and callback should remain the only affection award path; visual/mobile acceptance is still manual.


## V0.6b approach lifecycle and fetch invariants
- Targeted interactions can reserve moving actors before arrival. Cancelling movement MUST release that reservation; do not wait for timed expiry.
- The fetch ball must be visible either at its rack, in flight, or in the dog's mouth, and be reset after completion/cancel. The action cue initiates the toss; early cancellation must not initiate fetch.
- No currency, inventory or bond reward from fetching. This slice validates a visible sequence and human-directed animal behavior, not a new task engine.
- Preserve V0.5 money/furniture and V0.6a bond/save schema; re-run Chromium test suite and Pages deployment.

## V0.6c farm slice
- Keep farm care local to a single Location: one hay bundle, one cow, one cooldown and one milk collection.
- Award milk coins only at the existing Character action cue; cancellations cannot grant hay, feed or milk.
- Store only optional normalized farmCare in v3. Retain all existing coins, mood, furniture and dogBond fields.
- Farm time progresses only while farm is active. Do not imply background/offline simulation.
- Preserve the farm state and save contract in subsequent location-specific extensions.
