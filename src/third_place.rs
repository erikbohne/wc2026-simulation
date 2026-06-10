use crate::annexe_c::ANNEXE_C;
use crate::data::TeamId;

#[derive(Debug, Clone, Copy)]
pub struct Third {
    pub group: u8,
    pub team: TeamId,
    pub points: u8,
    pub gd: i16,
    pub gf: u8,
    pub fifa_rank: u16,
}

pub fn best_eight_mask(thirds: &[Third; 12]) -> u16 {
    let mut order: [u8; 12] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    order.sort_unstable_by(|&a, &b| {
        let (a, b) = (&thirds[a as usize], &thirds[b as usize]);
        b.points
            .cmp(&a.points)
            .then(b.gd.cmp(&a.gd))
            .then(b.gf.cmp(&a.gf))
            .then(a.fifa_rank.cmp(&b.fifa_rank))
    });
    order[..8]
        .iter()
        .fold(0u16, |mask, &i| mask | 1 << thirds[i as usize].group)
}

pub fn allocate(mask: u16) -> &'static [u8; 8] {
    let idx = ANNEXE_C
        .binary_search_by_key(&mask, |e| e.0)
        .expect("every 8-of-12 group mask is in Annexe C");
    &ANNEXE_C[idx].1
}

#[cfg(test)]
mod tests {
    use super::*;

    const SLOT_ALLOWED: [[u8; 5]; 8] = [
        [0, 1, 2, 3, 5],  // M74: A B C D F
        [2, 3, 5, 6, 7],  // M77: C D F G H
        [2, 4, 5, 7, 8],  // M79: C E F H I
        [4, 7, 8, 9, 10], // M80: E H I J K
        [1, 4, 5, 8, 9],  // M81: B E F I J
        [0, 4, 7, 8, 9],  // M82: A E H I J
        [4, 5, 6, 8, 9],  // M85: E F G I J
        [3, 4, 8, 9, 11], // M87: D E I J L
    ];

    #[test]
    fn table_covers_all_495_combinations_exactly() {
        assert_eq!(ANNEXE_C.len(), 495);
        let mut seen = std::collections::HashSet::new();
        let mut prev = 0u16;
        for &(mask, assign) in &ANNEXE_C {
            assert!(mask > prev || seen.is_empty(), "table must be sorted");
            prev = mask;
            assert_eq!(mask.count_ones(), 8);
            assert!(mask < 1 << 12);
            assert!(seen.insert(mask));
            let assigned_mask = assign.iter().fold(0u16, |m, &g| m | 1 << g);
            assert_eq!(
                assigned_mask, mask,
                "assignment must be a bijection onto the mask"
            );
            for (slot, &g) in assign.iter().enumerate() {
                assert!(
                    SLOT_ALLOWED[slot].contains(&g),
                    "mask {mask:03x}: slot {slot} got group {g}"
                );
            }
        }
        assert_eq!(seen.len(), 495);
    }

    #[test]
    fn allocate_works_for_every_combination() {
        for groups in 0u16..(1 << 12) {
            if groups.count_ones() == 8 {
                let assign = allocate(groups);
                assert_eq!(assign.iter().fold(0u16, |m, &g| m | 1 << g), groups);
            }
        }
    }

    #[test]
    fn matches_pdf_option_1() {
        // Option 1 (groups E-L qualify): 1A->3E 1B->3J 1D->3I 1E->3F 1G->3H 1I->3G 1K->3L 1L->3K
        // In slot order (M74, M77, M79, M80, M81, M82, M85, M87): F G E K I H J L
        let mask = 0b1111_1111_0000;
        assert_eq!(allocate(mask), &[5, 6, 4, 10, 8, 7, 9, 11]);
    }

    #[test]
    fn matches_pdf_option_495() {
        // Option 495 (groups A-H qualify): 1A->3H 1B->3G 1D->3B 1E->3C 1G->3A 1I->3F 1K->3D 1L->3E
        // In slot order: M74=3C, M77=3F, M79=3H, M80=3E, M81=3B, M82=3A, M85=3G, M87=3D
        let mask = 0b0000_1111_1111;
        assert_eq!(allocate(mask), &[2, 5, 7, 4, 1, 0, 6, 3]);
    }

    #[test]
    fn best_eight_ranks_by_official_criteria() {
        let mut thirds: [Third; 12] = std::array::from_fn(|g| Third {
            group: g as u8,
            team: g as TeamId,
            points: 3,
            gd: 0,
            gf: 0,
            fifa_rank: g as u16 + 1,
        });
        thirds[11].points = 6; // top on points
        thirds[10].gd = 3; // next on GD
        thirds[9].gf = 2; // next on GF
        let mask = best_eight_mask(&thirds);
        for g in [11, 10, 9] {
            assert!(mask & (1 << g) != 0);
        }
        // remaining five slots go to best FIFA rank among the identical rest: groups 0..=4
        for g in 0..5 {
            assert!(mask & (1 << g) != 0);
        }
        assert_eq!(mask.count_ones(), 8);
    }
}
