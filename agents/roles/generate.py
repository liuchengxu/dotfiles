"""Render native adapters from canonical shared contracts and profile data."""
from pathlib import Path
import argparse
import hashlib
import json

ROOT=Path(__file__).parent


def render(output_root):
    output_root = Path(output_root)
    common=(ROOT/'shared/authority.txt').read_text().strip()
    profiles=json.loads((ROOT/'profiles.json').read_text())
    rendered=[]
    for role,profile in profiles.items():
        name=f'task-{role}'
        instructions=(ROOT/f'shared/{role}.txt').read_text().strip()
        body=common+'\n\n'+instructions+'\n'
        for host,extension in [('codex','toml'),('claude','md'),('pi','md')]:
            directory=f'diagnostics/{host}' if profile['diagnostic_only'] else f'{host}/.{host}/agents'
            path=output_root/directory/f'{name}.{extension}'
            path.parent.mkdir(parents=True,exist_ok=True)
            if host=='codex':
                text=f'name = "{name}"\ndescription = {json.dumps(profile["description"])}\nmodel = "{profile["model"]}"\nmodel_reasoning_effort = "{profile["effort"]}"\nsandbox_mode = "{profile["codex_sandbox"]}"\ndeveloper_instructions = """\n{body}"""\n'
            elif host=='claude':
                text=f'---\nname: {name}\ndescription: {profile["description"]}\nmodel: {profile["claude_model"]}\neffort: {profile["effort"]}\ntools: {profile["claude_tools"]}\npermissionMode: default\n---\n\n{body}'
            else:
                excludes='excludeTools: '+', '.join(profile['pi_exclude'])+'\n' if profile['pi_exclude'] else ''
                text=f'---\nname: {name}\ndescription: {profile["description"]}\nmodel: openai-codex/{profile["model"]}\nthinking: {profile["effort"]}\ntools: {profile["pi_tools"]}\n{excludes}systemPromptMode: replace\ninheritProjectContext: false\ninheritGlobalContext: false\ninheritSkills: false\n---\n\n{body}\nThe coordinator supplies all applicable trusted global/project constraints and the explicit skill selection, which can be empty for a simple task. Inheritance is disabled to keep reviewed source text separate from authority. Refuse work if the required authority or task context is missing.\n'
            path.write_text(text)
            rendered.append({'path':str(path.relative_to(output_root)),'sha256':hashlib.sha256(text.encode()).hexdigest()})
    (output_root/'adapter-checksums.json').write_text(json.dumps(rendered,indent=2)+'\n')


if __name__=='__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    render(args.output)
