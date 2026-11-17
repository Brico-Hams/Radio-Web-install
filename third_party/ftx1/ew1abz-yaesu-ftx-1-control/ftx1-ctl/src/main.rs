mod app;
mod config;
mod tui;

use std::path::PathBuf;
use std::process::ExitCode;

use anyhow::Context;

use ftx1::Radio;

struct Args {
    config_path: Option<PathBuf>,
    mock: bool,
}

fn parse_args() -> Result<Args, String> {
    let mut iter = std::env::args().skip(1);
    let mut config_path = None;
    let mut mock = false;
    while let Some(a) = iter.next() {
        match a.as_str() {
            "--config" | "-c" => {
                config_path = Some(iter.next().ok_or("--config requires a path")?.into());
            }
            "--mock" => {
                mock = true;
            }
            "-h" | "--help" => {
                println!("Usage: ftx1-ctl [--config <path>] [--mock]");
                println!();
                println!("Options:");
                println!("  -c, --config <path>   Path to config file");
                println!("      --mock            Run without an FTX-1 (no-op radio ops)");
                println!("  -h, --help            Show this help");
                println!("  -V, --version         Show version");
                println!();
                println!("{}", env!("CARGO_PKG_REPOSITORY"));
                std::process::exit(0);
            }
            "-V" | "--version" => {
                println!(
                    "ftx1-ctl {}\n{}",
                    env!("CARGO_PKG_VERSION"),
                    env!("CARGO_PKG_REPOSITORY"),
                );
                std::process::exit(0);
            }
            other => return Err(format!("unknown argument: {other}")),
        }
    }
    Ok(Args { config_path, mock })
}

#[tokio::main]
async fn main() -> ExitCode {
    match run().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e:#}");
            ExitCode::FAILURE
        }
    }
}

async fn run() -> anyhow::Result<()> {
    let args = parse_args().map_err(anyhow::Error::msg)?;
    let path = match args.config_path {
        Some(p) => p,
        None => config::default_path()?,
    };

    let (cfg, created) = config::load_or_create(&path)?;
    if created {
        eprintln!("created starter config at {}", path.display());
    }

    let radio = if args.mock {
        eprintln!("--mock: running without an FTX-1; all radio ops are no-ops");
        Radio::mock()
    } else {
        eprintln!("opening {} @ {}", cfg.port, cfg.baud);
        Radio::open(&cfg.port, cfg.baud)
            .await
            .with_context(|| format!("opening serial port {}", cfg.port))?
    };

    app::run(cfg, radio, path, args.mock).await
}
