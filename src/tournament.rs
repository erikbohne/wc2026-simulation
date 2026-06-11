use crate::bracket::{KNOCKOUT, KoSource, R32, Slot, stage_of_match};
use crate::data::{NUM_GROUPS, NUM_TEAMS, TeamId, Teams};
use crate::engine::{self, HOME_ADVANTAGE, MatchOutcome, PensMode};
use crate::group::{GROUP_SCHEDULE, GroupResult, rank_group};
use crate::results::FixedResults;
use crate::third_place::{Third, allocate, best_eight_mask};
use rand::SeedableRng;
use rand_xoshiro::Xoshiro256PlusPlus;

pub const STAGE_GROUP: u8 = 0;
pub const STAGE_R32: u8 = 1;
pub const STAGE_R16: u8 = 2;
pub const STAGE_QF: u8 = 3;
pub const STAGE_SF: u8 = 4;
pub const STAGE_FINAL: u8 = 5;
pub const STAGE_CHAMPION: u8 = 6;

#[derive(Debug, Clone, Copy)]
pub struct Config {
    pub dynamic_elo: bool,
    pub pens: PensMode,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            dynamic_elo: true,
            pens: PensMode::Coin,
        }
    }
}

#[derive(Debug)]
pub struct SimData {
    pub base_elo: [f64; NUM_TEAMS],
    pub home_bonus: [f64; NUM_TEAMS],
    pub fifa: [u16; NUM_TEAMS],
    pub groups: [[TeamId; 4]; NUM_GROUPS],
}

impl SimData {
    pub fn new(teams: &Teams) -> SimData {
        let mut base_elo = [0.0; NUM_TEAMS];
        let mut home_bonus = [0.0; NUM_TEAMS];
        let mut fifa = [0u16; NUM_TEAMS];
        for (i, t) in teams.teams.iter().enumerate() {
            base_elo[i] = t.elo;
            home_bonus[i] = if t.host { HOME_ADVANTAGE } else { 0.0 };
            fifa[i] = t.fifa_rank;
        }
        SimData {
            base_elo,
            home_bonus,
            fifa,
            groups: teams.groups,
        }
    }
}

pub trait Recorder {
    #[inline]
    fn group_match(&mut self, _group: u8, _a: TeamId, _b: TeamId, _ga: u8, _gb: u8) {}
    #[inline]
    fn group_done(&mut self, _group: u8, _members: &[TeamId; 4], _result: &GroupResult) {}
    #[inline]
    fn ko_match(&mut self, _match_no: u8, _a: TeamId, _b: TeamId, _outcome: MatchOutcome) {}
}

pub struct NullRecorder;
impl Recorder for NullRecorder {}

#[derive(Default)]
pub struct FullRecorder {
    pub group_matches: Vec<(u8, TeamId, TeamId, u8, u8)>,
    pub group_tables: Vec<(u8, [TeamId; 4], GroupResult)>,
    pub ko_matches: Vec<(u8, TeamId, TeamId, MatchOutcome)>,
}

impl Recorder for FullRecorder {
    fn group_match(&mut self, group: u8, a: TeamId, b: TeamId, ga: u8, gb: u8) {
        self.group_matches.push((group, a, b, ga, gb));
    }
    fn group_done(&mut self, group: u8, members: &[TeamId; 4], result: &GroupResult) {
        self.group_tables.push((group, *members, *result));
    }
    fn ko_match(&mut self, match_no: u8, a: TeamId, b: TeamId, outcome: MatchOutcome) {
        self.ko_matches.push((match_no, a, b, outcome));
    }
}

#[derive(Debug, Clone, Copy)]
pub struct TournamentResult {
    pub stage: [u8; NUM_TEAMS],
    pub group_pos: [u8; NUM_TEAMS],
    pub points: [u8; NUM_TEAMS],
    pub gd: [i16; NUM_TEAMS],
    pub r32_opponent: [TeamId; NUM_TEAMS],
    pub ko_a: [TeamId; 32],
    pub ko_b: [TeamId; 32],
    pub champion: TeamId,
    pub third_place: TeamId,
    pub total_goals: u32,
    pub group_goals: u16,
    pub matches: u16,
}

