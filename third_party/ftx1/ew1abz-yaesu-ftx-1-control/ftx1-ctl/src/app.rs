use std::io;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};

use crossterm::event::{Event, EventStream, KeyCode, KeyEvent, KeyModifiers};
use crossterm::execute;
use crossterm::terminal::{
    EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode,
};
use futures::StreamExt;
use ratatui::Terminal;
use ratatui::backend::CrosstermBackend;
use tokio::sync::mpsc;

use ftx1::{CLAR_OFFSET_ABS_MAX_HZ, FREQ_MAX_HZ, FREQ_MIN_HZ, Radio, Status};

use crate::config::{Config, FreqMemory, save_freq_memory};
use crate::tui;

/// Cadence for the background `IF;` poll. The radio's actual physical state
/// (knob turns, clarifier knob, etc.) lands in the TUI on this interval.
const POLL_INTERVAL: Duration = Duration::from_millis(500);

pub struct App {
    pub cfg: Config,
    /// Locally-tracked current freq. Updated optimistically on user input
    /// and reconciled by every poll tick. We render this rather than the
    /// most-recently-polled value so user input feels instant.
    pub current_freq: u32,
    /// Last full status from the radio. `None` until the first poll lands.
    pub last_status: Option<Status>,
    /// Last sub-VFO status (from `OI;`). `None` until the first poll lands.
    pub last_sub_status: Option<Status>,
    pub radio: Arc<Radio>,
    pub events_to_self: mpsc::Sender<AppEvent>,
    pub prompt: Option<Prompt>,
    pub vfo_save: Option<VfoSaveStep>,
    pub toast: Option<Toast>,
    /// True when launched with `--mock`. Drives a yellow `[MOCK]` badge
    /// so a no-op session can't be mistaken for a real one.
    pub mock: bool,
    pub config_path: PathBuf,
}

pub enum VfoSaveStep {
    PickSlot,
    EnterLabel { slot: usize, buffer: String },
}

pub struct Toast {
    pub message: String,
    pub expires_at: Instant,
    pub error: bool,
}

pub enum Prompt {
    Freq(FreqPrompt),
    Clarifier(ClarPrompt),
}

pub struct FreqPrompt {
    pub buffer: String,
    pub error: Option<String>,
}

pub struct ClarPrompt {
    pub buffer: String,
    pub error: Option<String>,
}

#[derive(Debug)]
pub enum AppEvent {
    Statuses { main: Status, sub: Status },
    PollError(String),
    OpError(String),
}

pub async fn run(
    cfg: Config,
    radio: Radio,
    config_path: PathBuf,
    mock: bool,
) -> anyhow::Result<()> {
    let mut terminal = setup_terminal()?;
    let (tx_app, rx_app) = mpsc::channel(64);
    let mut app = App {
        current_freq: cfg.base_hz,
        last_status: None,
        last_sub_status: None,
        cfg,
        radio: Arc::new(radio),
        events_to_self: tx_app.clone(),
        prompt: None,
        vfo_save: None,
        toast: None,
        mock,
        config_path,
    };
    let poll_handle = spawn_poller(app.radio.clone(), tx_app);
    let result = event_loop(&mut terminal, &mut app, rx_app).await;
    poll_handle.abort();
    teardown_terminal(&mut terminal).ok();
    result
}

type Term = Terminal<CrosstermBackend<io::Stdout>>;

fn setup_terminal() -> anyhow::Result<Term> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    Ok(Terminal::new(CrosstermBackend::new(stdout))?)
}

fn teardown_terminal(t: &mut Term) -> anyhow::Result<()> {
    disable_raw_mode()?;
    execute!(t.backend_mut(), LeaveAlternateScreen)?;
    t.show_cursor()?;
    Ok(())
}

fn spawn_poller(radio: Arc<Radio>, tx: mpsc::Sender<AppEvent>) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(POLL_INTERVAL);
        tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        loop {
            tick.tick().await;
            let result = async {
                let main = radio.read_status().await?;
                let sub = radio.read_sub_status().await?;
                Ok::<_, ftx1::Error>((main, sub))
            }
            .await;
            let evt = match result {
                Ok((main, sub)) => AppEvent::Statuses { main, sub },
                Err(e) => AppEvent::PollError(e.to_string()),
            };
            if tx.send(evt).await.is_err() {
                return;
            }
        }
    })
}

