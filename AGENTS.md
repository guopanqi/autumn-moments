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
