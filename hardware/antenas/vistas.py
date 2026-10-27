"""Genera los planos SVG de las antenas y las vistas de las piezas STL.

Uso: python vistas.py (tras disenar.py y generar_stl.py)
Escribe en docs/atlas/ sat-antena-yagi.svg, sat-antena-dipolo-v.svg y
sat-piezas-stl.svg. SVG estatico, sin scripts ni enlaces.
Autores: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF y Pedro Roca
(Bricohams - bricohams.org / bricohams.com).
"""
import json
from pathlib import Path

import numpy as np
from manifold3d import set_circular_segments

HERE = Path(__file__).parent
ATLAS = HERE.parent.parent / "docs" / "atlas"
FOOT = "Autores: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF y Pedro Roca - bricohams.org / bricohams.com"


def svg(width, height, title, desc, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" '
            f'role="img" aria-labelledby="title desc">\n<title id="title">{title}</title>\n<desc id="desc">{desc}</desc>\n'
            f'<rect width="{width}" height="{height}" fill="#14202c"/>\n<g font-family="sans-serif" fill="#fff">\n'
            + "\n".join(body) + "\n</g></svg>\n")


def text(x, y, value, size=16, color="#fff", anchor="start"):
    return f'<text x="{x:.0f}" y="{y:.0f}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{value}</text>'


def yagi(res):
    y = res["yagi"]
    width, height = 1200, 800
    scale = 1000 / y["boom_mm"]
    x0 = 100
    body = [text(35, 42, "Yagi bibanda de mano Bricohams - plano acotado", 24),
            text(35, 70, f"Diseno propio calculado con mom.py. Cotas en mm desde el reflector VHF. Varilla aluminio 4 mm, boom PVC 20 mm de {y['boom_mm']} mm.", 15),
            f'<path d="M{x0 - 40} 300H{x0 + y["boom_mm"] * scale}" stroke="#bbb" stroke-width="10"/>']
    vh = y["vhf"]
    for name, length, pos in zip(vh["elementos"], vh["longitud_mm"], vh["posicion_mm"]):
        x = x0 + pos * scale
        half = length * scale * 0.12
        body.append(f'<path d="M{x:.1f} {300 - half:.1f}V{300 + half:.1f}" stroke="#ffa342" stroke-width="5"/>')
        body.append(text(x, 300 - half - 32, name, 14, "#ffa342", "middle"))
        body.append(text(x, 300 - half - 12, f"{length} mm", 15, "#ffa342", "middle"))
        body.append(text(x, 300 + half + 22, f"x={pos}", 14, "#ffa342", "middle"))
    uh = y["uhf"]
    base = 630
    body.append(f'<path d="M{x0 - 40} {base}H{x0 + y["boom_mm"] * scale}" stroke="#bbb" stroke-width="10"/>')
    for name, length, pos in zip(uh["elementos"], uh["longitud_mm"], uh["posicion_mm"]):
        x = x0 + pos * scale
        half = length * scale * 0.12
        body.append(f'<path d="M{x:.1f} {base - half:.1f}V{base + half:.1f}" stroke="#7fd18b" stroke-width="5"/>')
        body.append(text(x, base - half - 30, name.replace("director ", "D"), 14, "#7fd18b", "middle"))
        body.append(text(x, base - half - 10, f"{length}", 15, "#7fd18b", "middle"))
        body.append(text(x, base + half + 22, f"x={pos}", 14, "#7fd18b", "middle"))
    body += [text(35, 112, "VHF 145.8-146.0 MHz: plano horizontal (vista superior, longitudes no a escala)", 17, "#ffa342"),
             text(35, 500, "UHF 435-438 MHz: plano vertical, girado 90 grados sobre el mismo boom (vista lateral)", 17, "#7fd18b"),
             text(35, 718, "Excitados: longitud total punta a punta, incluido el hueco central de 16 mm del bloque impreso.", 15),
             text(35, 743, "Elementos pasivos: varilla continua, aislada del boom por la pinza. Cortar 3-5 mm largo y ajustar con analizador.", 15),
             text(35, 783, FOOT, 14)]
    return svg(width, height, "Plano de la Yagi bibanda de mano Bricohams",
               "Plano propio acotado: elementos VHF en un plano y UHF en el ortogonal, sobre boom de PVC de 20 mm.", body)


