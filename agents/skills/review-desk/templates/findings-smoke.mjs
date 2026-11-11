import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
// Run from a copy beside node_modules/jsdom; REVIEW_DIR names the templates.
const DIR = process.env.REVIEW_DIR || new URL('.', import.meta.url).pathname;
let html = readFileSync(DIR + 'findings.html', 'utf8');
for (const s of ['core.js', 'data-findings.js']) {
  const body = readFileSync(DIR + s, 'utf8');
  // This suite tests desk mechanics; the draft-candidate policy has its own
  // tests in regressions.mjs, so clear the draft flags here.
  const extra = s === 'data-findings.js'
    ? "<script>window.FINDINGS.items.forEach((i) => i.candidates.forEach((c) => { c.isDraft = false; }));</script>"
    : '';
  html = html.replace(`<script src="${s}"></script>`, `<script>${body}</script>${extra}`);
}
const errors = [];
const dom = new JSDOM(html, { url: 'https://local.test/findings.html', runScripts: 'dangerously',
  beforeParse(w) {
    w.addEventListener('error', (e) => errors.push(String(e.error || e.message)));
    w.Element.prototype.scrollIntoView = function () {};
    w.open = () => null;
    w.__exports = [];
    w.__clip = '';
    Object.defineProperty(w.navigator, 'clipboard', {
      value: { writeText: async (t) => { w.__clip = t; } }, configurable: true });
    w.URL.createObjectURL = (b) => { w.__exports.push(b); return 'blob:stub'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {};
  } });
const w = dom.window, doc = w.document;
const res = [];
const check = (n, ok, d = '') => res.push({ n, ok: !!ok, d });
const F = w.eval('window.FINDINGS_UI');
const st = (n) => F.state['f' + n];
const verifyAll = () => {
  let b;
  while ((b = doc.querySelector('#detail button[data-check][data-v="verified"][aria-pressed="false"]'))) b.click();
};
const stageOf = (n) => F.stage(F.item('f' + n)).key;

check('renders all findings', doc.querySelectorAll('#queue .q').length === 7, doc.querySelectorAll('#queue .q').length);
check('flags findings without a PR', doc.getElementById('queue').textContent.includes('No PR'));
[...doc.querySelectorAll('#queue .q')].find((b) => b.dataset.id === 'f902').click();
check('detail names the other findings a shared PR claims',
  doc.getElementById('detail').textContent.includes('also claims 664') ||
  doc.getElementById('detail').textContent.includes('also claims #664'),
  doc.getElementById('detail').textContent.slice(0, 200));
check('no errors', errors.length === 0, errors.join(' | '));

// A finding with no candidate PR cannot be "fixed".
[...doc.querySelectorAll('#queue .q')].find((b) => b.dataset.id === 'f888').click();
doc.querySelector('#verdict button[data-verdict="fixed"]').click();
check('a fixed verdict without a PR is blocked', F.blockers(F.item('f888')).some((x) => /No candidate PR/.test(x)),
  JSON.stringify(F.blockers(F.item('f888'))));
check('approve stays disabled', doc.getElementById('approve').disabled === true);

// Verdict must be closable.
doc.querySelector('#queue').querySelector('[data-id="f894"]').click();
doc.querySelector('#verdict button[data-verdict="partial"]').click();
doc.getElementById('comment').value = 'Partly fixed; the remaining cause is tracked in #909.';
doc.getElementById('comment').dispatchEvent(new w.Event('input', { bubbles: true }));
check('a partial verdict cannot close', F.blockers(F.item('f894')).some((x) => /cannot close/.test(x)),
  JSON.stringify(F.blockers(F.item('f894'))));

// Fixed + all checks verified + comment → ready.
doc.querySelector('#verdict button[data-verdict="fixed"]').click();
  verifyAll();
check('all checks verified clears the blockers', F.blockers(F.item('f894')).length === 0,
  JSON.stringify(F.blockers(F.item('f894'))));
doc.getElementById('approve').click();
check('approve moves it to ready', stageOf(894) === 'ready', stageOf(894));


doc.getElementById('closed').click();
check('mark closed records a receipt', stageOf(894) === 'closed' && typeof st(894).closedAt === 'string', stageOf(894));

// Contradicted check revokes readiness.
doc.querySelector('#queue').querySelector('[data-id="f900"]').click();
doc.querySelector('#verdict button[data-verdict="fixed"]').click();
doc.getElementById('comment').value = 'Fixed by keying the cache by API version.';
doc.getElementById('comment').dispatchEvent(new w.Event('input', { bubbles: true }));
  verifyAll();
doc.getElementById('approve').click();
check('a second finding reaches ready', stageOf(900) === 'ready', stageOf(900));
doc.querySelector('#queue').querySelector('[data-id="f900"]').click();
doc.querySelector('#detail button[data-check][data-v="wrong"]').click();
check('a contradicted check revokes ready', stageOf(900) === 'drafted', stageOf(900));

// A contradicted check cannot be re-approved without re-checking it.
for (let i = 0; i < 5 && doc.querySelector('#detail button[data-check][data-v="verified"][aria-pressed="false"]'); i++) {
  doc.querySelector('#detail button[data-check][data-v="verified"][aria-pressed="false"]').click();
}
doc.getElementById('approve').click();
check('re-checking a contradicted claim restores ready', stageOf(900) === 'ready', stageOf(900));

check('no late errors', errors.length === 0, errors.join(' | '));
let failed = 0;
for (const r of res) { if (!r.ok) failed++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.n}${r.ok ? '' : '  → ' + r.d}`); }
console.log(`\n${res.length - failed}/${res.length} checks passed`);
process.exit(failed ? 1 : 0);
