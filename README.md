# wc2026-sim

Monte Carlo simulator for the FIFA World Cup 2026. Runs the full 104-match tournament 100,000 times in well under a second and reports per-team advancement probabilities using Elo ratings + Poisson goals.

Example (100k sims, seed 2026):

```
Rank  Team                 Group    Win%  Final%    SF%    QF%   R16%   R32%
1     Spain                H       27.8%   41.7%  57.5%  68.1%  84.8%  99.9%
2     Argentina            J       16.5%   29.1%  43.7%  62.5%  74.4%  99.2%
3     France               I       10.6%   19.2%  37.2%  55.0%  78.1%  97.2%
...
48    Curaçao              E        0.0%    0.0%   0.0%   0.3%   2.4%  17.7%
```

## Install

```sh
cargo build --release     # binary at target/release/wc2026-sim
cargo install --path .
```

Requires Rust 1.85+.

## Usage

```sh
wc2026-sim                     # default: 100k sims, probability table
wc2026-sim -n 1000000 -s 42    # more runs, fixed seed (reproducible)
wc2026-sim --single -s 42      # one tournament, match-by-match results
wc2026-sim --team NOR          # detailed report for one team
wc2026-sim -o json             # machine-readable (also: csv)
wc2026-sim --pens elo          # Elo-weighted shootouts instead of coin flip
wc2026-sim --dynamic-elo false # freeze ratings within each tournament
```

Same seed → byte-identical output regardless of thread count. Run `wc2026-sim --help` for all flags.

## How it works

- Every match samples goal counts from Poisson distributions scaled by the Elo difference (`λ = 1.2 · 10^(±d/1000)`), calibrated so outcomes track Elo win expectancy within ±3pp. Hosts (USA/MEX/CAN) receive +100 Elo.
- Knockouts: 90 minutes → extra time (λ/3) → penalty shootout.
- Dynamic Elo (default on): ratings update during each simulated tournament using the eloratings.net formula (K=60) and are reset between runs.
- Tournament rules follow the official FIFA World Cup 26 Regulations exactly: Article 13 group tiebreakers (head-to-head first among tied teams, then GD/GF, FIFA ranking last — no lots), the verbatim Annexe C allocation table for all 495 third-place combinations, and the Art. 12 bracket (matches 73–104).

Source: https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf

## Data

`data/teams.json` (embedded at compile time): Elo from [eloratings.net](https://www.eloratings.net), FIFA World Ranking positions as of 1 Apr 2026 as the final tiebreaker. Refresh Elo before release builds.

## Limitations

Team strength is modeled as a single number. No players, injuries, current form, or venue effects. The fair-play (cards) tiebreaker is not simulated; it always falls through to FIFA ranking.

## Developing

```sh
cargo test                 # unit + integration tests
cargo test --release       # required for calibration test (1M matches per Elo diff)
cargo clippy --all-targets && cargo fmt --check
cargo run --release -- -n 100000
cargo run --release -- --single -s 42
```

## License

MIT
