#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Slot {
    Winner(u8),
    RunnerUp(u8),
    Third(u8),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KoSource {
    WinnerOf(u8),
    LoserOf(u8),
}

pub const THIRD_SLOT_MATCHES: [u8; 8] = [74, 77, 79, 80, 81, 82, 85, 87];

// FIFA World Cup 26 Regulations Art. 12.6: round of 32, matches 73-88.
pub const R32: [(u8, Slot, Slot); 16] = [
    (73, Slot::RunnerUp(0), Slot::RunnerUp(1)),
    (74, Slot::Winner(4), Slot::Third(0)),
    (75, Slot::Winner(5), Slot::RunnerUp(2)),
    (76, Slot::Winner(2), Slot::RunnerUp(5)),
    (77, Slot::Winner(8), Slot::Third(1)),
    (78, Slot::RunnerUp(4), Slot::RunnerUp(8)),
    (79, Slot::Winner(0), Slot::Third(2)),
    (80, Slot::Winner(11), Slot::Third(3)),
    (81, Slot::Winner(3), Slot::Third(4)),
    (82, Slot::Winner(6), Slot::Third(5)),
    (83, Slot::RunnerUp(10), Slot::RunnerUp(11)),
    (84, Slot::Winner(7), Slot::RunnerUp(9)),
    (85, Slot::Winner(1), Slot::Third(6)),
    (86, Slot::Winner(9), Slot::RunnerUp(7)),
    (87, Slot::Winner(10), Slot::Third(7)),
    (88, Slot::RunnerUp(3), Slot::RunnerUp(6)),
];

// Art. 12.7-12.9: round of 16 through final, matches 89-104.
pub const KNOCKOUT: [(u8, KoSource, KoSource); 16] = [
    (89, KoSource::WinnerOf(74), KoSource::WinnerOf(77)),
    (90, KoSource::WinnerOf(73), KoSource::WinnerOf(75)),
    (91, KoSource::WinnerOf(76), KoSource::WinnerOf(78)),
    (92, KoSource::WinnerOf(79), KoSource::WinnerOf(80)),
    (93, KoSource::WinnerOf(83), KoSource::WinnerOf(84)),
    (94, KoSource::WinnerOf(81), KoSource::WinnerOf(82)),
    (95, KoSource::WinnerOf(86), KoSource::WinnerOf(88)),
    (96, KoSource::WinnerOf(85), KoSource::WinnerOf(87)),
    (97, KoSource::WinnerOf(89), KoSource::WinnerOf(90)),
    (98, KoSource::WinnerOf(93), KoSource::WinnerOf(94)),
    (99, KoSource::WinnerOf(91), KoSource::WinnerOf(92)),
    (100, KoSource::WinnerOf(95), KoSource::WinnerOf(96)),
    (101, KoSource::WinnerOf(97), KoSource::WinnerOf(98)),
    (102, KoSource::WinnerOf(99), KoSource::WinnerOf(100)),
    (103, KoSource::LoserOf(101), KoSource::LoserOf(102)),
    (104, KoSource::WinnerOf(101), KoSource::WinnerOf(102)),
];

use crate::data::TeamId;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TitlePathOutcome {
    pub match_nos: [u8; 5],
    pub opponents: [TeamId; 5],
}

fn next_winner_match(current: u8) -> u8 {
    for &(m, sa, sb) in &KNOCKOUT {
        if m == 103 {
            continue;
        }
        for src in [sa, sb] {
            if matches!(src, KoSource::WinnerOf(p) if p == current) {
                return m;
            }
        }
    }
    panic!("no knockout match feeds winner of match {current}");
}

/// Opponents the champion defeats at R32 → R16 → QF → SF → Final (match 103 excluded).
pub fn champion_title_path(
    champion: TeamId,
    ko_a: &[TeamId; 32],
    ko_b: &[TeamId; 32],
) -> TitlePathOutcome {
    let mut match_no = R32
        .iter()
        .find(|&&(m, _, _)| {
            let idx = (m - 73) as usize;
            ko_a[idx] == champion || ko_b[idx] == champion
        })
        .map(|&(m, _, _)| m)
        .expect("champion must appear in round of 32");

    let mut outcome = TitlePathOutcome {
        match_nos: [0; 5],
        opponents: [TeamId::MAX; 5],
    };

    for stage in 0..5 {
        let idx = (match_no - 73) as usize;
        let opp = if ko_a[idx] == champion {
            ko_b[idx]
        } else {
            ko_a[idx]
        };
        outcome.match_nos[stage] = match_no;
        outcome.opponents[stage] = opp;
        if stage < 4 {
            match_no = next_winner_match(match_no);
        }
    }
    outcome
}

