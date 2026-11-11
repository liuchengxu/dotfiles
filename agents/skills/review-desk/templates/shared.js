'use strict';
/* Shared behaviour for the four review-reply mocks. Offline only: no fetch, no
   posting, no remote assets. */

const SRC = window.REVIEW;

const UI = (() => {
  const { esc, md, copy, download, fmtDate, shortPath, digest } = CORE;
  const R = SRC;
  const KEY = `review-ux:${R.pr}@${R.pinnedSha}`;
  const REPO = (R.sourceUrl.match(/github\.com\/([^/]+\/[^/]+)/) || [, ''])[1];
  const DISPOSITIONS = ['fixed', 'wont-fix', 'explain', 'needs-discussion', 'no-reply'];
  const REVIEW_STATES = {
    todo: { label: 'Not reviewed', cls: 'ghost' },
    approved: { label: 'Ready to send', cls: 'approved' },
    closed: { label: 'Closed', cls: 'answered' },
    posted: { label: 'Sent', cls: 'posted' },
  };

  /* State travels as {rev, items}. rev rises on every save so an imported file
     cannot quietly overwrite a desk that has moved on since it was written. */
  let saved = {}, rev = 0;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && raw.items) { saved = raw.items; rev = Number(raw.rev) || 0; }
    else if (raw) { saved = raw; }
  } catch (e) { saved = {}; }

  function blank(t) {
    return {
      draft: t.draft, disposition: t.disposition,
      review: t.answerState === 'answered' ? 'todo' : 'todo',
      notes: '', claims: Object.fromEntries(t.claims.map((c) => [c.id, 'open'])),
      draftedAt: t.draftedAt, reopened: false, sentBody: null, sentAt: null,
      approval: null,
    };
  }

  const state = {};
  for (const t of R.threads) {
    const def = blank(t), sv = saved[t.id] || {};
    state[t.id] = Object.assign({}, def, sv);
    /* Merge claims by id: a claim added to the data after the last save must
       start unverified, or it escapes the gate as `undefined`. def.claims is
       read before the merge copies sv over it. */
    state[t.id].claims = Object.assign({}, def.claims, sv.claims || {});
    if (typeof state[t.id].draft !== 'string') state[t.id].draft = t.draft;
  }

  let storageOk = true;
  function save() {
    // Stored state must not claim an approval its own evidence no longer supports.
    for (const t of R.threads) {
      if (state[t.id].review === 'approved' && !eligible(t)) state[t.id].review = 'todo';
    }
    rev += 1;
    try { localStorage.setItem(KEY, JSON.stringify({ rev, items: state })); }
    catch (e) {
      storageOk = false;
      const el = document.getElementById('storage-note');
      if (el) el.textContent = 'Local saving failed. Export before closing.';
    }
  }

  const thread = (id) => R.threads.find((t) => t.id === Number(id)) || R.threads[0];
  const isStale = (t) => state[t.id].draftedAt !== R.branchHeadSha;
  const openThreads = () => R.threads.filter((t) => t.answerState === 'open');

  /* One vocabulary: where this comment is in your handling. The GitHub fact
     ("a reply already exists") is not a stage; it closes the thread unless you
     reopen it by writing a follow-up. The decision (fixed, won't fix, explain)
     is a separate chip, because you can decide before or after drafting. */
  const STAGES = [
    { key: 'new', label: 'New', cls: 'ghost' },
    { key: 'drafted', label: 'Reply drafted', cls: 'open' },
    { key: 'ready', label: 'Ready to send', cls: 'approved' },
    { key: 'sent', label: 'Sent', cls: 'posted' },
    { key: 'closed', label: 'Closed', cls: 'answered' },
  ];
  const STAGE_ORDER = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));

  function stage(t) {
    const s = state[t.id];
    if (s.review === 'posted') return STAGES[3];
    if (s.review === 'approved') return ready(t) ? STAGES[2] : STAGES[1];
    if (s.review === 'closed') return STAGES[4];
    if (t.answerState === 'answered' && !s.reopened) return STAGES[4];
    if (s.draft.trim()) return STAGES[1];
    return STAGES[0];
  }

  function counts() {
    const map = { todo: 0, approved: 0, discuss: 0, posted: 0 };
    for (const t of R.threads) map[state[t.id].review] += 1;
    return map;
  }

  /* A reply that repeats another thread's reply verbatim is usually a mistake. */
  function duplicates(t) {
    const text = state[t.id].draft.trim();
    if (!text) return [];
    return R.threads.filter((o) => o.id !== t.id && state[o.id].draft.trim() === text);
  }

  /* Only "verified" passes. Every other status, including one a drafting
     prompt invents, is unchecked: the gate fails closed on unknown words. */
  const claimStatus = (t, c) => state[t.id].claims[c.id];
  const unchecked = (t) => t.claims.filter((c) => claimStatus(t, c) !== 'verified');
  const claimOpen = (t) => unchecked(t).filter((c) => claimStatus(t, c) !== 'wrong').length;
  const claimWrong = (t) => unchecked(t).filter((c) => claimStatus(t, c) === 'wrong').length;

  /* The one definition of "this reply may be sent". Approve, the stage chip and
     the approved-replies export all read it, so they cannot disagree. */
  function eligible(t) {
    return state[t.id].draft.trim().length > 0
      && claimOpen(t) === 0 && claimWrong(t) === 0
      && !isStale(t) && duplicates(t).length === 0;
  }

  /* What the human approved, at the moment of approving. Any later change to
     the body, the evidence or the pin makes the recorded approval stale, and a
     stale approval is not a ready item even if the flag still says approved. */
  const evidenceOf = (t) => digest(
    t.claims.map((c) => `${c.id}:${state[t.id].claims[c.id]}`).join('|'));
  const approvalOf = (t) => ({ body: digest(state[t.id].draft.trim()),
                               evidence: evidenceOf(t), pin: R.branchHeadSha });
  const sameApproval = (t) => {
    const a = state[t.id].approval;
    if (!a) return false;
    const now = approvalOf(t);
    return a.body === now.body && a.evidence === now.evidence && a.pin === now.pin;
  };
  const ready = (t) => state[t.id].review === 'approved' && eligible(t) && sameApproval(t);

  function blockers(t) {
    const out = [];
    // Without a draft there is nothing to check: the thread is simply New.
    if (!state[t.id].draft.trim()) return ['No draft text'];
    if (claimOpen(t)) out.push(`${claimOpen(t)} unverified claim${claimOpen(t) > 1 ? 's' : ''}`);
    if (claimWrong(t)) out.push(`${claimWrong(t)} claim${claimWrong(t) > 1 ? 's' : ''} contradicted by the code`);
    if (isStale(t)) out.push(`Drafted at ${String(state[t.id].draftedAt).slice(0, 8)}; branch is now ${R.branchHeadSha.slice(0, 8)}`);
    const d = duplicates(t);
    if (d.length) out.push(`Same text as ${d.map((x) => '#' + x.id).join(', ')}`);
    return out;
  }

  function setClaim(id, claimId, v) {
    state[id].claims[claimId] = v;
    state[id].approval = null;
    if (state[id].review === 'approved') state[id].review = 'todo';
    save();
  }

  /* Claims are agent-declared assertions; the human marks each one. */
  function claimsBlock(t) {
    const s = state[t.id];
    return `<div class="claims">${t.claims.map((c) => `
      <div class="cl ${s.claims[c.id] === 'wrong' ? 'wrong' : s.claims[c.id] === 'verified' ? 'ok' : ''}">
        <p>“${esc(c.text)}”</p>
        <div class="tiny muted mono">${esc(c.evidence)}</div>
        <div class="seg" role="group" aria-label="Check claim: ${esc(c.text)}">
          ${[['verified', 'Checked'], ['open', 'Unverified'], ['wrong', 'Contradicted']].map(([v, label]) =>
            `<button data-claim="${c.id}" data-v="${v}" aria-pressed="${s.claims[c.id] === v}">${label}</button>`).join('')}
        </div>
      </div>`).join('')}</div>`;
  }

  function exportJSON() {
    download(`pr${R.pr}-review-state.json`, 'application/json', JSON.stringify({
      schema: 1, kind: 'thread', repo: REPO, pr: R.pr, rev,
      pinnedSha: R.pinnedSha, branchHeadSha: R.branchHeadSha,
      exportedAt: new Date().toISOString(), threads: collect(),
    }, null, 2));
  }

  /* Import is the only way state crosses runs. It refuses a file from another
     desk, another pin, or an older revision, and it never deletes a thread the
     file omits. */
  function importState(file) {
    if (!file || file.kind !== 'thread' || file.pr !== R.pr) return 'Wrong desk: this file is for another PR.';
    if (file.repo && file.repo !== REPO) return `Wrong repository: ${file.repo}.`;
    if (file.pinnedSha !== R.pinnedSha) return `Pinned to ${String(file.pinnedSha).slice(0, 8)}; this desk is pinned to ${R.pinnedSha.slice(0, 8)}.`;
    if (!Number.isInteger(file.rev)) return 'No revision in the file; export from a desk, not by hand.';
    if (file.rev < rev) return `Older than this desk (rev ${file.rev} < ${rev}); export first.`;
    for (const row of file.threads || []) {
      const t = R.threads.find((x) => x.id === row.id);
      if (!t) continue;
      const s = state[t.id];
      if (typeof row.draft === 'string') s.draft = row.draft;
      if (row.disposition !== undefined) s.disposition = row.disposition;
      if (row.review) s.review = row.review;
      s.approval = row.approval || null;
      if (typeof row.notes === 'string') s.notes = row.notes;
      if (row.draftedAt) s.draftedAt = row.draftedAt;
      for (const c of row.claims || []) {
        const claim = t.claims.find((x) => x.text === c.text);
        if (claim && c.status) s.claims[claim.id] = c.status;
      }
    }
    rev = Number(file.rev) || rev;
    save();
    return '';
  }

  function collect() {
    return R.threads.map((t) => ({
      id: t.id, path: t.path, line: t.line, reviewer: t.reviewer,
      original: t.body, disposition: state[t.id].disposition,
      draft: state[t.id].draft, review: state[t.id].review,
      approval: state[t.id].approval,
      draftedAt: state[t.id].draftedAt,
      claims: t.claims.map((c) => ({ text: c.text, evidence: c.evidence, status: state[t.id].claims[c.id] })),
      notes: state[t.id].notes,
    }));
  }

  /* Posting payload only. Private notes stay in exportJSON. */
  function exportMD() {
    const md = [`# PR #${R.pr} review replies`, '',
      `Pinned ${R.pinnedSha} · branch head ${R.branchHeadSha} · exported ${new Date().toISOString().slice(0, 10)}`,
      'Nothing in this file has been posted.', '',
      'Approved replies only:', ''];
    const approved = R.threads.filter((t) => stage(t).key === 'ready');
    if (!approved.length) md.push('_None approved yet._', '');
    for (const t of approved) {
      md.push(`## #${t.id} · ${t.path}${t.line ? ':' + t.line : ''}`, '', state[t.id].draft, '');
    }
    download(`pr${R.pr}-approved-replies.md`, 'text/markdown', md.join('\n'));
  }

  /* One write path for draft text: editing always revokes approval. */
  /* A sent reply is a record: editing it would rewrite history, so it is
     read-only until the human opens a follow-up. */
  function setDraft(id, text) {
    const s = state[id];
    if (s.review === 'posted') return false;
    s.approval = null;
    s.draft = text;
    s.draftedAt = R.branchHeadSha;
    s.reopened = true;
    if (s.review === 'approved' || s.review === 'closed') s.review = 'todo';
    save();
    return true;
  }

  /* Approval is a transition, not a flag: only an unreviewed reply that passes
     every check may enter Ready. */
  function approve(id) {
    const t = thread(id);
    const key = stage(t).key;
    if (key !== 'new' && key !== 'drafted') return false;
    if (!eligible(t)) return false;
    state[id].review = 'approved';
    state[id].approval = approvalOf(t);
    save();
    return true;
  }

  function markSent(id) {
    const t = thread(id);
    if (stage(t).key !== 'ready') return false;
    const s = state[id];
    s.review = 'posted';
    s.sentBody = s.draft;
    s.sentAt = new Date().toISOString();
    save();
    return true;
  }

  function followUp(id) {
    const s = state[id];
    if (s.review !== 'posted') return false;
    s.review = 'todo';
    s.reopened = true;
    save();
    return true;
  }

  function resetAll() {
    for (const t of R.threads) state[t.id] = blank(t);
    save();
  }

  /* Avatars come from the PR author's GitHub profile. A thread without one
     (for example pasted doc comments) falls back to initials. */
  function avatarHTML(login, src) {
    const words = String(login || '?').split(/[^A-Za-z0-9]+/).filter(Boolean);
    const initials = (words.length >= 2 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2))
      .toUpperCase();
    return src
      ? `<img class="ava" src="${src}" alt="" width="20" height="20" loading="lazy">`
      : `<span class="ava ini" aria-hidden="true">${esc(initials)}</span>`;
  }

  function authorRow(login, src, date) {
    return `<div class="row between">
      <span class="row" style="gap:7px">${avatarHTML(login, src)}<strong>${esc(login)}</strong></span>
      <span class="tiny muted">${date ? fmtDate(date) : ''}</span></div>`;
  }

  /* GitHub-accurate thread, used by every option. */
  function threadHTML(t, opts = {}) {
    const s = state[t.id];
    const stale = isStale(t);
    const replies = t.replies.map((r) => `
      <article class="cmt">
        ${authorRow(r.user, r.avatar, r.createdAt)}
        <div class="prose">${md(r.body)}</div>
      </article>`).join('');
    return `
      <div class="th-head">
        <div class="row wrap" style="gap:6px">
          <span class="chip ${stage(t).cls}"><span class="dot"></span>${stage(t).label}</span>
          <span class="chip">${esc(t.kind)}</span>
          ${stale ? '<span class="chip stale">Branch moved</span>' : ''}
          <span class="tiny muted mono">#${t.id}</span>
        </div>
        <h2>${esc(t.ask)}</h2>
        <div class="tiny muted"><code>${esc(t.path)}${t.line ? ':' + t.line : ''}</code>
          · reviewed at <span class="mono">${t.commit.slice(0, 8)}</span>
          · <a href="${t.url}" target="_blank" rel="noopener noreferrer">thread on GitHub ↗</a></div>
      </div>
      <article class="cmt">
        ${authorRow(t.reviewer, t.reviewerAvatar, t.createdAt)}
        <div class="prose">${md(t.body)}</div>
      </article>
      ${replies}
      ${opts.draftHere === false ? '' : `
      <article class="cmt ghost">
        <div class="row between">
          <strong>Your reply</strong>
          <span class="chip ${REVIEW_STATES[s.review].cls}">${REVIEW_STATES[s.review].label}</span>
        </div>
        <div class="prose">${md(s.draft)}</div>
      </article>`}`;
  }

  return {
    R, esc, md, state, save, thread, isStale, openThreads, counts, duplicates,
    claimOpen, ready, blockers, shortPath, fmtDate, copy, download,
    exportJSON, exportMD, importState, resetAll, collect, threadHTML, setDraft, setClaim, claimsBlock,
    avatarHTML, authorRow, stage, STAGES, STAGE_ORDER, eligible, ready, claimWrong,
    approve, markSent, followUp,
    DISPOSITIONS, REVIEW_STATES, REPO,
    get storageOk() { return storageOk; },
    get rev() { return rev; },
  };
})();
