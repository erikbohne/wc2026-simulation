use clap::{Parser, ValueEnum};
use rand::RngExt;
use rayon::prelude::*;
use wc2026_simulation::data::Teams;
use wc2026_simulation::engine::PensMode;
use wc2026_simulation::group::GROUP_SCHEDULE;
use wc2026_simulation::results::{self, FixedResults};
use wc2026_simulation::stats::{
    Counters, ReportMeta, build_report, format_csv, format_table, format_team_detail,
};
use wc2026_simulation::tournament::{
    Config, FullRecorder, NullRecorder, SimData, run_seed, simulate_one_from,
};

#[derive(Debug, Clone, Copy, ValueEnum)]
enum PensArg {
    Coin,
    Elo,
}

#[derive(Debug, Clone, Copy, ValueEnum)]
enum OutputArg {
    Table,
    Json,
    Csv,
}

#[derive(Parser, Debug)]
#[command(
    name = "wc2026-sim",
    version,
    about = "Monte Carlo simulator for the FIFA World Cup 2026"
)]
struct Cli {
    /// Number of tournaments to simulate
    #[arg(short = 'n', long, default_value_t = 100_000)]
    simulations: u64,

    /// RNG seed for reproducibility (random if omitted)
    #[arg(short, long)]
    seed: Option<u64>,

    /// Update Elo within each tournament
    #[arg(long, default_value_t = true, action = clap::ArgAction::Set, value_name = "BOOL")]
    dynamic_elo: bool,

    /// Penalty shootout model
    #[arg(long, value_enum, default_value_t = PensArg::Coin)]
    pens: PensArg,

    /// Output format
    #[arg(short, long, value_enum, default_value_t = OutputArg::Table)]
    output: OutputArg,

    /// Detailed report for one team (3-letter code)
    #[arg(long)]
    team: Option<String>,

    /// Run one tournament and print full match-by-match results
    #[arg(long)]
    single: bool,

    /// JSON file with real results to condition the simulation on
    #[arg(long, value_name = "PATH")]
    results: Option<String>,
}

fn main() {
    let cli = Cli::parse();
    let teams = Teams::load();
    let data = SimData::new(&teams);
    let seed = cli.seed.unwrap_or_else(|| rand::rng().random());
    let cfg = Config {
        dynamic_elo: cli.dynamic_elo,
        pens: match cli.pens {
            PensArg::Coin => PensMode::Coin,
            PensArg::Elo => PensMode::Elo,
        },
    };

    let (fixed, results_updated) = match &cli.results {
        Some(path) => {
            let json = std::fs::read_to_string(path).unwrap_or_else(|e| {
                eprintln!("cannot read {path}: {e}");
                std::process::exit(2);
            });
            let (fixed, updated) = FixedResults::parse(&json, &teams).unwrap_or_else(|e| {
                eprintln!("invalid results file {path}: {e}");
                std::process::exit(2);
            });
            (fixed, Some(updated))
        }
        None => (results::EMPTY, None),
    };

    if cli.single {
        print_single(&teams, &data, &cfg, &fixed, seed);
        return;
    }

    let team = cli.team.as_ref().map(|code| {
        teams.index_of(code).unwrap_or_else(|| {
            eprintln!("unknown team code: {code}");
            std::process::exit(2);
        })
    });

    eprintln!(
        "simulating {} tournaments (seed {seed}, dynamic elo {}, pens {:?}, fixed matches {})",
        cli.simulations, cli.dynamic_elo, cli.pens, fixed.count
    );

    let counters = (0..cli.simulations)
        .into_par_iter()
        .fold(Counters::zeroed, |mut c, i| {
            let r = simulate_one_from(&data, &cfg, &fixed, run_seed(seed, i), &mut NullRecorder);
            c.absorb(&r);
            c
        })
        .reduce(Counters::zeroed, Counters::merge);

    let meta = ReportMeta {
        seed,
        dynamic_elo: cli.dynamic_elo,
        pens: format!("{:?}", cli.pens).to_lowercase(),
        results_updated,
        fixed_matches: fixed.count,
    };
    let report = build_report(&counters, &teams, &meta);

    if let Some(t) = team {
        print!(
            "{}",
            format_team_detail(&counters, &teams, &report, t as usize)
        );
        return;
    }

    match cli.output {
        OutputArg::Table => print!("{}", format_table(&report)),
        OutputArg::Json => println!(
            "{}",
            serde_json::to_string_pretty(&report).expect("report serializes")
        ),
        OutputArg::Csv => print!("{}", format_csv(&report)),
    }
}

fn print_single(teams: &Teams, data: &SimData, cfg: &Config, fixed: &FixedResults, seed: u64) {
    let mut rec = FullRecorder::default();
    let result = simulate_one_from(data, cfg, fixed, run_seed(seed, 0), &mut rec);
    let name = |t: u8| teams.teams[t as usize].name.as_str();

    println!("=== FIFA World Cup 2026 — single run (seed {seed}) ===\n");

    println!("--- Group stage ---");
    for (g, members, gr) in &rec.group_tables {
        println!("\nGroup {}", (b'A' + g) as char);
        for (gg, a, b, ga, gb) in &rec.group_matches {
            if gg == g {
                println!("  {:<20} {ga}-{gb} {}", name(*a), name(*b));
            }
        }
        println!("  {:<22} {:>3} {:>4} {:>3}", "table", "pts", "gd", "gf");
        for (pos, &slot) in gr.order.iter().enumerate() {
            let s = gr.stats[slot as usize];
            println!(
                "  {}. {:<20} {:>3} {:>+4} {:>3}",
                pos + 1,
                name(members[slot as usize]),
                s.points,
                s.gd(),
                s.gf
            );
        }
    }

    println!("\n--- Knockout stage ---");
    for (m, a, b, o) in &rec.ko_matches {
        let stage = match m {
            73..=88 => "R32",
            89..=96 => "R16",
            97..=100 => "QF",
            101..=102 => "SF",
            103 => "3rd",
            _ => "Final",
        };
        let marker = if o.penalties {
            " (pens)"
        } else if o.extra_time {
            " (aet)"
        } else {
            ""
        };
        let winner = if o.a_advances { name(*a) } else { name(*b) };
        println!(
            "  M{m} [{stage:<5}] {:<20} {}-{}{marker} {:<20} -> {winner}",
            name(*a),
            o.goals_a,
            o.goals_b,
            name(*b)
        );
    }

    println!("\nChampion: {}", name(result.champion));
    println!("Third place: {}", name(result.third_place));
    println!(
        "Matches: {}, goals: {} ({:.2}/match)",
        result.matches,
        result.total_goals,
        result.total_goals as f64 / result.matches as f64
    );

    debug_assert_eq!(GROUP_SCHEDULE.len() * 12 + 32, result.matches as usize);
}
