// Lecture outline (content only) -> positioned page specification.
// Environment-neutral: used by build_outline.mjs and by the browser page.
// The AI or teacher writes content; this module owns coordinates, spacing and overflow checks.
// Text never shrinks silently to fit: overflow is reported so the page can be split.

export const OUTLINE_FORMAT = 'lecture-outline';
export const LAYOUTS = ['cover','agenda','section','bullets','definition','compare','table','process','case','figure','review','quiz','closing'];
export const LAYOUT_NAMES = {cover:'封面',agenda:'目录',section:'过渡页',bullets:'要点',definition:'概念定义',compare:'对比',table:'表格',
  process:'流程',case:'教学情境',figure:'原图',review:'知识回顾',quiz:'课堂提问',closing:'结束页'};

export const DEFAULT_THEME = {
  font:'Microsoft YaHei', primary:'#2F5D7C', accent:'#167A85', text:'#243746', muted:'#5E6E78',
  background:'#F7F8FA', surface:'#FFFFFF', tint:'#E7F0F3', line:'#A3B1B9', border:'#D3DDE2', warm:'#B5652B',
  pageNumbers:true, width:960, height:540,
};

const LINE = 1.32;            // Microsoft YaHei single line height relative to font size
const M = 48;                 // side margin
const BOTTOM = 474;           // content bottom (above source/page number band)

