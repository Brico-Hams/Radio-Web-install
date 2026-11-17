use std::path::{Path, PathBuf};
use std::{fs, io};

use serde::{Deserialize, Serialize};
use toml_edit::{DocumentMut, Item, Table, value};

const DEFAULT_TOML: &str = include_str!("../../config.example.toml");

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Config {
    pub port: String,
    pub baud: u32,
    pub base_hz: u32,
    #[serde(default, rename = "freq_memory")]
    pub freq_memories: Vec<FreqMemory>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct FreqMemory {
    pub label: String,
    pub hz: u32,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("no config dir available; pass --config <path>")]
    NoConfigDir,
    #[error("I/O error on {path}: {source}")]
    Io { path: PathBuf, source: io::Error },
    #[error("parse error in {path}: {source}")]
    Parse {
        path: PathBuf,
        source: toml::de::Error,
    },
    #[error("edit-parse error in {path}: {source}")]
    EditParse {
        path: PathBuf,
        source: toml_edit::TomlError,
    },
}

pub fn default_path() -> Result<PathBuf, ConfigError> {
    dirs::config_dir()
        .map(|d| d.join("ftx1-ctl").join("config.toml"))
        .ok_or(ConfigError::NoConfigDir)
}

/// Save / overwrite a freq-memory slot in the config file at `path`. Slots
/// past the current end of the `[[freq_memory]]` array are padded with
/// placeholder entries (empty label, `hz = 0`); the renderer treats `hz == 0`
/// as an empty slot. Comments and surrounding formatting are preserved.
pub fn save_freq_memory(path: &Path, slot: usize, label: &str, hz: u32) -> Result<(), ConfigError> {
    let text = fs::read_to_string(path).map_err(|e| ConfigError::Io {
        path: path.into(),
        source: e,
    })?;
    let mut doc: DocumentMut = text.parse().map_err(|e| ConfigError::EditParse {
        path: path.into(),
        source: e,
    })?;

    let arr = doc
        .entry("freq_memory")
        .or_insert(Item::ArrayOfTables(Default::default()))
        .as_array_of_tables_mut()
        .expect("`freq_memory` must be an array of tables");

    while arr.len() <= slot {
        let mut t = Table::new();
        t["label"] = value("");
        t["hz"] = value(0i64);
        arr.push(t);
    }

    let target = arr.get_mut(slot).expect("padding ensured slot exists");
    target["label"] = value(label);
    target["hz"] = value(hz as i64);

    fs::write(path, doc.to_string()).map_err(|e| ConfigError::Io {
        path: path.into(),
        source: e,
    })?;
    Ok(())
}

/// Load config from `path`. If the file doesn't exist, write the bundled
/// example to it and return the parsed result. Returns `(config, was_created)`.
pub fn load_or_create(path: &Path) -> Result<(Config, bool), ConfigError> {
    if path.exists() {
        let text = fs::read_to_string(path).map_err(|e| ConfigError::Io {
            path: path.into(),
            source: e,
        })?;
        let cfg = toml::from_str(&text).map_err(|e| ConfigError::Parse {
            path: path.into(),
            source: e,
        })?;
        Ok((cfg, false))
    } else {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| ConfigError::Io {
                path: parent.into(),
                source: e,
            })?;
        }
        fs::write(path, DEFAULT_TOML).map_err(|e| ConfigError::Io {
            path: path.into(),
            source: e,
        })?;
        let cfg = toml::from_str(DEFAULT_TOML).map_err(|e| ConfigError::Parse {
            path: path.into(),
            source: e,
        })?;
        Ok((cfg, true))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    const MIN_CFG: &str = r#"
port    = "/dev/ttyS3"
baud    = 38_400
base_hz = 14_074_000
"#;

    fn write_config(contents: &str) -> NamedTempFile {
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(contents.as_bytes()).unwrap();
        f
    }

    fn parse(path: &Path) -> Config {
        let text = fs::read_to_string(path).unwrap();
        toml::from_str(&text).unwrap()
    }

    #[test]
    fn save_freq_memory_round_trips() {
        let f = write_config(MIN_CFG);
        save_freq_memory(f.path(), 0, "20m FT8", 14_074_000).unwrap();
        let cfg = parse(f.path());
        assert_eq!(cfg.freq_memories.len(), 1);
        assert_eq!(cfg.freq_memories[0].label, "20m FT8");
        assert_eq!(cfg.freq_memories[0].hz, 14_074_000);
    }

    #[test]
    fn save_freq_memory_pads_with_sentinels() {
        let f = write_config(MIN_CFG);
        save_freq_memory(f.path(), 3, "far", 28_000_000).unwrap();
        let cfg = parse(f.path());
        assert_eq!(cfg.freq_memories.len(), 4);
        for i in 0..3 {
            assert_eq!(cfg.freq_memories[i].hz, 0);
        }
        assert_eq!(cfg.freq_memories[3].label, "far");
    }

    #[test]
    fn save_freq_memory_overwrites_in_place() {
        let cfg = format!(
            "{MIN_CFG}\n[[freq_memory]]\nlabel = \"old\"\nhz = 7_000_000\n"
        );
        let f = write_config(&cfg);
        save_freq_memory(f.path(), 0, "new", 14_000_000).unwrap();
        let parsed = parse(f.path());
        assert_eq!(parsed.freq_memories.len(), 1);
        assert_eq!(parsed.freq_memories[0].label, "new");
        assert_eq!(parsed.freq_memories[0].hz, 14_000_000);
    }
}
