use crate::bracket::{KNOCKOUT, KoSource, R32, Slot};
use crate::data::{NUM_GROUPS, TeamId, Teams, group_index};
use crate::engine::{self, HOME_ADVANTAGE};
use crate::group::{GROUP_SCHEDULE, rank_group};
use crate::results::FixedResults;
use crate::third_place::{Third, allocate, best_eight_mask};
use crate::tournament::Config;
use serde::{Deserialize, Serialize};

const SCHEDULE_JSON: &str = include_str!("../data/schedule.json");

#[derive(Debug, Deserialize)]
struct ScheduleFile {
    matches: Vec<ScheduleEntry>,
}

#[derive(Debug, Deserialize)]
struct ScheduleEntry {
    #[serde(rename = "match")]
    match_no: u8,
    group: Option<char>,
    date: String,
    home: Option<String>,
    away: Option<String>,
    city: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Fixture {
    #[serde(rename = "match")]
    pub match_no: u8,
    pub stage: &'static str,
    pub group: Option<char>,
    pub date: String,
    pub city: Option<String>,
    pub home: Option<String>,
    pub away: Option<String>,
    pub home_label: String,
    pub away_label: String,
    pub status: &'static str,
    pub score: Option<(u8, u8)>,
    pub penalties: bool,
    pub winner: Option<String>,
    pub p_home: Option<f64>,
    pub p_draw: Option<f64>,
    pub p_away: Option<f64>,
    pub likely_score: Option<(u8, u8)>,
    pub likely_p: Option<f64>,
}

fn stage_name(m: u8) -> &'static str {
    match m {
        1..=72 => "group",
        73..=88 => "r32",
        89..=96 => "r16",
        97..=100 => "qf",
        101..=102 => "sf",
        103 => "third",
        _ => "final",
    }
}

struct GroupOutcome {
    winners: [TeamId; NUM_GROUPS],
    runners: [TeamId; NUM_GROUPS],
    assignment: [u8; 8],
    thirds: [Third; NUM_GROUPS],
}

/// Deterministic group tables + third-place allocation, available only once
/// all 72 group matches have real results.
fn group_outcome(teams: &Teams, fixed: &FixedResults) -> Option<GroupOutcome> {
    let complete = fixed.group.iter().all(|g| g.iter().all(|m| m.is_some()));
    if !complete {
        return None;
    }
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
        let members = teams.groups[g];
        let mut goals = [[0u8; 4]; 4];
        for (si, &(ia, ib)) in GROUP_SCHEDULE.iter().enumerate() {
            let (ga, gb) = fixed.group[g][si].unwrap();
            goals[ia as usize][ib as usize] = ga;
            goals[ib as usize][ia as usize] = gb;
        }
        let fifa4 = members.map(|t| teams.teams[t as usize].fifa_rank);
        let gr = rank_group(&goals, &fifa4);
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
    let assignment = *allocate(best_eight_mask(&thirds));
    Some(GroupOutcome {
        winners,
        runners,
        assignment,
        thirds,
    })
}

