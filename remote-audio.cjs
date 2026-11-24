"use strict";
// Audio bridge for the remote shack agent, built only on ffmpeg (external tool, PATH or RADICODEX_FFMPEG).
//
// RX: ONE ffmpeg process opens the capture device and has two outputs: (1) Opus-in-Ogg on stdout, parsed here into raw
// 20 ms packets, and (2) a null output whose filter chain (asetnsamples -> astats -> ametadata print) logs the RMS of each
// 500 ms block to stderr. Using a second output instead of a second process guarantees the device is opened once.
// TX: the PTT owner's raw Opus packets are wrapped in Ogg and fed to ffmpeg, which plays them through ALSA (Linux) or
// decodes to PCM for scripts/winaudio-out.ps1 (Windows, waveOut). macOS TX is not supported yet.
const childProcess = require("node:child_process");
const path = require("node:path");

// Single-talker idea adapted from remoteAudio audio/nodes/doorman/doorman.go (MIT, Copyright (c) 2016 Tobias Wellnitz,
// DH1TW; SPDX-License-Identifier: MIT). Changes: JavaScript, injectable clock, per-packet source id, hard reset on every
// new transmission and the queued audio of the previous talker is killed instead of played. See docs/THIRD-PARTY-REUSE.md.
const TX_TALKER_HOLD_MS = 200;
const SAMPLE_RATE = 48000;
const PCM_RATE = 12000;
const FRAME_SAMPLES = 960;
const PRE_SKIP = 312;
const RMS_BLOCK_SAMPLES = 24000;
const WIN_OUT_SCRIPT = path.join(__dirname, "scripts", "winaudio-out.ps1");

// ---- Ogg ----
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i << 24;
    for (let bit = 0; bit < 8; bit += 1) value = value & 0x80000000 ? ((value << 1) ^ 0x04C11DB7) : (value << 1);
    table[i] = value >>> 0;
  }
  return table;
})();

function oggCrc(buffer) {
  let crc = 0;
  for (let i = 0; i < buffer.length; i += 1) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ buffer[i]) & 0xff]) >>> 0;
  return crc >>> 0;
}

// One page carrying a single packet (up to 255 * 255 bytes), which is all an Opus packet or header ever needs.
function oggPage({ packet, granule = 0n, serial = 1, sequence = 0, headerType = 0 }) {
  const segments = [];
  let left = packet.length;
  while (left >= 255) { segments.push(255); left -= 255; }
  segments.push(left);
  if (segments.length > 255) throw new Error("Paquete demasiado grande para una pagina Ogg.");
  const header = Buffer.alloc(27 + segments.length);
  header.write("OggS", 0, "latin1");
  header[5] = headerType;
  header.writeBigUInt64LE(BigInt(granule), 6);
  header.writeUInt32LE(serial >>> 0, 14);
  header.writeUInt32LE(sequence >>> 0, 18);
  header[26] = segments.length;
  Buffer.from(segments).copy(header, 27);
  const page = Buffer.concat([header, packet]);
  page.writeUInt32LE(oggCrc(page), 22);
  return page;
}

function opusHead({ channels = 1, sampleRate = SAMPLE_RATE, preSkip = PRE_SKIP } = {}) {
  const head = Buffer.alloc(19);
  head.write("OpusHead", 0, "latin1");
  head[8] = 1;
  head[9] = channels;
  head.writeUInt16LE(preSkip, 10);
  head.writeUInt32LE(sampleRate, 12);
  head.writeUInt16LE(0, 16);
  head[18] = 0;
  return head;
}

function opusTags(vendor = "radicodex") {
  const vendorBytes = Buffer.from(vendor, "utf8");
  const tags = Buffer.alloc(8 + 4 + vendorBytes.length + 4);
  tags.write("OpusTags", 0, "latin1");
  tags.writeUInt32LE(vendorBytes.length, 8);
  vendorBytes.copy(tags, 12);
  return tags;
}

// Wraps raw Opus packets (20 ms each) into a valid Ogg Opus stream, one page per packet.
class OggOpusMuxer {
  constructor({ serial = (Math.random() * 0xffffffff) >>> 0, frameSamples = FRAME_SAMPLES } = {}) {
    this.serial = serial;
    this.frameSamples = frameSamples;
    this.sequence = 0;
    this.granule = BigInt(PRE_SKIP);
    this.started = false;
  }

