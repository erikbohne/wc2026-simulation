use crate::bracket::{KNOCKOUT, KoSource};
use crate::data::{NUM_GROUPS, TeamId, Teams, group_index};
use crate::group::GROUP_SCHEDULE;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ResultsFile {
    pub updated: String,
    pub matches: Vec<MatchEntry>,
}

#[derive(Debug, Deserialize)]
pub struct MatchEntry {
    #[serde(rename = "match")]
    pub match_no: Option<u8>,
    pub home: String,
    pub away: String,
    pub score: (u8, u8),
    #[serde(default)]
    pub extra_time: bool,
    #[serde(default)]
    pub penalties: bool,
    pub winner: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub struct FixedKo {
    pub a: TeamId,
    pub b: TeamId,
    pub goals_a: u8,
    pub goals_b: u8,
    pub extra_time: bool,
    pub penalties: bool,
    pub winner: TeamId,
}

#[derive(Debug, Clone, Copy)]
pub struct FixedResults {
    pub group: [[Option<(u8, u8)>; 6]; NUM_GROUPS],
    pub ko: [Option<FixedKo>; 32],
    pub count: u16,
}

pub const EMPTY: FixedResults = FixedResults {
    group: [[None; 6]; NUM_GROUPS],
    ko: [None; 32],
    count: 0,
};

impl FixedResults {
    pub fn parse(json: &str, teams: &Teams) -> Result<(FixedResults, String), String> {
        let file: ResultsFile =
            serde_json::from_str(json).map_err(|e| format!("invalid results JSON: {e}"))?;
        let fixed = FixedResults::from_entries(&file.matches, teams)?;
        Ok((fixed, file.updated))
    }

    pub fn from_entries(entries: &[MatchEntry], teams: &Teams) -> Result<FixedResults, String> {
        let mut fixed = EMPTY;
        for e in entries {
            let label = format!("{} vs {}", e.home, e.away);
            let home = teams
                .index_of(&e.home)
                .ok_or(format!("{label}: unknown team code {}", e.home))?;
            let away = teams
                .index_of(&e.away)
                .ok_or(format!("{label}: unknown team code {}", e.away))?;
            if home == away {
                return Err(format!("{label}: a team cannot play itself"));
            }
            match e.match_no {
                None => fixed.add_group(e, home, away, teams, &label)?,
                Some(m) => fixed.add_ko(e, m, home, away, teams, &label)?,
            }
            fixed.count += 1;
        }
        fixed.validate_ko_order()?;
        Ok(fixed)
    }

    fn add_group(
        &mut self,
        e: &MatchEntry,
        home: TeamId,
        away: TeamId,
        teams: &Teams,
        label: &str,
    ) -> Result<(), String> {
        if e.extra_time || e.penalties || e.winner.is_some() {
            return Err(format!(
                "{label}: group matches cannot have extra_time, penalties, or winner"
            ));
        }
        let gh = group_index(teams.teams[home as usize].group);
        let ga = group_index(teams.teams[away as usize].group);
        if gh != ga {
            return Err(format!("{label}: teams are not in the same group"));
        }
        let members = teams.groups[gh];
        let sh = members.iter().position(|&t| t == home).unwrap() as u8;
        let sa = members.iter().position(|&t| t == away).unwrap() as u8;
        let si = GROUP_SCHEDULE
            .iter()
            .position(|&(x, y)| (x, y) == (sh, sa) || (x, y) == (sa, sh))
            .unwrap();
        if self.group[gh][si].is_some() {
            return Err(format!("{label}: duplicate result"));
        }
        let (ia, _) = GROUP_SCHEDULE[si];
        self.group[gh][si] = if ia == sh {
            Some((e.score.0, e.score.1))
        } else {
            Some((e.score.1, e.score.0))
        };
        Ok(())
    }

    fn add_ko(
        &mut self,
        e: &MatchEntry,
        m: u8,
        home: TeamId,
        away: TeamId,
        teams: &Teams,
        label: &str,
    ) -> Result<(), String> {
        if !(73..=104).contains(&m) {
            return Err(format!(
                "{label}: knockout match number {m} not in 73..=104"
            ));
        }
        if self.ko[(m - 73) as usize].is_some() {
            return Err(format!("{label}: duplicate result for match {m}"));
        }
        let (gh, ga) = e.score;
        let winner = match &e.winner {
            Some(code) => {
                let w = teams
                    .index_of(code)
                    .ok_or(format!("{label}: unknown winner code {code}"))?;
                if w != home && w != away {
                    return Err(format!("{label}: winner {code} did not play this match"));
                }
                w
            }
            None if gh != ga => {
                if gh > ga {
                    home
                } else {
                    away
                }
            }
            None => {
                return Err(format!(
                    "{label}: tied knockout match {m} requires a winner"
                ));
            }
        };
        if gh != ga {
            let on_score = if gh > ga { home } else { away };
            if winner != on_score {
                return Err(format!("{label}: winner contradicts the score"));
            }
            if e.penalties {
                return Err(format!("{label}: penalties require a tied score"));
            }
        } else if !e.penalties {
            return Err(format!(
                "{label}: tied knockout match {m} must be decided by penalties"
            ));
        }
        self.ko[(m - 73) as usize] = Some(FixedKo {
            a: home,
            b: away,
            goals_a: gh,
            goals_b: ga,
            extra_time: e.extra_time || e.penalties,
            penalties: e.penalties,
            winner,
        });
        Ok(())
    }

