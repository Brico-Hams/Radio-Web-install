(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const permits = new WeakMap();
  const slotPermits = new WeakMap();
  const revoked = new WeakSet();
  R.revokeBackup = connector => revoked.add(connector);
  R.hasBackup = (connector, permit) => {
    const receipt = permits.get(permit);
    return Boolean(receipt && receipt.connector === connector && receipt.session === connector.session &&
      connector.connected && !connector.transport.error && !revoked.has(connector));
  };
  R.assertBackup = (connector, permit) => {
    R.assert(R.hasBackup(connector, permit),
    "Escritura bloqueada: falta respaldo completo persistido y verificado de esta sesion.");
  };
  R.verifyBackup = async (connector, permit) => {
    R.assertBackup(connector, permit);
    const receipt = permits.get(permit);
    try {
      const saved = await receipt.store.get(receipt.recordId);
      R.assert(saved && saved.status === "complete" && saved.files.length === receipt.hashes.length, "La copia persistente ya no esta completa.");
      for (const expected of receipt.hashes) {
        const file = saved.files.find(item => item.name === expected.name);
        R.assert(file && file.bytes.length === expected.size && await R.sha256(file.bytes) === expected.sha256,
          "La copia persistente cambio o esta corrupta.");
      }
      R.assertBackup(connector, permit);
    } catch (error) {
      revoked.add(connector);
      throw new Error(`Escritura bloqueada al verificar el respaldo: ${error.message}`, { cause: error });
    }
  };
  // Separate, single-use authority: never grants channel, app, erase or CFG access.
  R.assertSlotReplacement = (connector, permit) => {
    if (R.hasBackup(connector, permit)) return;
    const receipt = slotPermits.get(permit);
    R.assert(receipt && receipt.connector === connector && receipt.session === connector.session &&
      connector.connected && !connector.transport.error && !revoked.has(connector),
      "Escritura bloqueada: falta autorizacion especifica de slot de esta sesion.");
  };
  R.verifySlotReplacement = async (connector, permit, slot, image, name) => {
    R.assertSlotReplacement(connector, permit);
    if (permits.has(permit)) return R.verifyBackup(connector, permit);
    const receipt = slotPermits.get(permit);
    R.assert(receipt && receipt.connector === connector && receipt.session === connector.session &&
      connector.connected && !connector.transport.error && !revoked.has(connector),
    "Escritura bloqueada: falta autorizacion especifica de slot de esta sesion.");
    const expected = receipt.images.find(item => item.slot === slot);
    R.assert(expected && !expected.used && expected.name === name && expected.size === image.length &&
      expected.sha256 === await R.sha256(image), "Slot, nombre o imagen fuera de la autorizacion explicita.");
    try {
      const record = await receipt.store.get(receipt.recordId);
      R.assert(record && record.status === "partial" &&
        JSON.stringify(record.slotReplacement) === JSON.stringify(receipt.audit) &&
        record.files.length === receipt.hashes.length, "Autorizacion o copia parcial modificada.");
      for (const saved of receipt.hashes) {
        const file = record.files.find(item => item.name === saved.name);
        R.assert(file && file.bytes.length === saved.size && await R.sha256(file.bytes) === saved.sha256,
          "Copia parcial ausente o corrupta.");
      }
      R.assert(connector.connected && connector.session === receipt.session &&
        !connector.transport.error && !revoked.has(connector), "La sesion ha cambiado.");
      R.assert(!expected.used, "Autorizacion de slot ya consumida.");
      expected.used = true;
    } catch (error) {
      revoked.add(connector);
      throw error;
    }
  };
  class BackupStore {
    async open() {
      R.assert(root.indexedDB, "IndexedDB no disponible: no se puede garantizar un respaldo persistente.");
      this.db = await new Promise((resolve, reject) => {
        const request = root.indexedDB.open("radio-workspace-backups", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("backups", { keyPath: "id" });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Base de copias bloqueada por otra pestana."));
      });
    }
    async transaction(mode, action) {
      R.assert(this.db, "Almacen de copias no abierto.");
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction("backups", mode);
        const request = action(tx.objectStore("backups"));
        let result;
        request.onsuccess = () => { result = request.result; };
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || request.error);
        tx.onabort = () => reject(tx.error || new Error("La copia no se pudo confirmar en disco."));
      });
    }
    put(record) { return this.transaction("readwrite", store => store.put(record)); }
    get(id) { return this.transaction("readonly", store => store.get(id)); }
    list() { return this.transaction("readonly", store => store.getAll()); }
  }
  class BackupManager {
    constructor(store) { this.store = store; }
    async authorizeSlotReplacement(connector, images, acknowledgement) {
      R.assert(acknowledgement === "REEMPLAZAR SLOTS SIN RESPALDO DE FIRMWARE",
        "Debes aceptar expresamente la perdida de las imagenes actuales sin copia recuperable.");
      R.assert(connector.family === "quansheng" && connector.info?.legacyReadOnly,
        "Esta autorizacion limitada es solo para Quansheng legacy con copia parcial.");
      R.assert(Array.isArray(images) && images.length > 0 && images.length <= 4, "Seleccion de slots invalida.");
      const entries = [];
      for (const item of images) {
        R.assert(Number.isInteger(item.slot) && item.slot >= 1 && item.slot <= 4 &&
          !entries.some(entry => entry.slot === item.slot), "Solo slots 1-4 sin duplicados; Main protegido.");
        const bytes = R.bytes(item.image);
        R.inspectQuanshengSlotImage(bytes);
        R.assert(/^[\x20-\x7e]{1,15}$/.test(item.name), "Nombre de slot invalido.");
        entries.push({ slot: item.slot, name: item.name, size: bytes.length, sha256: await R.sha256(bytes) });
      }
      const { record } = await this.create(connector);
      R.assert(record.status === "partial" &&
        record.files.some(file => file.name === "calibration") &&
        record.files.some(file => file.name === "configuration"), "Falta copia parcial de esta sesion.");
      const audit = { acknowledgement, createdAt: new Date().toISOString(), images: entries };
      record.slotReplacement = audit;
      await this.store.put(record);
      const saved = await this.store.get(record.id);
      R.assert(JSON.stringify(saved?.slotReplacement) === JSON.stringify(audit), "No se guardo la autorizacion.");
      const permit = Object.freeze({});
      slotPermits.set(permit, { connector, session: connector.session, store: this.store, recordId: record.id,
        audit, images: entries.map(entry => ({ ...entry, used: false })),
        hashes: record.files.map(file => ({ name: file.name, size: file.bytes.length, sha256: file.sha256 })) });
      return { record, permit };
    }
    async create(connector, onRecord = () => {}) {
      const session = connector.session;
      const record = {
        id: root.crypto.randomUUID(), format: "radio-workspace-backup", version: 1,
        createdAt: new Date().toISOString(), device: { ...connector.info }, session,
        status: "in-progress", files: [], scope: ""
      };
      await this.store.put(record);
      onRecord(record);
      try {
        const report = await connector.backup(async (name, data, metadata) => {
          if (name === "calibration") R.validateCalibration(data);
          const file = { name, bytes: data.slice(), sha256: await R.sha256(data), metadata };
          record.files.push(file);
          await this.store.put(record);
          const stored = await this.store.get(record.id);
          const saved = stored?.files.find(item => item.name === name);
          R.assert(saved && saved.bytes.length === data.length && await R.sha256(saved.bytes) === file.sha256, `El respaldo ${name} no se guardo correctamente.`);
          onRecord(record);
        });
        R.assert(connector.connected && !connector.transport.error && connector.session === session, "La conexion cambio durante el respaldo.");
        R.assert(record.files.some(file => file.name === "calibration"), "Falta calibracion.");
        if (report.complete) {
          R.assert(record.files.some(file => file.name === "base-firmware") && record.files.some(file => file.name === "external-flash"), "Falta firmware base o Flash completa.");
        }
        record.status = report.complete ? "complete" : "partial";
        record.scope = report.scope;
        await this.store.put(record);
        const stored = await this.store.get(record.id);
        R.assert(stored && stored.status === record.status, "No se pudo confirmar el estado de la copia.");
        for (const file of stored.files) R.assert(await R.sha256(file.bytes) === file.sha256, "Respaldo corrupto al releerlo.");
        onRecord(record);
        if (!report.complete) return { record, permit: null };
        const permit = Object.freeze({});
        permits.set(permit, {
          connector, session, store: this.store, recordId: record.id,
          hashes: record.files.map(file => ({ name: file.name, size: file.bytes.length, sha256: file.sha256 }))
        });
        return { record, permit };
      } catch (error) {
        record.status = "failed";
        record.scope = error.message;
        try {
          await this.store.put(record);
          onRecord(record);
        } catch (storageError) {
          throw new AggregateError([error, storageError], "Respaldo fallido y error de almacenamiento. Escritura bloqueada.");
        }
        throw error;
      }
    }
  }
  function toBase64(data) {
    let binary = "";
    for (let i = 0; i < data.length; i += 8192) binary += String.fromCharCode(...data.subarray(i, i + 8192));
    return root.btoa(binary);
  }
  async function exportBackup(record) {
    for (const file of record.files) {
      R.assert(await R.sha256(file.bytes) === file.sha256, "Copia almacenada corrupta: no se exportara.");
    }
    return JSON.stringify({
      ...record,
      files: record.files.map(({ bytes, ...file }) => ({ ...file, size: bytes.length, encoding: "base64", data: toBase64(bytes) }))
    }, null, 2);
  }
  Object.assign(R, { BackupStore, BackupManager, exportBackup });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
