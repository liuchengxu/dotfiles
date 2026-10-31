"""Small deterministic alternative to a model with generic shell access."""
import hashlib
import json
from pathlib import Path
from handoff import launch_checked


def execute_hash_check(request, policy, active, root):
    def execute(checked):
        if checked['command'] != ['fixture-sha256', 'fixture.txt']:
            raise ValueError('unknown deterministic check')
        value = hashlib.sha256((Path(root) / 'fixture.txt').read_bytes()).hexdigest()
        source = hashlib.sha256(json.dumps({'fixture.txt': value}, sort_keys=True).encode()).hexdigest()
        if source != policy['source']:
            raise ValueError('source changed during deterministic check')
        return {'id': checked['id'], 'source': source, 'check': 'fixture-sha256', 'sha256': value, 'status': 'passed'}
    return launch_checked(request, policy, active, root, ['fixture.txt'], execute)
