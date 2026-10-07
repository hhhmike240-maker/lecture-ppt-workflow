// Browser front end: outline JSON -> preview -> editable PPTX. Everything runs locally.
import {layoutOutline, LAYOUT_NAMES} from '../lecture-ppt-workflow/scripts/lib/outline.mjs';
import {renderDeck} from '../lecture-ppt-workflow/scripts/lib/pptx_core.mjs';
import {finalizePackage} from '../lecture-ppt-workflow/scripts/lib/finalize.mjs';
import {extractTemplate, previewItems} from '../lecture-ppt-workflow/scripts/lib/template.mjs';

const $ = id => document.getElementById(id);
const state = {lang:'zh', prompts:{}, images:new Map(), templateTheme:null, template:null, templateMedia:new Map(), result:null, title:''};

function status(id, kind, html) {
  const el = $(id);
  el.className = `status show ${kind}`;
  el.innerHTML = html;
}
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

// ---------- step 1: prompt ----------
async function loadPrompt(lang) {
  state.lang = lang;
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  if (!state.prompts[lang]) {
    try {
      const r = await fetch(`../prompts/prompt.${lang}.md`);
      if (!r.ok) throw Error(r.status);
      state.prompts[lang] = await r.text();
    } catch {
      state.prompts[lang] = '';
      $('prompt-text').textContent = '提示词加载失败。请通过网址访问本页（不要直接双击打开文件），或到 GitHub 仓库的 prompts 目录复制。';
      return;
    }
  }
  $('prompt-text').textContent = state.prompts[lang];
}
document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => loadPrompt(b.dataset.lang)));
$('copy-prompt').addEventListener('click', async () => {
  const text = state.prompts[state.lang];
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    status('prompt-status', 'ok', '已复制。打开你常用的 AI，粘贴提示词，在末尾填上课程信息并附上讲义（文字或文件）。');
  } catch {
    $('prompt-text').closest('details').open = true;
    const range = document.createRange(); range.selectNodeContents($('prompt-text'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    status('prompt-status', 'warn', '浏览器不允许自动复制，已为你选中提示词，请按 Ctrl+C（Mac 为 ⌘+C）。');
  }
});

// ---------- step 2: parse ----------
function locate(text, pos) {
  const before = text.slice(0, pos), line = before.split('\n').length, col = pos - before.lastIndexOf('\n');
  return `第 ${line} 行第 ${col} 个字符附近：<code>${escapeHtml(text.slice(Math.max(0, pos - 20), pos + 20))}</code>`;
}
export function extractJson(raw) {
  let text = String(raw).replace(/^﻿/, '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1].includes('{')) text = fenced[1];
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw Error('没有找到 JSON 内容。请确认粘贴的是 AI 按提示词输出的代码块。');
  text = text.slice(a, b + 1);
  try { return JSON.parse(text); }
  catch (first) {
    // Common AI slips: trailing commas and full-width punctuation used as JSON syntax.
    const repaired = text.replace(/,\s*([}\]])/g, '$1').replace(/([{,]\s*)“([^”"]+)”(\s*:)/g, '$1"$2"$3');
    try { return JSON.parse(repaired); }
    catch {
      const m = String(first.message).match(/position (\d+)/);
      throw Error('JSON 格式有误' + (m ? '，' + locate(text, Number(m[1])) : '') + '。可以把这条报错发给 AI，请它“只输出修正后的完整 JSON”。');
    }
  }
}

// ---------- step 3: template and images ----------
const readDataUrl = file => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(file); });
const dimensions = src => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok({width:i.naturalWidth, height:i.naturalHeight}); i.onerror = () => bad(Error('图片无法读取')); i.src = src; });
async function imageEntry(dataUrl) { return {data:dataUrl, ...(await dimensions(dataUrl))}; }
const bytesToDataUrl = (bytes, ext) => new Promise(ok => {
  const r = new FileReader(); r.onload = () => ok(r.result);
  r.readAsDataURL(new Blob([bytes], {type:{png:'image/png', gif:'image/gif'}[ext] ?? 'image/jpeg'}));
});

$('template').addEventListener('change', async e => {
  const file = e.target.files[0];
  state.templateTheme = null; state.template = null; state.templateMedia.clear();
  $('template-info').textContent = '';
  if (!file) return refresh();
  try {
    const t = await extractTemplate(await JSZip.loadAsync(await file.arrayBuffer()));
    state.templateTheme = t.theme; state.template = t.template;
    for (const [part, bytes] of Object.entries(t.template.media)) {
      const ext = part.split('.').pop().toLowerCase();
      if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) state.templateMedia.set(part, await bytesToDataUrl(bytes, ext === 'png' ? 'png' : ext));
    }
    const sw = c => `<span class="swatch" style="background:${c}" title="${c}"></span>`;
    $('template-info').innerHTML = `${sw(t.theme.primary)}${sw(t.theme.accent)}${sw(t.theme.text)}<span>${escapeHtml(t.theme.font)}</span>` +
      `<div style="flex-basis:100%">${t.report.map(escapeHtml).join('<br>')}</div>`;
  } catch (err) {
    $('template-info').innerHTML = `<span style="color:var(--err)">${escapeHtml(err.message)}</span>`;
  }
  refresh();
});
$('images').addEventListener('change', async e => {
  state.images.clear();
  for (const file of e.target.files) {
    try { state.images.set(file.name, await imageEntry(await readDataUrl(file))); } catch { /* skipped */ }
  }
  $('image-info').textContent = state.images.size ? `已载入 ${state.images.size} 张：${[...state.images.keys()].join('，')}` : '';
  refresh();
});

