import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// Run from a copy beside node_modules/jsdom; REVIEW_DIR names the templates.
const DIR = process.env.REVIEW_DIR || new URL('.', import.meta.url).pathname;

function load(file) {
  let html = readFileSync(DIR + file, 'utf8');
  for (const src of ['core.js', 'data.js', 'shared.js']) {
    const body = readFileSync(DIR + src, 'utf8');
    html = html.replace(`<script src="${src}"></script>`, `<script>${body}</script>`);
  }
  const errors = [];
  const dom = new JSDOM(html, {
    url: 'https://local.test/' + file,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) {
      w.addEventListener('error', (e) => errors.push(String(e.error || e.message)));
      w.confirm = () => false;
      w.alert = (m) => errors.push('alert: ' + m);
      w.open = () => null;
      w.__exports = [];
      w.URL.createObjectURL = (blob) => { w.__exports.push(blob); return 'blob:stub'; };
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () {};
      w.Element.prototype.scrollIntoView = function () {};
    },
  });
  return { dom, doc: dom.window.document, errors, w: dom.window };
}

const st = (w, id) => w.eval(`JSON.parse(JSON.stringify(UI.state[${id}]))`);

const results = [];
function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail });
}

const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

/* ---- Option 1: queue, claims, approval ---- */
{
  const { doc, errors, w } = load('option-1-inbox.html');
  const items = doc.querySelectorAll('#queue .q');
  check('opt1 renders the queue', items.length === 11, `got ${items.length}`);
  check('opt1 stages are labelled',
    ['New', 'Reply drafted', 'Closed'].every((l) => doc.getElementById('queue').textContent.includes(l)),
    doc.getElementById('queue').textContent.slice(0, 200));
  check('opt1 orders open work first',
    items[0].querySelector('.chip').textContent.trim() === 'New',
    items[0].querySelector('.chip').textContent);
  check('opt1 tabs count each stage',
    [...doc.querySelectorAll('#tabs .tab')].length === 6,
    [...doc.querySelectorAll('#tabs .tab')].map((b) => b.textContent.trim()).join(' | '));
  check('opt1 no script errors', errors.length === 0, errors.join(' | '));
  const detail = doc.getElementById('detail-scroll');
  const conversation = doc.getElementById('thread');
  const reply = doc.querySelector('.draft-pane');
  check('reply shares the conversation scroll area',
    detail && conversation.parentElement === detail && reply.parentElement === detail);
  check('reply follows the original conversation',
    !!(conversation.compareDocumentPosition(reply) & w.Node.DOCUMENT_POSITION_FOLLOWING));
  check('desktop layout has only queue and detail columns',
    /^(320|280)px minmax\(0(?:px)?,\s*1fr\)$/.test(
      w.getComputedStyle(doc.querySelector('.inbox')).gridTemplateColumns));
  check('reply content does not create a nested scroller',
    !['auto', 'scroll'].includes(w.getComputedStyle(doc.querySelector('.draft-scroll')).overflow));

  const target = [...items].find((b) => b.dataset.id === '111');
  if (detail) detail.scrollTop = 500;
  target.click();
  check('selecting a thread resets the shared scroll area', detail && detail.scrollTop === 0);
  check('opt1 opens the selected thread', text(doc.getElementById('thread')).includes('111'));

  const approve = doc.getElementById('approve');
  approve.click();
  const chip0 = text(doc.getElementById('statechip'));
  check('opt1 blocks a first approval (stale draft)', chip0 === 'Reply drafted', chip0);

  // Edit the draft: this pins it to the current head and must not auto-approve.
  const box = doc.getElementById('draftbox');
  box.value = 'Thanks — both links now say #L94-L112.';
  box.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
  check('opt1 editing clears the stale warning',
    !text(doc.getElementById('blockers')).includes('branch is now'));

  // The remaining blocker is the unverified claim.
  const wrongish = doc.querySelector('#claims button[data-v="verified"]');
  check('opt1 shows the claim control', !!wrongish);
  wrongish.click();
  check('opt1 blockers clear after checking the claim',
    text(doc.getElementById('blockers')).includes('Ready'), text(doc.getElementById('blockers')));

  doc.getElementById('approve').click();
  check('opt1 approves a clean thread', st(w, 111).review === 'approved',
    st(w, 111).review);
  check('opt1 advances after approval', text(doc.getElementById('progress')).startsWith('1 ready'), text(doc.getElementById('progress')));

  // Re-open the approved thread and edit it: approval must be revoked.
  doc.querySelector('#tabs .tab[data-f="ready"]').click();
  [...doc.querySelectorAll('#queue .q')].find((b) => b.dataset.id === '111').click();
  const box2 = doc.getElementById('draftbox');
  box2.value = 'Rewritten after approval.';
  box2.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
  check('opt1 revokes approval on edit', st(w, 111).review !== 'approved', st(w, 111).review);
  check('opt1 clears the stage after approval is revoked',
    /Reply drafted/.test(text(doc.getElementById('statechip'))), text(doc.getElementById('statechip')));
  check('opt1 no late errors', errors.length === 0, errors.join(' | '));
}

