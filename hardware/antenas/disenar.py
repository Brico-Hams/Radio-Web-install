"""Diseno y verificacion por simulacion de las antenas de satelite Bricohams.

Uso: python disenar.py [--rapido]
Optimiza las dimensiones con el solucionador propio mom.py y escribe
resultados.json, que consume generar_stl.py y la documentacion.
Autores: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF y Pedro Roca
(Bricohams - bricohams.org / bricohams.com).
"""
import json
import sys
from pathlib import Path

import numpy as np

import mom

RADIUS = 0.002          # varilla de aluminio de 4 mm
Z0 = 50.0
SEG_PER_ELEMENT = 20    # par: el nodo central es el punto de alimentacion
VHF = (145.8e6, 145.9e6, 146.0e6)
UHF = (435.0e6, 436.5e6, 438.0e6)
UHF_START = 0.075       # el reflector UHF queda 75 mm por delante del reflector VHF
MIN_GAP_MM = 35         # separacion minima entre piezas impresas de VHF y UHF en el boom


def element(model, x, length, axis, segments=SEG_PER_ELEMENT):
    a = np.zeros(3); b = np.zeros(3)
    a[0] = b[0] = x
    a[axis], b[axis] = -length / 2, length / 2
    return model.wire([a, b], segments, RADIUS), segments // 2


def yagi_positions(spacings, start=0.0):
    return np.concatenate([[start], start + np.cumsum(spacings)])


def evaluate(freq, vhf=None, uhf=None, driven="vhf", segments=SEG_PER_ELEMENT):
    """Devuelve Z, ROE, ganancia delantera y relacion delante/detras."""
    model = mom.Model(freq)
    feeds, loads = [], []
    for band, axis, start in (("vhf", 1, 0.0), ("uhf", 2, UHF_START)):
        design = vhf if band == "vhf" else uhf
        if design is None:
            continue
        xs = yagi_positions(design["spacings"], start)
        for idx, (x, length) in enumerate(zip(xs, design["lengths"])):
            w, c = element(model, x, length, axis, segments)
            if idx == 1:
                (feeds if band == driven else loads).append((w, c, 1.0 if band == driven else Z0))
    result = model.solve(feeds, loads)
    volts, current = next(iter(result.values()))
    z = volts / current
    gamma = abs((z - Z0) / (z + Z0))
    pin = 0.5 * np.real(volts * np.conj(current))
    forward = model.gain_dbi(np.pi / 2, 0.0, pin)
    back = model.gain_dbi(np.pi / 2, np.pi, pin)
    return {"z": z, "swr": (1 + gamma) / (1 - gamma), "gain": float(forward), "fb": float(forward - back)}


def nelder_mead(fun, x0, scale, iterations):
    simplex = [np.array(x0, float)]
    for i in range(len(x0)):
        point = np.array(x0, float); point[i] += scale[i]; simplex.append(point)
    values = [fun(p) for p in simplex]
    for _ in range(iterations):
        order = np.argsort(values); simplex = [simplex[i] for i in order]; values = [values[i] for i in order]
        centroid = np.mean(simplex[:-1], axis=0)
        reflected = centroid + (centroid - simplex[-1]); fr = fun(reflected)
        if fr < values[0]:
            expanded = centroid + 2 * (centroid - simplex[-1]); fe = fun(expanded)
            simplex[-1], values[-1] = (expanded, fe) if fe < fr else (reflected, fr)
        elif fr < values[-2]:
            simplex[-1], values[-1] = reflected, fr
        else:
            contracted = centroid + 0.5 * (simplex[-1] - centroid); fc = fun(contracted)
            if fc < values[-1]:
                simplex[-1], values[-1] = contracted, fc
            else:
                simplex = [simplex[0] + 0.5 * (p - simplex[0]) for p in simplex]
                values = [fun(p) for p in simplex]
    best = int(np.argmin(values))
    return simplex[best], values[best]


def yagi_cost(freqs, n, max_boom):
    def cost(x):
        lengths, spacings = x[:n], x[n:]
        if np.any(spacings < 0.04) or spacings.sum() > max_boom or np.any(lengths <= 0):
            return 1e3
        design = {"lengths": lengths, "spacings": spacings}
        runs = [evaluate(f, **({"vhf": design} if freqs is VHF else {"uhf": design, "driven": "uhf"})) for f in freqs]
        swr = max(r["swr"] for r in runs)
        gain = min(r["gain"] for r in runs)
        fb = min(r["fb"] for r in runs)
        return -gain + 4.0 * max(0.0, swr - 1.3) ** 2 * 10 + 0.3 * max(0.0, 15.0 - fb)
    return cost


