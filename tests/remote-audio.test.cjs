"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { acceptKey, acceptUpgrade } = require("../remote-ws.cjs");
const audio = require("../remote-audio.cjs");
const station = require("../remote-station.cjs");
const { connectWs } = require("./ws-client.cjs");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function wsServer(onConnection) {
  const server = http.createServer((request, response) => response.end("x"));
  const sockets = new Set();
  server.on("upgrade", (request, socket, head) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    const ws = acceptUpgrade(request, socket, head, { maxPayload: 4096 });
    if (ws) onConnection(ws);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return {
    port: server.address().port,
    close: () => new Promise(resolve => {
      server.close(() => resolve());
      server.closeAllConnections();
      for (const socket of sockets) socket.destroy();
    })
  };
}

test("handshake computes Sec-WebSocket-Accept (RFC 6455 example) and rejects bad requests", async () => {
  assert.equal(acceptKey("dGhlIHNhbXBsZSBub25jZQ=="), "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
  const server = await wsServer(() => {});
  try {
    const client = await connectWs(server.port);
    assert.equal(client.status, 101);
    assert.equal(client.accept, acceptKey(client.key));
    client.close();
    const bad = await connectWs(server.port, "/api/audio", { headers: { "Sec-WebSocket-Version": "8" } }).catch(() => null);
    // The duplicated version header makes the request invalid.
    assert.ok(bad === null || bad.status === 400);
    bad?.close();
  } finally { await server.close(); }
});

test("text and binary frames, fragmentation and ping/pong", async () => {
  const received = [];
  const server = await wsServer(ws => {
    ws.on("message", (data, binary) => { received.push({ data, binary }); ws.send(data); });
  });
  try {
    const client = await connectWs(server.port);
    client.send("hola");
    assert.deepEqual(await client.next(), { text: "hola" });
    client.send(Buffer.from([1, 2, 3]));
    assert.deepEqual((await client.next()).binary, Buffer.from([1, 2, 3]));
    client.sendFrame(1, "fra", { fin: false });
    client.sendFrame(9, "p1");
    client.sendFrame(0, "gmen", { fin: false });
    client.sendFrame(0, "to", { fin: true });
    assert.deepEqual(await client.next(), { text: "fragmento" });
    await sleep(30);
    assert.deepEqual(client.pongs, [Buffer.from("p1")]);
    const big = Buffer.alloc(300, 7);
    client.send(big);
    assert.equal((await client.next()).binary.length, 300);
    client.sendFrame(8, Buffer.from([0x03, 0xe8]));
    assert.equal(await client.waitClose(), 1000);
    assert.equal(received.length, 4);
  } finally { await server.close(); }
});

test("protocol violations close with the proper code: unmasked 1002, oversize 1009, bad utf8 1007", async () => {
  const closes = [];
  const server = await wsServer(ws => ws.on("close", code => closes.push(code)));
  try {
    const unmasked = await connectWs(server.port);
    unmasked.sendFrame(1, "x", { mask: false });
    assert.equal(await unmasked.waitClose(), 1002);
    const big = await connectWs(server.port);
    big.send(Buffer.alloc(4097));
    assert.equal(await big.waitClose(), 1009);
    const split = await connectWs(server.port);
    split.sendFrame(2, Buffer.alloc(3000), { fin: false });
    split.sendFrame(0, Buffer.alloc(3000), { fin: true });
    assert.equal(await split.waitClose(), 1009);
    const utf = await connectWs(server.port);
    utf.sendFrame(1, Buffer.from([0xff, 0xfe]));
    assert.equal(await utf.waitClose(), 1007);
    const control = await connectWs(server.port);
    control.sendFrame(9, Buffer.alloc(200));
    assert.equal(await control.waitClose(), 1002);
    await sleep(50);
    assert.equal(closes.length, 5);
  } finally { await server.close(); }
});

test("a close frame from the server side reaches the client with its code", async () => {
  const server = await wsServer(ws => ws.close(4401, "auth"));
  try {
    const client = await connectWs(server.port);
    assert.equal(await client.waitClose(), 4401);
  } finally { await server.close(); }
});

// ---- Ogg ----
// Independent bit-by-bit CRC (MSB first, poly 0x04C11DB7, init 0, no reflection, no final xor).
function slowCrc(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte << 24;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x80000000) ? ((crc << 1) ^ 0x04c11db7) : (crc << 1);
    crc >>>= 0;
  }
  return crc >>> 0;
}