async fn event_loop(
    terminal: &mut Term,
    app: &mut App,
    mut rx_app: mpsc::Receiver<AppEvent>,
) -> anyhow::Result<()> {
    let mut events = EventStream::new();
    let mut redraw = tokio::time::interval(Duration::from_millis(250));
    redraw.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    loop {
        terminal.draw(|f| tui::render(f, app))?;
        tokio::select! {
            term_evt = events.next() => {
                let Some(evt) = term_evt else { break };
                if handle_term_event(app, evt?) {
                    break;
                }
            }
            internal = rx_app.recv() => {
                let Some(evt) = internal else { break };
                handle_internal_event(app, evt);
            }
            _ = redraw.tick() => {
                // 4 Hz redraw so toast countdowns and status freshness tick
                // even when no other events arrive.
            }
        }
    }
    Ok(())
}

/// Returns true if we should exit.
fn handle_term_event(app: &mut App, evt: Event) -> bool {
    let Event::Key(k) = evt else { return false };
    if k.modifiers.contains(KeyModifiers::CONTROL) && matches!(k.code, KeyCode::Char('c')) {
        return true;
    }
    handle_key(app, k)
}

/// Returns true if we should exit.
fn handle_key(app: &mut App, k: KeyEvent) -> bool {
    if app.prompt.is_some() {
        handle_prompt_key(app, k);
        return false;
    }
    if app.vfo_save.is_some() {
        handle_vfo_save_key(app, k);
        return false;
    }

    // Ctrl+digit: jump to freq memory slot.
    if k.modifiers.contains(KeyModifiers::CONTROL)
        && let KeyCode::Char(c) = k.code
        && let Some(d) = c.to_digit(10)
        && (1..=9).contains(&d)
    {
        select_freq_slot(app, (d - 1) as usize);
        return false;
    }

    match k.code {
        KeyCode::Char('q') | KeyCode::Char('Q') => return true,
        KeyCode::Char('g') | KeyCode::Char('G') => {
            app.prompt = Some(Prompt::Freq(FreqPrompt {
                buffer: String::new(),
                error: None,
            }));
        }
        KeyCode::Char('v') | KeyCode::Char('V') => {
            app.vfo_save = Some(VfoSaveStep::PickSlot);
        }
        KeyCode::Char('c') | KeyCode::Char('C') => {
            app.prompt = Some(Prompt::Clarifier(ClarPrompt {
                buffer: String::new(),
                error: None,
            }));
        }
        KeyCode::Char('r') | KeyCode::Char('R') => toggle_rx_clarifier(app),
        KeyCode::Char('t') | KeyCode::Char('T') => toggle_tx_clarifier(app),
        KeyCode::Char('z') | KeyCode::Char('Z') => apply_clar_offset(app, 0),
        KeyCode::Char('=') | KeyCode::Char('+') => step_clar_offset(app, 10),
        KeyCode::Char('-') | KeyCode::Char('_') => step_clar_offset(app, -10),
        KeyCode::Char(']') | KeyCode::Char('}') => step_clar_offset(app, 100),
        KeyCode::Char('[') | KeyCode::Char('{') => step_clar_offset(app, -100),
        KeyCode::Up => step_freq(app, 100),
        KeyCode::Down => step_freq(app, -100),
        KeyCode::Right => step_freq(app, 1_000),
        KeyCode::Left => step_freq(app, -1_000),
        KeyCode::PageUp => step_freq(app, 10_000),
        KeyCode::PageDown => step_freq(app, -10_000),
        _ => {}
    }
    false
}

fn handle_prompt_key(app: &mut App, k: KeyEvent) {
    let Some(prompt) = app.prompt.as_mut() else {
        return;
    };
    match prompt {
        Prompt::Freq(p) => match k.code {
            KeyCode::Esc => app.prompt = None,
            KeyCode::Enter => match parse_hz(&p.buffer) {
                Some(hz) if (FREQ_MIN_HZ..=FREQ_MAX_HZ).contains(&hz) => {
                    apply_freq(app, hz);
                    app.prompt = None;
                }
                Some(_) => p.error = Some("frequency out of FTX-1 range".into()),
                None => p.error = Some("invalid frequency".into()),
            },
            KeyCode::Backspace => {
                p.buffer.pop();
                p.error = None;
            }
            KeyCode::Char(c) if c.is_ascii_digit() || c == '_' => {
                p.buffer.push(c);
                p.error = None;
            }
            _ => {}
        },
        Prompt::Clarifier(p) => match k.code {
            KeyCode::Esc => app.prompt = None,
            KeyCode::Enter => match parse_clar_offset(&p.buffer) {
                Ok(hz) => {
                    apply_clar_offset(app, hz);
                    app.prompt = None;
                }
                Err(msg) => p.error = Some(msg),
            },
            KeyCode::Backspace => {
                p.buffer.pop();
                p.error = None;
            }
            KeyCode::Char(c) if c.is_ascii_digit() || c == '+' || c == '-' => {
                p.buffer.push(c);
                p.error = None;
            }
            _ => {}
        },
    }
}

