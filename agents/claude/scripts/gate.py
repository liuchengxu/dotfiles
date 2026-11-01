#!/usr/bin/env python3
"""Validate review-claim freshness. A stamp is not proof of review quality."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


def git(*arguments, data=None):
    return subprocess.run(['git', *arguments], input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout


def commit(ref):
    return git('rev-parse', '--verify', '--end-of-options', ref + '^{commit}').decode().strip()


def common_dir():
    return Path(git('rev-parse', '--path-format=absolute', '--git-common-dir').decode().strip()).resolve()


def diff_bytes(*revisions):
    return git('diff', '--binary', '--full-index', '--no-ext-diff', '--no-textconv', '--no-renames', '--no-color', '--no-relative', *revisions, '--')


def object_hash(content):
    return git('hash-object', '--stdin', data=content).decode().strip()


def audit_state(tip, base_ref):
    base = commit(base_ref)
    merge_bases = git('merge-base', '--all', base, tip).decode().split()
    if len(merge_bases) != 1:
        raise ValueError('The declared base needs one merge base')
    return {'schema': 1, 'kind': 'diff-audit', 'repository': str(common_dir()), 'tip': tip, 'base_ref': base_ref, 'base_commit': base, 'merge_base': merge_bases[0], 'diff': object_hash(diff_bytes(merge_bases[0], tip))}


def atomic_stamp(path, state):
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(dir=path.parent, prefix='.record-')
    try:
        with os.fdopen(handle, 'w') as stream:
            json.dump(state, stream, sort_keys=True)
            stream.write('\n')
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def unique_fields(pairs):
    state = {}
    for key, value in pairs:
        if key in state:
            raise ValueError('Duplicate stamp field')
        state[key] = value
    return state


def read_stamp(path):
    if path.is_symlink() or path.stat().st_size > 8192:
        raise ValueError('Invalid stamp file')
    with path.open() as stream:
        state = json.load(stream, object_pairs_hook=unique_fields)
    if not isinstance(state, dict) or type(state.get('schema')) is not int or state['schema'] != 1:
        raise ValueError('Invalid stamp schema')
    return state


def enforced(kind):
    if os.environ.get('CI'):
        return False
    if kind == 'audit':
        return os.environ.get('CLAUDECODE') == '1' or bool(os.environ.get('CODEX_THREAD_ID') or os.environ.get('CODEX_SANDBOX') or os.environ.get('DIFF_AUDIT_ENFORCE'))
    return os.environ.get('CLAUDECODE') == '1' or bool(os.environ.get('CODEX_THREAD_ID') or os.environ.get('COMMENT_CLEANUP_ENFORCE'))


def record_audit(base_ref):
    if git('status', '--porcelain', '--untracked-files=no').strip():
        raise ValueError('Tracked changes remain; recording requires a clean tree. Do not discard unrelated work')
    if not base_ref:
        try:
            base_ref = git('symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD').decode().strip()
        except subprocess.CalledProcessError:
            base_ref = 'origin/main'
    state = audit_state(commit('HEAD'), base_ref)
    atomic_stamp(common_dir() / 'diff-audit-stamps' / state['tip'], state)
    print('diff-audit-gate: recorded the declared commit/base/diff claim; review quality is not verified.')


def audit_hook():
    if os.environ.get('DIFF_AUDIT_DONE') == '1':
        print('diff-audit-gate: explicit bypass; no audit freshness was verified.')
        return 0
    failures = []
    for line in sys.stdin:
        if not line.strip():
            continue
        fields = line.split()
        if len(fields) != 4:
            failures.append('malformed pushed-ref input')
            continue
        local_ref, local_sha, _, _ = fields
        if re.fullmatch(r'0{40}|0{64}', local_sha) or local_ref.startswith('refs/tags/'):
            continue
        try:
            if not re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', local_sha):
                raise ValueError('Invalid object name')
            state = read_stamp(common_dir() / 'diff-audit-stamps' / local_sha)
            if not isinstance(state.get('base_ref'), str) or not state['base_ref']:
                raise ValueError('Missing declared base')
            if commit(local_sha) != local_sha or state != audit_state(local_sha, state['base_ref']):
                raise ValueError('Stale or mismatched stamp')
        except (OSError, ValueError, subprocess.CalledProcessError):
            failures.append(f'{local_ref}@{local_sha[:12]}')
    if not failures:
        return 0
    print('diff-audit-gate: missing, malformed, or stale attestation for: ' + ', '.join(failures))
    print('Run diff-audit, then record the final commit with --record --base <pr-base>.')
    return 1 if enforced('audit') else 0


def staged_comments():
    added = git('diff', '--cached', '--no-color', '--no-ext-diff', '--no-textconv', '-U0', '--', ':!*.md', ':!*.markdown', ':!*.rst', ':!*.txt').decode(errors='replace')
    return sum(1 for line in added.splitlines() if line.startswith('+') and not line.startswith('++') and re.search(r'^(#|//|/\*|\*)|\s//', line[1:].lstrip()))


def staged_state():
    try:
        head = commit('HEAD')
    except subprocess.CalledProcessError:
        head = None
    return {'schema': 1, 'kind': 'comment-cleanup', 'repository': str(common_dir()), 'head': head, 'staged_tree': git('write-tree').decode().strip(), 'diff': object_hash(diff_bytes('--cached')), 'comment_lines': staged_comments()}


def comments(record):
    if not record and os.environ.get('COMMENT_CLEANUP_DONE') == '1':
        print('comment-diff-gate: explicit bypass; no staged-content freshness was verified.')
        return 0
    state = staged_state()
    path = common_dir() / 'comment-cleanup-stamps' / state['staged_tree']
    if record:
        atomic_stamp(path, state)
        print('comment-diff-gate: recorded the exact staged-content claim; cleanup quality is not verified.')
        return 0
    if state['comment_lines'] == 0:
        return 0
    try:
        if read_stamp(path) == state:
            return 0
    except (OSError, ValueError):
        pass
    print(f"comment-diff-gate: {state['comment_lines']} staged comment lines have no fresh content stamp.")
    print('Run comment-cleanup, stage the final content, then run comment-diff-gate.sh --record.')
    print('COMMENT_CLEANUP_DONE=1 remains an explicit bypass, not content evidence.')
    return 1 if enforced('comments') else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('kind', choices=['audit', 'comments'])
    parser.add_argument('--record', action='store_true')
    parser.add_argument('--base')
    args = parser.parse_args()
    try:
        if args.kind == 'comments':
            if args.base:
                parser.error('--base is only valid for audit records')
            return comments(args.record)
        if args.record:
            record_audit(args.base)
            return 0
        if args.base:
            parser.error('--base requires --record')
        return audit_hook()
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f'{args.kind}-gate: could not verify freshness: {error}', file=sys.stderr)
        return 1 if args.record or enforced(args.kind) else 0


if __name__ == '__main__':
    sys.exit(main())
