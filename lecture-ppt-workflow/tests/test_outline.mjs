import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {layoutOutline, validateOutline, countLines, deckLanguage, LAYOUTS} from '../scripts/lib/outline.mjs';
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
  assert.throws(() => validateOutline(one({layout:'poster'}), 'zh'), /第1页：未知版式/);
  assert.throws(() => validateOutline(one({layout:'bullets', title:'x'}), 'zh'), /第1页（要点）：points/);
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
  assert.throws(() => layoutOutline({language:'zh-CN', theme:{primary:'blue'}, slides:[{layout:'closing', title:'x'}]}), /颜色/);
  assert.throws(() => layoutOutline({theme:{primary:'blue'}, slides:[{layout:'closing', title:'x'}]}), /must be a color/);
});

test('four quiz questions fit as a 2 x 2 grid; three stack when they fit', () => {
  const q = (n) => ({q:`第${n}题：工作分析的对象是岗位还是员工？`, answer:'岗位本身，而不是某一位员工。'});
  const r = layoutOutline(one({layout:'quiz', title:'课堂检验', questions:[q(1), q(2), q(3), q(4)], notes:'n'}));
  assert.deepEqual(errors(r), []);
  const cards = r.spec.slides[0].elements.filter(e => /^question-\d-card$/.test(e.name));
  assert.equal(new Set(cards.map(c => c.position.left)).size, 2);
  const three = layoutOutline(one({layout:'quiz', title:'课堂检验', questions:[q(1), q(2), q(3)], notes:'n'}));
  assert.equal(new Set(three.spec.slides[0].elements.filter(e => /^question-\d-card$/.test(e.name)).map(c => c.position.left)).size, 1);
});

test('a one-paragraph case analysis is split into sentence bullets', () => {
  const r = layoutOutline(one({layout:'case', title:'情境', material:'材料', questions:['问题'], analysis:'第一句。第二句；第三句。', fictional:true, source:'自编情境（虚构）', notes:'n'}));
  const els = r.spec.slides[0].elements;
  assert.equal(els.find(e => e.name === 'reveal_1_1_analysis').runs.filter(x => x.bullet).length, 3);
  assert.equal(els.find(e => e.name === 'source').text, '自编情境（虚构）');   // no duplicated fictional label
});

test('overflow errors tell the teacher what to ask the AI', () => {
  const r = layoutOutline(one({layout:'case', title:'情境', material:'很长的材料。'.repeat(70), questions:['问题一', '问题二', '问题三'], analysis:['分析'], notes:'n'}));
  assert.ok(errors(r).some(i => /可以对 AI 说：“第 1 页情境太长/.test(i.message)));
});

// ---------- English decks ----------
const enDemo = async () => JSON.parse(await fs.readFile(fileURLToPath(new URL('../examples/outline.en.json', import.meta.url)), 'utf8'));

test('English demo outline lays out without errors, in English, with every layout', async () => {
  const outline = await enDemo(), r = layoutOutline(outline);
  assert.deepEqual(errors(r), []);
  assert.equal(r.summary.language, 'en');
  assert.equal(r.spec.lang, 'en');
  assert.equal(r.spec.font, 'Calibri');
  validateSpec(r.spec);
  const used = new Set(outline.slides.map(s => s.layout));
  for (const layout of LAYOUTS.filter(l => l !== 'figure')) assert.ok(used.has(layout), layout);
  const text = JSON.stringify(r.spec.slides.map(s => [s.notes, s.elements.map(e => e.text ?? e.runs?.map(x => x.text) ?? e.values)]));
  assert.doesNotMatch(text, /\p{Script=Han}/u);
});

test('deck language: explicit language wins, otherwise CJK text means Chinese', () => {
  assert.equal(deckLanguage({language:'en-GB', slides:[{title:'工作分析'}]}), 'en');
  assert.equal(deckLanguage({language:'zh-CN', slides:[{title:'Job analysis'}]}), 'zh');
  assert.equal(deckLanguage({slides:[{title:'Job analysis'}]}), 'en');
  assert.equal(deckLanguage({slides:[{title:'工作分析'}]}), 'zh');
});