fn parse_hz(s: &str) -> Option<u32> {
    let cleaned: String = s.chars().filter(|c| *c != '_').collect();
    if cleaned.is_empty() {
        return None;
    }
    cleaned.parse::<u32>().ok()
}

fn parse_clar_offset(s: &str) -> Result<i16, String> {
    let t = s.trim();
    if t.is_empty() {
        return Err("offset is empty".into());
    }
    let parsed: i32 = t.parse().map_err(|_| "not a number".to_string())?;
    if parsed.abs() > CLAR_OFFSET_ABS_MAX_HZ as i32 {
        return Err(format!("range is ±{}", CLAR_OFFSET_ABS_MAX_HZ));
    }
    if parsed % 10 != 0 {
        return Err("must be a multiple of 10 Hz".into());
    }
    Ok(parsed as i16)
}

const VFO_LABEL_MAX: usize = 24;

fn handle_vfo_save_key(app: &mut App, k: KeyEvent) {
    let Some(step) = app.vfo_save.as_mut() else {
        return;
    };
    match step {
        VfoSaveStep::PickSlot => match k.code {
            KeyCode::Esc => app.vfo_save = None,
            KeyCode::Char(c) => {
                if let Some(d) = c.to_digit(10)
                    && (1..=9).contains(&d)
                {
                    let slot = (d - 1) as usize;
                    let buffer = app
                        .cfg
                        .freq_memories
                        .get(slot)
                        .filter(|m| m.hz != 0)
                        .map(|m| m.label.clone())
                        .unwrap_or_default();
                    app.vfo_save = Some(VfoSaveStep::EnterLabel { slot, buffer });
                }
            }
            _ => {}
        },
        VfoSaveStep::EnterLabel { slot, buffer } => match k.code {
            KeyCode::Esc => app.vfo_save = None,
            KeyCode::Backspace => {
                buffer.pop();
            }
            KeyCode::Enter => {
                let slot = *slot;
                let label = std::mem::take(buffer);
                app.vfo_save = None;
                save_current_freq_to_slot(app, slot, label);
            }
            KeyCode::Char(c) if is_label_char(c) && buffer.chars().count() < VFO_LABEL_MAX => {
                buffer.push(c);
            }
            _ => {}
        },
    }
}

fn is_label_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || matches!(c, ' ' | '-' | '_' | '/' | '.')
}

fn save_current_freq_to_slot(app: &mut App, slot: usize, label_input: String) {
    let hz = app.current_freq;
    let label = if label_input.trim().is_empty() {
        tui::format_freq_hz(hz)
    } else {
        label_input
    };
    match save_freq_memory(&app.config_path, slot, &label, hz) {
        Ok(()) => {
            while app.cfg.freq_memories.len() <= slot {
                app.cfg.freq_memories.push(FreqMemory {
                    label: String::new(),
                    hz: 0,
                });
            }
            app.cfg.freq_memories[slot] = FreqMemory {
                label: label.clone(),
                hz,
            };
            push_toast(app, format!("saved {label} to slot {}", slot + 1), false, 3);
        }
        Err(e) => push_toast(app, format!("save failed: {e}"), true, 5),
    }
}

fn select_freq_slot(app: &mut App, slot: usize) {
    let Some(fm) = app.cfg.freq_memories.get(slot).cloned() else {
        return;
    };
    if fm.hz == 0 {
        return;
    }
    apply_freq(app, fm.hz);
}

fn step_freq(app: &mut App, delta_hz: i32) {
    let new = (app.current_freq as i64 + delta_hz as i64)
        .clamp(FREQ_MIN_HZ as i64, FREQ_MAX_HZ as i64) as u32;
    apply_freq(app, new);
}

fn step_clar_offset(app: &mut App, delta_hz: i16) {
    // Step from the polled state, not from a locally-tracked copy: clarifier
    // offset is short-lived and the radio is authoritative. Falls back to 0
    // before the first poll has landed.
    let cur = app
        .last_status
        .map(|s| s.clarifier_offset_hz)
        .unwrap_or(0);
    let max = CLAR_OFFSET_ABS_MAX_HZ as i32;
    let new = (cur as i32 + delta_hz as i32).clamp(-max, max) as i16;
    apply_clar_offset(app, new);
}

