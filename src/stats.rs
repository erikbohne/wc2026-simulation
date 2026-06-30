use std::collections::HashMap;

use crate::bracket::champion_title_path;
use crate::data::{NUM_TEAMS, TeamId, Teams};
use crate::fixtures::{Fixture, SlotLikely};
use crate::tournament::{STAGE_CHAMPION, TournamentResult};
use serde::Serialize;

#[derive(Clone)]
pub struct Counters {
    pub n: u64,
    pub stage_exact: [[u64; NUM_TEAMS]; 7],
    pub group_pos: [[u64; NUM_TEAMS]; 4],
    pub third_qualified: [u64; NUM_TEAMS],
    pub third_place_winner: [u64; NUM_TEAMS],
    pub points_sum: [u64; NUM_TEAMS],
    pub gd_sum: [i64; NUM_TEAMS],
    pub r32_opp: Vec<u64>,
    pub ko_slot: Vec<u64>,
    pub goals: u64,
    pub group_goals: u64,
    pub matches: u64,
    pub title_paths: HashMap<u128, u64>,
}

fn pack_title_path_key(champion: usize, match_nos: [u8; 5], opponents: [TeamId; 5]) -> u128 {
    let mut key = champion as u128;
    for (i, &o) in opponents.iter().enumerate() {
        key |= (o as u128) << (6 + i * 6);
    }
    for (i, &m) in match_nos.iter().enumerate() {
        key |= ((m - 73) as u128) << (36 + i * 6);
    }
    key
}

fn unpack_title_path_key(key: u128) -> (usize, [u8; 5], [TeamId; 5]) {
    let champion = (key & 0x3F) as usize;
    let mut opponents = [TeamId::MAX; 5];
    for (i, slot) in opponents.iter_mut().enumerate() {
        *slot = ((key >> (6 + i * 6)) & 0x3F) as TeamId;
    }
    let mut match_nos = [0u8; 5];
    for (i, slot) in match_nos.iter_mut().enumerate() {
        *slot = 73 + ((key >> (36 + i * 6)) & 0x3F) as u8;
    }
    (champion, match_nos, opponents)
}

impl Counters {
    pub fn zeroed() -> Counters {
        Counters {
            n: 0,
            stage_exact: [[0; NUM_TEAMS]; 7],
            group_pos: [[0; NUM_TEAMS]; 4],
            third_qualified: [0; NUM_TEAMS],
            third_place_winner: [0; NUM_TEAMS],
            points_sum: [0; NUM_TEAMS],
            gd_sum: [0; NUM_TEAMS],
            r32_opp: vec![0; NUM_TEAMS * NUM_TEAMS],
            ko_slot: vec![0; 32 * 2 * NUM_TEAMS],
            goals: 0,
            group_goals: 0,
            matches: 0,
            title_paths: HashMap::new(),
        }
    }

    pub fn absorb(&mut self, r: &TournamentResult) {
        self.n += 1;
        for t in 0..NUM_TEAMS {
            self.stage_exact[r.stage[t] as usize][t] += 1;
            self.group_pos[r.group_pos[t] as usize][t] += 1;
            if r.group_pos[t] == 2 && r.stage[t] > 0 {
                self.third_qualified[t] += 1;
            }
            self.points_sum[t] += r.points[t] as u64;
            self.gd_sum[t] += r.gd[t] as i64;
            let opp = r.r32_opponent[t];
            if opp != u8::MAX {
                self.r32_opp[t * NUM_TEAMS + opp as usize] += 1;
            }
        }
        for m in 0..32 {
            self.ko_slot[(m * 2) * NUM_TEAMS + r.ko_a[m] as usize] += 1;
            self.ko_slot[(m * 2 + 1) * NUM_TEAMS + r.ko_b[m] as usize] += 1;
        }
        self.third_place_winner[r.third_place as usize] += 1;
        self.goals += r.total_goals as u64;
        self.group_goals += r.group_goals as u64;
        self.matches += r.matches as u64;
        if r.champion != TeamId::MAX {
            let path = champion_title_path(r.champion, &r.ko_a, &r.ko_b);
            let key = pack_title_path_key(r.champion as usize, path.match_nos, path.opponents);
            *self.title_paths.entry(key).or_insert(0) += 1;
        }
    }

