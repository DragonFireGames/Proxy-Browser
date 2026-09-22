// dependencies:
// network.js

// Default SVG Globe favicon
const DEFAULT_FAVICON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239aa0a6' stroke-width='2'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/></svg>";

// Configurable Proxy Settings
let appSettings = {
  primaryProxy: "https://proxy.dragonfire7z.workers.dev/",
  fallbackProxy: "",
  searchEngine: "https://mojeek.com/search?q=",
  useFallback: false,
  obscureURL: true,
  defaultTab: "https://example.com",
  clearDevToolsOnReload: true,
};

var browserNetwork = new Network();
browserNetwork.addEventListener('requeststart',function(request, type){
  updateLoadingProgress(30);
  window.DevTools?.network.handleRequestStart(request,type);
  window.DevTools?.sources.handleRequestStart(request,type);
});
browserNetwork.addEventListener('socketstart',function(absoluteUrl, protocols) {
  var url;
  try { url = new URL(absoluteUrl); } catch(e) { return; }
  return window.DevTools?.network.handleSocketStart(url.href,protocols);
});
browserNetwork.addEventListener('socketend',async function(socket, absoluteUrl, protocols) {
  var url;
  try { url = new URL(absoluteUrl); } catch(e) { return; }
  return window.DevTools?.network.handleSocketEnd(url.href,protocols,socket);
});
browserNetwork.addEventListener('requestend',async function(response, request, type){
  if (!response) return;
  window.DevTools?.network.handleRequestEnd(response,request,type);
  window.DevTools?.sources.handleRequestEnd(response,request,type);
  updateLoadingProgress(80);
});
browserNetwork.addEventListener('websocket',async function(absoluteUrl,data) {
  var url = new URL(absoluteUrl);
  return window.DevTools?.network.handleWebsocket(url.href,data);
});

var primaryProxyEndpoint = new ProxyNetworkEndpoint(appSettings.primaryProxy, appSettings.obscureURL);
var fallbackProxyEndpoint = new ProxyNetworkEndpoint(appSettings.fallbackProxy, appSettings.obscureURL, appSettings.useFallback);
browserNetwork.appendEndpoint(primaryProxyEndpoint);
browserNetwork.appendEndpoint(fallbackProxyEndpoint);
browserNetwork.appendEndpoint(new NetworkEndpoint());

function updateNetworkSettings() {
  primaryProxyEndpoint.proxy = appSettings.primaryProxy;
  primaryProxyEndpoint.obscureURL = appSettings.obscureURL;
  fallbackProxyEndpoint.proxy = appSettings.fallbackProxy;
  fallbackProxyEndpoint.obscureURL = appSettings.obscureURL;
  fallbackProxyEndpoint.enabled = appSettings.useFallback;
}

window.addEventListener('error', function(e) {
  console.error("Uncaught Error: " + e.error.stack);
});

var bookmarks = [
  { title: "Minecraft", url: "https://eaglercraft.q13x.com/1.8-wasm/" },
  // { title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Main_Page" },
  { title: "Wikipedia", url: "https://www.wikipedia.org/" },
  //{ title: "Hacker News", url: "https://news.ycombinator.com" },
  { title: "Test", url: "https://getsamplefiles.com/download/7z/sample-1.7z" },
  { title: "WatermelonKatana", url: "https://watermelonkatana.onrender.com" },
  { title: "Pathtracer", url: "https://dragonfiregames.github.io/WebGPU-Pathtracer/" },
  //{ title: "Personalami", url: "https://pawchive.pw/patreon/user/262481" },
];

function setStorageItem(key,value) {
  localStorage.setItem(key,JSON.stringify(value));
}
function getStorageItem(key) {
  var item = localStorage.getItem(key);
  return item ? JSON.parse(item) : null;
}

// setTimeout(function(){
//   bookmarks = getStorageItem('bookmarks') || bookmarks;
//   appSettings = getStorageItem('history') || appSettings;
//   updateSettings();
//   tabs = getStorageItem('tabs') || tabs;
//   activeTabId = getStorageItem('activeTab');
//   var tab = getActiveTab();
//   if (tab) navigateToInTab(tab,tab.url,true,true);
//   updateToolbarUI();
//   renderBookmarks();
//   if (tabs.length == 0) {
//   }
// 
// },1);

try {
  const savedAppSettings = getStorageItem('appSettings');
  if (savedAppSettings) appSettings = { ...appSettings, ...savedAppSettings };
} catch(e) {}

function saveBrowserState() {
  setStorageItem('bookmarks',bookmarks);
  setStorageItem('history',history);
  setStorageItem('tabs',tabs.map(tab => {
    var serialized_tab = { ...tab };
    delete serialized_tab.iframe;
    return serialized_tab;
  }));
  setStorageItem('activeTab',activeTabId);
}

let historyLog = [];
let tabs = [];
let activeTabId = null;
let closedTabsStack = [];
let contextMenuTarget = null;
const cacheMap = {};

