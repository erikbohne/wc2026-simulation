# wc2026-sim

Monte Carlo simulator for the FIFA World Cup 2026. Simulates the full 104-match tournament 100,000 times in under a second and reports per-team advancement probabilities, driven by Elo ratings and a Poisson goal model.

```
$ wc2026-sim
Rank  Team                 Group    Win%  Final%    SF%    QF%   R16%   R32%
1     Spain                H       27.9%   41.7%  57.4%  68.4%  85.0%  99.9%
2     Argentina            J       16.4%   29.2%  43.8%  62.7%  74.4%  99.2%
3     France               I       11.1%   20.2%  39.2%  56.7%  80.4%  97.7%
...
48    Haiti                C        0.0%    0.0%   0.0%   0.1%   0.6%   6.0%
```

## Install

```
cargo build --release        # binary at target/release/wc2026-sim
```

## Usage

```
wc2026-sim                          # 100k tournaments, probability table
wc2026-sim -n 1000000 -s 42         # more runs, fixed seed (reproducible)
wc2026-sim --single -s 42           # one tournament, match-by-match results
wc2026-sim --team NOR               # detailed report for one team
wc2026-sim -o json                  # machine-readable output (also: csv)
wc2026-sim --pens elo               # Elo-weighted shootouts instead of coin flip
wc2026-sim --dynamic-elo false      # freeze ratings within each tournament
```

Same seed → byte-identical output, regardless of thread count.

## How it works

- Every match samples actual goal counts per team from Poisson distributions scaled by the Elo difference (`λ = 1.2 · 10^(±d/1000)`), calibrated so match outcomes track the Elo win expectancy within ±3pp. Hosts (USA/MEX/CAN) get +100 Elo.
- Knockouts: 90 minutes → extra time at λ/3 → penalty shootout.
- Dynamic Elo (default on): ratings update during each simulated tournament (eloratings.net formula, K=60), reset between runs.
- Tournament rules follow the official [FIFA World Cup 26 Regulations](https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf) exactly: Article 13 group tiebreakers (head-to-head first, FIFA ranking last — no lots in 2026), the official Annexe C table for all 495 third-place allocation combinations, and the Art. 12 bracket for matches 73–104.

## Data

`data/teams.json` (embedded at compile time): Elo from [eloratings.net](https://www.eloratings.net), FIFA ranking of 1 Apr 2026 as the final tiebreaker. Refresh Elo before release-day builds.

## Limitations

Team strength is one number — no players, injuries, or venues. The fair-play tiebreaker isn't modeled (cards aren't simulated); it falls through to FIFA ranking.

## License

MIT
