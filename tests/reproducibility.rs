use rayon::prelude::*;
use wc2026_simulation::data::Teams;
use wc2026_simulation::stats::{Counters, ReportMeta, build_report, format_csv, format_table};
use wc2026_simulation::tournament::{Config, NullRecorder, SimData, run_seed, simulate_one};

fn run_with_threads(threads: usize, seed: u64, n: u64) -> (String, String, String) {
    let teams = Teams::load();
    let data = SimData::new(&teams);
    let cfg = Config::default();
    let pool = rayon::ThreadPoolBuilder::new()
        .num_threads(threads)
        .build()
        .unwrap();
    let counters = pool.install(|| {
        (0..n)
            .into_par_iter()
            .fold(Counters::zeroed, |mut c, i| {
                c.absorb(&simulate_one(
                    &data,
                    &cfg,
                    run_seed(seed, i),
                    &mut NullRecorder,
                ));
                c
            })
            .reduce(Counters::zeroed, Counters::merge)
    });
    let meta = ReportMeta {
        seed,
        dynamic_elo: true,
        pens: "coin".into(),
    };
    let report = build_report(&counters, &teams, &meta);
    (
        format_table(&report),
        serde_json::to_string_pretty(&report).unwrap(),
        format_csv(&report),
    )
}

#[test]
fn same_seed_identical_output_across_thread_counts() {
    let (t1, j1, c1) = run_with_threads(1, 2026, 5_000);
    let (t8, j8, c8) = run_with_threads(8, 2026, 5_000);
    assert_eq!(t1, t8, "table output differs between 1 and 8 threads");
    assert_eq!(j1, j8, "json output differs between 1 and 8 threads");
    assert_eq!(c1, c8, "csv output differs between 1 and 8 threads");

    let (t1b, ..) = run_with_threads(1, 2026, 5_000);
    assert_eq!(t1, t1b, "same seed must give identical output");

    let (t_other, ..) = run_with_threads(8, 2027, 5_000);
    assert_ne!(t1, t_other, "different seeds should differ");
}
