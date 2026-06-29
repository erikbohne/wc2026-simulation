//! WebAssembly entry point for the live in-browser scenario tree.
//!
//! `scenario_tree` runs one batch of full tournament simulations from a set of
//! already-played results and buckets each run by the focus team's next two
//! (still-unplayed) group matches — reproducing the design's tree, but with the
//! real engine (FIFA tiebreakers, third-place allocation, dynamic Elo).

use serde::Serialize;
use wasm_bindgen::prelude::*;
use wc2026_simulation::data::{group_index, TeamId, Teams};
use wc2026_simulation::engine::MatchOutcome;
use wc2026_simulation::group::{GroupResult, GROUP_SCHEDULE};
use wc2026_simulation::results::FixedResults;
use wc2026_simulation::tournament::{run_seed, simulate_one_from, Config, Recorder, SimData};

/// Captures the focus team's result in each of its (up to three) *unplayed*
/// group matches, in schedule order, during a single simulated tournament.
struct TreeRec {
    focus: TeamId,
    focus_group: u8,
    seen: u8,        // how many matches of focus_group have been played so far
    sis: [i8; 3],    // schedule indices of the focus team's upcoming games
    res: [i8; 3],    // 0=Win 1=Draw 2=Lose from focus POV (-1 unset)
}

impl Recorder for TreeRec {
    fn group_match(&mut self, group: u8, a: TeamId, b: TeamId, ga: u8, gb: u8) {
        if group != self.focus_group {
            return;
        }
        let si = self.seen as i8;
        self.seen += 1;
        let r = if a == self.focus {
            outcome(ga, gb)
        } else if b == self.focus {
            outcome(gb, ga)
        } else {
            return; // a focus-group match not involving the focus team
        };
        for k in 0..3 {
            if si == self.sis[k] {
                self.res[k] = r;
            }
        }
    }
    fn group_done(&mut self, _g: u8, _m: &[TeamId; 4], _r: &GroupResult) {}
    fn ko_match(&mut self, _n: u8, _a: TeamId, _b: TeamId, _o: MatchOutcome) {}
}

#[inline]
fn outcome(gf: u8, ga: u8) -> i8 {
    if gf > ga {
        0
    } else if gf < ga {
        2
    } else {
        1
    }
}

/// One node in the scenario tree. `code` is the result path from NOW, e.g.
/// "W" (after game 1), "WD" (game 1 win, game 2 draw), "WDL" (… game 3 loss).
/// `level` = code length; the empty path is the NOW node (returned separately).
#[derive(Serialize)]
struct Node {
    code: String,
    level: u8,
    n: u32,   // sims passing through this node
    pct: f64, // advancement % conditional on this path
}

#[derive(Serialize)]
struct Tree {
    focus: String,
    group: String,
    now_pct: f64,
    depth: u8, // number of upcoming focus games shown (0..3)
    nodes: Vec<Node>,
    sims: u32,
}

#[derive(serde::Deserialize)]
struct Req {
    focus: String,
    #[serde(default)]
    results: Option<serde_json::Value>,
    #[serde(default = "default_sims")]
    sims: u32,
    #[serde(default = "default_seed")]
    seed: u64,
}

fn default_sims() -> u32 {
    20_000
}
fn default_seed() -> u64 {
    2026
}

#[wasm_bindgen]
pub fn scenario_tree(req_json: &str) -> Result<String, JsError> {
    let req: Req =
        serde_json::from_str(req_json).map_err(|e| JsError::new(&format!("bad request: {e}")))?;
    let teams = Teams::load();
    let data = SimData::new(&teams);
    let cfg = Config::default();

    let focus = teams
        .index_of(&req.focus)
        .ok_or_else(|| JsError::new(&format!("unknown team {}", req.focus)))?;
    let group_letter = teams.teams[focus as usize].group;
    let g = group_index(group_letter);

    // Build FixedResults from the supplied results.json-shaped payload.
    let fixed = match &req.results {
        Some(v) => {
            let s = v.to_string();
            FixedResults::parse(&s, &teams)
                .map_err(|e| JsError::new(&e))?
                .0
        }
        None => wc2026_simulation::results::EMPTY,
    };

    // Focus team's local slot within its group, then its schedule indices.
    let slot = teams.groups[g]
        .iter()
        .position(|&t| t == focus)
        .ok_or_else(|| JsError::new("focus not in its group"))? as u8;
    let mut upcoming: Vec<usize> = Vec::new();
    for (si, &(ia, ib)) in GROUP_SCHEDULE.iter().enumerate() {
        if (ia == slot || ib == slot) && fixed.group[g][si].is_none() {
            upcoming.push(si);
        }
    }
    let depth = upcoming.len().min(3) as u8;
    let mut sis = [-1i8; 3];
    for (k, &si) in upcoming.iter().take(3).enumerate() {
        sis[k] = si as i8;
    }

    let sims = req.sims.max(1);
    // Per-level aggregation: counts and advancement, indexed by the base-3
    // encoding of the result path (level 1: 3, level 2: 9, level 3: 27).
    let mut cnt = [[0u32; 27]; 3];
    let mut adv = [[0u32; 27]; 3];
    let mut tot = 0u32;

    for s in 0..sims {
        let mut rec = TreeRec {
            focus,
            focus_group: g as u8,
            seen: 0,
            sis,
            res: [-1; 3],
        };
        let r = simulate_one_from(&data, &cfg, &fixed, run_seed(req.seed, s as u64), &mut rec);
        let a = (r.stage[focus as usize] > 0) as u32;
        tot += a;
        let mut idx = 0usize;
        for level in 0..depth as usize {
            let ri = rec.res[level];
            if ri < 0 {
                break;
            }
            idx = idx * 3 + ri as usize;
            cnt[level][idx] += 1;
            adv[level][idx] += a;
        }
    }

    let res = ['W', 'D', 'L'];
    let mut nodes = Vec::new();
    for level in 0..depth as usize {
        let span = 3usize.pow(level as u32 + 1);
        for idx in 0..span {
            let n = cnt[level][idx];
            if n == 0 {
                continue;
            }
            // decode idx -> result path string of length level+1
            let mut code = vec![' '; level + 1];
            let mut x = idx;
            for c in code.iter_mut().rev() {
                *c = res[x % 3];
                x /= 3;
            }
            nodes.push(Node {
                code: code.into_iter().collect(),
                level: level as u8 + 1,
                n,
                pct: 100.0 * adv[level][idx] as f64 / n as f64,
            });
        }
    }

    let tree = Tree {
        focus: req.focus,
        group: group_letter.to_string(),
        now_pct: 100.0 * tot as f64 / sims as f64,
        depth,
        nodes,
        sims,
    };
    serde_json::to_string(&tree).map_err(|e| JsError::new(&e.to_string()))
}
