"""Add native click-triggered fade-in groups to an authored PPTX.

Usage: python add_animations.py candidate.pptx animated.pptx --slides 1,3-5
Name a shape reveal_1_1_explanation (reveal_<click group>_<item>...).
Groups are ordered numerically; their members enter together in 400 ms.

The standard PowerPoint entrance representation is deliberately used:
tmRoot > mainSeq > indefinite click container > zero-delay container >
clickEffect/withEffect(presetClass=entr), with style.visibility=visible
and animEffect(transition=in,filter=fade). Entrance semantics establish the
pre-effect invisible state. cNvPr hidden=1 MUST NOT be used, since it would
also hide the object in editing/static viewing and after the effect.

Static validation proves timing structure and targets, not actual playback.
Sources:
https://learn.microsoft.com/en-us/office/open-xml/presentation/working-with-animation
https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.animateeffect
https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.nextconditionlist
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path
import json
import re
from zipfile import ZipFile, ZIP_DEFLATED
try:
    from lxml import etree as ET
except ModuleNotFoundError:
    raise SystemExit('ERROR: lxml is required for animations. Use an available runtime with lxml, or obtain permission to prepare the dependency. No files changed.')
from office_audit import slides, fresh_json, sha
from background_patch import selected

P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
NS = {'p': P}
REVEAL = re.compile(r'^reveal_(\d+)_(\d+)(?:_|$)')
SLIDE = re.compile(r'^ppt/slides/slide(\d+)\.xml$')


def sub(parent, name, **attrs):
    return ET.SubElement(parent, f'{{{P}}}{name}', {k: str(v) for k, v in attrs.items()})


def start(parent, delay):
    sub(sub(parent, 'stCondLst'), 'cond', delay=delay)


def target(parent, spid):
    sub(sub(parent, 'tgtEl'), 'spTgt', spid=spid)


def gather(root):
    groups = defaultdict(list)
    all_ids = set()
    for nv in root.findall('.//p:cNvPr', NS):
        spid = nv.get('id')
        if spid in all_ids:
            raise ValueError(f'Duplicate shape id {spid}')
        all_ids.add(spid)
        name = nv.get('name', '')
        match = REVEAL.match(name)
        if not match:
            if name.startswith('reveal_'):
                raise ValueError(f'Malformed reveal shape name {name!r}')
            continue
        if nv.get('hidden', '0') not in ('0', 'false'):
            raise ValueError(f'Reveal shape {spid} is permanently hidden in cNvPr')
        owner = nv.getparent().getparent()
        if ET.QName(owner).localname not in ('sp', 'pic', 'graphicFrame', 'grpSp', 'cxnSp'):
            raise ValueError(f'Unsupported target owner for {name}')
        # Animating both a group and a descendant independently is ambiguous.
        for ancestor in owner.iterancestors(f'{{{P}}}grpSp'):
            parent_nv = ancestor.find('p:nvGrpSpPr/p:cNvPr', NS)
            if parent_nv is not None and REVEAL.match(parent_nv.get('name', '')):
                raise ValueError(f'Both parent group and child have reveal names: {name}')
        groups[int(match[1])].append({'id': spid, 'name': name, 'item': int(match[2])})
    return {g: sorted(v, key=lambda x: x['item']) for g, v in sorted(groups.items())}, all_ids


def build_timing(groups):
    timing = ET.Element(f'{{{P}}}timing')
    counter = 0

    def ctn(parent, **attrs):
        nonlocal counter
        counter += 1
        return sub(parent, 'cTn', id=counter, **attrs)

    root_ctn = ctn(sub(sub(timing, 'tnLst'), 'par'), dur='indefinite', restart='never', nodeType='tmRoot')
    sequence = sub(sub(root_ctn, 'childTnLst'), 'seq', concurrent='1', nextAc='seek')
    main = ctn(sequence, dur='indefinite', nodeType='mainSeq')
    main_children = sub(main, 'childTnLst')
    for group_no, shapes in groups.items():
        click = ctn(sub(main_children, 'par'), fill='hold')
        start(click, 'indefinite')
        delay = ctn(sub(sub(click, 'childTnLst'), 'par'), fill='hold')
        start(delay, '0')
        effects = sub(delay, 'childTnLst')
        for i, shape in enumerate(shapes):
            effect = ctn(sub(effects, 'par'), presetID='10', presetClass='entr',
                         presetSubtype='0', fill='hold', grpId='0',
                         nodeType='clickEffect' if i == 0 else 'withEffect')
            start(effect, '0')
            behaviors = sub(effect, 'childTnLst')
            visibility = sub(behaviors, 'set')
            behavior = sub(visibility, 'cBhvr')
            set_time = ctn(behavior, dur='1', fill='hold')
            start(set_time, '0')
            target(behavior, shape['id'])
            sub(sub(behavior, 'attrNameLst'), 'attrName').text = 'style.visibility'
            sub(sub(visibility, 'to'), 'strVal', val='visible')
            fade = sub(behaviors, 'animEffect', transition='in', filter='fade')
            behavior = sub(fade, 'cBhvr')
            ctn(behavior, dur='400')
            target(behavior, shape['id'])
    for list_name, event in [('prevCondLst', 'onPrev'), ('nextCondLst', 'onNext')]:
        cond = sub(sub(sequence, list_name), 'cond', evt=event, delay='0')
        sub(sub(cond, 'tgtEl'), 'sldTgt')
    return timing


def validate(root, groups, all_ids):
    timing = root.find('p:timing', NS)
    expected = [s['id'] for shapes in groups.values() for s in shapes]
    if not expected:
        assert timing is None
        return
    assert timing is not None
    ids = [n.get('id') for n in timing.findall('.//p:cTn', NS)]
    assert len(ids) == len(set(ids)), 'Duplicate timing ID'
    actual_targets = [n.get('spid') for n in timing.findall('.//p:spTgt', NS)]
    assert set(actual_targets) == set(expected)
    assert set(actual_targets) <= all_ids
    for spid in expected:
        assert actual_targets.count(spid) == 2, 'Need visibility and fade target'
    root_node = timing.find('p:tnLst/p:par/p:cTn', NS)
    assert root_node.get('nodeType') == 'tmRoot'
    seq = root_node.find('p:childTnLst/p:seq', NS)
    assert seq.get('concurrent') == '1' and seq.get('nextAc') == 'seek'
    assert seq.find('p:nextCondLst/p:cond', NS).get('evt') == 'onNext'
    assert seq.find('p:nextCondLst/p:cond/p:tgtEl/p:sldTgt', NS) is not None
    main = seq.find('p:cTn', NS)
    assert main.get('nodeType') == 'mainSeq'
    clicks = main.findall('p:childTnLst/p:par/p:cTn', NS)
    assert len(clicks) == len(groups)
    for click, members in zip(clicks, groups.values()):
        assert click.find('p:stCondLst/p:cond', NS).get('delay') == 'indefinite'
        delay = click.find('p:childTnLst/p:par/p:cTn', NS)
        assert delay.find('p:stCondLst/p:cond', NS).get('delay') == '0'
        effects = delay.findall('p:childTnLst/p:par/p:cTn', NS)
        assert len(effects) == len(members)
        for i, (effect, member) in enumerate(zip(effects, members)):
            assert effect.get('nodeType') == ('clickEffect' if i == 0 else 'withEffect')
            assert effect.get('presetClass') == 'entr' and effect.get('presetID') == '10'
            assert effect.find('p:stCondLst/p:cond', NS).get('delay') == '0'
            visibility = effect.find('p:childTnLst/p:set', NS)
            assert visibility.find('p:cBhvr/p:attrNameLst/p:attrName', NS).text == 'style.visibility'
            assert visibility.find('p:to/p:strVal', NS).get('val') == 'visible'
            assert visibility.find('p:cBhvr/p:tgtEl/p:spTgt', NS).get('spid') == member['id']
            fade = effect.find('p:childTnLst/p:animEffect', NS)
            assert fade.get('transition') == 'in' and fade.get('filter') == 'fade'
            assert fade.find('p:cBhvr/p:cTn', NS).get('dur') == '400'
            assert fade.find('p:cBhvr/p:tgtEl/p:spTgt', NS).get('spid') == member['id']
    transition = root.find('p:transition', NS)
    assert transition is None or ('advTm' not in transition.attrib and transition.get('advClick', '1') == '1')
    assert not root.findall('.//p:sndAc', NS), 'Sound action found'
    assert not timing.findall('.//p:audio', NS), 'Audio animation found'
    order = [ET.QName(n).localname for n in root]
    assert order.index('timing') > order.index('cSld')
    if 'clrMapOvr' in order:
        assert order.index('timing') > order.index('clrMapOvr')
    if 'transition' in order:
        assert order.index('timing') > order.index('transition')
    if 'extLst' in order:
        assert order.index('timing') < order.index('extLst')


def process(source, destination, audit_path=None, pages=None):
    source, destination = Path(source), Path(destination)
    audit_path = Path(audit_path) if audit_path else destination.with_suffix('.animation_audit.json')
    if destination.exists() or audit_path.exists():
        raise FileExistsError('Output or audit already exists; choose a new version')
    if pages is None:
        raise ValueError('Explicit slide selection required')
    if not __debug__:
        raise RuntimeError('Do not run with -O: structural assertions must remain enabled')
    if source.resolve() == destination.resolve():
        raise ValueError('Input and output must differ; the original is never overwritten')
    entries = {}
    audits = []
    with ZipFile(source) as src:
        order = slides(src)
        allowed = {order[i-1]: i for i in selected(pages, len(order))}
        for info in src.infolist():
            content = src.read(info.filename)
            match = SLIDE.match(info.filename)
            if match and info.filename in allowed:
                root = ET.fromstring(content)
                groups, all_ids = gather(root)
                if root.find('p:timing', NS) is not None:
                    raise ValueError('Selected slide already has timing; existing teacher animations must be preserved')
                if not groups:
                    raise ValueError('Selected slide has no reveal groups')
                if groups:
                    timing = build_timing(groups)
                    ext = root.find('p:extLst', NS)
                    if ext is not None:
                        root.insert(root.index(ext), timing)
                    else:
                        root.append(timing)
                validate(root, groups, all_ids)
                content = ET.tostring(root, encoding='UTF-8', xml_declaration=True, standalone=True)
                # Validate again after serialization to catch namespace/order issues.
                validate(ET.fromstring(content), groups, all_ids)
                audits.append({'slide': allowed[info.filename], 'part': info.filename,
                               'click_count': len(groups), 'animated_shapes': sum(map(len, groups.values())),
                               'groups': [{'group': g, 'click': i + 1, 'shapes': shapes}
                                          for i, (g, shapes) in enumerate(groups.items())],
                               'static_checks_passed': True})
            entries[info.filename] = (info, content)
        destination.parent.mkdir(parents=True, exist_ok=True)
        with ZipFile(destination, 'x', ZIP_DEFLATED) as out:
            for info, content in entries.values():
                out.writestr(info, content)
    with ZipFile(destination) as check:
        assert check.testzip() is None, 'ZIP integrity failure'
        for audit in audits:
            root = ET.fromstring(check.read(audit['part']))
            groups, all_ids = gather(root)
            validate(root, groups, all_ids)
    audit = {'input': str(source.resolve()), 'output': str(destination.resolve()),
             'input_sha256': sha(source), 'output_sha256': sha(destination),
             'effect': 'native OOXML Fade entrance, 400 ms',
             'initial_visibility': 'Standard entrance preset semantics; cNvPr permanent hidden flag is forbidden',
             'validation_scope': 'ZIP integrity, XML roundtrip, timing tree, target IDs, grouping, duration, manual advance, sound absence. No PowerPoint or WPS slideshow playback test.',
             'slides': sorted(audits, key=lambda a: a['slide'])}
    fresh_json(audit_path, audit)
    print(json.dumps({'slides': len(audits), 'animated_slides': sum(a['click_count'] > 0 for a in audits),
                      'clicks': sum(a['click_count'] for a in audits),
                      'animated_shapes': sum(a['animated_shapes'] for a in audits),
                      'static_checks': 'passed', 'playback_tested': False}, ensure_ascii=False))
    return audit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', nargs='?', default='candidate.pptx')
    parser.add_argument('destination', nargs='?', default='animated.pptx')
    parser.add_argument('--audit')
    parser.add_argument('--slides', required=True)
    args = parser.parse_args()
    process(args.source, args.destination, args.audit, args.slides)

if __name__ == '__main__':
    from cli_support import run
    raise SystemExit(run(main))
