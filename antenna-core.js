(function (root) {
  "use strict";
  // Pure wire-antenna engine: method of moments ported from hardware/antenas/mom.py (Harrington formulation with
  // currents at the nodes, loads in the segments and a reduced thin-wire kernel), plus the analysis helpers used by
  // antenna-ui.js. No DOM. Simulation only: perfect conductors, free space or a perfect ground plane at z = 0.
  // Authors: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF y Pedro Roca (Bricohams).
  const C0 = 299792458;
  const MU0 = 4e-7 * Math.PI;
  const EPS0 = 1 / (MU0 * C0 * C0);
  const MAX_UNKNOWNS = 400;
  const PENDING = "pendiente de fuente";
  // Gauss-Legendre, 8 points on [-1, 1] (same rule as numpy.polynomial.legendre.leggauss(8)).
  const GX = [-0.9602898564975363, -0.7966664774136267, -0.5255324099163290, -0.1834346424956498,
    0.1834346424956498, 0.5255324099163290, 0.7966664774136267, 0.9602898564975363];
  const GW = [0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.3626837833783620,
    0.3626837833783620, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763];

  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const cabs = a => Math.hypot(a[0], a[1]);
  const ccomplex = { mul: cmul, div: cdiv, add: cadd, sub: csub, abs: cabs };

  function fail(message) { throw new Error(message); }

  // ---------------------------------------------------------------- method of moments
  function makeSeg(a, b, radius) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (!(len > 0)) fail("Segmento de longitud cero.");
    return { ax: a[0], ay: a[1], az: a[2], bx: b[0], by: b[1], bz: b[2], ux: dx / len, uy: dy / len, uz: dz / len, len, rad: radius };
  }
  const mirrorSeg = s => ({ ax: s.ax, ay: s.ay, az: -s.az, bx: s.bx, by: s.by, bz: -s.bz, ux: s.ux, uy: s.uy, uz: -s.uz, len: s.len, rad: s.rad });

  // Integral of exp(-jkR)/(4 pi R) over the segment seen from p; writes [re, im] into out.
  function segIntegral(seg, px, py, pz, k, out) {
    const rx = px - seg.ax, ry = py - seg.ay, rz = pz - seg.az;
    const t = rx * seg.ux + ry * seg.uy + rz * seg.uz;
    const rho2 = Math.max(rx * rx + ry * ry + rz * rz - t * t, 0) + seg.rad * seg.rad;
    const rho = Math.sqrt(rho2);
    const stat = Math.asinh((seg.len - t) / rho) - Math.asinh(-t / rho);
    const h = 0.5 * seg.len;
    let re = 0, im = 0;
    for (let i = 0; i < 8; i++) {
      const d = t - h * (GX[i] + 1);
      const r = Math.sqrt(d * d + rho2);
      const kr = k * r;
      re += GW[i] * (Math.cos(kr) - 1) / r;
      im -= GW[i] * Math.sin(kr) / r;
    }
    out[0] = (stat + h * re) / (4 * Math.PI);
    out[1] = h * im / (4 * Math.PI);
  }

  function createModel(frequencyHz, options = {}) {
    if (!(frequencyHz > 0)) fail("Frecuencia no valida.");
    return { f: frequencyHz, k: 2 * Math.PI * frequencyHz / C0, omega: 2 * Math.PI * frequencyHz, wires: [], ground: Boolean(options.ground) };
  }

  // segments: total spread by length (like mom.py) or an array with the segment count of each leg.
  function addWire(model, points, segments, radius) {
    const lengths = [];
    for (let i = 0; i < points.length - 1; i++) lengths.push(Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1], points[i + 1][2] - points[i][2]));
    const total = lengths.reduce((a, b) => a + b, 0);
    const counts = Array.isArray(segments) ? segments.map(n => Math.max(1, Math.round(n)))
      : lengths.map(length => Math.max(1, Math.round(segments * length / total)));
    const nodes = [points[0].slice()];
    for (let leg = 0; leg < counts.length; leg++) {
      const a = points[leg], b = points[leg + 1];
      for (let i = 1; i <= counts[leg]; i++) nodes.push([0, 1, 2].map(axis => a[axis] + (b[axis] - a[axis]) * i / counts[leg]));
    }
    model.wires.push({ nodes, radius });
    return model.wires.length - 1;
  }

  function solveLinear(Ar, Ai, br, bi, n) {
    for (let c = 0; c < n; c++) {
      let p = c, best = Ar[c * n + c] ** 2 + Ai[c * n + c] ** 2;
      for (let r = c + 1; r < n; r++) {
        const m = Ar[r * n + c] ** 2 + Ai[r * n + c] ** 2;
        if (m > best) { best = m; p = r; }
      }
      if (best === 0) fail("Matriz singular.");
      if (p !== c) {
        for (let j = c; j < n; j++) {
          let tmp = Ar[c * n + j]; Ar[c * n + j] = Ar[p * n + j]; Ar[p * n + j] = tmp;
          tmp = Ai[c * n + j]; Ai[c * n + j] = Ai[p * n + j]; Ai[p * n + j] = tmp;
        }
        let tmp = br[c]; br[c] = br[p]; br[p] = tmp;
        tmp = bi[c]; bi[c] = bi[p]; bi[p] = tmp;
      }
      const pr = Ar[c * n + c], pi = Ai[c * n + c], d = pr * pr + pi * pi;
      for (let r = c + 1; r < n; r++) {
        const ar = Ar[r * n + c], ai = Ai[r * n + c];
        if (ar === 0 && ai === 0) continue;
        const fr = (ar * pr + ai * pi) / d, fi = (ai * pr - ar * pi) / d;
        for (let j = c; j < n; j++) {
          const xr = Ar[c * n + j], xi = Ai[c * n + j];
          Ar[r * n + j] -= fr * xr - fi * xi;
          Ai[r * n + j] -= fr * xi + fi * xr;
        }
        br[r] -= fr * br[c] - fi * bi[c];
        bi[r] -= fr * bi[c] + fi * br[c];
      }
    }
    const xr = new Float64Array(n), xi = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) {
      let sr = br[r], si = bi[r];
      for (let j = r + 1; j < n; j++) {
        sr -= Ar[r * n + j] * xr[j] - Ai[r * n + j] * xi[j];
        si -= Ar[r * n + j] * xi[j] + Ai[r * n + j] * xr[j];
      }
      const pr = Ar[r * n + r], pi = Ai[r * n + r], d = pr * pr + pi * pi;
      xr[r] = (sr * pr + si * pi) / d;
      xi[r] = (si * pr - sr * pi) / d;
    }
    return [xr, xi];
  }

  // feeds: [{ w, i, v: [re, im] }]; loads: [{ w, i, z: [re, im] }] (wire, interior node). Returns the feed currents.
  function solve(model, feeds, loads = []) {
    const { k, omega } = model;
    const segs = [], unknowns = [];
    model.wires.forEach((wire, w) => {
      const base = segs.length;
      for (let j = 0; j < wire.nodes.length - 1; j++) segs.push(makeSeg(wire.nodes[j], wire.nodes[j + 1], wire.radius));
      for (let i = 1; i < wire.nodes.length - 1; i++) unknowns.push({ w, i, sp: base + i - 1, sn: base + i });
    });
    const n = unknowns.length, ns = segs.length;
    if (n === 0) fail("El modelo no tiene incognitas: cada hilo necesita al menos 2 segmentos.");
    if (n > MAX_UNKNOWNS) fail(`Demasiadas incognitas (${n}); el maximo es ${MAX_UNKNOWNS}. Reduce los segmentos.`);
    const mids = segs.map(s => [(s.ax + s.bx) / 2, (s.ay + s.by) / 2, (s.az + s.bz) / 2]);
    const nodeX = new Float64Array(n), nodeY = new Float64Array(n), nodeZ = new Float64Array(n);
    const dlx = new Float64Array(n), dly = new Float64Array(n), dlz = new Float64Array(n);
    unknowns.forEach((u, row) => {
      const p = model.wires[u.w].nodes[u.i];
      nodeX[row] = p[0]; nodeY[row] = p[1]; nodeZ[row] = p[2];
      dlx[row] = mids[u.sn][0] - mids[u.sp][0]; dly[row] = mids[u.sn][1] - mids[u.sp][1]; dlz[row] = mids[u.sn][2] - mids[u.sp][2];
    });
    const Zr = new Float64Array(n * n), Zi = new Float64Array(n * n);
    const tmp = [0, 0];
    const wmu = omega * MU0;
    // sign +1: the structure itself; sign -1: its mirror image in a perfect ground plane (opposite current).
    const accumulate = (source, sign) => {
      const Gr = new Float64Array(ns * ns), Gi = new Float64Array(ns * ns);
      source.forEach((seg, s) => {
        for (let t = 0; t < ns; t++) {
          segIntegral(seg, mids[t][0], mids[t][1], mids[t][2], k, tmp);
          Gr[t * ns + s] = tmp[0]; Gi[t * ns + s] = tmp[1];
        }
      });
      for (let col = 0; col < n; col++) {
        const uc = unknowns[col];
        let halves = [makeSeg(mids[uc.sp], [segs[uc.sp].bx, segs[uc.sp].by, segs[uc.sp].bz], segs[uc.sp].rad),
          makeSeg([segs[uc.sn].ax, segs[uc.sn].ay, segs[uc.sn].az], mids[uc.sn], segs[uc.sn].rad)];
        if (sign < 0) halves = halves.map(mirrorSeg);
        for (const h of halves) {
          for (let row = 0; row < n; row++) {
            segIntegral(h, nodeX[row], nodeY[row], nodeZ[row], k, tmp);
            const dot = dlx[row] * h.ux + dly[row] * h.uy + dlz[row] * h.uz;
            Zr[row * n + col] += sign * (-wmu * dot * tmp[1]);
            Zi[row * n + col] += sign * (wmu * dot * tmp[0]);
          }
        }
        const qn = 1 / (omega * segs[uc.sn].len), qp = -1 / (omega * segs[uc.sp].len);
        for (let row = 0; row < n; row++) {
          const r = unknowns[row];
          const dnr = Gr[r.sn * ns + uc.sn] - Gr[r.sp * ns + uc.sn], dni = Gi[r.sn * ns + uc.sn] - Gi[r.sp * ns + uc.sn];
          const dpr = Gr[r.sn * ns + uc.sp] - Gr[r.sp * ns + uc.sp], dpi = Gi[r.sn * ns + uc.sp] - Gi[r.sp * ns + uc.sp];
          Zr[row * n + col] += sign * (qn * dni + qp * dpi) / EPS0;
          Zi[row * n + col] += sign * (-(qn * dnr + qp * dpr)) / EPS0;
        }
      }
    };
    accumulate(segs, 1);
    if (model.ground) {
      for (const wire of model.wires) {
        for (const p of wire.nodes) if (!(p[2] > wire.radius)) fail("Con tierra perfecta todos los hilos deben estar por encima del plano z = 0.");
      }
      accumulate(segs.map(mirrorSeg), -1);
    }
    const index = new Map(unknowns.map((u, row) => [`${u.w}:${u.i}`, row]));
    for (const load of loads) {
      const row = index.get(`${load.w}:${load.i}`);
      if (row === undefined) fail("Carga fuera de los nodos interiores del hilo.");
      Zr[row * n + row] += load.z[0]; Zi[row * n + row] += load.z[1];
    }
    const Vr = new Float64Array(n), Vi = new Float64Array(n);
    for (const feed of feeds) {
      const row = index.get(`${feed.w}:${feed.i}`);
      if (row === undefined) fail("Alimentacion fuera de los nodos interiores del hilo.");
      Vr[row] = feed.v[0]; Vi[row] = feed.v[1];
    }
    const [Ir, Ii] = solveLinear(Zr, Zi, Vr, Vi, n);
    model._result = { unknowns, segs, mids, Ir, Ii };
    model._halves = null;
    return feeds.map(feed => ({ w: feed.w, i: feed.i, v: feed.v, current: [Ir[index.get(`${feed.w}:${feed.i}`)], Ii[index.get(`${feed.w}:${feed.i}`)]] }));
  }

  function farHalves(model) {
    if (model._halves) return model._halves;
    const { unknowns, segs, mids, Ir, Ii } = model._result;
    const list = [];
    unknowns.forEach((u, idx) => {
      const pairs = [[mids[u.sp], [segs[u.sp].bx, segs[u.sp].by, segs[u.sp].bz]], [[segs[u.sn].ax, segs[u.sn].ay, segs[u.sn].az], mids[u.sn]]];
      for (const [a, b] of pairs) {
        const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        list.push({ c, d, ir: Ir[idx], ii: Ii[idx] });
        if (model.ground) list.push({ c: [c[0], c[1], -c[2]], d: [d[0], d[1], -d[2]], ir: -Ir[idx], ii: -Ii[idx] });
      }
    });
    model._halves = list;
    return list;
  }

  // Far field (E_theta, E_phi) without the factor exp(-jkr)/r. With a ground plane the lower hemisphere is empty.
  function farField(model, theta, phi) {
    if (model.ground && theta > Math.PI / 2 + 1e-12) return { eth: [0, 0], eph: [0, 0] };
    const st = Math.sin(theta), ct = Math.cos(theta), sp = Math.sin(phi), cp = Math.cos(phi);
    const rx = st * cp, ry = st * sp, rz = ct;
    const thx = ct * cp, thy = ct * sp, thz = -st, phx = -sp, phy = cp;
    let tr = 0, ti = 0, pr = 0, pi = 0;
    for (const h of farHalves(model)) {
      const arg = model.k * (rx * h.d[0] + ry * h.d[1] + rz * h.d[2]) / 2;
      const s = Math.abs(arg) < 1e-12 ? 1 : Math.sin(arg) / arg;
      const ph = model.k * (rx * h.c[0] + ry * h.c[1] + rz * h.c[2]);
      const er = Math.cos(ph), ei = Math.sin(ph);
      const cr = (h.ir * er - h.ii * ei) * s, ci = (h.ir * ei + h.ii * er) * s;
      const dth = h.d[0] * thx + h.d[1] * thy + h.d[2] * thz, dph = h.d[0] * phx + h.d[1] * phy;
      tr += cr * dth; ti += ci * dth; pr += cr * dph; pi += ci * dph;
    }
    const c = model.omega * MU0 / (4 * Math.PI);
    return { eth: [c * ti, -c * tr], eph: [c * pi, -c * pr] };
  }
  const intensity = e => (e.eth[0] ** 2 + e.eth[1] ** 2 + e.eph[0] ** 2 + e.eph[1] ** 2) / (2 * MU0 * C0);

  function radiatedPower(model, steps = 91) {
    const thetaMax = model.ground ? Math.PI / 2 : Math.PI;
    const nt = steps, np = 2 * steps - 1;
    const rows = [];
    for (let i = 0; i < nt; i++) {
      const theta = thetaMax * i / (nt - 1);
      let acc = 0, previous = null;
      for (let j = 0; j < np; j++) {
        const value = intensity(farField(model, theta, 2 * Math.PI * j / (np - 1))) * Math.sin(theta);
        if (previous !== null) acc += (previous + value) / 2 * (2 * Math.PI / (np - 1));
        previous = value;
      }
      rows.push(acc);
    }
    let total = 0;
    for (let i = 1; i < nt; i++) total += (rows[i - 1] + rows[i]) / 2 * (thetaMax / (nt - 1));
    return total;
  }

  function gainDbi(model, theta, phi, inputPower) {
    const u = intensity(farField(model, theta, phi));
    return u > 0 ? 10 * Math.log10(4 * Math.PI * u / inputPower) : -Infinity;
  }

  // ---------------------------------------------------------------- impedance, SWR, Smith
  function reflection(z, z0 = 50) { return cdiv(csub(z, [z0, 0]), cadd(z, [z0, 0])); }
  function swrFromZ(z, z0 = 50) {
    const g = cabs(reflection(z, z0));
    return swrFromGamma(g);
  }
  function swrFromGamma(g) { return g >= 1 - 1e-12 ? Infinity : (1 + g) / (1 - g); }
  // Smith chart coordinates are the reflection coefficient on the unit disk.
  function smithPoint(z, z0 = 50) { const g = reflection(z, z0); return { x: g[0], y: g[1] }; }
  function smithGrid(rValues = [0.2, 0.5, 1, 2, 5], xValues = [0.2, 0.5, 1, 2, 5]) {
    return {
      resistance: rValues.map(r => ({ r, cx: r / (1 + r), cy: 0, radius: 1 / (1 + r) })),
      reactance: xValues.flatMap(x => [x, -x]).map(x => ({ x, cx: 1, cy: 1 / x, radius: 1 / Math.abs(x) }))
    };
  }
  function impedanceFromGamma(g, z0 = 50) { return cmul([z0, 0], cdiv(cadd([1, 0], g), csub([1, 0], g))); }

  // ---------------------------------------------------------------- loads and traps
  function loadImpedance(spec, f) {
    const w = 2 * Math.PI * f;
    const R = spec.R > 0 ? spec.R : 0, L = spec.L > 0 ? spec.L : 0, C = spec.C > 0 ? spec.C : 0;
    const open = [1e12, 0];
    if (spec.type === "parallel") {
      const y = [R > 0 ? 1 / R : 0, (C > 0 ? w * C : 0) - (L > 0 ? 1 / (w * L) : 0)];
      return y[0] ** 2 + y[1] ** 2 < 1e-30 ? open : cdiv([1, 0], y);
    }
    if (spec.type === "trap") {
      const zl = [spec.Q > 0 ? w * L / spec.Q : 0, w * L], zc = [0, -1 / (w * C)];
      const sum = cadd(zl, zc);
      return sum[0] ** 2 + sum[1] ** 2 < 1e-18 ? open : cdiv(cmul(zl, zc), sum);
    }
    return [R, w * L - (C > 0 ? 1 / (w * C) : 0)];
  }
  const trapResonance = (L, C) => 1 / (2 * Math.PI * Math.sqrt(L * C));
  const trapInductance = (f, C) => 1 / ((2 * Math.PI * f) ** 2 * C);
  const trapCapacitance = (f, L) => 1 / ((2 * Math.PI * f) ** 2 * L);

  // ---------------------------------------------------------------- design (wire table) -> model
  const close = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-9;
  const rowStart = r => [r.x1, r.y1, r.z1];
  const rowEnd = r => [r.x2, r.y2, r.z2];
  const rowLength = r => Math.hypot(r.x2 - r.x1, r.y2 - r.y1, r.z2 - r.z1);
  const cloneDesign = d => JSON.parse(JSON.stringify(d));

  function validateDesign(design) {
    const warnings = [];
    if (!design || !Array.isArray(design.wires) || design.wires.length === 0) fail("Anade al menos un hilo.");
    design.wires.forEach((r, i) => {
      for (const key of ["x1", "y1", "z1", "x2", "y2", "z2", "radius", "segments"]) if (!Number.isFinite(Number(r[key]))) fail(`Hilo ${i + 1}: ${key} no es un numero.`);
      if (!(r.radius > 0)) fail(`Hilo ${i + 1}: el radio debe ser mayor que 0.`);
      if (!(rowLength(r) > 0)) fail(`Hilo ${i + 1}: longitud cero.`);
      if (!Number.isInteger(r.segments) || r.segments < 1) fail(`Hilo ${i + 1}: los segmentos deben ser un entero >= 1.`);
      if (rowLength(r) / r.segments < r.radius) warnings.push(`Hilo ${i + 1}: segmento mas corto que el radio; la aproximacion de hilo fino pierde validez.`);
    });
    const feed = design.feed;
    if (!feed || !design.wires[feed.row]) fail("Define el hilo de alimentacion.");
    return warnings;
  }

  // Consecutive rows whose end meets the next start (same radius) form a single connected wire.
  function chainRows(design) {
    const chains = [], where = [];
    design.wires.forEach((r, i) => {
      const last = chains[chains.length - 1];
      if (last && last.radius === r.radius && close(last.points[last.points.length - 1], rowStart(r))) {
        where.push({ chain: chains.length - 1, start: last.counts.reduce((a, b) => a + b, 0), count: r.segments });
        last.points.push(rowEnd(r)); last.counts.push(r.segments);
      } else {
        where.push({ chain: chains.length, start: 0, count: r.segments });
        chains.push({ points: [rowStart(r), rowEnd(r)], counts: [r.segments], radius: r.radius });
      }
    });
    return { chains, where };
  }

  function locate(design, chained, row, position) {
    const w = chained.where[row];
    const chain = chained.chains[w.chain];
    const total = chain.counts.reduce((a, b) => a + b, 0);
    const wanted = w.start + Math.round(Math.min(Math.max(position, 0), 1) * w.count);
    return { w: w.chain, i: Math.min(Math.max(wanted, 1), total - 1) };
  }

  function buildFromDesign(design, f) {
    const warnings = validateDesign(design);
    const model = createModel(f, { ground: Boolean(design.ground) });
    const chained = chainRows(design);
    let unknowns = 0;
    for (const chain of chained.chains) {
      const total = chain.counts.reduce((a, b) => a + b, 0);
      unknowns += total - 1;
      addWire(model, chain.points, chain.counts, chain.radius);
    }
    if (unknowns > MAX_UNKNOWNS) fail(`Demasiadas incognitas (${unknowns}); el maximo es ${MAX_UNKNOWNS}. Reduce los segmentos.`);
    const feedAt = locate(design, chained, design.feed.row, design.feed.position ?? 0.5);
    const feeds = [{ ...feedAt, v: [design.feed.voltage ?? 1, 0] }];
    const loads = (design.loads || []).map(load => ({ ...locate(design, chained, load.row, load.position ?? 0.5), z: loadImpedance(load, f) }));
    return { model, feeds, loads, warnings, unknowns };
  }

  function feedPoint(design) {
    const chained = chainRows(design);
    const at = locate(design, chained, design.feed.row, design.feed.position ?? 0.5);
    const chain = chained.chains[at.w];
    let remaining = at.i;
    for (let leg = 0; leg < chain.counts.length; leg++) {
      if (remaining <= chain.counts[leg]) {
        const a = chain.points[leg], b = chain.points[leg + 1];
        return [0, 1, 2].map(axis => a[axis] + (b[axis] - a[axis]) * remaining / chain.counts[leg]);
      }
      remaining -= chain.counts[leg];
    }
    return chain.points[chain.points.length - 1];
  }

  function evaluate(design, f, options = {}) {
    const built = buildFromDesign(design, f);
    const [feed] = solve(built.model, built.feeds, built.loads);
    const z = cdiv(feed.v, feed.current);
    const z0 = options.z0 ?? design.z0 ?? 50;
    const pin = 0.5 * (feed.v[0] * feed.current[0] + feed.v[1] * feed.current[1]);
    return { f, z, swr: swrFromZ(z, z0), gamma: reflection(z, z0), pin, model: built.model, feed, warnings: built.warnings, unknowns: built.unknowns };
  }

  function linspace(a, b, n) { return Array.from({ length: n }, (_, i) => n === 1 ? a : a + (b - a) * i / (n - 1)); }

  function sweep(design, freqs, options = {}) {
    const z0 = options.z0 ?? design.z0 ?? 50;
    return freqs.map((f, i) => {
      const e = evaluate(design, f, { z0 });
      if (options.onProgress) options.onProgress(i + 1, freqs.length);
      return { f, r: e.z[0], x: e.z[1], swr: e.swr };
    });
  }

  function findMinimum(points) {
    let best = 0;
    points.forEach((p, i) => { if (p.swr < points[best].swr) best = i; });
    const p = points[best];
    if (best > 0 && best < points.length - 1) {
      // Parabolic refinement of the vertex through the 3 samples around the minimum.
      const a = points[best - 1], c = points[best + 1];
      const d = a.swr - 2 * p.swr + c.swr;
      if (d > 0 && Number.isFinite(d)) {
        const shift = 0.5 * (a.swr - c.swr) / d;
        return { index: best, f: p.f + shift * (c.f - a.f) / 2, swr: p.swr - 0.25 * (a.swr - c.swr) * shift, sampled: p };
      }
    }
    return { index: best, f: p.f, swr: p.swr, sampled: p };
  }

  function interpolate(points, f, key) {
    if (!points.length || f < points[0].f || f > points[points.length - 1].f) return null;
    for (let i = 1; i < points.length; i++) {
      if (f <= points[i].f) {
        const a = points[i - 1], b = points[i];
        return a[key] + (b[key] - a[key]) * (f - a.f) / (b.f - a.f || 1);
      }
    }
    return points[points.length - 1][key];
  }

  // Zero crossings of X(f) from low to high frequency, with dX/df.
  function findResonances(points) {
    const out = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (a.x === 0 || (a.x < 0 && b.x > 0) || (a.x > 0 && b.x < 0)) {
        const t = a.x === b.x ? 0 : a.x / (a.x - b.x);
        out.push({ f: a.f + t * (b.f - a.f), r: a.r + t * (b.r - a.r), slope: (b.x - a.x) / (b.f - a.f) });
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- optimiser (port of nelder_mead in disenar.py)
  function nelderMead(fun, x0, scale, iterations, tolerance = 0) {
    let simplex = [x0.slice()];
    x0.forEach((_, i) => { const p = x0.slice(); p[i] += scale[i]; simplex.push(p); });
    let evaluations = 0;
    const call = p => { evaluations++; return fun(p); };
    let values = simplex.map(call);
    let used = 0;
    for (; used < iterations; used++) {
      const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
      simplex = order.map(i => simplex[i]); values = order.map(i => values[i]);
      if (tolerance > 0 && values[values.length - 1] - values[0] < tolerance) break;
      const last = simplex.length - 1;
      const centroid = x0.map((_, d) => simplex.slice(0, last).reduce((s, p) => s + p[d], 0) / last);
      const reflected = centroid.map((c, d) => c + (c - simplex[last][d])), fr = call(reflected);
      if (fr < values[0]) {
        const expanded = centroid.map((c, d) => c + 2 * (c - simplex[last][d])), fe = call(expanded);
        if (fe < fr) { simplex[last] = expanded; values[last] = fe; } else { simplex[last] = reflected; values[last] = fr; }
      } else if (fr < values[last - 1]) {
        simplex[last] = reflected; values[last] = fr;
      } else {
        const contracted = centroid.map((c, d) => c + 0.5 * (simplex[last][d] - c)), fc = call(contracted);
        if (fc < values[last]) { simplex[last] = contracted; values[last] = fc; }
        else {
          simplex = simplex.map(p => p.map((v, d) => simplex[0][d] + 0.5 * (v - simplex[0][d])));
          values = simplex.map(call);
        }
      }
    }
    let best = 0;
    values.forEach((v, i) => { if (v < values[best]) best = i; });
    return { x: simplex[best], value: values[best], iterations: used, evaluations };
  }

  // Scale the geometry: "global" about the feed point, "perRow" each wire about its own midpoint (separate elements).
  function scaleDesign(design, factors, mode, origin) {
    const out = cloneDesign(design);
    out.wires.forEach((r, i) => {
      const s = mode === "perRow" ? factors[i] : factors[0];
      const o = mode === "perRow" ? [(r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2, (r.z1 + r.z2) / 2] : origin;
      for (const [axis, a, b] of [[0, "x1", "x2"], [1, "y1", "y2"], [2, "z1", "z2"]]) {
        r[a] = o[axis] + (r[a] - o[axis]) * s; r[b] = o[axis] + (r[b] - o[axis]) * s;
      }
    });
    return out;
  }

  function autoTune(design, options) {
    const { f0, z0 = 50, mode = "global", iterations = 80, frequencies } = options;
    const origin = feedPoint(design);
    const count = mode === "perRow" ? design.wires.length : 1;
    const targets = frequencies && frequencies.length ? frequencies : [f0];
    const apply = x => scaleDesign(design, x, mode, origin);
    const cost = x => {
      if (x.some(v => !(v > 0.2 && v < 5))) return 1e6;
      try {
        const scaled = apply(x);
        return Math.max(...targets.map(f => evaluate(scaled, f, { z0 }).swr));
      } catch (error) { return 1e6; }
    };
    const start = Array(count).fill(1);
    const result = nelderMead(cost, start, Array(count).fill(0.05), iterations, 1e-4);
    return { design: apply(result.x), factors: result.x, swr: result.value, startSwr: cost(start), evaluations: result.evaluations };
  }

  // ---------------------------------------------------------------- templates
  function suggestSegments(length, f) {
    const n = Math.max(6, Math.ceil(length / (C0 / f / 20)));
    return Math.min(n + (n % 2), 150);
  }
  const wireRow = (a, b, radius, segments) => ({ x1: a[0], y1: a[1], z1: a[2], x2: b[0], y2: b[1], z2: b[2], radius, segments });

  // Half-wave dipole along X at height h. The initial length is the free-space c / (2 f); tune it afterwards.
  function dipoleTemplate({ f, height = 10, radius = 0.001, ground = false, z0 = 50 }) {
    const half = C0 / (2 * f) / 2;
    const segments = suggestSegments(2 * half, f);
    return { name: "dipole", z0, ground, wires: [wireRow([-half, 0, height], [half, 0, height], radius, segments)], feed: { row: 0, position: 0.5, voltage: 1 }, loads: [] };
  }

  function invertedVTemplate({ f, height = 10, radius = 0.001, ground = false, z0 = 50, apexAngleDeg = 120 }) {
    const arm = C0 / (4 * f);
    const half = apexAngleDeg * Math.PI / 360;
    const dx = arm * Math.sin(half), dz = arm * Math.cos(half);
    if (height - dz <= radius) fail("El extremo del brazo queda bajo el suelo: sube el apice o abre el angulo.");
    const segments = suggestSegments(arm, f) / 2 * 2;
    return {
      name: "inverted-v", z0, ground,
      wires: [wireRow([-dx, 0, height - dz], [0, 0, height], radius, segments), wireRow([0, 0, height], [dx, 0, height - dz], radius, segments)],
      feed: { row: 0, position: 1, voltage: 1 }, loads: []
    };
  }

  // Multiband trap dipole: one quarter-wave section per band (highest band innermost) and a parallel LC trap
  // at the end of every section but the last, resonant at the band it isolates. Give either C or L for all traps.
  function trapDipoleTemplate({ bandsHz, capacitanceF, inductanceH, Q = 0, height = 10, radius = 0.001, ground = false, z0 = 50 }) {
    if (!Array.isArray(bandsHz) || bandsHz.length < 2 || bandsHz.length > 5) fail("Elige de 2 a 5 bandas.");
    if (!(capacitanceF > 0) === !(inductanceH > 0)) fail("Indica C o L de las trampas (solo uno de los dos).");
    const bands = bandsHz.slice().sort((a, b) => b - a);
    const totals = bands.map(f => C0 / (4 * f));
    const sections = totals.map((t, k) => k === 0 ? t : t - totals[k - 1]);
    if (sections.some(s => !(s > 0))) fail("Las bandas deben ser distintas.");
    const fMax = bands[0];
    const counts = sections.map(s => Math.max(2, Math.ceil(s / (C0 / fMax / 20))));
    const traps = bands.slice(0, -1).map(f => capacitanceF > 0
      ? { f, C: capacitanceF, L: trapInductance(f, capacitanceF) } : { f, L: inductanceH, C: trapCapacitance(f, inductanceH) });
    const edges = [0];
    sections.forEach(s => edges.push(edges[edges.length - 1] + s));
    const rows = [], loads = [];
    const n = sections.length;
    for (let k = n - 1; k >= 0; k--) rows.push(wireRow([-edges[k + 1], 0, height], [-edges[k], 0, height], radius, counts[k]));
    for (let k = 0; k < n; k++) rows.push(wireRow([edges[k], 0, height], [edges[k + 1], 0, height], radius, counts[k]));
    // Left row of section k sits at index n - 1 - k, right row at n + k; a trap closes sections 0 .. n - 2.
    traps.forEach((trap, k) => {
      loads.push({ row: n - 2 - k, position: 1, type: "trap", L: trap.L, C: trap.C, Q, label: `L${k + 1}` });
      loads.push({ row: n + k, position: 1, type: "trap", L: trap.L, C: trap.C, Q, label: `R${k + 1}` });
    });
    return { name: "trap-dipole", z0, ground, wires: rows, feed: { row: n - 1, position: 1, voltage: 1 }, loads, traps, bandsHz: bands };
  }

  // ---------------------------------------------------------------- transformers, L-network, coax
  const TRANSFORMERS = Object.freeze([1, 2, 4, 6, 9]);
  // Ideal 1:n transformer or balun: the line side sees the antenna impedance divided by n (or multiplied, inverted).
  function transformImpedance(z, ratio, inverted = false) {
    const factor = inverted ? ratio : 1 / ratio;
    return [z[0] * factor, z[1] * factor];
  }
  // Ratio that brings the resistance closest to Z0 (the line side is Z0).
  function bestTransformer(r, z0, ratios = TRANSFORMERS) {
    let best = null;
    for (const n of ratios) {
      const inverted = r < z0;
      const rt = inverted ? r * n : r / n;
      const error = Math.abs(Math.log(rt / z0));
      if (!best || error < best.error) best = { ratio: n, inverted, resistance: rt, swr: Math.max(rt / z0, z0 / rt), error };
    }
    return best;
  }

  const reactanceComponent = (x, f) => x >= 0 ? { kind: "L", value: x / (2 * Math.PI * f), unit: "H" } : { kind: "C", value: -1 / (2 * Math.PI * f * x), unit: "F" };
  const susceptanceComponent = (b, f) => b >= 0 ? { kind: "C", value: b / (2 * Math.PI * f), unit: "F" } : { kind: "L", value: -1 / (2 * Math.PI * f * b), unit: "H" };

  // L-networks that turn the load Z_L into Z0 at f. "shuntLoad": shunt element across the load then a series
  // element toward the source; "seriesLoad": series element at the load then a shunt element toward the source.
  function lNetwork(zLoad, z0, f) {
    const [R, X] = zLoad;
    const solutions = [];
    const y = cdiv([1, 0], zLoad);
    const G = y[0], B = y[1];
    if (G > 0 && G <= 1 / z0) {
      const root = Math.sqrt(G / z0 - G * G);
      for (const sign of [1, -1]) {
        const bTotal = sign * root;
        const bp = bTotal - B;
        const xz = -bTotal / (G * G + bTotal * bTotal);
        solutions.push({ topology: "shuntLoad", shuntB: bp, seriesX: -xz, shunt: susceptanceComponent(bp, f), series: reactanceComponent(-xz, f) });
      }
    }
    if (R > 0 && R <= z0) {
      const root = Math.sqrt(R * (z0 - R));
      for (const sign of [1, -1]) {
        const xt = sign * root;
        const bp = xt / (R * R + xt * xt);
        solutions.push({ topology: "seriesLoad", shuntB: bp, seriesX: xt - X, shunt: susceptanceComponent(bp, f), series: reactanceComponent(xt - X, f) });
      }
    }
    // Low-pass solutions (series L, shunt C) first: they also attenuate harmonics.
    return solutions.sort((a, b) => Number(b.series.kind === "L" && b.shunt.kind === "C") - Number(a.series.kind === "L" && a.shunt.kind === "C"));
  }
  function lNetworkInput(solution, zLoad, z0, f) {
    const y = solution.topology === "shuntLoad"
      ? cadd(cdiv([1, 0], zLoad), [0, solution.shuntB])
      : cadd(cdiv([1, 0], cadd(zLoad, [0, solution.seriesX])), [0, solution.shuntB]);
    const z = cdiv([1, 0], y);
    return solution.topology === "shuntLoad" ? cadd(z, [0, solution.seriesX]) : z;
  }

  // tanh(a + jb) = (tanh a + j tan b) / (1 + j tanh a tan b); tan stays finite at a quarter wave, unlike the cosh form.
  const ctanh = (a, b) => cdiv([Math.tanh(a), Math.tan(b)], [1, Math.tanh(a) * Math.tan(b)]);
  // Impedance at the radio end of a coax of length lengthM: velocity factor and loss per 100 m are user inputs.
  function coaxInput(zLoad, { z0 = 50, lengthM, velocityFactor = 1, lossDbPer100m = 0, f }) {
    const beta = 2 * Math.PI * f / (velocityFactor * C0);
    const alpha = lossDbPer100m / 100 / (20 / Math.LN10);
    const t = ctanh(alpha * lengthM, beta * lengthM);
    const zc = [z0, 0];
    const ratio = cdiv(cadd(zLoad, cmul(zc, t)), cadd(zc, cmul(zLoad, t)));
    return [ratio[0] * z0, ratio[1] * z0];
  }
  const coaxMatchedLossDb = (lengthM, lossDbPer100m) => lossDbPer100m / 100 * lengthM;

  // ---------------------------------------------------------------- measurement CSV
  const UNIT = { hz: 1, khz: 1e3, mhz: 1e6, ghz: 1e9 };
  function parseMeasurementCsv(text, options = {}) {
    const z0 = options.z0 ?? 50;
    const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#") && !l.startsWith("!"));
    const errors = [];
    if (!lines.length) return { points: [], info: {}, errors: ["Archivo vacio."] };
    const separator = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : lines[0].includes(",") ? "," : /\s/.test(lines[0]) ? " " : ",";
    const split = line => (separator === " " ? line.split(/\s+/) : line.split(separator)).map(c => c.trim().replace(/^"|"$/g, ""));
    const decimalComma = separator !== "," && lines.some(l => /\d,\d/.test(l));
    const toNumber = value => {
      const cleaned = decimalComma ? value.replace(",", ".") : value;
      return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(cleaned) ? Number(cleaned) : NaN;
    };
    const first = split(lines[0]);
    const header = first.some(cell => Number.isNaN(toNumber(cell)));
    const columns = { f: -1, swr: -1, r: -1, x: -1 };
    let headerUnit = null;
    if (header) {
      first.forEach((name, i) => {
        const n = name.toLowerCase();
        if (/freq|frecuen|^f\b|^f[ _([]|\bhz\b|\bkhz\b|\bmhz\b/.test(n) && columns.f < 0) {
          columns.f = i;
          const unit = /\b(ghz|mhz|khz|hz)\b/.exec(n) || /[_([ ](ghz|mhz|khz|hz)/.exec(n);
          if (unit) headerUnit = unit[1];
        } else if (/swr|roe|vswr/.test(n) && columns.swr < 0) columns.swr = i;
        else if (/^r\b|^r[ _([]|resist|^rs\b/.test(n) && columns.r < 0) columns.r = i;
        else if (/^x\b|^x[ _([]|react|^xs\b/.test(n) && columns.x < 0) columns.x = i;
      });
    } else if (first.length === 2) Object.assign(columns, { f: 0, swr: 1 });
    else if (first.length >= 3) Object.assign(columns, { f: 0, r: 1, x: 2 });
    if (columns.f < 0 || (columns.swr < 0 && (columns.r < 0 || columns.x < 0))) {
      return { points: [], info: { separator, decimalComma, header, columns }, errors: ["No se reconocen las columnas: se necesita frecuencia y SWR, o frecuencia, R y X."] };
    }
    const raw = [];
    lines.slice(header ? 1 : 0).forEach((line, i) => {
      const cells = split(line);
      const f = toNumber(cells[columns.f] ?? "");
      const row = { f, swr: columns.swr >= 0 ? toNumber(cells[columns.swr] ?? "") : NaN, r: columns.r >= 0 ? toNumber(cells[columns.r] ?? "") : NaN, x: columns.x >= 0 ? toNumber(cells[columns.x] ?? "") : NaN };
      const usable = Number.isFinite(f) && (Number.isFinite(row.swr) || (Number.isFinite(row.r) && Number.isFinite(row.x)));
      if (usable) raw.push(row); else errors.push(`Linea ${i + 1 + (header ? 1 : 0)} ignorada.`);
    });
    let unit = headerUnit ? headerUnit.toLowerCase() : null;
    if (!unit) {
      const top = Math.max(...raw.map(p => p.f));
      unit = top >= 1e6 ? "hz" : top >= 1e3 ? "khz" : "mhz";
    }
    const points = raw.map(p => {
      const z = Number.isFinite(p.r) && Number.isFinite(p.x) ? [p.r, p.x] : null;
      return { f: p.f * UNIT[unit], swr: Number.isFinite(p.swr) ? p.swr : swrFromZ(z, z0), r: z ? z[0] : undefined, x: z ? z[1] : undefined };
    }).sort((a, b) => a.f - b.f);
    return { points, info: { separator, decimalComma, header, unit, columns, hasZ: points.some(p => p.r !== undefined) }, errors };
  }

  // Frequency shift between the SWR minimum of the model and of the measurement.
  function compareMeasured(modelPoints, measuredPoints) {
    if (!modelPoints.length || !measuredPoints.length) return null;
    const model = findMinimum(modelPoints), measured = findMinimum(measuredPoints);
    return { modelF: model.f, modelSwr: model.swr, measuredF: measured.f, measuredSwr: measured.swr, shiftHz: measured.f - model.f };
  }

  // ---------------------------------------------------------------- radios and bands (repo-sourced only)
  const MHZ = 1e6;
  const seg = (label, lowMHz, highMHz) => ({ id: label.replace(/\s+/g, "").toLowerCase(), label, lowHz: Math.round(lowMHz * MHZ), highHz: Math.round(highMHz * MHZ) });
  const ICOM_FILE = "third_party/icom-byof/FREQUENCY_RANGES.md";
  // IC-705 band plans 0-4, 160 m to 70 cm; the HF middle bands are identical in every plan (see the source file).
  const IC705 = {
    0: [["160 m", 1.8, 2], ["80 m", 3.5, 4], ["40 m", 7, 7.3], ["6 m", 50, 54], ["2 m", 144, 146], ["70 cm", 430, 440]],
    1: [["160 m", 1.8, 2], ["80 m", 3.5, 4], ["40 m", 7, 7.3], ["6 m", 50, 54], ["2 m", 144, 148], ["70 cm", 430, 450]],
    2: [["160 m", 1.81, 2], ["80 m", 3.5, 3.8], ["40 m", 7, 7.2], ["6 m", 50, 52], ["4 m", 70, 70.5], ["2 m", 144, 146], ["70 cm", 430, 440]],
    3: [["160 m", 1.81, 1.85], ["80 m", 3.5, 3.8], ["40 m", 7, 7.2], ["6 m", 50, 52], ["4 m", 70.15, 70.25], ["2 m", 144, 146], ["70 cm", 430, 440]],
    4: [["160 m", 1.8, 1.825], ["80 m", 3.5, 3.54], ["40 m", 7, 7.1], ["6 m", 50, 54], ["2 m", 144, 147], ["70 cm", 430, 440]]
  };
  const ICOM_HF = [["30 m", 10.1, 10.15], ["20 m", 14, 14.35], ["17 m", 18.068, 18.168], ["15 m", 21, 21.45], ["12 m", 24.89, 24.99], ["10 m", 28, 29.7]];
  const IC705_NAMES = { 0: "plan 0 (EUR)", 1: "plan 1 (USA)", 2: "plan 2 (UK / EU con 4 m)", 3: "plan 3 (UK)", 4: "plan 4 (restrictivo R1)" };
  const IC9700 = { 0: [[144, 146], [430, 440], [1260, 1300]], 1: [[144, 148], [430, 450], [1240, 1300]], 2: [[144, 146], [430, 440], [1240, 1300]] };
  const IC9700_NAMES = { 0: "plan 0 (EUR)", 1: "plan 1 (USA)", 2: "plan 2 (EUR general)" };
  const sortBands = bands => bands.sort((a, b) => a.lowHz - b.lowHz);
  const RADIO_PROFILES = [];
  for (const plan of Object.keys(IC705)) {
    const bands = IC705[plan].map(([label, lo, hi]) => seg(label, lo, hi)).concat(ICOM_HF.map(([label, lo, hi]) => seg(label, lo, hi)));
    if (plan !== "4") bands.push(seg("60 m", 5.255, 5.405));
    RADIO_PROFILES.push({ id: `ic705-plan${plan}`, label: `Icom IC-705, ${IC705_NAMES[plan]}`, source: ICOM_FILE, bands: sortBands(bands) });
  }
  for (const plan of Object.keys(IC9700)) {
    RADIO_PROFILES.push({ id: `ic9700-plan${plan}`, label: `Icom IC-9700, ${IC9700_NAMES[plan]}`, source: ICOM_FILE,
      bands: IC9700[plan].map(([lo, hi]) => seg(`${lo}-${hi} MHz`, lo, hi)) });
  }
  RADIO_PROFILES.push(
    { id: "opengd77", label: "OpenGD77 (limites TX por defecto, referidos a EE. UU.)", source: "docs/AYUDA-OPENGD77-MODELOS.md",
      bands: [seg("144-148 MHz", 144, 148), seg("222-225 MHz", 222, 225), seg("420-450 MHz", 420, 450)] },
    { id: "quansheng", label: "Quansheng UV-K5 / UV-K1 (banda TX permitida en CAT)", source: "planning-core.js",
      bands: [seg("136-174 MHz", 136, 174), seg("400-470 MHz", 400, 470)] },
    { id: "anytone", label: "AnyTone (bandas admitidas por el validador de canales)", source: "anytone-core.js",
      bands: [seg("136-174 MHz", 136, 174), seg("400-470 MHz", 400, 470)] },
    // FTX-1 TX bands: [[freq_ranges.ranges.bands]] of the rigplane profile (BS BAND SELECT codes of the CAT Operation Reference
    // Manual 2508-C). docs/FTX1-KNOWLEDGE.md warns that the sources do not fix licence limits: check your own licence.
    { id: "ftx1", label: "Yaesu FTX-1", source: "third_party/ftx1/rigplane-rigplane-core/rigs/ftx1.toml",
      note: "Bandas del perfil rigplane del FTX-1; docs/FTX1-KNOWLEDGE.md avisa de que las fuentes no fijan los limites de TX: respeta tu licencia.",
      bands: [["160 m", 1.8, 2], ["80 m", 3.5, 3.8], ["60 m", 5.3515, 5.3665], ["40 m", 7, 7.2], ["30 m", 10.1, 10.15], ["20 m", 14, 14.35],
        ["17 m", 18.068, 18.168], ["15 m", 21, 21.45], ["12 m", 24.89, 24.99], ["10 m", 28, 29.7], ["6 m", 50, 54], ["4 m", 70, 70.5],
        ["2 m", 144, 148], ["70 cm", 430, 450]].map(([label, lo, hi]) => seg(label, lo, hi)) },
    // truSDX / QMX: the repository only gives the CAT tuning range of the radio profile (android RigCat.kt RigModel), not TX edges.
    { id: "trusdx", label: "(tr)uSDX (rango de sintonia CAT)", source: "android/app/src/main/java/org/bricohams/radio/RigCat.kt",
      note: "Rango de sintonia CAT del perfil, no limites de TX; bandas por defecto 80/60/40/30/20 m segun remote-station/docs/radio-conexiones-candidatas.md.",
      bands: [seg("3-30 MHz (CAT)", 3, 30)] },
    { id: "qmx", label: "QRP Labs QMX / QMX+ (rango de sintonia CAT)", source: "android/app/src/main/java/org/bricohams/radio/RigCat.kt",
      note: "Rango de sintonia CAT del perfil, no limites de TX; 160 m-6 m segun remote-station/docs/radio-conexiones-candidatas.md.",
      bands: [seg("1.8-54 MHz (CAT)", 1.8, 54)] },
    // TH-D75 band A tunes only the amateur 144, 220 and 430 MHz bands (Th75Rig.BAND_A_RANGES in RigProtocols.kt).
    { id: "thd75", label: "Kenwood TH-D75 (banda A)", source: "android/app/src/main/java/org/bricohams/radio/RigProtocols.kt",
      note: "Rangos de sintonia de la banda A del TH-D75, no limites de licencia.",
      bands: [seg("136-174 MHz", 136, 174), seg("216-260 MHz", 216, 260), seg("410-470 MHz", 410, 470)] },
    { id: "tk11", label: "TK11", source: null }
  );
  function bandsForRadio(id) {
    const profile = RADIO_PROFILES.find(p => p.id === id);
    if (!profile) return { status: "none", bands: [], message: "Elige una radio." };
    if (!profile.bands) return { status: "pending", bands: [], message: PENDING, source: null, note: profile.note || null };
    return { status: "ok", bands: profile.bands.map(b => ({ ...b, centerHz: (b.lowHz + b.highHz) / 2 })), source: profile.source, note: profile.note || null };
  }

  // ---------------------------------------------------------------- SWR meter read via CAT (the radio is keyed by the operator, never by the app)
  const SWR_PENDING = "pendiente de fuente";
  // status "ok": command and conversion sourced; "partial": command and raw scale sourced, ratio calibration approximate;
  // "pending": no sourced SWR read command (or no sourced scale).
  const SWR_METERS = Object.freeze({
    // data/third-party/IC-705_ENG_CI-V_6.txt (local, not committed): p.5 "Read SWR meter level" 15 12, 0000-0255, 0000=SWR 1.0,
    // 0048=1.5, 0080=2.0, 0120=3.0; p.15 "Send/read the transceiver's status" 1C 00 (00=RX, 01=TX). Raw 240 = 6.0 only from rigplane ic705.toml.
    ic705: { status: "ok", command: "CI-V 15 12 (4 digitos BCD, 0000-0255); TX 1C 00", source: "IC-705 CI-V Reference Guide p.5 (15 12) y p.15 (1C 00); rigs/ic705.toml" },
    // Same 15 12 read and 0/48/80/120 -> 1.0/1.5/2.0/3.0 table in the rigplane rigs files; no value above raw 120 is used for these radios.
    ic7300: { status: "partial", command: "CI-V 15 12; TX 1C 00", source: "third_party/ftx1/rigplane-rigplane-core/rigs/ic7300.toml (get_swr, meters.swr.calibration)" },
    ic7300mk2: { status: "partial", command: "CI-V 15 12; TX 1C 00", source: "third_party/ftx1/rigplane-rigplane-core/rigs/ic7300mk2.toml (get_swr, meters.swr.calibration)" },
    ic7610: { status: "partial", command: "CI-V 15 12; TX 1C 00", source: "third_party/ftx1/rigplane-rigplane-core/rigs/ic7610.toml (get_swr, meters.swr.calibration)" },
    ic9700: { status: "partial", command: "CI-V 15 12; TX 1C 00", source: "third_party/ftx1/rigplane-rigplane-core/rigs/ic9700.toml (get_swr, meters.swr.calibration)" },
    ic905: { status: "partial", command: "CI-V 15 12; TX 1C 00", source: "third_party/ftx1/rigplane-rigplane-core/rigs/ic905.toml (get_swr, meters.swr.calibration)" },
    ftx1: { status: "partial", command: "RM6;", source: "FTX-1 CAT Operation Reference Manual 2508-C RM READ METER; docs/FTX1-KNOWLEDGE.md; third_party/ftx1/bg7nzl-ftx1ctl/ftx1cat.py swr_from_meter" },
    qmx: { status: "pending", command: "SW;", source: "remote-station/docs/hardware/qmx-plus.md: comando listado, escala no documentada" }
  });
  // IC-705 raw 0-255 to SWR: rigplane ic705.toml calibration points (0=1.0, 48=1.5, 80=2.0, 120=3.0, 240=6.0), piecewise linear.
  const IC705_SWR_CAL = [[0, 1], [48, 1.5], [80, 2], [120, 3], [240, 6]];
  // Station catalog ids (data/remote-station-catalog.json) share the meter table with the antenna radio ids.
  const SWR_ALIASES = {
    "icom-ic-705": "ic705", "yaesu-ftx-1": "ftx1", "qrplabs-qmx": "qmx", "icom-ic-7300": "ic7300", "icom-ic-7300mk2": "ic7300mk2",
    "icom-ic-7610": "ic7610", "icom-ic-9700": "ic9700", "icom-ic-905": "ic905"
  };
  const ICOM_CIV_SWR = new Set(["ic705", "ic7300", "ic7300mk2", "ic7610", "ic9700", "ic905"]);
  const swrMeterKey = radioId => { const id = String(radioId || "").replace(/-plan\d+$/, ""); return SWR_ALIASES[id] || id; };
  function swrMeterInfo(radioId) {
    const info = SWR_METERS[swrMeterKey(radioId)];
    return info ? { ...info } : { status: "pending", command: null, source: null, message: SWR_PENDING };
  }
  // Returns the SWR ratio for a raw meter value, or null when the radio has no sourced conversion or the value is out of range.
  function swrFromMeter(radioId, raw) {
    const key = swrMeterKey(radioId);
    if (!Number.isFinite(raw) || raw < 0 || raw > 255) return null;
    if (ICOM_CIV_SWR.has(key)) {
      if (key !== "ic705" && raw > 120) return null;
      for (let i = 1; i < IC705_SWR_CAL.length; i++) {
        const [r0, s0] = IC705_SWR_CAL[i - 1], [r1, s1] = IC705_SWR_CAL[i];
        if (raw <= r1) return s0 + (s1 - s0) * (raw - r0) / (r1 - r0);
      }
      return IC705_SWR_CAL[IC705_SWR_CAL.length - 1][1];
    }
    // FTX-1 host-side calibration of bg7nzl-ftx1ctl ftx1cat.py swr_from_meter; approximate (the meter is raw, uncalibrated).
    // This is the only FTX-1 raw-to-SWR conversion (Node agent, Web Serial page and Android all send the raw RM6 value here).
    // Real bench answer (read only, RX): RM6000000; -> raw 0 -> SWR 1.0.
    if (key === "ftx1") return raw >= 255 ? null : raw <= 0 ? 1 : 1 + 0.333 * (Math.exp(0.0151 * raw) - 1);
    return null;
  }
  // Logs (frequency, SWR) points only while the radio reports TX; the points have the shape of parseMeasurementCsv rows.
  function createSwrLogger(options = {}) {
    const maxPoints = options.maxPoints || 400, stepHz = options.stepHz || 1000;
    const byBin = new Map();
    return {
      add({ freqHz, swr, tx }) {
        if (tx !== true || !Number.isFinite(freqHz) || freqHz <= 0 || !Number.isFinite(swr) || swr < 1) return false;
        const bin = Math.round(freqHz / stepHz);
        if (!byBin.has(bin) && byBin.size >= maxPoints) return false;
        byBin.set(bin, { f: freqHz, swr });
        return true;
      },
      points: () => [...byBin.values()].sort((a, b) => a.f - b.f),
      clear: () => byBin.clear(),
      get size() { return byBin.size; }
    };
  }

  // ---------------------------------------------------------------- advisor (rule based; every figure comes from the computed numbers)
  const ADVISOR_TEXT = Object.freeze({
    shorten: "Resonancia en {0} MHz, por debajo de la banda (objetivo {1} MHz): acorta cada brazo {2} mm (brazo actual {3} m).",
    lengthen: "Resonancia en {0} MHz, por encima de la banda (objetivo {1} MHz): alarga cada brazo {2} mm (brazo actual {3} m).",
    slope: "Sin cruce de X en el barrido: X = {0} ohm a {1} MHz con pendiente {2} ohm/MHz; la resonancia queda hacia {3} MHz.",
    ratio: "R = {0} ohm a {1} MHz con Z0 = {2} ohm: el transformador 1:{3} lleva R a {4} ohm (SWR resistivo {5}).",
    trap: "Trampa de {0} MHz: L y C resuenan en {1} MHz; con C = {2} pF usa L = {3} uH.",
    network: "Red L a {0} MHz para Z = {1} ohm hacia Z0 = {2} ohm: serie {3}, paralelo {4}.",
    ok: "SWR {0} a {1} MHz (limite {2}): no hay correcciones que proponer.",
    outside: "SWR minimo {0} en {1} MHz, fuera de la banda {2}-{3} MHz."
  });
  const fmt = (template, args) => template.replace(/\{(\d+)\}/g, (_, i) => args[Number(i)]);
  const num = (value, digits = 2) => Number(value) === Infinity ? "∞" : Number(value).toFixed(digits);
  const complexText = z => `${num(z[0])} ${z[1] < 0 ? "-" : "+"} j${num(Math.abs(z[1]))}`;
  const componentText = c => c.kind === "L" ? `L = ${num(c.value * 1e6)} uH` : `C = ${num(c.value * 1e12, 1)} pF`;
  const TRAP_TOLERANCE = 0.005;

  // input: { points, z0, band: { lowHz, highHz }, f0 (default band centre), armM (arm length), swrLimit (default 2),
  //          traps: [{ f, L, C }] }
  function advise(input) {
    const { points, z0 = 50, band, armM, swrLimit = 2, traps = [] } = input;
    const f0 = input.f0 ?? (band ? (band.lowHz + band.highHz) / 2 : points[Math.floor(points.length / 2)].f);
    const out = [];
    const mhz = f => num(f / 1e6, 3);
    const z0at = { r: interpolate(points, f0, "r"), x: interpolate(points, f0, "x"), swr: interpolate(points, f0, "swr") };
    const resonances = findResonances(points).sort((a, b) => Math.abs(a.f - f0) - Math.abs(b.f - f0));
    const res = resonances[0] || null;
    const lo = band ? band.lowHz : f0, hi = band ? band.highHz : f0;
    if (res && armM > 0 && (res.f < lo || res.f > hi)) {
      const deltaMm = armM * (1 - res.f / f0) * 1000;
      const key = res.f < f0 ? "shorten" : "lengthen";
      out.push({ id: key, severity: "action", text: fmt(ADVISOR_TEXT[key], [mhz(res.f), mhz(f0), num(Math.abs(deltaMm), 0), num(armM, 3)]),
        sources: [{ name: "f_res", value: res.f, unit: "Hz" }, { name: "dX/df", value: res.slope, unit: "ohm/Hz" }, { name: "delta_arm", value: Math.abs(deltaMm) / 1000, unit: "m" }] });
    } else if (!res && z0at.x !== null && armM > 0) {
      const a = points[Math.max(0, points.findIndex(p => p.f >= f0) - 1)], b = points[Math.min(points.length - 1, points.findIndex(p => p.f >= f0) + 0)];
      const slope = (b.x - a.x) / ((b.f - a.f) || 1);
      if (slope > 0) {
        const fres = f0 - z0at.x / slope;
        out.push({ id: "slope", severity: "info", text: fmt(ADVISOR_TEXT.slope, [num(z0at.x), mhz(f0), num(slope * 1e6), mhz(fres)]),
          sources: [{ name: "X(f0)", value: z0at.x, unit: "ohm" }, { name: "dX/df", value: slope, unit: "ohm/Hz" }] });
      }
    }
    const reference = res && res.f >= lo && res.f <= hi ? res : null;
    const r = reference ? reference.r : z0at.r;
    const rf = reference ? reference.f : f0;
    if (r !== null && r > 0) {
      const swrR = Math.max(r / z0, z0 / r);
      if (swrR > swrLimit) {
        const best = bestTransformer(r, z0);
        if (best.ratio !== 1) {
          out.push({ id: "ratio", severity: "action", text: fmt(ADVISOR_TEXT.ratio, [num(r), mhz(rf), num(z0, 0), best.ratio, num(best.resistance), num(best.swr)]),
            sources: [{ name: "R", value: r, unit: "ohm" }, { name: "ratio", value: best.ratio, unit: "" }] });
        }
      }
    }
    for (const trap of traps) {
      const fres = trapResonance(trap.L, trap.C);
      if (Math.abs(fres - trap.f) / trap.f > TRAP_TOLERANCE) {
        out.push({ id: "trap", severity: "action", text: fmt(ADVISOR_TEXT.trap, [mhz(trap.f), mhz(fres), num(trap.C * 1e12, 1), num(trapInductance(trap.f, trap.C) * 1e6)]),
          sources: [{ name: "f_trap", value: fres, unit: "Hz" }, { name: "L_new", value: trapInductance(trap.f, trap.C), unit: "H" }] });
      }
    }
    const min = findMinimum(points);
    if (band && (min.f < lo || min.f > hi)) {
      out.push({ id: "outside", severity: "info", text: fmt(ADVISOR_TEXT.outside, [num(min.swr), mhz(min.f), mhz(lo), mhz(hi)]),
        sources: [{ name: "f_swr_min", value: min.f, unit: "Hz" }, { name: "swr_min", value: min.swr, unit: "" }] });
    }
    if (z0at.swr !== null && z0at.swr > swrLimit && z0at.r !== null) {
      const z = [z0at.r, z0at.x];
      const solution = lNetwork(z, z0, f0)[0];
      if (solution) {
        out.push({ id: "network", severity: "action", text: fmt(ADVISOR_TEXT.network, [mhz(f0), complexText(z), num(z0, 0), componentText(solution.series), componentText(solution.shunt)]),
          sources: [{ name: "Z(f0)_R", value: z[0], unit: "ohm" }, { name: "Z(f0)_X", value: z[1], unit: "ohm" }] });
      }
    }
    if (!out.length && z0at.swr !== null) {
      out.push({ id: "ok", severity: "info", text: fmt(ADVISOR_TEXT.ok, [num(z0at.swr), mhz(f0), num(swrLimit, 1)]), sources: [{ name: "swr", value: z0at.swr, unit: "" }] });
    }
    return out;
  }

  // Pattern data for the UI: cuts, a coarse 3D grid, peak gain and the current magnitude on every wire node.
  function computePattern(design, f, options = {}) {
    const e = evaluate(design, f, { z0: options.z0 });
    const { model, pin } = e;
    const floor = -40;
    const gain = (theta, phi) => Math.max(floor, gainDbi(model, theta, phi, pin));
    const stepDeg = options.stepDeg || 10;
    const thetaCount = Math.round(180 / stepDeg) + 1, phiCount = Math.round(360 / (stepDeg * 1.5));
    const grid = [];
    let peak = { gain: -Infinity, theta: 0, phi: 0 };
    for (let i = 0; i < thetaCount; i++) {
      const theta = Math.PI * i / (thetaCount - 1), row = [];
      for (let j = 0; j < phiCount; j++) {
        const phi = 2 * Math.PI * j / phiCount, g = gain(theta, phi);
        row.push(g);
        if (g > peak.gain) peak = { gain: g, theta, phi };
      }
      grid.push(row);
    }
    const elevation = [];
    for (let psi = 0; psi < 360; psi += 5) {
      const rad = psi * Math.PI / 180;
      elevation.push({ angle: psi, gain: psi <= 180 ? gain(rad, peak.phi) : gain(2 * Math.PI - rad, peak.phi + Math.PI) });
    }
    const azimuth = [];
    const cutTheta = options.takeoffDeg !== undefined ? (90 - options.takeoffDeg) * Math.PI / 180 : peak.theta;
    for (let az = 0; az < 360; az += 5) azimuth.push({ angle: az, gain: gain(cutTheta, az * Math.PI / 180) });
    const currents = model.wires.map((wire, w) => {
      const rows = model._result.unknowns.map((u, idx) => ({ u, idx })).filter(item => item.u.w === w);
      return wire.nodes.map((p, i) => {
        const item = rows.find(r => r.u.i === i);
        return { p, magnitude: item ? Math.hypot(model._result.Ir[item.idx], model._result.Ii[item.idx]) : 0 };
      });
    });
    return { z: e.z, swr: e.swr, pin, peak: { gainDbi: peak.gain, thetaDeg: peak.theta * 180 / Math.PI, phiDeg: peak.phi * 180 / Math.PI },
      grid, thetaCount, phiCount, elevation, azimuth, cutThetaDeg: cutTheta * 180 / Math.PI, currents, floor };
  }

  const api = {
    computePattern,
    C0, MU0, EPS0, MAX_UNKNOWNS, PENDING, GX, GW, ADVISOR_TEXT, TRANSFORMERS, TRAP_TOLERANCE, RADIO_PROFILES,
    complex: ccomplex, createModel, addWire, solve, farField, intensity, radiatedPower, gainDbi,
    reflection, swrFromZ, swrFromGamma, smithPoint, smithGrid, impedanceFromGamma,
    loadImpedance, trapResonance, trapInductance, trapCapacitance,
    validateDesign, chainRows, locate, buildFromDesign, feedPoint, evaluate, linspace, sweep, findMinimum, interpolate, findResonances,
    nelderMead, scaleDesign, autoTune, suggestSegments, dipoleTemplate, invertedVTemplate, trapDipoleTemplate, cloneDesign, rowLength,
    transformImpedance, bestTransformer, lNetwork, lNetworkInput, coaxInput, coaxMatchedLossDb,
    parseMeasurementCsv, compareMeasured, bandsForRadio, advise, fmt,
    SWR_METERS, swrMeterInfo, swrFromMeter, createSwrLogger
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AntennaCore = api;
})(typeof globalThis === "object" ? globalThis : this);
