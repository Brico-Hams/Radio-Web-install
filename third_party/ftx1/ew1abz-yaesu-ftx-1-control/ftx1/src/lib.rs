//! Yaesu FTX-1 CAT control — frequency and clarifier subset.
//!
//! Speaks the FTX-1 CAT serial protocol (ASCII commands terminated by `;`)
//! over a serial port. Only the commands needed by `ftx1-ctl` are
//! implemented: `ID` (radio validation), `FA` (VFO-A frequency set), `IF`
//! (one-shot status read for the main VFO: freq + clarifier dir/offset +
//! RX/TX clar on/off), `OI` (same payload for the sub VFO), and `CF`
//! (clarifier on/off + offset).
//!
//! The synchronous `serialport` crate is wrapped in `tokio::task::spawn_blocking`
//! to keep the public API async without pulling in an async serial stack.
//!
//! A `Mock` variant is provided for development without hardware: it stores
//! whatever the caller wrote so the next `read_status` reflects it, exactly
//! the way the radio would.

use std::io::{ErrorKind, Read, Write};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serialport::SerialPort;

pub const FTX1_RADIO_ID: u16 = 840;
pub const DEFAULT_BAUD: u32 = 38_400;
const READ_TIMEOUT: Duration = Duration::from_millis(200);
const RX_BUF_CAP: usize = 64;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("serial port error: {0}")]
    Serial(#[from] serialport::Error),
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("blocking task join error: {0}")]
    Join(#[from] tokio::task::JoinError),
    #[error("CAT reply was malformed: {0}")]
    Protocol(&'static str),
    #[error("radio reported ID {0:04}, expected FTX-1 (0840)")]
    WrongRadio(u16),
    #[error("value out of range: {0}")]
    OutOfRange(&'static str),
}

pub type Result<T> = std::result::Result<T, Error>;

/// Snapshot of a single-VFO state, decoded from an `IF;` (main) or `OI;`
/// (sub) query. The two replies share the same 27-byte payload layout, so
/// they share this struct. We expose only the fields the TUI needs.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Status {
    pub frequency_hz: u32,
    pub clarifier_offset_hz: i16,
    pub rx_clarifier_on: bool,
    pub tx_clarifier_on: bool,
}

/// FTX-1 minimum and maximum tunable frequencies, per the CAT spec for `FA`.
pub const FREQ_MIN_HZ: u32 = 30_000;
pub const FREQ_MAX_HZ: u32 = 470_000_000;
/// Clarifier offset is in 10 Hz steps from 0 to ±9990 Hz.
pub const CLAR_OFFSET_ABS_MAX_HZ: i16 = 9_990;

pub enum Radio {
    Real(Arc<Mutex<Box<dyn SerialPort>>>),
    Mock(Arc<Mutex<MockState>>),
}

#[derive(Debug, Clone)]
pub struct MockState {
    pub status: Status,
    pub sub_status: Status,
}

impl Default for MockState {
    fn default() -> Self {
        let blank = Status {
            frequency_hz: 0,
            clarifier_offset_hz: 0,
            rx_clarifier_on: false,
            tx_clarifier_on: false,
        };
        Self {
            status: Status { frequency_hz: 14_074_000, ..blank },
            sub_status: Status { frequency_hz: 7_074_000, ..blank },
        }
    }
}

impl Radio {
    /// Open the serial port and verify that the attached radio is an FTX-1.
    pub async fn open(port: &str, baud: u32) -> Result<Self> {
        let port_name = port.to_string();
        let p = tokio::task::spawn_blocking(move || {
            serialport::new(&port_name, baud)
                .data_bits(serialport::DataBits::Eight)
                .parity(serialport::Parity::None)
                .stop_bits(serialport::StopBits::One)
                .flow_control(serialport::FlowControl::None)
                .timeout(READ_TIMEOUT)
                .open()
        })
        .await??;

        let radio = Radio::Real(Arc::new(Mutex::new(p)));
        let id_reply = radio.query(b"ID;").await?;
        let id = parse_id(&id_reply)?;
        if id != FTX1_RADIO_ID {
            return Err(Error::WrongRadio(id));
        }
        Ok(radio)
    }

    /// A no-op `Radio` for running the TUI without an FTX-1 attached. All
    /// `set_*` methods update an in-memory `Status` so the polled view stays
    /// consistent with what the user typed.
    pub fn mock() -> Self {
        Radio::Mock(Arc::new(Mutex::new(MockState::default())))
    }

    /// Send `FAxxxxxxxxx;` to set the VFO-A frequency on the main side.
    pub async fn set_freq(&self, hz: u32) -> Result<()> {
        if !(FREQ_MIN_HZ..=FREQ_MAX_HZ).contains(&hz) {
            return Err(Error::OutOfRange("frequency"));
        }
        match self {
            Radio::Real(_) => {
                let cmd = format!("FA{hz:09};");
                self.write_only(cmd.as_bytes()).await
            }
            Radio::Mock(state) => {
                state.lock().expect("mock state poisoned").status.frequency_hz = hz;
                Ok(())
            }
        }
    }

    /// Send `IF;` and decode the 27-byte payload into a [`Status`] for the
    /// main VFO.
    pub async fn read_status(&self) -> Result<Status> {
        match self {
            Radio::Real(_) => {
                let reply = self.query(b"IF;").await?;
                parse_status_reply(&reply, b"IF")
            }
            Radio::Mock(state) => Ok(state.lock().expect("mock state poisoned").status),
        }
    }

    /// Send `OI;` and decode the 27-byte payload into a [`Status`] for the
    /// sub VFO. The payload is structurally identical to `IF;`, only the
    /// prefix differs.
    pub async fn read_sub_status(&self) -> Result<Status> {
        match self {
            Radio::Real(_) => {
                let reply = self.query(b"OI;").await?;
                parse_status_reply(&reply, b"OI")
            }
            Radio::Mock(state) => Ok(state.lock().expect("mock state poisoned").sub_status),
        }
    }

    /// Enable/disable the RX and TX clarifier on the main side.
    /// Format: `CF0 0 0 [rx] [tx] 0 0 0;` (P3=0 → CLAR Setting).
    pub async fn set_clarifier_enabled(&self, rx_on: bool, tx_on: bool) -> Result<()> {
        match self {
            Radio::Real(_) => {
                let cmd = format!(
                    "CF000{}{}000;",
                    if rx_on { '1' } else { '0' },
                    if tx_on { '1' } else { '0' },
                );
                self.write_only(cmd.as_bytes()).await
            }
            Radio::Mock(state) => {
                let mut g = state.lock().expect("mock state poisoned");
                g.status.rx_clarifier_on = rx_on;
                g.status.tx_clarifier_on = tx_on;
                Ok(())
            }
        }
    }

    /// Set the clarifier offset in Hz. Must be in 10 Hz steps, range
    /// ±9990 Hz. The radio's `CF` accepts magnitude 0000–9990 with a
    /// separate `+`/`-` sign byte.
    /// Format: `CF0 0 1 [+/-] [4-digit Hz];`.
    pub async fn set_clarifier_offset(&self, hz: i16) -> Result<()> {
        if hz.abs() > CLAR_OFFSET_ABS_MAX_HZ {
            return Err(Error::OutOfRange("clarifier offset"));
        }
        if hz % 10 != 0 {
            return Err(Error::OutOfRange("clarifier offset must be a multiple of 10 Hz"));
        }
        match self {
            Radio::Real(_) => {
                let sign = if hz < 0 { '-' } else { '+' };
                let mag = hz.unsigned_abs();
                let cmd = format!("CF001{sign}{mag:04};");
                self.write_only(cmd.as_bytes()).await
            }
            Radio::Mock(state) => {
                state.lock().expect("mock state poisoned").status.clarifier_offset_hz = hz;
                Ok(())
            }
        }
    }

    /// Write `cmd` to the port without reading a reply. Used for `FA` and
    /// `CF` set, which the radio does not acknowledge.
    async fn write_only(&self, cmd: &[u8]) -> Result<()> {
        let port = match self {
            Radio::Real(p) => p.clone(),
            Radio::Mock(_) => return Ok(()),
        };
        let buf = cmd.to_vec();
        tokio::task::spawn_blocking(move || -> Result<()> {
            let mut g = port.lock().unwrap_or_else(|p| p.into_inner());
            g.write_all(&buf)?;
            g.flush()?;
            Ok(())
        })
        .await?
    }

    /// Write a CAT command and read the reply up to (and including) the
    /// `;` terminator. Returns the raw reply bytes.
    async fn query(&self, cmd: &[u8]) -> Result<Vec<u8>> {
        let port = match self {
            Radio::Real(p) => p.clone(),
            Radio::Mock(_) => unreachable!("mock paths should not reach query()"),
        };
        let buf = cmd.to_vec();
        tokio::task::spawn_blocking(move || -> Result<Vec<u8>> {
            let mut g = port.lock().unwrap_or_else(|p| p.into_inner());
            g.write_all(&buf)?;
            g.flush()?;

            let mut out = Vec::with_capacity(RX_BUF_CAP);
            let mut chunk = [0u8; RX_BUF_CAP];
            loop {
                match g.read(&mut chunk) {
                    Ok(0) => break,
                    Ok(n) => {
                        out.extend_from_slice(&chunk[..n]);
                        if out.last() == Some(&b';') || out.len() >= RX_BUF_CAP {
                            break;
                        }
                    }
                    Err(e) if e.kind() == ErrorKind::TimedOut => break,
                    Err(e) => return Err(e.into()),
                }
            }
            Ok(out)
        })
        .await?
    }
}

impl Drop for Radio {
    fn drop(&mut self) {
        // No safe-state writes for the FTX-1: it stays where the user
        // tuned it. We deliberately do not turn off the clarifier or
        // change the frequency on close.
    }
}

/// Decode an `IDxxxx;` reply into a u16 ID code.
fn parse_id(buf: &[u8]) -> Result<u16> {
    if buf.len() != 7 || &buf[..2] != b"ID" || buf[6] != b';' {
        return Err(Error::Protocol("ID reply has wrong shape"));
    }
    std::str::from_utf8(&buf[2..6])
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .ok_or(Error::Protocol("ID payload is not numeric"))
}

/// Decode an `IF;` or `OI;` reply. Layout (30 bytes total):
/// `<prefix>` + 5(ch) + 9(freq) + 1(±) + 4(clar) + 1(RX) + 1(TX) + 1(mode)
///      + 1(chType) + 1(SQL) + 2(00) + 1(shift) + `;`.
fn parse_status_reply(buf: &[u8], prefix: &[u8; 2]) -> Result<Status> {
    if buf.len() != 30 || &buf[..2] != prefix || buf[29] != b';' {
        return Err(Error::Protocol("status reply has wrong shape"));
    }
    let freq = std::str::from_utf8(&buf[7..16])
        .ok()
        .and_then(|s| s.parse::<u32>().ok())
        .ok_or(Error::Protocol("status frequency is not numeric"))?;
    let sign = match buf[16] {
        b'+' => 1i16,
        b'-' => -1i16,
        _ => return Err(Error::Protocol("status clarifier direction is not +/-")),
    };
    let mag = std::str::from_utf8(&buf[17..21])
        .ok()
        .and_then(|s| s.parse::<i16>().ok())
        .ok_or(Error::Protocol("status clarifier offset is not numeric"))?;
    let rx_on = match buf[21] {
        b'0' => false,
        b'1' => true,
        _ => return Err(Error::Protocol("status RX-clarifier flag invalid")),
    };
    let tx_on = match buf[22] {
        b'0' => false,
        b'1' => true,
        _ => return Err(Error::Protocol("status TX-clarifier flag invalid")),
    };
    Ok(Status {
        frequency_hz: freq,
        clarifier_offset_hz: sign * mag,
        rx_clarifier_on: rx_on,
        tx_clarifier_on: tx_on,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_id_accepts_ftx1() {
        assert_eq!(parse_id(b"ID0840;").unwrap(), 840);
    }

    #[test]
    fn parse_id_rejects_garbage() {
        assert!(parse_id(b"ID;").is_err());
        assert!(parse_id(b"ID08400").is_err());
        assert!(parse_id(b"XX0840;").is_err());
        assert!(parse_id(b"IDABCD;").is_err());
    }

    #[test]
    fn parse_if_extracts_freq_and_clarifier() {
        // Hand-crafted reply: ch 00000, freq 014074000, clar -0500,
        // RX on, TX off, mode 2 (USB), chType 0, SQL 0, P9 00, shift 0, ';'.
        let reply = b"IF00000014074000-050010200000;";
        assert_eq!(reply.len(), 30);
        let s = parse_status_reply(reply, b"IF").unwrap();
        assert_eq!(s.frequency_hz, 14_074_000);
        assert_eq!(s.clarifier_offset_hz, -500);
        assert!(s.rx_clarifier_on);
        assert!(!s.tx_clarifier_on);
    }

    #[test]
    fn parse_if_handles_positive_offset_and_both_clar_on() {
        let reply = b"IF00000007050000+099011200000;";
        assert_eq!(reply.len(), 30);
        let s = parse_status_reply(reply, b"IF").unwrap();
        assert_eq!(s.frequency_hz, 7_050_000);
        assert_eq!(s.clarifier_offset_hz, 990);
        assert!(s.rx_clarifier_on);
        assert!(s.tx_clarifier_on);
    }

    #[test]
    fn parse_if_rejects_wrong_length() {
        assert!(parse_status_reply(b"IF;", b"IF").is_err());
        assert!(parse_status_reply(b"IF00000014074000+0000002120000;X", b"IF").is_err());
    }

    #[test]
    fn parse_oi_extracts_sub_freq() {
        // Same payload shape as IF; only the prefix differs.
        let reply = b"OI00000007074000+000000200000;";
        assert_eq!(reply.len(), 30);
        let s = parse_status_reply(reply, b"OI").unwrap();
        assert_eq!(s.frequency_hz, 7_074_000);
        // An IF-prefixed parse must reject this reply so a swapped reply
        // can't be silently misread.
        assert!(parse_status_reply(reply, b"IF").is_err());
    }

    #[tokio::test]
    async fn mock_read_sub_status_returns_default_sub_freq() {
        let r = Radio::mock();
        let s = r.read_sub_status().await.unwrap();
        assert_eq!(s.frequency_hz, 7_074_000);
    }

    #[tokio::test]
    async fn mock_set_freq_round_trips_through_status() {
        let r = Radio::mock();
        r.set_freq(7_050_000).await.unwrap();
        let s = r.read_status().await.unwrap();
        assert_eq!(s.frequency_hz, 7_050_000);
    }

    #[tokio::test]
    async fn mock_clarifier_settings_round_trip() {
        let r = Radio::mock();
        r.set_clarifier_enabled(true, false).await.unwrap();
        r.set_clarifier_offset(-1230).await.unwrap();
        let s = r.read_status().await.unwrap();
        assert!(s.rx_clarifier_on);
        assert!(!s.tx_clarifier_on);
        assert_eq!(s.clarifier_offset_hz, -1230);
    }

    #[tokio::test]
    async fn set_freq_rejects_out_of_range() {
        let r = Radio::mock();
        assert!(r.set_freq(29_999).await.is_err());
        assert!(r.set_freq(470_000_001).await.is_err());
    }

    #[tokio::test]
    async fn set_clarifier_offset_rejects_off_grid_or_overrange() {
        let r = Radio::mock();
        assert!(r.set_clarifier_offset(5).await.is_err()); // not a 10 Hz step
        assert!(r.set_clarifier_offset(10_000).await.is_err());
        assert!(r.set_clarifier_offset(-9_990).await.is_ok());
    }
}