  header() {
    this.started = true;
    const pages = [
      oggPage({ packet: opusHead(), serial: this.serial, sequence: this.sequence++, headerType: 0x02 }),
      oggPage({ packet: opusTags(), serial: this.serial, sequence: this.sequence++ })
    ];
    return Buffer.concat(pages);
  }

  packet(opus) {
    const prefix = this.started ? Buffer.alloc(0) : this.header();
    this.granule += BigInt(this.frameSamples);
    return Buffer.concat([prefix, oggPage({ packet: opus, granule: this.granule, serial: this.serial, sequence: this.sequence++ })]);
  }
}

// Incremental Ogg demuxer: feed() returns the audio packets completed by the new bytes (headers are skipped).
class OggPacketParser {
  constructor() {
    this.buffer = Buffer.alloc(0);
    this.partial = [];
  }

  feed(chunk) {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    const packets = [];
    for (;;) {
      const start = this.buffer.indexOf("OggS", 0, "latin1");
      if (start < 0) { this.buffer = this.buffer.subarray(Math.max(0, this.buffer.length - 3)); break; }
      if (start > 0) this.buffer = this.buffer.subarray(start);
      if (this.buffer.length < 27) break;
      const count = this.buffer[26];
      if (this.buffer.length < 27 + count) break;
      let dataLength = 0;
      for (let i = 0; i < count; i += 1) dataLength += this.buffer[27 + i];
      const total = 27 + count + dataLength;
      if (this.buffer.length < total) break;
      const continued = Boolean(this.buffer[5] & 0x01);
      if (!continued) this.partial = [];
      let offset = 27 + count;
      let current = this.partial;
      for (let i = 0; i < count; i += 1) {
        const size = this.buffer[27 + i];
        current.push(this.buffer.subarray(offset, offset + size));
        offset += size;
        if (size < 255) {
          const packet = Buffer.concat(current);
          current = [];
          const tag = packet.subarray(0, 8).toString("latin1");
          if (tag !== "OpusHead" && tag !== "OpusTags") packets.push(packet);
        }
      }
      this.partial = current;
      this.buffer = this.buffer.subarray(total);
    }
    return packets;
  }
}

// ---- Device listing ----
function parseDshowAudioDevices(text) {
  const names = [];
  let section = "";
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (/DirectShow audio devices/i.test(line)) { section = "audio"; continue; }
    if (/DirectShow video devices/i.test(line)) { section = "video"; continue; }
    if (/Alternative name/i.test(line)) continue;
    const tagged = /^\[[^\]]*\]\s+"(.+)"\s+\((audio|video|none)\)\s*$/.exec(line);
    if (tagged) { if (tagged[2] === "audio") names.push(tagged[1]); continue; }
    const legacy = /^\[[^\]]*\]\s+"(.+)"\s*$/.exec(line);
    if (legacy && section === "audio") names.push(legacy[1]);
  }
  return [...new Set(names)];
}

// `arecord -L` / `aplay -L`: names start in column 0, descriptions are indented.
function parseAlsaList(text) {
  const names = [];
  for (const raw of String(text).split(/\r?\n/)) {
    if (!raw.trim() || /^\s/.test(raw)) continue;
    const name = raw.trim();
    if (name !== "null") names.push(name);
  }
  return [...new Set(names)];
}

function parseAvfoundationAudioDevices(text) {
  const names = [];
  let audio = false;
  for (const raw of String(text).split(/\r?\n/)) {
    if (/AVFoundation audio devices/i.test(raw)) { audio = true; continue; }
    if (/AVFoundation video devices/i.test(raw)) { audio = false; continue; }
    const match = /\[\d+\]\s+(.+?)\s*$/.exec(raw);
    if (audio && match) names.push(match[1]);
  }
  return names;
}

const parseLineList = text => [...new Set(String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean))];