// ---------- preview ----------
const px = v => `${Math.round(v * 100) / 100}px`;
const hex = v => !v || v === 'none' ? null : '#' + String(v).replace(/^#/, '');
function paragraphs(e) {
  if (e.runs) {
    const out = [[]];
    for (const r of e.runs) { out[out.length - 1].push(r); if (r.breakLine) out.push([]); }
    return out.filter(p => p.length);
  }
  return String(e.text ?? '').split('\n').map(t => [{text:t}]);
}
function renderShape(e) {
  const d = document.createElement('div'), p = e.position, g = e.geometry ?? 'textbox';
  d.className = 'el';
  Object.assign(d.style, {left:px(p.left), top:px(p.top), width:px(p.width), height:px(p.height),
    justifyContent:{top:'flex-start', middle:'center', bottom:'flex-end'}[e.valign ?? 'top'], textAlign:e.align ?? 'left',
    padding:px(e.margin ?? 0), fontSize:px(e.fontSize ?? 23), fontWeight:e.bold ? '700' : '400', color:hex(e.color) ?? '#263747',
    lineHeight:String(1.32 * (e.lineSpacing ?? 1))});
  if (hex(e.fill) && g !== 'textbox') d.style.background = hex(e.fill);
  else if (hex(e.fill)) d.style.background = hex(e.fill);
  if (hex(e.lineColor)) d.style.border = `${Math.max(1, e.lineWidth ?? 1)}px ${e.lineDash && e.lineDash !== 'solid' ? 'dashed' : 'solid'} ${hex(e.lineColor)}`;
  if (g === 'roundRect') d.style.borderRadius = px((e.radius ?? .08) * Math.min(p.width, p.height));
  if (g === 'ellipse') d.style.borderRadius = '50%';
  for (const para of paragraphs(e)) {
    const line = document.createElement('div');
    const first = para[0] ?? {};
    if (first.bullet) { line.style.paddingLeft = px(first.indent ? 42 : 20); line.style.textIndent = px(-16); }
    if (e.paragraphSpacing) line.style.marginBottom = px(e.paragraphSpacing);
    if (first.bullet) line.append(first.indent ? '◦ ' : '• ');
    for (const r of para) {
      const s = document.createElement('span');
      s.textContent = r.text;
      if (r.bold) s.style.fontWeight = '700';
      if (r.color) s.style.color = hex(r.color);
      if (r.fontSize) s.style.fontSize = px(r.fontSize);
      line.append(s);
    }
    if (!para.some(r => r.text)) line.innerHTML = '&nbsp;';
    d.append(line);
  }
  return d;
}
function renderSlide(slide, spec, resolveImage) {
  const W = spec.slideSize.width, H = spec.slideSize.height;
  const canvas = document.createElement('div');
  canvas.className = 'slide-canvas';
  Object.assign(canvas.style, {width:px(W), height:px(H), background:hex(slide.background) ?? '#F7F7F7'});
  const shapes = new Map(slide.elements.filter(e => e.type === 'shape').map(e => [e.name, e.position]));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.innerHTML = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#A3B1B9"/></marker></defs>';
  const edge = (p, side) => ({left:[p.left, p.top + p.height / 2], right:[p.left + p.width, p.top + p.height / 2], top:[p.left + p.width / 2, p.top], bottom:[p.left + p.width / 2, p.top + p.height]})[side];
  for (const e of slide.elements.filter(e => e.type === 'connector')) {
    const [x1, y1] = edge(shapes.get(e.from), e.fromSide), [x2, y2] = edge(shapes.get(e.to), e.toSide);
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    Object.entries({x1, y1, x2, y2, stroke:hex(e.color) ?? '#36879A', 'stroke-width':e.width ?? 1.5}).forEach(([k, v]) => l.setAttribute(k, v));
    if (e.arrow) l.setAttribute('marker-end', 'url(#arrow)');
    svg.append(l);
  }
  if (state.template) {
    const roleBg = state.template.roles[slide.role]?.bgColor;
    if (roleBg && !state.template.roles[slide.role]?.bg?.xml.includes('<a:blip')) canvas.style.background = '#' + roleBg;
    for (const item of previewItems(state.template, slide.role)) {
      const b = item.box;
      if (item.kind === 'picture' && state.templateMedia.has(item.media)) {
        const img = document.createElement('img'); img.src = state.templateMedia.get(item.media); img.alt = '';
        Object.assign(img.style, {position:'absolute', left:px(b.left), top:px(b.top), width:px(b.width), height:px(b.height)});
        canvas.append(img);
      } else if (item.kind === 'line') {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        Object.entries({x1:b.left, y1:b.top, x2:b.left + b.width, y2:b.top + b.height, stroke:'#' + item.color, 'stroke-width':1}).forEach(([k, v]) => l.setAttribute(k, v));
        svg.append(l);
      } else if (item.kind === 'rect') {
        const d = document.createElement('div');
        Object.assign(d.style, {position:'absolute', left:px(b.left), top:px(b.top), width:px(b.width), height:px(b.height), background:'#' + item.color});
        canvas.append(d);
      }
    }
  }
  canvas.append(svg);
  for (const e of slide.elements) {
    if (e.type === 'shape') canvas.append(renderShape(e));
    else if (e.type === 'image') {
      const img = document.createElement('img'), p = e.position, src = resolveImage(e.path);
      if (!src) continue;
      img.src = src.data; img.alt = e.alt ?? '';
      Object.assign(img.style, {position:'absolute', left:px(p.left), top:px(p.top), width:px(p.width), height:px(p.height), objectFit:e.fit === 'cover' ? 'cover' : 'contain'});
      canvas.append(img);
    } else if (e.type === 'table') {
      const t = document.createElement('table'), p = e.position;
      Object.assign(t.style, {left:px(p.left), top:px(p.top), width:px(p.width), fontSize:px(e.fontSize)});
      const cg = document.createElement('colgroup');
      (e.columnWidths ?? e.values[0].map(() => p.width / e.values[0].length)).forEach(w => { const c = document.createElement('col'); c.style.width = px(w); cg.append(c); });
      t.append(cg);
      e.values.forEach((row, r) => {
        const tr = document.createElement('tr');
        if (e.rowHeights) tr.style.height = px(e.rowHeights[r]);
        row.forEach((v, c) => {
          const td = document.createElement('td');
          td.textContent = v;
          Object.assign(td.style, {background:r === 0 ? hex(e.headerFill) ?? '#385F8E' : (r % 2 ? hex(e.bandFill) ?? '#EFF5F7' : '#FFFFFF'),
            color:r === 0 ? '#FFFFFF' : hex(e.color) ?? '#263747', fontWeight:r === 0 || (e.boldFirstColumn && c === 0) ? '700' : '400', textAlign:r === 0 ? 'center' : 'left'});
          tr.append(td);
        });
        t.append(tr);
      });
      canvas.append(t);
    }
  }
  return canvas;
}
function fit() {
  document.querySelectorAll('.slide-frame').forEach(f => {
    const c = f.firstElementChild, W = Number(c.dataset.w), H = Number(c.dataset.h);
    const s = f.clientWidth / W;
    c.style.transform = `scale(${s})`;
    f.style.height = px(H * s);
  });
}
addEventListener('resize', fit);

// ---------- build ----------
function resolver() {
  return name => state.images.get(name);
}
function refresh() {
  if ($('outline').value.trim()) build(false);
}
function build(scroll = true) {
  let outline;
  try { outline = extractJson($('outline').value); }
  catch (err) { status('parse-status', 'err', err.message); $('result').hidden = true; $('download-bar').classList.remove('show'); return; }
  if (state.templateTheme) outline.theme = {...state.templateTheme, ...(outline.theme ?? {})};
  const resolve = resolver();
  let result;
  try { result = layoutOutline(outline, {images:[...state.images.keys()]}); }
  catch (err) { status('parse-status', 'err', escapeHtml(err.message)); $('result').hidden = true; $('download-bar').classList.remove('show'); return; }
  for (const slide of result.spec.slides) slide.elements = slide.elements.filter(e => e.type !== 'image' || resolve(e.path));
  state.result = result; state.title = result.summary.title;
  const {summary, issues, spec} = result;
  status('parse-status', summary.errors ? 'warn' : 'ok', `已识别 ${summary.slides} 页${summary.errors ? `，有 ${summary.errors} 处版面问题建议修改` : '，版面检查通过'}。`);
  const layoutText = Object.entries(summary.layouts).map(([k, v]) => `${LAYOUT_NAMES[k] ?? k} ${v}`).join(' · ');
  $('summary').innerHTML = `<div class="hint" style="margin:0">${escapeHtml(summary.title || '未命名课件')}：${escapeHtml(layoutText)}${summary.revealSlides ? ` · ${summary.revealSlides} 页含点击动画` : ''}</div>`;
  $('issues').innerHTML = issues.map(i => `<li class="${i.level}">${i.slide ? `第 ${i.slide} 页：` : ''}${escapeHtml(i.message)}</li>`).join('');
  const deck = $('deck'); deck.innerHTML = '';
  spec.slides.forEach((slide, i) => {
    const card = document.createElement('article');
    const own = issues.filter(x => x.slide === i + 1);
    card.className = 'slide-card' + (own.some(x => x.level === 'error') ? ' has-error' : '');
    const frame = document.createElement('div'); frame.className = 'slide-frame';
    const canvas = renderSlide(slide, spec, resolve);
    canvas.dataset.w = spec.slideSize.width; canvas.dataset.h = spec.slideSize.height;
    frame.append(canvas); card.append(frame);
    const layout = outline.slides[i].layout;
    card.insertAdjacentHTML('beforeend', `<div class="slide-meta"><span>第 ${i + 1} 页</span><span class="tag">${escapeHtml(LAYOUT_NAMES[layout] ?? layout)}${slide.reveal ? ' · 点击动画' : ''}</span></div>` +
      (own.length ? `<div class="slide-issues">${own.map(x => `<div class="${x.level}">${escapeHtml(x.message)}</div>`).join('')}</div>` : '') +
      `<details class="slide-notes"><summary>授课备注</summary><div>${escapeHtml(slide.notes).replace(/\n/g, '<br>')}</div></details>`);
    deck.append(card);
  });
  $('result').hidden = false;
  $('download-bar').classList.add('show');
  $('download-summary').textContent = `${summary.slides} 页 · 可编辑文字与图形 · 含授课备注`;
  requestAnimationFrame(fit);
  if (scroll) $('result').scrollIntoView({behavior:'smooth', block:'start'});
}
$('preview').addEventListener('click', () => build(true));
let timer;
$('outline').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => build(false), 700); });
$('load-sample').addEventListener('click', async () => {
  try {
    const r = await fetch('../demo/outline.json');
    $('outline').value = await r.text();
    build(true);
  } catch { status('parse-status', 'err', '示例加载失败，请通过网址访问本页。'); }
});

// ---------- download ----------
$('download').addEventListener('click', async () => {
  if (!state.result) return;
  const button = $('download'); button.disabled = true; button.textContent = '正在生成…';
  try {
    const deck = renderDeck(state.result.spec, window.PptxGenJS, {resolveImage:resolver(), title:state.title || '课件'});
    const zip = await JSZip.loadAsync(await deck.write({outputType:'arraybuffer'}));
    await finalizePackage(zip, {template:state.template, roles:state.result.spec.slides.map(s => s.role)});
    const blob = await zip.generateAsync({type:'blob', compression:'DEFLATE', mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(state.title || '课件').replace(/[\\/:*?"<>|]+/g, ' ').trim() || '课件'}.pptx`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  } catch (err) {
    alert('生成失败：' + err.message);
  } finally { button.disabled = false; button.textContent = '下载 PPTX'; }
});

loadPrompt('zh');
