
(function() {
  class FileSystem {
    constructor(provider, sourceMode, syncEnabled) {
      this.provider = provider;
      this.sourceMode = sourceMode; // 1: Folder Handle, 2: Zip Handle, 3: Folder Fallback, 4: Zip Fallback
      this.sync = syncEnabled;
    }

    static async create(source, options = { sync: true }) {
      let provider;
      let mode = 0;
      const sync = options.sync !== false;

      if (typeof FileSystemDirectoryHandle !== 'undefined' && source instanceof FileSystemDirectoryHandle) {
        provider = new DirectoryHandleProvider(source, sync);
        mode = 1;
      } else if (typeof FileSystemFileHandle !== 'undefined' && source instanceof FileSystemFileHandle) {
        if (typeof JSZip === 'undefined') throw new Error("JSZip library required.");
        provider = new ZipFileHandleProvider(source, sync);
        mode = 2;
      } else if (source instanceof FileList || Array.isArray(source)) {
        if (typeof JSZip === 'undefined') throw new Error("JSZip library required.");
        const zip = new JSZip();
        const files = source instanceof FileList ? Array.from(source) : source;
        const promises = files.map(async (file) => {
          const path = file.customRelativePath || file.webkitRelativePath || file.name;
          const buffer = await file.arrayBuffer();
          zip.file(path, new Uint8Array(buffer));
        });
        await Promise.all(promises);
        provider = new ZipProvider(zip, false);
        mode = 3;
      } else if (source instanceof File && (source.type === 'application/zip' || source.name.endsWith('.zip'))) {
        if (typeof JSZip === 'undefined') throw new Error("JSZip library required.");
        const zip = await JSZip.loadAsync(source);
        provider = new ZipProvider(zip, false);
        mode = 4;
      } else if (source.files) {
        provider = new ZipProvider(source, false);
        mode = 4;
      } else {
        throw new Error("Unsupported file system source.");
      }

      await provider.init();
      return new this(provider, mode, sync);
    }

    readFileSync(path, encoding = 'binary') {
      const data = this.provider.cache.get(path);
      if (!data) return null;
      return encoding === 'utf8' ? new TextDecoder().decode(data) : data;
    }

    writeFileSync(path, content) {
      let binary = content;
      if (typeof content === 'string') {
        binary = new TextEncoder().encode(content);
      }
      this.provider.write(path, binary, content);
    }

    deleteFileSync(path) {
      return this.provider.delete(path);
    }

    existsSync(path) {
      return this.provider.cache.has(path);
    }

    listFilesSync() {
      return Array.from(this.provider.cache.keys());
    }

    async save() {
      return await this.provider.save();
    }

    async exportZip() {
      return await this.provider.exportZip();
    }
  }

  class DirectoryHandleProvider {
    constructor(dirHandle, sync) {
      this.dirHandle = dirHandle;
      this.sync = sync;
      this.cache = new Map();
    }
    async init() {
      await this._readDir(this.dirHandle, '');
    }
    async _readDir(handle, currentPath) {
      for await (const entry of handle.values()) {
        const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          const buffer = await file.arrayBuffer();
          this.cache.set(entryPath, new Uint8Array(buffer));
        } else if (entry.kind === 'directory') {
          await this._readDir(entry, entryPath);
        }
      }
    }
    write(path, binary, original) {
      this.cache.set(path, binary);
      if (this.sync) {
        this._persistFile(path, binary);
      }
    }
    delete(path) {
      const deleted = this.cache.delete(path);
      if (deleted && this.sync) {
        this._persistDelete(path);
      }
      return deleted;
    }
    async _persistFile(path, binary) {
      const parts = path.split('/');
      const fileName = parts.pop();
      let curr = this.dirHandle;
      for (const p of parts) curr = await curr.getDirectoryHandle(p, { create: true });
      const fh = await curr.getFileHandle(fileName, { create: true });
      const writable = await fh.createWritable();
      await writable.write(binary);
      await writable.close();
    }
    async _persistDelete(path) {
      const parts = path.split('/');
      const fileName = parts.pop();
      let curr = this.dirHandle;
      try {
        for (const p of parts) curr = await curr.getDirectoryHandle(p);
        await curr.removeEntry(fileName);
      } catch (e) {}
    }
    async save() {
      for (const [path, binary] of this.cache) {
        await this._persistFile(path, binary);
      }
      return null;
    }
    async exportZip() {
      const zip = new JSZip();
      for (const [path, data] of this.cache) zip.file(path, data);
      return await zip.generateAsync({ type: 'blob' });
    }
  }

  class ZipFileHandleProvider {
    constructor(fileHandle, sync) {
      this.fileHandle = fileHandle;
      this.sync = sync;
      this.cache = new Map();
      this.zip = null;
      this.writing = false;
    }
    async init() {
      const file = await this.fileHandle.getFile();
      this.zip = await JSZip.loadAsync(file);
      const promises = [];
      this.zip.forEach((relativePath, file) => {
        if (!file.dir) {
          promises.push(file.async('uint8array').then(d => this.cache.set(relativePath, d)));
        }
      });
      await Promise.all(promises);
    }
    write(path, binary, original) {
      this.cache.set(path, binary);
      this.zip.file(path, original);
      if (this.sync) {
        this._autoSave();
      }
    }
    delete(path) {
      const deleted = this.cache.delete(path);
      if (deleted) {
        this.zip.remove(path);
        if (this.sync) this._autoSave();
      }
      return deleted;
    }
    async _autoSave() {
      if (this.writing) return;
      this.writing = true;
      try { await this.save(); } finally { this.writing = false; }
    }
    async save() {
      this.cache.forEach((data, path) => this.zip.file(path, data));
      const blob = await this.zip.generateAsync({ type: 'blob' });
      const writable = await this.fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return null;
    }
    async exportZip() {
      this.cache.forEach((data, path) => this.zip.file(path, data));
      return await this.zip.generateAsync({ type: 'blob' });
    }
  }

  class ZipProvider {
    constructor(zipInstance, sync) {
      this.zip = zipInstance;
      this.sync = sync;
      this.cache = new Map();
    }
    async init() {
      const promises = [];
      this.zip.forEach((relativePath, file) => {
        if (!file.dir) {
          promises.push(file.async('uint8array').then(d => this.cache.set(relativePath, d)));
        }
      });
      await Promise.all(promises);
    }
    write(path, binary, original) {
      this.cache.set(path, binary);
      this.zip.file(path, original);
    }
    delete(path) {
      const deleted = this.cache.delete(path);
      if (deleted) this.zip.remove(path);
      return deleted;
    }
    async save() {
      return await this.exportZip();
    }
    async exportZip() {
      this.cache.forEach((data, path) => this.zip.file(path, data));
      return await this.zip.generateAsync({ type: 'blob' });
    }
  }

  window.FileSystem = FileSystem;
})();