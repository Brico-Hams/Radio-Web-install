(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const REVISION = "e7aa946f6de002559e1aaf3f91765db7fc2ed567";
  const BASE = `https://raw.githubusercontent.com/armel/armel.github.io/${REVISION}/uvstudio/assets/factory/`;
  const FACTORY = Object.freeze({
    "UV-K1": Object.freeze({
      flash: "K1_External_Flash_Factory_Reconstructed.bin",
      flashSHA256: "a2383aa050dc0963fee7b7c99692b8330d9455a6bbb2bb7498b2bba4174c9d55",
      firmware: "quansheng.k1.stock.firmware.v7.03.01.bin", size: 71268,
      firmwareSHA256: "55ec0daffc5668bdb41dcc118475d7e6e23ad953d70f57a9bca64a6202734ba0",
      bootloader: /^(?:7\.02\.02|7\.03\.\d{2})$/
    }),
    "UV-K5-V3": Object.freeze({
      flash: "K5V3_External_Flash_Factory_Reconstructed.bin",
      flashSHA256: "b85c8066a1b0885d1cf3e430533f45c9c8ea91c8b936a94aba99221fd1bff79b",
      firmware: "quansheng.k5v3.stock.firmware.v7.00.11.bin", size: 71712,
      firmwareSHA256: "f4e5264a6f9a5436a6c75f7b217c60ba002cec04928f247392b9968c5c9458cb",
      bootloader: /^7\.00\.07$/
    })
  });
  const stages = new WeakMap();
  async function verifyFactoryFiles(model, flash, firmware) {
    const target = FACTORY[model];
    R.assert(target, "Modelo de fabrica no compatible.");
    R.bytes(flash, 0x200000);
    R.bytes(firmware, target.size);
    const [flashSHA256, firmwareSHA256] = await Promise.all([R.sha256(flash), R.sha256(firmware)]);
    R.assert(flashSHA256 === target.flashSHA256 && firmwareSHA256 === target.firmwareSHA256,
      "Los archivos stock no coinciden con el SHA-256 fijado para este modelo.");
    return { model, flashSHA256, firmwareSHA256, revision: REVISION };
  }
  R.QuanshengConnector.prototype.prepareFactoryRestore = async function (flash, firmware, permit, acknowledgement) {
    R.assertBackup(this, permit);
    flash = R.bytes(flash).slice();
    firmware = R.bytes(firmware).slice();
    await verifyFactoryFiles(this.model, flash, firmware);
    R.assert(acknowledgement === `FABRICA ${this.model}`,
      "Confirma expresamente el borrado de slots, bancos, apps y registros para volver a stock.");
    await R.verifyBackup(this, permit);
    return this.run("Restaurar Flash de fabrica (paso 1/2)", async () => {
      await this.restoreFlashImageRaw(flash);
      R.revokeBackup(this);
      const stage = Object.freeze({});
      stages.set(stage, { model: this.model, firmware, completed: false,
        acknowledgement: `DFU ${this.model}`, sha256: FACTORY[this.model].firmwareSHA256 });
      return stage;
    });
  };
  R.QuanshengConnector.prototype.prepareMainFirmwareDFU = async function (firmware, permit, acknowledgement) {
    R.assertBackup(this, permit);
    R.assert(FACTORY[this.model], "Modelo DFU no compatible.");
    const parsed = R.inspectQuanshengFirmwarePackage(R.bytes(firmware));
    firmware = parsed.image;
    R.assert(acknowledgement === `FIRMWARE PRINCIPAL ${this.model}`,
      "Confirma la sustitucion del firmware interno; no es instalar un slot.");
    await R.verifyBackup(this, permit);
    const sha256 = await R.sha256(firmware);
    const stage = Object.freeze({});
    stages.set(stage, { model: this.model, firmware, completed: false,
      acknowledgement: `DFU PRINCIPAL ${this.model}`, sha256 });
    return { stage, sha256, size: firmware.length, assets: parsed.assets };
  };
  class QuanshengFactoryDFU extends R.QuanshengConnector {
    async flashFactory(stage, acknowledgement) {
      const receipt = stages.get(stage);
      R.assert(receipt && !receipt.completed && receipt.model === this.model,
        "Falta el paso Flash stock verificado para este modelo.");
      R.assert(acknowledgement === receipt.acknowledgement, "Confirma el paso DFU de esta radio.");
      const target = FACTORY[receipt.model];
      R.assert(await R.sha256(receipt.firmware) === receipt.sha256, "La imagen preparada ha cambiado.");
      return this.run("Programar firmware interno por DFU", async () => {
        const info = await this.receiveResponse(0x0518, 10000);
        R.assert(info.length >= 32, "Identificacion DFU incompleta.");
        const version = R.text(info.subarray(16, 32));
        R.assert(target.bootloader.test(version),
          `Bootloader ${version} no reconocido para ${receipt.model}; no se escribe.`);
        for (let index = 0; index < 3; index++) {
          if (index) {
            const repeated = await this.receiveResponse(0x0518, 5000);
            R.assert(repeated.length >= 32 && R.equal(repeated.subarray(0, 32), info.subarray(0, 32)),
              "Identificacion DFU inconsistente; no se escribe.");
          }
          await this.transport.write(R.quanshengPacket(0x0530, new TextEncoder().encode(version.slice(0, 4))));
        }
        const timestamp = Date.now() >>> 0;
        const count = Math.ceil(receipt.firmware.length / 256);
        for (let page = 0; page < count; page++) {
          const request = new Uint8Array(268);
          R.view(request).setUint32(0, timestamp, true);
          R.view(request).setUint16(4, page, true);
          R.view(request).setUint16(6, count, true);
          request.set(receipt.firmware.subarray(page * 256, (page + 1) * 256), 12);
          for (let attempt = 0; ; attempt++) {
            try {
              await this.transport.write(R.quanshengPacket(0x0519, request));
              const response = await this.receiveResponse(0x051a, 5000, true);
              R.assert(response.length === 8 && R.view(response).getUint16(4, true) === page &&
                R.view(response).getUint16(6, true) === 0, `DFU: pagina ${page + 1} rechazada o respuesta fuera de secuencia.`);
              break;
            } catch (error) {
              if (error.code !== "READ_TIMEOUT" || this.transport.error || attempt >= 3) throw error;
              this.progress(page / count, `DFU: reintentando la misma pagina ${page + 1} (${attempt + 1}/3).`);
            }
          }
          this.progress((page + 1) / count, `DFU: pagina ${page + 1}/${count} confirmada`);
        }
        receipt.completed = true;
        return { model: receipt.model, bootloader: version, pages: count,
          firmwareSHA256: receipt.sha256, readBackAvailable: false, manualBootPending: true };
      });
    }
    async openFactory(model) {
      R.assert(FACTORY[model], "Modelo DFU no compatible.");
      this.model = model;
      await this.transport.open(38400);
      this.connected = true;
    }
  }
  function mountFactoryRestore({ model, action, log, getConnector, getPermit, onProgress }) {
    const panel = document.createElement("section");
    panel.className = "panel operations";
    panel.id = "qs-factory-native";
    panel.innerHTML = `<h2>Restablecer de fabrica: asistente nativo</h2>
      <p>Flujo destructivo de dos pasos, solo UV-K1 o UV-K5 V3. Exige respaldo completo de la conexion actual. El paso 1 reemplaza Flash externa (slots, todos los bancos, apps y registro RF), conservando el sector de calibracion. El paso 2 graba stock por DFU. No cierres esta pagina entre pasos.</p>
      <p>No se redistribuyen imagenes stock aqui. Descarga los dos archivos de la revision oficial fijada y cargalos juntos; se rechazan otros hashes/modelos antes de cualquier borrado.</p>
      <div class="operation-buttons"><a id="qs-factory-flash-source" class="button secondary" target="_blank" rel="noopener noreferrer">Descargar Flash stock oficial</a><a id="qs-factory-firmware-source" class="button secondary" target="_blank" rel="noopener noreferrer">Descargar firmware stock oficial</a></div>
      <label for="qs-factory-files">Selecciona los dos BIN stock (Flash externa + firmware interno)</label><input id="qs-factory-files" type="file" accept=".bin" multiple>
      <div class="operation-buttons"><button id="qs-factory-verify" class="button secondary" type="button">Verificar archivos stock</button><button id="qs-factory-prepare" data-write class="button secondary" type="button" disabled>1. Restaurar Flash stock y verificar</button><button id="qs-factory-dfu" class="button secondary" type="button" disabled>2. Conectar en DFU y grabar stock</button></div>
      <p id="qs-factory-native-status" role="status">Selecciona el modelo exacto. No se ha iniciado ninguna restauracion.</p>`;
    panel.insertAdjacentHTML("beforeend", `<hr><h3>Firmware principal / DFU Bricohams</h3>
      <p>Protocolo DFU PY32 propio: BIN F4HWN v6.x o paquete v7 FWAT/FWA1 completo, imagen interna hasta 118 KiB. Nunca UV-K5 V1 ni stock arbitrario. SHA-256 y estructura no acreditan autor ni compatibilidad fisica. En v7 es obligatorio instalar los recursos del mismo paquete tras arrancar y crear un respaldo nuevo.</p>
      <p>Exige respaldo completo de esta conexion y confirmacion literal. Reemplaza firmware interno; no sincroniza Main externo, no cambia de slot ni SetCfg y no borra canales/calibracion. El multiboot puede restaurar otra imagen al arrancar: revisa el inventario y comprueba el arranque manual. No garantiza rollback ni recuperacion del estado transitorio.</p>
      <label for="qs-main-firmware-file">Firmware principal BIN v6 o paquete v7</label><input id="qs-main-firmware-file" type="file" accept=".bin">
      <button id="qs-main-firmware-prepare" data-write class="button secondary" type="button" disabled>Preparar firmware principal y bloquear sesion</button>
      <p id="qs-main-firmware-status" role="status">Sin firmware preparado. No se ejecuta DFU automaticamente.</p>
      <p>Tras preparar, desconecta aqui, entra en DFU manteniendo PTT al encender y usa el boton del paso 2. No cierres esta pagina ni cambies de radio.</p>`);
    document.getElementById("qs-rf-panel").before(panel);
    const $ = id => document.getElementById(id);
    let verified = null;
    let stage = null;
    let stageModel = null;
    let factoryStarted = false;
    let mainFirmware = false;
    let mainAssets = null;
    const refresh = () => {
      const target = FACTORY[model.value];
      for (const [id, name] of [["qs-factory-flash-source", target?.flash], ["qs-factory-firmware-source", target?.firmware]]) {
        $(id).hidden = !target;
        if (name) $(id).href = BASE + name;
        else $(id).removeAttribute("href");
      }
      verified = null;
    };
    model.addEventListener("change", refresh);
    $("qs-factory-files").addEventListener("change", () => {
      verified = null;
      $("qs-factory-native-status").textContent = "Archivos cambiados: vuelve a verificar antes de restaurar.";
    });
    const attach = (id, label, fn) => $(id).addEventListener("click", () => action(label, fn));
    attach("qs-main-firmware-prepare", "Preparar firmware principal", async () => {
      R.assert(!factoryStarted, "Ya hay una operacion DFU pendiente.");
      const file = $("qs-main-firmware-file").files[0];
      R.assert(file && file.size >= 256 && file.size <= 0x1d800 + 0x4000 + 16, "Selecciona BIN v6 o paquete v7 dentro de limites.");
      R.assert(/\.bin$/i.test(file.name) && !/sa818|beta|development|rolling/i.test(file.name),
        "Selecciona BIN estable para esta radio; no SA818, beta ni desarrollo.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const info = R.inspectQuanshengFirmwarePackage(bytes);
      const sha256 = await R.sha256(bytes);
      const word = `FIRMWARE PRINCIPAL ${model.value}`;
      if (root.prompt(`Sustituiras firmware interno por F4HWN ${info.version}. No actualiza Main externo.${info.assets ? ` Despues debes instalar recursos Build ID ${info.assets.buildId} del mismo paquete con respaldo nuevo.` : ""} SHA-256 paquete ${sha256}. Escribe ${word}.`) !== word) {
        log("Preparacion DFU principal cancelada.");
        return;
      }
      const receipt = await getConnector().prepareMainFirmwareDFU(bytes, getPermit(), word);
      stage = receipt.stage;
      stageModel = model.value;
      mainFirmware = true;
      mainAssets = receipt.assets;
      factoryStarted = true;
      $("qs-factory-dfu").disabled = false;
      $("qs-factory-dfu").textContent = "Conectar en DFU y grabar firmware principal";
      $("qs-main-firmware-status").textContent = `${receipt.size} bytes preparados, SHA-256 imagen ${receipt.sha256}. Sin escritura. Desconecta y entra en DFU; no cierres esta pagina.${receipt.assets ? ` Pendiente despues: recursos Build ID ${receipt.assets.buildId} del mismo archivo.` : ""}`;
    });
    attach("qs-factory-verify", "Verificar stock", async () => {
      verified = null;
      const target = FACTORY[model.value];
      const files = [...$("qs-factory-files").files];
      R.assert(target && files.length === 2, "Selecciona modelo y exactamente dos archivos stock.");
      const flashFile = files.find(file => file.size === 0x200000);
      const firmwareFile = files.find(file => file.size === target.size);
      R.assert(flashFile && firmwareFile, "Tamanos stock no correspondientes al modelo seleccionado.");
      const [flash, firmware] = await Promise.all([flashFile, firmwareFile].map(async file =>
        new Uint8Array(await file.arrayBuffer())));
      const manifest = await verifyFactoryFiles(model.value, flash, firmware);
      verified = { flash, firmware, model: model.value };
      $("qs-factory-native-status").textContent = `Stock ${manifest.model} verificado por ambos SHA-256. No se ha escrito.`;
    });
    attach("qs-factory-prepare", "Restaurar Flash stock", async () => {
      R.assert(verified && verified.model === model.value && !stage, "Verifica los archivos stock de este modelo; no inicies dos restauraciones.");
      const word = `FABRICA ${model.value}`;
      if (root.prompt(`Se borraran slots, todos los bancos de canales, apps y registros RF. Requiere completar DFU despues, sin cerrar esta pagina. Se conserva calibracion. Escribe ${word}.`) !== word) {
        log("Restauracion stock cancelada.");
        return;
      }
      R.assertBackup(getConnector(), getPermit());
      await R.verifyBackup(getConnector(), getPermit());
      factoryStarted = true;
      try {
        stage = await getConnector().prepareFactoryRestore(verified.flash, verified.firmware, getPermit(), word);
      } catch (error) {
        $("qs-factory-native-status").textContent = `ERROR durante Flash stock: ${error.message}. No intentes arrancar normalmente ni ejecutar DFU sin Flash verificada. Conserva el respaldo y usa la recuperacion oficial. Desconecta aqui para liberar el puerto.`;
        throw error;
      }
      stageModel = model.value;
      $("qs-factory-dfu").disabled = false;
      $("qs-factory-native-status").textContent = "PASO 1 VERIFICADO. Pulsa Desconectar; apaga la radio, manten PTT al encender para entrar en DFU y pulsa el paso 2. No intentes arrancar stock antes de completar DFU. No cierres la pagina.";
      log("Flash stock verificada; calibracion preservada. Pendiente DFU; no cerrar pagina.");
    });
    attach("qs-factory-dfu", "DFU firmware", async () => {
      R.assert(stage && stageModel, "Falta el paso 1 verificado.");
      R.assert(!getConnector(), "Desconecta la sesion normal antes de conectar la radio en DFU.");
      const word = mainFirmware ? `DFU PRINCIPAL ${stageModel}` : `DFU ${stageModel}`;
      if (root.prompt(`Radio apagada: manten PTT al encender, comprueba LED encendido y pantalla apagada, suelta PTT. Se graba firmware interno ${mainFirmware ? "preparado" : "stock"}, no el bootloader. Escribe ${word}.`) !== word) {
        log("Paso DFU pospuesto; conserva esta pagina abierta.");
        return;
      }
      const dfu = new QuanshengFactoryDFU();
      dfu.onProgress = onProgress;
      let operationError = null;
      try {
        await dfu.openFactory(stageModel);
        const result = await dfu.flashFactory(stage, word);
        const message = `${result.pages} paginas ${mainFirmware ? "de firmware principal" : "stock"} confirmadas. Sin relectura DFU: verifica version y arranque manual; no se acredita prueba funcional.${mainAssets ? ` FALTA instalar recursos Build ID ${mainAssets.buildId}: arranca v7, reconecta con respaldo nuevo y selecciona el mismo paquete en Recursos externos v7. La pantalla puede estar vacia hasta completar recursos.` : ""}`;
        $(mainFirmware ? "qs-main-firmware-status" : "qs-factory-native-status").textContent = message;
        log(`${message} SHA-256 ${result.firmwareSHA256}.`);
        stage = null;
        factoryStarted = false;
        mainFirmware = false;
        mainAssets = null;
        verified = null;
        $("qs-factory-dfu").disabled = true;
        $("qs-factory-dfu").textContent = "2. Conectar en DFU y grabar stock";
      } catch (error) {
        operationError = error;
        $(mainFirmware ? "qs-main-firmware-status" : "qs-factory-native-status").textContent = `ERROR DFU: ${error.message}. No cierres esta pagina; conserva el respaldo. Se puede repetir DFU con la misma imagen y la misma radio.`;
        throw error;
      } finally {
        try { await dfu.disconnect(); }
        catch (error) {
          if (operationError) throw new AggregateError([operationError, error], "Fallo DFU y cierre del puerto.");
          throw error;
        }
      }
    });
    for (const id of ["qs-factory-flash-source", "qs-factory-firmware-source"]) {
      $(id).addEventListener("click", event => {
        if (!FACTORY[model.value]) {
          event.preventDefault();
          $("qs-factory-native-status").textContent = "Selecciona primero UV-K1 o UV-K5 V3.";
        }
      });
    }
    root.addEventListener("beforeunload", event => {
      if (factoryStarted) { event.preventDefault(); event.returnValue = ""; }
    });
    refresh();
    return { pending: () => factoryStarted };
  }
  Object.assign(R, { QUANSHENG_FACTORY_TARGETS: FACTORY, verifyQuanshengFactoryFiles: verifyFactoryFiles,
    QuanshengFactoryDFU, mountFactoryRestore });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
