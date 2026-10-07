// End-to-end package checks: generation, click reveals, unique ids, template reuse.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import JSZip from 'jszip';
import PptxGenJS from 'pptxgenjs';
import {buildOutline} from '../scripts/build_outline.mjs';
import {renumberShapeIds, addReveals, revealGroups} from '../scripts/lib/finalize.mjs';
import {extractTemplate} from '../scripts/lib/template.mjs';

const demoPath = fileURLToPath(new URL('../examples/outline.json', import.meta.url));
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAD0lEQVR4nGNgaGhAIGQOAGQaCAHzfxz6AAAAAElFTkSuQmCC';
const tmp = () => fs.mkdtemp(path.join(os.tmpdir(), 'lecture-package-'));
const slides = zip => Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n));

async function integrity(zip) {
  const types = await zip.file('[Content_Types].xml').async('string');
  for (const name of slides(zip)) {
    const xml = await zip.file(name).async('string');
    const ids = [...xml.matchAll(/<p:cNvPr\b[^>]*\bid="(\d+)"/g)].map(m => m[1]);
    assert.equal(ids.length, new Set(ids).size, `${name}: duplicate shape ids`);
    const rels = await zip.file(name.replace('slides/', 'slides/_rels/') + '.rels').async('string');
    const declared = new Set([...rels.matchAll(/Id="([^"]+)"/g)].map(m => m[1]));
    for (const m of xml.matchAll(/\br:(?:embed|link|id)="([^"]+)"/g)) assert.ok(declared.has(m[1]), `${name}: undeclared ${m[1]}`);
    for (const m of rels.matchAll(/<Relationship\b[^>]*Target="([^"]+)"[^>]*>/g)) {
      if (/TargetMode="External"/.test(m[0])) continue;
      const target = path.posix.normalize(path.posix.join('ppt/slides', m[1]));
      assert.ok(zip.file(target), `${name}: missing ${target}`);
      const ext = target.split('.').pop();
      if (target.startsWith('ppt/media/')) assert.match(types, new RegExp(`Extension="${ext}"`, 'i'), `content type for ${ext}`);
    }
  }
}

test('renumbering gives unique shape ids in document order', () => {
  const xml = '<p:cNvPr id="1" name=""/><p:cNvPr id="6" name="a"/><p:cNvPr id="6" name="b"/>';
  assert.deepEqual([...renumberShapeIds(xml).matchAll(/id="(\d+)"/g)].map(m => m[1]), ['1', '2', '3']);
});

test('reveal groups are ordered and malformed names rejected', () => {
  const xml = '<p:sld><p:cSld><p:cNvPr id="2" name="reveal_2_1_b"/><p:cNvPr id="3" name="reveal_1_1_a"/></p:cSld></p:sld>';
  assert.deepEqual(revealGroups(xml).map(g => g.group), [1, 2]);
  assert.throws(() => revealGroups('<p:cNvPr id="2" name="reveal_x"/>'), /Malformed/);
  assert.throws(() => addReveals('<p:sld><p:cNvPr id="2" name="reveal_1_1"/><p:timing/></p:sld>'), /already has timing/);
});

test('demo outline builds a sound package with notes and click reveals', async () => {
  const dir = await tmp();
  const {file, report} = await buildOutline(demoPath, path.join(dir, 'out'));
  assert.equal(report.status, 'candidate');
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  assert.equal(slides(zip).length, 15);
  assert.equal(Object.keys(zip.files).filter(n => /notesSlide\d+\.xml$/.test(n)).length, 15);
  const timed = [];
  for (const name of slides(zip)) if ((await zip.file(name).async('string')).includes('<p:timing>')) timed.push(name);
  assert.deepEqual(timed.sort(), ['ppt/slides/slide12.xml', 'ppt/slides/slide13.xml']);
  await integrity(zip);
  await assert.rejects(buildOutline(demoPath, path.join(dir, 'out')), /EEXIST/);   // never overwrites
});

async function syntheticTemplate(dir) {
  // Original template: master with a title rule, a corner logo and a footer band; 3 slides.
  const deck = new PptxGenJS();
  deck.layout = 'LAYOUT_16x9';
  deck.defineSlideMaster({title:'COURSE', background:{color:'F2F2F2'}, objects:[
    {line:{x:.5, y:.66, w:9, h:0, line:{color:'1F497D', width:1}}},
    {image:{x:8.6, y:.1, w:.8, h:.4, data:png}},
    {rect:{x:0, y:5.4, w:10, h:.225, fill:{color:'1F497D'}}},
  ]});
  for (const t of ['封面', '内容页示例', '结束']) deck.addSlide({masterName:'COURSE'}).addText(t, {x:1, y:1, w:6, h:1, fontFace:'SimHei', fontSize:28, color:'1F497D'});
  const file = path.join(dir, 'template.pptx');
  await fs.writeFile(file, Buffer.from(await deck.write({outputType:'nodebuffer'})));
  return file;
}

test('template decorations, rule position and media are reused', async () => {
  const dir = await tmp(), file = await syntheticTemplate(dir);
  const t = await extractTemplate(await JSZip.loadAsync(await fs.readFile(file)));
  assert.equal(t.theme.font, 'SimHei');
  assert.equal(t.theme.primary, '#1F497D');
  assert.ok(Math.abs(t.theme.frame.ruleY - 63) <= 1);
  assert.ok(t.template.roles.content.decor.length >= 3);
  assert.ok(Object.keys(t.template.media).some(p => p.endsWith('.png')));
  const {file: out} = await buildOutline(demoPath, path.join(dir, 'out'), {template:file});
  const zip = await JSZip.loadAsync(await fs.readFile(out));
  const content = await zip.file('ppt/slides/slide4.xml').async('string');
  assert.ok(content.includes('rIdTpl'), 'template picture linked');
  assert.ok(!content.includes('name="title-rule"'), 'own rule omitted under template rule');
  assert.ok(content.includes('srgbClr val="1F497D"'));
  await integrity(zip);
});
