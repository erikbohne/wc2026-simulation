use rand::SeedableRng;
use rand_xoshiro::Xoshiro256PlusPlus;
use wc2026_simulation::engine::{SPREAD, play_90, win_expectancy};

#[test]
fn calibration_poisson_vs_dampened_elo_expectancy() {
    // The goal model deliberately flattens Elo: SPREAD > 1000 stretches the
    // expectancy scale by SPREAD/1000, so the Poisson-implied expected score
    // must match the dampened curve, not raw Elo expectancy.
    let mut rng = Xoshiro256PlusPlus::seed_from_u64(2026);
    let n = 1_000_000u32;
    for d in [0.0, 100.0, 200.0, 300.0, 400.0] {
        let mut score = 0u64;
        for _ in 0..n {
            let (ga, gb) = play_90(&mut rng, d);
            score += match ga.cmp(&gb) {
                std::cmp::Ordering::Greater => 2,
                std::cmp::Ordering::Equal => 1,
                std::cmp::Ordering::Less => 0,
            };
        }
        let observed = score as f64 / (2 * n) as f64;
        let expected = win_expectancy(d * 1000.0 / SPREAD);
        assert!(
            (observed - expected).abs() < 0.03,
            "d={d}: poisson-implied score {observed:.4} deviates from dampened Elo expectancy {expected:.4} by more than 3pp"
        );
    }
}