function rawPage({ segments, data, headerType = 0, granule = 0n, serial = 0x1234, sequence = 0 }) {
  const header = Buffer.alloc(27 + segments.length);
  header.write("OggS", 0, "latin1");
  header[5] = headerType;
  header.writeBigUInt64LE(granule, 6);
  header.writeUInt32LE(serial, 14);
  header.writeUInt32LE(sequence, 18);
  header[26] = segments.length;
  Buffer.from(segments).copy(header, 27);
  const page = Buffer.concat([header, data]);
  page.writeUInt32LE(slowCrc(page), 22);
  return page;
}

test("Ogg CRC and page layout match an independently built page", () => {
  const packet = Buffer.from("OpusHead-test-payload");
  const expected = rawPage({ segments: [packet.length], data: packet, headerType: 2, granule: 960n, serial: 7, sequence: 3 });
  const built = audio.oggPage({ packet, granule: 960n, serial: 7, sequence: 3, headerType: 2 });
  assert.equal(built.toString("hex"), expected.toString("hex"));
  const zeroed = Buffer.from(built);
  zeroed.writeUInt32LE(0, 22);
  assert.equal(audio.oggCrc(zeroed), built.readUInt32LE(22));
  assert.equal(audio.oggCrc(Buffer.alloc(0)), 0);
});

test("muxer writes OpusHead/OpusTags and granule positions; parser round-trips packets", () => {
  const muxer = new audio.OggOpusMuxer({ serial: 99 });
  const packets = [Buffer.from([0xf8, 1, 2]), Buffer.alloc(300, 5), Buffer.alloc(255, 6), Buffer.alloc(510, 8), Buffer.from([0xfc])];
  const stream = Buffer.concat(packets.map(packet => muxer.packet(packet)));
  assert.equal(stream.subarray(0, 4).toString("latin1"), "OggS");
  assert.equal(stream[5], 0x02);
  assert.ok(stream.includes(Buffer.from("OpusHead")));
  assert.ok(stream.includes(Buffer.from("OpusTags")));
  // Every page CRC must be valid and granules must grow by 960 samples per packet.
  let offset = 0;
  const granules = [];
  while (offset < stream.length) {
    const count = stream[offset + 26];
    let size = 27 + count;
    for (let i = 0; i < count; i += 1) size += stream[offset + 27 + i];
    const page = Buffer.from(stream.subarray(offset, offset + size));
    const crc = page.readUInt32LE(22);
    page.writeUInt32LE(0, 22);
    assert.equal(slowCrc(page), crc);
    granules.push(Number(page.readBigUInt64LE(6)));
    offset += size;
  }
  assert.deepEqual(granules.slice(2), [312 + 960, 312 + 1920, 312 + 2880, 312 + 3840, 312 + 4800]);
  const parser = new audio.OggPacketParser();
  const out = [];
  // Feed in awkward chunk sizes to prove incremental parsing.
  for (let i = 0; i < stream.length; i += 7) out.push(...parser.feed(stream.subarray(i, i + 7)));
  assert.equal(out.length, packets.length);
  out.forEach((packet, index) => assert.ok(packet.equals(packets[index]), `packet ${index}`));
});

test("parser handles lacing across pages (continued packets) and several packets per page", () => {
  const first = Buffer.alloc(510, 1);
  const rest = Buffer.alloc(90, 1);
  const a = Buffer.from([9, 9]);
  const b = Buffer.from([7]);
  const stream = Buffer.concat([
    rawPage({ segments: [19], data: Buffer.alloc(19), headerType: 2 }),
    rawPage({ segments: [255, 255], data: first, sequence: 1 }),
    rawPage({ segments: [90, 2, 1], data: Buffer.concat([rest, a, b]), headerType: 1, sequence: 2 })
  ]);
  const parser = new audio.OggPacketParser();
  const out = parser.feed(stream);
  assert.equal(out.length, 4);
  assert.equal(out[0].length, 19);
  assert.equal(out[1].length, 600);
  assert.ok(out[2].equals(a) && out[3].equals(b));
});

