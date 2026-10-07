import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {layoutOutline, validateOutline, countLines, LAYOUTS} from '../scripts/lib/outline.mjs';
import {validateSpec} from '../scripts/lib/pptx_core.mjs';

const demo = async () => JSON.parse(await fs.readFile(fileURLToPath(new URL('../examples/outline.json', import.meta.url)), 'utf8'));
const one = slide => ({format:'lecture-outline', version:1, slides:[slide]});
const errors = r => r.issues.filter(i => i.level === 'error');

test('demo outline lays out without errors and yields a valid specification', async () => {
  const r = layoutOutline(await demo());
  assert.deepEqual(errors(r), []);
  assert.equal(r.spec.slides.length, 15);
  validateSpec(r.spec);
  assert.ok(r.spec.slides.every(s => s.notes.trim()));
  assert.deepEqual([...new Set(r.spec.slides.map(s => s.role))].sort(), ['content', 'cover', 'section']);
});

test('every layout is covered by the demo outline', async () => {
  const used = new Set((await demo()).slides.map(s => s.layout));
  for (const layout of LAYOUTS.filter(l => l !== 'figure')) assert.ok(used.has(layout), layout);
});

test('unknown layout and missing fields give Chinese, page-numbered errors', () => {
  assert.throws(() => validateOutline(one({layout:'poster'})), /第1页：未知版式/);
  assert.throws(() => validateOutline(one({layout:'bullets', title:'x'})), /第1页（要点）：points/);
  assert.throws(() => validateOutline({slides:[]}), /slides/);
});

test('overflowing content is reported instead of shrinking text', () => {
  const long = '这是一条很长的要点，用来测试版面溢出时是否会被检测出来而不是悄悄缩小字号，';
  const r = layoutOutline(one({layout:'bullets', title:'溢出', points:Array(8).fill(long + long), notes:'n'}));
  assert.ok(errors(r).some(i => /超出版面/.test(i.message)));
  validateSpec(r.spec);   // still a usable, in-bounds candidate
});

test('section titles carry over to following pages as headings', () => {
  const r = layoutOutline({slides:[{layout:'section', number:'02', title:'方法'}, {layout:'bullets', title:'观察法', points:['直接观察'], notes:'n'}]});
  const heading = r.spec.slides[1].elements.find(e => e.name === 'heading');
  assert.equal(heading.text, '02 方法');
  assert.equal(r.spec.slides[1].elements.find(e => e.name === 'topic').text, '观察法');
});

test('missing notes get a visible placeholder and a warning', () => {
  const r = layoutOutline(one({layout:'bullets', title:'无备注', points:['一条']}));
  assert.match(r.spec.slides[0].notes, /待补充/);
  assert.ok(r.issues.some(i => i.level === 'warning' && /notes/.test(i.message)));
});

test('case analysis and quiz answers are named for click reveal and noted', () => {
  const r = layoutOutline({slides:[
    {layout:'case', title:'情境', material:'材料', questions:['问题'], analysis:['分析'], fictional:true, notes:'n'},
    {layout:'quiz', title:'提问', questions:[{q:'一', answer:'甲'}, {q:'二', answer:'乙'}], notes:'n'},
  ]});
  assert.ok(r.spec.slides[0].elements.some(e => e.name === 'reveal_1_1_analysis'));
  assert.ok(r.spec.slides[0].elements.some(e => e.name === 'source' && /虚构/.test(e.text)));
  assert.deepEqual(r.spec.slides[1].elements.filter(e => /^reveal_/.test(e.name)).map(e => e.name), ['reveal_1_1_answer', 'reveal_2_1_answer']);
  assert.match(r.spec.slides[1].notes, /点击顺序/);
});

test('figure without an image leaves a dashed placeholder for the original figure', () => {
  const r = layoutOutline(one({layout:'figure', title:'流程图', placeholder:'讲义图3-1', notes:'n'}));
  const p = r.spec.slides[0].elements.find(e => e.name === 'figure-placeholder');
  assert.equal(p.lineDash, 'dash');
  assert.match(p.text, /讲义图3-1/);
});

test('a template frame moves the heading above the template rule and omits our own rule', () => {
  const theme = {frame:{ruleY:63, ownRule:false, headingRight:740, footerRight:860, bottom:440}};
  const r = layoutOutline({theme, slides:[{layout:'bullets', section:'第一节', title:'主题', points:['要点'], notes:'n'}]});
  const els = r.spec.slides[0].elements, heading = els.find(e => e.name === 'heading');
  assert.equal(heading.position.top + heading.position.height, 63 - 8);
  assert.ok(heading.position.left + heading.position.width <= 740);
  assert.ok(!els.some(e => e.name === 'title-rule'));
  const page = els.find(e => e.name === 'page-number');
  assert.ok(page.position.left + page.position.width <= 860);
});

test('text measurement wraps Chinese by character width', () => {
  assert.equal(countLines('一二三四五', 20, 200), 1);
  assert.equal(countLines('一二三四五六七八九十一', 20, 200), 2);
  assert.equal(countLines('甲\n乙', 20, 200), 2);
});

test('bad theme colors are rejected', () => {
  assert.throws(() => layoutOutline({theme:{primary:'blue'}, slides:[{layout:'closing', title:'x'}]}), /颜色/);
});
