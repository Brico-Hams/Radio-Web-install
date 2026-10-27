# Antenas de satélite Bricohams

Diseños propios de Bricohams: una Yagi bibanda de mano 2 m/70 cm y un dipolo
en V horizontal de 2 m. Incluye cuatro piezas imprimibles en `stl/`.

- `mom.py`: solucionador de hilos por método de momentos.
- `disenar.py`: optimización y verificación; escribe `resultados.json`.
- `generar_stl.py`: genera las piezas STL; escribe `piezas.json`.
- `vistas.py`: genera los planos SVG en `docs/atlas`.

Documentación, dimensiones, montaje y límites:
[docs/ANTENAS-SATELITE.md](../../docs/ANTENAS-SATELITE.md).

**Diseño simulado, no construido ni medido.** Ajusta siempre las antenas con
un analizador antes de transmitir.

Autores: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF y Pedro
Roca, de Bricohams. Más información en bricohams.org y bricohams.com.
