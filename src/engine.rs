use rand::{Rng, RngExt};

pub const BASE_LAMBDA: f64 = 1.2;
pub const SPREAD: f64 = 1000.0;
pub const HOME_ADVANTAGE: f64 = 100.0;
pub const LAMBDA_MIN: f64 = 0.15;
pub const LAMBDA_MAX: f64 = 5.0;
pub const K_FACTOR: f64 = 60.0;

const LN_10: f64 = std::f64::consts::LN_10;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PensMode {
    Coin,
    Elo,
}

#[derive(Debug, Clone, Copy)]
pub struct MatchOutcome {
    pub goals_a: u8,
    pub goals_b: u8,
    pub extra_time: bool,
    pub penalties: bool,
    pub a_advances: bool,
}

pub fn win_expectancy(d: f64) -> f64 {
    1.0 / (1.0 + (-d * LN_10 / 400.0).exp())
}

pub fn lambdas(d: f64) -> (f64, f64) {
    let factor = (d * LN_10 / SPREAD).exp();
    (
        (BASE_LAMBDA * factor).clamp(LAMBDA_MIN, LAMBDA_MAX),
        (BASE_LAMBDA / factor).clamp(LAMBDA_MIN, LAMBDA_MAX),
    )
}

pub fn poisson(rng: &mut impl Rng, lambda: f64) -> u8 {
    let limit = (-lambda).exp();
    let mut k = 0u8;
    let mut p: f64 = 1.0;
    loop {
        p *= rng.random::<f64>();
        if p <= limit || k == u8::MAX {
            return k;
        }
        k += 1;
    }
}

pub fn play_90(rng: &mut impl Rng, d: f64) -> (u8, u8) {
    let (la, lb) = lambdas(d);
    (poisson(rng, la), poisson(rng, lb))
}

pub fn play_knockout(rng: &mut impl Rng, d: f64, pens: PensMode) -> MatchOutcome {
    let (mut ga, mut gb) = play_90(rng, d);
    let mut extra_time = false;
    let mut penalties = false;

    if ga == gb {
        extra_time = true;
        let (la, lb) = lambdas(d);
        ga = ga.saturating_add(poisson(rng, la / 3.0));
        gb = gb.saturating_add(poisson(rng, lb / 3.0));
    }

    let a_advances = if ga != gb {
        ga > gb
    } else {
        penalties = true;
        let p = match pens {
            PensMode::Coin => 0.5,
            PensMode::Elo => 0.5 + 0.5 * (win_expectancy(d) - 0.5),
        };
        rng.random::<f64>() < p
    };

    MatchOutcome {
        goals_a: ga,
        goals_b: gb,
        extra_time,
        penalties,
        a_advances,
    }
}

pub fn poisson_pmf(k: u32, lambda: f64) -> f64 {
    let mut p = (-lambda).exp();
    for i in 1..=k {
        p *= lambda / i as f64;
    }
    p
}

const PROB_CAP: u32 = 24;

/// Exact 90-minute (home win, draw, away win) probabilities for two lambdas.
pub fn outcome_probs_for(la: f64, lb: f64) -> (f64, f64, f64) {
    let mut win = 0.0;
    let mut draw = 0.0;
    let mut loss = 0.0;
    for h in 0..=PROB_CAP {
        let ph = poisson_pmf(h, la);
        for a in 0..=PROB_CAP {
            let p = ph * poisson_pmf(a, lb);
            match h.cmp(&a) {
                std::cmp::Ordering::Greater => win += p,
                std::cmp::Ordering::Equal => draw += p,
                std::cmp::Ordering::Less => loss += p,
            }
        }
    }
    (win, draw, loss)
}

pub fn outcome_probs(d: f64) -> (f64, f64, f64) {
    let (la, lb) = lambdas(d);
    outcome_probs_for(la, lb)
}

/// Probability the first team advances in a knockout match (90' + ET + pens).
pub fn advance_prob(d: f64, pens: PensMode) -> f64 {
    let (la, lb) = lambdas(d);
    let (w90, d90, _) = outcome_probs_for(la, lb);
    let (wet, det, _) = outcome_probs_for(la / 3.0, lb / 3.0);
    let p_pens = match pens {
        PensMode::Coin => 0.5,
        PensMode::Elo => 0.5 + 0.5 * (win_expectancy(d) - 0.5),
    };
    w90 + d90 * (wet + det * p_pens)
}

