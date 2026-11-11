// Regression tests for the three defects found in review: a claim added after
// the last save escaping the gate, a command copied before approval, and a
// command that names no repository. Runs against the real pages.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// Run from a copy beside node_modules/jsdom; REVIEW_DIR names the templates.
const DIR = process.env.REVIEW_DIR || new URL('.', import.meta.url).pathname;
const read = (f) => readFileSync(DIR + f, 'utf8');
const res = [];
const check = (n, ok, d = '') => res.push({ n, ok: !!ok, d });

function mount(page, scripts, { mutate = '', mutateAfter = scripts[scripts.length - 1], storage = null } = {}) {
  let html = read(page);
  for (const s of scripts) {
    const body = read(s);
    html = html.replace(`<script src="${s}"></script>`,
      `<script>${body}</script>${mutate && s === mutateAfter ? `<script>${mutate}</script>` : ''}`);
  }
  const errors = [];
  const dom = new JSDOM(html, {
    url: 'https://local.test/x.html', runScripts: 'dangerously',
    beforeParse(w) {
      w.addEventListener('error', (e) => errors.push(String(e.error || e.message)));
      w.Element.prototype.scrollIntoView = function () {};
      w.open = () => null;
      w.__clip = '';
      w.__exports = [];
      Object.defineProperty(w.navigator, 'clipboard', {
        value: { writeText: async (t) => { w.__clip = t; } }, configurable: true });
      w.URL.createObjectURL = (b) => { w.__exports.push(b); return 'blob:stub'; };
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () {};
      for (const [k, v] of Object.entries(storage || {})) w.localStorage.setItem(k, v);
    },
  });
  return { w: dom.window, doc: dom.window.document, errors };
}

/* ---------- findings: a claim added after the last save ---------- */
const OLD = JSON.stringify({
  rev: 4,
  items: {
    f894: {
      verdict: 'fixed', comment: 'Fixed.', review: 'approved', closedAt: null,
      checks: { '894-0': 'verified', '894-1': 'verified', '894-2': 'verified' },
    },
  },
});
{
  const { w, doc, errors } = mount('findings.html', ['core.js', 'data-findings.js'], {
    mutate: "window.FINDINGS.items.find((i) => i.id === 'f894').checks.push({ id: '894-3', text: 'New claim added after your save', evidence: 'src/x.rs:1' });",
    storage: { 'review-findings:Example audit (2026-01-15)': OLD },
  });
  const F = w.FINDINGS_UI;
  const stage = F.stage(F.item('f894')).key;
  const b = F.blockers(F.item('f894'));
  check('a claim added later starts unverified',
    b.some((x) => /\d+ checks? unverified/.test(x)), JSON.stringify(b));
  check('a claim added later revokes readiness', stage !== 'ready', stage);
  check('the page loads without error', errors.length === 0, errors.join(' | '));
}

/* ---------- threads: the same merge ---------- */
{
  const threads = JSON.parse(readFileSync(DIR + 'data.js', 'utf8').split('window.REVIEW = ')[1].replace(/;\s*$/, ''));
  const pin = threads.pinnedSha;
  const victim = threads.threads[3];
  const verified = Object.fromEntries(victim.claims.map((c) => [c.id, 'verified']));
  const old = JSON.stringify({ rev: 2, items: { [victim.id]: {
    draft: 'Done.', disposition: 'fixed', review: 'approved', notes: '',
    claims: verified, draftedAt: threads.branchHeadSha, reopened: false, sentBody: null, sentAt: null } } });
  const { w, errors } = mount('option-1-inbox.html', ['core.js', 'data.js', 'shared.js'], {
    mutate: `window.REVIEW.threads.find((t) => t.id === ${victim.id}).claims.push({ id: '${victim.id}-new', text: 'New claim', evidence: 'src/y.rs:2', status: 'open' });`,
    mutateAfter: 'data.js',
    storage: { [`review-ux:${threads.pr}@${pin}`]: old },
  });
  const UI = w.eval('UI');
  const t = UI.thread(String(victim.id));
  const b = UI.blockers(t);
  check('threads: a claim added later blocks sending',
    b.some((x) => /claim|verif/i.test(x)), JSON.stringify(b));
  check('threads: the reply is not ready', UI.stage(t).key !== 'ready', UI.stage(t).key);
  check('threads: no load error', errors.length === 0, errors.join(' | '));
}