pub fn build_fixtures(teams: &Teams, fixed: &FixedResults, cfg: &Config) -> Vec<Fixture> {
    let file: ScheduleFile =
        serde_json::from_str(SCHEDULE_JSON).expect("embedded schedule.json must parse");
    assert_eq!(file.matches.len(), 104, "schedule must list 104 matches");

    let mut elo: Vec<f64> = teams.teams.iter().map(|t| t.elo).collect();
    let bonus: Vec<f64> = teams
        .teams
        .iter()
        .map(|t| if t.host { HOME_ADVANTAGE } else { 0.0 })
        .collect();

    let outcome = group_outcome(teams, fixed);

    let mut ko_winner: [Option<TeamId>; 32] = [None; 32];
    let mut ko_loser: [Option<TeamId>; 32] = [None; 32];
    let mut entries = file.matches;
    entries.sort_by_key(|e| e.match_no);

    let code = |t: TeamId| teams.teams[t as usize].code.clone();
    let mut fixtures = Vec::with_capacity(104);

    for e in &entries {
        let stage = stage_name(e.match_no);
        let mut fx = Fixture {
            match_no: e.match_no,
            stage,
            group: e.group,
            date: e.date.clone(),
            city: e.city.clone(),
            home: None,
            away: None,
            home_label: String::new(),
            away_label: String::new(),
            status: "tbd",
            score: None,
            penalties: false,
            winner: None,
            p_home: None,
            p_draw: None,
            p_away: None,
            likely_score: None,
            likely_p: None,
        };

        if stage == "group" {
            let home = teams
                .index_of(e.home.as_deref().expect("group match needs home"))
                .expect("schedule home code");
            let away = teams
                .index_of(e.away.as_deref().expect("group match needs away"))
                .expect("schedule away code");
            let g = group_index(teams.teams[home as usize].group);
            let members = teams.groups[g];
            let sh = members.iter().position(|&t| t == home).unwrap() as u8;
            let sa = members.iter().position(|&t| t == away).unwrap() as u8;
            let si = GROUP_SCHEDULE
                .iter()
                .position(|&(x, y)| (x, y) == (sh, sa) || (x, y) == (sa, sh))
                .unwrap();

            let d = (elo[home as usize] + bonus[home as usize])
                - (elo[away as usize] + bonus[away as usize]);
            let (pw, pd, pl) = engine::outcome_probs(d);
            let (lh, la_goals, lp) = engine::most_likely_score(d);
            fx.home = Some(code(home));
            fx.away = Some(code(away));
            fx.home_label = code(home);
            fx.away_label = code(away);
            fx.p_home = Some(pw);
            fx.p_draw = Some(pd);
            fx.p_away = Some(pl);
            fx.likely_score = Some((lh, la_goals));
            fx.likely_p = Some(lp);

            if let Some((ga, gb)) = fixed.group[g][si] {
                let (ia, _) = GROUP_SCHEDULE[si];
                let (gh, gaway) = if ia == sh { (ga, gb) } else { (gb, ga) };
                fx.status = "played";
                fx.score = Some((gh, gaway));
                let (dh, da) = engine::elo_deltas(d, gh, gaway);
                elo[home as usize] += dh;
                elo[away as usize] += da;
            } else {
                fx.status = "upcoming";
            }
        } else {
            let idx = (e.match_no - 73) as usize;
            let (pair, labels) = resolve_ko(e.match_no, outcome.as_ref(), &ko_winner, &ko_loser);
            fx.home_label = labels.0;
            fx.away_label = labels.1;
            if let Some((a, b)) = pair {
                fx.home = Some(code(a));
                fx.away = Some(code(b));
                fx.home_label = code(a);
                fx.away_label = code(b);
                let d =
                    (elo[a as usize] + bonus[a as usize]) - (elo[b as usize] + bonus[b as usize]);
                let p = engine::advance_prob(d, cfg.pens);
                let (lh, la_goals, lp) = engine::most_likely_score(d);
                fx.p_home = Some(p);
                fx.p_away = Some(1.0 - p);
                fx.likely_score = Some((lh, la_goals));
                fx.likely_p = Some(lp);

                if let Some(f) = fixed.ko[idx] {
                    let (gh, gaway) = if f.a == a {
                        (f.goals_a, f.goals_b)
                    } else {
                        (f.goals_b, f.goals_a)
                    };
                    fx.status = "played";
                    fx.score = Some((gh, gaway));
                    fx.penalties = f.penalties;
                    fx.winner = Some(code(f.winner));
                    ko_winner[idx] = Some(f.winner);
                    ko_loser[idx] = Some(if f.winner == a { b } else { a });
                    let (dh, da) = engine::elo_deltas(d, gh, gaway);
                    elo[a as usize] += dh;
                    elo[b as usize] += da;
                } else {
                    fx.status = "upcoming";
                }
            }
        }
        fixtures.push(fx);
    }
    fixtures
}

type KoPair = Option<(TeamId, TeamId)>;