/// Most likely exact 90-minute scoreline and its probability.
pub fn most_likely_score(d: f64) -> (u8, u8, f64) {
    let (la, lb) = lambdas(d);
    let mut best = (0u8, 0u8, 0.0f64);
    for h in 0..=8u32 {
        for a in 0..=8u32 {
            let p = poisson_pmf(h, la) * poisson_pmf(a, lb);
            if p > best.2 {
                best = (h as u8, a as u8, p);
            }
        }
    }
    best
}

pub fn margin_multiplier(margin: u8) -> f64 {
    match margin {
        0 | 1 => 1.0,
        2 => 1.5,
        n => (11.0 + n as f64) / 8.0,
    }
}

pub fn elo_deltas(d: f64, goals_a: u8, goals_b: u8) -> (f64, f64) {
    let we = win_expectancy(d);
    let w = match goals_a.cmp(&goals_b) {
        std::cmp::Ordering::Greater => 1.0,
        std::cmp::Ordering::Equal => 0.5,
        std::cmp::Ordering::Less => 0.0,
    };
    let g = margin_multiplier(goals_a.abs_diff(goals_b));
    let delta = K_FACTOR * g * (w - we);
    (delta, -delta)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::SeedableRng;
    use rand_xoshiro::Xoshiro256PlusPlus;

    fn rng() -> Xoshiro256PlusPlus {
        Xoshiro256PlusPlus::seed_from_u64(42)
    }

    #[test]
    fn win_expectancy_symmetry() {
        assert!((win_expectancy(0.0) - 0.5).abs() < 1e-12);
        assert!((win_expectancy(200.0) + win_expectancy(-200.0) - 1.0).abs() < 1e-12);
        assert!((win_expectancy(400.0) - 10.0 / 11.0).abs() < 1e-9);
    }

    #[test]
    fn lambdas_clamped() {
        let (la, lb) = lambdas(0.0);
        assert!((la - BASE_LAMBDA).abs() < 1e-12);
        assert!((lb - BASE_LAMBDA).abs() < 1e-12);
        let (la, lb) = lambdas(5000.0);
        assert_eq!(la, LAMBDA_MAX);
        assert_eq!(lb, LAMBDA_MIN);
    }

    #[test]
    fn poisson_mean_and_variance() {
        let mut r = rng();
        let lambda = 2.3;
        let n = 200_000;
        let samples: Vec<u8> = (0..n).map(|_| poisson(&mut r, lambda)).collect();
        let mean = samples.iter().map(|&x| x as f64).sum::<f64>() / n as f64;
        let var = samples
            .iter()
            .map(|&x| (x as f64 - mean).powi(2))
            .sum::<f64>()
            / n as f64;
        assert!((mean - lambda).abs() < 0.02, "mean {mean}");
        assert!((var - lambda).abs() < 0.05, "var {var}");
    }

    #[test]
    fn extra_time_lambda_divides_clamped_value() {
        // The clamp applies to the 90-minute lambda; extra time divides the
        // clamped value by 3 and may legitimately go below LAMBDA_MIN.
        let (la, _) = lambdas(-5000.0);
        assert_eq!(la, LAMBDA_MIN);
        assert!((la / 3.0 - 0.05).abs() < 1e-12);
    }

    #[test]
    fn knockout_always_advances_someone() {
        let mut r = rng();
        for _ in 0..10_000 {
            let m = play_knockout(&mut r, 0.0, PensMode::Coin);
            if m.goals_a == m.goals_b {
                assert!(m.penalties && m.extra_time);
            } else {
                assert_eq!(m.a_advances, m.goals_a > m.goals_b);
            }
        }
    }

    #[test]
    fn pens_elo_mode_dampened() {
        let we = win_expectancy(400.0);
        let p = 0.5 + 0.5 * (we - 0.5);
        assert!(p > 0.5 && p < we);
    }

    #[test]
    fn margin_multipliers() {
        assert_eq!(margin_multiplier(0), 1.0);
        assert_eq!(margin_multiplier(1), 1.0);
        assert_eq!(margin_multiplier(2), 1.5);
        assert_eq!(margin_multiplier(3), 14.0 / 8.0);
        assert_eq!(margin_multiplier(5), 2.0);
    }

    #[test]
    fn elo_deltas_zero_sum_and_signs() {
        let (da, db) = elo_deltas(0.0, 2, 0);
        assert!((da + db).abs() < 1e-12);
        assert!(da > 0.0);
        let (da, _) = elo_deltas(300.0, 0, 1);
        assert!(da < 0.0);
    }
}
