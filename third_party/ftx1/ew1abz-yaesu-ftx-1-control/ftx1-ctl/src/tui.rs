use ratatui::Frame;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Paragraph, Wrap};
use tui_big_text::{BigText, PixelSize};

use crate::app::{App, ClarPrompt, FreqPrompt, Prompt, VfoSaveStep};

pub fn render(f: &mut Frame, app: &App) {
    // BigText at Quadrant pixel size renders each glyph as 4 cols × 4 rows
    // (per tui-big-text: 2 pixels/cell horizontally × 4-cell-tall glyphs).
    // An 11-char VHF freq like "470.000.000" is 44 cols; plus a 5-col
    // label that's 49 cols per pane → 98 inner + 2 border = 100 outer
    // for two panes side-by-side. Below that, stack instead.
    let wide = f.area().width >= 100;
    let status_h: u16 = if wide { 7 } else { 11 };
    // The hint section soft-wraps at the current width, so its height is
    // a function of the terminal width. Ask the Paragraph how many rows
    // it actually needs and size the layout slot to match.
    let hints = build_hints();
    let hint_h = hints.line_count(f.area().width).max(1) as u16;
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(status_h), // status (main + sub freq)
            Constraint::Length(3),        // clarifier
            Constraint::Length(11),       // freqs
            Constraint::Min(0),           // spacer
            Constraint::Length(hint_h),   // hints (width-adaptive)
        ])
        .split(f.area());

    render_status(f, chunks[0], app, wide);
    render_clarifier(f, chunks[1], app);
    render_freqs(f, chunks[2], app);
    f.render_widget(hints, chunks[4]);

    if let Some(prompt) = app.prompt.as_ref() {
        match prompt {
            Prompt::Freq(p) => render_freq_prompt(f, p),
            Prompt::Clarifier(p) => render_clar_prompt(f, p),
        }
    }
    if let Some(step) = app.vfo_save.as_ref() {
        render_vfo_save(f, app, step);
    }
}

fn render_status(f: &mut Frame, area: Rect, app: &App, wide: bool) {
    let mut title_spans = vec![Span::raw(format!(
        " Yaesu FTX-1 v{} — {} ",
        env!("CARGO_PKG_VERSION"),
        app.cfg.port,
    ))];
    if app.mock {
        title_spans.push(Span::styled(
            "[MOCK] ",
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD),
        ));
    }
    let block = Block::default()
        .borders(Borders::ALL)
        .title(Line::from(title_spans));
    let inner = block.inner(area);
    f.render_widget(block, area);

    // Big numbers are the radio's polled frequencies. Before the first
    // poll lands we show a dash so the operator can't mistake the local
    // optimistic value for the real radio state.
    let main_text = app
        .last_status
        .map(|s| format_freq_digits(s.frequency_hz))
        .unwrap_or_else(|| "—".into());
    let sub_text = app
        .last_sub_status
        .map(|s| format_freq_digits(s.frequency_hz))
        .unwrap_or_else(|| "—".into());

    let status_line_area = if wide {
        let rows = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Length(4), Constraint::Length(1)])
            .split(inner);
        let halves = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Ratio(1, 2), Constraint::Ratio(1, 2)])
            .split(rows[0]);
        render_freq_pane(f, halves[0], "MAIN", &main_text, Color::Yellow);
        render_freq_pane(f, halves[1], "SUB", &sub_text, Color::Cyan);
        rows[1]
    } else {
        let rows = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(4),
                Constraint::Length(4),
                Constraint::Length(1),
            ])
            .split(inner);
        render_freq_pane(f, rows[0], "MAIN", &main_text, Color::Yellow);
        render_freq_pane(f, rows[1], "SUB", &sub_text, Color::Cyan);
        rows[2]
    };

    let drift = app.last_status.map(|s| {
        let a = app.current_freq as i64;
        let b = s.frequency_hz as i64;
        (a - b).abs()
    });
    let mut spans = vec![
        Span::raw("  local: "),
        Span::raw(format_freq_hz(app.current_freq)),
    ];
    // A non-zero drift means the radio hasn't yet caught up with the last
    // `FA` write, or the user just turned the physical knob. The next poll
    // is the moment of truth either way; show a small badge meanwhile.
    if let Some(d) = drift
        && d > 0
    {
        spans.push(Span::styled(
            format!("  (Δ {d} Hz)"),
            Style::default().fg(Color::DarkGray),
        ));
    }
    if let Some(toast) = app.toast.as_ref()
        && std::time::Instant::now() < toast.expires_at
    {
        let color = if toast.error {
            Color::Red
        } else {
            Color::Magenta
        };
        spans.push(Span::raw("   "));
        spans.push(Span::styled(
            toast.message.clone(),
            Style::default().fg(color).add_modifier(Modifier::BOLD),
        ));
    }
    f.render_widget(Paragraph::new(Line::from(spans)), status_line_area);
}

