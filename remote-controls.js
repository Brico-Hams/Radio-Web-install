(function (root) {
  "use strict";
  // Generic tuning peripherals for the remote console: WebMIDI knobs/pads and keyboard shortcuts become abstract actions.
  // The mapper only emits actions; the console decides what they do, and transmit actions stay behind the console's own
  // guarded path. MIDI messages follow the MIDI 1.0 channel-message layout (status high nibble 8/9/B, two data bytes).
  // Device-specific layouts (Lynovation CTR2-MIDI, FlexControl HID reports) have no source in the repo: they are
  // "pendiente de fuente", so every binding is configured by the operator and nothing is assumed per device.

  const ACTIONS = Object.freeze(["tune-step", "step-size", "band-next", "band-prev", "cw-memory", "cw-stop", "estop"]);
  // Actions that would key the transmitter on their own are never bindable from a peripheral.
  const FORBIDDEN = Object.freeze(["ptt", "tune-carrier", "amp-operate"]);
  const RELATIVE = Object.freeze(["twos", "signbit"]);

  function parseMidi(bytes) {
    if (!bytes || bytes.length !== 3) return null;
    const [status, data1, data2] = bytes;
    if (status < 0x80 || status >= 0xF0 || data1 > 127 || data2 > 127) return null;
    const channel = status & 0x0F;
    switch (status >> 4) {
      case 0x9: return data2 === 0 ? { type: "noteoff", channel, data1, data2 } : { type: "noteon", channel, data1, data2 };
      case 0x8: return { type: "noteoff", channel, data1, data2 };
      case 0xB: return { type: "cc", channel, data1, data2 };
      default: return null;
    }
  }

  // Relative knob value to a signed step count: twos = 1..63 up, 127..65 down; signbit = bit 6 is the sign, low bits the size.
  function relativeDelta(value, mode) {
    if (mode === "twos") return value < 64 ? value : value - 128;
    if (mode === "signbit") return value & 0x40 ? -(value & 0x3F) : value & 0x3F;
    throw new Error("Modo relativo no valido.");
  }

  function validateBinding(binding) {
    if (!binding || typeof binding !== "object") throw new Error("Asignacion no valida.");
    if (FORBIDDEN.includes(binding.action)) throw new Error("Esa accion no se puede asignar a un periferico.");
    if (!ACTIONS.includes(binding.action)) throw new Error("Accion desconocida.");
    if (!["cc", "noteon"].includes(binding.type)) throw new Error("Tipo de mensaje no valido.");
    if (!Number.isInteger(binding.data1) || binding.data1 < 0 || binding.data1 > 127) throw new Error("Control no valido.");
    if (binding.channel !== undefined && !(Number.isInteger(binding.channel) && binding.channel >= 0 && binding.channel <= 15)) throw new Error("Canal no valido.");
    if (binding.action === "tune-step" && !RELATIVE.includes(binding.relative)) throw new Error("tune-step necesita relative twos o signbit.");
    if (binding.action === "cw-memory" && !(Number.isInteger(binding.memory) && binding.memory >= 1 && binding.memory <= 8)) throw new Error("Memoria CW 1-8.");
    return binding;
  }

  function createMidiMapper(bindings) {
    const list = bindings.map(validateBinding);
    return message => {
      const parsed = Array.isArray(message) || message instanceof Uint8Array ? parseMidi([...message]) : message;
      if (!parsed) return null;
      const hit = list.find(b => b.type === parsed.type && b.data1 === parsed.data1 && (b.channel === undefined || b.channel === parsed.channel));
      if (!hit) return null;
      if (hit.action === "tune-step") return { action: "tune-step", steps: relativeDelta(parsed.data2, hit.relative) };
      if (hit.action === "cw-memory") return { action: "cw-memory", memory: hit.memory };
      return { action: hit.action };
    };
  }

  // Keyboard shortcuts: Escape always stops (CW and emergency); F1-F8 are CW memories; the console must still apply its
  // own CW enable switch, TX guard and focus rules (never in a text field except Escape).
  function keyAction(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return null;
    if (event.key === "Escape") return { action: "estop" };
    const f = /^F([1-8])$/.exec(event.key);
    if (f) return { action: "cw-memory", memory: Number(f[1]), needsFocusOutsideText: true };
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const dir = event.key === "ArrowUp" ? 1 : -1;
      return { action: "tune-step", steps: event.shiftKey ? 10 * dir : dir, needsFocusOutsideText: true };
    }
    if (event.key === "PageUp") return { action: "band-next", needsFocusOutsideText: true };
    if (event.key === "PageDown") return { action: "band-prev", needsFocusOutsideText: true };
    return null;
  }

  const api = { ACTIONS, FORBIDDEN, parseMidi, relativeDelta, validateBinding, createMidiMapper, keyAction };
  root.RemoteControls = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