test("parser skips OpusHead/OpusTags and resyncs after garbage", () => {
  const muxer = new audio.OggOpusMuxer({ serial: 1 });
  const stream = Buffer.concat([Buffer.from("junk"), muxer.packet(Buffer.from([1, 2, 3]))]);
  assert.deepEqual(new audio.OggPacketParser().feed(stream).map(packet => [...packet]), [[1, 2, 3]]);
});

// ---- Device parsers ----
const DSHOW = [
  "[dshow @ 0000020515a8c840] DirectShow video devices (some may be both video and audio devices)",
  "[dshow @ 0000020515a8c840]  \"Integrated Camera\" (video)",
  "[dshow @ 0000020515a8c840]     Alternative name \"@device_pnp_\\\\?\\usb#vid_0c45\"",
  "[dshow @ 0000020515a8c840] DirectShow audio devices",
  "[in#0 @ 0000020515b03440] \"Microphone (2- USB Audio Device)\" (audio)",
  "[in#0 @ 0000020515b03440]   Alternative name \"@device_cm_{33D9A762-90C8-11D0-BD43-00A0C911CE86}\\wave_{ABC}\"",
  "[in#0 @ 0000020515b03440] \"Mezcla estéreo (Realtek(R) Audio)\" (audio)",
  "[in#0 @ 0000020515b03440] \"OBS Virtual Camera\" (none)",
  "dummy: Immediate exit requested"
].join("\n");

test("dshow listing keeps audio entries only", () => {
  assert.deepEqual(audio.parseDshowAudioDevices(DSHOW), ["Microphone (2- USB Audio Device)", "Mezcla estéreo (Realtek(R) Audio)"]);
  assert.deepEqual(audio.parseDshowAudioDevices(""), []);
});

test("ALSA listing keeps names from column 0 and drops null", () => {
  const text = "null\n    Discard all samples\ndefault\n    Default Audio Device\nsysdefault:CARD=Device\n    USB Audio Device, USB Audio\n    Default Audio Device\nhw:CARD=Device,DEV=0\n    USB Audio Device, USB Audio\n";
  assert.deepEqual(audio.parseAlsaList(text), ["default", "sysdefault:CARD=Device", "hw:CARD=Device,DEV=0"]);
});

test("listAudioDevices uses the platform commands (injected runner)", async () => {
  const calls = [];
  const run = async (command, args) => {
    calls.push([command, ...args]);
    if (command === "ffmpeg") return { stdout: "", stderr: DSHOW };
    if (command === "powershell.exe") return { stdout: "Altavoces (Realtek)\r\nHeadset\r\n", stderr: "" };
    return { stdout: command === "arecord" ? "default\n    x\nhw:1\n" : "default\n    x\nplughw:0\n", stderr: "" };
  };
  const win = await audio.listAudioDevices({ platform: "win32", run, ffmpegPath: "ffmpeg" });
  assert.equal(win.inputs.length, 2);
  assert.deepEqual(win.outputs, ["Altavoces (Realtek)", "Headset"]);
  assert.ok(calls.some(call => call.includes("dshow") && call.includes("dummy")));
  assert.ok(calls.some(call => call.includes("-List") && call.some(arg => /winaudio-out\.ps1$/.test(arg))));
  assert.deepEqual(await audio.listAudioDevices({ platform: "linux", run }), { inputs: ["default", "hw:1"], outputs: ["default", "plughw:0"] });
});