function runCapture(command, args, { spawn = childProcess.spawn, timeoutMs = 10_000 } = {}) {
  return new Promise(resolve => {
    let child;
    try { child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, shell: false }); }
    catch { resolve({ stdout: "", stderr: "" }); return; }
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout?.on("data", chunk => { stdout += chunk; });
    child.stderr?.on("data", chunk => { stderr += chunk; });
    child.on("error", () => { clearTimeout(timer); resolve({ stdout, stderr }); });
    child.on("close", () => { clearTimeout(timer); resolve({ stdout, stderr }); });
  });
}

function powershellArgs(script, extra = []) {
  return ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, ...extra];
}

async function listAudioDevices({ platform = process.platform, run = runCapture, ffmpegPath = process.env.RADICODEX_FFMPEG || "ffmpeg" } = {}) {
  try {
    if (platform === "win32") {
      const [inputs, outputs] = await Promise.all([
        run(ffmpegPath, ["-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"]),
        run("powershell.exe", powershellArgs(WIN_OUT_SCRIPT, ["-List"]))
      ]);
      return { inputs: parseDshowAudioDevices(`${inputs.stderr}\n${inputs.stdout}`), outputs: parseLineList(outputs.stdout) };
    }
    if (platform === "linux") {
      const [inputs, outputs] = await Promise.all([run("arecord", ["-L"]), run("aplay", ["-L"])]);
      return { inputs: parseAlsaList(inputs.stdout), outputs: parseAlsaList(outputs.stdout) };
    }
    if (platform === "darwin") {
      const inputs = await run(ffmpegPath, ["-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", ""]);
      return { inputs: parseAvfoundationAudioDevices(`${inputs.stderr}\n${inputs.stdout}`), outputs: [] };
    }
  } catch { /* fall through to an empty listing */ }
  return { inputs: [], outputs: [] };
}

// ---- ffmpeg argument builders ----
// With pcm, a third output writes mono s16le at PCM_RATE (ffmpeg resamples) on fd 3 for the receive-only FT8 decoder.
function captureArgs(input, platform = process.platform, { pcm = false } = {}) {
  const source = platform === "win32" ? ["-f", "dshow", "-i", `audio=${input}`]
    : platform === "darwin" ? ["-f", "avfoundation", "-i", `:${input}`]
      : ["-f", "alsa", "-i", input];
  const pcmOutput = pcm ? ["-map", "0:a", "-ac", "1", "-ar", String(PCM_RATE), "-f", "s16le", "pipe:3"] : [];
  return [
    "-hide_banner", "-nostdin", "-loglevel", "info", "-fflags", "nobuffer", "-flags", "low_delay", ...source,
    "-map", "0:a", "-ac", "1", "-ar", String(SAMPLE_RATE), "-c:a", "libopus", "-b:a", "24k", "-application", "voip",
    "-frame_duration", "20", "-f", "ogg", "pipe:1",
    "-map", "0:a", "-ac", "1", "-ar", String(SAMPLE_RATE),
    "-af", `asetnsamples=n=${RMS_BLOCK_SAMPLES}:p=0,astats=metadata=1:reset=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level`,
    "-f", "null", "-",
    ...pcmOutput
  ];
}

