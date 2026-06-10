pub const GROUP_SCHEDULE: [(u8, u8); 6] = [(0, 1), (2, 3), (0, 2), (3, 1), (3, 0), (1, 2)];

#[derive(Debug, Clone, Copy, Default)]
pub struct TeamStats {
    pub points: u8,
    pub gf: u8,
    pub ga: u8,
}

impl TeamStats {
    pub fn gd(&self) -> i16 {
        self.gf as i16 - self.ga as i16
    }
}

#[derive(Debug, Clone, Copy)]
pub struct GroupResult {
    pub order: [u8; 4],
    pub stats: [TeamStats; 4],
}

pub fn compute_stats(goals: &[[u8; 4]; 4]) -> [TeamStats; 4] {
    let mut stats = [TeamStats::default(); 4];
    for &(a, b) in &GROUP_SCHEDULE {
        let (a, b) = (a as usize, b as usize);
        let (ga, gb) = (goals[a][b], goals[b][a]);
        stats[a].gf += ga;
        stats[a].ga += gb;
        stats[b].gf += gb;
        stats[b].ga += ga;
        match ga.cmp(&gb) {
            std::cmp::Ordering::Greater => stats[a].points += 3,
            std::cmp::Ordering::Equal => {
                stats[a].points += 1;
                stats[b].points += 1;
            }
            std::cmp::Ordering::Less => stats[b].points += 3,
        }
    }
    stats
}

pub fn rank_group(goals: &[[u8; 4]; 4], fifa: &[u16; 4]) -> GroupResult {
    let stats = compute_stats(goals);
    let mut order: [u8; 4] = [0, 1, 2, 3];
    order.sort_unstable_by(|&a, &b| stats[b as usize].points.cmp(&stats[a as usize].points));

    let mut i = 0;
    while i < 4 {
        let mut j = i + 1;
        while j < 4 && stats[order[j] as usize].points == stats[order[i] as usize].points {
            j += 1;
        }
        resolve_tie(&mut order[i..j], goals, &stats, fifa);
        i = j;
    }

    GroupResult { order, stats }
}

fn h2h_key(team: u8, members: &[u8], goals: &[[u8; 4]; 4]) -> (i32, i32, i32) {
    let mut points = 0i32;
    let mut gf = 0i32;
    let mut ga = 0i32;
    for &other in members {
        if other == team {
            continue;
        }
        let (t, o) = (team as usize, other as usize);
        let (gt, go) = (goals[t][o] as i32, goals[o][t] as i32);
        gf += gt;
        ga += go;
        points += match gt.cmp(&go) {
            std::cmp::Ordering::Greater => 3,
            std::cmp::Ordering::Equal => 1,
            std::cmp::Ordering::Less => 0,
        };
    }
    (points, gf - ga, gf)
}

