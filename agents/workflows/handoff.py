"""Coordinator-side handoff. This module does not grant host permissions."""
import hashlib
import json
from pathlib import Path
from dispatch import validate_completion, validate_dispatch


def file_hashes(root, files):
    resolved = Path(root).resolve()
    entries = {}
    for name in files:
        target = resolved / name
        if target.is_symlink() or not target.resolve().is_relative_to(resolved):
            raise ValueError('source path escapes assigned root')
        entries[name] = hashlib.sha256(target.read_bytes()).hexdigest()
    return entries


def snapshot(root, files):
    return hashlib.sha256(json.dumps(file_hashes(root, files), sort_keys=True).encode()).hexdigest()


def source_inventory(root, excluded_roots=()):
    resolved = Path(root).resolve()
    excluded = []
    for name in excluded_roots:
        path = (resolved / name).resolve()
        if path == resolved or not path.is_relative_to(resolved):
            raise ValueError('invalid build output exclusion')
        excluded.append(path)
    files = []
    for path in resolved.rglob('*'):
        if any(path == output or path.is_relative_to(output) for output in excluded):
            continue
        if path.is_symlink():
            raise ValueError('symlink source needs a separately validated snapshot')
        if path.is_file():
            files.append(str(path.relative_to(resolved)))
    return sorted(files)


def launch_checked(request, policy, active, root, files, launcher):
    outputs = list(policy.get('build_output_roots', []))
    if sorted(files) != source_inventory(root, outputs):
        raise ValueError('incomplete source manifest')
    if snapshot(root, files) != policy['source']:
        raise ValueError('source changed before native handoff')
    record = validate_dispatch(request, policy, active)
    record['input_hashes'] = file_hashes(root, files)
    record['source_paths'] = sorted(files)
    record['build_output_roots'] = outputs
    active[request['id']] = record
    try:
        return launcher(request)
    except Exception:
        active.pop(request['id'], None)
        raise


def consume_completion(completion, active, root, files):
    if completion['id'] not in active:
        raise ValueError('unknown or consumed completion')
    record = active[completion['id']]
    if sorted(files) != record['source_paths']:
        raise ValueError('completion changed the source coverage')
    current_paths = source_inventory(root, record['build_output_roots'])
    if current_paths != record['source_paths']:
        raise ValueError('file creation/deletion needs separate patch validation')
    current = snapshot(root, files)
    after = file_hashes(root, files)
    changed = [name for name, value in after.items() if value != record['input_hashes'][name]]
    evidence = {'changed_files': changed, 'protected_unchanged': all(name in record['allowed_files'] for name in changed), 'output_source': current}
    validate_completion(completion, active, current, edit_evidence=evidence)
    return active.pop(completion['id'])