def v_dipole(freq, arm, angle_deg, segments=40):
    model = mom.Model(freq)
    half = np.radians(angle_deg) / 2
    tip_a = arm * np.array([np.cos(half), np.sin(half), 0.0])
    tip_b = arm * np.array([np.cos(half), -np.sin(half), 0.0])
    w = model.wire([tip_a, [0, 0, 0], tip_b], segments, RADIUS)
    volts, current = model.solve([(w, segments // 2, 1.0)])[(w, segments // 2)]
    z = volts / current
    gamma = abs((z - Z0) / (z + Z0))
    pin = 0.5 * np.real(volts * np.conj(current))
    theta = np.linspace(0.01, np.pi / 2, 30)
    gains = [model.gain_dbi(t, np.linspace(0, 2 * np.pi, 37), pin) for t in theta]
    zenith = float(model.gain_dbi(0.0, 0.0, pin))
    return {"z": z, "swr": (1 + gamma) / (1 - gamma), "zenith": zenith,
            "azimuth_ripple_30deg": float(np.ptp(gains[int(len(theta) * 2 / 3)]))}


def describe(design, freqs, band):
    rows = []
    for f in freqs:
        if band == "vhf":
            alone = evaluate(f, vhf=design["vhf"], segments=30)
            both = evaluate(f, vhf=design["vhf"], uhf=design["uhf"], segments=30)
        else:
            alone = evaluate(f, uhf=design["uhf"], driven="uhf", segments=30)
            both = evaluate(f, vhf=design["vhf"], uhf=design["uhf"], driven="uhf", segments=30)
        rows.append({"mhz": f / 1e6, "z": [round(both["z"].real, 1), round(both["z"].imag, 1)],
                     "swr": round(both["swr"], 2), "gain_dbi": round(both["gain"], 2),
                     "fb_db": round(both["fb"], 1), "swr_sola": round(alone["swr"], 2),
                     "gain_sola_dbi": round(alone["gain"], 2)})
    return rows


def main():
    iterations = 60 if "--rapido" in sys.argv else 260
    vhf0 = [1.02, 0.955, 0.90, 0.40, 0.36]
    xv, _ = nelder_mead(yagi_cost(VHF, 3, 0.95), vhf0, [0.02, 0.02, 0.02, 0.05, 0.05], iterations)
    uhf0 = [0.340, 0.318, 0.305, 0.300, 0.295, 0.13, 0.12, 0.17, 0.20]
    xu, _ = nelder_mead(yagi_cost(UHF, 5, 0.86 - UHF_START), uhf0, [0.006] * 5 + [0.02] * 4, iterations)
    design = {
        "vhf": {"lengths": xv[:3], "spacings": xv[3:]},
        "uhf": {"lengths": xu[:5], "spacings": xu[5:]},
    }
    best_v = None
    for angle in (90, 100, 110, 120, 130, 140):
        arm, step = 0.49, 0.01
        for _ in range(25):
            here = v_dipole(145.9e6, arm, angle)
            arm += -step if here["z"].imag > 0 else step
            step *= 0.6
        here = v_dipole(145.9e6, arm, angle)
        if best_v is None or here["swr"] < best_v[2]["swr"]:
            best_v = (angle, arm, here)
    angle, arm, _ = best_v
    vdip = []
    for f in VHF:
        r = v_dipole(f, arm, angle, segments=60)
        vdip.append({"mhz": f / 1e6, "z": [round(r["z"].real, 1), round(r["z"].imag, 1)],
                     "swr": round(r["swr"], 2), "zenith_dbi": round(r["zenith"], 2),
                     "rizado_azimut_30_db": round(r["azimuth_ripple_30deg"], 1)})
    mm = lambda v: [round(float(x) * 1000) for x in v]
    vpos, upos = mm(yagi_positions(design["vhf"]["spacings"])), mm(yagi_positions(design["uhf"]["spacings"], UHF_START))
    clash = min(abs(a - b) for a in vpos for b in upos)
    assert clash >= MIN_GAP_MM, f"Piezas VHF y UHF a {clash} mm: ajustar UHF_START"
    out = {
        "nota": "Simulacion en espacio libre con mom.py; varilla 4 mm, boom no conductor, sin perdidas. Ajustar con analizador.",
        "yagi": {
            "boom_mm": round(float(max(design["vhf"]["spacings"].sum(), UHF_START + design["uhf"]["spacings"].sum())) * 1000) + 80,
            "vhf": {"elementos": ["reflector", "excitado", "director"],
                    "longitud_mm": mm(design["vhf"]["lengths"]),
                    "posicion_mm": mm(yagi_positions(design["vhf"]["spacings"])),
                    "plano": "horizontal (eje Y)", "rendimiento": describe(design, VHF, "vhf")},
            "uhf": {"elementos": ["reflector", "excitado", "director 1", "director 2", "director 3"],
                    "longitud_mm": mm(design["uhf"]["lengths"]),
                    "posicion_mm": mm(yagi_positions(design["uhf"]["spacings"], UHF_START)),
                    "plano": "vertical (eje Z), ortogonal al VHF", "rendimiento": describe(design, UHF, "uhf")},
        },
        "dipolo_v": {"angulo_grados": angle, "brazo_mm": round(arm * 1000), "rendimiento": vdip},
    }
    Path(__file__).with_name("resultados.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
