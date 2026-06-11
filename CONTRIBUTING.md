# Contributing

PRs welcome — bug fixes, model improvements, frontend polish, data corrections.

## Setup

```sh
# simulator (Rust, no runtime deps)
cargo test                 # unit + integration tests
cargo test --release       # required: the calibration test runs 1M matches per Elo diff
cargo clippy --all-targets -- -D warnings
cargo fmt --check
cargo run --release -- -n 100000

# frontend (web/, Next.js)
cd web
npm ci
npm run dev                # local dev server
npm run lint && npm run build
```

All of the above must pass — CI runs exactly these.

## Non-negotiables

- **FIFA fidelity.** Tournament rules follow the [official FWC 2026 Regulations](https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf) exactly: Art. 13 tiebreakers (head-to-head first, no drawing of lots), the verbatim Annexe C third-place allocation table, the Art. 12 bracket. If you think the rules engine is wrong, cite the article.
- **Reproducibility.** Same seed → byte-identical output regardless of thread count. Don't introduce `DefaultHasher`, `rand_distr`, platform-dependent floats, or any other source of nondeterminism into the simulation path.
- **Performance.** 100k tournaments must finish in under a second. No heap allocation in the simulation hot loop; teams are `u8` indices into fixed arrays.
- **Model changes** (constants in `src/engine.rs`, new effects) need justification — a comparison against market odds, published models, or historical data, not vibes. Note that changing the model invalidates `data/snapshots/baseline.json` comparability.

## Practical notes

- Match results live in `data/results.json`; pushes to it trigger the simulate workflow, which commits fresh snapshots and redeploys the site. Don't edit `data/snapshots/` by hand.
- `data/snapshots/baseline.json` is the frozen pre-tournament run — never regenerate it in a PR.
- Commit `web/package-lock.json` with any dependency change; CI runs `npm ci` on Node 26.
- Keep PRs focused. Open an issue first for anything bigger than a fix.

## License

MIT — by contributing you agree your contributions are licensed under it.
