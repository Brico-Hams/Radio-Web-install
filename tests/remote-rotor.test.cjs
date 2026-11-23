"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const { createRotor, normalizeRotorConfig, parsePosition } = require("../remote-rotor.cjs");

// Fake rotctld speaking the extended response protocol documented in docs/control-rotores.md.
async function broker() {
  const state = { commands: [], position: [20, 0], replies: {} };
  const server = net.createServer(socket => {
    socket.on("data", chunk => {
      const command = chunk.toString().trim();
      state.commands.push(command);
      const op = command.split(" ")[0];
      if (state.replies[op]) socket.write(state.replies[op]);
      else if (op === "+p") socket.write(`get_pos:\nAzimuth: ${state.position[0]}\nElevation: ${state.position[1]}\nRPRT 0\n`);
      else if (op === "+P") { const [, az, el] = command.split(" "); state.position = [Number(az), Number(el)]; socket.write(`set_pos: ${az} ${el}\nRPRT 0\n`); }
      else if (op === "+S") socket.write("stop:\nRPRT 0\n");
      else socket.write("unknown:\nRPRT -1\n");
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  state.port = server.address().port;
  state.close = () => new Promise(resolve => server.close(resolve));
  return state;
}

const id = () => `req-${Math.random().toString(36).slice(2)}-${Date.now()}-abcdef`.slice(0, 40);
const move = (azimuth_deg, elevation_deg, extra = {}) => ({ operation: "move", request_id: id(), azimuth_deg, elevation_deg, ...extra });

async function setup(overrides = {}, options = {}) {
  const rig = await broker();
  const rotor = createRotor({ config: { port: rig.port, elevationMax: 90, motionEnabled: true, ...overrides }, ...options });
  return { rig, rotor, done: async () => { await rotor.close(); await rig.close(); } };
}

test("parsePosition accepts only the documented get_pos lines", () => {
  assert.deepEqual(parsePosition(["Azimuth: 12.5", "Elevation: 3"]), { azimuth: 12.5, elevation: 3 });
  assert.equal(parsePosition(["Azimuth: x", "Elevation: 3"]), null);
  assert.equal(parsePosition(["Elevation: 3", "Azimuth: 1"]), null);
});

test("config rejects invalid limits, offsets and park outside limits", () => {
  assert.throws(() => normalizeRotorConfig({ port: 0 }));
  assert.throws(() => normalizeRotorConfig({ port: 4533, azimuthMin: 10, azimuthMax: 10 }));
  assert.throws(() => normalizeRotorConfig({ port: 4533, azimuthOffset: 181 }));
  assert.throws(() => normalizeRotorConfig({ port: 4533, park: { azimuth: 400, elevation: 0 } }));
});

test("metadata does not touch the backend; position uses +p with offsets", async () => {
  const { rig, rotor, done } = await setup({ azimuthOffset: 5 });
  try {
    const meta = await rotor.snapshot();
    assert.equal(meta.lease_active, false);
    assert.equal(meta.capabilities.speed, null);
    assert.deepEqual(rig.commands, []);
    assert.equal((await rotor.snapshot({ readPositionNow: true })).position.azimuth_deg, 25);
    assert.deepEqual(rig.commands, ["+p"]);
  } finally { await done(); }
});

test("invalid operations and out-of-limit targets never reach the backend", async () => {
  const { rig, rotor, done } = await setup();
  try {
    for (const body of [move(361, 0), move(10, 91), move("90", 0), move(NaN, 0), { operation: "send_cmd" }, { operation: "move", request_id: "short", azimuth_deg: 1, elevation_deg: 0 }]) {
      await assert.rejects(rotor.operate(body, "a"), /rotor_invalid_operation/);
    }
    assert.deepEqual(rig.commands, []);
  } finally { await done(); }
});

test("one controller at a time: others get busy, stop is always allowed, goto applies offset", async () => {
  const { rig, rotor, done } = await setup({ azimuthOffset: 5 });
  try {
    const first = await rotor.operate(move(100, 10), "a");
    assert.deepEqual(rig.position, [95, 10]);
    assert.equal(first.lease_owned, true);
    await assert.rejects(rotor.operate(move(120, 0), "b"), /rotor_busy/);
    await assert.rejects(rotor.operate(move(120, 0, { lease_id: first.lease_id }), "b"), /rotor_busy/);
    await assert.rejects(rotor.operate({ operation: "renew", lease_id: first.lease_id }, "b"), /rotor_lease_expired/);
    assert.equal((await rotor.operate({ operation: "renew", lease_id: first.lease_id }, "a")).lease_active, true);
    const retarget = await rotor.operate(move(130, 20, { lease_id: first.lease_id }), "a");
    assert.equal(retarget.lease_id, first.lease_id);
    assert.deepEqual(rig.position, [125, 20]);
    assert.equal((await rotor.operate({ operation: "stop" }, "b")).lease_active, false);
    assert.equal(rig.commands.at(-1), "+S");
  } finally { await done(); }
});

test("park uses the configured position and is refused when absent", async () => {
  const { rig, rotor, done } = await setup({ park: { azimuth: 180, elevation: 0 } });
  try {
    const result = await rotor.operate({ operation: "park", request_id: id() }, "a");
    assert.deepEqual(result.accepted_target, { azimuth_deg: 180, elevation_deg: 0 });
    assert.deepEqual(rig.position, [180, 0]);
  } finally { await done(); }
  const bare = await setup();
  try {
    await assert.rejects(bare.rotor.operate({ operation: "park", request_id: id() }, "a"), /rotor_park_not_configured/);
    assert.deepEqual(bare.rig.commands, []);
  } finally { await bare.done(); }
});

test("motion disabled by default refuses goto but still allows stop", async () => {
  const { rig, rotor, done } = await setup({ motionEnabled: false });
  try {
    await assert.rejects(rotor.operate(move(10, 0), "a"), /rotor_motion_disabled/);
    await rotor.operate({ operation: "stop" }, "a");
    assert.deepEqual(rig.commands, ["+S"]);
  } finally { await done(); }
});

test("missing renewals trigger the deadman stop; a lost lease holder is released", async () => {
  let time = 1_000_000;
  const { rig, rotor, done } = await setup({}, { now: () => time, watchdogMs: 20 });
  try {
    await rotor.operate(move(10, 0), "a");
    time += 3500;
    for (let i = 0; i < 50 && !rig.commands.includes("+S"); i += 1) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(rig.commands.includes("+S"));
    assert.equal((await rotor.snapshot()).lease_active, false);
    await rotor.operate(move(20, 0), "a");
    await rotor.release("a");
    assert.equal((await rotor.snapshot()).lease_active, false);
  } finally { await done(); }
});

test("unconfirmed stop latches motion off and close stops an active lease", async () => {
  const { rig, rotor, done } = await setup();
  try {
    rig.replies["+S"] = "stop:\nRPRT -1\n";
    await rotor.operate(move(10, 0), "a");
    await assert.rejects(rotor.operate({ operation: "stop" }, "a"), /rotor_backend_error/);
    assert.equal((await rotor.snapshot()).stop_failed, true);
    await assert.rejects(rotor.operate(move(20, 0), "a"), /rotor_stop_unconfirmed/);
  } finally { await done(); }
  const closing = await setup();
  await closing.rotor.operate(move(10, 0), "a");
  await closing.rotor.close();
  assert.equal(closing.rig.commands.at(-1), "+S");
  await closing.rig.close();
});
