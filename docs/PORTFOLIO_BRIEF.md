# Portfolio Brief

Orbital Atlas is built to show production-minded frontend craft in a compact, inspectable project. The app combines a polished real-time WebGL scene with practical product details: responsive controls, accessible state, deterministic verification, and a static deployment path.

## What It Demonstrates

- Real-time 3D interface design with animated orbital motion, camera modes, focus states, hover feedback, and scene export.
- Procedural visual systems for planets, atmosphere, rings, asteroid fields, Kuiper belt elements, comets, solar wind, and starfield depth.
- Product-oriented UI work that keeps scientific context visible without overwhelming the primary scene.
- Responsive interaction support across pointer, keyboard, touch, desktop, and mobile layouts.
- Quality automation that checks the production build, confirms the WebGL canvas is not blank, exercises important controls, and captures review artifacts.

## Reviewer Notes

The most relevant implementation areas are:

- `src/main.js` for scene construction, generated textures, orbital state, camera behavior, UI state, and Playwright-facing test hooks.
- `src/data/solarSystem.js` for the portfolio-facing planet facts, camera presets, guide zones, and source links that feed the interface.
- `src/styles.css` for HUD composition, responsive behavior, reduced-motion handling, and touch layout.
- `scripts/public-audit.mjs` for the repository hygiene check covering required public files, ignored local output, and high-confidence secret patterns.
- `scripts/visual-check.mjs` for the browser-based smoke test covering rendering, focus transitions, toggles, scrubber behavior, and mobile overflow.
- `.github/workflows/ci.yml` for automated public-readiness auditing and production builds on pull requests and `main`.
- `.github/workflows/deploy-pages.yml` for GitHub Pages deployment after a successful `CI` run on `main`.

## Quality Bar

Before treating the repo as portfolio-ready, the expected check is:

```bash
npm run verify
```

That command should leave current desktop and mobile screenshots in `artifacts/` for visual review. The README screenshots are curated separately in `docs/screenshots/` so the public project page always has stable preview images.

For a faster release gate, `npm run public:audit` checks that the repo still has its README, license, security policy, CI/deploy workflows, ignore rules, public package metadata, and no high-confidence secret-like tokens in publishable source files.