def vdip(res):
    d = res["dipolo_v"]
    angle, arm = d["angulo_grados"], d["brazo_mm"]
    cx, cy, s = 600, 470, 0.62
    half = np.radians(angle / 2)
    tips = [(cx + arm * s * np.sin(sgn * half), cy - arm * s * np.cos(half)) for sgn in (-1, 1)]
    body = [text(35, 42, "Dipolo en V horizontal 2 m - plano acotado", 24),
            text(35, 70, "Diseno propio calculado con mom.py. Vista superior. Recepcion fija de ISS (SSTV, APRS) y satelites FM en VHF.", 15)]
    for tx, ty in tips:
        body.append(f'<path d="M{cx} {cy}L{tx:.1f} {ty:.1f}" stroke="#ffa342" stroke-width="6"/>')
    body += [f'<circle cx="{cx}" cy="{cy}" r="22" fill="#26394b" stroke="#fff" stroke-width="2"/>',
             text(cx, cy + 55, "Cubo impreso + mastil PVC 20 mm, coaxial 50 ohm con choke", 15, anchor="middle"),
             text(tips[0][0] - 10, tips[0][1] - 15, f"Brazo {arm} mm desde el centro", 16, "#ffa342", "middle"),
             text(tips[1][0] + 10, tips[1][1] - 15, f"Varilla {arm - 8} mm (empieza a 8 mm del eje)", 16, "#ffa342", "middle"),
             text(cx, cy - 120, f"{angle} grados", 18, "#ffa342", "middle"),
             text(35, 600, "Resultado simulado (espacio libre):", 17)]
    for i, row in enumerate(d["rendimiento"]):
        body.append(text(35, 630 + 25 * i, f"{row['mhz']:.1f} MHz: Z = {row['z'][0]} {row['z'][1]:+} j ohm, ROE {row['swr']}, cenit {row['zenith_dbi']} dBi", 15))
    body.append(text(35, 730, FOOT, 14))
    return svg(1200, 750, "Plano del dipolo en V horizontal para 2 m",
               "Plano propio acotado del dipolo en V con angulo y longitud de brazo calculados.", body)


def render_parts():
    import generar_stl as g
    set_circular_segments(24)
    parts = [("Pinza de elemento", g.element_clamp()), ("Bloque del excitado", g.driven_block()),
             ("Empunadura", g.handle()), ("Cubo del dipolo en V", g.v_hub(json.loads((HERE / "resultados.json").read_text("utf-8"))["dipolo_v"]["angulo_grados"]))]
    yaw, pitch = np.radians(35), np.radians(28)
    rot = np.array([[np.cos(yaw), -np.sin(yaw), 0], [np.sin(yaw), np.cos(yaw), 0], [0, 0, 1]])
    tilt = np.array([[1, 0, 0], [0, np.cos(pitch), -np.sin(pitch)], [0, np.sin(pitch), np.cos(pitch)]])
    light = np.array([0.3, -0.6, 0.74]) / np.linalg.norm([0.3, -0.6, 0.74])
    body = [text(35, 42, "Piezas imprimibles STL (vista isometrica)", 24),
            text(35, 70, "PETG o ASA, 4 perimetros, 40 % de relleno. Tornillos M3 roscados directamente en el plastico.", 15)]
    for slot, (name, part) in enumerate(parts):
        mesh = part.to_mesh()
        v = np.asarray(mesh.vert_properties)[:, :3] @ (tilt @ rot).T
        tris = np.asarray(mesh.tri_verts)
        p = v[tris]
        normals = np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0])
        normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
        visible = normals[:, 1] < 0
        p, normals = p[visible], normals[visible]
        order = np.argsort(-p[:, :, 1].mean(axis=1))
        lo, hi = v[:, [0, 2]].min(0), v[:, [0, 2]].max(0)
        scale = min(240 / (hi - lo).max(), 4.0)
        ox, oy = 35 + slot * 290 + 130, 260
        cx, cz = (lo + hi) / 2
        for t in order:
            shade = 0.35 + 0.65 * max(0.0, float(normals[t] @ light))
            color = "#%02x%02x%02x" % (int(255 * shade), int(163 * shade), int(66 * shade))
            pts = " ".join(f"{ox + (x - cx) * scale:.1f},{oy - (z - cz) * scale:.1f}" for x, _, z in p[t])
            body.append(f'<polygon points="{pts}" fill="{color}" stroke="{color}" stroke-width="0.3"/>')
        body.append(text(ox, 420, name, 17, anchor="middle"))
    body.append(text(35, 470, FOOT, 14))
    return svg(1200, 490, "Piezas imprimibles de las antenas de satelite Bricohams",
               "Vista isometrica propia de los cuatro STL: pinza de elemento, bloque del excitado, empunadura y cubo del dipolo en V.", body)


def main():
    res = json.loads((HERE / "resultados.json").read_text("utf-8"))
    (ATLAS / "sat-antena-yagi.svg").write_text(yagi(res), encoding="utf-8")
    (ATLAS / "sat-antena-dipolo-v.svg").write_text(vdip(res), encoding="utf-8")
    (ATLAS / "sat-piezas-stl.svg").write_text(render_parts(), encoding="utf-8")
    for name in ("sat-antena-yagi.svg", "sat-antena-dipolo-v.svg", "sat-piezas-stl.svg"):
        print(name, (ATLAS / name).stat().st_size)


if __name__ == "__main__":
    main()