fn render_freq_pane(f: &mut Frame, area: Rect, label: &str, freq_text: &str, color: Color) {
    let cols = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Length(5), Constraint::Min(0)])
        .split(area);
    f.render_widget(
        Paragraph::new(label).style(Style::default().fg(Color::DarkGray)),
        cols[0],
    );
    let big = BigText::builder()
        .pixel_size(PixelSize::Quadrant)
        .style(Style::default().fg(color).add_modifier(Modifier::BOLD))
        .lines(vec![Line::from(freq_text.to_string())])
        .build();
    f.render_widget(big, cols[1]);
}

fn render_clarifier(f: &mut Frame, area: Rect, app: &App) {
    let (offset, rx_on, tx_on) = match app.last_status {
        Some(s) => (
            s.clarifier_offset_hz,
            s.rx_clarifier_on,
            s.tx_clarifier_on,
        ),
        None => (0, false, false),
    };
    let on_style = Style::default()
        .fg(Color::Green)
        .add_modifier(Modifier::BOLD);
    let off_style = Style::default().fg(Color::DarkGray);
    let spans = vec![
        Span::raw("  Offset: "),
        Span::styled(
            format!("{:+5} Hz", offset),
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        ),
        Span::raw("    RX "),
        Span::styled(if rx_on { "[ON]" } else { "[OFF]" }, if rx_on { on_style } else { off_style }),
        Span::raw("    TX "),
        Span::styled(if tx_on { "[ON]" } else { "[OFF]" }, if tx_on { on_style } else { off_style }),
    ];
    let block = Block::default().borders(Borders::ALL).title(" Clarifier ");
    f.render_widget(Paragraph::new(Line::from(spans)).block(block), area);
}

fn render_freqs(f: &mut Frame, area: Rect, app: &App) {
    let mut lines = Vec::with_capacity(9);
    for i in 0..9 {
        let key = format!("[^{}]", i + 1);
        let (label, hz_str, active) = match app.cfg.freq_memories.get(i) {
            Some(m) if m.hz != 0 => (
                m.label.clone(),
                format_freq_hz(m.hz),
                m.hz == app.current_freq,
            ),
            _ => ("...".into(), String::new(), false),
        };
        let mut spans = vec![
            Span::styled(key, Style::default().add_modifier(Modifier::BOLD)),
            Span::raw(format!("  {label:16}  ")),
            Span::raw(hz_str),
        ];
        if active {
            spans.push(Span::styled("  ●", Style::default().fg(Color::Green)));
        }
        let line = Line::from(spans);
        lines.push(if active {
            line.style(Style::default().add_modifier(Modifier::REVERSED))
        } else {
            line
        });
    }
    let block = Block::default()
        .borders(Borders::ALL)
        .title(" Frequencies ");
    f.render_widget(Paragraph::new(lines).block(block), area);
}

fn build_hints() -> Paragraph<'static> {
    let style = Style::default().fg(Color::DarkGray);
    let lines = vec![
        Line::from(Span::styled(
            "  freq:  ↑/↓ ±100  ←/→ ±1k  PgUp/Dn ±10k   G goto   V save   ^1-^9 recall",
            style,
        )),
        Line::from(Span::styled(
            "  clar:  =/- ±10   ]/[ ±100  R/T toggle   C offset   Z zero        Q quit",
            style,
        )),
    ];
    Paragraph::new(lines).wrap(Wrap { trim: false })
}

fn render_freq_prompt(f: &mut Frame, prompt: &FreqPrompt) {
    let area = centered_rect(f.area(), 50, 7);
    f.render_widget(Clear, area);

    let block = Block::default()
        .borders(Borders::ALL)
        .title(" Goto frequency ")
        .style(Style::default().fg(Color::Yellow));
    let inner = block.inner(area);
    f.render_widget(block, area);

    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),
            Constraint::Length(1),
            Constraint::Length(1),
            Constraint::Length(1),
        ])
        .split(inner);

    let input = format!("  Hz: {}", prompt.buffer);
    f.render_widget(Paragraph::new(input.clone()), rows[1]);
    if let Some(err) = prompt.error.as_ref() {
        f.render_widget(
            Paragraph::new(format!("  {err}")).style(Style::default().fg(Color::Red)),
            rows[2],
        );
    }
    f.render_widget(
        Paragraph::new("  Enter to apply  ·  Esc to cancel")
            .style(Style::default().fg(Color::DarkGray)),
        rows[3],
    );

    let cursor_x = rows[1].x + input.chars().count() as u16;
    let cursor_y = rows[1].y;
    f.set_cursor_position((cursor_x, cursor_y));
}

