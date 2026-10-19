(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const permits = new WeakMap();
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