test("ffmpeg arguments: device input per platform, opus voip 24k 20 ms, single process with RMS output", () => {
  const win = audio.captureArgs("Mic (USB)", "win32");
  assert.deepEqual(win.slice(win.indexOf("-f"), win.indexOf("-f") + 4), ["-f", "dshow", "-i", "audio=Mic (USB)"]);
  assert.ok(audio.captureArgs("hw:1", "linux").join(" ").includes("-f alsa -i hw:1"));
  assert.ok(audio.captureArgs("0", "darwin").join(" ").includes("-f avfoundation -i :0"));
  const text = win.join(" ");
  for (const part of ["-ac 1", "-ar 48000", "-c:a libopus", "-b:a 24k", "-application voip", "-frame_duration 20", "-f ogg pipe:1", "astats", "ametadata"]) assert.ok(text.includes(part), part);
  assert.equal(win.filter(arg => arg === "-i").length, 1);
  assert.deepEqual(audio.playbackArgs("hw:2", "linux").slice(-3), ["-f", "alsa", "hw:2"]);
  assert.ok(audio.playbackArgs("x", "win32").join(" ").endsWith("-f s16le pipe:1"));
  assert.equal(audio.parseRmsLine("[Parsed_ametadata_2 @ 0x1] lavfi.astats.Overall.RMS_level=-42.37"), -42.4);
  assert.equal(audio.parseRmsLine("lavfi.astats.Overall.RMS_level=-inf"), -120);
  assert.equal(audio.parseRmsLine("frame=1 size=0"), null);
});

// ---- Service ----
test("service starts capture on the first subscriber, stops it 10 s (here 40 ms) after the last, and honours TX stop delay", async () => {
  const events = [];
  let handlers;
  const sinkWrites = [];
  const service = audio.createAudio({
    input: "Mic", output: "Spk", platform: "linux", idleMs: 40, txStopMs: 40,
    createCapture: params => { handlers = params; return { start: () => events.push("start"), stop: () => events.push("stop") }; },
    createSink: () => ({ write: packet => sinkWrites.push(packet), end: () => events.push("sink-end") })
  });
  assert.equal(service.rx, true);
  assert.equal(service.tx, true);
  const got = [];
  const off1 = service.subscribe({ onPacket: packet => got.push(packet), onLevel: () => {} });
  const off2 = service.subscribe({ onPacket: () => {} });
  handlers.onPacket(Buffer.from([1]));
  assert.equal(got.length, 1);
  off1();
  await sleep(80);
  assert.deepEqual(events, ["start", "start"]);
  off2();
  await sleep(100);
  assert.equal(events.at(-1), "stop");
  service.txWrite(Buffer.from([5]));
  service.txRelease();
  service.txWrite(Buffer.from([6]));
  await sleep(80);
  assert.equal(events.includes("sink-end"), false);
  service.txRelease();
  await sleep(80);
  assert.equal(events.at(-1), "sink-end");
  assert.equal(sinkWrites.length, 2);
  service.close();
});

test("service without devices is disabled; macOS has no TX", () => {
  const none = audio.createAudio({ input: "", output: "", platform: "linux" });
  assert.equal(none.rx, false);
  assert.equal(none.tx, false);
  assert.equal(none.txWrite(Buffer.from([1])), false);
  const mac = audio.createAudio({ input: "0", output: "Spk", platform: "darwin" });
  assert.equal(mac.rx, true);
  assert.equal(mac.tx, false);
  assert.match(mac.txReason, /no disponible/);
});

// ---- Station config and device route ----
test("station config validates audio devices", () => {
  const base = { radio: "yaesu-ftx-1", link: "usb", port: "COM3" };
  const catalog = require("../remote-catalog.cjs").loadCatalog();
  const ok = station.validateConfig({ ...base, audio: { input: "Microphone (USB)", output: "hw:1" } }, catalog);
  assert.deepEqual(ok.audio, { input: "Microphone (USB)", output: "hw:1" });
  assert.deepEqual(station.validateConfig(base, catalog).audio, { input: "", output: "" });
  for (const bad of ['a"b', "a'b", "a\nb", "a\u0000b", "x".repeat(129), 5]) {
    assert.throws(() => station.validateConfig({ ...base, audio: { input: bad } }, catalog), /audio|dispositivo/i);
  }
  assert.throws(() => station.validateConfig({ ...base, audio: { other: "x" } }, catalog), /no admitido/);
});