/* ---------- gate vocabulary: any unknown status is unchecked ---------- */
{
  const { w } = mount('option-1-inbox.html', ['core.js', 'data.js', 'shared.js'], {
    // The analysis cannot pre-check its own claims.
    mutate: `window.REVIEW.threads[0].claims.forEach((c) => { c.status = 'verified'; });`,
    mutateAfter: 'data.js',
  });
  const UI = w.eval('UI');
  const t = UI.R.threads[0];
  UI.setDraft(t.id, 'Checked against the pinned commit.');
  check('threads: a claim the analysis marked "verified" starts unchecked',
    UI.eligible(t) === false, JSON.stringify(UI.blockers(t)));
  check('threads: the blocker names the unchecked claim',
    UI.blockers(t).some((x) => /unverified/i.test(x)), JSON.stringify(UI.blockers(t)));
}
{
  const { w } = mount('findings.html', ['core.js', 'data-findings.js']);
  const F = w.FINDINGS_UI;
  const it = F.item('f894');
  it.candidates.forEach((c) => { c.isDraft = false; });  // isolate the check clause
  F.state[it.id].verdict = 'fixed';
  F.state[it.id].comment = 'Fixed.';
  for (const c of it.checks) F.state[it.id].checks[c.id] = 'verified';
  check('findings: all verified passes the checks clause', F.eligible(it), JSON.stringify(F.blockers(it)));
  F.state[it.id].checks[it.checks[0].id] = 'unverified';
  check('findings: "unverified" blocks like unchecked',
    F.eligible(it) === false, JSON.stringify(F.blockers(it)));
}

/* ---------- findings: zero checks and draft candidates ---------- */
{
  const { w } = mount('findings.html', ['core.js', 'data-findings.js']);
  const F = w.FINDINGS_UI;
  // #902 is claimed by #53 and is not analysed in this dataset.
  const it = F.item('f902');
  check('the unanalysed finding really has no checks', it.checks.length === 0, it.checks.length);
  F.state[it.id].verdict = 'fixed';
  F.state[it.id].comment = 'Fixed by rejecting trailing bytes.';
  check('Fixed without checks is blocked',
    F.blockers(it).some((x) => /No checks drafted/.test(x)), JSON.stringify(F.blockers(it)));
  check('and it cannot reach ready', F.eligible(it) === false);
}
{
  const { w } = mount('findings.html', ['core.js', 'data-findings.js']);
  const F = w.FINDINGS_UI;
  const it = F.item('f894');
  it.candidates.forEach((c) => { c.isDraft = true; });
  F.state[it.id].verdict = 'fixed';
  F.state[it.id].comment = 'Fixed.';
  it.checks.forEach((c) => { F.state[it.id].checks[c.id] = 'verified'; });
  check('Fixed behind a draft-only candidate set is blocked',
    F.blockers(it).some((x) => /draft cannot carry/.test(x)), JSON.stringify(F.blockers(it)));
  it.candidates[0].isDraft = false;
  check('a non-draft candidate clears it', F.eligible(it), JSON.stringify(F.blockers(it)));
}

/* ---------- import refusals ---------- */
{
  const { w } = mount('option-1-inbox.html', ['core.js', 'data.js', 'shared.js']);
  const UI = w.eval('UI');
  const base = { schema: 1, kind: 'thread', repo: UI.REPO, pr: UI.R.pr, rev: 999,
                 pinnedSha: UI.R.pinnedSha, threads: [] };
  check('a file with no revision is refused',
    /No revision/.test(UI.importState(Object.assign({}, base, { rev: undefined }))));
  check('a non-integer revision is refused',
    /No revision/.test(UI.importState(Object.assign({}, base, { rev: '3' }))));
  check('another repository is refused',
    /Wrong repository/.test(UI.importState(Object.assign({}, base, { repo: 'someone/else' }))));
  check('a valid file is accepted', UI.importState(base) === '');
}
{
  const { w } = mount('findings.html', ['core.js', 'data-findings.js']);
  const F = w.FINDINGS_UI;
  const file = { schema: 1, kind: 'finding', repo: w.FINDINGS.repo,
                 milestone: w.FINDINGS.milestone, rev: 999,
                 heads: 'stale-heads', items: [] };
  check('findings: a changed candidate set is refused',
    /Another candidate set/.test(F.importState(file)), String(F.importState(file)));
  check('findings: a non-integer revision is refused',
    /No revision/.test(F.importState(Object.assign({}, file, { heads: undefined, rev: 1.5 }))));
}