function playbackArgs(output, platform = process.platform) {
  const input = ["-hide_banner", "-nostdin", "-loglevel", "error", "-fflags", "nobuffer", "-f", "ogg", "-i", "pipe:0"];
  if (platform === "win32") return [...input, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", "pipe:1"];
  return [...input, "-f", "alsa", output];
}

const RMS_LINE = /lavfi\.astats\.Overall\.RMS_level=(-?inf|-?\d+(?:\.\d+)?)/i;

function parseRmsLine(line) {
  const match = RMS_LINE.exec(line);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.max(-120, Math.round(value * 10) / 10) : -120;
}

// ---- Capture (RX) ----
function createCapture({ input, platform, spawn, ffmpegPath, log, onPacket, onLevel, onPcm, wantsPcm = () => false, backoffMinMs = 500, backoffMaxMs = 10_000 }) {
  let child = null;
  let withPcm = false;
  let wanted = false;
  let retry = null;
  let attempt = 0;
  let missing = false;

  function launch() {
    if (!wanted || child || missing) return;
    const parser = new OggPacketParser();
    let stderrBuffer = "";
    let current;
    const pcm = Boolean(onPcm) && wantsPcm();
    try {
      current = spawn(ffmpegPath, captureArgs(input, platform, { pcm }), {
        stdio: pcm ? ["ignore", "pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"], windowsHide: true, shell: false
      });
    } catch (error) { log(`ffmpeg RX: ${error.message}`); scheduleRetry(); return; }
    child = current;
    withPcm = pcm;
    if (pcm) {
      current.stdio?.[3]?.on("data", chunk => { if (child === current) onPcm(chunk); });
      current.stdio?.[3]?.on("error", () => {});
    }
    current.stdout.on("data", chunk => { for (const packet of parser.feed(chunk)) onPacket(packet); attempt = 0; });
    current.stderr.on("data", chunk => {
      stderrBuffer += chunk.toString("latin1");
      let index;
      while ((index = stderrBuffer.indexOf("\n")) >= 0) {
        const line = stderrBuffer.slice(0, index);
        stderrBuffer = stderrBuffer.slice(index + 1);
        const rms = parseRmsLine(line);
        if (rms !== null) onLevel(rms);
      }
      if (stderrBuffer.length > 8192) stderrBuffer = stderrBuffer.slice(-1024);
    });
    current.on("error", error => {
      if (error.code === "ENOENT") { missing = true; log("ffmpeg no encontrado: audio RX desactivado."); }
      else log(`ffmpeg RX: ${error.message}`);
    });
    current.on("close", code => {
      if (child === current) child = null;
      if (wanted && !missing) { log(`ffmpeg RX terminado (${code}); reintentando`); scheduleRetry(); }
    });
  }

  function scheduleRetry() {
    if (!wanted || retry) return;
    const delay = Math.min(backoffMaxMs, backoffMinMs * 2 ** attempt);
    attempt += 1;
    retry = setTimeout(() => { retry = null; launch(); }, delay);
    retry.unref?.();
  }

  return {
    start() { wanted = true; launch(); },
    stop() {
      wanted = false;
      clearTimeout(retry);
      retry = null;
      attempt = 0;
      const current = child;
      child = null;
      current?.kill();
    },
    get running() { return Boolean(child); },
    get pcm() { return withPcm; }
  };
}

// ---- Playback sink (TX) ----
function createPlaybackSink({ output, platform, spawn, ffmpegPath, log }) {
  const muxer = new OggOpusMuxer();
  const children = [];
  let ended = false;
  const decoder = spawn(ffmpegPath, playbackArgs(output, platform), {
    stdio: ["pipe", platform === "win32" ? "pipe" : "ignore", "ignore"], windowsHide: true, shell: false
  });
  children.push(decoder);
  decoder.on("error", error => log(`ffmpeg TX: ${error.message}`));
  decoder.stdin.on("error", () => {});
  if (platform === "win32") {
    const player = spawn("powershell.exe", powershellArgs(WIN_OUT_SCRIPT, ["-Device", output]), {
      stdio: ["pipe", "ignore", "ignore"], windowsHide: true, shell: false
    });
    children.push(player);
    player.on("error", error => log(`winaudio-out: ${error.message}`));
    player.stdin.on("error", () => {});
    decoder.stdout.on("error", () => {});
    decoder.stdout.pipe(player.stdin);
  }
  decoder.stdin.write(muxer.header());
  return {
    write(opus) {
      if (ended || !decoder.stdin.writable) return;
      decoder.stdin.write(muxer.packet(opus));
    },
    end({ kill = false } = {}) {
      if (ended) return;
      ended = true;
      decoder.stdin.end();
      if (kill) { for (const child of children) child.kill(); return; }
      // The pipeline drains by itself when stdin closes; kill it if it lingers.
      const timer = setTimeout(() => { for (const child of children) child.kill(); }, 3000);
      timer.unref?.();
      decoder.on("close", () => clearTimeout(timer));
    }
  };
}

// ---- Service used by the agent ----
// Hooks `createCapture` and `createSink` exist so tests can inject fakes without spawning ffmpeg.
function createAudio(options = {}) {
  const platform = options.platform || process.platform;
  const spawn = options.spawn || childProcess.spawn;
  const ffmpegPath = options.ffmpegPath || process.env.RADICODEX_FFMPEG || "ffmpeg";
  const log = options.log || (() => {});
  const idleMs = options.idleMs ?? 10_000;
  const txStopMs = options.txStopMs ?? 2000;
  const input = typeof options.input === "string" ? options.input : "";
  const output = typeof options.output === "string" ? options.output : "";
  const txSupported = platform !== "darwin";
  const rx = input !== "";
  const tx = output !== "" && txSupported;
  const clock = options.now || Date.now;
  const subscribers = new Set();
  let capture = null;
  let idleTimer = null;
  let sink = null;
  let txTimer = null;
  // Single talker ("doorman"): only one source feeds the sink; another one is dropped until the current one has been
  // silent for TX_TALKER_HOLD_MS.
  let talker = null;
  let talkerHeard = 0;

  const emitPacket = packet => { for (const entry of [...subscribers]) entry.onPacket?.(packet); };
  const emitLevel = rms => { for (const entry of [...subscribers]) entry.onLevel?.(rms); };

  const emitPcm = chunk => { for (const entry of [...subscribers]) entry.onPcm?.(chunk); };
  const wantsPcm = () => [...subscribers].some(entry => entry.onPcm);

  function ensureCapture() {
    if (!capture) {
      const params = { onPacket: emitPacket, onLevel: emitLevel, onPcm: emitPcm, wantsPcm };
      capture = options.createCapture
        ? options.createCapture(params)
        : createCapture({ input, platform, spawn, ffmpegPath, log, ...params });
    }
    capture.start();
  }

  function subscribe(entry) {
    if (!rx) return () => {};
    subscribers.add(entry);
    clearTimeout(idleTimer);
    idleTimer = null;
    // A running capture started without the PCM tap is restarted once so the first PCM subscriber gets it.
    if (entry.onPcm && capture && capture.running && !capture.pcm) capture.stop();
    ensureCapture();
    return () => {
      subscribers.delete(entry);
      if (subscribers.size || idleTimer) return;
      idleTimer = setTimeout(() => { idleTimer = null; if (!subscribers.size) capture?.stop(); }, idleMs);
      idleTimer.unref?.();
    };
  }

  // `source` identifies who sent the packet; without it the doorman is bypassed (single caller).
  function txWrite(packet, source) {
    if (!tx) return false;
    if (source !== undefined) {
      const time = clock();
      if (talker !== null && talker !== source) {
        if (time - talkerHeard < TX_TALKER_HOLD_MS) return false;
        // The previous talker's queued audio must never reach the radio under the new talker.
        endSink({ kill: true });
      }
      talker = source;
      talkerHeard = time;
    }
    clearTimeout(txTimer);
    txTimer = null;
    if (!sink) {
      try {
        sink = options.createSink ? options.createSink() : createPlaybackSink({ output, platform, spawn, ffmpegPath, log });
      } catch (error) { log(`TX: ${error.message}`); return false; }
    }
    sink.write(packet);
    return true;
  }

  function endSink(options) {
    const current = sink;
    sink = null;
    current?.end(options);
  }

  // A new transmission starts: audio still queued from an earlier one (any talker) is discarded, never transmitted.
  function txBegin() {
    clearTimeout(txTimer);
    txTimer = null;
    talker = null;
    endSink({ kill: true });
  }

  // PTT released: keep the pipeline briefly so the tail of the audio is played, then stop it.
  function txRelease() {
    if (!sink || txTimer) return;
    txTimer = setTimeout(() => { txTimer = null; endSink(); }, txStopMs);
    txTimer.unref?.();
  }

  function close() {
    clearTimeout(idleTimer);
    clearTimeout(txTimer);
    idleTimer = null;
    txTimer = null;
    subscribers.clear();
    capture?.stop();
    endSink({ kill: true });
  }

  return {
    rx, tx,
    txReason: output !== "" && !txSupported ? "TX de audio no disponible en este sistema." : "",
    subscribe, txWrite, txBegin, txRelease, close
  };
}

module.exports = {
  oggCrc, oggPage, opusHead, opusTags, OggOpusMuxer, OggPacketParser,
  parseDshowAudioDevices, parseAlsaList, parseAvfoundationAudioDevices, parseRmsLine,
  PCM_RATE, captureArgs, playbackArgs, listAudioDevices, createAudio, createCapture, createPlaybackSink
};
