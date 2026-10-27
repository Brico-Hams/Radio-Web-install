"""Genera las piezas STL imprimibles de las antenas de satelite Bricohams.

Uso: python generar_stl.py
Piezas para boom de tubo PVC de 20 mm y varilla de aluminio de 4 mm.
Imprimir en PETG o ASA (exterior), 4 perimetros, 40 % de relleno.
Autores: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF y Pedro Roca
(Bricohams - bricohams.org / bricohams.com).
"""
import json
import struct
from pathlib import Path

import numpy as np
from manifold3d import Manifold, set_circular_segments

set_circular_segments(96)
OUT = Path(__file__).with_name("stl")
BOOM = 20.4      # tubo PVC 20 mm con holgura
ROD = 4.3        # varilla de 4 mm con holgura
M3_TAP = 2.8     # rosca directa de tornillo M3 en plastico
M3_FREE = 3.3


def cyl(d, h, center=False):
    return Manifold.cylinder(h, d / 2, d / 2, 0, center)


def box(x, y, z, center=True):
    return Manifold.cube((x, y, z), center)


def x_axis(m):
    return m.rotate((0, 90, 0))


def y_axis(m):
    return m.rotate((90, 0, 0))


def boom_ring(length, outer=30.0, screw="bottom"):
    """Anillo deslizante sobre el boom (eje X) con tornillo prisionero."""
    ring = x_axis(cyl(outer, length, True)) - x_axis(cyl(BOOM, length + 2, True))
    screw_hole = cyl(M3_TAP, (outer - BOOM) / 2 + 2).translate((0, 0, -outer / 2 - 1))
    if screw == "side":
        screw_hole = screw_hole.rotate((90, 0, 0))
    return ring - screw_hole


def element_clamp():
    ring = boom_ring(24)
    boss = box(24, 24, 18).translate((0, 0, 19))
    part = ring + boss
    part -= y_axis(cyl(ROD, 40, True)).translate((0, 0, 21))
    part -= cyl(M3_TAP, 12).translate((0, 0, 21))
    return part


def driven_block():
    ring = boom_ring(40)
    boss = box(40, 64, 18).translate((0, 0, 19))
    part = ring + boss
    depth, gap = 24.0, 16.0
    for side in (-1, 1):
        hole = y_axis(cyl(ROD, depth, True)).translate((0, side * (gap / 2 + depth / 2), 21))
        part -= hole
        part -= cyl(M3_TAP, 14).translate((0, side * (gap / 2 + 12), 21))
    part -= box(6, gap - 4, 8).translate((0, 0, 26))          # canal del coaxial entre bornes
    part -= box(4, 70, 2.2).translate((14, 0, 12.5))           # paso de brida para el coaxial
    return part


def handle():
    ring = boom_ring(50, 32, screw="side")
    grip = cyl(32, 115).translate((0, 0, -126)) - cyl(12, 100).translate((0, 0, -127))
    for z in np.arange(-120, -30, 14):
        grip -= (cyl(36, 3) - cyl(29, 3)).translate((0, 0, float(z)))
    return ring + grip


def v_hub(angle_deg):
    body = cyl(70, 18).translate((0, 0, 0))
    socket = cyl(30, 37).translate((0, 0, -34))
    part = body + socket
    part -= cyl(BOOM, 32).translate((0, 0, -34 - 0.01))
    part -= cyl(M3_TAP, 40).rotate((90, 0, 0)).translate((0, 20, -18))
    for side in (-1, 1):
        heading = side * angle_deg / 2
        rad = np.radians(heading)
        hole = x_axis(cyl(ROD, 30)).translate((8, 0, 10)).rotate((0, 0, heading))
        part -= hole
        r = 8 + 20
        part -= cyl(M3_TAP, 12).translate((r * np.cos(rad), r * np.sin(rad), 10))
    return part


def write_stl(manifold, name):
    assert manifold.status().name == "NoError" and len(manifold.decompose()) == 1, f"{name}: pieza no solida o separada"
    mesh = manifold.to_mesh()
    verts = np.asarray(mesh.vert_properties)[:, :3].astype(np.float32)
    tris = np.asarray(mesh.tri_verts)
    v0, v1, v2 = verts[tris[:, 0]], verts[tris[:, 1]], verts[tris[:, 2]]
    normals = np.cross(v1 - v0, v2 - v0)
    normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
    record = np.zeros(len(tris), dtype=[("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")])
    record["n"], record["v"] = normals, np.stack([v0, v1, v2], axis=1)
    path = OUT / f"{name}.stl"
    with open(path, "wb") as handle_out:
        handle_out.write(b"Bricohams antenas satelite - bricohams.org".ljust(80, b" "))
        handle_out.write(struct.pack("<I", len(tris)))
        handle_out.write(record.tobytes())
    lo, hi = manifold.bounding_box()[:3], manifold.bounding_box()[3:]
    return {"archivo": f"stl/{name}.stl", "triangulos": int(len(tris)),
            "volumen_cm3": round(manifold.volume() / 1000, 1),
            "medidas_mm": [round(h - l, 1) for l, h in zip(lo, hi)],
            "genero": manifold.genus(), "estado": str(manifold.status())}


def main():
    OUT.mkdir(exist_ok=True)
    results = json.loads(Path(__file__).with_name("resultados.json").read_text(encoding="utf-8"))
    parts = {
        "pinza-elemento": element_clamp(),
        "bloque-excitado": driven_block(),
        "empunadura": handle(),
        "cubo-dipolo-v": v_hub(results["dipolo_v"]["angulo_grados"]),
    }
    report = {name: write_stl(part, name) for name, part in parts.items()}
    Path(__file__).with_name("piezas.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
