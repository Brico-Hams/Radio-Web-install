"""Solucionador propio de antenas de hilo por el metodo de los momentos.

Formulacion de Harrington con corrientes en los nodos, cargas en los segmentos
y nucleo reducido de hilo fino. Espacio libre, hilos perfectamente conductores.
Pensado para dipolos y Yagis de elementos finos; no modela tierra, perdidas,
dielectricos de los soportes ni el boom.
Autores: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF y Pedro Roca
(Bricohams - bricohams.org / bricohams.com).
"""
import numpy as np

C0 = 299792458.0
MU0 = 4e-7 * np.pi
EPS0 = 1.0 / (MU0 * C0 * C0)
_GX, _GW = np.polynomial.legendre.leggauss(8)


def _segment_integral(p, a, b, radius, k):
    """Integral de exp(-jkR)/(4 pi R) sobre el segmento a-b vista desde cada punto p."""
    p = np.atleast_2d(p)
    d = b - a
    length = np.linalg.norm(d)
    u = d / length
    rel = p - a
    t = rel @ u
    rho2 = np.maximum(np.sum(rel * rel, axis=1) - t * t, 0.0) + radius * radius
    rho = np.sqrt(rho2)
    static = np.arcsinh((length - t) / rho) - np.arcsinh(-t / rho)
    s = 0.5 * length * (_GX + 1.0)
    r = np.sqrt((t[:, None] - s[None, :]) ** 2 + rho2[:, None])
    smooth = np.where(r > 0, (np.exp(-1j * k * r) - 1.0) / r, -1j * k)
    return (static + 0.5 * length * smooth @ _GW) / (4 * np.pi)


class Model:
    def __init__(self, frequency_hz):
        self.f = frequency_hz
        self.k = 2 * np.pi * frequency_hz / C0
        self.omega = 2 * np.pi * frequency_hz
        self.wires = []

    def wire(self, points, segments, radius):
        """Anade un hilo poligonal; segments es el total repartido por longitud."""
        points = np.asarray(points, dtype=float)
        lengths = np.linalg.norm(np.diff(points, axis=0), axis=1)
        counts = np.maximum(1, np.round(segments * lengths / lengths.sum()).astype(int))
        nodes = [points[0]]
        for start, end, count in zip(points[:-1], points[1:], counts):
            for i in range(1, count + 1):
                nodes.append(start + (end - start) * i / count)
        self.wires.append((np.array(nodes), radius))
        return len(self.wires) - 1

    def solve(self, feeds, loads=()):
        """feeds: (hilo, nodo interior, tension); loads: (hilo, nodo, impedancia)."""
        unknowns, segs = [], []
        for w, (nodes, radius) in enumerate(self.wires):
            base = len(segs)
            for j in range(len(nodes) - 1):
                segs.append((nodes[j], nodes[j + 1], radius))
            for i in range(1, len(nodes) - 1):
                unknowns.append((w, i, base + i - 1, base + i))
        n = len(unknowns)
        mids = np.array([(a + b) / 2 for a, b, _ in segs])
        seglen = np.array([np.linalg.norm(b - a) for a, b, _ in segs])
        nodes_xyz = np.array([self.wires[w][0][i] for w, i, _, _ in unknowns])
        # Potencial escalar de cada segmento cargado visto desde los puntos medios.
        G = np.array([_segment_integral(mids, a, b, r, self.k) for a, b, r in segs]).T
        # Potencial vector de cada medio segmento visto desde los nodos.
        halves = []
        for w, i, s_prev, s_next in unknowns:
            a, b, r = segs[s_prev]
            c, d, r2 = segs[s_next]
            halves.append([(mids[s_prev], b, r), (c, mids[s_next], r2)])
        Z = np.zeros((n, n), dtype=complex)
        dl_test = np.array([mids[s_next] - mids[s_prev] for _, _, s_prev, s_next in unknowns])
        for col, (w, i, s_prev, s_next) in enumerate(unknowns):
            for a, b, r in halves[col]:
                u = (b - a) / np.linalg.norm(b - a)
                Z[:, col] += 1j * self.omega * MU0 * (dl_test @ u) * _segment_integral(nodes_xyz, a, b, r, self.k)
            q_next = 1.0 / (1j * self.omega * seglen[s_next])
            q_prev = -1.0 / (1j * self.omega * seglen[s_prev])
            for row, (_, _, t_prev, t_next) in enumerate(unknowns):
                Z[row, col] += (q_next * (G[t_next, s_next] - G[t_prev, s_next])
                                + q_prev * (G[t_next, s_prev] - G[t_prev, s_prev])) / EPS0
        index = {(w, i): row for row, (w, i, _, _) in enumerate(unknowns)}
        for w, i, impedance in loads:
            Z[index[(w, i)], index[(w, i)]] += impedance
        V = np.zeros(n, dtype=complex)
        for w, i, volts in feeds:
            V[index[(w, i)]] = volts
        I = np.linalg.solve(Z, V)
        self._result = (unknowns, segs, mids, I)
        return {(w, i): (volts, I[index[(w, i)]]) for w, i, volts in feeds}

    def far_field(self, theta, phi):
        """Campo lejano (E_theta, E_phi) sin el factor exp(-jkr)/r."""
        unknowns, segs, mids, I = self._result
        theta, phi = np.broadcast_arrays(np.asarray(theta, float), np.asarray(phi, float))
        rhat = np.stack([np.sin(theta) * np.cos(phi), np.sin(theta) * np.sin(phi), np.cos(theta)], -1)
        that = np.stack([np.cos(theta) * np.cos(phi), np.cos(theta) * np.sin(phi), -np.sin(theta)], -1)
        phat = np.stack([-np.sin(phi), np.cos(phi), np.zeros_like(phi)], -1)
        A = np.zeros(theta.shape + (3,), dtype=complex)
        for current, (w, i, s_prev, s_next) in zip(I, unknowns):
            for a, b in ((mids[s_prev], segs[s_prev][1]), (segs[s_next][0], mids[s_next])):
                d = b - a
                centre = (a + b) / 2
                arg = self.k * (rhat @ d) / 2
                A += current * np.exp(1j * self.k * (rhat @ centre))[..., None] * np.sinc(arg / np.pi)[..., None] * d
        factor = -1j * self.omega * MU0 / (4 * np.pi)
        return factor * np.sum(A * that, -1), factor * np.sum(A * phat, -1)

    def radiated_power(self, steps=91):
        theta = np.linspace(0, np.pi, steps)
        phi = np.linspace(0, 2 * np.pi, 2 * steps - 1)
        T, P = np.meshgrid(theta, phi, indexing="ij")
        et, ep = self.far_field(T, P)
        u = (np.abs(et) ** 2 + np.abs(ep) ** 2) / (2 * MU0 * C0)
        return np.trapezoid(np.trapezoid(u * np.sin(T), phi, axis=1), theta)

    def gain_dbi(self, theta, phi, input_power):
        et, ep = self.far_field(theta, phi)
        u = (np.abs(et) ** 2 + np.abs(ep) ** 2) / (2 * MU0 * C0)
        return 10 * np.log10(4 * np.pi * u / input_power)
