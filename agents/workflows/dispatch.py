"""Candidate dispatch checks. The coordinator supplies policy; workers cannot grant it."""

ALLOWED = {
    'task-architect': {'read'},
    'task-implementer': {'read', 'edit'},
    'task-reviewer': {'read'},
    'task-executor': {'read', 'check'},
}


def validate_dispatch(request, policy, active):
    if not isinstance(request, dict) or not isinstance(policy, dict) or not isinstance(active, dict):
        raise ValueError('dispatch inputs must be objects')
    required = ('id', 'role', 'source', 'actions', 'profile', 'context_complete', 'skill_hashes')
    if any(field not in request for field in required) or any(field not in policy for field in ('source', 'authorized_actions', 'profiles')):
        raise ValueError('missing dispatch field')
    if any(not isinstance(request[field], str) or not request[field].strip() for field in ('id', 'role', 'source', 'profile')):
        raise ValueError('invalid dispatch identity')
    if not isinstance(request['actions'], list) or not all(isinstance(action, str) for action in request['actions']):
        raise ValueError('invalid action list')
    if not isinstance(policy['authorized_actions'], list) or not isinstance(policy['profiles'], dict):
        raise ValueError('invalid parent policy')
    if request['role'] not in ALLOWED:
        raise ValueError('unknown role')
    if request['id'] in active:
        raise ValueError('duplicate dispatch')
    if request['source'] != policy['source']:
        raise ValueError('stale source')
    if request.get('context_complete') is not True or not isinstance(request.get('skill_hashes'), list):
        raise ValueError('missing authority or skill context')
    if set(request['actions']) - ALLOWED[request['role']]:
        raise ValueError('role cannot perform requested action')
    if set(request['actions']) - set(policy['authorized_actions']):
        raise ValueError('action lacks parent authorization')
    if request['profile'] != policy['profiles'].get(request['role']):
        raise ValueError('model or provider differs from approved profile')
    if request['role'] == 'task-implementer' and policy.get('plan_required'):
        approved = policy.get('approved_plan')
        if not isinstance(approved, str) or not approved.strip() or request.get('plan') != approved:
            raise ValueError('required plan is not current')
    if request['role'] == 'task-executor':
        if request['id'] != policy.get('build_owner'):
            raise ValueError('not the build owner')
        if request.get('command') not in policy.get('allowed_commands', []):
            raise ValueError('check is not authorized')
    return {'id': request['id'], 'source': request['source'], 'input_source': request['source'], 'role': request['role'], 'allowed_files': list(policy.get('allowed_files', []))}


def validate_completion(completion, active, current_source, edit_evidence=None):
    if not isinstance(completion, dict) or not isinstance(active, dict) or not isinstance(current_source, str):
        raise ValueError('invalid completion inputs')
    if not isinstance(completion.get('id'), str) or not completion['id'].strip():
        raise ValueError('missing completion identity')
    if completion['id'] not in active:
        raise ValueError('unknown or consumed completion')
    record = active[completion['id']]
    if not isinstance(record, dict) or record.get('role') not in ALLOWED:
        raise ValueError('invalid active dispatch')
    expected_input = record.get('input_source', record.get('source'))
    if not isinstance(expected_input, str) or not expected_input:
        raise ValueError('missing dispatch input identity')
    if completion.get('input_source', completion.get('source')) != expected_input:
        raise ValueError('completion changed the dispatch input identity')
    if completion.get('output_source', completion.get('source')) != current_source:
        raise ValueError('completion does not match current source')
    if completion.get('final_verdict') is not None:
        raise ValueError('only the coordinator owns the final verdict')
    if current_source != expected_input:
        if record['role'] != 'task-implementer' or not isinstance(edit_evidence, dict):
            raise ValueError('source changed during a read/check task')
        if not edit_evidence.get('protected_unchanged'):
            raise ValueError('protected source changed')
        if not isinstance(edit_evidence.get('changed_files'), list):
            raise ValueError('missing changed-file evidence')
        if set(edit_evidence['changed_files']) - set(record.get('allowed_files', [])):
            raise ValueError('edit exceeds authorized files')
        if edit_evidence.get('output_source') != current_source:
            raise ValueError('edit evidence is stale')
    return True


def check_identity(source, argv, features, environment):
    return source, tuple(argv), tuple(sorted(features)), tuple(sorted(environment.items()))
