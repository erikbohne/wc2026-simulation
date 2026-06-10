use rayon::prelude::*;
use wc2026_simulation::data::Teams;
use wc2026_simulation::stats::Counters;
use wc2026_simulation::tournament::{Config, NullRecorder, SimData, run_seed, simulate_one};

#[test]
fn elo_favourites_dominate_and_goal_average_is_realistic() {
    let teams = Teams::load();
    let data = SimData::new(&teams);
    let cfg = Config::default();
    let n = 10_000u64;

    let counters = (0..n)
        .into_par_iter()
        .fold(Counters::zeroed, |mut c, i| {
            c.absorb(&simulate_one(
                &data,
                &cfg,
                run_seed(7, i),
                &mut NullRecorder,
            ));
            c
        })
        .reduce(Counters::zeroed, Counters::merge);

    let wins = |code: &str| {
        let t = teams.index_of(code).unwrap() as usize;
        counters.stage_exact[6][t]
    };

    let mut by_wins: Vec<(usize, u64)> = (0..48).map(|t| (t, counters.stage_exact[6][t])).collect();
    by_wins.sort_by_key(|&(_, w)| std::cmp::Reverse(w));
    let top3: Vec<&str> = by_wins[..3]
        .iter()
        .map(|&(t, _)| teams.teams[t].code.as_str())
        .collect();

    assert!(
        top3.contains(&"ESP"),
        "Spain must be a top-3 favourite, got {top3:?}"
    );
    assert!(
        top3.contains(&"ARG"),
        "Argentina must be a top-3 favourite, got {top3:?}"
    );
    assert!(wins("ESP") > wins("HAI") * 10, "Spain must dwarf Haiti");

    let total_wins: u64 = (0..48).map(|t| counters.stage_exact[6][t]).sum();
    assert_eq!(total_wins, n, "exactly one champion per tournament");

    let avg = counters.avg_group_goals_per_match();
    assert!(
        (2.4..=3.0).contains(&avg),
        "group-stage goal average {avg:.3} outside [2.4, 3.0]"
    );
}