fn render_clar_prompt(f: &mut Frame, prompt: &ClarPrompt) {
    let area = centered_rect(f.area(), 50, 7);
    f.render_widget(Clear, area);

    let block = Block::default()
        .borders(Borders::ALL)
        .title(" Clarifier offset ")
        .style(Style::default().fg(Color::Cyan));
    let inner = block.inner(area);
    f.render_widget(block, area);

    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),
            Constraint::Length(1),
            Constraint::Length(1),
            Constraint::Length(1),
        ])
        .split(inner);

    let input = format!("  Hz: {}", prompt.buffer);
    f.render_widget(Paragraph::new(input.clone()), rows[1]);
    if let Some(err) = prompt.error.as_ref() {
        f.render_widget(
            Paragraph::new(format!("  {err}")).style(Style::default().fg(Color::Red)),
            rows[2],
        );
    }
    f.render_widget(
        Paragraph::new("  ±9990 in 10 Hz steps  ·  Enter to apply  ·  Esc to cancel")
            .style(Style::default().fg(Color::DarkGray)),
        rows[3],
    );

    let cursor_x = rows[1].x + input.chars().count() as u16;
    let cursor_y = rows[1].y;
    f.set_cursor_position((cursor_x, cursor_y));
}

fn render_vfo_save(f: &mut Frame, app: &App, step: &VfoSaveStep) {
    let area = centered_rect(f.area(), 56, 7);
    f.render_widget(Clear, area);

    let block = Block::default()
        .borders(Borders::ALL)
        .title(" Save VFO → memory ")
        .style(Style::default().fg(Color::Magenta));
    let inner = block.inner(area);
    f.render_widget(block, area);

    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),
            Constraint::Length(1),
            Constraint::Length(1),
            Constraint::Length(1),
        ])
        .split(inner);

    f.render_widget(
        Paragraph::new(format!("  Save {}", format_freq_hz(app.current_freq))),
        rows[0],
    );

    match step {
        VfoSaveStep::PickSlot => {
            f.render_widget(
                Paragraph::new("  Slot: _").style(Style::default().fg(Color::White)),
                rows[1],
            );
            f.render_widget(
                Paragraph::new("  Press 1–9 to choose slot  ·  Esc to cancel")
                    .style(Style::default().fg(Color::DarkGray)),
                rows[3],
            );
        }
        VfoSaveStep::EnterLabel { slot, buffer } => {
            let line = format!("  Slot {} label: {}", slot + 1, buffer);
            f.render_widget(Paragraph::new(line.clone()), rows[1]);
            f.render_widget(
                Paragraph::new("  Enter to save (empty = formatted Hz)  ·  Esc to cancel")
                    .style(Style::default().fg(Color::DarkGray)),
                rows[3],
            );
            let cursor_x = rows[1].x + line.chars().count() as u16;
            let cursor_y = rows[1].y;
            f.set_cursor_position((cursor_x, cursor_y));
        }
    }
}

fn centered_rect(area: Rect, width: u16, height: u16) -> Rect {
    let w = width.min(area.width);
    let h = height.min(area.height);
    Rect {
        x: area.x + (area.width - w) / 2,
        y: area.y + (area.height - h) / 2,
        width: w,
        height: h,
    }
}

/// Format `hz` as `"14.074.000"` with `.` thousand separators (no unit).
pub fn format_freq_digits(hz: u32) -> String {
    let s = hz.to_string();
    let bytes = s.as_bytes();
    let mut out = String::with_capacity(s.len() + s.len() / 3);
    let first = bytes.len() % 3;
    let first = if first == 0 { 3 } else { first };
    out.push_str(std::str::from_utf8(&bytes[..first]).unwrap());
    let mut i = first;
    while i < bytes.len() {
        out.push('.');
        out.push_str(std::str::from_utf8(&bytes[i..i + 3]).unwrap());
        i += 3;
    }
    out
}

/// Same as [`format_freq_digits`] but with a trailing `" Hz"` suffix.
pub fn format_freq_hz(hz: u32) -> String {
    format!("{} Hz", format_freq_digits(hz))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_freq_hz_thousand_separators() {
        assert_eq!(format_freq_hz(0), "0 Hz");
        assert_eq!(format_freq_hz(7), "7 Hz");
        assert_eq!(format_freq_hz(999), "999 Hz");
        assert_eq!(format_freq_hz(1_000), "1.000 Hz");
        assert_eq!(format_freq_hz(14_074_000), "14.074.000 Hz");
        assert_eq!(format_freq_hz(469_000_000), "469.000.000 Hz");
    }
}
