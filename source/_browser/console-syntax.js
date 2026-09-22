(function(){
  'use strict';

  if (window.ConsoleSyntax && window.ConsoleSyntax.attach) return;

  const BRACKET_COLORS = ['dt-console-bracket-1','dt-console-bracket-2','dt-console-bracket-3'];
  const OPEN = {'(':')','[':']','{':'}'};
  const CLOSE = {')':'(',']':'[','}':'{'};

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function makeSpan(className,text) {
    return '<span class="dt-console-syn-' + className + '">' + escapeHTML(text) + '</span>';
  }

  function scanString(code,start,quote) {
    let i = start + 1;
    while (i < code.length) {
      if (code[i] === '\\') { i += 2; continue; }
      if (code[i] === quote) return i + 1;
      i++;
    }
    return code.length;
  }

  function findTemplateExpressionEnd(code,start) {
    let i = start;
    let depth = 0;

    while (i < code.length) {
      const ch = code[i], next = code[i + 1];

      if (ch === '/' && next === '/') {
        const n = code.indexOf('\n',i + 2);
        i = n < 0 ? code.length : n;
        continue;
      }

      if (ch === '/' && next === '*') {
        const n = code.indexOf('*/',i + 2);
        i = n < 0 ? code.length : n + 2;
        continue;
      }

      if (ch === '"' || ch === "'") {
        i = scanString(code,i,ch);
        continue;
      }

      if (ch === '`') {
        i = skipTemplateLiteral(code,i);
        continue;
      }

      if (ch === '{') {
        depth++;
        i++;
        continue;
      }

      if (ch === '}') {
        if (depth === 0) return i;
        depth--;
        i++;
        continue;
      }

      if (ch === '\\') {
        i += 2;
        continue;
      }

      i++;
    }

    return -1;
  }

  function skipTemplateLiteral(code,start) {
    let i = start + 1;

    while (i < code.length) {
      const ch = code[i], next = code[i + 1];

      if (ch === '\\') {
        i += 2;
        continue;
      }

      if (ch === '`') return i + 1;

      if (ch === '$' && next === '{') {
        const end = findTemplateExpressionEnd(code,i + 2);
        if (end < 0) return code.length;
        i = end + 1;
        continue;
      }

      i++;
    }

    return code.length;
  }

  function scanTemplateProtected(code,start,ranges) {
    let i = start + 1;
    let segmentStart = start;

    while (i < code.length) {
      const ch = code[i], next = code[i + 1];

      if (ch === '\\') {
        i += 2;
        continue;
      }

      if (ch === '`') {
        ranges.push([segmentStart,i + 1]);
        return i + 1;
      }

      if (ch === '$' && next === '{') {
        ranges.push([segmentStart,i]);

        const end = findTemplateExpressionEnd(code,i + 2);
        if (end < 0) {
          return code.length;
        }

        segmentStart = end + 1;
        i = end + 1;
        continue;
      }

      i++;
    }

    ranges.push([segmentStart,code.length]);
    return code.length;
  }

  function scanProtected(code) {
    const ranges = [];
    let i = 0;
    while (i < code.length) {
      const ch = code[i], next = code[i + 1];
      if (ch === '/' && next === '/') {
        const n = code.indexOf('\n',i + 2);
        const end = n < 0 ? code.length : n;
        ranges.push([i,end]);
        i = end;
        continue;
      }
      if (ch === '/' && next === '*') {
        const n = code.indexOf('*/',i + 2);
        const end = n < 0 ? code.length : n + 2;
        ranges.push([i,end]);
        i = end;
        continue;
      }
      if (ch === '"' || ch === "'") {
        const end = scanString(code,i,ch);
        ranges.push([i,end]);
        i = end;
        continue;
      }
      if (ch === '`') {
        i = scanTemplateProtected(code,i,ranges);
        continue;
      }
      i++;
    }
    return ranges;
  }

  function markBrackets(code,ranges) {
    const marks = new Map();
    const stack = [];
    let rangeIndex = 0;

    function isProtected(pos) {
      while (rangeIndex < ranges.length && ranges[rangeIndex][1] <= pos) rangeIndex++;
      return rangeIndex < ranges.length && ranges[rangeIndex][0] <= pos && pos < ranges[rangeIndex][1];
    }

    for (let i = 0; i < code.length; i++) {
      if (isProtected(i)) continue;
      const ch = code[i];
      if (OPEN[ch]) {
        stack.push({char:ch,index:i,level:stack.length % 3});
        continue;
      }
      if (!CLOSE[ch]) continue;

      if (!stack.length) {
        marks.set(i,'dt-console-bracket-error');
        continue;
      }

      const top = stack[stack.length - 1];
      if (top.char === CLOSE[ch]) {
        const cls = BRACKET_COLORS[top.level];
        marks.set(top.index,cls);
        marks.set(i,cls);
        stack.pop();
      } else {
        marks.set(i,'dt-console-bracket-error');
      }
    }

    for (const open of stack) marks.set(open.index,'dt-console-bracket-error');
    return marks;
  }

  function lex(code) {
    const protectedRanges = scanProtected(code);
    const tokens = [];
    const keywordSet = new Set('as async await break case catch class const continue debugger default delete do else export extends finally for from function get if implements import in instanceof interface let new of package private protected public return set static super switch throw try typeof var void while with yield this'.split(' '));
    const literalSet = new Set(['true','false','null','undefined','NaN','Infinity']);
    const builtinSet = new Set([
      'window','document','console','JSON','Math','Array','Object','String','Number','Boolean','BigInt','Symbol',
      'Promise','Reflect','Proxy','Date','RegExp','Map','Set','WeakMap','WeakSet','URL','URLSearchParams',
      'Error','TypeError','RangeError','ReferenceError','SyntaxError','EvalError','URIError','fetch',
      'setTimeout','setInterval','clearTimeout','clearInterval','requestAnimationFrame','requestIdleCallback',
      'queueMicrotask','event'
    ]);

    let i = 0;
    let protectedIndex = 0;
    function advanceProtected(pos) {
      while (protectedIndex < protectedRanges.length && protectedRanges[protectedIndex][1] <= pos) protectedIndex++;
      return protectedRanges[protectedIndex] && protectedRanges[protectedIndex][0] <= pos && pos < protectedRanges[protectedIndex][1];
    }

    while (i < code.length) {
      if (advanceProtected(i)) {
        const end = protectedRanges[protectedIndex][1];
        const start = protectedRanges[protectedIndex][0];
        const type = code[start] === '`' ? 'template' : 'string';
        if (code[start] === '/' && code[start + 1] === '/') tokens.push({start,end,type:'comment'});
        else if (code[start] === '/' && code[start + 1] === '*') tokens.push({start,end,type:'comment'});
        else tokens.push({start,end,type});
        i = end;
        continue;
      }

      const ch = code[i];
      if (/\d/.test(ch) && (i === 0 || /[^A-Za-z_$]/.test(code[i - 1]))) {
        const m = code.slice(i).match(/^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?n?)/);
        if (m) {
          tokens.push({start:i,end:i + m[0].length,type:'number'});
          i += m[0].length;
          continue;
        }
      }

      if (/[A-Za-z_$]/.test(ch)) {
        const m = code.slice(i).match(/^[A-Za-z_$][\w$]*/)[0];
        const rest = code.slice(i + m.length);
        let type = 'plain';
        if (keywordSet.has(m)) type = 'keyword';
        else if (literalSet.has(m)) type = 'literal';
        else if (builtinSet.has(m)) type = 'builtin';
        else if (/^\s*\(/.test(rest)) type = 'function';
        tokens.push({start:i,end:i + m.length,type});
        i += m.length;
        continue;
      }

      i++;
    }
    return {tokens,protectedRanges};
  }

  function render(code) {
    code = String(code == null ? '' : code);
    const parsed = lex(code);
    const brackets = markBrackets(code,parsed.protectedRanges);
    const byStart = new Map();
    parsed.tokens.forEach(token => byStart.set(token.start,token));

    let html = '';
    let i = 0;
    while (i < code.length) {
      const token = byStart.get(i);
      if (token) {
        const text = code.slice(token.start,token.end);
        html += token.type === 'plain' ? escapeHTML(text) : makeSpan(token.type,text);
        i = token.end;
        continue;
      }
      const bracketClass = brackets.get(i);
      if (bracketClass) {
        html += makeSpan('bracket ' + bracketClass,code[i]);
        i++;
        continue;
      }
      html += escapeHTML(code[i]);
      i++;
    }
    return html;
  }

  function copyTextMetrics(from,to) {
    const css = getComputedStyle(from);
    to.style.fontFamily = css.fontFamily;
    to.style.fontSize = css.fontSize;
    to.style.fontWeight = css.fontWeight;
    to.style.fontStyle = css.fontStyle;
    to.style.lineHeight = css.lineHeight;
    to.style.letterSpacing = css.letterSpacing;
    to.style.textTransform = css.textTransform;
    to.style.textIndent = css.textIndent;
    to.style.textAlign = css.textAlign;
    to.style.tabSize = css.tabSize;
    to.style.padding = css.padding;
    to.style.border = css.border;
    to.style.boxSizing = css.boxSizing;
  }

  function attach(textarea) {
    if (!textarea || textarea.tagName !== 'TEXTAREA' || textarea.dataset.consoleSyntaxAttached === '1') return textarea;
    textarea.dataset.consoleSyntaxAttached = '1';

    const wrapper = document.createElement('div');
    wrapper.className = 'dt-console-syntax-wrap';
    wrapper.setAttribute('aria-hidden','false');

    const highlight = document.createElement('pre');
    highlight.className = 'dt-console-syntax-highlight';
    highlight.setAttribute('aria-hidden','true');

    const parent = textarea.parentNode;
    if (!parent) return textarea;
    parent.insertBefore(wrapper,textarea);
    wrapper.appendChild(highlight);
    wrapper.appendChild(textarea);

    function syncMetrics() {
      copyTextMetrics(textarea,highlight);
      const css = getComputedStyle(textarea);
      highlight.style.color = css.color === 'rgba(0, 0, 0, 0)' ? '#e5e7eb' : css.color;
      highlight.style.background = 'transparent';
      highlight.style.width = '100%';
      highlight.style.height = '100%';
    }

    function renderValue() {
      highlight.innerHTML = render(textarea.value || '');
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    }

    function syncSize() {
      // Keep the initial console prompt exactly one line tall.
      if (!textarea.value) {
        textarea.style.height = '20px';
        wrapper.style.height = '20px';
      } else {
        wrapper.style.height = textarea.offsetHeight + 'px';
      }
      renderValue();
    }

    function syncAll() {
      syncMetrics();
      renderValue();
      syncSize();
    }

    wrapper.addEventListener('scroll',function(){
      textarea.scrollTop = wrapper.scrollTop;
      textarea.scrollLeft = wrapper.scrollLeft;
    });
    textarea.addEventListener('scroll',function(){
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    });
    textarea.addEventListener('input',function(){
      renderValue();
      // browser.html already adjusts the native textarea's height after input.
      requestAnimationFrame(syncSize);
    });

    const nativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
    if (nativeValue && nativeValue.get && nativeValue.set) {
      Object.defineProperty(textarea,'value',{
        configurable:true,
        enumerable:true,
        get:function(){ return nativeValue.get.call(textarea); },
        set:function(next){
          nativeValue.set.call(textarea,String(next == null ? '' : next));
          requestAnimationFrame(syncAll);
        }
      });
    }

    const observer = new ResizeObserver(syncAll);
    observer.observe(textarea);

    syncAll();
    return textarea;
  }

  const style = document.createElement('style');
  style.id = 'console-syntax-styles';
  style.textContent = `
    .dt-console-syntax-wrap {
      position: relative;
      flex: 1 1 auto;
      min-width: 0;
      min-height: 20px;
      height: 20px;
      overflow: hidden;
    }
    .dt-console-syntax-wrap > textarea,
    .dt-console-syntax-highlight {
      position: absolute;
      inset: 0;
      box-sizing: border-box;
      width: 100%;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      outline: 0 !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
      line-height: 20px;
      letter-spacing: normal;
      tab-size: 2;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-x: hidden;
    }
    .dt-console-syntax-highlight {
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
      color: #e5e7eb;
      background: transparent;
    }
    .dt-console-syntax-wrap > textarea {
      z-index: 1;
      resize: none;
      overflow-x: hidden;
      overflow-y: auto;
      background: transparent !important;
      color: transparent !important;
      -webkit-text-fill-color: transparent !important;
      caret-color: #f3f4f6 !important;
    }
    .dt-console-syntax-wrap > textarea::selection {
      background: rgba(88,101,242,.45);
      color: transparent;
    }
    .dt-console-syn-keyword { color: #c4b5fd; }
    .dt-console-syn-literal { color: #fda4af; }
    .dt-console-syn-string, .dt-console-syn-template { color: #86efac; }
    .dt-console-syn-number { color: #f9a8d4; }
    .dt-console-syn-comment { color: #6b7280; }
    .dt-console-syn-builtin { color: #93c5fd; }
    .dt-console-syn-function { color: #fcd34d; }
    .dt-console-syn-bracket { font-weight: 600; }
    .dt-console-syn-bracket.dt-console-bracket-1 { color: #f9c74f; }
    .dt-console-syn-bracket.dt-console-bracket-2 { color: #a78bfa; }
    .dt-console-syn-bracket.dt-console-bracket-3 { color: #38bdf8; }
    .dt-console-syn-bracket.dt-console-bracket-error { color: #f87171 !important; font-weight: 700; }
  `;
  (document.head || document.documentElement).appendChild(style);

  window.ConsoleSyntax = {attach,render};

  function init() {
    const input = document.getElementById('consoleInput');
    if (input) attach(input);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