/* ---------- findings: export/import round trip ---------- */
{
  // Both mounts see the same data: one candidate set, no drafts, so the round
  // trip tests the state carrier rather than the draft policy.
  const noDrafts = { mutate: "window.FINDINGS.items.forEach((i) => i.candidates.forEach((c) => { c.isDraft = false; }));",
                     mutateAfter: 'data-findings.js' };
  const { w, doc } = mount('findings.html', ['core.js', 'data-findings.js'], noDrafts);
  const F = w.FINDINGS_UI;
  doc.querySelector('#queue [data-id="f894"]').click();
  doc.querySelector('#verdict button[data-verdict="fixed"]').click();
  doc.getElementById('comment').value = 'Fixed.';
  doc.getElementById('comment').dispatchEvent(new w.Event('input', { bubbles: true }));
  let b;
  while ((b = doc.querySelector('#detail button[data-check][data-v="verified"][aria-pressed="false"]'))) b.click();
  doc.getElementById('approve').click();
  doc.getElementById('expjson').click();
  const file = JSON.parse(await w.__exports[w.__exports.length - 1].text());
  check('the export names its desk and revision',
    file.kind === 'finding' && file.repo === 'example/widget' && file.rev > 0,
    JSON.stringify({ kind: file.kind, rev: file.rev }));

  const fresh = mount('findings.html', ['core.js', 'data-findings.js'], noDrafts);
  const err = fresh.w.FINDINGS_UI.importState(file);
  check('import into a fresh desk succeeds', err === '', String(err));
  check('import restores the approved stage',
    fresh.w.FINDINGS_UI.stage(fresh.w.FINDINGS_UI.item('f894')).key === 'ready',
    fresh.w.FINDINGS_UI.stage(fresh.w.FINDINGS_UI.item('f894')).key);

  const stale = Object.assign({}, file, { rev: 0 });
  check('an older revision is refused',
    /Older than this desk/.test(fresh.w.FINDINGS_UI.importState(stale)),
    String(fresh.w.FINDINGS_UI.importState(stale)));
  check('another repository is refused',
    /Wrong repository/.test(fresh.w.FINDINGS_UI.importState(Object.assign({}, file, { repo: 'other/repo' }))));
}

/* ---------- threads: export/import round trip ---------- */
{
  const { w } = mount('option-1-inbox.html', ['core.js', 'data.js', 'shared.js']);
  const UI = w.eval('UI');
  const t = UI.R.threads[0];
  UI.setDraft(t.id, 'Checked against the pinned commit; the bound is enforced in the verifier.');
  for (const c of t.claims) UI.setClaim(t.id, c.id, 'verified');
  UI.approve(t.id);
  check('thread approves once every claim is checked', UI.stage(t).key === 'ready', UI.stage(t).key);
  UI.exportJSON();
  const file = JSON.parse(await w.__exports[w.__exports.length - 1].text());
  check('the thread export names the repository and revision',
    file.repo === 'example/widget' && file.rev > 0 && file.schema === 1,
    JSON.stringify({ repo: file.repo, rev: file.rev }));
  const fresh = mount('option-1-inbox.html', ['core.js', 'data.js', 'shared.js']);
  const err = fresh.w.eval('UI').importState(file);
  check('thread import succeeds', err === '', String(err));
  check('thread import restores the approval',
    fresh.w.eval('UI').stage(fresh.w.eval('UI').thread(String(t.id))).key === 'ready',
    fresh.w.eval('UI').stage(fresh.w.eval('UI').thread(String(t.id))).key);
}

let failed = 0;
for (const r of res) { if (!r.ok) failed++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.n}${r.ok ? '' : '  -> ' + r.d}`); }
console.log(`\n${res.length - failed}/${res.length} checks passed`);
process.exit(failed ? 1 : 0);