fn splitmix64(mut x: u64) -> u64 {
    x = x.wrapping_add(0x9E3779B97F4A7C15);
    x = (x ^ (x >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94D049BB133111EB);
    x ^ (x >> 31)
}

pub fn run_seed(master_seed: u64, run_index: u64) -> u64 {
    splitmix64(master_seed ^ splitmix64(run_index.wrapping_add(1)))
}

pub fn simulate_one(
    data: &SimData,
    cfg: &Config,
    seed: u64,
    rec: &mut impl Recorder,
) -> TournamentResult {
    simulate_one_from(data, cfg, &crate::results::EMPTY, seed, rec)
}

pub fn simulate_one_from(
    data: &SimData,
    cfg: &Config,
    fixed: &FixedResults,
    seed: u64,
    rec: &mut impl Recorder,
) -> TournamentResult {
    let mut rng = Xoshiro256PlusPlus::seed_from_u64(seed);
    let mut elo = data.base_elo;
    for e in elo.iter_mut() {
        *e += engine::STRENGTH_SIGMA * engine::gaussian(&mut rng);
    }
    let mut result = TournamentResult {
        stage: [STAGE_GROUP; NUM_TEAMS],
        group_pos: [0; NUM_TEAMS],
        points: [0; NUM_TEAMS],
        gd: [0; NUM_TEAMS],
        r32_opponent: [TeamId::MAX; NUM_TEAMS],
        ko_a: [TeamId::MAX; 32],
        ko_b: [TeamId::MAX; 32],
        champion: TeamId::MAX,
        third_place: TeamId::MAX,
        total_goals: 0,
        group_goals: 0,
        matches: 0,
    };

    let mut winners = [TeamId::MAX; NUM_GROUPS];
    let mut runners = [TeamId::MAX; NUM_GROUPS];
    let mut thirds = [Third {
        group: 0,
        team: TeamId::MAX,
        points: 0,
        gd: 0,
        gf: 0,
        fifa_rank: 0,
    }; NUM_GROUPS];

    for g in 0..NUM_GROUPS {
        let members = data.groups[g];
        let mut goals = [[0u8; 4]; 4];
        for (si, &(ia, ib)) in GROUP_SCHEDULE.iter().enumerate() {
            let (a, b) = (members[ia as usize], members[ib as usize]);
            let d = (elo[a as usize] + data.home_bonus[a as usize])
                - (elo[b as usize] + data.home_bonus[b as usize]);
            let (ga, gb) = match fixed.group[g][si] {
                Some(score) => score,
                None => engine::play_90(&mut rng, d),
            };
            goals[ia as usize][ib as usize] = ga;
            goals[ib as usize][ia as usize] = gb;
            result.total_goals += (ga + gb) as u32;
            result.group_goals += (ga + gb) as u16;
            result.matches += 1;
            rec.group_match(g as u8, a, b, ga, gb);
            if cfg.dynamic_elo {
                let (da, db) = engine::elo_deltas(d, ga, gb);
                elo[a as usize] += da;
                elo[b as usize] += db;
            }
        }

        let fifa4 = members.map(|t| data.fifa[t as usize]);
        let gr = rank_group(&goals, &fifa4);
        rec.group_done(g as u8, &members, &gr);

        for (pos, &slot) in gr.order.iter().enumerate() {
            let t = members[slot as usize];
            result.group_pos[t as usize] = pos as u8;
            result.points[t as usize] = gr.stats[slot as usize].points;
            result.gd[t as usize] = gr.stats[slot as usize].gd();
        }
        winners[g] = members[gr.order[0] as usize];
        runners[g] = members[gr.order[1] as usize];
        let third_slot = gr.order[2];
        thirds[g] = Third {
            group: g as u8,
            team: members[third_slot as usize],
            points: gr.stats[third_slot as usize].points,
            gd: gr.stats[third_slot as usize].gd(),
            gf: gr.stats[third_slot as usize].gf,
            fifa_rank: fifa4[third_slot as usize],
        };
    }

    let mask = best_eight_mask(&thirds);
    let assignment = allocate(mask);

    let mut ko_winner = [TeamId::MAX; 32];
    let mut ko_loser = [TeamId::MAX; 32];

    let play_ko = |rng: &mut Xoshiro256PlusPlus,
                   elo: &mut [f64; NUM_TEAMS],
                   result: &mut TournamentResult,
                   rec: &mut dyn FnMut(u8, TeamId, TeamId, MatchOutcome),
                   m: u8,
                   a: TeamId,
                   b: TeamId|
     -> (TeamId, TeamId) {
        let d = (elo[a as usize] + data.home_bonus[a as usize])
            - (elo[b as usize] + data.home_bonus[b as usize]);
        let o = match fixed.ko[(m - 73) as usize] {
            Some(f) => {
                assert!(
                    (f.a == a && f.b == b) || (f.a == b && f.b == a),
                    "fixed result for match {m} names {}/{} but simulation produced {}/{}",
                    f.a,
                    f.b,
                    a,
                    b
                );
                let (goals_a, goals_b) = if f.a == a {
                    (f.goals_a, f.goals_b)
                } else {
                    (f.goals_b, f.goals_a)
                };
                MatchOutcome {
                    goals_a,
                    goals_b,
                    extra_time: f.extra_time,
                    penalties: f.penalties,
                    a_advances: f.winner == a,
                }
            }
            None => engine::play_knockout(rng, d, cfg.pens),
        };
        result.total_goals += (o.goals_a + o.goals_b) as u32;
        result.matches += 1;
        rec(m, a, b, o);
        if cfg.dynamic_elo {
            let (da, db) = engine::elo_deltas(d, o.goals_a, o.goals_b);
            elo[a as usize] += da;
            elo[b as usize] += db;
        }
        if o.a_advances { (a, b) } else { (b, a) }
    };

    let mut emit = |m: u8, a: TeamId, b: TeamId, o: MatchOutcome| rec.ko_match(m, a, b, o);

    for &(m, sa, sb) in &R32 {
        let resolve = |slot: Slot| -> TeamId {
            match slot {
                Slot::Winner(g) => winners[g as usize],
                Slot::RunnerUp(g) => runners[g as usize],
                Slot::Third(s) => thirds[assignment[s as usize] as usize].team,
            }
        };
        let (a, b) = (resolve(sa), resolve(sb));
        result.stage[a as usize] = STAGE_R32;
        result.stage[b as usize] = STAGE_R32;
        result.r32_opponent[a as usize] = b;
        result.r32_opponent[b as usize] = a;
        result.ko_a[(m - 73) as usize] = a;
        result.ko_b[(m - 73) as usize] = b;
        let (w, l) = play_ko(&mut rng, &mut elo, &mut result, &mut emit, m, a, b);
        result.stage[w as usize] = STAGE_R16;
        ko_winner[(m - 73) as usize] = w;
        ko_loser[(m - 73) as usize] = l;
    }

    for &(m, sa, sb) in &KNOCKOUT {
        let resolve = |src: KoSource| -> TeamId {
            match src {
                KoSource::WinnerOf(p) => ko_winner[(p - 73) as usize],
                KoSource::LoserOf(p) => ko_loser[(p - 73) as usize],
            }
        };
        let (a, b) = (resolve(sa), resolve(sb));
        result.ko_a[(m - 73) as usize] = a;
        result.ko_b[(m - 73) as usize] = b;
        let (w, l) = play_ko(&mut rng, &mut elo, &mut result, &mut emit, m, a, b);
        ko_winner[(m - 73) as usize] = w;
        ko_loser[(m - 73) as usize] = l;
        match m {
            103 => result.third_place = w,
            104 => {
                result.stage[w as usize] = STAGE_CHAMPION;
                result.champion = w;
            }
            _ => result.stage[w as usize] = stage_of_match(m) + 1,
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seed_derivation_is_stable() {
        assert_ne!(run_seed(42, 0), run_seed(42, 1));
        assert_ne!(run_seed(42, 0), run_seed(43, 0));
        assert_eq!(run_seed(42, 7), run_seed(42, 7));
    }

    #[test]
    fn tournament_has_104_matches_and_a_champion() {
        let teams = Teams::load();
        let data = SimData::new(&teams);
        let cfg = Config::default();
        for seed in 0..50 {
            let r = simulate_one(&data, &cfg, seed, &mut NullRecorder);
            assert_eq!(r.matches, 104);
            assert!(r.champion != TeamId::MAX);
            assert!(r.third_place != TeamId::MAX);
            assert_eq!(r.stage[r.champion as usize], STAGE_CHAMPION);
            let in_r32 = r.stage.iter().filter(|&&s| s >= STAGE_R32).count();
            assert_eq!(in_r32, 32);
            let finalists = r.stage.iter().filter(|&&s| s >= STAGE_FINAL).count();
            assert_eq!(finalists, 2);
        }
    }

    #[test]
    fn fixed_group_result_holds_in_every_run() {
        use crate::results::{FixedResults, MatchEntry};
        let teams = Teams::load();
        let data = SimData::new(&teams);
        let cfg = Config::default();
        let members = teams.groups[0];
        let code = |t: TeamId| teams.teams[t as usize].code.clone();
        let entries = [MatchEntry {
            match_no: None,
            home: code(members[0]),
            away: code(members[1]),
            score: (4, 0),
            extra_time: false,
            penalties: false,
            winner: None,
        }];
        let fixed = FixedResults::from_entries(&entries, &teams).unwrap();
        for seed in 0..20 {
            let mut rec = FullRecorder::default();
            let r = simulate_one_from(&data, &cfg, &fixed, seed, &mut rec);
            assert_eq!(r.matches, 104);
            let m = rec
                .group_matches
                .iter()
                .find(|&&(g, a, b, _, _)| g == 0 && a == members[0] && b == members[1])
                .unwrap();
            assert_eq!((m.3, m.4), (4, 0));
        }
    }

    #[test]
    fn fixed_results_change_outcome_distribution() {
        use crate::results::{FixedResults, MatchEntry};
        let teams = Teams::load();
        let data = SimData::new(&teams);
        let cfg = Config::default();
        let members = teams.groups[0];
        let code = |t: TeamId| teams.teams[t as usize].code.clone();
        let entries: Vec<MatchEntry> = GROUP_SCHEDULE
            .iter()
            .map(|&(ia, ib)| MatchEntry {
                match_no: None,
                home: code(members[ia as usize]),
                away: code(members[ib as usize]),
                score: if ia == 3 {
                    (3, 0)
                } else if ib == 3 {
                    (0, 3)
                } else {
                    (1, 1)
                },
                extra_time: false,
                penalties: false,
                winner: None,
            })
            .collect();
        let fixed = FixedResults::from_entries(&entries, &teams).unwrap();
        // team at slot 3 wins all its matches -> must always top the group
        let t3 = members[3];
        for seed in 0..50 {
            let r = simulate_one_from(&data, &cfg, &fixed, seed, &mut NullRecorder);
            assert_eq!(r.group_pos[t3 as usize], 0);
            assert_eq!(r.points[t3 as usize], 9);
            assert!(r.stage[t3 as usize] >= STAGE_R32);
        }
    }

    #[test]
    fn same_seed_same_result() {
        let teams = Teams::load();
        let data = SimData::new(&teams);
        let cfg = Config::default();
        let a = simulate_one(&data, &cfg, 1234, &mut NullRecorder);
        let b = simulate_one(&data, &cfg, 1234, &mut NullRecorder);
        assert_eq!(a.stage, b.stage);
        assert_eq!(a.champion, b.champion);
        assert_eq!(a.total_goals, b.total_goals);
    }
}
