"""Validate local Skill references, identity, UI metadata and Python syntax."""
import ast,json,re
from pathlib import Path
from urllib.parse import unquote

def validate(root):
    root=Path(root).resolve();errors=[];count=0
    entry=(root/'SKILL.md').read_text(encoding='utf-8')
    if not entry.startswith('---\n'):errors.append('Missing frontmatter')
    match=re.search(r'^name:\s*([\w-]+)\s*$',entry,re.M)
    name=match[1] if match else None
    if name!=root.name:errors.append('Folder and skill name differ')
    if not re.search(r'^description:\s*\S',entry,re.M):errors.append('Missing description')
    for f in [root/'SKILL.md',*sorted((root/'references').glob('*.md'))]:
        s=f.read_text(encoding='utf-8')
        for link in re.findall(r'\]\(([^)]+)\)',s):
            if '://' in link or link.startswith('#'):continue
            part=unquote(link.split('#')[0]);target=(f.parent/part).resolve();count+=1
            if not target.is_relative_to(root) or not target.is_file():errors.append(f'{f.name}: missing/escaping reference {link}')
        if re.search(r'[A-Za-z]:[/\\](Users|Program Files)[/\\]',s):errors.append(f'{f.name}: machine-specific path')
    ui=(root/'agents/openai.yaml').read_text(encoding='utf-8')
    fields={k:json.loads(v) for k,v in re.findall(r'^\s+(display_name|short_description|default_prompt):\s*(".*")$',ui,re.M)}
    if len(fields)!=3:errors.append('Missing/invalid quoted UI fields')
    if not 25<=len(fields.get('short_description',''))<=64:errors.append('UI short description outside 25–64 characters')
    if '$'+str(name) not in fields.get('default_prompt',''):errors.append('Default prompt missing invocation')
    for f in (root/'scripts').glob('*.py'):
        try:ast.parse(f.read_text(encoding='utf-8'),filename=str(f))
        except SyntaxError as e:errors.append(str(e))
    return {'errors':errors,'references_checked':count,'name':name,'scope':'Structural checks only; discovery, invocation and output quality require separate tests.'}
if __name__=='__main__':
    import sys
    from cli_support import run
    def main():
        r=validate(Path(__file__).resolve().parents[1]);print(json.dumps(r,ensure_ascii=False));return int(bool(r['errors']))
    raise SystemExit(run(main))