/* ---- Option 1: guards a soundness review demanded ---- */
{
  const { doc, errors, w } = load('option-1-inbox.html');
  const S = (id) => w.eval(`JSON.parse(JSON.stringify(UI.state[${id}]))`);
  const stageOf = (id) => w.eval(`UI.stage(UI.thread(${id})).key`);
  const open = (id) => {
    doc.querySelector('#tabs .tab[data-f="all"]').click();
    [...doc.querySelectorAll('#queue .q')].find((b) => b.dataset.id === id).click();
  };
  const edit = (text) => {
    const box = doc.getElementById('draftbox');
    box.value = text;
    box.dispatchEvent(new w.Event('input', { bubbles: true }));
  };

  // 1. A contradicted claim must block approval.
  open('108');
  doc.querySelector('#claims button[data-v="verified"]').click();
  doc.querySelector('#claims button[data-v="wrong"]').click();
  doc.getElementById('approve').click();
  check('guard: a contradicted claim blocks approval', stageOf(108) !== 'ready', stageOf(108));

  // 2. Mark sent only from Ready.
  open('109');
  const sentBtn = doc.getElementById('posted');
  check('guard: Mark sent is disabled while drafting', sentBtn.disabled === true);
  sentBtn.click();
  check('guard: Mark sent does not fire from Drafted', stageOf(109) === 'drafted', stageOf(109));

  // 3. Approval is refused once eligibility fails, and stored state is corrected.
  const saved = w.eval("(() => { try { return JSON.parse(localStorage.getItem(Object.keys(localStorage)[0])); } catch (e) { return {}; } })()");
  open('111');
  const box = doc.getElementById('draftbox');
  box.value = 'Thanks — both links now say #L94-L112.';
  box.dispatchEvent(new w.Event('input', { bubbles: true }));
  doc.querySelector('#claims button[data-v="verified"]').click();
  doc.getElementById('approve').click();
  check('guard: a clean thread still approves', stageOf(111) === 'ready', stageOf(111));

  // 4. Duplicating an approved body demotes it at the next save.
  open('109');
  edit('Thanks — both links now say #L94-L112.');
  check('guard: duplicating an approved body demotes it', stageOf(111) === 'drafted', stageOf(111));

  // 5. Sent reply is a record: read-only, receipt kept, editing refused.
  open('111');
  edit('Thanks — both links now say #L94-L112 (final).');
  doc.getElementById('approve').click();
  check('guard: ready before sending', stageOf(111) === 'ready', stageOf(111));
  // Approving advances the queue; come back to the thread before sending.
  doc.querySelector('#tabs .tab[data-f="ready"]').click();
  [...doc.querySelectorAll('#queue .q')].find((b) => b.dataset.id === '111').click();
  doc.getElementById('posted').click();
  check('guard: Mark sent moves Ready to Sent', stageOf(111) === 'sent', stageOf(111));
  check('guard: Sent keeps the body it sent', S(111).sentBody === S(111).draft,
    JSON.stringify(S(111).sentBody));
  check('guard: Sent records a time', typeof S(111).sentAt === 'string');
  check('guard: Sent is read-only', doc.getElementById('draftbox').readOnly === true);
  check('guard: editing a sent body is refused',
    w.eval(`UI.setDraft(111, 'rewrite')`) === false && stageOf(111) === 'sent');
  check('guard: the receipt is shown', doc.getElementById('receipt').hidden === false,
    doc.getElementById('receipt').textContent);
  check('guard: a follow-up reopens the thread as a draft',
    w.eval('UI.followUp(111)') === true && stageOf(111) === 'drafted');

  // 6. Editing a closed thread reopens it (the documented behaviour).
  doc.querySelector('#tabs .tab[data-f="closed"]').click();
  [...doc.querySelectorAll('#queue .q')].find((b) => b.dataset.id === '101').click();
  edit('Follow-up on an already answered thread.');
  check('guard: editing a closed thread reopens it', stageOf(101) === 'drafted', stageOf(101));

  check('guard: no errors', errors.length === 0, errors.join(' | '));
}