test('English decks get English labels, notes and click order', () => {
  const r = layoutOutline({language:'en', slides:[
    {layout:'agenda', items:['One', 'Two']},
    {layout:'case', title:'Case', material:'Material.', questions:['Why?'], analysis:'First point. Second point; third point.', fictional:true, notes:'n'},
    {layout:'quiz', title:'Check', questions:[{q:'One?', answer:'Yes.'}], notes:'n'},
    {layout:'review', title:'Map', branches:[{title:'A', items:['a1', 'a2']}, {title:'B', items:['b1']}], notes:'n'},
    {layout:'figure', title:'Figure', placeholder:'Figure 3-1'},
  ]});
  const [agenda, kase, quiz, review, figure] = r.spec.slides, el = (s, n) => s.elements.find(e => e.name === n);
  assert.equal(el(agenda, 'heading').text, 'Agenda');
  assert.match(agenda.notes, /^Agenda slide/);
  assert.equal(el(kase, 'material-label').text, 'Case material');
  assert.equal(el(kase, 'questions-label').text, 'Discussion');
  assert.equal(el(kase, 'reveal_1_1_analysis').runs[0].text, 'Suggested analysis');
  assert.equal(el(kase, 'reveal_1_1_analysis').runs.filter(x => x.bullet).length, 3);
  assert.equal(el(kase, 'source').text, 'Teaching scenario (fictional)');
  assert.match(kase.notes, /\[Click order\] Click 1: show the suggested analysis\./);
  assert.equal(el(quiz, 'reveal_1_1_answer').text, 'Answer: Yes.');
  assert.equal(el(review, 'branch-1-items').text, 'a1; a2');
  assert.match(el(figure, 'figure-placeholder').text, /^\[Insert the original figure here\]\nFigure 3-1/);
  assert.match(figure.notes, /^\[TO DO\]/);
  assert.ok(r.issues.some(i => i.message === 'Speaker notes (notes) are missing'));
});

test('English "Term: explanation" points bold the term; times and URLs do not', () => {
  const r = layoutOutline({language:'en', slides:[{layout:'bullets', title:'Uses', style:'list', notes:'n',
    points:['Recruitment and selection: clear hiring criteria', 'Class starts at 10:30', 'See https://example.org']}]});
  const runs = r.spec.slides[0].elements.find(e => e.name === 'points').runs;
  assert.deepEqual(runs.filter(x => x.bold).map(x => x.text), ['Recruitment and selection: ']);
  const cards = layoutOutline({language:'en', slides:[{layout:'bullets', title:'Uses', notes:'n',
    points:['Recruitment: clear hiring criteria instead of first impressions', 'Training: compare skills with the job requirements']}]});
  assert.ok(cards.spec.slides[0].elements.some(e => e.name === 'card-2-title' && e.text === 'Training'));
});

test('issue messages follow options.lang, slide text follows the deck', () => {
  const long = 'This point is far too long for one slide and keeps going so that the layout must overflow. ';
  const en = layoutOutline({language:'zh-CN', slides:[{layout:'bullets', title:'溢出', points:Array(8).fill(long.repeat(2))}]}, {lang:'en'});
  assert.ok(errors(en).some(i => /overflows the slide by about \d+%.*You can tell the AI: "Slide 1 has too many points/.test(i.message)));
  assert.match(en.spec.slides[0].notes, /待补充/);
  const zh = layoutOutline({language:'en', slides:[{layout:'bullets', title:'Overflow', points:Array(8).fill(long.repeat(2))}]}, {lang:'zh'});
  assert.ok(errors(zh).some(i => /可以对 AI 说/.test(i.message)));
  assert.match(zh.spec.slides[0].notes, /^\[TO DO\]/);
  assert.throws(() => validateOutline(one({layout:'bullets', title:'x'}), 'en'), /^Error: Slide 1 \(Key points\): points needs 1–8 items$/);
});

test('English decks use the Latin font of a reference deck', () => {
  const theme = {font:'SimHei', latinFont:'Arial'};
  assert.equal(layoutOutline({language:'en', theme, slides:[{layout:'closing', title:'End'}]}).spec.font, 'Arial');
  assert.equal(layoutOutline({language:'zh-CN', theme, slides:[{layout:'closing', title:'结束'}]}).spec.font, 'SimHei');
});