    pub fn merge(mut self, other: Counters) -> Counters {
        self.n += other.n;
        for s in 0..7 {
            for t in 0..NUM_TEAMS {
                self.stage_exact[s][t] += other.stage_exact[s][t];
            }
        }
        for p in 0..4 {
            for t in 0..NUM_TEAMS {
                self.group_pos[p][t] += other.group_pos[p][t];
            }
        }
        for t in 0..NUM_TEAMS {
            self.third_qualified[t] += other.third_qualified[t];
            self.third_place_winner[t] += other.third_place_winner[t];
            self.points_sum[t] += other.points_sum[t];
            self.gd_sum[t] += other.gd_sum[t];
        }
        for i in 0..NUM_TEAMS * NUM_TEAMS {
            self.r32_opp[i] += other.r32_opp[i];
        }
        for i in 0..32 * 2 * NUM_TEAMS {
            self.ko_slot[i] += other.ko_slot[i];
        }
        self.goals += other.goals;
        self.group_goals += other.group_goals;
        self.matches += other.matches;
        for (key, count) in other.title_paths {
            *self.title_paths.entry(key).or_insert(0) += count;
        }
        self
    }

    pub fn avg_group_goals_per_match(&self) -> f64 {
        self.group_goals as f64 / (self.n.max(1) * 72) as f64
    }

    pub fn reached(&self, stage: u8, team: usize) -> u64 {
        (stage..=STAGE_CHAMPION)
            .map(|s| self.stage_exact[s as usize][team])
            .sum()
    }
}

#[derive(Debug, Serialize)]
pub struct GroupPositionDist {
    pub first: f64,
    pub second: f64,
    pub third_qualified: f64,
    pub third_eliminated: f64,
    pub fourth: f64,
}

#[derive(Debug, Serialize)]
pub struct R32Opponent {
    pub code: String,
    pub p: f64,
}

#[derive(Debug, Serialize)]
pub struct TitlePath {
    pub matches: Vec<u8>,
    pub opponents: Vec<String>,
    pub p: f64,
    pub p_given_title: f64,
}

#[derive(Debug, Serialize)]
pub struct TeamRow {
    pub code: String,
    pub name: String,
    pub group: char,
    pub elo: f64,
    pub elo_rank: u8,
    pub win: f64,
    #[serde(rename = "final")]
    pub final_: f64,
    pub sf: f64,
    pub qf: f64,
    pub r16: f64,
    pub r32: f64,
    pub third_place_win: f64,
    pub expected_points: f64,
    pub expected_gd: f64,
    pub group_position: GroupPositionDist,
    pub r32_opponents: Vec<R32Opponent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title_path: Option<TitlePath>,
}

fn mode_title_path(c: &Counters, teams: &Teams, team: usize, n: f64) -> Option<TitlePath> {
    let wins = c.stage_exact[STAGE_CHAMPION as usize][team];
    if wins == 0 {
        return None;
    }
    let mut best: Option<(u128, u64)> = None;
    for (&key, &count) in &c.title_paths {
        if (key & 0x3F) as usize != team {
            continue;
        }
        best = Some(match best {
            None => (key, count),
            Some((bk, bc)) => {
                if count > bc || (count == bc && key < bk) {
                    (key, count)
                } else {
                    (bk, bc)
                }
            }
        });
    }
    let (key, count) = best?;
    let (_, match_nos, opponents) = unpack_title_path_key(key);
    Some(TitlePath {
        matches: match_nos.to_vec(),
        opponents: opponents
            .iter()
            .map(|&o| teams.teams[o as usize].code.clone())
            .collect(),
        p: count as f64 / n,
        p_given_title: count as f64 / wins as f64,
    })
}

#[derive(Debug, Serialize)]
pub struct Report {
    pub simulations: u64,
    pub seed: u64,
    pub dynamic_elo: bool,
    pub pens: String,
    pub elo_snapshot_date: String,
    pub elo_source: String,
    pub results_updated: Option<String>,
    pub fixed_matches: u16,
    pub avg_goals_per_match: f64,
    pub teams: Vec<TeamRow>,
    pub fixtures: Vec<Fixture>,
}

