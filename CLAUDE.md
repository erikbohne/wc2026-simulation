# wc2026-simulation

Monte Carlo simulator for the FIFA World Cup 2026. Rust, single static binary, zero runtime deps. Simulates the full 104-match tournament N times (default 100k) using Elo ratings + Poisson goal model, outputs per-team advancement probabilities.

## Commands

- `cargo test` — unit + integration tests
- `cargo test --release` — required for calibration test (1M matches per Elo diff)
- `cargo clippy --all-targets` and `cargo fmt --check` — must be clean
- `cargo run --release -- -n 100000` — main run; must finish < 1s
- `cargo run --release -- --single -s 42` — one full tournament, match-by-match

## Architecture

Lib + thin bin. Teams are `u8` indices 0..48 into fixed arrays everywhere; no heap allocation in the simulation hot loop.

- `src/data.rs` — `Team`, embedded `data/teams.json` (include_str!), validation
- `src/engine.rs` — Elo expectancy, hand-rolled Knuth Poisson sampler, match simulation, dynamic Elo (K=60)
- `src/group.rs` — round robin, standings, official FIFA Art. 13 tiebreakers
- `src/third_place.rs` — third-place ranking + official Annexe C allocation table (495 rows, keyed by u16 group bitmask)
- `src/bracket.rs` — const bracket tables for matches 73–104
- `src/tournament.rs` — `simulate_one(seed)`, Recorder trait (Null for MC, Full for --single)
- `src/stats.rs` — integer counter aggregation, Report, output formats

## Hard rules

- **FIFA fidelity is non-negotiable**: tiebreakers follow the official Regulations Art. 13 (head-to-head FIRST among tied teams, then overall GD/GF, then FIFA ranking — NO drawing of lots; the user's original spec §2.2 order is outdated). Third-place→R32 allocation uses FIFA's official Annexe C table verbatim, not a matching heuristic. Bracket pairings per Art. 12.6–12.9. Source PDF: https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf
- **Reproducibility**: same seed → byte-identical output regardless of thread count. Per-run RNG = Xoshiro256PlusPlus seeded via hand-written SplitMix64 mix of (master_seed, run_index). Never use DefaultHasher (unstable across Rust releases) or rand_distr::Poisson (algorithm may change between versions) in the simulation path.
- Stats merge via integer counters only (commutative/associative); probabilities computed once at the end.
- Knockout ET: clamp the 90' λ to [0.15, 5.0] first, then divide by 3 (ET λ may go below 0.15).
- Conduct-score tiebreaker (cards) is not modeled — it always ties and falls through to FIFA ranking. Documented limitation.

## Data

`data/teams.json`: 48 teams, ISO 3166-1 alpha-3 codes, `host: true` only for USA/MEX/CAN, `fifa_rank` = FIFA World Ranking position (final tiebreaker). Elo from eloratings.net — must be refreshed before any release.