fn apply_freq(app: &mut App, hz: u32) {
    app.current_freq = hz;
    let radio = app.radio.clone();
    let tx = app.events_to_self.clone();
    tokio::spawn(async move {
        if let Err(e) = radio.set_freq(hz).await {
            let _ = tx.send(AppEvent::OpError(format!("set_freq: {e}"))).await;
        }
    });
}

fn toggle_rx_clarifier(app: &mut App) {
    let cur = app.last_status.map(|s| s.rx_clarifier_on).unwrap_or(false);
    let tx_on = app.last_status.map(|s| s.tx_clarifier_on).unwrap_or(false);
    apply_clar_enabled(app, !cur, tx_on);
}

fn toggle_tx_clarifier(app: &mut App) {
    let cur = app.last_status.map(|s| s.tx_clarifier_on).unwrap_or(false);
    let rx_on = app.last_status.map(|s| s.rx_clarifier_on).unwrap_or(false);
    apply_clar_enabled(app, rx_on, !cur);
}

fn apply_clar_enabled(app: &mut App, rx_on: bool, tx_on: bool) {
    // Optimistically reflect the new state so the toggle feels instant;
    // the next poll will reconcile.
    if let Some(s) = app.last_status.as_mut() {
        s.rx_clarifier_on = rx_on;
        s.tx_clarifier_on = tx_on;
    }
    let radio = app.radio.clone();
    let tx = app.events_to_self.clone();
    tokio::spawn(async move {
        if let Err(e) = radio.set_clarifier_enabled(rx_on, tx_on).await {
            let _ = tx.send(AppEvent::OpError(format!("clarifier on/off: {e}"))).await;
        }
    });
}

fn apply_clar_offset(app: &mut App, hz: i16) {
    if let Some(s) = app.last_status.as_mut() {
        s.clarifier_offset_hz = hz;
    }
    let radio = app.radio.clone();
    let tx = app.events_to_self.clone();
    tokio::spawn(async move {
        if let Err(e) = radio.set_clarifier_offset(hz).await {
            let _ = tx.send(AppEvent::OpError(format!("clarifier offset: {e}"))).await;
        }
    });
}

fn push_toast(app: &mut App, message: String, error: bool, secs: u64) {
    app.toast = Some(Toast {
        message,
        expires_at: Instant::now() + Duration::from_secs(secs),
        error,
    });
}

fn handle_internal_event(app: &mut App, evt: AppEvent) {
    match evt {
        AppEvent::Statuses { main, sub } => {
            // The poll is the source of truth for clarifier state and for
            // the radio's freq when nothing local is in flight. We don't
            // overwrite `current_freq` here — the user's last keypress is
            // what they expect to see — but on the very first poll we
            // adopt it so the display matches the radio at startup.
            if app.last_status.is_none() {
                app.current_freq = main.frequency_hz;
            }
            app.last_status = Some(main);
            app.last_sub_status = Some(sub);
        }
        AppEvent::PollError(msg) => {
            push_toast(app, format!("poll: {msg}"), true, 5);
        }
        AppEvent::OpError(msg) => {
            push_toast(app, msg, true, 5);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_hz_accepts_plain_and_underscored_digits() {
        assert_eq!(parse_hz("14074000"), Some(14_074_000));
        assert_eq!(parse_hz("14_074_000"), Some(14_074_000));
        assert_eq!(parse_hz("0"), Some(0));
    }

    #[test]
    fn parse_hz_rejects_garbage() {
        assert_eq!(parse_hz(""), None);
        assert_eq!(parse_hz("___"), None);
        assert_eq!(parse_hz("abc"), None);
        assert_eq!(parse_hz("-1"), None);
    }

    #[test]
    fn parse_clar_offset_accepts_signed_multiples_of_ten() {
        assert_eq!(parse_clar_offset("0"), Ok(0));
        assert_eq!(parse_clar_offset("+500"), Ok(500));
        assert_eq!(parse_clar_offset("-1230"), Ok(-1230));
        assert_eq!(parse_clar_offset("9990"), Ok(9990));
    }

    #[test]
    fn parse_clar_offset_rejects_off_grid_and_overrange() {
        assert!(parse_clar_offset("5").is_err());
        assert!(parse_clar_offset("10000").is_err());
        assert!(parse_clar_offset("-10000").is_err());
        assert!(parse_clar_offset("foo").is_err());
        assert!(parse_clar_offset("").is_err());
    }

    #[test]
    fn is_label_char_allows_expected_set() {
        for c in ['a', 'Z', '0', '9', ' ', '-', '_', '/', '.'] {
            assert!(is_label_char(c));
        }
        for c in ['!', '@', '#', '?', '*', '\t', '\n'] {
            assert!(!is_label_char(c));
        }
    }
}
