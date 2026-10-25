#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  printf '%s\n' "Ejecuta este instalador como root: su -c './install.sh'" >&2
  exit 1
fi
if [ ! -f ./app/server.cjs ]; then
  printf '%s\n' "No se encuentra ./app/server.cjs. Extrae primero el paquete descargado." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) < 22 ? 1 : 0)' >/dev/null 2>&1; then
  pkg install -y node22
fi

install_root=/usr/local/libexec/bricohams-radio-workspace
install -d "$install_root/app"
cp -R ./app/. "$install_root/app/"
install -m 755 ./bricohams-radio /usr/local/bin/bricohams-radio
printf '%s\n' "Instalado. Ejecuta bricohams-radio como usuario normal."