/* ---- Option 1: export reads the same eligibility predicate ---- */
{
  const { doc, w, errors } = load('option-1-inbox.html');
  const readExport = async () => {
    w.__exports.length = 0;
    doc.getElementById('expmd').click();
    return w.__exports.length ? await w.__exports[w.__exports.length - 1].text() : '';
  };

  const empty = await readExport();
  check('export: nothing approved, nothing exported', empty.includes('_None approved yet._'), empty.slice(0, 120));

  doc.querySelector('#tabs .tab[data-f="all"]').click();
  [...doc.querySelectorAll('#queue .q')].find((b) => b.dataset.id === '111').click();
  const box = doc.getElementById('draftbox');
  box.value = 'Thanks — both links now say #L94-L112.';
  box.dispatchEvent(new w.Event('input', { bubbles: true }));
  doc.querySelector('#claims button[data-v="verified"]').click();
  doc.getElementById('approve').click();

  const readyExport = await readExport();
  check('export: an approved reply is exported', readyExport.includes('#L94-L112'), readyExport.slice(0, 160));
  check('export: private notes never appear', !readyExport.includes('notes'),
    readyExport.slice(0, 160));

  // Duplicate the body on another thread: the first approval must not be exported.
  doc.querySelector('#tabs .tab[data-f="all"]').click();
  [...doc.querySelectorAll('#queue .q')].find((b) => b.dataset.id === '109').click();
  const box2 = doc.getElementById('draftbox');
  box2.value = 'Thanks — both links now say #L94-L112.';
  box2.dispatchEvent(new w.Event('input', { bubbles: true }));
  const afterDup = await readExport();
  check('export: a demoted approval disappears from the export',
    !afterDup.includes('#L94-L112') || afterDup.includes('_None approved yet._'),
    afterDup.slice(0, 160));
  check('export: no errors', errors.length === 0, errors.join(' | '));
}

/* ---- Option 1: lifecycle edge cases ---- */
{
  const { doc, errors, w } = load('option-1-inbox.html');
  const stageOf = (id) => w.eval(`UI.stage(UI.thread(${id})).key`);
  check('lifecycle: an already-answered thread is Closed', stageOf(101) === 'closed', stageOf(101));
  check('lifecycle: a thread with no draft is New', stageOf(110) === 'new', stageOf(110));
  check('lifecycle: an open thread with a draft is Drafted', stageOf(111) === 'drafted', stageOf(111));

  doc.querySelector('#tabs .tab[data-f="closed"]').click();
  [...doc.querySelectorAll('#queue .q')].find((b) => b.dataset.id === '101').click();
  check('lifecycle: a closed thread offers Reopen', text(doc.getElementById('discuss')) === 'Reopen',
    text(doc.getElementById('discuss')));
  doc.getElementById('discuss').click();
  check('lifecycle: Reopen moves it back to Drafted', stageOf(101) === 'drafted', stageOf(101));

  doc.getElementById('discuss').click();
  check('lifecycle: Close moves it to Closed', stageOf(101) === 'closed', stageOf(101));
  check('lifecycle: no errors', errors.length === 0, errors.join(' | '));
}

/* ---- Avatars ---- */
{
  for (const file of ['option-1-inbox.html']) {
    const { doc, errors } = load(file);
    const imgs = [...doc.querySelectorAll('img.ava')];
    const remote = imgs.filter((i) => !i.getAttribute('src').startsWith('data:image/png;base64,'));
    check(`${file}: reviewer avatars render`, imgs.length >= 1, `${imgs.length} images`);
    check(`${file}: avatars are embedded, not fetched`, remote.length === 0, `${remote.length} remote`);
    check(`${file}: avatars have no errors`, errors.length === 0, errors.join(' | '));
  }
  const { doc, w } = load('option-1-inbox.html');
  const initial = w.eval("UI.avatarHTML('Some Reviewer', null)");
  const withImg = w.eval("UI.avatarHTML('alice', 'data:image/png;base64,AA')");
  check('avatar falls back to initials', initial.includes('class="ava ini"') && initial.includes('SR'), initial);
  check('avatar renders an image when known', withImg.startsWith('<img class="ava"'), withImg.slice(0, 40));
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok || !r.detail ? '' : `  → ${r.detail}`}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