pub fn stage_of_match(match_no: u8) -> u8 {
    match match_no {
        73..=88 => 1,
        89..=96 => 2,
        97..=100 => 3,
        101..=102 => 4,
        103 => 5,
        104 => 6,
        _ => panic!("invalid knockout match number {match_no}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn r32_uses_every_group_slot_exactly_once() {
        let mut winners = [0u8; 12];
        let mut runners = [0u8; 12];
        let mut thirds = [0u8; 8];
        for &(_, a, b) in &R32 {
            for slot in [a, b] {
                match slot {
                    Slot::Winner(g) => winners[g as usize] += 1,
                    Slot::RunnerUp(g) => runners[g as usize] += 1,
                    Slot::Third(s) => thirds[s as usize] += 1,
                }
            }
        }
        assert_eq!(winners, [1; 12]);
        assert_eq!(runners, [1; 12]);
        assert_eq!(thirds, [1; 8]);
    }

    #[test]
    fn third_slots_align_with_their_matches() {
        for &(m, _, b) in &R32 {
            if let Slot::Third(s) = b {
                assert_eq!(THIRD_SLOT_MATCHES[s as usize], m);
            }
        }
    }

    #[test]
    fn knockout_consumes_every_prior_match_exactly_once() {
        let mut consumed = [0u8; 32];
        for &(m, a, b) in &KNOCKOUT {
            for src in [a, b] {
                let prior = match src {
                    KoSource::WinnerOf(p) | KoSource::LoserOf(p) => p,
                };
                assert!(prior < m, "match {m} references later match {prior}");
                consumed[(prior - 73) as usize] += 1;
            }
        }
        // 73-88 winners feed R16; 89-100 winners feed QF/SF; 101/102 feed final
        // AND third-place playoff (winner + loser), so they are consumed twice.
        for prior in 73..=100u8 {
            assert_eq!(consumed[(prior - 73) as usize], 1, "match {prior}");
        }
        assert_eq!(consumed[(101 - 73) as usize], 2);
        assert_eq!(consumed[(102 - 73) as usize], 2);
        assert_eq!(consumed[(103 - 73) as usize], 0);
        assert_eq!(consumed[(104 - 73) as usize], 0);
    }

    #[test]
    fn match_numbers_sequential() {
        for (i, &(m, _, _)) in R32.iter().enumerate() {
            assert_eq!(m, 73 + i as u8);
        }
        for (i, &(m, _, _)) in KNOCKOUT.iter().enumerate() {
            assert_eq!(m, 89 + i as u8);
        }
    }

    #[test]
    fn stages() {
        assert_eq!(stage_of_match(73), 1);
        assert_eq!(stage_of_match(96), 2);
        assert_eq!(stage_of_match(100), 3);
        assert_eq!(stage_of_match(102), 4);
        assert_eq!(stage_of_match(104), 6);
    }

    #[test]
    fn champion_title_path_follows_bracket_feeders() {
        let mut ko_a = [TeamId::MAX; 32];
        let mut ko_b = [TeamId::MAX; 32];
        // Champion (team 1) wins R32 m85, R16 m96, QF m100, SF m102, Final m104.
        ko_a[12] = 1;
        ko_b[12] = 10; // m85
        ko_a[23] = 1;
        ko_b[23] = 11; // m96
        ko_a[27] = 1;
        ko_b[27] = 12; // m100
        ko_a[29] = 1;
        ko_b[29] = 13; // m102
        ko_a[31] = 1;
        ko_b[31] = 14; // m104

        let path = champion_title_path(1, &ko_a, &ko_b);
        assert_eq!(path.match_nos, [85, 96, 100, 102, 104]);
        assert_eq!(path.opponents, [10, 11, 12, 13, 14]);
    }
}
