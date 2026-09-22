
const originalFetch = window.fetch.bind(window);
const originalWebSocket = window.WebSocket;
window.wait = t=>new Promise(r=>setTimeout(r,t));

class EventHandler {
  constructor() {
    this.eventListeners = {};
  }
  dispatchEvent(event, ...args) {
    var list = this.eventListeners[event];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      list[i].callback.apply(this, args);
    }
  }
  addEventListener(event, callback, options) {
    this.eventListeners[event] = this.eventListeners[event] || [];
    this.eventListeners[event].push({
      callback,
      options
    });
  }
}

class Network extends EventHandler {
  constructor() {
    super();
    this.endpoints = [];
  }
  async request() {
    if (arguments[0] instanceof Request) return await this._requestObject.apply(this,arguments);
    return await this._requestURL.apply(this,arguments);
  }
  async _requestURL(url,baseOrigin,data,type) {
    const absoluteUrl = resolveNetworkURL(url, baseOrigin);
    const request = new Request(absoluteUrl, data);
    return await this._requestObject(request,type);
  }
  async _requestObject(request,type) {
    request.request_type = type;
    this.dispatchEvent('requeststart',request,type);
    const response = await this.searchEndpoints(async function(endp) {
      endp.dispatchEvent('handlerequest',request,type);
      var response = await endp.handleRequest(request.clone(), type);
      if (!response) return null;
      endp.dispatchEvent('returnresponse',response,request,type);
      return response;
    });
    if (response) {
      response.source_url = request.url;
      response.request_type = type;
    }
    this.dispatchEvent('requestend',response,request,type);
    return response;
  }
  async socket(url,baseOrigin,protocols) {
    const absoluteUrl = resolveNetworkURL(url,baseOrigin);
    this.dispatchEvent('socketstart',absoluteUrl,protocols);
    const response = await this.searchEndpoints(async function(endp) {
      endp.dispatchEvent('handlesocket',absoluteUrl,protocols);
      var response = await endp.handleSocket(absoluteUrl,protocols);
      if (!response) return null;
      endp.dispatchEvent('returnsocket',response,absoluteUrl,protocols);
      return response;
    });
    this.dispatchEvent('socketend',response,absoluteUrl,protocols);
    return response;
  }
  setEndpoints(endpoints) {
    this.endpoints = endpoints;
  }
  prependEndpoint(endpoint) {
    this.endpoints.unshift(endpoint);
  }
  appendEndpoint(endpoint) {
    this.endpoints.push(endpoint);
  }
  async searchEndpoints(callback) {
    await wait(1);
    try {
      for (var i = 0; i < this.endpoints.length; i++) {
        var endp = this.endpoints[i];
        if (!endp.enabled) continue;
        var response = await callback.call(this, endp);
        if (!response) continue;
        return response;
      }
    } catch (e) {
      console.log('[networkRequest] URL/interceptor error:', e && e.message || e);
      return null;
    }
    return;
  }
}

class NetworkEndpoint extends EventHandler {
  constructor(enabled = true) {
    super();
    this.enabled = enabled;
  }
  async handleRequest(request,type) {
    return await originalFetch(request);
  }
  async handleSocket(url,protocols) {
    return protocols ? new originalWebSocket(url, protocols) : new originalWebSocket(url);
  }
}

class ProxyNetworkEndpoint extends NetworkEndpoint {
  constructor(proxy, obscureURL = true, enabled) {
    super(enabled);
    this.proxy = proxy;
    this.obscureURL = obscureURL;
  }
  async handleRequest(request,type) {
    let targetProxyUrl = request.url;
    
    // 1. Check if we need to obscure the URL via Base64
    if (!request.url.startsWith('data:') && !request.url.startsWith('blob:')) {
      if (this.obscureURL) {
        let b64 = textToBase64(request.url);
        // Make it URL-safe so special characters don't break query strings
        let urlSafeB64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        targetProxyUrl = `${this.proxy}?base64_url=${encodeURIComponent(urlSafeB64)}`;
      } else {
        // Fall back to standard cleartext parameter
        targetProxyUrl = `${this.proxy}?url=${encodeURIComponent(request.url)}`;
      }
    }
    try {
      const proxyRequest = new Request(targetProxyUrl, request);
      let response = await originalFetch(proxyRequest);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      if (response.url === targetProxyUrl) Object.defineProperty(response, 'url', {get:()=>targetProxyUrl});
      return response;
    } catch (err) {
      return null;
    }
  }
  async handleSocket(absoluteUrl, protocols) {
    let targetProxyUrl = absoluteUrl;

    // Switch the HTTP proxy URL to a WS proxy URL
    let proxyBaseUrl = this.proxy.replace(/^http/, 'ws');
    
    if (this.obscureURL) {
      let b64 = textToBase64(absoluteUrl);
      let urlSafeB64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      targetProxyUrl = `${proxyBaseUrl}?base64_url=${encodeURIComponent(urlSafeB64)}`;
    } else {
      targetProxyUrl = `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUrl)}`;
    }
    
    // Create the real connection and return it.
    // networkRequest will hand this back to our InterceptableWebSocket
    return protocols 
      ? new originalWebSocket(targetProxyUrl, protocols) 
      : new originalWebSocket(targetProxyUrl);
  }
}

function resolveNetworkURL(url, baseOrigin) {
  const raw = (url instanceof URL) ? url.href : String(url == null ? '' : url);
  const candidates = [];
  if (baseOrigin) candidates.push(String(baseOrigin));
  try {
    if (typeof getReliablePageURL === 'function') candidates.push(getReliablePageURL());
  } catch (_) {}
  try {
    if (typeof CURRENT_PAGE_URL !== 'undefined') candidates.push(CURRENT_PAGE_URL);
  } catch (_) {}
  candidates.push('http://127.0.0.1/');

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw)) {
    try { return new URL(raw).href; } catch (_) {}
  }
  if (raw.startsWith('//')) {
    for (const base of candidates) {
      try { return new URL(raw, base).href; } catch (_) {}
    }
  }
  for (const base of candidates) {
    try {
      if (!base || !/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(base)) continue;
      return new URL(raw, base).href;
    } catch (_) {}
  }
  return raw;
}