fn resolve_ko(
    m: u8,
    outcome: Option<&GroupOutcome>,
    ko_winner: &[Option<TeamId>; 32],
    ko_loser: &[Option<TeamId>; 32],
) -> (KoPair, (String, String)) {
    let group_letter = |g: u8| (b'A' + g) as char;
    if (73..=88).contains(&m) {
        let &(_, sa, sb) = R32.iter().find(|&&(n, _, _)| n == m).unwrap();
        let label = |s: Slot| match s {
            Slot::Winner(g) => format!("1{}", group_letter(g)),
            Slot::RunnerUp(g) => format!("2{}", group_letter(g)),
            Slot::Third(_) => "3rd".to_string(),
        };
        let resolve = |s: Slot| -> Option<TeamId> {
            let o = outcome?;
            Some(match s {
                Slot::Winner(g) => o.winners[g as usize],
                Slot::RunnerUp(g) => o.runners[g as usize],
                Slot::Third(slot) => o.thirds[o.assignment[slot as usize] as usize].team,
            })
        };
        let pair = match (resolve(sa), resolve(sb)) {
            (Some(a), Some(b)) => Some((a, b)),
            _ => None,
        };
        (pair, (label(sa), label(sb)))
    } else {
        let &(_, sa, sb) = KNOCKOUT.iter().find(|&&(n, _, _)| n == m).unwrap();
        let label = |s: KoSource| match s {
            KoSource::WinnerOf(p) => format!("W{p}"),
            KoSource::LoserOf(p) => format!("L{p}"),
        };
        let resolve = |s: KoSource| -> Option<TeamId> {
            match s {
                KoSource::WinnerOf(p) => ko_winner[(p - 73) as usize],
                KoSource::LoserOf(p) => ko_loser[(p - 73) as usize],
            }
        };
        let pair = match (resolve(sa), resolve(sb)) {
            (Some(a), Some(b)) => Some((a, b)),
            _ => None,
        };
        (pair, (label(sa), label(sb)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::results::{self, MatchEntry};

    #[test]
    fn schedule_covers_all_104_matches_and_validates() {
        let teams = Teams::load();
        let fixtures = build_fixtures(&teams, &results::EMPTY, &Config::default());
        assert_eq!(fixtures.len(), 104);
        for (i, f) in fixtures.iter().enumerate() {
            assert_eq!(f.match_no as usize, i + 1);
        }
        let groups = fixtures.iter().filter(|f| f.stage == "group");
        assert_eq!(groups.count(), 72);
        // every group fixture has probabilities that sum to ~1
        for f in fixtures.iter().filter(|f| f.stage == "group") {
            assert_eq!(f.status, "upcoming");
            let s = f.p_home.unwrap() + f.p_draw.unwrap() + f.p_away.unwrap();
            assert!((s - 1.0).abs() < 1e-6, "match {}: {s}", f.match_no);
        }
        // knockout fixtures are TBD with slot labels
        for f in fixtures.iter().filter(|f| f.stage != "group") {
            assert_eq!(f.status, "tbd");
            assert!(!f.home_label.is_empty() && !f.away_label.is_empty());
        }
        // match 1 is Mexico v South Africa on opening day
        assert_eq!(fixtures[0].home.as_deref(), Some("MEX"));
        assert_eq!(fixtures[0].away.as_deref(), Some("RSA"));
        assert_eq!(fixtures[0].date, "2026-06-11");
    }

    #[test]
    fn schedule_pairs_match_group_schedule() {
        let teams = Teams::load();
        let fixtures = build_fixtures(&teams, &results::EMPTY, &Config::default());
        let mut count = [[false; 6]; NUM_GROUPS];
        for f in fixtures.iter().filter(|f| f.stage == "group") {
            let h = teams.index_of(f.home.as_deref().unwrap()).unwrap();
            let a = teams.index_of(f.away.as_deref().unwrap()).unwrap();
            let g = group_index(teams.teams[h as usize].group);
            let members = teams.groups[g];
            let sh = members.iter().position(|&t| t == h).unwrap() as u8;
            let sa = members.iter().position(|&t| t == a).unwrap() as u8;
            let si = GROUP_SCHEDULE
                .iter()
                .position(|&(x, y)| (x, y) == (sh, sa) || (x, y) == (sa, sh))
                .unwrap();
            assert!(!count[g][si], "duplicate pair in schedule");
            count[g][si] = true;
        }
        assert!(count.iter().flatten().all(|&c| c));
    }

    #[test]
    fn played_result_flips_status_and_moves_elo() {
        let teams = Teams::load();
        let entries = [MatchEntry {
            match_no: None,
            home: "MEX".into(),
            away: "RSA".into(),
            score: (0, 3),
            extra_time: false,
            penalties: false,
            winner: None,
        }];
        let fixed = FixedResults::from_entries(&entries, &teams).unwrap();
        let fixtures = build_fixtures(&teams, &fixed, &Config::default());
        let m1 = &fixtures[0];
        assert_eq!(m1.status, "played");
        assert_eq!(m1.score, Some((0, 3)));
        // Mexico's next match (28 vs KOR) must use the lowered post-upset Elo:
        // p_home drops vs the no-results baseline.
        let baseline = build_fixtures(&teams, &results::EMPTY, &Config::default());
        let f28 = fixtures.iter().find(|f| f.match_no == 28).unwrap();
        let b28 = baseline.iter().find(|f| f.match_no == 28).unwrap();
        assert_eq!(f28.home.as_deref(), Some("MEX"));
        assert!(f28.p_home.unwrap() < b28.p_home.unwrap());
    }
}