    fn validate_ko_order(&self) -> Result<(), String> {
        let group_complete = self.group.iter().all(|g| g.iter().all(|m| m.is_some()));
        for m in 73..=88u8 {
            if self.ko[(m - 73) as usize].is_some() && !group_complete {
                return Err(format!(
                    "match {m}: knockout results require the full group stage to be played"
                ));
            }
        }
        for &(m, sa, sb) in &KNOCKOUT {
            if self.ko[(m - 73) as usize].is_none() {
                continue;
            }
            for src in [sa, sb] {
                let p = match src {
                    KoSource::WinnerOf(p) | KoSource::LoserOf(p) => p,
                };
                if self.ko[(p - 73) as usize].is_none() {
                    return Err(format!("match {m}: feeder match {p} has no result"));
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(home: &str, away: &str, score: (u8, u8)) -> MatchEntry {
        MatchEntry {
            match_no: None,
            home: home.into(),
            away: away.into(),
            score,
            extra_time: false,
            penalties: false,
            winner: None,
        }
    }

    fn group_codes(teams: &Teams, g: usize) -> [String; 4] {
        teams.groups[g].map(|t| teams.teams[t as usize].code.clone())
    }

    fn all_group_entries(teams: &Teams) -> Vec<MatchEntry> {
        let mut entries = Vec::new();
        for g in 0..NUM_GROUPS {
            let codes = group_codes(teams, g);
            for &(a, b) in &GROUP_SCHEDULE {
                entries.push(entry(&codes[a as usize], &codes[b as usize], (1, 0)));
            }
        }
        entries
    }

    #[test]
    fn empty_is_empty() {
        assert_eq!(EMPTY.count, 0);
        assert!(EMPTY.group.iter().flatten().all(|m| m.is_none()));
        assert!(EMPTY.ko.iter().all(|m| m.is_none()));
    }

    #[test]
    fn group_match_oriented_to_schedule() {
        let teams = Teams::load();
        let codes = group_codes(&teams, 0);
        // schedule pair (0,1) entered reversed: away-listed-first
        let fixed =
            FixedResults::from_entries(&[entry(&codes[1], &codes[0], (3, 1))], &teams).unwrap();
        assert_eq!(fixed.group[0][0], Some((1, 3)));
        assert_eq!(fixed.count, 1);
    }

    #[test]
    fn rejects_unknown_code_and_duplicates_and_cross_group() {
        let teams = Teams::load();
        let codes = group_codes(&teams, 0);
        assert!(FixedResults::from_entries(&[entry("XXX", &codes[0], (1, 0))], &teams).is_err());
        let dup = [
            entry(&codes[0], &codes[1], (1, 0)),
            entry(&codes[1], &codes[0], (0, 1)),
        ];
        assert!(FixedResults::from_entries(&dup, &teams).is_err());
        let other = group_codes(&teams, 1);
        assert!(
            FixedResults::from_entries(&[entry(&codes[0], &other[0], (1, 0))], &teams).is_err()
        );
    }

    #[test]
    fn ko_requires_complete_group_stage() {
        let teams = Teams::load();
        let codes = group_codes(&teams, 0);
        let mut e = entry(&codes[0], &codes[1], (2, 0));
        e.match_no = Some(73);
        assert!(FixedResults::from_entries(&[e], &teams).is_err());

        let mut entries = all_group_entries(&teams);
        let mut e = entry(&codes[0], &codes[1], (2, 0));
        e.match_no = Some(73);
        entries.push(e);
        let fixed = FixedResults::from_entries(&entries, &teams).unwrap();
        assert_eq!(fixed.count, 73);
        let ko = fixed.ko[0].unwrap();
        assert_eq!(ko.goals_a, 2);
        assert_eq!(ko.winner, ko.a);
    }

    #[test]
    fn ko_tie_needs_pens_and_winner() {
        let teams = Teams::load();
        let codes = group_codes(&teams, 0);
        let mut entries = all_group_entries(&teams);
        let mut e = entry(&codes[0], &codes[1], (1, 1));
        e.match_no = Some(73);
        entries.push(e);
        assert!(FixedResults::from_entries(&entries, &teams).is_err());

        let last = entries.last_mut().unwrap();
        last.penalties = true;
        last.winner = Some(codes[1].clone());
        let fixed = FixedResults::from_entries(&entries, &teams).unwrap();
        let ko = fixed.ko[0].unwrap();
        assert!(ko.penalties && ko.extra_time);
        assert_eq!(ko.winner, ko.b);
    }

    #[test]
    fn later_ko_requires_feeders() {
        let teams = Teams::load();
        let codes = group_codes(&teams, 0);
        let mut entries = all_group_entries(&teams);
        let mut e = entry(&codes[0], &codes[1], (2, 0));
        e.match_no = Some(90);
        entries.push(e);
        assert!(FixedResults::from_entries(&entries, &teams).is_err());
    }

    #[test]
    fn winner_must_match_score() {
        let teams = Teams::load();
        let codes = group_codes(&teams, 0);
        let mut entries = all_group_entries(&teams);
        let mut e = entry(&codes[0], &codes[1], (2, 0));
        e.match_no = Some(73);
        e.winner = Some(codes[1].clone());
        entries.push(e);
        assert!(FixedResults::from_entries(&entries, &teams).is_err());
    }
}