var DevTools = {
  activeTab: 'elements',

  util: {
    getActiveDocument() {
      const tab = getActiveTab();
      if (!tab || !tab.iframe) return null;
      return tab.iframe.contentDocument || tab.iframe.contentWindow?.document || null;
    },
    isNearBottom(element,threshold = 24) {
      if (!element) return true;
      return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
    },
    scrollToBottom(element) {
      if (!element) return;
      element.scrollTop = element.scrollHeight;
    },
  },

  syntax: (() => {
    const JS_KEYWORDS = new Set('as async await break case catch class const continue debugger default delete do else export extends finally for from function get if implements import in instanceof interface let new of package private protected public return set static super switch throw try typeof var void while with yield this'.split(' '));
    const JS_LITERALS = new Set(['true','false','null','undefined','NaN','Infinity']);
    const JS_BUILTINS = new Set(['window','document','console','JSON','Math','Array','Object','String','Number','Boolean','Promise','Reflect','Proxy','Date','RegExp','Map','Set','WeakMap','WeakSet','URL','URLSearchParams','Error','TypeError','fetch','setTimeout','setInterval','clearTimeout','clearInterval','requestAnimationFrame','event']);

    function esc(value) {
      return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');
    }

    function token(cls,text) {
      return '<span class=\"dt-syn-' + cls + '\">' + esc(text) + '</span>';
    }

    const BRACKET_COLORS = ['dt-syn-bracket-1','dt-syn-bracket-2','dt-syn-bracket-3'];
    const OPEN_BRACKETS = {'(':')','[':']','{':'}'};
    const CLOSE_BRACKETS = {')':'(',']':'[','}':'{'};

    function scanString(code,start,quote) {
      let i = start + 1;
      while (i < code.length) {
        if (code[i] === '\\') { i += 2; continue; }
        if (code[i] === quote) return i + 1;
        i++;
      }
      return code.length;
    }

    function findTemplateExpressionEnd(code,start,endLimit) {
      let i = start, depth = 0;
      while (i < endLimit) {
        const ch = code[i], next = code[i + 1];
        if (ch === '/' && next === '/') {
          const n = code.indexOf('\n',i + 2);
          i = n < 0 || n > endLimit ? endLimit : n;
          continue;
        }
        if (ch === '/' && next === '*') {
          const n = code.indexOf('*/',i + 2);
          i = n < 0 || n + 2 > endLimit ? endLimit : n + 2;
          continue;
        }
        if (ch === '"' || ch === "'") { i = Math.min(scanString(code,i,ch),endLimit); continue; }
        if (ch === '`') { i = skipTemplateLiteral(code,i,endLimit); continue; }
        if (ch === '{') { depth++; i++; continue; }
        if (ch === '}') {
          if (depth === 0) return i;
          depth--; i++; continue;
        }
        if (ch === '\\') { i += 2; continue; }
        i++;
      }
      return -1;
    }

    function skipTemplateLiteral(code,start,endLimit) {
      let i = start + 1;
      while (i < endLimit) {
        const ch = code[i], next = code[i + 1];
        if (ch === '\\') { i += 2; continue; }
        if (ch === '`') return i + 1;
        if (ch === '$' && next === '{') {
          const end = findTemplateExpressionEnd(code,i + 2,endLimit);
          if (end < 0) return endLimit;
          i = end + 1;
          continue;
        }
        i++;
      }
      return endLimit;
    }

    function collectProtectedJavaScript(code,start,endLimit,ranges) {
      let i = start;
      while (i < endLimit) {
        const ch = code[i], next = code[i + 1];
        if (ch === '/' && next === '/') {
          const n = code.indexOf('\n',i + 2);
          const end = n < 0 || n > endLimit ? endLimit : n;
          ranges.push({start:i,end,type:'comment'});
          i = end;
          continue;
        }
        if (ch === '/' && next === '*') {
          const n = code.indexOf('*/',i + 2);
          const end = n < 0 || n + 2 > endLimit ? endLimit : n + 2;
          ranges.push({start:i,end,type:'comment'});
          i = end;
          continue;
        }
        if (ch === '"' || ch === "'") {
          const end = Math.min(scanString(code,i,ch),endLimit);
          ranges.push({start:i,end,type:'string'});
          i = end;
          continue;
        }
        if (ch === '`') {
          i = collectTemplateJavaScript(code,i,endLimit,ranges);
          continue;
        }
        i++;
      }
    }

    function collectTemplateJavaScript(code,start,endLimit,ranges) {
      let i = start + 1, segmentStart = start;
      while (i < endLimit) {
        const ch = code[i], next = code[i + 1];
        if (ch === '\\') { i += 2; continue; }
        if (ch === '`') {
          ranges.push({start:segmentStart,end:i + 1,type:'template'});
          return i + 1;
        }
        if (ch === '$' && next === '{') {
          if (i > segmentStart) ranges.push({start:segmentStart,end:i,type:'template'});
          const exprStart = i + 2;
          const exprEnd = findTemplateExpressionEnd(code,exprStart,endLimit);
          if (exprEnd < 0) return endLimit;
          collectProtectedJavaScript(code,exprStart,exprEnd,ranges);
          segmentStart = exprEnd + 1;
          i = exprEnd + 1;
          continue;
        }
        i++;
      }
      if (segmentStart < endLimit) ranges.push({start:segmentStart,end:endLimit,type:'template'});
      return endLimit;
    }

    function getProtectedJavaScriptRanges(code) {
      const ranges = [];
      collectProtectedJavaScript(code,0,code.length,ranges);
      return ranges;
    }

    function markJavaScriptBrackets(code,ranges) {
      const marks = new Map();
      const stack = [];
      let rangeIndex = 0;
      const isProtected = pos => {
        while (rangeIndex < ranges.length && ranges[rangeIndex].end <= pos) rangeIndex++;
        return rangeIndex < ranges.length && ranges[rangeIndex].start <= pos && pos < ranges[rangeIndex].end;
      };
      for (let i = 0; i < code.length; i++) {
        if (isProtected(i)) continue;
        const ch = code[i];
        if (OPEN_BRACKETS[ch]) {
          stack.push({char:ch,index:i,level:stack.length % 3});
          continue;
        }
        if (!CLOSE_BRACKETS[ch]) continue;
        if (!stack.length) {
          marks.set(i,'dt-syn-bracket-error');
          continue;
        }
        const top = stack[stack.length - 1];
        if (top.char === CLOSE_BRACKETS[ch]) {
          const cls = BRACKET_COLORS[top.level];
          marks.set(top.index,cls);
          marks.set(i,cls);
          stack.pop();
        } else {
          marks.set(i,'dt-syn-bracket-error');
        }
      }
      for (const open of stack) marks.set(open.index,'dt-syn-bracket-error');
      return marks;
    }

    function highlightJavaScript(code) {
      code = String(code ?? '');
      const ranges = getProtectedJavaScriptRanges(code);
      const brackets = markJavaScriptBrackets(code,ranges);
      let out = '', i = 0, rangeIndex = 0;
      while (i < code.length) {
        while (rangeIndex < ranges.length && ranges[rangeIndex].end <= i) rangeIndex++;
        const range = ranges[rangeIndex];
        if (range && range.start <= i && i < range.end) {
          out += token(range.type,code.slice(i,range.end));
          i = range.end;
          continue;
        }
        const ch = code[i];
        if (/\d/.test(ch) && (i === 0 || /[^A-Za-z_$]/.test(code[i - 1]))) {
          const match = code.slice(i).match(/^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?n?)/);
          if (match) { out += token('number',match[0]); i += match[0].length; continue; }
        }
        if (/[A-Za-z_$]/.test(ch)) {
          const match = code.slice(i).match(/^[A-Za-z_$][\w$]*/)[0];
          const cls = JS_KEYWORDS.has(match) ? 'keyword' : JS_LITERALS.has(match) ? 'literal' : JS_BUILTINS.has(match) ? 'builtin' : /^[$A-Z_a-z][\w$]*$/.test(match) && /^\s*\(/.test(code.slice(i + match.length)) ? 'function' : '';
          out += cls ? token(cls,match) : esc(match);
          i += match.length; continue;
        }
        const bracketClass = brackets.get(i);
        if (bracketClass) {
          out += token('bracket ' + bracketClass, ch);
          i++;
          continue;
        }
        out += esc(ch); i++;
      }
      return out;
    }

    function highlightCSS(code) {
      code = String(code ?? '');
      let out = '', i = 0, inBlock = false;
      while (i < code.length) {
        const ch = code[i], next = code[i + 1];
        if (ch === '/' && next === '*') {
          const end = code.indexOf('*/',i + 2);
          const e = end < 0 ? code.length : end + 2;
          out += token('comment',code.slice(i,e)); i = e; continue;
        }
        if (ch === '"' || ch === "'") {
          const e = scanString(code,i,ch);
          out += token('string',code.slice(i,e)); i = e; continue;
        }
        if (ch === '{') { inBlock = true; out += esc(ch); i++; continue; }
        if (ch === '}') { inBlock = false; out += esc(ch); i++; continue; }
        if (ch === '@') {
          const match = code.slice(i).match(/^@[\w-]+/);
          if (match) { out += token('keyword',match[0]); i += match[0].length; continue; }
        }
        if (/\d/.test(ch) && (i === 0 || /[^A-Za-z_-]/.test(code[i - 1]))) {
          const match = code.slice(i).match(/^(?:\d+(?:\.\d+)?%?|\.\d+%?)(?:[A-Za-z]+)?/);
          if (match) { out += token('number',match[0]); i += match[0].length; continue; }
        }
        if (/[A-Za-z_-]/.test(ch)) {
          const match = code.slice(i).match(/^[A-Za-z_-][\w-]*/)[0];
          let j = i + match.length;
          while (j < code.length && /\s/.test(code[j])) j++;
          const cls = inBlock && code[j] === ':' ? 'property' : 'selector';
          out += token(cls,match); i += match.length; continue;
        }
        out += esc(ch); i++;
      }
      return out;
    }

    function highlightHTML(code) {
      code = String(code ?? '');
      let out = '', last = 0;
      const tagRe = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g;
      let match;
      while ((match = tagRe.exec(code))) {
        out += esc(code.slice(last,match.index));
        const tag = match[0];
        if (tag.startsWith('<!--')) {
          out += token('comment',tag);
        } else {
          let inner = '';
          let i = 0;
          if (tag[i] === '<') { inner += esc(tag[i++]); }
          if (tag[i] === '/') { inner += esc(tag[i++]); }
          const name = tag.slice(i).match(/^[A-Za-z][\w:-]*/);
          if (name) { inner += token('tag',name[0]); i += name[0].length; }
          while (i < tag.length) {
            if (tag[i] === '>' || (tag[i] === '/' && tag[i + 1] === '>')) {
              inner += esc(tag.slice(i)); break;
            }
            if (/\s/.test(tag[i])) {
              const ws = tag.slice(i).match(/^\s+/)[0]; inner += esc(ws); i += ws.length; continue;
            }
            const attr = tag.slice(i).match(/^[A-Za-z_:][\w:.-]*/);
            if (attr) {
              inner += token('attribute',attr[0]); i += attr[0].length;
              const eq = tag.slice(i).match(/^\s*=\s*/);
              if (eq) {
                inner += esc(eq[0]); i += eq[0].length;
                if (tag[i] === '"' || tag[i] === "'") {
                  const e = scanString(tag,i,tag[i]);
                  inner += token('string',tag.slice(i,e)); i = e;
                }
              }
              continue;
            }
            inner += esc(tag[i++]);
          }
          out += inner;
        }
        last = match.index + tag.length;
      }
      out += esc(code.slice(last));
      return out;
    }

    function highlight(code,language) {
      const lang = String(language || 'javascript').toLowerCase();
      if (lang === 'html' || lang === 'xml') return highlightHTML(code);
      if (lang === 'css') return highlightCSS(code);
      return highlightJavaScript(code);
    }

    function inferLanguage(language,value) {
      const lang = String(language || '').toLowerCase();
      if (lang) return lang;
      const text = String(value || '');
      if (/<!doctype\s+html|<html[\s>]/i.test(text) || /<\/?[a-z][^>]*>/i.test(text)) return 'html';
      if (/[.#]?[\w-]+\s*\{[\s\S]*:[^}]+;?[\s\S]*\}/.test(text)) return 'css';
      return 'javascript';
    }

    function makeCode(code,language,className) {
      const pre = document.createElement('pre');
      pre.className = (className || '') + ' dt-syntax-code';
      pre.innerHTML = highlight(code,inferLanguage(language,code));
      return pre;
    }

    function attachEditor(editor,highlightEl,language) {
      if (!editor || !highlightEl) return;
      const refresh = () => {
        highlightEl.innerHTML = highlight(editor.value,inferLanguage(language,editor.value));
        highlightEl.scrollTop = editor.scrollTop;
        highlightEl.scrollLeft = editor.scrollLeft;
      };
      editor.classList.add('dt-syntax-editor-input');
      highlightEl.classList.add('dt-syntax-editor-highlight');
      editor.addEventListener('input',refresh);
      editor.addEventListener('scroll',() => {
        highlightEl.scrollTop = editor.scrollTop;
        highlightEl.scrollLeft = editor.scrollLeft;
      });
      refresh();
      return refresh;
    }

    function caretOffset(root) {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount || !root.contains(selection.anchorNode)) return 0;
      const range = document.createRange();
      range.selectNodeContents(root);
      range.setEnd(selection.anchorNode,selection.anchorOffset);
      return range.toString().length;
    }

    function restoreCaretOffset(root,offset) {
      const selection = window.getSelection();
      if (!selection) return;
      const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let node, remaining = Math.max(0,offset);
      while ((node = walker.nextNode())) {
        if (remaining <= node.nodeValue.length) {
          const range = document.createRange();
          range.setStart(node,remaining);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
        remaining -= node.nodeValue.length;
      }
      const range = document.createRange();
      range.selectNodeContents(root);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    function attachEditable(editor,language) {
      if (!editor) return;
      editor.contentEditable = 'true';
      editor.spellcheck = false;
      const refresh = (restoreCaret) => {
        const position = restoreCaret ? caretOffset(editor) : 0;
        const top = editor.scrollTop, left = editor.scrollLeft;
        const value = editor.textContent || '';
        editor.innerHTML = highlight(value,inferLanguage(language,value));
        editor.scrollTop = top;
        editor.scrollLeft = left;
        if (restoreCaret) restoreCaretOffset(editor,position);
      };
      editor.addEventListener('input',() => refresh(true));
      refresh(false);
      return () => refresh(true);
    }

    return { highlight, inferLanguage, makeCode, attachEditor, attachEditable };
  })(),

  ui: (() => {
    function toggle() {
      const panel = document.getElementById('devtools-panel');
      const btn = document.getElementById('btn-devtools');
      if (!panel) return;
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        btn?.classList.add('active-toggle');
        switchTab(DevTools.activeTab);
      } else {
        panel.classList.add('hidden');
        btn?.classList.remove('active-toggle');
        DevTools.elements.stopPicker();
      }
    }

    function refreshActiveViews() {
      const panel = document.getElementById('devtools-panel');
      if (!panel || panel.classList.contains('hidden')) return;
      const tab = getActiveTab();
      if (!tab) return;
      if (DevTools.activeTab === 'elements') DevTools.elements.refresh(DevTools.elements.selected);
      else if (DevTools.activeTab === 'console') DevTools.console.render(tab);
      else if (DevTools.activeTab === 'sources') DevTools.sources.refresh();
      else if (DevTools.activeTab === 'network') DevTools.network.render();
      else if (DevTools.activeTab === 'performance') DevTools.performance.render();
      else if (DevTools.activeTab === 'application') DevTools.application.load(DevTools.application.type);
    }

    function switchTab(tabName) {
      DevTools.activeTab = tabName;
      const views = ['elements', 'console', 'sources', 'network', 'performance', 'application'];

      views.forEach(t => {
        const tabBtn = document.getElementById(`dt-tab-${t}`);
        const view = document.getElementById(`dt-view-${t}`);
        if (!tabBtn || !view) return;

        if (t === tabName) {
          tabBtn.classList.add('active');
          view.classList.remove('hidden');
          if (t === 'elements' || t === 'sources' || t === 'application') view.classList.add('flex');
        } else {
          tabBtn.classList.remove('active');
          view.classList.add('hidden');
          if (t === 'elements' || t === 'sources' || t === 'application') view.classList.remove('flex');
        }
      });

      if (tabName !== 'elements') DevTools.elements.stopPicker();
      refreshActiveViews();
      if (tabName === 'console') {
        const input = document.getElementById('consoleInput');
        if (input) {
          input.value = DevTools.console.getDraft(getActiveTab());
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 120) + 'px';
          input.focus();
        }
      }
    }

    function clearForReload(tab) {
      if (!tab || !appSettings.clearDevToolsOnReload) return;
      DevTools.console.clearTab(tab);
      DevTools.network.clearTab(tab);
    }

    function clearActive() {
      if (DevTools.activeTab === 'console') DevTools.console.clear();
      else if (DevTools.activeTab === 'network') DevTools.network.clear();
      else if (DevTools.activeTab === 'elements') DevTools.elements.refresh();
      else if (DevTools.activeTab === 'sources') DevTools.sources.refresh();
      else if (DevTools.activeTab === 'performance') DevTools.performance.render();
      else if (DevTools.activeTab === 'application') DevTools.application.load(DevTools.application.type);
    }

    return { toggle, switchTab, clearActive, clearForReload, refreshActiveViews };
  })(),

  console: (() => {
    const history = [];
    const drafts = new Map();
    let historyIndex = -1;
    let renderTab = null;
    const CORS_ERROR = {};

    function getLog(tab) {
      if (!tab) return [];
      tab.devtools = tab.devtools || {};
      tab.devtools.consoleLog = tab.devtools.consoleLog || [];
      return tab.devtools.consoleLog;
    }

    function setDraft(tab,value) {
      if (tab) drafts.set(tab.id,String(value || ''));
      if (tab?.id === activeTabId && DevTools.activeTab === 'console') {
        DevTools.util.scrollToBottom(document.getElementById('consoleOutput'));
      }
    }

    function getDraft(tab) {
      return tab ? drafts.get(tab.id) || '' : '';
    }

    function resetHistory() {
      historyIndex = -1;
    }

    function getLogList(out) {
      if (!out) return null;
      let list = out.querySelector(':scope > .console-log-list');
      if (!list) {
        list = document.createElement('div');
        list.className = 'console-log-list';
        out.appendChild(list);
      }
      return list;
    }

    function filterLogText(txt) {
      if (!txt) return document.createTextNode('');
      const frag = document.createDocumentFragment();
      for (var i in cacheMap) (function(i){
        const original = cacheMap[i];
        const parts = txt.split(original);
        if (parts.length > 1) {
          frag.appendChild(document.createTextNode(parts[0]));
          const u = document.createElement('span');
          u.addEventListener('click',()=>createNewTab(original,true));
          u.className = 'log-url';
          u.textContent = i;
          frag.appendChild(u);
          txt = parts.slice(1).join(original);
        }
      })(i);
      frag.appendChild(document.createTextNode(String(txt)));
      return frag;
    }

    function deepCopy(o,map = new Map()) {
      if (typeof o !== 'object' || o === null) return o;
      if (map.has(o)) return map.get(o);
      try {
        if (o?.outerHTML) return o;
        var np;
        if (o instanceof Array) {
          np = o.constructor.from(o);
          np._length = o.length;
        } else {
          np = Object.create(Object.getPrototypeOf(o));
        }
        if (o.constructor && !o.constructor.toString().includes('[native code]')) np._constructor = o.constructor;
        map.set(o,np);
        for (var i in o) if (Object.prototype.hasOwnProperty.call(o,i)) np[i] = deepCopy(o[i],map);
        return np;
      } catch(e) {
        if (e.message && e.message.includes('cross-origin')) return CORS_ERROR;
        throw e;
      }
    }

    function logContainer(data, tab = renderTab || getActiveTab()) {
      const out = document.getElementById('consoleOutput');
      if (!out) return null;
      const followBottom = DevTools.util.isNearBottom(out);
      const container = document.createElement('div');
      container.style.marginLeft = '4px';
      container.appendChild(data);
      container.classList.add('log-line');
      const list = getLogList(out);
      if (list) list.appendChild(container);
      if (followBottom) DevTools.util.scrollToBottom(out);
      updateBadge(tab);
      return container;
    }

    function renderValue(value, targetWin) {
      const type = typeof value;
      function styledSpan(text, cls) {
        const span = document.createElement('span');
        span.classList.add(...['log'].concat(Array.isArray(cls) ? cls : [cls]));
        try {
          span.appendChild(typeof text === 'string' ? filterLogText(text) : document.createTextNode(String(text)));
        } catch(e) {
          span.textContent = String(text);
        }
        return span;
      }

      if (value === null) return styledSpan('null','log-null');
      if (type === 'string') return styledSpan(`"${value}"`,'log-string');
      if (type === 'number') return styledSpan(value,'log-number');
      if (type === 'boolean') return styledSpan(value,'log-boolean');
      if (type === 'undefined') return styledSpan('undefined','log-undefined');

      if (type === 'function') {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        details.classList.add('log-details');
        summary.appendChild(styledSpan(value.name || 'function','log-function'));
        details.appendChild(summary);
        const pre = DevTools.syntax.makeCode(value.toString(),'javascript','log-function-source');
        details.appendChild(pre);
        return details;
      }

      if (type === 'object') {
        try {
          if (value instanceof HTMLElement || (targetWin?.HTMLElement && value instanceof targetWin.HTMLElement)) {
            let html = '';
            try { html = value.outerHTML; } catch(e) { html = '[unrenderable element]'; }
            return DevTools.syntax.makeCode(html,'html','log-html');
          }
        } catch(e) {}

        let snapshot = deepCopy(value);
        if (snapshot === CORS_ERROR) return styledSpan('[CORS Error]','log-circular');

        const details = document.createElement('details');
        const summary = document.createElement('summary');
        details.classList.add('log-details');

        try {
          if (value instanceof Promise || (targetWin?.Promise && value instanceof targetWin.Promise)) {
            summary.appendChild(styledSpan('Promise',['log-promise']));
            details.appendChild(summary);
            const inner = document.createElement('div');
            inner.style.marginLeft = '15px';
            const status = styledSpan('[pending]',['log-promise','log-promise-pending']);
            inner.appendChild(status);
            details.appendChild(inner);
            Promise.resolve(value).then(resolved => {
              status.textContent = '[resolved] ';
              status.className = 'log log-promise log-promise-resolved';
              inner.appendChild(renderValue(resolved,targetWin));
            }).catch(err => {
              status.textContent = '[rejected] ' + String(err);
              status.className = 'log log-promise log-promise-rejected';
            });
            return details;
          }
        } catch(e) {}

        summary.appendChild(styledSpan(value?.constructor?.name || 'Object','log-class'));
        details.appendChild(summary);
        details._logSnapshot = snapshot;
        const keys = Object.keys(snapshot || {});
        if (Array.isArray(snapshot) ? snapshot.length === 0 : keys.length === 0) {
          details.appendChild(styledSpan('[empty]','log-empty'));
        } else {
          details.addEventListener('toggle',function(){
            if (details.open && !details._populated) {
              const inner = document.createElement('div');
              inner.style.marginLeft = '15px';
              for (let prop in snapshot) if (Object.prototype.hasOwnProperty.call(snapshot,prop)) {
                const line = document.createElement('div');
                line.appendChild(styledSpan(prop + ': ','log-property'));
                line.appendChild(renderValue(snapshot[prop],targetWin));
                inner.appendChild(line);
              }
              details.appendChild(inner);
              details._populated = true;
            }
          });
        }
        return details;
      }

      return styledSpan(String(value),'log-other');
    }

    function renderAnything(...args) {
      const targetTab = renderTab || getActiveTab();
      const targetWin = targetTab?.iframe?.contentWindow || window;
      for (const value of args) logContainer(renderValue(value,targetWin),targetTab);
    }

    function renderText(msg,tab) {
      return logContainer(filterLogText(msg),tab);
    }

    function renderError(msg,tab) {
      const span = document.createElement('span');
      span.classList.add('log-error','log');
      span.appendChild(filterLogText(msg));
      return logContainer(span,tab);
    }

    function renderWarning(msg,tab) {
      const span = document.createElement('span');
      span.classList.add('log-warning','log');
      span.appendChild(filterLogText(msg));
      return logContainer(span,tab);
    }

    function renderRecord(record,tab) {
      renderTab = tab;
      try {
        if (record.kind === 'command') {
          const command = document.createElement('span');
          command.className = 'log-command';
          const prompt = document.createElement('span');
          prompt.className = 'log-command-prompt';
          prompt.textContent = '> ';
          command.appendChild(prompt);
          command.appendChild(DevTools.syntax.makeCode(record.text,'javascript','log-command-code'));
          const comm = logContainer(command,tab);
          if (comm) {
            comm.addEventListener('click',() => {
              const input = document.getElementById('consoleInput');
              if (input) {
                input.value = record.text;
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight,120) + 'px';
              }
              setDraft(tab,record.text);
            });
          }
        } else if (record.method === 'error') {
          renderError(record.args.map(a => typeof a === 'object' ? (() => { try { return JSON.stringify(a); } catch(e) { return String(a); } })() : String(a)).join(' '),tab);
        } else if (record.method === 'warn') {
          renderWarning(record.args.map(a => typeof a === 'object' ? (() => { try { return JSON.stringify(a); } catch(e) { return String(a); } })() : String(a)).join(' '),tab);
        } else {
          renderAnything(...(record.args || []));
        }
      } finally {
        renderTab = null;
      }
    }

    function updateBadge(tab) {
      const badge = document.getElementById('dt-console-count');
      if (!badge) return;
      const count = getLog(tab).length;
      badge.textContent = count;
      badge.classList.toggle('hidden',count === 0);
    }

    function render(tab) {
      const out = document.getElementById('consoleOutput');
      if (!out) return;
      const followBottom = DevTools.util.isNearBottom(out);
      const previousScrollTop = out.scrollTop;
      out.innerHTML = '';
      const list = getLogList(out);
      if (!tab) {
        updateBadge(null);
        return;
      }
      const filter = document.getElementById('consoleFilter')?.value || 'all';
      const records = getLog(tab).filter(record => filter === 'all' || record.method === filter || record.kind === 'command');
      if (!records.length) {
        const empty = document.createElement('div');
        empty.className = 'console-empty-state';
        empty.innerHTML = '<span class=\"text-gray-500\">Console ready.</span> <span class=\"text-gray-600\">Type a JavaScript expression below; Shift+Enter inserts a new line.</span>';
        list.appendChild(empty);
      } else {
        records.forEach(record => renderRecord(record,tab));
      }
      requestAnimationFrame(() => {
        if (followBottom) DevTools.util.scrollToBottom(out);
        else out.scrollTop = previousScrollTop;
      });
    }

    function recordMessage(tab,method,args) {
      if (!tab) return;
      const logs = getLog(tab);
      logs.push({kind:'message',method,args:Array.isArray(args) ? args : [args],time:Date.now()});
      if (logs.length > 1000) logs.splice(0,logs.length - 1000);
      if (tab.id === activeTabId && DevTools.activeTab === 'console' && !document.getElementById('devtools-panel')?.classList.contains('hidden')) renderRecord(logs[logs.length - 1],tab);
      updateBadge(tab);
    }

    function recordCommand(tab,text) {
      if (!tab) return;
      const logs = getLog(tab);
      const record = {kind:'command',text,time:Date.now()};
      logs.push(record);
      if (logs.length > 1000) logs.splice(0,logs.length - 1000);
      const normalized = String(text);
      const index = history.indexOf(normalized);
      if (index >= 0) history.splice(index,1);
      history.push(normalized);
      if (history.length > 500) history.splice(0,history.length - 500);
      if (tab.id === activeTabId && DevTools.activeTab === 'console' && !document.getElementById('devtools-panel')?.classList.contains('hidden')) renderRecord(record,tab);
      updateBadge(tab);
    }

    function filter() {
      render(getActiveTab());
    }

    function run(text) {
      const tab = getActiveTab();
      if (!tab?.page) return;
      text = String(text || '');
      if (!text.trim()) return;
      recordCommand(tab,text);
      resetHistory();
      setDraft(tab,'');
      (async function(){
        try {
          const result = await tab.page.runCommand(text);
          recordMessage(tab,'result',[result.value]);
        } catch(e) {
          recordMessage(tab,'error',[e.message]);
        }
        if (tab.id === activeTabId && DevTools.activeTab === 'console') render(tab);
      })();
    }

    function handleInput(e) {
      const input = e.target;
      const tab = getActiveTab();
      if (!tab) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const val = input.value;
        if (val.trim()) {
          run(val);
          input.value = '';
          setDraft(tab,'');
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight,120) + 'px';
        }
        return;
      }

      if (e.key === 'Enter' && e.shiftKey) return;

      if (e.key === 'ArrowUp' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (input.selectionStart !== input.selectionEnd || input.selectionStart !== 0) return;
        e.preventDefault();
        if (historyIndex === -1) setDraft(tab,input.value);
        if (!history.length) return;
        if (historyIndex < history.length - 1) historyIndex++;
        input.value = history[history.length - 1 - historyIndex] || '';
        requestAnimationFrame(() => input.setSelectionRange(input.value.length,input.value.length));
        return;
      }

      if (e.key === 'ArrowDown' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (input.selectionStart !== input.selectionEnd || input.selectionEnd !== input.value.length) return;
        if (historyIndex === -1) return;
        e.preventDefault();
        if (historyIndex > 0) {
          historyIndex--;
          input.value = history[history.length - 1 - historyIndex] || '';
        } else {
          resetHistory();
          input.value = getDraft(tab);
        }
        requestAnimationFrame(() => input.setSelectionRange(input.value.length,input.value.length));
      }
    }

    function clearTab(tab) {
      if (!tab) return;
      tab.devtools = tab.devtools || {};
      tab.devtools.consoleLog = [];
      if (tab.id === activeTabId) render(tab);
    }

    function clear() {
      clearTab(getActiveTab());
    }

    return { getLog, setDraft, getDraft, resetHistory, recordMessage, recordCommand, filter, run, handleInput, clear, clearTab, render };
  })(),

  network: (() => {
    const requestIds = new WeakMap();
    const requestTabs = new WeakMap();
    const requestQueues = new Map();
    const requestRecords = new Map();
    const socketTabs = new Map();
    let nextRequestId = 1;
    let context = null;
    let renderTimer = null;
    let selectedRequest = null;
    let detailTab = 'headers';
    let activePreviewUrl = null;

    function headerObject(headers) {
      const out = {};
      if (!headers) return out;
      try {
        if (headers instanceof Headers || typeof headers.forEach === 'function') {
          headers.forEach((value,key) => out[key] = value);
          return out;
        }
      } catch(e) {}
      if (Array.isArray(headers)) headers.forEach(pair => { if (pair?.length >= 2) out[pair[0]] = pair[1]; });
      else if (typeof headers === 'object') Object.entries(headers).forEach(([key,value]) => out[key] = String(value));
      return out;
    }

    function getRequestHeaders(request) {
      return headerObject(request?.headers);
    }

    function getResponseHeaders(response) {
      return headerObject(response?.headers);
    }

    function isTextualContent(contentType) {
      const type = String(contentType || '').toLowerCase();
      return type.startsWith('text/') || type.includes('json') || type.includes('javascript') || type.includes('xml') || type.includes('svg') || type.includes('css') || type.includes('wasm');
    }

    function formatBytes(size) {
      if (size == null || size === '') return '';
      size = Number(size) || 0;
      if (size < 1024) return size + ' B';
      if (size < 1024 * 1024) return (size / 1024).toFixed(size < 10240 ? 1 : 0) + ' KB';
      return (size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
    }

    function formatDuration(ms) {
      if (ms == null || !isFinite(ms)) return '';
      if (ms < 1000) return Math.round(ms) + ' ms';
      return (ms / 1000).toFixed(ms < 10000 ? 2 : 1) + ' s';
    }

    function getTypeName(req) {
      if (!req) return '';
      if (req.websocketFrame || req.method === 'WEBSOCKET' || req.type === 'websocket connection' || req.type === 'websocket') return 'WS';
      if (req.contentType) {
        const type = String(req.contentType).toLowerCase().split(';')[0].trim();
        if (type === 'text/html') return 'Document';
        if (type.includes('javascript') || type === 'application/ecmascript') return 'Script';
        if (type === 'text/css') return 'Stylesheet';
        if (type.startsWith('image/')) return 'Image';
        if (type.startsWith('audio/')) return 'Audio';
        if (type.startsWith('video/')) return 'Media';
        if (type.includes('font')) return 'Font';
        if (type.includes('json') || type.includes('xml') || type.startsWith('text/')) return 'Fetch';
      }
      const type = String(req.type || '').toLowerCase();
      if (type.includes('css')) return 'Stylesheet';
      if (type.includes('script') || type === 'js') return 'Script';
      if (type.includes('image')) return 'Image';
      if (type.includes('font')) return 'Font';
      if (type.includes('media')) return 'Media';
      if (type.includes('xhr') || type.includes('fetch') || type.includes('json')) return 'Fetch';
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Other';
    }

    function isFailedRequest(req) {
      return !!(req?.error || (!req?.pending && (req?.status == null || Number(req.status) >= 400)));
    }

    function getRequestName(url) {
      const raw = String(url || '');
      try {
        const u = new URL(raw);
        const path = u.pathname || '';
        const parts = path.split('/').filter(Boolean);
        let name = parts.length ? decodeURIComponent(parts[parts.length - 1]) : '';
        if (!name) name = u.hostname || raw;
        if (u.search) name += u.search;
        return name || raw;
      } catch(e) {
        const clean = raw.split('#')[0];
        const queryIndex = clean.indexOf('?');
        const base = queryIndex >= 0 ? clean.slice(0,queryIndex) : clean;
        const query = queryIndex >= 0 ? clean.slice(queryIndex) : '';
        const parts = base.split('/').filter(Boolean);
        return (parts.length ? parts[parts.length - 1] : base || raw) + query;
      }
    }

    function isJsonRequest(req) {
      const contentType = String(req?.contentType || '').toLowerCase();
      if (contentType.includes('json')) return true;
      const url = String(req?.url || '').split('?')[0].split('#')[0].toLowerCase();
      return /\.json$/.test(url);
    }

    function createNetworkIcon(req) {
      const wrap = document.createElement('span');
      wrap.className = 'network-request-icon inline-flex items-center justify-center flex-none w-4 h-4 mr-1 align-middle';
      wrap.setAttribute('aria-hidden','true');

      if (isFailedRequest(req)) {
        wrap.classList.add('text-red-500');
        wrap.innerHTML = '<i class="fa-solid fa-circle-xmark text-[14px]"></i>';
        wrap.title = 'Request failed';
        return wrap;
      }

      if (req?.websocketFrame || req?.method === 'WEBSOCKET' || req?.type === 'websocket connection' || req?.type === 'websocket') {
        wrap.classList.add('text-fuchsia-400');
        wrap.innerHTML = '<span class="font-bold text-[15px] leading-none">↔</span>';
        wrap.title = 'WebSocket';
        return wrap;
      }

      const type = getTypeName(req);
      if (type === 'Image') {
        const img = document.createElement('img');
        img.className = 'network-request-thumb w-4 h-4 rounded-[2px] object-cover border border-gray-700/80 bg-gray-900';
        img.alt = '';
        img.loading = 'lazy';
        img.title = 'Image';
        wrap.appendChild(img);
        if (req?._networkIconUrl) {
          img.src = req._networkIconUrl;
        } else if (req?.response && typeof req.response.clone === 'function') {
          req.response.clone().blob().then(blob => {
            if (!(blob instanceof Blob) || !blob.type.startsWith('image/')) return;
            if (!req._networkIconUrl) req._networkIconUrl = URL.createObjectURL(blob);
            if (img.isConnected) img.src = req._networkIconUrl;
          }).catch(() => {});
        }
        return wrap;
      }

      if (isJsonRequest(req)) {
        wrap.classList.add('text-amber-300');
        wrap.innerHTML = '<span class="font-mono font-bold text-[9px] leading-none">{;}</span>';
        wrap.title = 'JSON';
        return wrap;
      }

      if (type === 'Script') {
        wrap.className = 'network-request-icon inline-flex items-center justify-center flex-none w-4 h-4 mr-1 rounded-[2px] border border-yellow-500/70 bg-yellow-500/10 text-yellow-300 align-middle';
        wrap.innerHTML = '<span class="font-mono font-bold text-[8px] leading-none">&lt;&gt;</span>';
        wrap.title = 'Script';
        return wrap;
      }

      if (type === 'Stylesheet') {
        wrap.classList.add('text-cyan-300');
        wrap.innerHTML = '<i class="fa-solid fa-file-lines text-[13px]"></i>';
        wrap.title = 'Stylesheet';
        return wrap;
      }

      if (type === 'Font') {
        wrap.classList.add('text-pink-400');
        wrap.innerHTML = '<i class="fa-solid fa-font text-[12px]"></i>';
        wrap.title = 'Font';
        return wrap;
      }

      if (type === 'Media' || type === 'Audio') {
        wrap.classList.add('text-orange-300');
        wrap.innerHTML = '<i class="fa-solid fa-photo-film text-[12px]"></i>';
        wrap.title = type;
        return wrap;
      }

      wrap.classList.add('text-blue-400');
      wrap.innerHTML = '<i class="fa-solid fa-file-lines text-[13px]"></i>';
      wrap.title = type || 'Document';
      return wrap;
    }

    function revokeNetworkIconUrl(req) {
      if (!req?._networkIconUrl) return;
      try { URL.revokeObjectURL(req._networkIconUrl); } catch(e) {}
      req._networkIconUrl = null;
    }

    function requestKey(request,type) {
      return `${request?.method || 'GET'} ${request?.url || ''} ${type || ''}`;
    }

    function queueRequestId(key,id) {
      const queue = requestQueues.get(key) || [];
      queue.push(id);
      requestQueues.set(key,queue);
    }

    function consumeRequestId(key) {
      const queue = requestQueues.get(key);
      if (!queue?.length) return null;
      const id = queue.shift();
      if (queue.length) requestQueues.set(key,queue);
      else requestQueues.delete(key);
      return id;
    }

    function removeQueuedRequestId(id) {
      for (const [key,queue] of requestQueues) {
        const index = queue.indexOf(id);
        if (index < 0) continue;
        queue.splice(index,1);
        if (queue.length) requestQueues.set(key,queue);
        else requestQueues.delete(key);
        return;
      }
    }

    function getNetworkRootTab(tab) {
      let current = tab || null;
      const seen = new Set();
      while (current?.parentTab && !seen.has(current)) {
        seen.add(current);
        current = current.parentTab;
      }
      return current || tab || null;
    }

    function handleRequestStart(request,type) {
      const sourceTab = context;
      if (!sourceTab || !request) return;
      requestTabs.set(request,sourceTab);

      // Network is page-scoped like DevTools: requests made by child frames
      // belong to the top-level page's network log, not to an isolated frame
      // log. Sources/Console still retain the originating frame through
      // requestTabs.
      const tab = getNetworkRootTab(sourceTab);
      if (!tab || !isRecording(tab)) return;
      let url;
      try { url = new URL(request.url); } catch(e) { return; }
      const id = 'req-' + nextRequestId++;
      requestIds.set(request,id);
      const key = requestKey(request,type);
      requestRecords.set(id,{tab,key,sourceTab});
      queueRequestId(key,id);
      record({id,tabId:tab.id,frameTabId:sourceTab.id,url:url.href,origin:url.origin,method:request.method || 'GET',requestHeaders:headerObject(request.headers),type,pending:true,startedAt:performance.now()});
    }

    async function handleRequestEnd(response,request,type) {
      if (!response || !request) return;
      const sourceTab = requestTabs.get(request);
      let id = requestIds.get(request);
      const key = requestKey(request,type);
      if (!id) id = consumeRequestId(key);
      else removeQueuedRequestId(id);
      const recordInfo = id ? requestRecords.get(id) : null;
      const tab = recordInfo?.tab || getNetworkRootTab(sourceTab);
      const previous = id && tab ? getLog(tab).find(r => r.id === id) : null;
      if (!tab || !id || !previous) return;

      let url;
      try { url = new URL(request.url); } catch(e) { requestRecords.delete(id); return; }
      const blob = typeof response.clone === 'function' ? await response.clone().blob() : {size:0};
      const reqres = typeof response.clone === 'function' ? response.clone() : null;
      const contentType = (response.headers ? response.headers.get('content-type') : '') || blob.type || 'application/octet-stream';
      let responseText = null;
      if (isTextualContent(contentType) && blob.size <= 2 * 1024 * 1024) {
        try { responseText = await response.clone().text(); } catch(e) {}
      }

      record({id,tabId:tab.id,frameTabId:sourceTab?.id,url:url.href,origin:url.origin,method:request.method || 'GET',requestHeaders:headerObject(request.headers),status:response.status,contentType,type,size:blob.size,responseUrl:response.url || url.href,responseHeaders:headerObject(response.headers),responseText,response:reqres,pending:false,startedAt:previous.startedAt,duration:previous.startedAt != null ? Math.max(0,performance.now() - previous.startedAt) : null});
      requestRecords.delete(id);
    }

    function failPendingRequest(pageOrTab,request,type,error) {
      const sourceTab = getPageTab(pageOrTab) || pageOrTab || null;
      if (!sourceTab || !request) return;
      const key = requestKey(request,type);
      const id = requestIds.get(request) || consumeRequestId(key);
      if (!id) return;
      const info = requestRecords.get(id);
      const tab = info?.tab || getNetworkRootTab(sourceTab);
      const previous = tab ? getLog(tab).find(r => r.id === id) : null;
      if (!previous || !previous.pending) { requestRecords.delete(id); return; }
      record({id,tabId:tab.id,frameTabId:sourceTab.id,status:0,contentType:'',type,pending:false,error:error?.message || String(error || 'Request failed'),duration:previous.startedAt != null ? Math.max(0,performance.now() - previous.startedAt) : null});
      requestRecords.delete(id);
    }

    function handleSocketStart(url,protocols) {
      let contexts = socketTabs.get(url) || [];
      let value = contexts.find(item => !item.startedAt);
      if (!value?.tab && context) {
        const sourceTab = context;
        const tab = getNetworkRootTab(sourceTab);
        value = {tab,sourceTab,recording:isRecording(tab)};
        contexts.push(value);
      }
      if (!value?.tab || !isRecording(value.tab)) return;

      value.startedAt = performance.now();
      value.id = 'req-' + nextRequestId++;
      value.protocols = protocols;
      socketTabs.set(url,contexts);

      return record({
        id:value.id,
        tabId:value.tab.id,
        frameTabId:value.sourceTab?.id,
        url,
        origin:new URL(url).origin,
        method:'GET',
        status:0,
        contentType:'',
        type:'websocket connection',
        size:0,
        pending:true,
        startedAt:value.startedAt,
        protocols
      });
    }

    function handleSocketEnd(url,protocols,socket) {
      const contexts = socketTabs.get(url) || [];
      const index = contexts.findIndex(item => item.id);
      const value = index >= 0 ? contexts[index] : contexts.shift();
      if (index >= 0) contexts.splice(index,1);
      if (contexts.length) socketTabs.set(url,contexts);
      else socketTabs.delete(url);
      if (!value?.tab || !isRecording(value.tab)) return;

      const duration = value.startedAt != null ? Math.max(0,performance.now() - value.startedAt) : 0;
      return record({
        id:value.id || 'req-' + nextRequestId++,
        tabId:value.tab.id,
        frameTabId:value.sourceTab?.id,
        url,
        origin:new URL(url).origin,
        method:'GET',
        status:101,
        contentType:'text/plain',
        type:'websocket connection',
        size:0,
        pending:false,
        startedAt:value.startedAt,
        duration,
        protocols:value.protocols || protocols,
        response:new Response('connected')
      });
    }

    function handleWebsocket(url,data) {
      const contexts = socketTabs.get(url) || [];
      const value = contexts[0];
      if (!value?.tab || !isRecording(value.tab)) return;

      const payload = data?.data;
      let payloadPreview = null;
      try {
        if (typeof payload === 'string') payloadPreview = payload.slice(0,4096);
        else if (payload && typeof payload.byteLength === 'number') payloadPreview = `[Binary ${payload.byteLength} bytes]`;
        else if (payload != null) payloadPreview = String(payload).slice(0,4096);
      } catch(e) {}

      return record({
        id:'ws-' + url,
        tabId:value.tab.id,
        frameTabId:value.sourceTab?.id,
        url,
        origin:new URL(url).origin,
        method:'WEBSOCKET',
        status:data?.status,
        contentType:data?.contentType || 'application/octet-stream',
        type:'websocket',
        size:data?.size || (typeof payload?.byteLength === 'number' ? payload.byteLength : (typeof payload === 'string' ? payload.length : 0)),
        pending:false,
        websocketFrame:true,
        websocketPayload:payloadPreview,
        duration:data?.duration || null
      });
    }

    function getLog(tab) {
      if (!tab) return [];
      tab.devtools = tab.devtools || {};
      tab.devtools.networkLog = tab.devtools.networkLog || [];
      return tab.devtools.networkLog;
    }

    function isRecording(tab) {
      return !!tab?.devtools?.networkRecording;
    }

    function toggleRecording() {
      const tab = getActiveTab();
      if (!tab) return;
      tab.devtools = tab.devtools || {};
      tab.devtools.networkRecording = !isRecording(tab);
      updateRecordingUI(tab);
      if (isRecording(tab)) showToast('Network recording started','success');
      else showToast('Network recording stopped');
    }

    function updateRecordingUI(tab) {
      const button = document.getElementById('network-record-toggle');
      const status = document.getElementById('network-record-status');
      const recording = isRecording(tab);
      if (button) {
        button.innerHTML = recording ? '<i class="fa-solid fa-stop mr-1"></i> Stop' : '<i class="fa-solid fa-circle mr-1"></i> Record';
        button.className = recording ? 'bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded text-[10px] font-semibold' : 'bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-[10px] font-semibold';
        button.title = recording ? 'Stop recording network activity for this tab' : 'Record network activity for this tab';
      }
      if (status) {
        status.textContent = recording ? 'Recording' : 'Stopped';
        status.className = recording ? 'text-rose-400 font-semibold' : 'text-gray-500';
      }
    }

    function getStatusClass(status) {
      if (!status) return 'text-gray-500';
      if (status >= 200 && status < 300) return 'text-emerald-400';
      if (status >= 300 && status < 400) return 'text-yellow-400';
      return 'text-rose-400';
    }

    function getScrollContainer(element) {
      let node = element;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight >= node.clientHeight) return node;
        node = node.parentElement;
      }
      return null;
    }

    function record(req) {
      const tab = req.tabId ? tabs.find(t => t.id === req.tabId) : context || getActiveTab();
      if (!tab) return null;
      const log = getLog(tab);

      if (req.websocketFrame) {
        const wsEntry = log.find(r => r.websocketFrame && r.url === req.url);
        if (wsEntry) {
          wsEntry.status = req.status ?? wsEntry.status;
          wsEntry.contentType = req.contentType || wsEntry.contentType;
          wsEntry.frameCount = (wsEntry.frameCount || 0) + 1;
          wsEntry.size = (wsEntry.size || 0) + (req.size || 0);
          wsEntry.websocketPayload = req.websocketPayload;
          wsEntry.lastMessageAt = Date.now();
          wsEntry.duration = req.duration ?? wsEntry.duration;
          wsEntry.frames = wsEntry.frames || [];
          if (req.websocketPayload != null && wsEntry.frames.length < 50) wsEntry.frames.push({time:Date.now(),payload:req.websocketPayload,size:req.size || 0});
          scheduleRender();
          return wsEntry;
        }
      }

      const index = log.findIndex(r => r.id === req.id);
      if (index >= 0) log[index] = { ...log[index], ...req };
      else {
        if (!isRecording(tab)) return null;
        log.push({ ...req, frameCount: req.websocketFrame ? 1 : undefined, lastMessageAt: req.websocketFrame ? Date.now() : undefined, recordedAt: Date.now(), frames: req.websocketFrame ? [{time:Date.now(),payload:req.websocketPayload,size:req.size || 0}] : undefined });
      }

      if (log.length > 1000) {
        const removed = log.splice(0,log.length - 1000);
        removed.forEach(revokeNetworkIconUrl);
      }
      if (tab.id === activeTabId) {
        const badge = document.getElementById('dt-network-count');
        if (badge) {
          badge.textContent = log.length;
          badge.classList.toggle('hidden',log.length === 0);
        }
      }
      if (tab.id === activeTabId && DevTools.activeTab === 'network' && !document.getElementById('devtools-panel')?.classList.contains('hidden')) scheduleRender();
      return log[index >= 0 ? index : log.length - 1];
    }

    function scheduleRender() {
      if (renderTimer != null) return;
      renderTimer = setTimeout(() => {
        renderTimer = null;
        if (DevTools.activeTab === 'network' && !document.getElementById('devtools-panel')?.classList.contains('hidden')) render();
      },50);
    }

    function setDetailTab(name) {
      detailTab = name;
      showDetails(selectedRequest);
    }

    function getTemporalSelection(tab) {
      return tab?.devtools?.networkSelection || null;
    }

    function setTemporalSelection(tab,start,end) {
      if (!tab) return;
      tab.devtools = tab.devtools || {};
      const a = Math.min(start,end);
      const b = Math.max(start,end);
      if (!isFinite(a) || !isFinite(b) || b - a < 0.5) {
        delete tab.devtools.networkSelection;
      } else {
        tab.devtools.networkSelection = {start:a,end:b};
      }
      render();
    }

    function clearTemporalSelection(tab) {
      if (!tab) return;
      if (tab.devtools) delete tab.devtools.networkSelection;
      render();
    }

    function getWaterfallBarColor(req) {
      if (req?.pending) return '#eab308';
      if (req?.status >= 400 || req?.error) return '#ef4444';
      if (req?.status >= 300) return '#9ca3af';
      const colors = {
        'Document':'#60a5fa',
        'Script':'#facc15',
        'Stylesheet':'#22d3ee',
        'Image':'#4ade80',
        'Font':'#f472b6',
        'Media':'#fb923c',
        'Fetch':'#a78bfa',
        'WS':'#c084fc',
        'Audio':'#fb923c',
        'Other':'#94a3b8'
      };
      return colors[getTypeName(req)] || '#94a3b8';
    }

    function getWaterfallTimes(rows) {
      const now = performance.now();
      const values = rows.map(req => {
        const start = Number(req.startedAt ?? req.recordedAt ?? now);
        const duration = req.duration == null
          ? (req.pending ? Math.max(0.5, now - start) : 0.5)
          : Math.max(0.5, Number(req.duration) || 0.5);
        return {req,start,end:start + duration,duration};
      });
      if (!values.length) return {values,minStart:0,maxEnd:1,span:1};
      const minStart = Math.min(...values.map(x => x.start));
      const maxEnd = Math.max(...values.map(x => x.end));
      return {values,minStart,maxEnd,span:Math.max(1,maxEnd-minStart)};
    }

    function renderWaterfall(rows) {
      const container = document.getElementById('network-waterfall');
      const tab = getActiveTab();
      if (!container || !tab) return;

      const selection = getTemporalSelection(tab);
      container.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'h-6 flex items-center px-2 border-b border-gray-800 text-[9px] uppercase tracking-wider text-gray-500 bg-[#151619]';
      const title = document.createElement('span');
      title.textContent = selection ? 'Request overview • time filter active' : 'Request overview • drag to filter by time';
      header.appendChild(title);

      if (selection) {
        const range = document.createElement('span');
        range.className = 'ml-2 text-gray-400 normal-case';
        range.textContent = `${formatDuration(selection.end - selection.start)}`;
        header.appendChild(range);

        const clearButton = document.createElement('button');
        clearButton.className = 'ml-auto w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white';
        clearButton.title = 'Clear time filter';
        clearButton.innerHTML = '<i class="fa-solid fa-xmark text-[10px]"></i>';
        clearButton.onclick = e => { e.stopPropagation(); clearTemporalSelection(tab); };
        header.appendChild(clearButton);
      }
      container.appendChild(header);

      if (!rows.length) return;

      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '62px';
      canvas.style.cursor = 'crosshair';
      canvas.title = 'Drag across the timeline to select a time range';
      container.appendChild(canvas);

      const rect = () => canvas.getBoundingClientRect();
      const draw = (selectionPreview = null) => {
        const box = rect();
        const dpr = Math.max(1,window.devicePixelRatio || 1);
        const width = Math.max(1,Math.floor(box.width));
        const height = 62;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr,0,0,dpr,0,0);
        ctx.clearRect(0,0,width,height);

        const {values,minStart,span} = getWaterfallTimes(rows);
        const toX = time => ((time - minStart) / span) * width;

        ctx.fillStyle = '#151619';
        ctx.fillRect(0,0,width,height);

        ctx.strokeStyle = '#25272d';
        ctx.lineWidth = 1;
        for (let i=0;i<=5;i++) {
          const x = Math.round((i / 5) * width) + 0.5;
          ctx.beginPath();
          ctx.moveTo(x,0);
          ctx.lineTo(x,height);
          ctx.stroke();
        }

        const lanes = [];
        const laneHeight = 6;
        const laneGap = 1;
        const top = 17;
        const maxLanes = Math.max(1,Math.floor((height-top-3)/(laneHeight+laneGap)));
        values.slice().sort((a,b) => a.start-b.start).forEach(item => {
          let lane = 0;
          while (lane < lanes.length && lanes[lane] > item.start) lane++;
          if (lane >= maxLanes) lane = maxLanes - 1;
          lanes[lane] = item.end;
          item.lane = lane;
        });

        values.forEach(item => {
          const x = Math.max(0,toX(item.start));
          const endX = Math.min(width,Math.max(x+1,toX(item.end)));
          const barWidth = Math.max(1,endX-x);
          const y = top + item.lane*(laneHeight+laneGap);
          ctx.fillStyle = getWaterfallBarColor(item.req);
          ctx.globalAlpha = item.req.pending ? 0.75 : 0.88;
          ctx.fillRect(x,y,barWidth,laneHeight);
          ctx.globalAlpha = 1;
          if (item.req.status >= 300 && item.req.status < 400) {
            ctx.fillStyle = '#6b7280';
            ctx.fillRect(x,y,Math.min(2,barWidth),laneHeight);
          } else if (item.req.status >= 400 || item.req.error) {
            ctx.fillStyle = '#f87171';
            ctx.fillRect(x,y,Math.min(2,barWidth),laneHeight);
          }
        });

        ctx.fillStyle = '#6b7280';
        ctx.font = '8px monospace';
        ctx.textBaseline = 'top';
        for (let i=0;i<=5;i++) {
          const t = (i/5)*span;
          const x = Math.min(width-2,Math.max(2,((i/5)*width)));
          const label = formatDuration(t) || '0 ms';
          ctx.fillText(label,x === width-2 ? x-ctx.measureText(label).width : x+2,3);
        }

        const activeSelection = selectionPreview || selection;
        if (activeSelection) {
          const sx = Math.max(0,Math.min(width,toX(activeSelection.start)));
          const ex = Math.max(0,Math.min(width,toX(activeSelection.end)));
          const left = Math.min(sx,ex);
          const right = Math.max(sx,ex);
          ctx.fillStyle = 'rgba(148,163,184,0.12)';
          ctx.fillRect(left,0,right-left,height);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.strokeRect(left+0.5,0.5,Math.max(0,right-left-1),height-1);
          ctx.fillStyle = '#d1d5db';
          ctx.fillRect(left,0,1,height);
          ctx.fillRect(right-1,0,1,height);
        }
        return {minStart,span,width};
      };

      let dragStart = null;
      let dragCurrent = null;
      let geometry = draw();

      const pointToTime = event => {
        const box = rect();
        const x = Math.max(0,Math.min(box.width,event.clientX-box.left));
        return geometry.minStart + (x / Math.max(1,geometry.width)) * geometry.span;
      };

      canvas.addEventListener('pointerdown',event => {
        if (event.button !== 0) return;
        canvas.setPointerCapture?.(event.pointerId);
        dragStart = pointToTime(event);
        dragCurrent = dragStart;
        geometry = draw({start:dragStart,end:dragCurrent});
      });
      canvas.addEventListener('pointermove',event => {
        if (dragStart == null) return;
        dragCurrent = pointToTime(event);
        geometry = draw({start:dragStart,end:dragCurrent});
      });
      canvas.addEventListener('pointerup',event => {
        if (dragStart == null) return;
        dragCurrent = pointToTime(event);
        const start = Math.min(dragStart,dragCurrent);
        const end = Math.max(dragStart,dragCurrent);
        setTemporalSelection(tab,start,end);
        dragStart = dragCurrent = null;
      });
      canvas.addEventListener('pointercancel',() => { dragStart = dragCurrent = null; geometry = draw(); });

      if (selection) geometry = draw(selection);
    }

    function render() {
      const tbody = document.getElementById('network-log-body');
      if (!tbody) return;
      const scrollContainer = getScrollContainer(tbody);
      const followBottom = DevTools.util.isNearBottom(scrollContainer);
      const previousScrollTop = scrollContainer?.scrollTop || 0;
      const activeTab = getActiveTab();
      const networkLog = getLog(activeTab);
      updateRecordingUI(activeTab);

      const query = (document.getElementById('network-filter')?.value || '').trim().toLowerCase();
      const statusFilter = document.getElementById('network-status-filter')?.value || 'all';
      const typeFilter = document.getElementById('network-type-filter')?.value || 'all';

      const types = [...new Set(networkLog.map(getTypeName).filter(Boolean))].sort();
      const typeSelect = document.getElementById('network-type-filter');
      if (typeSelect) {
        const current = typeSelect.value;
        typeSelect.innerHTML = '<option value="all">All Types</option>' + types.map(type => `<option value="${sanitizeHTML(type)}">${sanitizeHTML(type)}</option>`).join('');
        typeSelect.value = types.includes(current) ? current : 'all';
      }

      const overviewRows = networkLog.filter(req => {
        const text = `${req.url} ${req.method || ''} ${req.contentType || ''} ${getTypeName(req)}`.toLowerCase();
        if (query && !text.includes(query)) return false;
        if (typeFilter !== 'all' && getTypeName(req) !== typeFilter) return false;
        if (statusFilter === 'pending' && !req.pending) return false;
        if (/^[2-5]xx$/.test(statusFilter)) {
          const group = Number(statusFilter[0]);
          if (req.status == null || Math.floor(req.status / 100) !== group) return false;
        }
        return true;
      });

      const selection = getTemporalSelection(activeTab);
      const rows = selection ? overviewRows.filter(req => {
        const start = Number(req.startedAt ?? req.recordedAt ?? 0);
        const duration = req.duration == null ? (req.pending ? Math.max(0,performance.now() - start) : 0) : Math.max(0,Number(req.duration) || 0);
        const end = start + duration;
        return !(end < selection.start || start > selection.end);
      }) : overviewRows;

      tbody.innerHTML = '';
      renderWaterfall(overviewRows);
      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-gray-500 italic">No recorded requests. Press Record to capture activity.</td></tr>';
        return;
      }

      rows.forEach(req => {
        const tr = document.createElement('tr');
        tr.className = `hover:bg-gray-800 border-b border-gray-800/50 cursor-pointer text-[10px] ${selectedRequest === req ? 'bg-[#2b2d31]' : ''}`;

        const name = document.createElement('td');
        name.className = 'p-2 text-indigo-300 font-mono truncate';
        name.title = req.url;
        name.style.maxWidth = '1px';
        const nameInner = document.createElement('div');
        nameInner.className = 'flex items-center min-w-0';
        nameInner.appendChild(createNetworkIcon(req));
        const urlLabel = document.createElement('span');
        urlLabel.className = 'truncate';
        urlLabel.textContent = getRequestName(req.url);
        nameInner.appendChild(urlLabel);
        name.appendChild(nameInner);

        const status = document.createElement('td');
        status.className = `p-2 ${getStatusClass(req.status)} font-semibold`;
        status.textContent = req.pending ? '…' : (req.status || 'ERR');

        const method = document.createElement('td');
        method.className = 'p-2 text-yellow-400';
        method.textContent = req.method || 'GET';

        const type = document.createElement('td');
        type.className = 'p-2 text-gray-400 truncate';
        type.textContent = getTypeName(req);
        type.title = `${getTypeName(req)}${req.contentType ? ' • ' + req.contentType : ''}${req.websocketFrame ? ' • ' + (req.frameCount || 0) + ' frames' : ''}`;

        const size = document.createElement('td');
        size.className = 'p-2 text-right text-gray-400';
        size.textContent = formatBytes(req.size);

        const time = document.createElement('td');
        time.className = 'p-2 text-right text-gray-400';
        time.textContent = req.duration == null ? '' : formatDuration(req.duration);

        tr.append(name,status,method,type,size,time);
        tr.onclick = () => showDetails(req);
        tbody.appendChild(tr);
      });

      requestAnimationFrame(() => {
        if (followBottom && scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
        else if (scrollContainer) scrollContainer.scrollTop = previousScrollTop;
      });
    }

    function headerTable(obj) {
      const rows = Object.entries(obj || {});
      if (!rows.length) return '<div class="p-3 text-gray-500 italic">No headers recorded.</div>';
      return `<table class="w-full text-left border-collapse text-[10px]"><tbody>${rows.map(([key,value]) => `<tr class="border-b border-gray-800/60"><td class="p-2 align-top text-indigo-300 w-1/3">${sanitizeHTML(key)}</td><td class="p-2 text-gray-300 break-all">${sanitizeHTML(value)}</td></tr>`).join('')}</tbody></table>`;
    }

    function revokePreviewUrl() {
      if (activePreviewUrl) {
        try { URL.revokeObjectURL(activePreviewUrl); } catch(e) {}
        activePreviewUrl = null;
      }
    }

    function sanitizePreviewHtml(html) {
      try {
        const doc = new DOMParser().parseFromString(String(html || ''),'text/html');
        doc.querySelectorAll('script,iframe,frame,object,embed,portal,meta[http-equiv]').forEach(node => node.remove());
        doc.querySelectorAll('*').forEach(node => {
          Array.from(node.attributes).forEach(attr => {
            if (/^on/i.test(attr.name) || /^(?:javascript|vbscript):/i.test(attr.value)) node.removeAttribute(attr.name);
          });
        });
        return '<!doctype html>' + doc.documentElement.outerHTML;
      } catch(e) { return String(html || ''); }
    }

    function getResponseLanguage(req,text) {
      const contentType = String(req?.contentType || '').toLowerCase().split(';')[0].trim();
      if (contentType.includes('json')) return 'javascript';
      if (contentType.includes('javascript') || contentType.includes('ecmascript')) return 'javascript';
      if (contentType.includes('css')) return 'css';
      if (contentType.includes('html') || contentType.includes('xml') || contentType.includes('svg')) return 'html';

      const rawUrl = String(req?.url || '').split('#')[0];
      const path = rawUrl.split('?')[0].toLowerCase();
      if (/\.(?:m?js|cjs)$/.test(path)) return 'javascript';
      if (/\.css$/.test(path)) return 'css';
      if (/\.(?:html?|xhtml|xml|svg)$/.test(path)) return 'html';

      return DevTools.syntax.inferLanguage('',text);
    }

    function makeResponseCode(req,text,className) {
      const language = getResponseLanguage(req,text);
      return DevTools.syntax.makeCode(text,language,className);
    }

    async function renderPreview(req,container) {
      if (!container) return;
      revokePreviewUrl();
      container.innerHTML = '';
      container.className = 'flex-1 min-h-0 overflow-auto bg-[#151619]';
      if (req.websocketFrame) {
        const label = document.createElement('div');
        label.className = 'px-3 pt-2 text-[9px] text-gray-500 uppercase tracking-wider';
        label.textContent = `Latest WebSocket payload • ${req.frameCount || 0} frames`;
        const pre = document.createElement('pre');
        pre.className = 'm-0 p-3 whitespace-pre-wrap break-all text-[10px] text-emerald-400';
        pre.textContent = req.websocketPayload || '';
        container.append(label,pre);
        return;
      }

      const contentType = String(req.contentType || '').toLowerCase().split(';')[0].trim();
      if (!req.response && !req.responseText) {
        const empty = document.createElement('div');
        empty.className = 'p-4 text-gray-500 italic';
        empty.textContent = req.pending ? 'Request is still pending.' : 'Response body was not retained. Record the request before it starts to capture a preview.';
        container.appendChild(empty);
        return;
      }

      if (contentType === 'text/html' && req.responseText != null) {
        const toolbar = document.createElement('div');
        toolbar.className = 'flex items-center gap-1 px-2 py-1 border-b border-gray-800 bg-[#111214] flex-none';
        const renderedButton = document.createElement('button');
        renderedButton.className = 'px-1.5 py-0.5 rounded text-[9px] dt-subtab active';
        renderedButton.textContent = 'Rendered';
        const sourceButton = document.createElement('button');
        sourceButton.className = 'px-1.5 py-0.5 rounded text-[9px] dt-subtab';
        sourceButton.textContent = 'Source';

        const view = document.createElement('div');
        view.className = 'flex-1 min-h-0 overflow-hidden';

        const frame = document.createElement('iframe');
        frame.className = 'w-full h-full min-h-[220px] border-0 bg-white';
        frame.setAttribute('sandbox','');
        frame.srcdoc = sanitizePreviewHtml(req.responseText);

        const source = makeResponseCode(req,req.responseText,'w-full h-full min-h-0 p-3 text-[10px] overflow-auto whitespace-pre-wrap break-all');
        source.classList.add('hidden');
        view.append(frame,source);

        renderedButton.onclick = () => {
          renderedButton.classList.add('active');
          sourceButton.classList.remove('active');
          frame.classList.remove('hidden');
          source.classList.add('hidden');
        };
        sourceButton.onclick = () => {
          sourceButton.classList.add('active');
          renderedButton.classList.remove('active');
          source.classList.remove('hidden');
          frame.classList.add('hidden');
        };

        toolbar.append(renderedButton,sourceButton);
        container.append(toolbar,view);
        return;
      }

      if (req.responseText != null && isTextualContent(contentType)) {
        const code = makeResponseCode(req,req.responseText,'w-full h-full min-h-0 p-3 text-[10px] overflow-auto whitespace-pre-wrap break-all');
        container.appendChild(code);
        return;
      }

      if (contentType.startsWith('image/') && req.response) {
        try {
          const blob = await req.response.clone().blob();
          activePreviewUrl = URL.createObjectURL(blob);
          const img = document.createElement('img');
          img.src = activePreviewUrl;
          img.className = 'block max-w-full max-h-full mx-auto object-contain p-3';
          img.alt = req.url;
          container.appendChild(img);
          return;
        } catch(e) {}
      }

      if (contentType.startsWith('audio/') && req.response) {
        try {
          const blob = await req.response.clone().blob();
          activePreviewUrl = URL.createObjectURL(blob);
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = activePreviewUrl;
          audio.className = 'm-4 w-[calc(100%-2rem)]';
          container.appendChild(audio);
          return;
        } catch(e) {}
      }

      if (contentType.startsWith('video/') && req.response) {
        try {
          const blob = await req.response.clone().blob();
          activePreviewUrl = URL.createObjectURL(blob);
          const video = document.createElement('video');
          video.controls = true;
          video.src = activePreviewUrl;
          video.className = 'block max-w-full max-h-full mx-auto p-3';
          container.appendChild(video);
          return;
        } catch(e) {}
      }

      if (contentType === 'application/pdf' && req.response) {
        try {
          const blob = await req.response.clone().blob();
          activePreviewUrl = URL.createObjectURL(blob);
          const frame = document.createElement('iframe');
          frame.className = 'w-full h-full min-h-[260px] border-0';
          frame.src = activePreviewUrl;
          container.appendChild(frame);
          return;
        } catch(e) {}
      }

      const pre = document.createElement('pre');
      pre.className = 'm-0 p-3 whitespace-pre-wrap break-all text-[10px] text-emerald-400';
      pre.textContent = req.responseText ?? `[Binary response • ${formatBytes(req.size) || 0}]`;
      container.appendChild(pre);
    }

    async function showDetails(req) {
      const drawer = document.getElementById('network-detail-drawer');
      if (!drawer) return;
      selectedRequest = req || null;
      revokePreviewUrl();
      if (!req) {
        drawer.classList.add('hidden');
        return;
      }

      const detailTabs = ['headers','preview','response','timing'];
      drawer.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between px-2 py-1 border-b border-gray-800 flex-shrink-0';
      const left = document.createElement('div');
      left.className = 'flex items-center gap-1';
      detailTabs.forEach(name => {
        const button = document.createElement('button');
        button.className = `dt-subtab ${detailTab === name ? 'active' : ''}`;
        button.textContent = name[0].toUpperCase() + name.slice(1);
        button.onclick = () => setDetailTab(name);
        left.appendChild(button);
      });
      const close = document.createElement('button');
      close.className = 'text-gray-400 hover:text-white px-1';
      close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      close.onclick = closeDetails;
      header.append(left,close);

      const urlLine = document.createElement('div');
      urlLine.className = 'px-2 py-1.5 border-b border-gray-800 bg-[#0f1012] text-[10px] flex-shrink-0';
      urlLine.innerHTML = `<span class="text-gray-500">URL</span> <span class="text-cyan-300 break-all">${sanitizeHTML(req.url)}</span>`;

      const body = document.createElement('div');
      body.className = 'flex-1 min-h-0 overflow-hidden';

      if (detailTab === 'headers') {
        body.innerHTML = `<div class="grid grid-cols-2 gap-3 p-2 overflow-auto h-full"><div><div class="text-gray-500 mb-1 uppercase text-[9px] tracking-wider">Request</div>${headerTable(req.requestHeaders)}${req.method ? `<div class="mt-2 text-[10px] text-gray-500">Method <span class="text-yellow-400">${sanitizeHTML(req.method)}</span></div>` : ''}</div><div><div class="text-gray-500 mb-1 uppercase text-[9px] tracking-wider">Response</div>${headerTable(req.responseHeaders)}${req.status ? `<div class="mt-2 text-[10px] text-gray-500">Status <span class="${getStatusClass(req.status)}">${sanitizeHTML(req.status)}</span></div>` : ''}</div></div>`;
      } else if (detailTab === 'response') {
        const text = req.responseText ?? '[Response body was not retained. Record the request before it starts to capture the body.]';
        const pre = makeResponseCode(req,text,'m-0 h-full min-h-0 w-full p-3 text-[10px] overflow-auto whitespace-pre-wrap break-all');
        body.appendChild(pre);
      } else if (detailTab === 'timing') {
        body.innerHTML = `<div class="grid grid-cols-2 gap-3 p-3 text-[10px]"><div><span class="text-gray-500">Started</span><div class="text-gray-200">${req.startedAt == null ? '-' : req.startedAt.toFixed(2) + ' ms'}</div></div><div><span class="text-gray-500">Duration</span><div class="text-gray-200">${req.duration == null ? (req.pending ? 'Pending' : '-') : formatDuration(req.duration)}</div></div><div><span class="text-gray-500">Size</span><div class="text-gray-200">${formatBytes(req.size) || '-'}</div></div><div><span class="text-gray-500">Recorded</span><div class="text-gray-200">${req.recordedAt ? new Date(req.recordedAt).toLocaleTimeString() : '-'}</div></div></div>`;
      } else {
        await renderPreview(req,body);
      }

      drawer.append(header,urlLine,body);
      drawer.classList.remove('hidden');
    }

    function closeDetails() {
      revokePreviewUrl();
      const drawer = document.getElementById('network-detail-drawer');
      if (drawer) drawer.classList.add('hidden');
      selectedRequest = null;
    }

    function clearTab(tab) {
      if (!tab) return;
      tab.devtools = tab.devtools || {};
      (tab.devtools.networkLog || []).forEach(revokeNetworkIconUrl);
      tab.devtools.networkLog = [];
      delete tab.devtools.networkSelection;
      if (tab.id === activeTabId) {
        revokePreviewUrl();
        selectedRequest = null;
        const tbody = document.getElementById('network-log-body');
        if (tbody) tbody.innerHTML = '';
        const waterfall = document.getElementById('network-waterfall');
        if (waterfall) waterfall.innerHTML = '';
        closeDetails();
        const badge = document.getElementById('dt-network-count');
        if (badge) { badge.textContent = '0'; badge.classList.add('hidden'); }
      }
    }

    function clear() {
      clearTab(getActiveTab());
    }

    function getPageTab(pageOrTab) {
      return pageOrTab?.tab || pageOrTab?.devtoolsTab || (pageOrTab?.id && pageOrTab?.devtools ? pageOrTab : null) || null;
    }

    async function requestForTab(page,...args) {
      const previous = context;
      const tab = getPageTab(page);
      context = tab;
      try {
        return await browserNetwork.request(...args);
      } catch(error) {
        failPendingRequest(tab,args[0],args[3] || 'fetch',error);
        throw error;
      } finally {
        context = previous;
      }
    }

    async function socketForTab(page,...args) {
      const sourceTab = getPageTab(page);
      const tab = getNetworkRootTab(sourceTab);
      if (sourceTab && tab && isRecording(tab) && args[0]) {
        let url;
        try { url = new URL(args[0],page.location?.url || location.href).href; } catch(e) { url = String(args[0]); }
        const contexts = socketTabs.get(url) || [];
        contexts.push({tab,sourceTab,recording:true});
        if (contexts.length > 25) contexts.shift();
        socketTabs.set(url,contexts);
      }
      const previous = context;
      context = sourceTab;
      try { return await browserNetwork.socket(...args); }
      finally { context = previous; }
    }

    function createPageProxy(page) {
      return new Proxy(browserNetwork, {
        get(target,prop) {
          const value = Reflect.get(target,prop,target);
          if (prop === 'request') return (...args) => requestForTab(page,...args);
          if (prop === 'socket') return (...args) => socketForTab(page,...args);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
    }

    function getContext(){ return context; }
    function getRequestTab(request){ return requestTabs.get(request) || null; }

    return { getLog, isRecording, toggleRecording, updateRecordingUI, getTypeName, record, render, clear, clearTab, setDetailTab, showDetails, closeDetails, getPageTab, requestForTab, socketForTab, createPageProxy, getRequestHeaders, getResponseHeaders, isTextualContent, formatBytes, formatDuration, getContext, getRequestTab, handleRequestStart, handleRequestEnd, handleSocketStart, handleSocketEnd, handleWebsocket };
  })(),

  elements: (() => {
    let selected = null;
    let nodeMap = new WeakMap();
    let detailTab = 'html';
    const picker = {active:false,overlay:null,highlight:null,label:null};

    function getOriginalAttributeInfo(node,attrName,attrValue) {
      const raw = node.getAttribute('data-raw-' + attrName);
      if (raw != null) return {value:raw,processed:attrValue};
      return {value:attrValue,processed:null};
    }

    function getLabel(node) {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return '';
      const tag = node.tagName.toLowerCase();
      const id = node.id ? `#${node.id}` : '';
      const classes = typeof node.className === 'string' ? node.className.trim().split(/\s+/).filter(Boolean).slice(0,3).map(v => '.' + v).join('') : '';
      return tag + id + classes;
    }

    function buildAttributeHtml(node) {
      let attrHtml = '';
      Array.from(node.attributes).forEach(attr => {
        if (attr.name.startsWith('data-raw-')) return;
        const info = getOriginalAttributeInfo(node,attr.name,attr.value);
        attrHtml += ` <span class="dom-attr-name">${sanitizeHTML(attr.name)}</span>=<span class="dom-attr-val">"${sanitizeHTML(info.value)}"</span>`;
        if (info.processed != null) attrHtml += `<span class="text-[9px] text-gray-600" title="Processed value is available in the live DOM">*</span>`;
      });
      return attrHtml;
    }

    function createChildren(container,node,depth) {
      Array.from(node.children).forEach(child => container.appendChild(buildNode(child,depth)));
    }

    function buildNode(node,depth = 0) {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
      const div = document.createElement('div');
      div.className = 'dom-node-container';
      div.dataset.domDepth = depth;
      div.dataset.domSearch = getLabel(node).toLowerCase();

      const hasChildren = node.children.length > 0;
      const nodeWrapper = document.createElement('div');
      nodeWrapper.className = 'dom-node';
      nodeWrapper.dataset.domNode = getLabel(node);

      const caretSpan = document.createElement('span');
      caretSpan.className = 'dom-caret';
      caretSpan.textContent = hasChildren ? (depth < 2 ? '▼' : '▶') : ' ';

      const contentSpan = document.createElement('span');
      contentSpan.className = 'dom-node-content';
      contentSpan.innerHTML = `&lt;<span class="dom-tag">${sanitizeHTML(node.tagName.toLowerCase())}</span>${buildAttributeHtml(node)}&gt;`;
      nodeWrapper.append(caretSpan,contentSpan);
      div.appendChild(nodeWrapper);
      nodeMap.set(node,nodeWrapper);

      let childrenContainer = null;
      let populated = false;
      const populateChildren = () => {
        if (populated || !hasChildren) return;
        childrenContainer = document.createElement('div');
        createChildren(childrenContainer,node,depth + 1);
        div.appendChild(childrenContainer);
        populated = true;
      };
      if (hasChildren) {
        if (depth < 2) populateChildren();
        caretSpan.onclick = e => {
          e.stopPropagation();
          populateChildren();
          const collapsed = childrenContainer.style.display === 'none';
          childrenContainer.style.display = collapsed ? 'block' : 'none';
          caretSpan.textContent = collapsed ? '▼' : '▶';
        };
      }
      contentSpan.onclick = e => {
        e.stopPropagation();
        select(node,true);
      };
      return div;
    }

    function select(node,scrollTree = false) {
      selected = node;
      refresh(node,scrollTree);
      renderDetails();
    }

    function refresh(nodeToSelect = selected,scrollTree = false) {
      const container = document.getElementById('dom-tree-container');
      if (!container) return;
      container.innerHTML = '';
      nodeMap = new WeakMap();
      const doc = DevTools.util.getActiveDocument();
      if (!doc || !doc.documentElement) {
        container.innerHTML = '<div class="text-gray-500 italic p-2">Frame document loading...</div>';
        return;
      }
      const treeRoot = buildNode(doc.documentElement,0);
      container.appendChild(treeRoot);
      const target = nodeToSelect && nodeToSelect.ownerDocument === doc ? nodeToSelect : (selected && selected.ownerDocument === doc ? selected : doc.documentElement);
      if (target) {
        selected = target;
        updateBreadcrumbs(target);
        const wrapper = nodeMap.get(target);
        if (wrapper && scrollTree) wrapper.scrollIntoView({behavior:'smooth',block:'center'});
        document.querySelectorAll('.dom-node.selected').forEach(n => n.classList.remove('selected'));
        wrapper?.classList.add('selected');
      }
    }

    function updateBreadcrumbs(node) {
      const out = document.getElementById('dom-breadcrumbs');
      if (!out) return;
      const path = [];
      let current = node;
      while (current && current.nodeType === Node.ELEMENT_NODE && path.length < 10) {
        path.unshift(current);
        current = current.parentElement;
      }
      out.innerHTML = '';
      path.forEach((item,index) => {
        const span = document.createElement('span');
        span.className = 'cursor-pointer hover:text-gray-200';
        span.textContent = getLabel(item) || item.tagName.toLowerCase();
        span.onclick = () => select(item,true);
        out.appendChild(span);
        if (index < path.length - 1) out.appendChild(document.createTextNode('  ›  '));
      });
    }

    function filterTree(value) {
      const query = String(value || '').trim().toLowerCase();
      document.querySelectorAll('#dom-tree-container .dom-node-container').forEach(el => {
        if (!query) { el.style.display = ''; return; }
        const selfMatch = (el.dataset.domSearch || '').includes(query);
        const childMatch = el.querySelector('.dom-node-container[style=""]') || false;
        el.style.display = selfMatch || childMatch ? '' : 'none';
      });
    }

    function switchDetailTab(tabName) {
      detailTab = tabName;
      ['html','styles','properties','attributes'].forEach(name => document.getElementById(`element-detail-tab-${name}`)?.classList.toggle('active',name === tabName));
      renderDetails();
    }

    function renderDetails() {
      const summary = document.getElementById('element-summary');
      const content = document.getElementById('element-detail-content');
      if (!summary || !content) return;
      if (!selected || !selected.isConnected) {
        summary.textContent = 'Select an element to inspect it.';
        content.innerHTML = '';
        return;
      }
      summary.innerHTML = `<span class="text-indigo-300 font-mono">${sanitizeHTML(getLabel(selected))}</span><span class="text-gray-500 ml-2">${sanitizeHTML(selected.namespaceURI || 'HTML')}</span>`;
      updateBreadcrumbs(selected);
      content.innerHTML = '';
      if (detailTab === 'html') renderHtml(content);
      else if (detailTab === 'styles') renderStyles(content);
      else if (detailTab === 'properties') renderProperties(content);
      else renderAttributes(content);
    }

    function renderHtml(container) {
      container.classList.add('flex','flex-col','min-h-0');
      const editorWrap = document.createElement('div');
      editorWrap.className = 'flex-1 min-h-0 overflow-hidden';
      const editor = document.createElement('div');
      editor.id = 'selected-element-editor';
      editor.className = 'dt-code-editor w-full h-full bg-[#1e1f22] text-gray-200 font-mono text-xs p-3 outline-none overflow-auto';
      editor.style.minHeight = '180px';
      editor.dataset.rawHtml = selected.outerHTML;
      editor.textContent = selected.outerHTML;
      editorWrap.appendChild(editor);
      container.appendChild(editorWrap);
      DevTools.syntax.attachEditable(editor,'html');
      const toolbar = document.createElement('div');
      toolbar.className = 'flex items-center gap-1 p-2 border-b border-gray-800';
      const apply = document.createElement('button');
      apply.className = 'bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-[10px] font-semibold';
      apply.textContent = 'Apply';
      apply.onclick = applySelectedHtml;
      const copy = document.createElement('button');
      copy.className = 'text-gray-400 hover:text-white px-2 py-1 text-[10px]';
      copy.textContent = 'Copy';
      copy.onclick = () => DevTools.sources.copyText(editor.value);
      const scroll = document.createElement('button');
      scroll.className = 'text-gray-400 hover:text-white px-2 py-1 text-[10px]';
      scroll.textContent = 'Scroll to node';
      scroll.onclick = scrollSelected;
      toolbar.append(apply,copy,scroll);
      container.appendChild(toolbar);
      const textInfo = document.createElement('div');
      textInfo.className = 'p-2 text-[10px] text-gray-500';
      textInfo.textContent = `Text content: ${String(selected.textContent || '').trim().slice(0,300) || '[empty]'}`;
      container.appendChild(textInfo);
    }

    function renderStyles(container) {
      let styles;
      try { styles = selected.ownerDocument.defaultView.getComputedStyle(selected); } catch(e) { styles = null; }
      if (!styles) { container.innerHTML = '<div class="p-3 text-gray-500">Computed styles unavailable.</div>'; return; }
      const filter = document.createElement('input');
      filter.className = 'm-2 w-[calc(100%-1rem)] bg-[#111214] border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-200 outline-none';
      filter.placeholder = 'Filter properties…';
      const table = document.createElement('table');
      table.className = 'w-full border-collapse font-mono text-[10px]';
      const render = () => {
        const query = filter.value.toLowerCase();
        table.innerHTML = '';
        for (let i = 0; i < styles.length; i++) {
          const name = styles[i];
          if (query && !name.toLowerCase().includes(query)) continue;
          const value = styles.getPropertyValue(name);
          if (!value) continue;
          const tr = document.createElement('tr');
          tr.className = 'border-b border-gray-800/60';
          tr.innerHTML = `<td class="px-2 py-1 text-gray-500 align-top w-1/2">${sanitizeHTML(name)}</td><td class="px-2 py-1 text-gray-200 break-all">${sanitizeHTML(value)}</td>`;
          table.appendChild(tr);
        }
      };
      filter.oninput = render;
      container.append(filter,table);
      render();
    }

    function renderProperties(container) {
      const values = {nodeName:selected.nodeName,nodeType:selected.nodeType,id:selected.id,className:typeof selected.className === 'string' ? selected.className : String(selected.className || ''),textContent:String(selected.textContent || '').trim().slice(0,1000),childElementCount:selected.childElementCount,parentElement:selected.parentElement ? getLabel(selected.parentElement) : '',isConnected:selected.isConnected};
      if ('value' in selected) values.value = selected.value;
      if ('href' in selected) values.href = selected.href;
      if ('src' in selected) values.src = selected.getAttribute('data-raw-src') || selected.src;
      if ('checked' in selected) values.checked = selected.checked;
      if ('disabled' in selected) values.disabled = selected.disabled;
      const table = document.createElement('table');
      table.className = 'w-full border-collapse text-[10px] font-mono';
      Object.entries(values).forEach(([key,value]) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-800/60';
        tr.innerHTML = `<td class="px-2 py-1 text-gray-500 align-top w-1/3">${sanitizeHTML(key)}</td><td class="px-2 py-1 text-gray-200 break-all">${sanitizeHTML(String(value ?? ''))}</td>`;
        table.appendChild(tr);
      });
      container.appendChild(table);
    }

    function renderAttributes(container) {
      const table = document.createElement('table');
      table.className = 'w-full border-collapse text-[10px] font-mono';
      Array.from(selected.attributes).forEach(attr => {
        if (attr.name.startsWith('data-raw-')) return;
        const info = getOriginalAttributeInfo(selected,attr.name,attr.value);
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-800/60';
        tr.innerHTML = `<td class="px-2 py-1 text-gray-500 align-top w-1/3">${sanitizeHTML(attr.name)}</td><td class="px-2 py-1 text-indigo-300 break-all">${sanitizeHTML(info.value)}</td><td class="px-2 py-1 text-gray-500 break-all">${info.processed != null ? sanitizeHTML(info.processed) : ''}</td>`;
        table.appendChild(tr);
      });
      const head = document.createElement('div');
      head.className = 'grid grid-cols-3 px-2 py-1 text-[9px] uppercase tracking-wider text-gray-600 border-b border-gray-800';
      head.innerHTML = '<span>Name</span><span>Original</span><span>Active</span>';
      container.append(head,table);
    }

    function applySelectedHtml() {
      const node = selected;
      const editor = document.getElementById('selected-element-editor');
      if (!node || !editor || !node.parentElement) return;
      const parent = node.parentElement;
      const oldIndex = Array.from(parent.children).indexOf(node);
      try {
        const html = editor.value != null ? editor.value : (editor.textContent || '');
        node.outerHTML = html;
        const next = parent.children[oldIndex] || parent.children[Math.max(0,oldIndex - 1)];
        selected = next || parent;
        refresh(selected,true);
        renderDetails();
        showToast('Element updated','success');
      } catch(e) {
        showToast('Could not apply HTML: ' + e.message,'error');
      }
    }

    function scrollSelected() {
      try { selected?.scrollIntoView({behavior:'smooth',block:'center'}); } catch(e) {}
    }

    function togglePicker() {
      if (picker.active) stopPicker();
      else startPicker();
    }

    function startPicker() {
      const tab = getActiveTab();
      if (!tab || !tab.iframe) return showToast('No active page to inspect','error');
      const doc = DevTools.util.getActiveDocument();
      if (!doc) return showToast('Page is still loading','error');
      stopPicker();
      picker.active = true;
      document.getElementById('dt-pick-element')?.classList.add('bg-emerald-600');
      const overlay = document.createElement('div');
      overlay.id = 'dt-picker-overlay';
      overlay.style.cssText = 'position:fixed;z-index:99999;pointer-events:auto;cursor:crosshair;';
      const highlight = document.createElement('div');
      highlight.style.cssText = 'position:absolute;pointer-events:none;border:2px solid #38bdf8;background:rgba(56,189,248,.10);box-sizing:border-box;display:none;';
      const label = document.createElement('div');
      label.style.cssText = 'position:absolute;pointer-events:none;background:#111214;color:#e5e7eb;border:1px solid #38bdf8;padding:2px 4px;font:10px monospace;white-space:nowrap;display:none;';
      overlay.append(highlight,label);
      document.body.appendChild(overlay);
      picker.overlay = overlay;
      picker.highlight = highlight;
      picker.label = label;
      const updateBounds = () => {
        if (!picker.overlay || !tab.iframe.isConnected) return;
        const rect = tab.iframe.getBoundingClientRect();
        overlay.style.left = rect.left + 'px';
        overlay.style.top = rect.top + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
      };
      updateBounds();
      window.addEventListener('resize',updateBounds);
      overlay._updateBounds = updateBounds;
      overlay.addEventListener('mousemove',event => {
        const rect = tab.iframe.getBoundingClientRect();
        const node = doc.elementFromPoint(event.clientX - rect.left,event.clientY - rect.top);
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
          highlight.style.display = 'none';
          label.style.display = 'none';
          return;
        }
        const nodeRect = node.getBoundingClientRect();
        highlight.style.display = 'block';
        highlight.style.left = nodeRect.left + 'px';
        highlight.style.top = nodeRect.top + 'px';
        highlight.style.width = Math.max(1,nodeRect.width) + 'px';
        highlight.style.height = Math.max(1,nodeRect.height) + 'px';
        label.textContent = getLabel(node);
        label.style.display = 'block';
        label.style.left = Math.max(0,nodeRect.left) + 'px';
        label.style.top = Math.max(0,nodeRect.top - 18) + 'px';
      });
      overlay.addEventListener('click',event => {
        const rect = tab.iframe.getBoundingClientRect();
        const node = doc.elementFromPoint(event.clientX - rect.left,event.clientY - rect.top);
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          select(node,true);
          DevTools.ui.switchTab('elements');
        }
        stopPicker();
      });
    }

    function stopPicker() {
      if (picker.overlay?._updateBounds) window.removeEventListener('resize',picker.overlay._updateBounds);
      picker.overlay?.remove();
      picker.overlay = null;
      picker.highlight = null;
      picker.label = null;
      picker.active = false;
      document.getElementById('dt-pick-element')?.classList.remove('bg-emerald-600');
    }

    function inspect(targetInfo) {
      const node = targetInfo?.target;
      if (node?.nodeType === Node.ELEMENT_NODE) selected = node;
      const panel = document.getElementById('devtools-panel');
      if (panel?.classList.contains('hidden')) DevTools.ui.toggle();
      DevTools.ui.switchTab('elements');
      refresh(selected,true);
      renderDetails();
    }

    function isPickerActive(){ return picker.active; }

    return { get selected(){return selected;}, select, refresh, filter:filterTree, switchDetailTab, renderDetails, togglePicker, startPicker, stopPicker, inspect, getLabel, scrollSelected, applySelectedHtml, isPickerActive };
  })(),

  sources: (() => {
    let mode = 'original';
    let entry = null;
    let search = '';
    const sourceBuckets = new Map();
    const sourceRequests = new Map();
    const frameDocumentTrackers = new WeakMap();

    function resolveUrl(rawUrl,baseUrl) {
      try { return new URL(rawUrl,baseUrl).href; } catch(e) { return rawUrl; }
    }

    function sourceEntryNameFromUrl(url,index,fallback) {
      try {
        const u = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        const name = decodeURIComponent(parts[parts.length - 1] || fallback);
        return name || fallback;
      } catch(e) { return fallback || `(resource ${index + 1})`; }
    }

    // Sources owns its own URL naming/grouping. Keep this separate from the
    // Network panel's final-segment display name so Network formatting can
    // never flatten or otherwise alter the Sources hierarchy.
    function sourcePathFromUrl(url) {
      try {
        const u = new URL(url);
        return u.pathname || '/';
      } catch(e) { return '/'; }
    }


    function getSourceBucket(tab) {
      if (!tab) return null;
      let bucket = sourceBuckets.get(tab);
      if (!bucket) {
        bucket = new Map();
        sourceBuckets.set(tab,bucket);
      }
      return bucket;
    }

    function looksLikeJavaScript(url,type,contentType) {
      const u = String(url || '');
      const t = String(type || '').toLowerCase();
      const c = String(contentType || '').toLowerCase();
      return t === 'import' || /(?:^|[/?#])[^/?#]+\.(?:js|mjs)(?:[?#]|$)/i.test(u) || c.includes('javascript') || c.includes('ecmascript');
    }

    function looksLikeCSS(url,type,contentType) {
      const u = String(url || '');
      const t = String(type || '').toLowerCase();
      const c = String(contentType || '').toLowerCase();
      return t === 'stylesheet' || t === 'css' || /(?:^|[/?#])[^/?#]+\.css(?:[?#]|$)/i.test(u) || c.includes('text/css');
    }

    function looksLikeSource(url,type,contentType) {
      return looksLikeJavaScript(url,type,contentType) || looksLikeCSS(url,type,contentType);
    }

    function handleRequestStart(request,type) {
      if (!request) return;
      let url;
      try { url = new URL(request.url).href; } catch(e) { return; }
      if (!looksLikeSource(url,type,'')) return;
      const tab = DevTools.network.getRequestTab(request) || DevTools.network.getContext() || getActiveTab();
      if (!tab) return;
      sourceRequests.set(request,{tab,url,type,startedAt:performance.now()});
    }

    async function handleRequestEnd(response,request,type) {
      if (!response || !request) return;
      let pending = sourceRequests.get(request);
      let url;
      try { url = new URL(request.url).href; } catch(e) { return; }
      let contentType = '';
      try { contentType = response.headers?.get?.('content-type') || ''; } catch(e) {}
      if (!pending) {
        if (!looksLikeSource(url,type,contentType)) return;
        const tab = DevTools.network.getRequestTab(request) || DevTools.network.getContext() || getActiveTab();
        if (!tab) return;
        pending = {tab,url,type,startedAt:performance.now()};
      }
      sourceRequests.delete(request);

      let text = null;
      try {
        const size = Number(response.headers?.get?.('content-length')) || 0;
        if (!size || size <= 8 * 1024 * 1024) text = await response.clone().text();
      } catch(e) {}
      if (text == null) return;

      const bucket = getSourceBucket(pending.tab);
      if (!bucket) return;
      bucket.set(pending.url,{
        url:pending.url,
        text,
        contentType,
        requestType:pending.type || type || '',
        loadedAt:Date.now()
      });

      if (DevTools.activeTab === 'sources' && pending.tab.id === activeTabId) refresh();
    }

    function extractStringToken(code,start) {
      const quote = code[start];
      if (quote !== '"' && quote !== "'") return null;
      let i = start + 1;
      while (i < code.length) {
        if (code[i] === '\\') { i += 2; continue; }
        if (code[i] === quote) {
          const raw = code.slice(start,i + 1);
          try { return {value:JSON.parse(quote === '"' ? raw : '"' + raw.slice(1,-1).replace(/\\'/g,"'").replace(/"/g,'\\"') + '"'),end:i + 1}; } catch(e) {
            try { return {value:raw.slice(1,-1),end:i + 1}; } catch(err) { return {value:'',end:i + 1}; }
          }
        }
        i++;
      }
      return null;
    }

    function lexModuleTokens(code) {
      const tokens = [];
      let i = 0;
      while (i < code.length) {
        const ch = code[i], next = code[i + 1];
        if (/\s/.test(ch)) { i++; continue; }
        if (ch === '/' && next === '/') {
          const n = code.indexOf('\n',i + 2);
          i = n < 0 ? code.length : n + 1;
          continue;
        }
        if (ch === '/' && next === '*') {
          const n = code.indexOf('*/',i + 2);
          i = n < 0 ? code.length : n + 2;
          continue;
        }
        if (ch === '"' || ch === "'") {
          const token = extractStringToken(code,i);
          if (token) { tokens.push({type:'string',value:token.value,start:i,end:token.end}); i = token.end; continue; }
        }
        if (/[A-Za-z_$]/.test(ch)) {
          const m = code.slice(i).match(/^[A-Za-z_$][\w$]*/)[0];
          tokens.push({type:'word',value:m,start:i,end:i + m.length});
          i += m.length;
          continue;
        }
        tokens.push({type:'punct',value:ch,start:i,end:i + 1});
        i++;
      }
      return tokens;
    }

    function extractModuleSpecifiers(code) {
      const tokens = lexModuleTokens(String(code || ''));
      const specs = [];
      const add = value => {
        if (!value || typeof value !== 'string' || specs.includes(value)) return;
        specs.push(value);
      };

      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.type !== 'word' || (t.value !== 'import' && t.value !== 'export')) continue;

        if (t.value === 'import') {
          const next = tokens[i + 1];
          if (next?.value === '.') continue; // import.meta
          if (next?.value === '(') {
            const arg = tokens[i + 2];
            if (arg?.type === 'string') add(arg.value);
            continue;
          }
          if (next?.type === 'string') {
            add(next.value);
            continue;
          }
        }

        for (let j = i + 1; j < tokens.length; j++) {
          if (tokens[j].type === 'punct' && tokens[j].value === ';') break;
          if (tokens[j].type === 'word' && tokens[j].value === 'from') {
            const spec = tokens[j + 1];
            if (spec?.type === 'string') add(spec.value);
            break;
          }
          if (tokens[j].type === 'word' && (tokens[j].value === 'import' || tokens[j].value === 'export')) break;
        }
      }
      return specs;
    }

    function getSourceResource(tab,url) {
      const bucket = sourceBuckets.get(tab);
      return bucket?.get(url) || null;
    }

    function extractWrappedModuleSource(activeCode) {
      const marker = 'window.__executeCodeModule(';
      const startMarker = String(activeCode || '').indexOf(marker);
      if (startMarker < 0) return null;
      let i = startMarker + marker.length;
      while (/\s/.test(activeCode[i] || '')) i++;
      if (activeCode[i] !== '"') return null;
      const token = extractStringToken(activeCode,i);
      return token?.value || null;
    }

    function extractCSSImports(code) {
      const source = String(code || '');
      const specs = [];
      const add = value => {
        value = String(value || '').trim();
        if (!value || value.startsWith('#') || specs.includes(value)) return;
        specs.push(value);
      };

      let i = 0;
      let quote = null;
      while (i < source.length) {
        const ch = source[i], next = source[i + 1];
        if (quote) {
          if (ch === '\\') { i += 2; continue; }
          if (ch === quote) quote = null;
          i++;
          continue;
        }
        if (ch === '/' && next === '*') {
          const end = source.indexOf('*/',i + 2);
          i = end < 0 ? source.length : end + 2;
          continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; i++; continue; }

        if (ch === '@' && source.slice(i,i + 7).toLowerCase() === '@import') {
          const before = i === 0 ? '' : source[i - 1];
          const after = source[i + 7] || '';
          if (/[\w-]/.test(before) || /[\w-]/.test(after)) { i++; continue; }
          i += 7;
          while (/[\s\n\r\t]/.test(source[i] || '')) i++;

          if (source.slice(i,i + 4).toLowerCase() === 'url(') {
            i += 4;
            while (/[\s\n\r\t]/.test(source[i] || '')) i++;
            let value = '';
            if (source[i] === '"' || source[i] === "'") {
              const q = source[i++];
              while (i < source.length) {
                if (source[i] === '\\' && i + 1 < source.length) { value += source[i + 1]; i += 2; continue; }
                if (source[i] === q) { i++; break; }
                value += source[i++];
              }
            } else {
              while (i < source.length && source[i] !== ')') value += source[i++];
              value = value.trim();
            }
            while (i < source.length && source[i] !== ')') i++;
            if (source[i] === ')') i++;
            add(value);
            continue;
          }

          if (source[i] === '"' || source[i] === "'") {
            const q = source[i++];
            let value = '';
            while (i < source.length) {
              if (source[i] === '\\' && i + 1 < source.length) { value += source[i + 1]; i += 2; continue; }
              if (source[i] === q) { i++; break; }
              value += source[i++];
            }
            add(value);
            continue;
          }
        }
        i++;
      }
      return specs;
    }

    function getSourceText(tab,url) {
      const captured = getSourceResource(tab,url);
      if (captured?.text != null) return {text:captured.text,contentType:captured.contentType || ''};
      const network = findNetworkResource(tab,url);
      if (network?.responseText != null) return {text:network.responseText,contentType:network.contentType || ''};
      const decoded = decodeDataUriText(url);
      if (decoded != null) return {text:decoded,contentType:/^data:text\/css/i.test(url) ? 'text/css' : ''};
      return null;
    }

    function mergeModuleDependencies(tab,entries,pushEntry) {
      const byUrl = new Map();
      entries.forEach(item => {
        const key = item.url ? resolveUrl(item.url,tab.url) : '';
        if (key && !byUrl.has(key)) byUrl.set(key,item);
      });

      const queue = entries.filter(item => (item.type === 'js' || item.type === 'css') && item.original);
      const visited = new Set();
      while (queue.length) {
        const current = queue.shift();
        const currentUrl = resolveUrl(current.url || tab.url,tab.url);
        const sourceType = current.type === 'css' ? 'css' : 'js';
        const visitKey = sourceType + ':' + currentUrl;
        if (visited.has(visitKey)) continue;
        visited.add(visitKey);

        const specs = sourceType === 'css' ? extractCSSImports(current.original) : extractModuleSpecifiers(current.original);
        current.imports = [];
        current.importedBy = current.importedBy || [];
        specs.forEach(spec => {
          const resolved = resolveUrl(spec,currentUrl);
          current.imports.push({specifier:spec,url:resolved});
          let target = byUrl.get(resolved);
          if (!target) {
            const resource = getSourceText(tab,resolved);
            const type = sourceType === 'css' ? 'css' : 'js';
            target = {
              id:(sourceType === 'css' ? 'stylesheet-' : 'module-') + resolved,
              name:sourceEntryNameFromUrl(resolved,entries.length,type === 'css' ? 'style.css' : 'module.js'),
              type,
              url:resolved,
              deliveryUrl:resolved,
              activeUrl:resolved,
              original:resource?.text || '',
              active:resource?.text || '',
              kind:type === 'css' ? 'stylesheet' : 'module',
              importedModule:type === 'js' ? true : undefined,
              importedStylesheet:type === 'css' ? true : undefined,
              module:type === 'js',
              unavailable:!resource?.text
            };
            byUrl.set(resolved,target);
            pushEntry(target);
          }
          target.importedBy = target.importedBy || [];
          if (!target.importedBy.some(item => item.url === currentUrl)) target.importedBy.push({url:currentUrl,name:current.name});
          if (target.original && !visited.has((target.type || type) + ':' + resolved)) queue.push(target);
        });
      }
    }

    function decodeDataUriText(url) {
      if (!url || !/^data:/i.test(url)) return null;
      try {
        const comma = url.indexOf(',');
        if (comma < 0) return null;
        const meta = url.slice(5,comma);
        const payload = url.slice(comma + 1).split('#')[0];
        if (/;base64/i.test(meta)) {
          const binary = atob(payload);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return new TextDecoder().decode(bytes);
        }
        return decodeURIComponent(payload);
      } catch(e) { return null; }
    }

    function findNetworkResource(tab,url) {
      const absolute = resolveUrl(url,tab?.url || location.href);
      const log = DevTools.network.getLog(tab);
      for (let i = log.length - 1; i >= 0; i--) if (log[i].url === absolute) return log[i];
      return null;
    }

    function classify(url,contentType = '') {
      const type = String(contentType || '').toLowerCase();
      if (type.includes('javascript') || /\.(?:js|mjs)(?:[?#]|$)/i.test(url)) return 'js';
      if (type.includes('css') || /\.css(?:[?#]|$)/i.test(url)) return 'css';
      if (type.includes('html') || /\.html?(?:[?#]|$)/i.test(url)) return 'html';
      return 'file';
    }

    function dataType(url) {
      const match = /^data:([^;,]+)/i.exec(url || '');
      return classify('',match ? match[1] : '');
    }

    function buildEntries(tab,doc) {
      const entries = [];
      const seen = new Set();
      const idPrefix = tab.subframe ? 'frame-' + String(tab.id || Math.random().toString(36).slice(2)) + '-' : 'top-' + String(tab.id || 'page') + '-';
      const makeId = (prefix,index) => idPrefix + prefix + index;
      const rawCandidate = tab.devtools?.rawDocument || '';
      const raw = !isBlankDocumentSource(rawCandidate) ? rawCandidate : (tab.devtools?.documentSource || '');
      const rawDoc = raw ? new DOMParser().parseFromString(raw,'text/html') : null;
      const processedDoc = doc;

      const push = value => {
        if (!value) return;
        value.sourceTab = tab;
        if (!value.id) value.id = makeId('entry-', entries.length);
        if (seen.has(value.id)) return;
        seen.add(value.id);
        entries.push(value);
      };

      const pageUrl = tab.url;
      const pageName = sourceEntryNameFromUrl(pageUrl,0,'index.html');
      push({id:makeId('document-',0),name:pageName,type:'html',url:pageUrl,deliveryUrl:pageUrl,sourcePath:sourcePathFromUrl(pageUrl),activeUrl:pageUrl,original:raw || '// Original document source was not retained.',active:processedDoc.documentElement?.outerHTML || '',kind:'page'});

      const rawScripts = rawDoc ? Array.from(rawDoc.scripts).filter(script => !isBrowserInjectedScript(script)) : [];
      const liveScripts = Array.from(processedDoc.scripts);
      const liveExternalScripts = new Map();
      liveScripts.forEach(script => {
        const rawSrc = script.getAttribute('data-raw-src');
        if (rawSrc) liveExternalScripts.set(resolveUrl(rawSrc,pageUrl),script);
      });
      const liveInlineScripts = liveScripts.filter(script => !script.getAttribute('data-raw-src') && !isBrowserInjectedScript(script) && !script.textContent?.includes('window.__pageRegistry'));
      let liveInlineIndex = 0;
      rawScripts.forEach((script,index) => {
        const rawUrl = script.getAttribute('src');
        const absoluteUrl = rawUrl ? resolveUrl(rawUrl,pageUrl) : null;
        const live = rawUrl ? liveExternalScripts.get(absoluteUrl) : liveInlineScripts[liveInlineIndex++];
        const net = absoluteUrl ? findNetworkResource(tab,absoluteUrl) : null;
        const captured = absoluteUrl ? getSourceResource(tab,absoluteUrl) : null;
        let original = script.textContent || '';
        if (!original && captured?.text != null) original = captured.text;
        if (!original && net?.responseText != null) original = net.responseText;
        const activeUrl = live?.getAttribute('src') || null;
        let active = live ? (live.textContent || decodeDataUriText(activeUrl)) : '';
        if (!original && activeUrl) original = extractWrappedModuleSource(decodeDataUriText(activeUrl) || '');
        if (!active && activeUrl) active = `// Active resource: ${activeUrl}`;
        push({id:makeId('script-',index),name:rawUrl ? sourceEntryNameFromUrl(absoluteUrl,index,'script.js') : `(inline script ${index + 1})`,type:'js',url:absoluteUrl || pageUrl,deliveryUrl:absoluteUrl || pageUrl,sourcePath:sourcePathFromUrl(absoluteUrl || pageUrl),activeUrl:activeUrl || pageUrl,original,active,kind:rawUrl ? 'resource' : 'inline',module:script.getAttribute('type') === 'module' || /\.mjs(?:[?#]|$)/i.test(absoluteUrl || '')});
      });

      const rawStyles = rawDoc ? Array.from(rawDoc.querySelectorAll('style,link[rel~="stylesheet"]')) : [];
      const liveStyles = Array.from(processedDoc.querySelectorAll('style,link[rel~="stylesheet"]'));
      rawStyles.forEach((style,index) => {
        const live = liveStyles[index];
        const rawUrl = style.tagName.toLowerCase() === 'link' ? style.getAttribute('href') : null;
        const absoluteUrl = rawUrl ? resolveUrl(rawUrl,pageUrl) : null;
        const net = absoluteUrl ? findNetworkResource(tab,absoluteUrl) : null;
        const captured = absoluteUrl ? getSourceResource(tab,absoluteUrl) : null;
        let original = style.textContent || '';
        if (!original && captured?.text != null) original = captured.text;
        if (!original && net?.responseText != null) original = net.responseText;
        const activeUrl = live?.getAttribute('href') || null;
        let active = live?.tagName?.toLowerCase() === 'link' ? decodeDataUriText(activeUrl) : (live?.textContent || '');
        if (!active && activeUrl) active = `// Active stylesheet: ${activeUrl}`;
        push({id:makeId('style-',index),name:rawUrl ? sourceEntryNameFromUrl(absoluteUrl,index,'style.css') : `(inline style ${index + 1})`,type:'css',url:absoluteUrl || pageUrl,deliveryUrl:absoluteUrl || pageUrl,sourcePath:sourcePathFromUrl(absoluteUrl || pageUrl),activeUrl:activeUrl || pageUrl,original,active,kind:rawUrl ? 'resource' : 'inline'});
      });

      DevTools.network.getLog(tab).forEach(req => {
        if (!req.responseText) return;
        if (!DevTools.network.isTextualContent(req.contentType || '') && !/\.(?:js|mjs|css|html?|json|txt)(?:[?#]|$)/i.test(req.url)) return;
        const id = makeId('network-' + req.id,0);
        if (seen.has(id) || entries.some(item => item.url === req.url)) return;
        push({id,name:sourceEntryNameFromUrl(req.url,entries.length,'resource'),type:classify(req.url,req.contentType),url:req.url,deliveryUrl:req.url,sourcePath:sourcePathFromUrl(req.url),activeUrl:req.url,original:req.responseText,active:req.responseText,kind:'network'});
      });

      // The live document exposes the processed delivery URLs. Keep them visible too,
      // including data: and blob: URLs instead of pretending they are normal files.
      processedDoc.querySelectorAll('[src],[href],[data]').forEach((node,index) => {
        ['src','href','data'].forEach(attrName => {
          const value = node.getAttribute(attrName);
          if (!value || !/^(?:data|blob):/i.test(value)) return;
          const tagName = node.tagName?.toLowerCase() || '';
          const isData = /^data:/i.test(value);
          if (isData && tagName === 'script' && attrName === 'src' && node.getAttribute('data-raw-src')) return;
          if (isData && tagName === 'link' && attrName === 'href' && node.getAttribute('data-raw-href')) return;
          const id = makeId(`${value.slice(0,4).toLowerCase()}-${index}-${attrName}-`,0);
          if (seen.has(id)) return;
          const decoded = isData ? decodeDataUriText(value) : null;
          const type = isData ? dataType(value) : classify(value,'');
          const mediaType = /^data:([^;,]+)/i.exec(value || '')?.[1] || '';
          if (isData && /^image\//i.test(mediaType)) return;
          const label = isData ? value.replace(/^(data:[^,;]+(?:;base64)?,).*/i,'$1…') : value;
          push({id,name:label,type,url:value,deliveryUrl:value,activeUrl:value,original:decoded || '',active:decoded || '',kind:isData ? 'data' : 'blob'});
        });
      });

      const capturedBucket = sourceBuckets.get(tab);
      if (capturedBucket) {
        capturedBucket.forEach((captured,url) => {
          if (!captured?.text) return;
          if (entries.some(item => resolveUrl(item.url || '',tab.url) === url)) return;
          push({
            id:makeId('module-',url),
            name:sourceEntryNameFromUrl(url,entries.length,'module.js'),
            type:'js',
            url,
            deliveryUrl:url,
            activeUrl:url,
            original:captured.text,
            active:captured.text,
            kind:captured.requestType === 'import' ? 'module' : 'network',
            module:captured.requestType === 'import' || /\.mjs(?:[?#]|$)/i.test(url)
          });
        });
      }

      mergeModuleDependencies(tab,entries,push);
      return entries;
    }

    function sourceGroupName(url) {
      const value = String(url || '');
      if (!value) return 'Other';
      if (/^data:/i.test(value)) return 'data:';
      if (/^blob:/i.test(value)) return 'blob:';
      if (/^about:/i.test(value)) return value.split(':')[0] === 'about' ? value : 'about:';
      try {
        const u = new URL(value);
        return u.host || u.hostname || u.protocol.replace(':','');
      } catch(e) {
        return 'Other';
      }
    }

    function sourceDomainLabel(url) {
      const value = String(url || '');
      if (/^data:/i.test(value)) return 'data:';
      if (/^blob:/i.test(value)) {
        try {
          const u = new URL(value);
          return u.origin && u.origin !== 'null' ? u.origin.replace(/^https?:\/\//i,'') : 'blob:';
        } catch(e) { return 'blob:'; }
      }
      if (/^about:srcdoc/i.test(value)) return 'about:srcdoc';
      try {
        const u = new URL(value);
        return (u.host || u.hostname || u.protocol.replace(':',''));
      } catch(e) { return 'Other'; }
    }

    function getFrameChildPage(parentPage,frameElement) {
      const direct = frameElement?.pageEmulator;
      if (direct?.tab) return direct;
      const children = Array.isArray(parentPage?.children) ? parentPage.children : [];
      for (const child of children) if (child?.iframe === frameElement) return child;
      return null;
    }

    function isBlankDocumentSource(value) {
      const text = String(value || '').replace(/\s+/g,'').toLowerCase();
      return !text || text === '<html><head></head><body></body></html>' || text === '<html><head></head><body></body></html>\n';
    }

    function isBrowserInjectedScript(value) {
      const code = typeof value === 'string' ? value : (value?.textContent || '');
      if (!code) return false;
      return (
        code.includes('createRuntimeInterceptor') &&
        code.includes('__pageRegistry') &&
        code.includes('__executeCodeModule') &&
        code.includes('__runSyncInterceptor')
      );
    }

    function createSourceSnapshot(doc) {
      if (!doc?.documentElement) return '';
      try {
        const clone = doc.documentElement.cloneNode(true);
        clone.querySelectorAll?.('script').forEach(script => {
          if (isBrowserInjectedScript(script)) script.remove();
        });
        return clone.outerHTML || '';
      } catch(e) {
        return doc.documentElement.outerHTML || '';
      }
    }

    function getDocumentSnapshot(frameElement) {
      try {
        return frameElement?.contentDocument || frameElement?.contentWindow?.document || null;
      } catch(e) { return null; }
    }

    function syncFrameDocument(frameTab,frameElement,notify=true) {
      if (!frameTab || !frameElement) return false;
      const doc = getDocumentSnapshot(frameElement);
      if (!doc?.documentElement) return false;

      const html = doc.documentElement.outerHTML || '';
      if (!html) return false;
      const sourceSnapshot = createSourceSnapshot(doc);

      frameTab.devtools = frameTab.devtools || {};
      frameTab.devtools.processedDocument = html;

      // A dynamically populated srcdoc-like frame may never have a real srcdoc
      // attribute or a request-backed rawDocument. In that case the live document
      // itself is the best available source of the served content. Only replace a
      // missing/blank placeholder so genuine captured source isn't overwritten by
      // the processed DOM later.
      if (isBlankDocumentSource(frameTab.devtools.rawDocument)) {
        frameTab.devtools.documentSource = sourceSnapshot || html;
      }

      try {
        const href = frameElement.contentWindow?.location?.href;
        if (href && href !== 'about:blank' && href !== 'about:srcdoc') frameTab.url = href;
      } catch(e) {}

      if (notify && typeof refresh === 'function') {
        if (frameTab.__sourceRefreshQueued) return true;
        frameTab.__sourceRefreshQueued = true;
        requestAnimationFrame(() => {
          frameTab.__sourceRefreshQueued = false;
          try { refresh(); } catch(e) {}
        });
      }
      return true;
    }

    function installFrameDocumentTracker(frameTab,frameElement) {
      if (!frameTab || !frameElement) return;
      const existing = frameDocumentTrackers.get(frameTab);
      const doc = getDocumentSnapshot(frameElement);
      if (!doc) return;
      if (existing?.doc === doc) return;

      if (existing?.observer) {
        try { existing.observer.disconnect(); } catch(e) {}
      }

      const tracker = {doc,observer:null};
      frameDocumentTrackers.set(frameTab,tracker);

      syncFrameDocument(frameTab,frameElement,false);

      try {
        tracker.observer = new MutationObserver(() => syncFrameDocument(frameTab,frameElement,true));
        tracker.observer.observe(doc,{subtree:true,childList:true,attributes:true,characterData:true});
      } catch(e) {}

      try {
        frameElement.addEventListener('load',() => {
          const nextDoc = getDocumentSnapshot(frameElement);
          const current = frameDocumentTrackers.get(frameTab);
          if (!current || current.doc !== nextDoc) installFrameDocumentTracker(frameTab,frameElement);
          syncFrameDocument(frameTab,frameElement,true);
        });
      } catch(e) {}
    }

    function getServedFramePairs(tab,doc) {
      const liveFrames = doc ? Array.from(doc.querySelectorAll('iframe,frame')) : [];
      if (!liveFrames.length) return [];

      // Prefer the original/served markup when it actually contains frame
      // declarations. This preserves stable ordering for normal documents while
      // allowing dynamically-written frames to be represented by the live DOM.
      let rawFrames = [];
      const candidateSources = [tab?.devtools?.rawDocument,tab?.devtools?.documentSource];
      for (const raw of candidateSources) {
        if (!raw) continue;
        try {
          const rawDoc = new DOMParser().parseFromString(raw,'text/html');
          const found = Array.from(rawDoc.querySelectorAll('iframe,frame'));
          if (found.length) { rawFrames = found; break; }
        } catch(e) {}
      }

      if (rawFrames.length) {
        return rawFrames
          .map((rawElement,index) => ({rawElement,frameElement:liveFrames[index] || null}))
          .filter(item => item.frameElement);
      }

      // Dynamically-created/dynamically-written frames have no declaration in
      // the original source. The live DOM is authoritative for those slots.
      return liveFrames.map(frameElement => ({rawElement:null,frameElement}));
    }

    function buildFrameContexts(tab,doc,parentPage,path,depth) {
      const contexts = [];
      getServedFramePairs(tab,doc).forEach((pair,index) => {
        const childPage = getFrameChildPage(parentPage,pair.frameElement);
        const frameTab = childPage?.tab;
        if (!frameTab) return;

        const framePath = path.concat(index + 1);
        frameTab.subframe = true;
        frameTab.parentTab = tab;
        frameTab.framePath = framePath;
        frameTab.frameElement = pair.frameElement;
        frameTab.devtools = frameTab.devtools || {rawDocument:'',processedDocument:'',sourceEntries:[],consoleLog:[],networkLog:[],networkRecording:false};

        installFrameDocumentTracker(frameTab,pair.frameElement);
        const frameDoc = getDocumentSnapshot(pair.frameElement);
        const context = {
          tab:frameTab,
          doc:frameDoc,
          parentTab:tab,
          element:pair.frameElement,
          rawElement:pair.rawElement,
          path:framePath,
          depth,
          index,
          children:[]
        };
        context.children = buildFrameContexts(frameTab,frameDoc,childPage,framePath,depth + 1);
        contexts.push(context);
      });
      return contexts;
    }

    function getFrameContexts(rootTab) {
      if (!rootTab?.iframe) return [];
      const doc = rootTab.iframe.contentDocument || rootTab.iframe.contentWindow?.document || null;
      return buildFrameContexts(rootTab,doc,rootTab.page,[],1);
    }

    // Sources hierarchy intentionally uses sourceGroupName/sourceDomainLabel only.
    function buildDomainTree(entries) {
      const root = {type:'domains',name:'',children:new Map()};
      const query = search.toLowerCase();
      const visibleEntries = entries.filter(e => {
        if (!query) return true;
        return `${e.name} ${e.deliveryUrl || ''} ${e.activeUrl || ''}`.toLowerCase().includes(query);
      });

      const addPathEntry = (domain,entry) => {
        const rawUrl = entry.deliveryUrl || entry.url || '';
        const isHierarchical = /^(?:https?|file):/i.test(rawUrl);
        if (!isHierarchical) {
          domain.files = domain.files || [];
          domain.files.push(entry);
          return;
        }

        let pathname = sourcePathFromUrl(rawUrl) || '/';
        pathname = pathname.split('#')[0];
        const parts = pathname.split('/').filter(Boolean).map(part => {
          try { return decodeURIComponent(part); } catch(e) { return part; }
        });

        if (!parts.length) {
          domain.files = domain.files || [];
          domain.files.push(entry);
          return;
        }

        const fileName = parts.pop() || entry.name || 'index';
        let node = domain.path;
        parts.forEach(part => {
          let child = node.children.get(part);
          if (!child) {
            child = {type:'folder',name:part,children:new Map(),files:[]};
            node.children.set(part,child);
          }
          node = child;
        });
        node.files.push(entry);
      };

      visibleEntries.forEach(entry => {
        const key = sourceGroupName(entry.deliveryUrl || entry.url || '');
        let domain = root.children.get(key);
        if (!domain) {
          domain = {
            type:'domain',
            name:sourceDomainLabel(entry.deliveryUrl || entry.url || ''),
            children:new Map(),
            files:[],
            path:{type:'path-root',name:'',children:new Map(),files:[]},
            entryCount:0
          };
          root.children.set(key,domain);
        }
        addPathEntry(domain,entry);
        domain.entryCount++;
      });
      return root;
    }

    function sortedSourceFiles(files) {
      return (files || []).slice().sort((a,b) => String(a.name || '').localeCompare(String(b.name || '')));
    }

    function sortedSourceFolders(children) {
      return [...(children || new Map()).values()].sort((a,b) => String(a.name || '').localeCompare(String(b.name || '')));
    }

    function renderSourceFileRow(item,depth) {
      const row = document.createElement('div');
      row.className = `p-1 cursor-pointer hover:bg-[#2b2d31] rounded flex items-center gap-1.5 text-[10px] ${entry === item ? 'bg-[#2b2d31] source-entry-selected' : ''}`;
      row.style.paddingLeft = (depth * 12 + 4) + 'px';
      const icon = document.createElement('i');
      icon.className = sourceEntryIconClass(item) + ' w-3 text-center flex-shrink-0';
      const label = document.createElement('span');
      label.className = 'truncate';
      label.textContent = item.name;
      row.dataset.sourceEntry = item.id || '';
      row.title = `${item.deliveryUrl || item.url || ''}${item.activeUrl && item.activeUrl !== item.deliveryUrl ? '\nActive: ' + item.activeUrl : ''}`;
      row.onclick = e => { e.stopPropagation(); openEntry(item); };
      row.append(icon,label);
      return row;
    }

    function renderSourceFolder(node,depth) {
      const wrap = document.createElement('div');
      const parts = createTreeRow(node.name,'fa-solid fa-folder text-yellow-500',depth,true,()=>{},'source-path-folder');
      const contents = document.createElement('div');
      contents.style.display = 'block';

      sortedSourceFolders(node.children).forEach(child => {
        contents.appendChild(renderSourceFolder(child,depth + 1));
      });
      sortedSourceFiles(node.files).forEach(item => {
        contents.appendChild(renderSourceFileRow(item,depth + 1));
      });

      parts.row.onclick = e => {
        e.stopPropagation();
        const collapsed = contents.style.display === 'none';
        contents.style.display = collapsed ? 'block' : 'none';
        parts.caret.textContent = collapsed ? '▼' : '▶';
      };
      wrap.append(parts.row,contents);
      return wrap;
    }

    function domainIconClass() {
      return 'fa-solid fa-cloud text-sky-400';
    }

    function sourceEntryIconClass(item) {
      const type = String(item?.type || '').toLowerCase();
      if (type === 'js') return item?.module ? 'fa-solid fa-cube text-yellow-300' : 'fa-brands fa-js text-yellow-300';
      if (type === 'css') return 'fa-solid fa-file-code text-blue-300';
      if (type === 'html') return 'fa-brands fa-html5 text-orange-400';
      if (type === 'json') return 'fa-solid fa-file-code text-green-300';
      if (type === 'file') return 'fa-solid fa-file text-gray-400';
      if (type === 'data') return 'fa-solid fa-database text-purple-300';
      if (type === 'blob') return 'fa-solid fa-capsules text-purple-300';
      return 'fa-solid fa-file text-gray-400';
    }

    function groupIconClass(type) {
      if (type === 'top') return 'fa-solid fa-window-maximize text-indigo-400';
      if (type === 'frames') return 'fa-solid fa-layer-group text-purple-400';
      if (type === 'frame') return 'fa-solid fa-code-branch text-purple-300';
      return 'fa-solid fa-folder text-yellow-500';
    }

    function createTreeRow(labelText,iconClassName,depth,expanded,onclick,extraClass='') {
      const row = document.createElement('div');
      row.className = `p-1 cursor-pointer hover:bg-[#2b2d31] rounded flex items-center gap-1.5 text-[10px] ${extraClass}`;
      row.style.paddingLeft = (depth * 12 + 4) + 'px';
      const caret = document.createElement('span');
      caret.textContent = expanded ? '▼' : '▶';
      caret.className = 'text-gray-500 w-2 flex-shrink-0';
      const icon = document.createElement('i');
      icon.className = iconClassName + ' w-3 text-center flex-shrink-0';
      const label = document.createElement('span');
      label.className = 'truncate';
      label.textContent = labelText;
      row.append(caret,icon,label);
      return {row,caret,icon,label};
    }

    function renderDomainGroup(domain,depth=1,expanded=true) {
      const wrap = document.createElement('div');
      const rowParts = createTreeRow(domain.name,domainIconClass(),depth,expanded,()=>{},'source-domain-row');
      const contents = document.createElement('div');
      contents.style.display = expanded ? 'block' : 'none';

      const body = document.createElement('div');
      sortedSourceFolders(domain.path?.children).forEach(folder => {
        body.appendChild(renderSourceFolder(folder,depth + 1));
      });
      sortedSourceFiles(domain.path?.files).forEach(item => {
        body.appendChild(renderSourceFileRow(item,depth + 1));
      });
      sortedSourceFiles(domain.files).forEach(item => {
        body.appendChild(renderSourceFileRow(item,depth + 1));
      });
      contents.appendChild(body);

      rowParts.row.onclick = e => {
        e.stopPropagation();
        const collapsed = contents.style.display === 'none';
        contents.style.display = collapsed ? 'block' : 'none';
        rowParts.caret.textContent = collapsed ? '▼' : '▶';
      };
      wrap.append(rowParts.row,contents);
      return wrap;
    }

    function frameLabel(context) {
      const frameTab = context?.tab;
      const number = frameTab?.framePath?.length ? frameTab.framePath.join('.') : String((context?.index || 0) + 1);
      const raw = context?.rawElement;
      const rawSrc = raw?.getAttribute?.('src');
      const rawSrcdoc = raw?.getAttribute?.('srcdoc');
      const url = frameTab?.url || frameTab?.page?.location?.url || frameTab?.iframe?.contentWindow?.location?.href || '';
      const domain = sourceDomainLabel(url);
      const labelDomain = domain && domain !== 'about:srcdoc' ? domain : (rawSrc ? sourceDomainLabel(rawSrc) : (rawSrcdoc != null ? 'srcdoc' : 'about:srcdoc'));
      return labelDomain && labelDomain !== 'about:srcdoc' ? `iframe ${number} — ${labelDomain}` : `iframe ${number}`;
    }

    function renderContextDomains(context,depth=1) {
      const domainTree = buildDomainTree(context.entries || []);
      const wrap = document.createElement('div');
      [...domainTree.children.values()].forEach(domain => wrap.appendChild(renderDomainGroup(domain,depth,true)));
      return wrap;
    }

    function renderFrameBranch(context,depth=1) {
      const wrap = document.createElement('div');
      const expanded = true;
      const parts = createTreeRow(frameLabel(context),groupIconClass('frame'),depth,expanded,()=>{},'source-frame-row');
      const body = document.createElement('div');
      body.style.display = expanded ? 'block' : 'none';
      body.appendChild(renderContextDomains(context,depth + 1));
      const children = Array.isArray(context?.children) ? context.children : [];
      children.forEach(child => body.appendChild(renderFrameBranch(child,depth + 1)));
      parts.row.onclick = e => {
        e.stopPropagation();
        const collapsed = body.style.display === 'none';
        body.style.display = collapsed ? 'block' : 'none';
        parts.caret.textContent = collapsed ? '▼' : '▶';
      };
      wrap.append(parts.row,body);
      return wrap;
    }

    function renderSourceTree(tab,topEntries,frameContexts) {
      const root = document.createElement('div');

      const topParts = createTreeRow('Top',groupIconClass('top'),0,true,()=>{},'source-top-row');
      const topBody = document.createElement('div');
      topBody.style.display = 'block';
      topBody.appendChild(renderContextDomains({tab,entries:topEntries},1));
      frameContexts.forEach(context => topBody.appendChild(renderFrameBranch(context,1)));
      topParts.row.onclick = e => {
        e.stopPropagation();
        const collapsed = topBody.style.display === 'none';
        topBody.style.display = collapsed ? 'block' : 'none';
        topParts.caret.textContent = collapsed ? '▼' : '▶';
      };
      root.append(topParts.row,topBody);
      return root;
    }


    function clearTab(tab) {
      if (!tab) return;
      sourceBuckets.delete(tab);
      const tracker = frameDocumentTrackers.get(tab);
      if (tracker?.observer) { try { tracker.observer.disconnect(); } catch(e) {} }
      frameDocumentTrackers.delete(tab);
      delete tab.__sourceRefreshQueued;
      if (tab.devtools) delete tab.devtools.documentSource;
      for (const [request,pending] of sourceRequests) {
        if (pending?.tab === tab) sourceRequests.delete(request);
      }
      if (tab.id === activeTabId) {
        entry = null;
        const tree = document.getElementById('sources-file-tree');
        const editor = document.getElementById('sources-editor');
        const info = document.getElementById('sources-source-info');
        const title = document.getElementById('sources-current-file');
        const deps = document.getElementById('sources-dependencies');
        if (tree) tree.innerHTML = '';
        if (editor) { editor.innerHTML = ''; delete editor.dataset.rawSource; }
        if (info) info.textContent = '';
        if (title) title.textContent = 'Select a source…';
        if (deps) { deps.innerHTML = ''; deps.classList.add('hidden'); }
      }
    }

    function refresh() {
      const tree = document.getElementById('sources-file-tree');
      if (!tree) return;
      tree.innerHTML = '';
      const tab = getActiveTab();
      if (!tab) return;
      tab.devtools = tab.devtools || {};
      const doc = DevTools.util.getActiveDocument();
      if (!doc) return;

      const topEntries = buildEntries(tab,doc);
      const frameContexts = getFrameContexts(tab);
      const allEntries = topEntries.slice();
      frameContexts.forEach(context => {
        if (!context.doc) { context.entries = []; return; }
        context.entries = buildEntries(context.tab,context.doc);
        context.tab.devtools.sourceEntries = context.entries;
        allEntries.push(...context.entries);
      });
      tab.devtools.sourceEntries = allEntries;
      tree.appendChild(renderSourceTree(tab,topEntries,frameContexts));

      const current = entry ? allEntries.find(e => e.id === entry.id) : null;
      if (current) openEntry(current);
      else if (allEntries.length) openEntry(allEntries[0]);
    }



    function renderDependencyList(value) {
      const container = document.getElementById('sources-dependencies');
      if (!container) return;
      container.innerHTML = '';
      const imports = Array.isArray(value?.imports) ? value.imports : [];
      const importedBy = Array.isArray(value?.importedBy) ? value.importedBy : [];
      if (!imports.length && !importedBy.length) {
        container.classList.add('hidden');
        return;
      }
      container.classList.remove('hidden');

      const makeGroup = (title,items,onClick) => {
        if (!items.length) return;
        const group = document.createElement('div');
        group.className = 'flex items-center gap-1 min-w-0';
        const label = document.createElement('span');
        label.className = 'text-gray-500 flex-shrink-0';
        label.textContent = title + ':';
        group.appendChild(label);
        items.forEach(item => {
          const button = document.createElement('button');
          button.className = 'px-1.5 py-0.5 rounded bg-[#2b2d31] hover:bg-[#3a3d43] text-cyan-300 truncate max-w-[240px] text-[9px]';
          button.title = item.url || '';
          button.textContent = item.name || sourceEntryNameFromUrl(item.url,0,'module.js');
          button.onclick = e => { e.stopPropagation(); onClick(item); };
          group.appendChild(button);
        });
        container.appendChild(group);
      };

      makeGroup('Imports',imports,item => {
        const tab = value?.sourceTab || getActiveTab();
        const list = tab?.devtools?.sourceEntries || [];
        const found = list.find(e => resolveUrl(e.url || '',tab.url) === item.url);
        if (found) openEntry(found);
      });
      makeGroup('Imported by',importedBy,item => {
        const tab = value?.sourceTab || getActiveTab();
        const list = tab?.devtools?.sourceEntries || [];
        const found = list.find(e => resolveUrl(e.url || '',tab.url) === item.url);
        if (found) openEntry(found);
      });
    }

    async function openEntry(value) {
      if (!value) return;
      entry = value;
      const title = document.getElementById('sources-current-file');
      const info = document.getElementById('sources-source-info');
      const editor = document.getElementById('sources-editor');
      if (title) title.textContent = value.name;
      if (info) info.textContent = `${mode === 'original' ? 'Original source' : 'Active source'} • Delivered from: ${value.deliveryUrl || value.url || '(inline)'}${value.activeUrl && value.activeUrl !== value.deliveryUrl ? ' • Active: ' + value.activeUrl : ''}`;
      let text = mode === 'original' ? value.original : value.active;
      if (!text && mode === 'active' && /^blob:/i.test(value.activeUrl || '')) {
        try {
          const response = await fetch(value.activeUrl);
          const contentType = response.headers.get('content-type') || '';
          if (DevTools.network.isTextualContent(contentType)) text = await response.text();
        } catch(e) {}
      }
      const displayText = text || (value.kind === 'blob' || /^data:/i.test(value.url || '') ? `// Delivery URL\n${value.url}` : '// No source available.');
      if (editor) {
        editor.innerHTML = DevTools.syntax.highlight(displayText,DevTools.syntax.inferLanguage(value.type,displayText));
        editor.dataset.rawSource = displayText;
        editor.scrollTop = 0;
        editor.scrollLeft = 0;
      }
      renderDependencyList(value);
      document.querySelectorAll('#sources-file-tree .source-entry-selected').forEach(el => el.classList.remove('source-entry-selected')); const selectedRows = document.querySelectorAll('#sources-file-tree [data-source-entry]'); selectedRows.forEach(el => { if (el.dataset.sourceEntry === value.id) el.classList.add('source-entry-selected'); });
    }

    function setMode(value) {
      mode = value;
      document.getElementById('sources-mode-original')?.classList.toggle('active',value === 'original');
      document.getElementById('sources-mode-active')?.classList.toggle('active',value === 'active');
      if (entry) openEntry(entry);
    }

    function filterSources(value) {
      search = value || '';
      refresh();
    }

    function findInSource(value) {
      const editor = document.getElementById('sources-editor');
      if (!editor || !value) return;
      const source = editor.dataset.rawSource || editor.textContent || '';
      const index = source.toLowerCase().indexOf(value.toLowerCase());
      if (index >= 0) {
        editor.focus();
        const startTarget = index;
        const endTarget = index + value.length;
        const walker = document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
        let node, start = 0, startNode = null, startOffset = 0, endNode = null, endOffset = 0;
        while ((node = walker.nextNode())) {
          const nodeStart = start;
          const nodeEnd = start + node.nodeValue.length;
          if (!startNode && startTarget >= nodeStart && startTarget <= nodeEnd) {
            startNode = node;
            startOffset = startTarget - nodeStart;
          }
          if (!endNode && endTarget >= nodeStart && endTarget <= nodeEnd) {
            endNode = node;
            endOffset = endTarget - nodeStart;
            break;
          }
          start = nodeEnd;
        }
        if (startNode && endNode) {
          const range = document.createRange();
          range.setStart(startNode,startOffset);
          range.setEnd(endNode,endOffset);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }

    async function copyText(value) {
      try {
        await navigator.clipboard.writeText(String(value ?? ''));
        showToast('Copied to clipboard','success');
      } catch(e) {
        showToast('Clipboard unavailable','error');
      }
    }

    async function copyCurrent() {
      const editor = document.getElementById('sources-editor');
      if (editor) await copyText(editor.dataset.rawSource || editor.textContent || '');
    }

    function captureProcessed(tab) {
      if (!tab?.iframe) return;
      const doc = tab.iframe.contentDocument || tab.iframe.contentWindow?.document;
      if (!doc?.documentElement) return;
      tab.devtools = tab.devtools || {};
      tab.devtools.processedDocument = doc.documentElement.outerHTML;
      DevTools.ui.refreshActiveViews();
    }

    return { get mode(){return mode;}, refresh, setMode, filter:filterSources, findInSource, copyText, copyCurrent, captureProcessed, openEntry, buildEntries, decodeDataUriText, handleRequestStart, handleRequestEnd, clearTab };
  })(),

  performance: {
    render() {
      const container = document.getElementById('perf-metrics-container');
      const tab = getActiveTab();
      if (!container || !tab) return;
      const baseLoad = tab.loadTimeMS || 0;
      const dns = Math.floor(baseLoad * 0.1);
      const tcp = Math.floor(baseLoad * 0.2);
      const req = Math.floor(baseLoad * 0.4);
      const dom = Math.floor(baseLoad * 0.3);
      container.innerHTML = `<div class="mb-4 text-gray-400 text-center text-xs">Total Load Time: <span class="text-white font-bold">${baseLoad}ms</span></div><div class="mb-1 text-gray-400">DNS Lookup (${dns}ms)</div><div class="perf-bar bg-gray-700 w-full"><div class="h-full bg-emerald-500 rounded" style="width:10%"></div></div><div class="mb-1 text-gray-400 mt-3">Initial Connection (${tcp}ms)</div><div class="perf-bar bg-gray-700 w-full"><div class="h-full bg-orange-400 rounded" style="width:25%;margin-left:10%"></div></div><div class="mb-1 text-gray-400 mt-3">Request/Response (${req}ms)</div><div class="perf-bar bg-gray-700 w-full"><div class="h-full bg-blue-500 rounded" style="width:40%;margin-left:35%"></div></div><div class="mb-1 text-gray-400 mt-3">DOM Processing (${dom}ms)</div><div class="perf-bar bg-gray-700 w-full"><div class="h-full bg-purple-500 rounded" style="width:25%;margin-left:75%"></div></div>`;
    },
  },

  application: (() => {
    let type = 'localStorage';
    function load(nextType = type) {
      type = nextType;
      const title = document.getElementById('app-storage-title');
      if (title) title.textContent = type === 'cookie' ? 'Cookies' : type === 'localStorage' ? 'Local Storage' : 'Session Storage';
      const tbody = document.getElementById('app-storage-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      const tab = getActiveTab();
      const win = tab?.iframe?.contentWindow || null;
      if (!win) return;
      try {
        let items = [];
        if (type === 'cookie') {
          items = win.document.cookie.split(';').filter(c => c.trim()).map(c => { const [k,v] = c.split('='); return {key:k.trim(),value:v ? v.trim() : ''}; });
        } else {
          const storageObj = win[type];
          for (let i = 0; i < storageObj.length; i++) { const k = storageObj.key(i); items.push({key:k,value:storageObj.getItem(k)}); }
        }
        if (items.length === 0) { tbody.innerHTML = `<tr><td colspan="2" class="p-4 text-center text-gray-500 italic">No data found in ${type}</td></tr>`; return; }
        items.forEach(item => tbody.innerHTML += `<tr class="border-b border-gray-800 hover:bg-[#2b2d31]"><td class="p-2 border-r border-gray-800 text-indigo-300 truncate max-w-[120px]" title="${sanitizeHTML(item.key)}">${sanitizeHTML(item.key)}</td><td class="p-2 text-emerald-400 break-all">${sanitizeHTML(item.value)}</td></tr>`);
      } catch(err) {
        tbody.innerHTML = `<tr><td colspan="2" class="p-4 text-rose-400">Access Denied: ${sanitizeHTML(err.message)}</td></tr>`;
      }
    }
    return { get type(){return type;}, load, refresh:() => load(type) };
  })(),
};

window.DevTools = DevTools;
(function initDevToolsLayoutStyles() {
  if (document.getElementById('devtools-layout-styles')) return;
  const style = document.createElement('style');
  style.id = 'devtools-layout-styles';
  style.textContent = `
    #consoleOutput .console-log-list {
      min-height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    #consoleOutput .console-empty-state { padding: 2px 4px; }
    .log-command { display:block; white-space:pre-wrap; cursor:pointer; }
    .log-command-prompt { color:#818cf8; font-weight:700; }
    .log-command-code { display:inline; white-space:pre-wrap; }
    .dt-syntax-code {
      margin:0;
      padding:0;
      font:inherit;
      line-height:inherit;
      white-space:pre-wrap;
      overflow:auto;
      box-sizing:border-box;
      max-width:100%;
      max-height:100%;
    }
    .log-function-source, .log-html { white-space:pre-wrap; }
    .dt-syn-keyword { color:#c4b5fd; }
    .dt-syn-literal { color:#fda4af; }
    .dt-syn-string { color:#86efac; }
    .dt-syn-template { color:#86efac; }
    .dt-syn-number { color:#f9a8d4; }
    .dt-syn-comment { color:#6b7280; }
    .dt-syn-builtin { color:#93c5fd; }
    .dt-syn-function { color:#fcd34d; }
    .dt-syn-bracket { font-weight:600; }
    .dt-syn-bracket-1 { color:#f9c74f; }
    .dt-syn-bracket-2 { color:#a78bfa; }
    .dt-syn-bracket-3 { color:#38bdf8; }
    .dt-syn-bracket-error { color:#f87171 !important; font-weight:700; }
    .dt-syn-tag { color:#67e8f9; }
    .dt-syn-attribute { color:#c4b5fd; }
    .dt-syn-property { color:#93c5fd; }
    .dt-syn-selector { color:#67e8f9; }
    #sources-editor { margin:0; height:100%; overflow:auto; box-sizing:border-box; padding:12px; background:#1e1f22; color:#e5e7eb; font:inherit; line-height:1.55; white-space:pre; tab-size:2; outline:none; user-select:text; }
    .dt-code-editor { white-space:pre; tab-size:2; line-height:1.55; user-select:text; }
    .dt-code-editor:focus { outline:none; }
    #sources-editor .dt-syn-keyword, #sources-editor .dt-syn-literal, #sources-editor .dt-syn-string, #sources-editor .dt-syn-comment, #sources-editor .dt-syn-number, #sources-editor .dt-syn-builtin, #sources-editor .dt-syn-function, #sources-editor .dt-syn-tag, #sources-editor .dt-syn-attribute, #sources-editor .dt-syn-property, #sources-editor .dt-syn-selector { white-space:pre; }
  `;
  document.head.appendChild(style);
})();

const resizer = document.getElementById('devtools-resizer');
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
  isResizing = true;
  resizer.classList.add('active');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

window.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const panel = document.getElementById('devtools-panel');
  const newWidth = window.innerWidth - e.clientX;
  if (newWidth >= 260 && newWidth <= window.innerWidth * 0.75) {
    panel.style.width = `${newWidth}px`;
  }
});

window.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    resizer.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `pointer-events-auto px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 text-white transition-all transform translate-y-2 opacity-0 duration-200 ${
    type === 'error' ? 'bg-rose-600' : type === 'success' ? 'bg-emerald-600' : 'bg-indigo-600'
  }`;
  toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => { toast.classList.remove('translate-y-2', 'opacity-0'); }, 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
  if (id === 'history-modal') renderHistoryLog();
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function textToBase64(str) {
  try { return btoa(unescape(encodeURIComponent(str))); } 
  catch(e) { return btoa(str); }
}

function base64ToText(base64) {
  try {
    const binaryString = atob(base64);
    const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch(e) { return atob(base64); }
}

// Generates DataURIs natively using standard Blob and FileReader from Response
async function createDataUri(response) {
  if (!response) return null;
  try {
    const blob = await response.clone().blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (response.source_url) cacheMap[response.source_url] = reader.result;

        let defaultName = '';

        // 1. Try checking the Content-Disposition header first
        if (response.headers) {
          const disposition = response.headers.get('content-disposition');
          if (disposition && disposition.includes('filename=')) {
            // Regex handles optional quotes around filenames safely
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches && matches[1]) {
              defaultName = matches[1].replace(/['"]/g, '').trim();
            }
          }
        }

        // 2. Fall back to your URL extraction method if header parsing failed
        if (!defaultName && response.source_url) {
          defaultName = getFileNameFromURL(response.source_url,'');
        }

        if (defaultName) defaultName = "#f="+defaultName;

        resolve(reader.result+defaultName);
      }
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch(e) {
    window.logError("DataURI conversion failed: " + e.message);
    return null;
  }
};

async function updateTabMetadata(tab) {
  try {
    const doc = tab.iframe.contentDocument || tab.iframe.contentWindow.document;
    if (!doc) return;

    const titleEl = doc.querySelector('title');
    tab.title = (titleEl && titleEl.textContent.trim()) ? titleEl.textContent.trim() : tab.url;

    let dynamicBaseOrigin = "https://example.com";
    try { dynamicBaseOrigin = new URL(tab.url).origin; } catch(e) {}

    const iconEl = doc.querySelector('link[rel*="icon"]');
    if (iconEl && iconEl.getAttribute('href')) {
      const rawFaviconUrl = iconEl.getAttribute('data-raw-src') || iconEl.getAttribute('href');
      const absFaviconUrl = new URL(rawFaviconUrl, dynamicBaseOrigin).href;
      const file = await DevTools.network.requestForTab({tab}, absFaviconUrl, dynamicBaseOrigin);
      tab.favicon = file ? createDataUri(file) : absFaviconUrl;
    } else {
      tab.favicon = DEFAULT_FAVICON;
    }
  } catch (e) {
    tab.title = tab.url;
    tab.favicon = DEFAULT_FAVICON;
  }
  renderTabStrip();
  updateBookmarkStar();
  if (!document.getElementById('devtools-panel').classList.contains('hidden')) {
    DevTools.elements.refresh();
  }
}

const menuEl = document.getElementById('custom-context-menu');

function hideContextMenu() {
  menuEl.style.display = 'none';
  contextMenuTarget = null;
}

function showContextMenu(clientX, clientY, targetInfo) {
  contextMenuTarget = targetInfo;
  const tab = getActiveTab();
  const canBack = tab && tab.page.historyIndex > 0;
  const canForward = tab && tab.page.historyIndex < tab.page.history.length - 1;

  let menuItems = [];

  if (targetInfo.tagName == "CANVAS") {
    const canvas = targetInfo.target;
    menuItems.push({
      label: 'Save Image As...',
      action: () => {
        const fileName = prompt('Enter file name:', 'canvas-image');
        if (fileName === null) return; // User canceled the prompt

        const sanitizedName = fileName.trim() || 'canvas-image';
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${sanitizedName}.png`;
        link.href = dataUrl;
        link.click();
      }
    });
    menuItems.push({
      label: 'Copy Image',
      action: async () => {
        try {
          canvas.toBlob(async (blob) => {
            if (blob) {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              showToast('Image copied to clipboard!');
            }
          }, 'image/png');
        } catch (err) {
          showToast('Failed to copy image.');
        }
      }
    });
    menuItems.push({ type: 'separator' });
  }

  if (targetInfo.linkUrl) {
    menuItems.push({ label: 'Open Link in New Tab', action: () => createNewTab(targetInfo.linkUrl, true) });
    menuItems.push({ label: 'Open Link in Background Tab', action: () => createNewTab(targetInfo.linkUrl, false) });
    menuItems.push({
      label: 'Copy Link Address',
      action: () => {
        navigator.clipboard.writeText(targetInfo.linkUrl);
        showToast('Link copied to clipboard!');
      }
    });
    menuItems.push({ type: 'separator' });
  }

  if (targetInfo.mediaSrc) {
    const typeName = targetInfo.mediaType || 'Media';
    const targetMediaUrl = targetInfo.rawMediaSrc || targetInfo.mediaSrc;

    menuItems.push({ label: `Open ${typeName} in New Tab`, action: () => createNewTab(targetMediaUrl, true) });
    if (targetInfo.tagName === "IMG") {
      menuItems.push({
        label: 'Save Image As...',
        action: () => {
          const targetMediaUrl = targetInfo.rawMediaSrc || targetInfo.mediaSrc;
          if (!targetMediaUrl) return;
          
          // Extract default name from URL or fallback
          let defaultName = getFileNameFromURL(targetMediaUrl,'downloaded-image.png')

          const fileName = prompt('Enter file name:', defaultName);
          if (fileName === null) return;

          const sanitizedName = fileName.trim() || defaultName;
          const link = document.createElement('a');
          link.download = sanitizedName;
          link.href = targetMediaUrl;
          link.click();
        }
      });
      menuItems.push({
        label: 'Copy Image',
        action: async () => {
          const targetMediaUrl = targetInfo.rawMediaSrc || targetInfo.mediaSrc;
          if (!targetMediaUrl) return;
          try {
            const response = await fetch(targetMediaUrl);
            const blob = await response.blob();
            
            await navigator.clipboard.write([
              new ClipboardItem({ [blob.type]: blob })
            ]);
            showToast('Image copied to clipboard!');
          } catch (err) {
            showToast('Failed to copy image.');
          }
        }
      });
    }
    menuItems.push({
      label: `Copy ${typeName} Address`,
      action: () => {
        navigator.clipboard.writeText(targetMediaUrl);
        showToast(`${typeName} address copied!`);
      }
    });
    menuItems.push({ type: 'separator' });
  }

  menuItems.push({ label: 'Back', disabled: !canBack, action: () => goBack() });
  menuItems.push({ label: 'Forward', disabled: !canForward, action: () => goForward() });
  menuItems.push({ label: 'Reload', shortcut: 'Ctrl+R', action: () => reloadCurrentTab() });
  menuItems.push({ type: 'separator' });

  menuItems.push({ label: 'New Tab', shortcut: 'Ctrl+T', action: () => createNewTab(appSettings.defaultTab, true) });
  menuItems.push({ label: 'Reopen Closed Tab', shortcut: 'Ctrl+Shift+T', disabled: closedTabsStack.length === 0, action: () => restoreClosedTab() });
  menuItems.push({ label: 'Close Tab', shortcut: 'Ctrl+W', action: () => { if (activeTabId) closeTab(activeTabId); } });
  menuItems.push({ type: 'separator' });

  // Inspect Element in Right-Click Context Menu
  menuItems.push({
    label: 'Inspect Element',
    shortcut: 'F12 / Ctrl+Shift+I',
    action: () => DevTools.elements.inspect(targetInfo)
  });

  menuEl.innerHTML = '';
  menuItems.forEach(item => {
    if (item.type === 'separator') {
      const sep = document.createElement('div');
      sep.className = 'menu-separator';
      menuEl.appendChild(sep);
    } else {
      const div = document.createElement('div');
      div.className = `menu-item ${item.disabled ? 'disabled' : ''}`;
      div.innerHTML = `<span>${item.label}</span>${item.shortcut ? `<span class="menu-shortcut">${item.shortcut}</span>` : ''}`;
      if (!item.disabled) {
        div.onclick = (e) => {
          e.stopPropagation();
          hideContextMenu();
          item.action();
        };
      }
      menuEl.appendChild(div);
    }
  });

  menuEl.style.display = 'block';
  const menuWidth = menuEl.offsetWidth;
  const menuHeight = menuEl.offsetHeight;
  const posX = (clientX + menuWidth > window.innerWidth) ? window.innerWidth - menuWidth - 8 : clientX;
  const posY = (clientY + menuHeight > window.innerHeight) ? window.innerHeight - menuHeight - 8 : clientY;

  menuEl.style.left = `${posX}px`;
  menuEl.style.top = `${posY}px`;
}

window.addEventListener('click', hideContextMenu);
window.addEventListener('resize', hideContextMenu);

function createNewPage(iframe) {
  var page = new PageEmulator(iframe);
  page.network = DevTools.network.createPageProxy(page);
  page.interceptEvent('console',function(method, args){
    try { if (console[method]) console[method].apply(console,args); } catch(e) {}
    DevTools.console.recordMessage(DevTools.network.getPageTab(page),method,args);
  });
  page.interceptEvent('error',async function(e,loc){
    DevTools.console.recordMessage(DevTools.network.getPageTab(page),'error',["Uncaught Error: " + e.message + " (" + loc + ":" + e.lineno + ") " + (e.error?.stack || '')]);
  });
  page.interceptEvent('iframe',async function(obj){
    if (obj.iframe.pageEmulator) return;
    var page2 = createNewPage(obj.iframe);
    page.addChild(page2);

    var parentTab = DevTools.network.getPageTab(page) || page.tab || null;
    var frameId = 'frame-' + Math.random().toString(36).slice(2,9);
    page2.tab = {
      id: frameId,
      iframe: obj.iframe,
      page: page2,
      subframe: true,
      parentTab: parentTab,
      frameElement: obj.iframe,
      url: obj.is_doc ? 'about:srcdoc' : (obj.src || page.location?.url || 'about:blank'),
      title: 'iframe',
      devtools: {
        rawDocument: '',
        processedDocument: '',
        sourceEntries: [],
        consoleLog: [],
        networkLog: [],
        networkRecording: false
      }
    };

    if (obj.iframe?.addEventListener) {
      obj.iframe.addEventListener('load',() => {
        if (page2.tab) {
          try { page2.tab.url = page2.location?.url || page2.tab.url; } catch(e) {}
          DevTools.sources.captureProcessed(page2.tab);
        }
      });
    }

    if (obj.is_doc) {
      page2.setLocation('about:srcdoc', page.location.origin);
      page2.tab.url = 'about:srcdoc';
      page2.devtoolsTab = parentTab;
      page2.tab.devtools.rawDocument = String(obj.srcdoc || '');
      await page2.setDocument(obj.srcdoc);
    } else {
      const targetUrl = obj.src ? new URL(obj.src, page.location.origin) : new URL(page.location.href);
      page2.setLocation(targetUrl.href, targetUrl.origin);
      page2.tab.url = targetUrl.href;
      const res = await DevTools.network.requestForTab(page2, targetUrl.href, targetUrl.origin, {}, 'iframe');
      if (res && res.ok) {
        var rawHtml = await window.getDocumentContent(res, targetUrl.href, targetUrl.origin, obj.iframe);
        page2.tab.devtools.rawDocument = String(rawHtml || '');
        await page2.setDocument(rawHtml);
      }
    }
    DevTools.sources.captureProcessed(page2.tab);
  });

  page.interceptEvent('hidecontext',async function(){
    window.hideContextMenu();
    if (window.keepAlive) window.keepAlive.start();
  });
  page.interceptEvent('showcontext', function(...args){
    window.showContextMenu(...args);
  });
  page.interceptEvent('keydown', function(e){
    if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i')) {
      e.preventDefault();
      DevTools.ui.toggle();
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (['t', 'w', 'r', 'l', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key) || (e.shiftKey && key === 't')) {
        e.preventDefault();
        window.dispatchEvent(new KeyboardEvent('keydown', {
          key: e.key, code: e.code, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey, bubbles: true
        }));
      }
    }
  });
  page.interceptEvent('navigate', function(...args) {
    if (page.tab.subframe) renderTabContent(page.tab, args[0]);
    else navigateToInTab(page.tab, ...args);
    return page.tab;
  });
  page.interceptEvent('open', function(resolved, activateTab) {
    return window.createNewTab(resolved, activateTab).page;
  });
  page.interceptEvent('download', async function(resolved, activateTab) {
    const response = await fetch(resolved,{},'download');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    var blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const tempLink = document.createElement('a');
    tempLink.dataset.isInternalDownload = "true"; 
    tempLink.href = blobUrl;
    tempLink.download = link.getAttribute('download') || resolved.split('/').pop() || 'download';
    document.body.appendChild(tempLink);
    nativeElementClick.call(tempLink);
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(blobUrl);
  });
  page.addRuntimeInterceptor(function(){
    addEventListener(window, 'click', function(e) {
      sendEvent('hidecontext');
    });

    function enableLongTouchContextMenu(targetElement, duration = 500) {
      let touchTimer = null;
      let isLongPress = false;

      // 1. Handle the start of a touch
      addEventListener(targetElement, 'touchstart', (event) => {
        document.body.style['--webkit']

        // Only track single-finger touches
        if (event.touches.length > 1) return;

        isLongPress = false;

        // Start a timer for the specified duration
        touchTimer = setTimeout(() => {
          isLongPress = true;
          
          // Get touch coordinates for the event position
          const touch = event.touches[0];

          var betterTarget = document.elementFromPoint(touch.clientX, touch.clientY);

          // Create and initialize a standard contextmenu event
          const contextMenuEvent = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: touch.clientX,
            clientY: touch.clientY,
            screenX: touch.screenX,
            screenY: touch.screenY,
          });

          // Dispatch the event onto the target element
          betterTarget.dispatchEvent(contextMenuEvent);
        }, duration);
      }, { passive: true });

      // 2. Cancel the timer if the finger moves significantly
      addEventListener(targetElement, 'touchmove', () => {
        if (touchTimer) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
      }, { passive: true });

      // 3. Clean up and prevent default click actions if it was a long press
      addEventListener(targetElement, 'touchend', (event) => {
        if (touchTimer) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }

        // If it was a long press, prevent native ghost clicks or selection behavior
        if (isLongPress) {
          event.preventDefault();
        }
      });

      // 4. Cancel timer if the touch is interrupted (e.g. system alert pops up)
      addEventListener(targetElement, 'touchcancel', () => {
        if (touchTimer) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
      });
    }
    enableLongTouchContextMenu(window, 500);

    addEventListener(window, 'contextmenu', function(e) {
      e.preventDefault();

      const link = e.target.closest('a');
      const img = e.target.closest('img');
      const video = e.target.closest('video');
      const audio = e.target.closest('audio');
      const iframeBounding = window.__frameElement.getBoundingClientRect();

      let mediaSrc = null;
      let rawMediaSrc = null;
      let mediaType = null;

      if (img) {
        mediaType = 'Image';
        mediaSrc = img.getAttribute('src') || parseSrcSet(img.getAttribute('srcset')||'')[0]?.url;
        rawMediaSrc = img.getAttribute('data-raw-src') || parseSrcSet(img.getAttribute('data-raw-srcdoc')||'')[0]?.url || mediaSrc;
      } else if (video) {
        mediaType = 'Video';
        const srcEl = video.querySelector('source') || video;
        mediaSrc = srcEl ? srcEl.getAttribute('src') : null;
        rawMediaSrc = srcEl ? (srcEl.getAttribute('data-raw-src') || mediaSrc) : null;
      } else if (audio) {
        mediaType = 'Audio';
        const srcEl = audio.querySelector('source') || audio;
        mediaSrc = srcEl ? srcEl.getAttribute('src') : null;
        rawMediaSrc = srcEl ? (srcEl.getAttribute('data-raw-src') || mediaSrc) : null;
      }

      sendEvent('showcontext',
        iframeBounding.left + e.clientX,
        iframeBounding.top + e.clientY,
        {
          target: e.target,
          tagName: e.target.tagName,
          linkUrl: link ? new URL(link.getAttribute('href'), CURRENT_PAGE_URL).href : null,
          mediaSrc: mediaSrc,
          rawMediaSrc: rawMediaSrc ? new URL(rawMediaSrc, CURRENT_PAGE_URL).href : null,
          mediaType: mediaType
        }
      );
    });

    addEventListener(window, 'keydown', function(e) {
      sendEvent('keydown',e);
    });
  });
  return page;
}
// Tie it to a user interaction (like starting a countdown or entering a dashboard)
document.addEventListener('click', () => {
  if (window.keepAlive) window.keepAlive.start();
});

function createNewTab(initialUrl = appSettings.defaultTab, activate = true) {
  const tabId = 'tab-' + Math.random().toString(36).substring(2, 9);
  
  const iframe = document.createElement('iframe');
  iframe.id = `iframe-${tabId}`;
  iframe.className = 'tab-iframe';
  document.getElementById('viewport-container').appendChild(iframe);

  var page = createNewPage(iframe);

  const newTab = {
    id: tabId,
    url: initialUrl,
    title: initialUrl,
    favicon: DEFAULT_FAVICON,
    iframe: iframe,
    page: page,
    devtools: {
      rawDocument: '',
      processedDocument: '',
      sourceEntries: [],
      consoleLog: [],
      networkLog: [],
      networkRecording: false
    },
  };

  page.tab = newTab;

  iframe.addEventListener('load', () => { updateTabMetadata(newTab); DevTools.sources.captureProcessed(newTab); });
  tabs.push(newTab);
  
  if (activate || tabs.length === 1) {
    switchTab(tabId);
  } else {
    renderTabStrip();
  }
  
  navigateToInTab(newTab, initialUrl, true);
  return newTab;
}

function restoreClosedTab() {
  if (closedTabsStack.length === 0) return;
  const closedTabState = closedTabsStack.pop();
  const newTab = createNewTab(closedTabState.url, true);
  newTab.page.history = closedTabState.history;
  newTab.page.historyIndex = closedTabState.historyIndex;
  updateToolbarUI();
  showToast('Restored closed tab');
}

function switchTab(tabId) {
  activeTabId = tabId;
  DevTools.console.resetHistory();

  tabs.forEach(t => {
    const isTarget = t.id === tabId;
    t.iframe.classList.toggle('active', isTarget);
  });

  renderTabStrip();
  updateToolbarUI();
  if (!document.getElementById('devtools-panel').classList.contains('hidden')) {
    DevTools.ui.refreshActiveViews();
  }
}

function closeTab(tabId, event) {
  if (event) event.stopPropagation();

  const index = tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  const tabToRemove = tabs[index];
  const currentUrl = tabToRemove.page.history[tabToRemove.page.historyIndex] || appSettings.defaultTab;

  closedTabsStack.push({
    url: currentUrl,
    history: [...tabToRemove.page.history],
    historyIndex: tabToRemove.page.historyIndex
  });

  tabToRemove.iframe.remove();
  tabs.splice(index, 1);

  if (tabs.length === 0) {
    createNewTab(appSettings.defaultTab);
    return;
  }

  if (activeTabId === tabId) {
    const nextActiveIndex = Math.max(0, index - 1);
    switchTab(tabs[nextActiveIndex].id);
  } else {
    renderTabStrip();
  }
}

function switchTabByIndex(index) {
  if (index >= 0 && index < tabs.length) {
    switchTab(tabs[index].id);
  }
}

function updateLoadingProgress(val) {
  const bar = document.getElementById('loading-progress');
  if (!bar) return;
  bar.style.opacity = '1';
  bar.style.width = val + '%';
  if (val >= 100) {
    setTimeout(() => {
      bar.style.opacity = '0';
      setTimeout(() => { bar.style.width = '0%'; }, 300);
    }, 200);
  }
}

function getActiveTab() {
  return tabs.find(t => t.id === activeTabId);
}

function getTabByIframeWindow(win) {
  return tabs.find(t => t.iframe.contentWindow === win);
}

async function navigateTo(rawUrl, isNewNavigation = true) {
  const activeTab = getActiveTab();
  if (!activeTab) return;
  await navigateToInTab(activeTab, rawUrl, isNewNavigation);
}

async function navigateToInTab(tab, rawUrl, isNewNavigation = true, reloadCurrentTab = true) {
  const startTime = performance.now();
  let absoluteUrl = rawUrl.trim();
  if (!absoluteUrl.startsWith('http') && !absoluteUrl.startsWith('data:')  && !absoluteUrl.startsWith('blob:')) {
    absoluteUrl = absoluteUrl.includes('.') && !absoluteUrl.includes(' ') ? 'https://' + absoluteUrl : appSettings.searchEngine + encodeURIComponent(absoluteUrl);
  }
  
  tab.url = absoluteUrl;
  DevTools.sources.clearTab(tab);

  if (isNewNavigation) {
    tab.page.history = tab.page.history.slice(0, tab.page.historyIndex + 1);
    tab.page.history.push(absoluteUrl);
    tab.page.historyIndex = tab.page.history.length - 1;
    
    historyLog.unshift({ url: absoluteUrl, time: new Date().toLocaleTimeString() });
  }

  if (reloadCurrentTab) {
    updateLoadingProgress(20);
    await renderTabContent(tab, absoluteUrl);
    tab.loadTimeMS = Math.floor(performance.now() - startTime);
    updateLoadingProgress(100);
  }

  tab.iframe.addEventListener('load', () => { updateTabMetadata(tab); DevTools.sources.captureProcessed(tab); });

  if (tab.id === activeTabId) {
    updateToolbarUI();
  }
}

async function getDocumentContent(response, url, origin, iframe) {
  var rawHtml;
  const contentType = response.headers.get('content-type') || 'text/html';
  const title = getFileNameFromURL(url, "Document")
  const ext = title.split('.').pop().toLowerCase();

  // Handle 7z Archives
  if (contentType.includes("application/x-7z-compressed") || ext === "7z") {
    rawHtml = await get7zGalleryDocument(response, url, origin, iframe);
  } else if (contentType.includes("text/html")) {
    rawHtml = await response.clone().text();
  } else if (contentType.includes("image/")) {
    rawHtml = `<html>
      <head>
        <title>${title}</title>
      </head>
      <body style="margin:0;background:#1e1e1e;">
        <div style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;padding:0;">
          <img src="${await createDataUri(response)}" style="max-width:90%;max-height:90%;object-fit:contain;"/>
        </div>
      </body>
    </html>`;
  } else if (contentType.includes("audio/")) {
    rawHtml = `<html>
      <head>
        <title>${title}</title>
      </head>
      <body style="margin:0;background:#1e1e1e;">
        <div style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;padding:0;">
          <audio controls src="${await createDataUri(response)}"></audio>
        </div>
      </body>
    </html>`;
  } else if (contentType.includes("video/")) {
    rawHtml = `<html>
      <head>
        <title>${title}</title>
      </head>
      <body style="margin:0;background:#1e1e1e;">
        <div style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;padding:0;">
          <video controls style="max-width:90%;max-height:90%;object-fit:contain;">
            <source src="${await createDataUri(response)}" type="${contentType}">
          </video>
        </div>
      </body>
    </html>`;
  } else {
    rawHtml = `<html>
      <head>
        <title>${title}</title>
      </head>
      <body style="margin:0;background:#1e1e1e;">
        <pre style="font-family:monospace;padding:2px;color:#eeeeee;">${sanitizeHTML(await response.clone().text())}</pre>
      </body>
    </html>`;
  }

  return rawHtml;
}
function sanitizeHTML(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}
async function get7zGalleryDocument(input, url, origin, iframe) {
  function updateProgress(barId, percent, text) {
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      const bar = doc.getElementById(barId);
      const label = doc.getElementById(barId + '-text');
      const percentLabel = doc.getElementById(barId.replace('-bar', '-percent'));
      
      const clamped = Math.min(100, Math.max(0, percent));
      if (bar) bar.style.width = `${clamped}%`;
      if (percentLabel) percentLabel.textContent = `${Math.round(clamped)}%`;
      if (label && text) label.textContent = text;
    } catch (e) {}
  }

  if (iframe) {
    const initialLoadingHtml = `<html>
      <head>
        <title>Loading Archive...</title>
        <script>${__pageRegistry.__usefulHelpers.createRuntimeInterceptor(url, origin)}<\/script>
      </head>
      <body style="margin:0; background:#1e1e1e; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; color:#ffffff;">
        <div style="background:#2a2a2a; padding:30px; border-radius:10px; width:360px; box-shadow:0 4px 10px rgba(0,0,0,0.5);">
          <h3 style="margin-top:0; margin-bottom:20px; font-size:16px; text-align:center;">Processing Archive</h3>
          
          <div style="margin-bottom:18px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
              <span id="download-bar-text">Connecting...</span>
              <span id="download-percent">0%</span>
            </div>
            <div style="background:#1e1e1e; border-radius:4px; height:8px; overflow:hidden;">
              <div id="download-bar" style="background:#0066cc; width:0%; height:100%; transition:width 0.1s linear;"></div>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
              <span id="unzip-bar-text">Waiting to extract...</span>
              <span id="unzip-percent">0%</span>
            </div>
            <div style="background:#1e1e1e; border-radius:4px; height:8px; overflow:hidden;">
              <div id="unzip-bar" style="background:#00ff66; width:0%; height:100%; transition:width 0.1s linear;"></div>
            </div>
          </div>
        </div>
      </body>
    </html>`;

    if (iframe.contentWindow) {
      iframe.setAttribute('src','');
      iframe.setAttribute('srcdoc',initialLoadingHtml);
    }
  }

  // 1. Download tracking with precise bytes computation
  let uint8Data;
  if (input instanceof Response) {
    const contentLength = input.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (totalBytes && input.body) {
      const reader = input.body.getReader();
      let receivedLength = 0;
      let chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        
        const percent = (receivedLength / totalBytes) * 100;
        const mbReceived = (receivedLength / (1024 * 1024)).toFixed(1);
        const mbTotal = (totalBytes / (1024 * 1024)).toFixed(1);
        updateProgress('download-bar', percent, `Downloading (${mbReceived} / ${mbTotal} MB)`);
      }

      uint8Data = new Uint8Array(receivedLength);
      let position = 0;
      for (let chunk of chunks) {
        uint8Data.set(chunk, position);
        position += chunk.length;
      }
    } else {
      updateProgress('download-bar', 50, 'Downloading file...');
      const buffer = await input.arrayBuffer();
      uint8Data = new Uint8Array(buffer);
    }
    const finalSizeMb = (uint8Data.length / (1024 * 1024)).toFixed(1);
    updateProgress('download-bar', 100, `Download complete (${finalSizeMb} MB)`);
  } else {
    updateProgress('download-bar', 100, 'File loaded into memory');
    uint8Data = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  }

  // 2. Initialize 7z-wasm with stdout interception for real extraction percentages
  await wait(0);
  updateProgress('unzip-bar', 5, 'Initializing runtime...');
  if (!window.SevenZip) {
    let attempts = 0;
    while (!window.SevenZip && attempts < 20) {
      await new Promise(r => setTimeout(r, 200));
      attempts++;
    }
  }
  if (!window.SevenZip) {
    throw new Error("Failed to load 7z-wasm runtime module.");
  }

  updateProgress('unzip-bar', 15, 'Starting WebAssembly engine...');
  await wait(0);
  
  let currentFileExtractionCount = 0;
  const sevenZip = await window.SevenZip({
    print: function(text) {
      // 7-Zip stdout reports live progress strings like " 19% 6 - filename.jpg" or standalone digits
      if (text) {
        const match = text.match(/(\d+)%/);
        if (match) {
          const percentVal = parseInt(match[1], 10);
          // Scale extraction portion between 20% and 95% on the progress bar
          const mappedProgress = 20 + (percentVal * 0.75);
          
          // Clean up the text to show the current file being processed nicely
          let statusText = text.trim();
          if (statusText.length > 35) {
            statusText = 'Extracting: ...' + statusText.slice(-30);
          }
          updateProgress('unzip-bar', mappedProgress, statusText);
        }
      }
    },
    printErr: function(text) {
      // Catch potential warnings/errors silently or handle if needed
    }
  });

  let extractedFiles = [];

  try {
    updateProgress('unzip-bar', 18, 'Writing archive to virtual FS...');
    await wait(0);
    const inputPath = '/input_' + Math.random().toString(36).substring(7) + '.7z';
    const outputDir = '/output_' + Math.random().toString(36).substring(7);

    try {
      sevenZip.FS.mkdir(outputDir);
    } catch (e) {}

    sevenZip.FS.writeFile(inputPath, uint8Data);
    
    updateProgress('unzip-bar', 20, 'Extracting files...');
    await wait(0);
    sevenZip.callMain(['x', inputPath, `-o${outputDir}`, '-y']);

    async function readDirRecursive(dirPath, baseDir = dirPath) {
      const entries = sevenZip.FS.readdir(dirPath);
      let files = [];

      for (const entry of entries) {
        if (entry === '.' || entry === '..') continue;
        const fullPath = `${dirPath}/${entry}`;
        const stats = sevenZip.FS.stat(fullPath);

        if (sevenZip.FS.isDir(stats.mode)) {
          files = files.concat(await readDirRecursive(fullPath, baseDir));
        } else if (sevenZip.FS.isFile(stats.mode)) {
          const relativePath = fullPath.substring(baseDir.length + 1);
          const data = sevenZip.FS.readFile(fullPath);
          files.push({
            name: relativePath,
            path: relativePath,
            data: data,
            isDir: false,
            isDirectory: false
          });
        }
      }
      return files;
    }

    updateProgress('unzip-bar', 96, 'Parsing extracted filesystem...');
    await wait(0);
    extractedFiles = await readDirRecursive(outputDir);

    try {
      sevenZip.FS.unlink(inputPath);
    } catch (e) {}
  } catch (err) {
    console.error('7z extraction failed:', err);
    updateProgress('unzip-bar', 100, 'Extraction failed');
    await wait(0);
  }

  updateProgress('unzip-bar', 100, 'Extraction complete');
  await wait(0);

  try {

  // 3. Generate Gallery HTML
  let galleryItemsHtml = '';

  for (const file of extractedFiles) {
    if (file.isDir || file.isDirectory) continue;

    const fileName = (file.name || file.path).split('/').pop();
    const ext = fileName.split('.').pop().toLowerCase();
    
    let contentHtml = '';
    
    const blob = new File([file.data], fileName, { type: typeof inferMime === 'function' ? inferMime(fileName) : '' });
    const downloadUrl = URL.createObjectURL(blob)+'#f='+fileName;

    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) {
      contentHtml = `<img src="${downloadUrl}" alt="${fileName}" style="max-width:100%; max-height:180px; object-fit:contain; display:block; margin:auto;" />`;
    } else if (['txt', 'js', 'json', 'html', 'css', 'md', 'log'].includes(ext)) {
      const textDecoder = new TextDecoder();
      const textContent = textDecoder.decode(file.data);
      const safeText = textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      contentHtml = `<pre style="font-family:monospace; font-size:11px; height:180px; overflow:auto; background:#121212; color:#00ff66; padding:8px; margin:0; border-radius:4px;">${safeText}</pre>`;
    } else {
      continue;
    }

    galleryItemsHtml += `
      <div style="background:#2a2a2a; border-radius:8px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; width:220px; box-shadow:0 4px 6px rgba(0,0,0,0.3);">
        <div style="height:180px; display:flex; align-items:center; justify-content:center; overflow:hidden; background:#1e1e1e; border-radius:4px;">
          ${contentHtml}
        </div>
        <div style="margin-top:10px;">
          <p style="color:#ffffff; font-family:sans-serif; font-size:13px; margin:0 0 8px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${fileName}">${fileName}</p>
          <a href="${downloadUrl}" download="${fileName}" style="display:block; text-align:center; background:#0066cc; color:#ffffff; text-decoration:none; padding:6px 12px; border-radius:4px; font-family:sans-serif; font-size:12px; font-weight:bold;">
            Download
          </a>
        </div>
      </div>`;
  }

  if (!galleryItemsHtml) {
    galleryItemsHtml = `<p style="color:#888; font-family:sans-serif;">No supported image or text files found in this archive.</p>`;
  }

  return `<html>
    <head>
      <title>Archive Gallery</title>
    </head>
    <body style="margin:0; background:#1e1e1e; padding:20px;">
      <div style="display:flex; flex-wrap:wrap; gap:16px; justify-content:center;">
        ${galleryItemsHtml}
      </div>
    </body>
  </html>`;
  }catch(e) {alert(e.message)}
}

async function renderTabContent(tab, url) {
  tab.url = url;
  let origin = "https://example.com";
  try { origin = new URL(url).origin; } catch(e) {}

  var response = await DevTools.network.requestForTab(tab, url, origin, {
    headers:{
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': origin || 'https://google.com'
    }
  }, 'page-load');
  for (var i = 0; i < 5 && (!response || !response.ok); i++) {
    await wait(i * 1000);
    response = await DevTools.network.requestForTab(tab, url, origin, {}, 'page-load');
  }

  if (!response) {
    //tab.iframe.removeAttribute('srcdoc');
    //tab.iframe.src = url;
    tab.iframe.removeAttribute('src');
    tab.iframe.srcdoc = `<div style="font-family: sans-serif; padding: 40px; text-align: center; color: #333;">
      <h2 style="color: #e53e3e;">Proxy Connection Failed</h2>
      <p>Could not load standard URL: <code>${url}</code></p>
      <p style="color: #718096; font-size: 0.9em;">Reason: Most likely blocked</p>
      <button onclick="window.parent.reloadCurrentTab()" style="padding: 8px 16px; background: #5865f2; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">Retry Request</button>
    </div>`;
    return;
  }

  if (!(response instanceof Response) || !response.ok) {
    tab.iframe.removeAttribute('src');
    tab.iframe.srcdoc = `<div style="font-family: sans-serif; padding: 40px; text-align: center; color: #333;">
      <h2 style="color: #e53e3e;">Proxy Connection Failed</h2>
      <p>Could not load standard URL: <code>${url}</code></p>
      <p style="color: #718096; font-size: 0.9em;">Reason: ${response?.message || 'CORS or Proxy Error'}</p>
      <button onclick="window.parent.reloadCurrentTab()" style="padding: 8px 16px; background: #5865f2; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">Retry Request</button>
    </div>`;
    return;
  }

  tab.devtools = tab.devtools || {};
  tab.devtools.rawDocument = '';
  tab.devtools.processedDocument = '';
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) tab.devtools.rawDocument = await response.clone().text();
  } catch(e) {}

  var rawHtml = await getDocumentContent(response, url, origin, tab.iframe);
  tab.page.setLocation(url, origin);
  await tab.page.setDocument(rawHtml);
  tab.devtools.processedDocument = rawHtml;
  DevTools.ui.refreshActiveViews();

}

function goBack() {
  const tab = getActiveTab();
  if (tab && tab.page.historyIndex > 0) {
    tab.page.historyIndex--;
    navigateToInTab(tab, tab.page.history[tab.page.historyIndex], false);
  }
}

function goForward() {
  const tab = getActiveTab();
  if (tab && tab.page.historyIndex < tab.page.history.length - 1) {
    tab.page.historyIndex++;
    navigateToInTab(tab, tab.page.history[tab.page.historyIndex], false);
  }
}

async function updateTabMetadata(tab) {
  try {
    const doc = tab.iframe.contentDocument || tab.iframe.contentWindow.document;
    if(doc) {
      const t = doc.querySelector('title');
      tab.title = t ? t.textContent : tab.url;
      const i = doc.querySelector('link[rel*="icon"]');
      tab.favicon = i && i.href ? i.href : DEFAULT_FAVICON;
    }
  } catch(e) {}
  renderTabStrip();
  if (!document.getElementById('devtools-panel').classList.contains('hidden')) {
    DevTools.ui.switchTab(DevTools.activeTab);
  }
}

function reloadCurrentTab() {
  const tab = getActiveTab();
  if (tab && tab.page.historyIndex >= 0) {
    if (appSettings.clearDevToolsOnReload) DevTools.ui.clearForReload(tab);
    navigateToInTab(tab, tab.page.history[tab.page.historyIndex], false);
  }
}

function handleUrlSubmit(e) {
  e.preventDefault();
  let inputUrl = document.getElementById('url-bar').value.trim();
  if (inputUrl) navigateTo(inputUrl, true);
}

function renderTabStrip() {
  const container = document.getElementById('tabs-list');
  container.innerHTML = '';

  tabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
    tabEl.onclick = () => switchTab(tab.id);
    
    tabEl.onauxclick = (e) => {
      if (e.button === 1) closeTab(tab.id, e);
    };

    const displayTitle = tab.title || tab.url;

    tabEl.innerHTML = `
      <img class="tab-favicon" src="${tab.favicon}" onerror="this.src=\`${DEFAULT_FAVICON}\`" alt="icon">
      <span class="tab-title" title="${displayTitle}">${displayTitle}</span>
      <span class="tab-close" onclick="closeTab('${tab.id}', event)">✕</span>
    `;
    container.appendChild(tabEl);
  });
}

function updateToolbarUI() {
  const tab = getActiveTab();
  if (!tab) return;

  const currentUrl = tab.page.history[tab.page.historyIndex] || '';
  document.getElementById('url-bar').value = currentUrl;

  const iconEl = document.getElementById('protocol-icon');
  if (currentUrl.startsWith('https://')) {
    iconEl.className = 'fa-solid fa-lock protocol-icon';
  } else if (currentUrl.startsWith('http://')) {
    iconEl.className = 'fa-solid fa-lock-open protocol-icon http';
  } else {
    iconEl.className = 'fa-solid fa-cube protocol-icon local';
  }

  document.getElementById('btn-back').disabled = tab.page.historyIndex <= 0;
  document.getElementById('btn-forward').disabled = tab.page.historyIndex >= tab.page.history.length - 1;

  renderTabStrip();
  updateBookmarkStar();
}

function renderBookmarks() {
  const container = document.getElementById('bookmarks-list');
  container.innerHTML = '';
  bookmarks.forEach(bm => {
    const btn = document.createElement('button');
    btn.className = 'bookmark-btn';
    btn.innerHTML = `<i class="fa-regular fa-globe text-xs"></i> <span>${bm.title}</span>`;
    btn.onclick = () => navigateTo(bm.url, true);
    container.appendChild(btn);
  });
}

function updateBookmarkStar() {
  const tab = getActiveTab();
  const star = document.getElementById('bookmark-star');
  if (!tab || !star) return;
  
  const isBookmarked = bookmarks.some(b => b.url === tab.url);
  star.className = isBookmarked ? 'fa-solid fa-star text-yellow-400' : 'fa-regular fa-star text-gray-400';
}

function toggleBookmarkCurrent() {
  const tab = getActiveTab();
  if (!tab) return;

  const idx = bookmarks.findIndex(b => b.url === tab.url);
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
    showToast('Removed from bookmarks');
  } else {
    bookmarks.push({ title: tab.title || tab.url, url: tab.url });
    showToast('Added to bookmarks!', 'success');
  }
  renderBookmarks();
  updateBookmarkStar();
}

function renderHistoryLog() {
  const container = document.getElementById('history-log-list');
  container.innerHTML = '';
  if (historyLog.length === 0) {
    container.innerHTML = '<div class="text-xs text-gray-500 italic p-2">No browsing history recorded yet.</div>';
    return;
  }
  historyLog.forEach(item => {
    const div = document.createElement('div');
    div.className = 'p-2 bg-gray-800 border border-gray-700 rounded flex justify-between items-center text-xs hover:bg-gray-750 cursor-pointer';
    div.innerHTML = `<span class="truncate text-indigo-300 font-mono">${item.url}</span> <span class="text-gray-500 text-[10px]">${item.time}</span>`;
    div.onclick = () => {
      navigateTo(item.url, true);
      closeModal('history-modal');
    };
    container.appendChild(div);
  });
}

function clearHistoryLog() {
  historyLog = [];
  renderHistoryLog();
  showToast('Browsing history cleared');
}

function updateSettings() {
  document.getElementById('setting-default-tab').value = appSettings.defaultTab;
  document.getElementById('setting-proxy-url').value = appSettings.primaryProxy;
  document.getElementById('setting-fallback-proxy-url').value = appSettings.fallbackProxy;
  document.getElementById('setting-search-engine').value = appSettings.searchEngine;
  document.getElementById('setting-fallback-enable').checked = appSettings.useFallback;
  document.getElementById('setting-obscure-url').checked = appSettings.obscureURL;
  document.getElementById('setting-clear-devtools-reload').checked = appSettings.clearDevToolsOnReload;
  updateNetworkSettings();
}

function saveSettings() {
  appSettings.defaultTab = document.getElementById('setting-default-tab').value;
  appSettings.primaryProxy = document.getElementById('setting-proxy-url').value;
  appSettings.fallbackProxy = document.getElementById('setting-fallback-proxy-url').value;
  appSettings.searchEngine = document.getElementById('setting-search-engine').value;
  appSettings.useFallback = document.getElementById('setting-fallback-enable').checked;
  appSettings.obscureURL = document.getElementById('setting-obscure-url').checked;
  appSettings.clearDevToolsOnReload = document.getElementById('setting-clear-devtools-reload').checked;
  setStorageItem('appSettings',appSettings);
  updateNetworkSettings();
  closeModal('settings-modal');
  showToast('Settings updated', 'success');
}

// Global Key Bindings Handler (F12, DevTools, Ctrl Shortcuts)
window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && DevTools.elements.isPickerActive()) { e.preventDefault(); DevTools.elements.stopPicker(); return; }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) { e.preventDefault(); DevTools.elements.startPicker(); return; }
  if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i')) {
    e.preventDefault();
    DevTools.ui.toggle();
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase();
    if (e.shiftKey && key === 't') { e.preventDefault(); restoreClosedTab(); return; }
    if (key === 't' && !e.shiftKey) { e.preventDefault(); createNewTab(appSettings.defaultTab, true); return; }
    if (key === 'w') { e.preventDefault(); if (activeTabId) closeTab(activeTabId); return; }
    if (key === 'r') { e.preventDefault(); reloadCurrentTab(); return; }
    if (key === 'l') { e.preventDefault(); const b = document.getElementById('url-bar'); b.focus(); b.select(); return; }
    if (key >= '1' && key <= '9') { e.preventDefault(); switchTabByIndex(key === '9' ? tabs.length - 1 : parseInt(key, 10) - 1); return; }
  }
});

createNewTab(appSettings.defaultTab);
renderBookmarks();

function inferMime(name) {
  if (name == "LICENSE") return "text/plain";
  const ext = name.split('.').pop()?.toLowerCase();
  const map = {
    'txt':'text/plain',
    'md':'text/markdown',
    'js':'text/javascript',
    'ts':'text/typescript',
    'json':'application/json',
    'html':'text/html',
    'css':'text/css',
    'png':'image/png',
    'jpg':'image/jpeg',
    'jpeg':'image/jpeg',
    'gif':'image/gif',
    'webp':'image/webp',
    'avif':'image/avif',
    'hdr':'image/vnd.radiance',
    'exr':'image/x-exr',
    'svg':'image/svg+xml',
    'mp3':'audio/mpeg',
    'wav':'audio/wav',
    'ogg':'audio/ogg',
    'mp4':'video/mp4',
    'webm':'video/webm',
    'obj':'model/obj',
    'fbx':'model/x-fbx',
    'glb':'model/gltf-binary',
    'gltf':'model/gltf+json',
    'mtl':'text/plain',
    'frag':'text/x-hlsl',
    'vert':'text/x-hlsl',
    'hlsl':'text/x-hlsl',
    'fx':'text/x-hlsl',
    'wgsl':'text/wgsl',
    'py':'text/x-python',
    'c':'text/x-c',
    'cpp':'text/x-c'
  };
  return map[ext]||'application/octet-stream';
}

(function forceV8ErrorPolyfillForSafari() {
  // Test if the current environment's captureStackTrace supports prepareStackTrace (V8 behavior)
  var supportsV8StackAPI = false;
  if (typeof Error.captureStackTrace === 'function') {
    var testObj = {};
    var originalPrep = Error.prepareStackTrace;
    
    // Set a dummy formatter to see if the engine triggers it
    Error.prepareStackTrace = function() { return ['mock-frame']; };
    try {
      Error.captureStackTrace(testObj);
      if (Array.isArray(testObj.stack) && testObj.stack[0] === 'mock-frame') {
        supportsV8StackAPI = true;
      }
    } catch (e) {}
    
    // Restore original property
    Error.prepareStackTrace = originalPrep;
  }

  // If the engine behaves fully like V8, we do not need to patch it
  if (supportsV8StackAPI) return;

  // --- Force Override/Polyfill for Safari ---
  Error.stackTraceLimit = Error.stackTraceLimit || 10;
  Error.prepareStackTrace = Error.prepareStackTrace || null;

  Error.captureStackTrace = function (targetObject, constructorOpt) {
    // Force a dummy error instantiation to parse the clean raw text stack
    var dummyError = new Error();
    var rawStack = dummyError.stack || '';

    Object.defineProperty(targetObject, 'stack', {
      configurable: true,
      enumerable: true,
      get: function () {
        // If a V8 custom formatter is attached, process into mock CallSites
        if (typeof Error.prepareStackTrace === 'function') {
          var mockCallSites = parseSafariStackToCallSites(rawStack, constructorOpt);
          
          if (mockCallSites.length > Error.stackTraceLimit) {
            mockCallSites = mockCallSites.slice(0, Error.stackTraceLimit);
          }
          return Error.prepareStackTrace(targetObject, mockCallSites);
        }
        // Otherwise, fall back to Safari's default text trace
        return rawStack;
      }
    });
  };

  // Helper: Parses Safari string layout into structured V8-like CallSite frames
  function parseSafariStackToCallSites(stackString, constructorOpt) {
    var lines = stackString.split('\n');
    var frames = [];
    var skipFrames = !!constructorOpt;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      // Extract details from Safari line format: "functionName@URL:line:column"
      var atIndex = line.indexOf('@');
      var functionName = atIndex > -1 ? line.substring(0, atIndex) : '';
      var urlAndCoords = atIndex > -1 ? line.substring(atIndex + 1) : line;

      var lastColon = urlAndCoords.lastIndexOf(':');
      var secondToLastColon = urlAndCoords.lastIndexOf(':', lastColon - 1);
      
      var fileName = urlAndCoords;
      var lineNumber = null;
      var columnNumber = null;

      if (secondToLastColon > -1 && lastColon > -1) {
        fileName = urlAndCoords.substring(0, secondToLastColon);
        lineNumber = parseInt(urlAndCoords.substring(secondToLastColon + 1, lastColon), 10);
        columnNumber = parseInt(urlAndCoords.substring(lastColon + 1), 10);
      }

      // Drop utility/wrapper trace frames if requested by user configuration
      if (constructorOpt && skipFrames) {
        if (functionName === constructorOpt.name) {
          skipFrames = false; 
        }
        continue;
      }

      // Build mock V8 CallSite instance mapping
      frames.push({
        getFileName: (function(f) { return function() { return f; }; })(fileName),
        getLineNumber: (function(l) { return function() { return l; }; })(lineNumber),
        getColumnNumber: (function(c) { return function() { return c; }; })(columnNumber),
        getFunctionName: (function(n) { return function() { return n || null; }; })(functionName),
        getMethodName: (function(n) { return function() { return n || null; }; })(functionName),
        getTypeName: function() { return null; },
        getThis: function() { return undefined; },
        isNative: function() { return false; },
        isConstructor: function() { return false; },
        isEval: function() { return false; }
      });
    }

    // Default cleanup fallback if constructor target trace frame was not matched
    return (constructorOpt || frames.length < 2) ? frames : frames.slice(2);
  }
})();
