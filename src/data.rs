use serde::Deserialize;

pub const NUM_TEAMS: usize = 48;
pub const NUM_GROUPS: usize = 12;

pub type TeamId = u8;

#[derive(Debug, Clone, Deserialize)]
pub struct Team {
    pub code: String,
    pub name: String,
    pub group: char,
    pub elo: f64,
    pub host: bool,
    pub fifa_rank: u16,
}

#[derive(Debug, Deserialize)]
pub struct TeamFile {
    pub snapshot_date: String,
    pub source: String,
    pub teams: Vec<Team>,
}

#[derive(Debug)]
pub struct Teams {
    pub teams: Vec<Team>,
    pub groups: [[TeamId; 4]; NUM_GROUPS],
    pub snapshot_date: String,
    pub source: String,
}

const TEAMS_JSON: &str = include_str!("../data/teams.json");

impl Teams {
    pub fn load() -> Teams {
        let file: TeamFile =
            serde_json::from_str(TEAMS_JSON).expect("embedded teams.json must parse");
        Teams::from_file(file)
    }

    fn from_file(file: TeamFile) -> Teams {
        assert_eq!(file.teams.len(), NUM_TEAMS, "expected 48 teams");

        let mut groups = [[TeamId::MAX; 4]; NUM_GROUPS];
        let mut group_fill = [0usize; NUM_GROUPS];
        let mut codes = std::collections::HashSet::new();
        let mut ranks = std::collections::HashSet::new();
        let mut hosts = 0;

        for (i, team) in file.teams.iter().enumerate() {
            assert!(
                codes.insert(team.code.clone()),
                "duplicate code {}",
                team.code
            );
            assert!(
                ranks.insert(team.fifa_rank),
                "duplicate fifa_rank {}",
                team.fifa_rank
            );
            assert!(
                team.elo > 1000.0 && team.elo < 2500.0,
                "implausible elo for {}",
                team.code
            );
            if team.host {
                hosts += 1;
            }
            let g = group_index(team.group);
            assert!(
                group_fill[g] < 4,
                "group {} has more than 4 teams",
                team.group
            );
            groups[g][group_fill[g]] = i as TeamId;
            group_fill[g] += 1;
        }

        assert_eq!(hosts, 3, "expected exactly 3 hosts");
        assert!(
            group_fill.iter().all(|&n| n == 4),
            "every group needs 4 teams"
        );

        Teams {
            teams: file.teams,
            groups,
            snapshot_date: file.snapshot_date,
            source: file.source,
        }
    }

    pub fn index_of(&self, code: &str) -> Option<TeamId> {
        self.teams
            .iter()
            .position(|t| t.code.eq_ignore_ascii_case(code))
            .map(|i| i as TeamId)
    }
}

pub fn group_index(group: char) -> usize {
    let g = (group as u8).wrapping_sub(b'A') as usize;
    assert!(g < NUM_GROUPS, "invalid group {group}");
    g
}

pub fn group_letter(index: usize) -> char {
    assert!(index < NUM_GROUPS);
    (b'A' + index as u8) as char
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loads_and_validates() {
        let teams = Teams::load();
        assert_eq!(teams.teams.len(), NUM_TEAMS);
        assert_eq!(teams.source, "eloratings.net");
        let hosts: Vec<&str> = teams
            .teams
            .iter()
            .filter(|t| t.host)
            .map(|t| t.code.as_str())
            .collect();
        assert_eq!(hosts, ["MEX", "CAN", "USA"]);
    }

    #[test]
    fn groups_have_four_teams_each() {
        let teams = Teams::load();
        for (g, members) in teams.groups.iter().enumerate() {
            for &id in members {
                assert_eq!(group_index(teams.teams[id as usize].group), g);
            }
        }
    }

    #[test]
    fn lookup_by_code() {
        let teams = Teams::load();
        let nor = teams.index_of("nor").unwrap();
        assert_eq!(teams.teams[nor as usize].name, "Norway");
        assert!(teams.index_of("XXX").is_none());
    }
}
