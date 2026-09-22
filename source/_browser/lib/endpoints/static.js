// dependencies:
// network.js
// filesystem.js

(function(){

  class StaticEndpoint extends NetworkEndpoint {
    constructor(options = {}) {
      super(options.enabled ?? true);

      this.domain = String(options.domain || "").replace(/\/+$/,"");
      this.rootfolder = String(options.rootfolder || "").replace(/^\/+|\/+$/g,"");
      this.runfile = String(options.runfile || "index.html").replace(/^\/+/,"");
      this.source = options.source;
      this.filesystem = options.filesystem;
      this.loaded = false;

      this.load();
    }

    async load() {
      if (!this.filesystem) {
        if (!this.source) return;
        this.filesystem = await FileSystem.create(this.source);
      }

      this.loaded = true;
      this.dispatchEvent('loaded',this);
    }

    async handleRequest(request,type) {
      const url = new URL(request.url);

      if (url.origin !== this.domain) return null;

      var path = decodeURIComponent(url.pathname).replace(/^\/+/,"");
      if (!path) path = this.runfile;

      const filePath = this.rootfolder ? `${this.rootfolder}/${path}` : path;

      if (!this.filesystem.existsSync(filePath)) return null;

      const data = this.filesystem.readFileSync(filePath);
      if (!data) return null;

      return new Response(data,{
        status: 200,
        statusText: "OK",
        headers: {
          "Content-Type": inferMime(path) || "application/octet-stream",
          "Content-Length": data.byteLength.toString()
        }
      });
    }

    async handleSocket(url,protocols) {
      return null;
    }
  }

  window.StaticEndpoint = StaticEndpoint;

})();