fn resolve_tie(subset: &mut [u8], goals: &[[u8; 4]; 4], stats: &[TeamStats; 4], fifa: &[u16; 4]) {
    if subset.len() <= 1 {
        return;
    }

    let mut members = [0u8; 4];
    members[..subset.len()].copy_from_slice(subset);
    let members = &members[..subset.len()];

    subset.sort_unstable_by_key(|&t| std::cmp::Reverse(h2h_key(t, members, goals)));

    let separated =
        h2h_key(subset[0], members, goals) != h2h_key(subset[subset.len() - 1], members, goals);

    if separated {
        let mut i = 0;
        while i < subset.len() {
            let mut j = i + 1;
            while j < subset.len()
                && h2h_key(subset[j], members, goals) == h2h_key(subset[i], members, goals)
            {
                j += 1;
            }
            resolve_tie(&mut subset[i..j], goals, stats, fifa);
            i = j;
        }
    } else {
        let overall = |t: u8| (stats[t as usize].gd(), stats[t as usize].gf);
        subset.sort_unstable_by_key(|&t| std::cmp::Reverse(overall(t)));
        let mut i = 0;
        while i < subset.len() {
            let mut j = i + 1;
            while j < subset.len() && overall(subset[j]) == overall(subset[i]) {
                j += 1;
            }
            subset[i..j].sort_unstable_by_key(|&t| fifa[t as usize]);
            i = j;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIFA: [u16; 4] = [10, 20, 30, 40];

    fn goals_from(results: &[(u8, u8, u8, u8)]) -> [[u8; 4]; 4] {
        let mut goals = [[0u8; 4]; 4];
        for &(a, b, ga, gb) in results {
            goals[a as usize][b as usize] = ga;
            goals[b as usize][a as usize] = gb;
        }
        goals
    }

    #[test]
    fn clean_order_by_points() {
        let goals = goals_from(&[
            (0, 1, 1, 0),
            (2, 3, 1, 0),
            (0, 2, 1, 0),
            (3, 1, 0, 1),
            (3, 0, 0, 1),
            (1, 2, 0, 1),
        ]);
        let r = rank_group(&goals, &FIFA);
        assert_eq!(r.order, [0, 2, 1, 3]);
        assert_eq!(r.stats[0].points, 9);
        assert_eq!(r.stats[3].points, 0);
    }

    #[test]
    fn h2h_beats_overall_gd() {
        // Teams 0 and 1 finish level on points. Team 1 has the much better
        // overall GD, but team 0 won the mutual match -> official rules rank 0 first.
        let goals = goals_from(&[
            (0, 1, 1, 0), // 0 beats 1
            (2, 3, 0, 1), // 3 beats 2
            (0, 2, 0, 2), // 2 beats 0
            (3, 1, 0, 4), // 1 crushes 3
            (3, 0, 0, 1), // 0 beats 3
            (1, 2, 3, 0), // 1 crushes 2
        ]);
        let r = rank_group(&goals, &FIFA);
        assert_eq!(r.stats[0].points, 6);
        assert_eq!(r.stats[1].points, 6);
        assert!(r.stats[1].gd() > r.stats[0].gd());
        assert_eq!(
            r.order[0], 0,
            "H2H winner must rank above better overall GD"
        );
        assert_eq!(r.order[1], 1);
        // 2 and 3 are tied on 3 points; 3 won the mutual match
        assert_eq!(r.order[2], 3);
        assert_eq!(r.order[3], 2);
    }

    #[test]
    fn three_way_tie_partial_h2h_then_overall_gd() {
        // 0, 1, 2 all on 6 points (each beat team 3 and went 1-1 in the cycle).
        // Mutual results: 0 beats 1 2-0, 1 beats 2 1-0, 2 beats 0 1-0.
        // H2H mini-table: 0 has gd +1, 1 has gd -1... compute:
        //   0: 3pts, gf 2 ga 1 -> gd +1; 1: 3pts, gf 1 ga 2 -> gd -1; 2: 3pts, gf 1 ga 1 -> gd 0
        // So order 0, 2, 1 purely on H2H GD.
        let goals = goals_from(&[
            (0, 1, 2, 0),
            (2, 3, 2, 0),
            (0, 2, 0, 1),
            (3, 1, 0, 3),
            (3, 0, 0, 1),
            (1, 2, 1, 0),
        ]);
        let r = rank_group(&goals, &FIFA);
        assert_eq!(r.order, [0, 2, 1, 3]);
    }

    #[test]
    fn h2h_separates_one_then_reapplies_to_rest() {
        // 0, 1, 2 tied on points. 0 beat both 1 and 2 (clear top on H2H points).
        // 1 and 2 drew their mutual match -> reapplied H2H is level -> overall GD decides.
        // Give 2 the better overall GD via the match against 3.
        let goals = goals_from(&[
            (0, 1, 1, 0),
            (2, 3, 4, 0),
            (0, 2, 1, 0),
            (3, 1, 1, 2),
            (3, 0, 1, 0), // 3 beats 0, so 0 ends on 6 pts
            (1, 2, 1, 1),
        ]);
        // points: 0 = 6, 1 = 4, 2 = 4, 3 = 3
        let r = rank_group(&goals, &FIFA);
        assert_eq!(r.stats[1].points, 4);
        assert_eq!(r.stats[2].points, 4);
        assert!(r.stats[2].gd() > r.stats[1].gd());
        assert_eq!(r.order, [0, 2, 1, 3]);
    }

    #[test]
    fn fully_symmetric_falls_to_fifa_rank() {
        // All six matches 0-0: identical points, H2H, GD, GF -> FIFA rank order.
        let goals = [[0u8; 4]; 4];
        let r = rank_group(&goals, &FIFA);
        assert_eq!(r.order, [0, 1, 2, 3]);
        let fifa_rev = [40u16, 30, 20, 10];
        let r = rank_group(&goals, &fifa_rev);
        assert_eq!(r.order, [3, 2, 1, 0]);
    }

    #[test]
    fn two_way_tie_h2h_draw_overall_gf_decides() {
        // 0 and 1 tied on points, drew mutual match, equal GD, different GF.
        let goals = goals_from(&[
            (0, 1, 1, 1),
            (2, 3, 1, 0),
            (0, 2, 2, 0),
            (3, 1, 2, 4),
            (3, 0, 1, 2),
            (1, 2, 2, 1),
        ]);
        // 0: 7 pts, gf 5 ga 2; 1: 7 pts, gf 7 ga 4 -> same gd +3, 1 has more gf
        let r = rank_group(&goals, &FIFA);
        assert_eq!(r.stats[0].points, 7);
        assert_eq!(r.stats[1].points, 7);
        assert_eq!(r.stats[0].gd(), r.stats[1].gd());
        assert_eq!(r.order[0], 1);
        assert_eq!(r.order[1], 0);
    }
}