pub struct ReportMeta {
    pub seed: u64,
    pub dynamic_elo: bool,
    pub pens: String,
    pub results_updated: Option<String>,
    pub fixed_matches: u16,
}

pub fn build_report(
    c: &Counters,
    teams: &Teams,
    meta: &ReportMeta,
    mut fixtures: Vec<Fixture>,
) -> Report {
    let n = c.n.max(1) as f64;

    let top_slot = |slot: usize| -> Vec<SlotLikely> {
        let mut counts: Vec<(usize, u64)> = (0..NUM_TEAMS)
            .map(|t| (t, c.ko_slot[slot * NUM_TEAMS + t]))
            .filter(|&(_, count)| count > 0)
            .collect();
        counts.sort_by_key(|&(t, count)| (std::cmp::Reverse(count), t));
        counts
            .into_iter()
            .take(3)
            .map(|(t, count)| SlotLikely {
                code: teams.teams[t].code.clone(),
                p: count as f64 / n,
            })
            .collect()
    };
    for fx in fixtures.iter_mut() {
        if fx.match_no >= 73 && fx.home.is_none() {
            let m = (fx.match_no - 73) as usize;
            fx.likely_home = top_slot(m * 2);
            fx.likely_away = top_slot(m * 2 + 1);
        }
    }
    let mut order: Vec<usize> = (0..NUM_TEAMS).collect();
    order.sort_by_key(|&t| (std::cmp::Reverse(c.stage_exact[6][t]), t));

    let mut elo_order: Vec<usize> = (0..NUM_TEAMS).collect();
    elo_order.sort_by(|&a, &b| {
        teams.teams[b]
            .elo
            .partial_cmp(&teams.teams[a].elo)
            .unwrap()
            .then(teams.teams[a].fifa_rank.cmp(&teams.teams[b].fifa_rank))
    });
    let mut elo_rank = [0u8; NUM_TEAMS];
    for (rank, &t) in elo_order.iter().enumerate() {
        elo_rank[t] = rank as u8 + 1;
    }

    let rows = order
        .into_iter()
        .map(|t| {
            let team = &teams.teams[t];
            let mut opponents: Vec<(usize, u64)> = (0..NUM_TEAMS)
                .map(|o| (o, c.r32_opp[t * NUM_TEAMS + o]))
                .filter(|&(_, count)| count > 0)
                .collect();
            opponents.sort_by_key(|&(o, count)| (std::cmp::Reverse(count), o));
            let r32_opponents = opponents
                .into_iter()
                .take(8)
                .map(|(o, count)| R32Opponent {
                    code: teams.teams[o].code.clone(),
                    p: count as f64 / n,
                })
                .collect();
            TeamRow {
                code: team.code.clone(),
                name: team.name.clone(),
                group: team.group,
                elo: team.elo,
                elo_rank: elo_rank[t],
                r32_opponents,
                win: c.stage_exact[6][t] as f64 / n,
                final_: c.reached(5, t) as f64 / n,
                sf: c.reached(4, t) as f64 / n,
                qf: c.reached(3, t) as f64 / n,
                r16: c.reached(2, t) as f64 / n,
                r32: c.reached(1, t) as f64 / n,
                third_place_win: c.third_place_winner[t] as f64 / n,
                expected_points: c.points_sum[t] as f64 / n,
                expected_gd: c.gd_sum[t] as f64 / n,
                group_position: GroupPositionDist {
                    first: c.group_pos[0][t] as f64 / n,
                    second: c.group_pos[1][t] as f64 / n,
                    third_qualified: c.third_qualified[t] as f64 / n,
                    third_eliminated: (c.group_pos[2][t] - c.third_qualified[t]) as f64 / n,
                    fourth: c.group_pos[3][t] as f64 / n,
                },
                title_path: mode_title_path(c, teams, t, n),
            }
        })
        .collect();

    Report {
        simulations: c.n,
        seed: meta.seed,
        dynamic_elo: meta.dynamic_elo,
        pens: meta.pens.clone(),
        elo_snapshot_date: teams.snapshot_date.clone(),
        elo_source: teams.source.clone(),
        results_updated: meta.results_updated.clone(),
        fixed_matches: meta.fixed_matches,
        avg_goals_per_match: c.goals as f64 / c.matches.max(1) as f64,
        teams: rows,
        fixtures,
    }
}

