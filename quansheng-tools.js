(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const LOGO_MAGIC = Uint8Array.of(70, 52, 72, 87, 78, 76, 71, 79);
  const proto = R.QuanshengConnector.prototype;
  function inspectAssetPack(input) {
    const bytes = R.bytes(input);
    R.assert(bytes.length > 32 && bytes.length <= 0x4000, "Tamano FWA1 fuera de limites.");
    const v = R.view(bytes);
    R.assert(v.getUint32(0, true) === 0x31415746 && v.getUint16(4, true) === 1 &&
      v.getUint16(6, true) === 32 && v.getUint32(8, true) === bytes.length - 32,
    "Cabecera FWA1 no compatible.");
    R.assert(v.getUint32(12, true) === R.crc32(bytes.subarray(32)), "CRC de recursos FWA1 incorrecto.");
    return { buildId: [...bytes.subarray(16, 32)].map(value => value.toString(16).padStart(2, "0")).join(""),
      size: bytes.length, payloadCRC: v.getUint32(12, true) };
  }
  function inspectFirmwarePackage(input) {
    const bytes = R.bytes(input);
    R.assert(bytes.length >= 256 && bytes.length <= 0x1d800 + 0x4000 + 16, "Tamano de firmware fuera de limites.");
    const tail = bytes.length - 16;
    const v = R.view(bytes);
    const packaged = v.getUint32(tail, true) === 0x54415746;
    let image = bytes;
    let pack = null;
    if (packaged) {
      const imageSize = v.getUint32(tail + 4, true);
      const packSize = v.getUint32(tail + 8, true);
      R.assert(imageSize >= 256 && imageSize <= 0x1d800 && packSize > 32 &&
        imageSize + packSize === tail && R.crc32(bytes.subarray(0, tail)) === v.getUint32(tail + 12, true),
      "Disposicion o CRC FWAT incorrectos.");
      image = bytes.subarray(0, imageSize);
      pack = bytes.subarray(imageSize, tail);
      inspectAssetPack(pack);
    }
    R.assert(image.length <= 0x1d800, "Imagen interna demasiado grande.");
    const vectors = R.view(image);
    const stack = vectors.getUint32(0, true);
    const reset = vectors.getUint32(4, true);
    R.assert(stack >= 0x20000000 && stack <= 0x20004000 && !(stack & 3) &&
      (reset & 1) && reset >= 0x08002801 && reset < 0x08002800 + image.length, "Vectores PY32 invalidos.");
    const text = new TextDecoder("ascii").decode(image);
    const version = text.match(/F4HWN[^\x00\r\n]{0,12}?v([67]\.\d+\.\d+)(?![-\w.])/i);
    R.assert(version && (version[1].startsWith("7.") ? packaged : !packaged),
      "Solo BIN v6 sin recursos o paquete v7 FWAT/FWA1 completo; version no reconocida.");
    R.assert(!/SA818/i.test(text), "Variante SA818 no admitida para esta radio.");
    if (version[1].startsWith("6.")) R.inspectQuanshengSlotImage(image);
    return { image: image.slice(), pack: pack?.slice() || null, version: version[1],
      assets: pack ? inspectAssetPack(pack) : null };
  }
  proto.assetInfoRaw = async function () {
    const response = await this.exchange(0x0750, Uint8Array.of(255), 0x0751, 5000);
    R.assert(response.length >= 52 && response[0] <= 4 && response[2] === response[0] &&
      response[3] <= 1, "Respuesta de recursos v7 no valida o slot activo desconocido.");
    return { slot: response[0], status: response[1], loaded: response[3] === 1,
      buildId: [...response.subarray(36, 52)].map(value => value.toString(16).padStart(2, "0")).join("") };
  };
  proto.installFirmwareAssets = async function (input, permit, acknowledgement) {
    R.assertBackup(this, permit);
    const pack = R.bytes(input).slice();
    const manifest = inspectAssetPack(pack);
    R.assert(acknowledgement === `RECURSOS ${this.model}`, "Confirma la sustitucion de recursos del firmware activo.");
    R.assert(/F4HWN.*v7\./i.test(this.info?.firmware || ""), "Recursos externos requieren firmware v7 activo.");
    await R.verifyBackup(this, permit);
    return this.run("Instalar recursos de firmware v7", async () => {
      const info = await this.assetInfoRaw();
      R.assert(info.buildId === manifest.buildId, "Build ID distinto al firmware activo; no se borran recursos.");
      const authorize = () => {
        const data = new Uint8Array(6); data[0] = info.slot;
        R.view(data).setUint32(2, this.timestamp, true);
        return data;
      };
      const check = response => R.assert(response.length === 2 && response[0] === info.slot &&
        response[1] === 0, "Operacion de recursos rechazada por firmware.");
      try {
        check(await this.exchange(0x0752, authorize(), 0x0753, 35000));
        const write = async (offset, bytes) => {
          const data = new Uint8Array(12 + bytes.length);
          data[0] = info.slot;
          R.view(data).setUint32(2, offset, true);
          R.view(data).setUint16(6, bytes.length, true);
          R.view(data).setUint32(8, this.timestamp, true);
          data.set(bytes, 12);
          for (let attempt = 0; ; attempt++) {
            try { check(await this.exchange(0x0754, data, 0x0755, 5000, true)); break; }
            catch (error) {
              if (error.code !== "READ_TIMEOUT" || this.transport.error || attempt >= 4) throw error;
              this.progress(offset / pack.length, `Reintentando bloque de recursos identico (${attempt + 1}/4).`);
            }
          }
        };
        for (let offset = 32; offset < pack.length; offset += 128) {
          await write(offset, pack.subarray(offset, offset + 128));
          this.progress(Math.min(offset + 128, pack.length) / pack.length, "Escribiendo recursos; cabecera pendiente");
        }
        await write(0, pack.subarray(0, 32));
        check(await this.exchange(0x0756, Uint8Array.of(info.slot), 0x0757, 10000));
        const after = await this.assetInfoRaw();
        R.assert(after.slot === info.slot && after.buildId === manifest.buildId && after.status === 0 && after.loaded,
          "Recursos no aparecen validos y cargados despues de verificar.");
        return { ...manifest, slot: info.slot, firmwareValidated: true, physicalBootTested: false };
      } finally { R.revokeBackup(this); }
    });
  };
  proto.requestReboot = async function (permit, acknowledgement) {
    R.assertBackup(this, permit);
    R.assert(acknowledgement === "REINICIAR RADIO", "Confirma el reinicio de la radio.");
    await R.verifyBackup(this, permit);
    return this.run("Solicitar reinicio", async () => {
      try {
        await this.transport.write(R.quanshengPacket(0x05dd, new Uint8Array()));
        return { requested: true, acknowledged: false, manualBootPending: true };
      } finally {
        R.revokeBackup(this);
        this.connected = false;
      }
    });
  };
  function logoBitmap(bytes) {
    R.bytes(bytes, 1032);
    R.assert(R.equal(bytes.subarray(0, 8), LOGO_MAGIC), "No hay un logo F4HWNLGO valido en la radio o el archivo.");
    return bytes.subarray(8);
  }
  function packLogo(rgba) {
    R.bytes(rgba, 128 * 64 * 4);
    const result = new Uint8Array(1032);
    result.set(LOGO_MAGIC);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 128; x++) {
        const index = (y * 128 + x) * 4;
        const alpha = rgba[index + 3] / 255;
        const brightness = (rgba[index] * 299 + rgba[index + 1] * 587 + rgba[index + 2] * 114) / 1000;
        if (brightness * alpha + 255 * (1 - alpha) < 128) {
          result[8 + (y >> 3) * 128 + x] |= 1 << (y & 7);
        }
      }
    }
    return result;
  }
  function unpackLogo(bytes) {
    const bitmap = logoBitmap(bytes);
    const pixels = new Uint8Array(128 * 64 * 4);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 128; x++) {
        const index = (y * 128 + x) * 4;
        const value = bitmap[(y >> 3) * 128 + x] & (1 << (y & 7)) ? 0 : 255;
        pixels.set([value, value, value, 255], index);
      }
    }
    return pixels;
  }
  proto.readProtectedLogicalRaw = async function (address, length) {
    R.assert(address === 0xb000 && length === 512 || address === 0xc000 && length === 1032,
      "Rango de datos protegidos no permitido.");
    const result = new Uint8Array(length);
    for (let offset = 0; offset < length; offset += 128) {
      const size = Math.min(128, length - offset);
      const request = new Uint8Array(8);
      R.view(request).setUint16(0, address + offset, true);
      request[2] = size;
      R.view(request).setUint32(4, this.timestamp, true);
      const response = await this.exchange(0x051b, request);
      R.assert(response.length === size + 4 && R.view(response).getUint16(0, true) === address + offset &&
        response[2] === size, "Respuesta de datos protegidos incorrecta.");
      result.set(response.subarray(4), offset);
    }
    return result;
  };
  proto.writeProtectedLogicalRaw = async function (address, bytes) {
    R.assert(address === 0xb000 && bytes.length === 512 || address === 0xc000 && bytes.length === 1032,
      "Rango de escritura protegida no permitido.");
    const offsets = [];
    for (let offset = address === 0xc000 ? 8 : 0; offset < bytes.length; offset += 8) offsets.push(offset);
    if (address === 0xc000) offsets.push(0);
    for (const [index, offset] of offsets.entries()) {
      const request = new Uint8Array(16);
      R.view(request).setUint16(0, address + offset, true);
      request[2] = 8;
      request[3] = 1;
      R.view(request).setUint32(4, this.timestamp, true);
      request.set(bytes.subarray(offset, offset + 8), 8);
      const response = await this.exchange(0x051d, request);
      R.assert(response.length === 2 && R.view(response).getUint16(0, true) === address + offset,
        "Escritura de datos protegidos rechazada.");
      this.progress((index + 1) / offsets.length, address === 0xc000 ? "Escribiendo logo" : "Restaurando calibracion propia");
    }
    R.assert(R.equal(await this.readProtectedLogicalRaw(address, bytes.length), bytes),
      "La relectura de datos protegidos no coincide. Conserva el respaldo y no continues.");
  };
  proto.readBootLogo = function () {
    return this.run("Leer logo de arranque", async () => {
      const bytes = await this.readProtectedLogicalRaw(0xc000, 1032);
      logoBitmap(bytes);
      return bytes;
    });
  };
  proto.writeBootLogo = async function (bytes, permit) {
    R.assertBackup(this, permit);
    bytes = R.bytes(bytes, 1032).slice();
    logoBitmap(bytes);
    await R.verifyBackup(this, permit);
    return this.run("Instalar logo de arranque", async () => {
      const calibration = await this.readCalibrationRaw();
      const configuration = await this.readConfigurationRaw();
      await this.writeProtectedLogicalRaw(0xc000, bytes);
      R.assert(R.equal(await this.readCalibrationRaw(), calibration) &&
        R.equal(await this.readConfigurationRaw(), configuration),
      "Cambios fuera del logo detectados. Conserva el respaldo; no continues.");
    });
  };
  proto.restoreCalibration = async function (bytes, permit, acknowledgement) {
    R.assertBackup(this, permit);
    bytes = R.bytes(bytes, 512).slice();
    R.validateCalibration(bytes);
    R.assert(acknowledgement === "RESTAURAR CALIBRACION DE ESTA RADIO",
      "Confirma expresamente que la calibracion pertenece a esta unidad.");
    await R.verifyBackup(this, permit);
    return this.run("Restaurar calibracion", async () => {
      const configuration = await this.readConfigurationRaw();
      const logo = await this.readProtectedLogicalRaw(0xc000, 1032);
      await this.writeProtectedLogicalRaw(0xb000, bytes);
      R.assert(R.equal(await this.readConfigurationRaw(), configuration) &&
        R.equal(await this.readProtectedLogicalRaw(0xc000, 1032), logo),
      "Cambios fuera de calibracion detectados. Conserva el respaldo; no continues.");
      R.revokeBackup(this);
    });
  };
  proto.eraseFlashSectorRaw = async function (address) {
    R.assert(Number.isInteger(address) && address >= 0 && address < 0x200000 &&
      address % 4096 === 0 && address !== 0x10000, "Sector Flash protegido o invalido.");
    const request = new Uint8Array(8);
    R.view(request).setUint32(0, address, true);
    R.view(request).setUint32(4, this.timestamp, true);
    const response = await this.exchange(0x073a, request, 0x073b, 35000);
    R.assert(response.length === 5 && R.view(response).getUint32(0, true) === address &&
      response[4] === 0, "Borrado de sector Flash rechazado.");
  };
  proto.writeFlashChunkRaw = async function (address, bytes) {
    R.bytes(bytes);
    R.assert(Number.isInteger(address) && address >= 0 && bytes.length > 0 && bytes.length <= 128 &&
      address + bytes.length <= 0x200000 && (address >= 0x11000 || address + bytes.length <= 0x10000) &&
      (address & 255) + bytes.length <= 256, "Bloque Flash protegido o invalido.");
    const request = new Uint8Array(10 + bytes.length);
    R.view(request).setUint32(0, address, true);
    R.view(request).setUint16(4, bytes.length, true);
    R.view(request).setUint32(6, this.timestamp, true);
    request.set(bytes, 10);
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await this.exchange(0x073c, request, 0x073d, 5000, true);
        R.assert(response.length === 7 && R.view(response).getUint32(0, true) === address &&
          R.view(response).getUint16(4, true) === bytes.length && response[6] === 0, "Escritura Flash rechazada.");
        return;
      } catch (error) {
        if (error.code !== "READ_TIMEOUT" || this.transport.error || attempt >= 4) throw error;
        this.progress(0, `Reintentando bloque Flash identico (${attempt + 1}/4).`);
        await new Promise(resolve => setTimeout(resolve, 60));
      }
    }
  };
  proto.readExternalFlash = function () {
    R.assert(!this.info?.legacyReadOnly, "Flash fisica no disponible en el firmware activo. Arranca Labs con acceso Flash.");
    return this.run("Backup Flash externa", async () => {
      const flash = await this.readFlashRaw(value => this.progress(value, "Leyendo Flash externa 2 MiB"));
      await this.verifyFlashRaw(flash);
      return flash;
    });
  };
  proto.restoreExternalFlash = async function (bytes, permit, acknowledgement) {
    R.assertBackup(this, permit);
    bytes = R.bytes(bytes, 0x200000).slice();
    R.quanshengBaseFromFlash(bytes);
    R.assert(acknowledgement === "RESTAURAR FLASH DE ESTA RADIO",
      "Confirma la sustitucion de Flash de esta unidad.");
    await R.verifyBackup(this, permit);
    return this.run("Restaurar Flash externa", async () => {
      await this.restoreFlashImageRaw(bytes);
      R.revokeBackup(this);
    });
  };
  proto.restoreFlashImageRaw = async function (bytes) {
      const protectedSector = new Uint8Array(4096);
      for (let offset = 0; offset < 4096; offset += 128) {
        protectedSector.set(await this.readFlashBlockRaw(0x10000 + offset, 128), offset);
      }
      const expected = bytes.slice();
      expected.set(protectedSector, 0x10000);
      const sectors = [];
      for (let address = 0; address < bytes.length; address += 4096) {
        if (![0x10000, 0x100000, 0x101000].includes(address)) sectors.push(address);
      }
      sectors.push(0x100000, 0x101000);
      for (const [index, address] of sectors.entries()) {
        const sector = bytes.subarray(address, address + 4096);
        const crc = R.crc32(sector);
        if (await this.flashRangeCRCRaw(address, 4096) !== crc) {
          await this.eraseFlashSectorRaw(address);
          for (let offset = 0; offset < 4096; offset += 128) {
            const chunk = sector.subarray(offset, offset + 128);
            if (!chunk.every(value => value === 255)) await this.writeFlashChunkRaw(address + offset, chunk);
          }
          R.assert(await this.flashRangeCRCRaw(address, 4096) === crc,
            `Relectura CRC del sector 0x${address.toString(16)} distinta. No reinicies ni continues.`);
        }
        this.progress((index + 1) / sectors.length, "Restaurando Flash; calibracion protegida");
      }
      await this.verifyFlashRaw(expected);
  };
  function mountQuanshengTools({ action, download, log, getConnector, getPermit }) {
    const panel = document.createElement("section");
    panel.id = "qs-native-tools";
    panel.className = "panel operations firmware-panel";
    panel.innerHTML = `<h2>Calibracion, logo y Flash externa</h2>
      <p>Herramientas nativas F4HWN v6.x. Toda escritura exige respaldo completo de esta sesion y relectura. Restore de calibracion o Flash revoca el permiso: desconecta y crea una copia nueva despues. Ninguna accion reinicia la radio.</p>
      <h3>Calibracion propia (512 bytes)</h3>
      <p>Nunca uses calibracion de otra unidad. Un archivo BIN no acredita de que radio procede; verifica tus copias e identidad fisica antes de restaurar.</p>
      <label for="qs-calibration-file">Copia BIN de calibracion de esta radio</label><input id="qs-calibration-file" type="file" accept=".bin,.dat">
      <div class="operation-buttons"><button id="qs-calibration-backup" data-connected type="button" class="button secondary" disabled>Backup calibracion BIN + manifiesto</button><button id="qs-calibration-restore" data-write type="button" class="button secondary" disabled>Restore calibracion propia</button></div>
      <p id="qs-calibration-info" role="status">Sin archivo de calibracion seleccionado.</p>
      <h3>Logo de arranque</h3>
      <p>PNG de 128 x 64 pixels o BIN F4HWNLGO (1032 bytes). El PNG se convierte a monocromo; transparencia blanca. No cambia el modo de bienvenida ni el logo embebido en el firmware.</p>
      <label for="qs-logo-file">Logo PNG o BIN</label><input id="qs-logo-file" type="file" accept=".png,.bin">
      <canvas id="qs-logo-preview" class="qs-live-screen" width="128" height="64" role="img" aria-label="Vista previa del logo de arranque"></canvas>
      <div class="operation-buttons"><button id="qs-logo-read" data-connected type="button" class="button secondary" disabled>Leer y descargar logo BIN / PNG</button><button id="qs-logo-write" data-write type="button" class="button secondary" disabled>Instalar logo y verificar</button></div>
      <p id="qs-logo-info" role="status">Sin logo preparado.</p>
      <h3>Backup y Restore Flash externa (2 MiB)</h3>
      <p>Solo firmware con acceso fisico y CRC. Backup puede tardar 10-20 minutos a 38400 baudios. Restore reemplaza canales de todos los bancos, slots, apps y registro RF, pero conserva el sector completo de calibracion de esta unidad. No restaura firmware interno ni bootloader. No es volver a stock.</p>
      <label for="qs-flash-file">Backup Flash externa BIN de esta radio (2097152 bytes)</label><input id="qs-flash-file" type="file" accept=".bin">
      <div class="operation-buttons"><button id="qs-flash-backup" data-connected type="button" class="button secondary" disabled>Backup Flash BIN + manifiesto</button><button id="qs-flash-restore" data-write type="button" class="button secondary" disabled>Restore Flash externa y verificar</button></div>
      <p id="qs-flash-info" role="status">Sin backup Flash seleccionado.</p>`;
    panel.insertAdjacentHTML("beforeend", `<hr><h3>Recursos externos F4HWN v7</h3>
      <p>Solo para el firmware activo v7: verifica FWA1, CRC y Build ID antes de borrar. No instala en otros slots ni acepta recursos de otra compilacion. Requiere respaldo completo nuevo despues del DFU; al terminar revoca permisos. Un ACK no acredita la prueba fisica de pantalla o arranque.</p>
      <label for="qs-assets-file">Paquete completo FWAT v7 o recursos FWA1</label><input id="qs-assets-file" type="file" accept=".bin">
      <div class="operation-buttons"><button id="qs-assets-check" class="button secondary" type="button">Comprobar recursos sin escribir</button><button id="qs-assets-install" data-write class="button secondary" type="button" disabled>Instalar recursos del firmware activo</button></div>
      <p id="qs-assets-status" role="status">Sin recursos comprobados.</p>`);
    document.getElementById("qs-rf-panel").before(panel);
    const $ = id => document.getElementById(id);
    let logo = null;
    const assetFile = async () => {
      const file = $("qs-assets-file").files[0];
      R.assert(file && file.size <= 0x1d800 + 0x4000 + 16, "Selecciona paquete v7 o FWA1 dentro de limites.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pack = bytes.length >= 4 && R.view(bytes).getUint32(0, true) === 0x31415746 ?
        bytes : inspectFirmwarePackage(bytes).pack;
      R.assert(pack, "El archivo no contiene recursos externos.");
      return { pack, manifest: inspectAssetPack(pack) };
    };
    const attach = (id, label, operation) => $(id).addEventListener("click", () => action(label, operation));
    attach("qs-assets-check", "Comprobar recursos", async () => {
      const { pack, manifest } = await assetFile();
      $("qs-assets-status").textContent = `${pack.length} bytes, CRC correcto, Build ID ${manifest.buildId}, SHA-256 ${await R.sha256(pack)}. Sin escritura; compatibilidad pendiente de consultar radio v7.`;
    });
    attach("qs-assets-install", "Instalar recursos v7", async () => {
      const { pack, manifest } = await assetFile();
      const word = `RECURSOS ${getConnector().model}`;
      if (root.prompt(`Sustituiras recursos del firmware activo si coincide Build ID ${manifest.buildId}. Una interrupcion puede dejar pantalla sin recursos. Escribe ${word}.`) !== word) {
        log("Instalacion de recursos cancelada."); return;
      }
      const result = await getConnector().installFirmwareAssets(pack, getPermit(), word);
      $("qs-assets-status").textContent = `Recursos validados y cargados por firmware en slot ${result.slot}. No equivale a prueba fisica. Reconecta y respalda de nuevo.`;
    });
    const readFile = async (id, size) => {
      const file = $(id).files[0];
      R.assert(file && file.size === size, `Selecciona un archivo de ${size} bytes.`);
      return new Uint8Array(await file.arrayBuffer());
    };
    const exportBinary = async (name, bytes, scope) => {
      const sha256 = await R.sha256(bytes);
      download(name, bytes);
      download(`${name}.manifest.json`, JSON.stringify({
        format: "quansheng-component-backup", version: 1, createdAt: new Date().toISOString(),
        model: getConnector().model, firmware: getConnector().info?.firmware,
        component: scope, size: bytes.length, sha256, backupSubstitute: false
      }, null, 2), "application/json");
      log(`${scope}: descarga BIN y manifiesto solicitada. SHA-256 ${sha256}. Comprueba Descargas.`);
    };
    const preview = bytes => {
      const context = $("qs-logo-preview").getContext("2d");
      const image = context.createImageData(128, 64);
      image.data.set(unpackLogo(bytes));
      context.putImageData(image, 0, 0);
    };
    attach("qs-calibration-backup", "Backup calibracion", async () => {
      const bytes = await getConnector().readCalibration();
      R.validateCalibration(bytes);
      await exportBinary(`quansheng-calibration-${Date.now()}.bin`, bytes, "calibration");
    });
    attach("qs-calibration-restore", "Restore calibracion", async () => {
      const bytes = await readFile("qs-calibration-file", 512);
      R.validateCalibration(bytes);
      const sha256 = await R.sha256(bytes);
      const word = "RESTAURAR CALIBRACION DE ESTA RADIO";
      if (root.prompt(`Se sustituyen los parametros RF especificos de tu unidad. Archivo SHA-256 ${sha256}. Una calibracion ajena puede causar funcionamiento incorrecto. Escribe ${word}.`) !== word) {
        log("Restore de calibracion cancelado.");
        return;
      }
      await getConnector().restoreCalibration(bytes, getPermit(), word);
      $("qs-calibration-info").textContent = `Calibracion restaurada y releida. SHA-256 ${sha256}. Desconecta y respalda de nuevo.`;
    });
    $("qs-calibration-file").addEventListener("change", () => action("Comprobar calibracion", async () => {
      const bytes = await readFile("qs-calibration-file", 512);
      R.validateCalibration(bytes);
      $("qs-calibration-info").textContent = `512 bytes; SHA-256 ${await R.sha256(bytes)}. Origen fisico no acreditado por el archivo.`;
    }));
    $("qs-logo-file").addEventListener("change", () => action("Preparar logo", async () => {
      logo = null;
      $("qs-logo-info").textContent = "Validando logo...";
      const file = $("qs-logo-file").files[0];
      R.assert(file && file.size <= 1024 * 1024, "Selecciona PNG de 128 x 64 o BIN valido (maximo 1 MiB).");
      if (/\.bin$/i.test(file.name)) {
        logo = await readFile("qs-logo-file", 1032);
        logoBitmap(logo);
      } else {
        R.assert(/\.png$/i.test(file.name), "Solo PNG o BIN para el logo.");
        const bitmap = await root.createImageBitmap(file);
        try {
          R.assert(bitmap.width === 128 && bitmap.height === 64, "El PNG debe medir exactamente 128 x 64.");
          const canvas = document.createElement("canvas");
          canvas.width = 128; canvas.height = 64;
          const context = canvas.getContext("2d");
          context.drawImage(bitmap, 0, 0);
          logo = packLogo(new Uint8Array(context.getImageData(0, 0, 128, 64).data));
        } finally { bitmap.close(); }
      }
      preview(logo);
      $("qs-logo-info").textContent = `Logo preparado, sin escribir. SHA-256 ${await R.sha256(logo)}.`;
    }));
    attach("qs-logo-read", "Leer logo de arranque", async () => {
      logo = await getConnector().readBootLogo();
      preview(logo);
      await exportBinary(`quansheng-logo-${Date.now()}.bin`, logo, "boot-logo");
      const canvas = $("qs-logo-preview");
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      R.assert(blob, "No se pudo generar PNG del logo.");
      download(`quansheng-logo-${Date.now()}.png`, blob, "image/png");
      $("qs-logo-info").textContent = "Logo leido y preparado. Descargas BIN, manifiesto y PNG solicitadas.";
    });
    attach("qs-logo-write", "Instalar logo de arranque", async () => {
      R.assert(logo, "Prepara o lee un logo antes de instalar.");
      if (root.prompt("Se reemplazara el logo externo; no cambia la calibracion ni canales. Escribe INSTALAR LOGO.") !== "INSTALAR LOGO") {
        log("Instalacion de logo cancelada.");
        return;
      }
      await getConnector().writeBootLogo(logo, getPermit());
      $("qs-logo-info").textContent = "Logo instalado y releido; calibracion y configuracion sin cambios.";
    });
    attach("qs-flash-backup", "Backup Flash externa", async () => {
      const bytes = await getConnector().readExternalFlash();
      await exportBinary(`quansheng-external-flash-${Date.now()}.bin`, bytes, "external-flash");
    });
    $("qs-flash-file").addEventListener("change", () => action("Comprobar Flash externa", async () => {
      const bytes = await readFile("qs-flash-file", 0x200000);
      R.quanshengBaseFromFlash(bytes);
      $("qs-flash-info").textContent = `2 MiB, Main FMB1 con CRC correcto; SHA-256 ${await R.sha256(bytes)}. No acredita que pertenezca a esta radio.`;
    }));
    attach("qs-flash-restore", "Restore Flash externa", async () => {
      const bytes = await readFile("qs-flash-file", 0x200000);
      R.quanshengBaseFromFlash(bytes);
      const word = "RESTAURAR FLASH DE ESTA RADIO";
      if (root.prompt(`Se reemplazaran canales de todos los bancos, slots, apps, ajustes y registro RF. Se conserva el sector de calibracion actual. No apagues ni desconectes. SHA-256 ${await R.sha256(bytes)}. Escribe ${word}.`) !== word) {
        log("Restore Flash cancelado.");
        return;
      }
      await getConnector().restoreExternalFlash(bytes, getPermit(), word);
      $("qs-flash-info").textContent = "Flash restaurada y verificada por CRC; sector de calibracion preservado. Desconecta y crea nuevo respaldo.";
    });
  }
  Object.assign(R, { packQuanshengLogo: packLogo, unpackQuanshengLogo: unpackLogo, mountQuanshengTools,
    inspectQuanshengAssetPack: inspectAssetPack, inspectQuanshengFirmwarePackage: inspectFirmwarePackage });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