// ---------- text measurement ----------
const isWide = c => c >= 0x2E80 || (c >= 0x3000 && c <= 0x303F);
function charWidth(ch) {
  const c = ch.codePointAt(0);
  if (isWide(c)) return 1;
  if (/[A-Z]/.test(ch)) return /[MW]/.test(ch) ? .9 : .66;
  if (/[mw]/.test(ch)) return .85;
  if (/[iljtf.,;:'!|()\[\]]/.test(ch)) return .32;
  if (ch === ' ') return .3;
  return .56;
}
const tokenWidth = (t, px) => [...t].reduce((a, ch) => a + charWidth(ch), 0) * px;
/** Estimated wrapped line count for text at px within width (greedy, CJK breaks anywhere). */
export function countLines(text, px, width) {
  const usable = width * .98;
  let total = 0;
  for (const para of String(text).split('\n')) {
    const tokens = para.match(/[⺀-￿]|[^\s⺀-￿]+|\s+/g) || [];
    let n = 1, w = 0;
    for (const tok of tokens) {
      const tw = tokenWidth(tok, px);
      if (/^\s+$/.test(tok)) { if (w > 0) w += tw; continue; }
      if (w + tw > usable && w > 0) {
        // Closing punctuation stays on the previous line (kinsoku), so allow a small overhang.
        if (/^[，。、；：！？）》」』”’,.;:!?)]$/.test(tok) && w + tw <= usable + px) { w += tw; continue; }
        n++; w = 0;
      }
      if (tw > usable) { n += Math.floor(tw / usable); w = tw % usable; } else w += tw;
    }
    total += n;
  }
  return total;
}
export const textHeight = (text, px, width, spacing = 1) => countLines(text, px, width) * px * LINE * spacing;

// ---------- helpers ----------
const str = v => typeof v === 'string' ? v.trim() : (typeof v === 'number' ? String(v) : '');
const list = v => Array.isArray(v) ? v : (v === undefined || v === null || v === '' ? [] : [v]);
const KEY = /^([^：:\n]{1,16})[：:]\s*([\s\S]+)$/;
const splitKey = t => { const m = str(t).match(KEY); return m ? {key:m[1].trim(), rest:m[2].trim()} : null; };
const pointText = p => typeof p === 'string' || typeof p === 'number' ? str(p) : str(p?.text);
const pointSubs = p => (p && typeof p === 'object' && !Array.isArray(p)) ? list(p.sub).map(str).filter(Boolean) : [];

function textEl(name, text, x, y, w, h, size, o = {}) {
  return {type:'shape', name, text, position:{left:x, top:y, width:w, height:h}, fontSize:size, ...o};
}
function runsEl(name, runs, x, y, w, h, size, o = {}) {
  return {type:'shape', name, runs, position:{left:x, top:y, width:w, height:h}, fontSize:size, ...o};
}
function box(name, x, y, w, h, o = {}) {
  return {type:'shape', name, geometry:o.geometry ?? 'rect', position:{left:x, top:y, width:w, height:h}, ...o};
}

/** Runs for a bullet list; "术语：解释" gets a bold accent term. Returns {runs, height}. */
function bulletRuns(points, size, width, theme, {subSize = size - 3, gap = 10} = {}) {
  const runs = []; let height = 0;
  const items = points.map(p => ({text:pointText(p), subs:pointSubs(p)})).filter(p => p.text);
  items.forEach((p, i) => {
    const last = i === items.length - 1 && !p.subs.length;
    const k = splitKey(p.text);
    if (k) {
      runs.push({text:k.key + '：', bold:true, color:theme.accent, bullet:true});
      runs.push({text:k.rest, breakLine:!last});
    } else runs.push({text:p.text, bullet:true, breakLine:!last});
    height += textHeight(p.text, size, width - 24) + gap;
    p.subs.forEach((s, j) => {
      runs.push({text:s, bullet:true, indent:1, fontSize:subSize, color:theme.muted, breakLine:!(i === items.length - 1 && j === p.subs.length - 1)});
      height += textHeight(s, subSize, width - 48) + gap * .6;
    });
  });
  return {runs, height, count:items.length};
}

// ---------- validation ----------
function fail(i, layout, msg) { throw Error(`第${i + 1}页（${LAYOUT_NAMES[layout] ?? layout}）：${msg}`); }

export function validateOutline(outline) {
  if (!outline || typeof outline !== 'object' || Array.isArray(outline)) throw Error('内容必须是一个 JSON 对象（以 { 开头）');
  if (outline.format !== undefined && outline.format !== OUTLINE_FORMAT) throw Error(`format 应为 "${OUTLINE_FORMAT}"`);
  if (!Array.isArray(outline.slides) || !outline.slides.length) throw Error('缺少 slides 页面列表');
  if (outline.slides.length > 80) throw Error('一次最多 80 页，请按节拆分');
  outline.slides.forEach((s, i) => {
    const layout = s?.layout;
    if (!LAYOUTS.includes(layout)) throw Error(`第${i + 1}页：未知版式 "${layout}"，可用：${LAYOUTS.join(', ')}`);
    const need = (cond, msg) => { if (!cond) fail(i, layout, msg); };
    const has = k => str(s[k]) !== '';
    const arr = (k, min, max) => need(Array.isArray(s[k]) && s[k].length >= min && s[k].length <= max, `${k} 需要 ${min}–${max} 项`);
    switch (layout) {
      case 'cover': need(has('title'), '缺少 title'); break;
      case 'agenda': arr('items', 2, 10); break;
      case 'section': case 'closing': need(has('title'), '缺少 title'); break;
      case 'bullets': need(has('title'), '缺少 title'); arr('points', 1, 8); break;
      case 'definition': need(has('term') && has('definition'), '需要 term 和 definition'); if (s.points !== undefined) arr('points', 0, 4); break;
      case 'compare': need(has('title'), '缺少 title'); arr('columns', 2, 3);
        s.columns.forEach((c, j) => need(str(c?.title) && Array.isArray(c?.points) && c.points.length, `第${j + 1}栏需要 title 和 points`)); break;
      case 'table': need(has('title'), '缺少 title'); need(Array.isArray(s.headers) && s.headers.length >= 2 && s.headers.length <= 6, 'headers 需要 2–6 列');
        arr('rows', 1, 10); s.rows.forEach((r, j) => need(Array.isArray(r) && r.length === s.headers.length, `第${j + 1}行列数应与 headers 相同`)); break;
      case 'process': need(has('title'), '缺少 title'); arr('steps', 2, 6);
        s.steps.forEach((st, j) => need(str(typeof st === 'string' ? st : st?.title), `第${j + 1}步缺少 title`)); break;
      case 'case': need(has('title') && has('material'), '需要 title 和 material'); arr('questions', 1, 4);
        if (s.analysis !== undefined) need(list(s.analysis).length <= 5, 'analysis 最多 5 条'); break;
      case 'figure': need(has('title'), '缺少 title'); need(has('image') || has('placeholder'), '需要 image（图片文件名）或 placeholder（待插图说明）'); break;
      case 'review': arr('branches', 2, 5); s.branches.forEach((b, j) => need(str(b?.title), `第${j + 1}个分支缺少 title`)); break;
      case 'quiz': need(has('title'), '缺少 title'); arr('questions', 1, 4);
        s.questions.forEach((q, j) => need(str(typeof q === 'string' ? q : q?.q), `第${j + 1}题缺少 q`)); break;
    }
  });
  return outline;
}

// ---------- layouts ----------
function header(s, ctx) {
  const {theme, W} = ctx, frame = ctx.frame, els = [];
  // Template frames may move the rule and shorten the heading around logos.
  const rule = frame.ruleY ?? 72, right = Math.min(W - M, frame.headingRight ?? W - M), HW = right - M, CW = W - 2 * M;
  const ownRule = frame.ownRule !== false;
  const heading = text => {
    els.push(textEl('heading', text, M, rule - 48, HW, 40, 28, {bold:true, color:theme.primary, valign:'bottom'}));
    if (ownRule) els.push(box('title-rule', M, rule, CW, 1.5, {fill:theme.line}));
    if (countLines(text, 28, HW) > 1) ctx.issue('error', '标题过长（超过一行），请缩短');
  };
  const section = ctx.section;
  if (section) {
    heading(section);
    els.push(textEl('topic', str(s.title), M, rule + 12, CW, 36, 22, {bold:true, color:theme.text, valign:'middle'}));
    if (countLines(str(s.title), 22, CW) > 1) ctx.issue('error', '页面标题过长（超过一行），请缩短');
    return {els, top:rule + 66};
  }
  heading(str(s.title));
  return {els, top:rule + 26};
}

function footer(s, ctx, {fictional = false} = {}) {
  const {theme, W} = ctx, els = [], right = Math.min(W - M, ctx.frame.footerRight ?? W - M);
  const source = str(s.source);
  const parts = [fictional && !/虚构/.test(source) ? '教学情境（虚构）' : '', source].filter(Boolean);
  if (parts.length) {
    const text = parts.join('；'), w = right - M - 70;
    els.push(textEl('source', text, M, 484, w, 24, 14, {color:theme.muted, valign:'middle'}));
    if (countLines(text, 14, w) > 1) ctx.issue('warning', '来源说明较长，建议把完整出处写进备注');
  }
  if (theme.pageNumbers) els.push(textEl('page-number', String(ctx.index + 1), right - 60, 486, 60, 22, 14, {color:theme.muted, align:'right', valign:'middle'}));
  return els;
}

// Overflow messages say what to ask the AI, so a teacher can fix the page in one round.
const FIX = {
  bullets:'要点太多：拆成两页，或每条精简到 20 字以内',
  definition:'定义或要点太长：定义控制在 60 字内，要点 2–3 条',
  compare:'对比内容太多：每栏不超过 4 条、每条 15 字以内，或拆成两页',
  table:'表格太长：减少行数、精简单元格文字，或拆成两页',
  process:'流程说明太长：每步说明控制在 25 字以内',
  case:'情境太长：材料控制在 80 字内，问题不超过 2 个，参考分析改为 2–3 条、每条不超过 30 字',
  figure:'图旁要点太多：减少到 3 条以内',
  quiz:'提问太多：每页不超过 4 题，每个答案精简到 25 字以内，或拆成两页',
};
function check(ctx, needed, available, what = '内容') {
  if (needed <= available + 2) return;
  const fix = FIX[ctx.layout] ?? '内容太多：精简或拆成两页';
  ctx.issue('error', `${what}超出版面约 ${Math.round((needed / available - 1) * 100)}%（不自动缩小字号）。可以对 AI 说：“第 ${ctx.index + 1} 页${fix}，其他页不变，输出完整 JSON。”`);
}
/** Card row for "term：text" points. */
function cardRow(points, x, y, w, ctx, {minHeight = 0, titleSize = 21, bodySize = 18} = {}) {
  const {theme} = ctx, n = points.length, gap = 20, cw = (w - gap * (n - 1)) / n, pad = 16, els = [];
  const parsed = points.map(p => splitKey(pointText(p)) ?? {key:'', rest:pointText(p)});
  const inner = cw - 2 * pad;
  const titleH = Math.max(...parsed.map(p => p.key ? textHeight(p.key, titleSize, inner) : 0));
  const bodyH = Math.max(...parsed.map(p => textHeight(p.rest, bodySize, inner)));
  const h = Math.max(minHeight, pad + 5 + titleH + (titleH ? 8 : 0) + bodyH + pad);
  parsed.forEach((p, i) => {
    const cx = x + i * (cw + gap);
    els.push(box(`card-${i + 1}`, cx, y, cw, h, {fill:theme.surface, lineColor:theme.border, lineWidth:1}));
    els.push(box(`card-${i + 1}-bar`, cx, y, cw, 5, {fill:theme.accent}));
    let ty = y + pad + 5;
    if (p.key) { els.push(textEl(`card-${i + 1}-title`, p.key, cx + pad, ty, inner, titleH, titleSize, {bold:true, color:theme.accent})); ty += titleH + 8; }
    els.push(textEl(`card-${i + 1}-text`, p.rest, cx + pad, ty, inner, Math.max(bodyH, 10), bodySize, {color:theme.text}));
  });
  return {els, height:h};
}

function emphasisBox(text, x, y, w, ctx, name = 'emphasis') {
  const {theme} = ctx, size = 20, pad = 14;
  const h = textHeight(text, size, w - 2 * pad - 8) + 2 * pad;
  return {height:h, els:[
    box(name, x, y, w, h, {fill:theme.tint}),
    box(name + '-bar', x, y, 6, h, {fill:theme.accent}),
    textEl(name + '-text', text, x + 6 + pad, y + pad, w - 2 * pad - 8, h - 2 * pad, size, {bold:true, color:theme.primary, valign:'middle'}),
  ]};
}

const L = {};

L.cover = (s, ctx) => {
  const {theme, W, H, frame} = ctx, els = [], title = str(s.title), subtitle = str(s.subtitle), meta = str(s.meta);
  if (frame.coverTitle || frame.coverDecorated) {
    // Template cover: centre the text, inside the template's title band when there is one.
    const band = frame.coverTitle, w = band ? band.width - 24 : W - 2 * M - 120, x = band ? band.left + 12 : (W - w) / 2;
    const th = textHeight(title, 36, w), ty = band ? band.top + Math.max(0, (band.height - th) / 2) : 190 - th / 2;
    if (countLines(title, 36, w) > 2) ctx.issue('error', '封面标题超过两行，请缩短');
    els.push(textEl('title', title, x, ty, w, th, 36, {bold:true, color:band?.color ?? theme.primary, align:'center'}));
    const below = band ? band.top + band.height + 18 : ty + th + 24;
    if (subtitle) els.push(textEl('subtitle', subtitle, x, below, w, textHeight(subtitle, 22, w), 22, {color:theme.text, align:'center'}));
    if (meta) els.push(textEl('meta', meta, x, Math.max(below + 60, 420), w, 30, 18, {color:theme.muted, align:'center', valign:'middle'}));
    return els;
  }
  const x = M + 44, w = W - x - M;
  if (ctx.coverImage) els.push({type:'image', name:'cover-background', path:ctx.coverImage, fit:'cover', position:{left:0, top:0, width:W, height:H}, alt:'封面背景'});
  else els.push(box('cover-bar', 0, 0, 18, H, {fill:theme.primary}));
  const th = textHeight(title, 40, w);
  if (countLines(title, 40, w) > 2) ctx.issue('error', '封面标题超过两行，请缩短');
  const ty = 150 + Math.max(0, (100 - th) / 2);
  els.push(textEl('title', title, x, ty, w, th, 40, {bold:true, color:theme.primary}));
  els.push(box('title-accent', x, ty + th + 18, 96, 4, {fill:theme.accent}));
  if (subtitle) els.push(textEl('subtitle', subtitle, x, ty + th + 40, w, textHeight(subtitle, 24, w), 24, {color:theme.text}));
  if (meta) els.push(textEl('meta', meta, x, 420, w, 30, 18, {color:theme.muted, valign:'middle'}));
  return els;
};

L.agenda = (s, ctx) => {
  const {theme, W} = ctx, h = header({title:str(s.title) || '目录'}, {...ctx, section:''}), els = [...h.els];
  const items = s.items.map(str), n = items.length, cols = n > 5 ? 2 : 1, rows = Math.ceil(n / cols);
  const avail = ctx.bottom - h.top - 10, rowH = Math.min(70, avail / rows), colW = (W - 2 * M) / cols;
  const y0 = h.top + 10 + (avail - rowH * rows) / 2;
  items.forEach((t, i) => {
    const c = Math.floor(i / rows), r = i % rows, x = M + c * colW + 20, y = y0 + r * rowH + (rowH - 44) / 2;
    els.push(textEl(`item-${i + 1}-number`, String(i + 1), x, y, 44, 44, 20, {geometry:'ellipse', fill:theme.primary, color:'#FFFFFF', bold:true, align:'center', valign:'middle'}));
    els.push(textEl(`item-${i + 1}`, t, x + 64, y - 4, colW - 104, 52, 22, {color:theme.text, valign:'middle'}));
    if (countLines(t, 22, colW - 104) > 1) ctx.issue('warning', `目录第${i + 1}项过长`);
  });
  return els;
};

L.section = (s, ctx) => {
  const {theme, W, frame} = ctx, x = M + 44, w = W - x - M, els = [];
  const dark = frame.sectionDark !== false;
  const c = dark ? {number:'#BFD4DE', title:'#FFFFFF', sub:'#DCE7EC'} : {number:theme.accent, title:theme.primary, sub:theme.text};
  const number = str(s.number), title = str(s.title), th = textHeight(title, 36, w);
  let y = 270 - (th + (number ? 90 : 0) + (str(s.subtitle) ? 50 : 0)) / 2;
  if (number) { els.push(textEl('number', number, x, y, w, 80, 64, {bold:true, color:c.number})); y += 90; }
  els.push(textEl('title', title, x, y, w, th, 36, {bold:true, color:c.title}));
  els.push(box('title-accent', x, y + th + 14, 80, 4, {fill:c.number}));
  if (str(s.subtitle)) els.push(textEl('subtitle', str(s.subtitle), x, y + th + 34, w, textHeight(str(s.subtitle), 20, w), 20, {color:c.sub}));
  return els;
};

L.closing = L.section;

L.bullets = (s, ctx) => {
  const {theme, W} = ctx, h = header(s, ctx), els = [...h.els], CW = W - 2 * M;
  let bottom = ctx.bottom;
  const emphasis = str(s.emphasis);
  let emph;
  if (emphasis) { emph = emphasisBox(emphasis, M, 0, CW, ctx); bottom -= emph.height + 16; }
  const points = list(s.points);
  const keyed = points.every(p => splitKey(pointText(p)) && !pointSubs(p).length);
  const style = s.style ?? (keyed && points.length >= 2 && points.length <= 4 && points.every(p => splitKey(pointText(p)).rest.length <= 70) ? 'cards' : 'list');
  const avail = bottom - h.top - 6;
  if (style === 'cards') {
    // Natural-height cards; the card row and emphasis are placed together, slightly above center.
    const full = ctx.bottom - h.top - 6, probe = cardRow(points.slice(0, 4), M, 0, CW, ctx, {minHeight:150, bodySize:19});
    const total = probe.height + (emph ? 28 + emph.height : 0);
    check(ctx, total, full);
    const y0 = h.top + 6 + Math.max(0, (full - total) * .35);
    els.push(...cardRow(points.slice(0, 4), M, y0, CW, ctx, {minHeight:150, bodySize:19}).els);
    if (emph) els.push(...emphasisBox(emphasis, M, y0 + probe.height + 28, CW, ctx).els);
    return els;
  } else if (s.reveal) {
    let y = h.top + 6;
    points.forEach((p, i) => {
      const b = bulletRuns([p], 22, CW, ctx.theme);
      els.push(runsEl(`reveal_${i + 1}_1_point`, b.runs, M, y, CW, Math.min(b.height, Math.max(10, bottom - y)), 22, {color:theme.text, paragraphSpacing:6}));
      y += b.height + 6;
      ctx.reveal(`第${i + 1}次点击：显示第${i + 1}条要点`);
    });
    check(ctx, y - h.top - 6, avail);
  } else {
    const b = bulletRuns(points, 22, CW, theme);
    if (b.count > 6) ctx.issue('warning', `要点 ${b.count} 条，建议每页不超过 6 条`);
    check(ctx, b.height, avail);
    els.push(runsEl('points', b.runs, M, h.top + 6, CW, Math.max(10, Math.min(avail, b.height + 10)), 22, {color:theme.text, paragraphSpacing:10, lineSpacing:1}));
  }
  if (emph) els.push(...emphasisBox(emphasis, M, bottom + 16, CW, ctx).els);
  return els;
};

L.definition = (s, ctx) => {
  const {theme, W} = ctx, h = header({...s, title:str(s.title) || str(s.term)}, ctx), els = [...h.els], CW = W - 2 * M, pad = 18;
  const term = str(s.term), def = str(s.definition), inner = CW - 2 * pad - 8;
  const termH = textHeight(term, 24, inner), defH = textHeight(def, 22, inner);
  const cardH = pad + termH + 10 + defH + pad;
  let y = h.top + 6;
  els.push(box('definition-card', M, y, CW, cardH, {fill:theme.surface, lineColor:theme.border, lineWidth:1}));
  els.push(box('definition-bar', M, y, 6, cardH, {fill:theme.accent}));
  els.push(textEl('term', term, M + 8 + pad, y + pad, inner, termH, 24, {bold:true, color:theme.accent}));
  els.push(textEl('definition', def, M + 8 + pad, y + pad + termH + 10, inner, defH, 22, {color:theme.text}));
  y += cardH + 22;
  const points = list(s.points);
  let bottom = ctx.bottom;
  if (points.length) {
    if (points.every(p => splitKey(pointText(p)))) {
      const row = cardRow(points, M, y, CW, ctx, {titleSize:20, bodySize:18});
      els.push(...row.els); y += row.height;
    } else {
      const b = bulletRuns(points, 20, CW, theme);
      els.push(runsEl('points', b.runs, M, y, CW, Math.max(10, Math.min(b.height + 8, bottom - y)), 20, {color:theme.text, paragraphSpacing:8}));
      y += b.height;
    }
  }
  check(ctx, y - h.top, bottom - h.top);
  return els;
};

L.compare = (s, ctx) => {
  const {theme, W} = ctx, h = header(s, ctx), els = [...h.els], CW = W - 2 * M;
  const conclusion = str(s.conclusion);
  let bottom = ctx.bottom, emph;
  if (conclusion) { emph = emphasisBox(conclusion, M, 0, CW, ctx, 'conclusion'); bottom -= emph.height + 16; }
  const n = s.columns.length, gap = 22, cw = (CW - gap * (n - 1)) / n, pad = 16, headH = 46, top = h.top + 6;
  const bodies = s.columns.map(c => bulletRuns(c.points, 19, cw - 2 * pad, theme, {gap:8}));
  const need = headH + pad + Math.max(...bodies.map(b => b.height)) + pad;
  const avail = bottom - top;
  check(ctx, need, avail);
  const colH = Math.max(Math.min(avail, need), Math.min(avail, 220));
  s.columns.forEach((c, i) => {
    const x = M + i * (cw + gap);
    els.push(box(`column-${i + 1}`, x, top, cw, colH, {fill:theme.surface, lineColor:theme.border, lineWidth:1}));
    els.push(textEl(`column-${i + 1}-title`, str(c.title), x, top, cw, headH, 21, {geometry:'rect', fill:i % 2 ? theme.accent : theme.primary, color:'#FFFFFF', bold:true, align:'center', valign:'middle'}));
    els.push(runsEl(`column-${i + 1}-points`, bodies[i].runs, x + pad, top + headH + pad, cw - 2 * pad, Math.max(10, colH - headH - 2 * pad), 19, {color:theme.text, paragraphSpacing:8}));
  });
  if (emph) els.push(...emphasisBox(conclusion, M, bottom + 16, CW, ctx, 'conclusion').els);
  return els;
};

L.table = (s, ctx) => {
  const {theme, W} = ctx, h = header(s, ctx), els = [...h.els], CW = W - 2 * M;
  const note = str(s.note);
  let bottom = ctx.bottom, emph;
  if (note) { emph = emphasisBox(note, M, 0, CW, ctx, 'note'); bottom -= emph.height + 14; }
  const values = [s.headers.map(str), ...s.rows.map(r => r.map(str))];
  const size = values.length > 6 ? 16 : 18;
  const weight = s.headers.map((_, c) => Math.max(...values.map(r => Math.min(40, Math.max(4, tokenWidth(r[c], 1))))));
  const total = weight.reduce((a, b) => a + b, 0);
  const minimum = s.headers.map((_, c) => {
    const longest = Math.max(...values.map(r => tokenWidth(r[c], size)));
    return longest <= size * 8 ? longest + 28 : 90;
  });
  let widths = weight.map((w, c) => Math.max(minimum[c], CW * w / total));
  const scale = CW / widths.reduce((a, b) => a + b, 0);
  widths = widths.map(w => w * scale);
  widths[widths.length - 1] += CW - widths.reduce((a, b) => a + b, 0);
  const rowHeights = values.map(r => Math.max(...r.map((v, c) => textHeight(v || ' ', size, widths[c] - 16))) + 12);
  const need = rowHeights.reduce((a, b) => a + b, 0);
  const avail = bottom - h.top - 6;
  check(ctx, need, avail, '表格');
  const tableH = Math.min(need, avail);
  const k = tableH / need;
  els.push({type:'table', name:'table', values, fontSize:size, color:theme.text, headerFill:theme.primary, bandFill:theme.tint, borderColor:theme.border,
    boldFirstColumn:s.boldFirstColumn !== false, columnWidths:widths, rowHeights:rowHeights.map(r => r * k), position:{left:M, top:h.top + 6, width:CW, height:tableH}});
  if (emph) els.push(...emphasisBox(note, M, Math.min(bottom, h.top + 6 + tableH) + 14, CW, ctx, 'note').els);
  return els;
};

L.process = (s, ctx) => {
  const {theme, W} = ctx, h = header(s, ctx), els = [...h.els], CW = W - 2 * M;
  const steps = s.steps.map(st => typeof st === 'string' ? {title:st, text:''} : {title:str(st.title), text:str(st.text)});
  const n = steps.length, arrow = 34, bw = (CW - arrow * (n - 1)) / n;
  const size = n > 4 ? 16 : 18, headH = Math.max(52, ...steps.map(st => textHeight(st.title, 19, bw - 16) + 18));
  const detailH = Math.max(0, ...steps.map(st => st.text ? textHeight(st.text, size, bw - 24) + 24 : 0));
  const blockH = 30 + headH + (detailH ? 12 + detailH : 0);
  const avail = ctx.bottom - h.top - 6;
  check(ctx, blockH, avail);
  const y = h.top + 6 + Math.max(0, (avail - blockH) / 3);
  steps.forEach((st, i) => {
    const x = M + i * (bw + arrow);
    els.push(textEl(`step-${i + 1}-number`, String(i + 1).padStart(2, '0'), x, y, bw, 26, 18, {bold:true, color:theme.accent, align:'center'}));
    els.push(textEl(`step-${i + 1}`, st.title, x, y + 30, bw, headH, 19, {geometry:'roundRect', fill:theme.primary, color:'#FFFFFF', bold:true, align:'center', valign:'middle', margin:6}));
    if (st.text) {
      els.push(textEl(`step-${i + 1}-text`, st.text, x, y + 30 + headH + 12, bw, detailH, size, {geometry:'rect', fill:theme.surface, lineColor:theme.border, lineWidth:1, color:theme.text, margin:10}));
    }
    if (i) els.push({type:'connector', name:`arrow-${i}`, from:`step-${i}`, to:`step-${i + 1}`, fromSide:'right', toSide:'left', arrow:true, color:theme.line, width:2});
  });
  return els;
};

L.case = (s, ctx) => {
  const {theme, W} = ctx, h = header(s, ctx), els = [...h.els], CW = W - 2 * M, pad = 16;
  const material = str(s.material), inner = CW - 2 * pad - 6;
  const labelH = 22, matH = textHeight(material, 20, inner);
  const cardH = pad + labelH + 6 + matH + pad;
  let y = h.top + 4;
  els.push(box('material-card', M, y, CW, cardH, {fill:theme.tint}));
  els.push(box('material-bar', M, y, 6, cardH, {fill:theme.warm}));
  els.push(textEl('material-label', str(s.label) || '情境材料', M + 6 + pad, y + pad, inner, labelH, 16, {bold:true, color:theme.warm}));
  els.push(textEl('material', material, M + 6 + pad, y + pad + labelH + 6, inner, matH, 20, {color:theme.text}));
  y += cardH + 18;
  const half = (CW - 24) / 2, questions = s.questions.map(str);
  const qText = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  const qH = textHeight(qText, 20, half) + questions.length * 6;
  els.push(textEl('questions-label', '讨论', M, y, half, 28, 20, {bold:true, color:theme.accent}));
  els.push(textEl('questions', qText, M, y + 34, half, Math.max(10, Math.min(qH, ctx.bottom - y - 34)), 20, {color:theme.text, paragraphSpacing:6}));
  // AIs often return the analysis as one paragraph; split it into sentences for bullets.
  const analysis = (typeof s.analysis === 'string' ? s.analysis.split(/(?<=[。；;！？!?])s*/) : list(s.analysis)).map(str).filter(Boolean);
  let rightH = 0;
  if (analysis.length) {
    const runs = [{text:'参考分析', bold:true, color:theme.accent, breakLine:true}, ...analysis.map((a, i) => ({text:a, bullet:true, breakLine:i < analysis.length - 1}))];
    rightH = 16 + 26 + analysis.reduce((a, t) => a + textHeight(t, 19, half - 48) + 6, 0) + 16;
    els.push(runsEl('reveal_1_1_analysis', runs, M + half + 24, y, half, Math.max(10, Math.min(rightH, ctx.bottom - y)), 19,
      {geometry:'roundRect', radius:.04, fill:theme.surface, lineColor:theme.accent, lineWidth:1.25, color:theme.text, margin:12, paragraphSpacing:6}));
    ctx.reveal('第1次点击：显示参考分析');
  }
  check(ctx, (y - h.top) + Math.max(34 + qH, rightH), ctx.bottom - h.top);
  els.push(...footer(s, ctx, {fictional:s.fictional ?? !str(s.source)}));
  ctx.footerDone = true;
  return els;
};

L.figure = (s, ctx) => {
  const {theme, W} = ctx, h = header(s, ctx), els = [...h.els], CW = W - 2 * M;
  const points = list(s.points), caption = str(s.caption);
  const capH = caption ? 30 : 0, top = h.top + 6, avail = ctx.bottom - top;
  const imgW = points.length ? CW * .56 : CW, imgH = avail - capH;
  const left = s.imageSide === 'right' && points.length ? M + CW - imgW : M;
  if (str(s.image)) els.push({type:'image', name:'figure', path:str(s.image), position:{left, top, width:imgW, height:imgH}, alt:caption || str(s.title)});
  else {
    els.push(textEl('figure-placeholder', `【请在此插入原图】\n${str(s.placeholder)}`, left, top, imgW, imgH, 18,
      {geometry:'rect', fill:'#EEF2F4', lineColor:theme.line, lineWidth:1, lineDash:'dash', color:theme.muted, align:'center', valign:'middle', margin:16}));
    ctx.issue('warning', '原图占位：请在 PowerPoint 中替换为讲义原图');
  }
  if (caption) els.push(textEl('caption', caption, left, top + imgH + 4, imgW, 24, 15, {color:theme.muted, align:'center', valign:'middle'}));
  if (points.length) {
    const x = s.imageSide === 'right' ? M : M + imgW + 28, w = CW - imgW - 28;
    const b = bulletRuns(points, 20, w, theme, {gap:10});
    check(ctx, b.height, avail, '右侧要点');
    els.push(runsEl('points', b.runs, x, top + 4, w, Math.max(10, Math.min(avail, b.height + 8)), 20, {color:theme.text, paragraphSpacing:10}));
  }
  return els;
};

L.review = (s, ctx) => {
  const {theme, W} = ctx, h = header({...s, title:str(s.title) || '知识回顾'}, ctx), els = [...h.els];
  const center = str(s.center) || ctx.section || '本章';
  const n = s.branches.length, top = h.top + 6, avail = ctx.bottom - top, slot = avail / n;
  const rootW = 196, rootH = Math.max(72, textHeight(center, 22, rootW - 20) + 24), bx = M + rootW + 64, bw = 184, bh = 46;
  const ix = bx + bw + 46, iw = W - M - ix;
  els.push(textEl('root', center, M, top + avail / 2 - rootH / 2, rootW, rootH, 22,
    {geometry:'roundRect', fill:theme.primary, color:'#FFFFFF', bold:true, align:'center', valign:'middle', margin:8}));
  s.branches.forEach((b, i) => {
    const cy = top + slot * (i + .5), items = list(b.items).map(str).filter(Boolean);
    els.push(textEl(`branch-${i + 1}`, str(b.title), bx, cy - bh / 2, bw, bh, 20,
      {geometry:'roundRect', radius:.5, fill:theme.tint, lineColor:theme.accent, lineWidth:1.25, color:theme.accent, bold:true, align:'center', valign:'middle', margin:4}));
    if (countLines(str(b.title), 20, bw - 12) > 1) ctx.issue('error', `分支“${str(b.title)}”过长，请控制在 8 字左右`);
    els.push({type:'connector', name:`link-${i + 1}`, from:'root', to:`branch-${i + 1}`, fromSide:'right', toSide:'left', color:theme.line, width:1.5});
    if (items.length) {
      const text = items.join('；'), th = textHeight(text, 18, iw);
      if (th > slot - 6) ctx.issue('error', `分支“${str(b.title)}”的要点过多，请精简`);
      els.push(textEl(`branch-${i + 1}-items`, text, ix, cy - Math.min(th, slot - 6) / 2, iw, Math.max(10, Math.min(th, slot - 6)), 18, {color:theme.text, valign:'middle'}));
      els.push({type:'connector', name:`leaf-${i + 1}`, from:`branch-${i + 1}`, to:`branch-${i + 1}-items`, fromSide:'right', toSide:'left', color:theme.line, width:1.5});
    }
  });
  return els;
};

L.quiz = (s, ctx) => {
  const {theme, W} = ctx, h = header(s, ctx), els = [...h.els], CW = W - 2 * M, pad = 16;
  // 1-2 questions: full-width cards; 3-4: a 2 x 2 grid so a typical classroom check fits on one slide.
  const cols = s.questions.length >= 3 ? 2 : 1, colGap = 20, cw = (CW - colGap * (cols - 1)) / cols;
  const qSize = cols > 1 ? 19 : 21, aSize = cols > 1 ? 17 : 19, badge = cols > 1 ? 32 : 38;
  const tw = cw - (badge + 34) - pad;
  const cards = s.questions.map(q0 => {
    const q = typeof q0 === 'string' ? {q:q0} : q0, options = list(q.options).map(str).filter(Boolean);
    const qt = str(q.q), ot = options.join('    '), at = str(q.answer) ? `答案：${str(q.answer)}` : '';
    const qH = textHeight(qt, qSize, tw), oH = ot ? textHeight(ot, aSize, tw) : 0, aH = at ? textHeight(at, aSize, tw) : 0;
    return {qt, ot, at, qH, oH, aH, height:Math.max(badge + 2 * pad, pad + qH + (ot ? 6 + oH : 0) + (at ? 10 + aH : 0) + pad)};
  });
  const rows = Math.ceil(cards.length / cols);
  const rowH = [...Array(rows)].map((_, r) => Math.max(...cards.slice(r * cols, r * cols + cols).map(c => c.height)));
  const avail = ctx.bottom - h.top - 6, used = rowH.reduce((a, b) => a + b, 0);
  check(ctx, used + 14 * (rows - 1), avail);
  const gap = Math.max(14, Math.min(32, (avail - used) / (rows + 1)));
  let y = h.top + 6 + Math.max(0, Math.min(gap, (avail - used - gap * (rows - 1)) * .3));
  cards.forEach((c, i) => {
    const n = i + 1, r = Math.floor(i / cols), x = M + (i % cols) * (cw + colGap), cy = y + rowH.slice(0, r).reduce((a, b) => a + b + gap, 0);
    const tx = x + pad + badge + 18;
    els.push(box(`question-${n}-card`, x, cy, cw, rowH[r], {fill:theme.surface, lineColor:theme.border, lineWidth:1}));
    els.push(textEl(`question-${n}-number`, String(n), x + pad, cy + pad - 3, badge, badge, cols > 1 ? 16 : 18, {geometry:'ellipse', fill:theme.primary, color:'#FFFFFF', bold:true, align:'center', valign:'middle'}));
    let ty = cy + pad;
    els.push(textEl(`question-${n}`, c.qt, tx, ty, tw, c.qH, qSize, {bold:true, color:theme.text}));
    ty += c.qH;
    if (c.ot) { els.push(textEl(`question-${n}-options`, c.ot, tx, ty + 6, tw, c.oH, aSize, {color:theme.text})); ty += 6 + c.oH; }
    if (c.at) {
      els.push(textEl(`reveal_${n}_1_answer`, c.at, tx, ty + 10, tw, Math.max(10, Math.min(c.aH, ctx.bottom - ty - 10)), aSize, {color:theme.accent, bold:true}));
      ctx.reveal(`第${n}次点击：显示第${n}题答案`);
    }
  });
  return els;
};

// ---------- assembly ----------
function clampElements(els, W, H) {
  for (const e of els) {
    if (!e.position) continue;
    const p = e.position;
    p.left = Math.max(0, Math.min(p.left, W - 1)); p.top = Math.max(0, Math.min(p.top, H - 1));
    p.width = Math.max(1, Math.min(p.width, W - p.left)); p.height = Math.max(1, Math.min(p.height, H - p.top));
    for (const k of ['left', 'top', 'width', 'height']) p[k] = Math.round(p[k] * 100) / 100;
  }
  return els;
}

/**
 * Convert an outline into a page specification.
 * options.images: Set/Array of available image names (for missing-image warnings), optional.
 * Returns {spec, issues, summary}.
 */
export function layoutOutline(outline, options = {}) {
  validateOutline(outline);
  const theme = {...DEFAULT_THEME, ...(outline.theme ?? {})};
  for (const k of ['primary','accent','text','muted','background','surface','tint','line','border','warm'])
    if (!/^#?[0-9A-Fa-f]{6}$/.test(String(theme[k]))) throw Error(`theme.${k} 颜色格式应为 #RRGGBB`);
  const W = Number(theme.width) || 960, H = 540;
  if (W < 640 || W > 1280) throw Error('theme.width 应在 640–1280 之间（960 为 16:9，720 为 4:3）');
  const issues = [], available = options.images ? new Set(options.images) : null, frame = theme.frame ?? {};
  let section = '';
  const slides = outline.slides.map((s, index) => {
    const reveals = [];
    const ctx = {theme, W, H, index, layout:s.layout, section:'', coverImage:theme.coverImage, frame, bottom:Math.min(BOTTOM, frame.bottom ?? BOTTOM),
      issue:(level, message) => issues.push({slide:index + 1, layout:s.layout, level, message}),
      reveal:m => reveals.push(m)};
    if (s.layout === 'section') section = [str(s.number), str(s.title)].filter(Boolean).join(' ');
    else if (s.section !== undefined) section = s.section === null ? '' : str(s.section);
    ctx.section = s.layout === 'agenda' ? '' : section;
    if (s.layout === 'figure' && str(s.image) && available && !available.has(str(s.image)))
      ctx.issue('error', `缺少图片文件 ${str(s.image)}`);
    const structural = ['cover', 'section', 'closing'].includes(s.layout);
    const elements = [];
    if (!structural && theme.backgroundImage)
      elements.push({type:'image', name:'template-background', path:theme.backgroundImage, fit:'cover', position:{left:0, top:0, width:W, height:H}, alt:'模板背景'});
    elements.push(...L[s.layout](s, ctx));
    if (!structural && !ctx.footerDone && s.layout !== 'agenda') elements.push(...footer(s, ctx));
    let notes = str(s.notes);
    if (!notes) {
      if (structural || s.layout === 'agenda') notes = `本页为${LAYOUT_NAMES[s.layout]}，无额外讲授内容。`;
      else { notes = '【待补充】本页授课备注：讲解要点、提问与过渡。'; ctx.issue('warning', '缺少授课备注（notes）'); }
    }
    if (reveals.length) notes += `\n\n【点击顺序】${reveals.join('；')}。`;
    const sectionLike = ['section', 'closing'].includes(s.layout);
    const background = sectionLike && frame.sectionDark !== false ? theme.primary : theme.background;
    const role = s.layout === 'cover' ? 'cover' : sectionLike ? 'section' : 'content';
    return {id:`s${index + 1}-${s.layout}`, role, background, notes, elements:clampElements(elements, W, H), reveal:reveals.length > 0};
  });
  const spec = {version:1, font:theme.font, slideSize:{width:W, height:H}, lang:outline.language ?? 'zh-CN', slides};
  const counts = {};
  outline.slides.forEach(s => counts[s.layout] = (counts[s.layout] ?? 0) + 1);
  return {spec, issues, summary:{title:str(outline.title), slides:slides.length, layouts:counts,
    revealSlides:slides.filter(s => s.reveal).length,
    errors:issues.filter(i => i.level === 'error').length, warnings:issues.filter(i => i.level === 'warning').length}};
}