fn pct(p: f64) -> String {
    format!("{:.1}%", p * 100.0)
}

pub fn format_table(report: &Report) -> String {
    let mut out = String::new();
    out.push_str(&format!(
        "{:<5} {:<20} {:<6} {:>6} {:>7} {:>6} {:>6} {:>6} {:>6}\n",
        "Rank", "Team", "Group", "Win%", "Final%", "SF%", "QF%", "R16%", "R32%"
    ));
    for (i, row) in report.teams.iter().enumerate() {
        out.push_str(&format!(
            "{:<5} {:<20} {:<6} {:>6} {:>7} {:>6} {:>6} {:>6} {:>6}\n",
            i + 1,
            row.name,
            row.group,
            pct(row.win),
            pct(row.final_),
            pct(row.sf),
            pct(row.qf),
            pct(row.r16),
            pct(row.r32),
        ));
    }
    out
}

pub fn format_csv(report: &Report) -> String {
    let mut out = String::from(
        "rank,code,name,group,win,final,sf,qf,r16,r32,third_place_win,expected_points,expected_gd,p_group_1st,p_group_2nd,p_3rd_qualified,p_3rd_eliminated,p_group_4th\n",
    );
    for (i, r) in report.teams.iter().enumerate() {
        out.push_str(&format!(
            "{},{},{},{},{:.6},{:.6},{:.6},{:.6},{:.6},{:.6},{:.6},{:.4},{:.4},{:.6},{:.6},{:.6},{:.6},{:.6}\n",
            i + 1,
            r.code,
            r.name,
            r.group,
            r.win,
            r.final_,
            r.sf,
            r.qf,
            r.r16,
            r.r32,
            r.third_place_win,
            r.expected_points,
            r.expected_gd,
            r.group_position.first,
            r.group_position.second,
            r.group_position.third_qualified,
            r.group_position.third_eliminated,
            r.group_position.fourth,
        ));
    }
    out
}

pub fn format_team_detail(c: &Counters, teams: &Teams, report: &Report, team: usize) -> String {
    let code = &teams.teams[team].code;
    let row = report
        .teams
        .iter()
        .find(|r| &r.code == code)
        .expect("team is in report");
    let n = c.n.max(1) as f64;

    let mut out = String::new();
    out.push_str(&format!(
        "{} ({}) — Group {}\n\n",
        row.name, row.code, row.group
    ));
    out.push_str("Stage probabilities\n");
    for (label, p) in [
        ("Reach R32", row.r32),
        ("Reach R16", row.r16),
        ("Reach QF", row.qf),
        ("Reach SF", row.sf),
        ("Reach Final", row.final_),
        ("Win title", row.win),
        ("Win 3rd-place match", row.third_place_win),
    ] {
        out.push_str(&format!("  {:<22} {:>6}\n", label, pct(p)));
    }
    out.push_str(&format!(
        "\nGroup stage: expected points {:.2}, expected GD {:+.2}\n",
        row.expected_points, row.expected_gd
    ));
    out.push_str("Group finish distribution\n");
    for (label, p) in [
        ("1st", row.group_position.first),
        ("2nd", row.group_position.second),
        ("3rd (qualified)", row.group_position.third_qualified),
        ("3rd (eliminated)", row.group_position.third_eliminated),
        ("4th", row.group_position.fourth),
    ] {
        out.push_str(&format!("  {:<22} {:>6}\n", label, pct(p)));
    }

    let mut opponents: Vec<(usize, u64)> = (0..NUM_TEAMS)
        .map(|o| (o, c.r32_opp[team * NUM_TEAMS + o]))
        .filter(|&(_, count)| count > 0)
        .collect();
    opponents.sort_by_key(|&(o, count)| (std::cmp::Reverse(count), o));
    out.push_str("\nMost likely R32 opponents\n");
    for (o, count) in opponents.into_iter().take(10) {
        out.push_str(&format!(
            "  {:<22} {:>6}\n",
            teams.teams[o].name,
            pct(count as f64 / n)
        ));
    }
    out
}
