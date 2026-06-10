use wc2026_simulation::data::{TeamId, Teams, group_index};
use wc2026_simulation::tournament::{Config, FullRecorder, SimData, run_seed, simulate_one};

#[test]
fn bracket_integrity_over_many_tournaments() {
    let teams = Teams::load();
    let data = SimData::new(&teams);
    let cfg = Config::default();

    for run in 0..1000u64 {
        let mut rec = FullRecorder::default();
        let result = simulate_one(&data, &cfg, run_seed(99, run), &mut rec);

        assert_eq!(rec.group_matches.len(), 72);
        assert_eq!(rec.ko_matches.len(), 32);
        assert_eq!(result.matches, 104);

        let r32: Vec<_> = rec
            .ko_matches
            .iter()
            .filter(|(m, ..)| (73..=88).contains(m))
            .collect();
        assert_eq!(r32.len(), 16);

        let mut r32_teams = std::collections::HashSet::new();
        for &&(_, a, b, _) in &r32 {
            assert!(r32_teams.insert(a), "team {a} plays twice in R32");
            assert!(r32_teams.insert(b), "team {b} plays twice in R32");
        }
        assert_eq!(r32_teams.len(), 32);

        // winners and runners-up of the same group never meet in R32
        let mut winners = [TeamId::MAX; 12];
        let mut runners = [TeamId::MAX; 12];
        for (g, members, gr) in &rec.group_tables {
            winners[*g as usize] = members[gr.order[0] as usize];
            runners[*g as usize] = members[gr.order[1] as usize];
        }
        for &&(m, a, b, _) in &r32 {
            for g in 0..12 {
                let pair = [winners[g], runners[g]];
                assert!(
                    !(pair.contains(&a) && pair.contains(&b)),
                    "match {m}: group winner meets own runner-up"
                );
            }
        }

        // every round has each participant at most once
        for range in [89..=96u8, 97..=100, 101..=102, 103..=103, 104..=104] {
            let mut seen = std::collections::HashSet::new();
            for &(_, a, b, _) in rec.ko_matches.iter().filter(|(m, ..)| range.contains(m)) {
                assert!(seen.insert(a));
                assert!(seen.insert(b));
            }
        }

        // R32 field = 12 winners + 12 runners-up + 8 thirds, with thirds from 8 distinct groups
        for g in 0..12 {
            assert!(r32_teams.contains(&winners[g]));
            assert!(r32_teams.contains(&runners[g]));
        }
        let thirds: Vec<TeamId> = r32_teams
            .iter()
            .copied()
            .filter(|t| !winners.contains(t) && !runners.contains(t))
            .collect();
        assert_eq!(thirds.len(), 8);
        let third_groups: std::collections::HashSet<usize> = thirds
            .iter()
            .map(|&t| group_index(teams.teams[t as usize].group))
            .collect();
        assert_eq!(third_groups.len(), 8);
    }
}
