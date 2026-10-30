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
