"""Classify parent-established task facts. This is not natural-language inference."""
import argparse
import json


def route(task, authority):
    intent = task['intent']
    if intent == 'plan':
        return {'route': 'plan-only', 'dispatch': []}
    if intent == 'review':
        return {'route': 'existing-review-skill', 'dispatch': []}
    if intent != 'implement':
        raise ValueError('unsupported intent')
    if not authority.get('implementation_authorized'):
        return {'route': 'authorization-missing', 'dispatch': []}
    if not task.get('substantial'):
        return {'route': 'parent-direct', 'dispatch': []}
    if task.get('plan_required'):
        approved = authority.get('approved_plan')
        if not isinstance(approved, str) or not approved.strip() or task.get('plan_id') != approved:
            return {'route': 'current-plan-required', 'dispatch': []}
    return {'route': 'task-workflow', 'dispatch': ['implement', 'parent-verify-output-and-checks', 'independent-review'], 'build_owner': 'parent', 'verdict_owner': 'parent'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--task', required=True)
    parser.add_argument('--authority', required=True)
    args = parser.parse_args()
    with open(args.task) as stream:
        task = json.load(stream)
    with open(args.authority) as stream:
        authority = json.load(stream)
    print(json.dumps(route(task, authority), indent=2))
