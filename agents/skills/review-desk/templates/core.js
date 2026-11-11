'use strict';
/* Presentation primitives shared by every desk: escaping, a small Markdown
   renderer for review bodies, the clipboard, and file download. They carry no
   model, so a new item kind can use them without importing a thread model. */
const CORE = (() => {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* Minimal Markdown for review bodies: fences (with a suggestion style),
       inline code, links, bold, list items, rules. */
  function md(src) {
      const out = [];
      const lines = String(src).split('\n');
      let fence = null, fenceLang = '', buf = [];
      const flushFence = () => {
        const cls = fenceLang === 'suggestion' ? 'suggestion' : 'code';
        out.push(`<div class="${cls}"><pre><code>${esc(buf.join('\n'))}</code></pre></div>`);
        buf = [];
      };
      for (const line of lines) {
        if (line.startsWith('```')) {
          if (fence) { flushFence(); fence = null; fenceLang = ''; }
          else { fence = true; fenceLang = line.slice(3).trim(); }
          continue;
        }
        if (fence) { buf.push(line); continue; }
        if (!line.trim()) { out.push(''); continue; }
        if (/^---+$/.test(line.trim())) { out.push('<hr class="sep">'); continue; }
        const li = line.match(/^\s*[-*]\s+(.*)$/);
        if (li) { out.push(`<li>${inline(li[1])}</li>`); continue; }
        out.push(`<p>${inline(line)}</p>`);
      }
      if (fence) flushFence();
      return out.join('').replace(/(<li>[\s\S]*?<\/li>)(?!<li>)/g, '<ul>$1</ul>');
    }

  function inline(text) {
      let s = esc(text);
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      return s;
    }

  const shortPath = (p) => p.split('/').slice(-2).join('/');

    function fmtDate(iso) {
      const d = new Date(iso);
      return d.toISOString().slice(0, 10);
    }

  async function copy(text, btn) {
      const label = btn ? btn.textContent : '';
      try {
        await navigator.clipboard.writeText(text);
        if (btn) { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = label; }, 1200); }
        return true;
      } catch (e) {
        if (btn) { btn.textContent = 'Select and copy'; setTimeout(() => { btn.textContent = label; }, 1800); }
        return false;
      }
    }

  function download(name, type, body) {
      const url = URL.createObjectURL(new Blob([body], { type }));
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

  /* 32-bit FNV-1a over a string. Detects drift between what a human approved
     and what the desk now holds; it is a checksum, not a signature. */
  function digest(value) {
    let h = 0x811c9dc5;
    for (let i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  return { esc, inline, md, copy, download, fmtDate, shortPath, digest };
})();
