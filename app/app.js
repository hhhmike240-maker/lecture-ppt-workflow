// Browser front end: outline JSON -> preview -> editable PPTX. Everything runs locally.
import {layoutOutline, layoutNames} from '../lecture-ppt-workflow/scripts/lib/outline.mjs';
import {renderDeck} from '../lecture-ppt-workflow/scripts/lib/pptx_core.mjs';
import {finalizePackage} from '../lecture-ppt-workflow/scripts/lib/finalize.mjs';
import {extractTemplate, previewItems} from '../lecture-ppt-workflow/scripts/lib/template.mjs';

const $ = id => document.getElementById(id);
const state = {ui:'zh', lang:'zh', prompts:{}, images:new Map(), templateFile:null, templateTheme:null, template:null, templateMedia:new Map(), result:null, title:''};

// ---------- interface language ----------
const REPO = 'https://github.com/hhhmike240-maker/lecture-ppt-workflow';
const STRINGS = {
  zh: {
    title:'教学课件工作流 · 讲义变可编辑 PPT',
    description:'把讲义交给任意 AI，粘贴结果即可下载带授课备注、点击动画的可编辑 PPT。免安装，文件不上传。',
    switchTo:'English', h1:'教学课件工作流',
    intro:'把讲义交给你常用的 AI，粘贴它的回答，就能下载<strong>可编辑</strong>的教学 PPT：版式自动排好，每页带<strong>授课备注</strong>，案例分析和提问答案带<strong>点击出现</strong>动画。可以套用你自己课件的字体、配色和背景。',
    badge1:'免安装、免注册', badge2:'文件只在你的浏览器里处理，不上传', badge3:'支持 DeepSeek / Kimi / 豆包 / 通义 / ChatGPT / Claude',
    s1:'复制提示词，连同讲义发给 AI',
    s1hint:'提示词里写好了版式说明和“老师审过的规则”：内容以讲义为准、关键知识上屏、解释写进备注、装不下就拆页、不乱编案例。',
    promptLang:'提示词语言', promptZh:'中文提示词', promptEn:'英文提示词', copy:'复制提示词', showPrompt:'查看提示词内容', loading:'加载中…',
    s2:'把 AI 的回答粘贴到这里', s2hint:'整段粘贴即可，前后多余的文字和 ```json 标记会自动去掉。想先看看效果？点“加载示例”。',
    outlineLabel:'课件大纲 JSON', preview:'生成预览', sample:'加载示例（第三章 工作分析）',
    s3:'可选：套用你自己的课件风格、放入讲义原图', templateLabel:'参考课件（.pptx）', templateHint:'读取字体、主色和背景图片。母版里的形状装饰不会复制。',
    imagesLabel:'讲义原图（PNG/JPG，可多选）', imagesHint:'文件名与大纲中 figure 页的 image 字段一致时自动放入；没有原图的页面会留出“请插入原图”占位框。',
    s4:'检查预览，下载 PPT', s4hint:'预览是近似效果，以 PowerPoint/WPS 中打开为准。请逐页核对内容是否准确；红色问题建议先回到 AI 修改（例如“第 5 页内容太多，拆成两页”）。',
    download:'下载 PPTX',
    footer:`开源项目 <a href="${REPO}">lecture-ppt-workflow</a>（MIT 许可）。生成引擎为 <a href="https://github.com/gitbrent/PptxGenJS">PptxGenJS</a>。AI 生成的内容需要老师审核后再用于教学。本页用 <a href="https://www.goatcounter.com">GoatCounter</a> 匿名统计访问和下载次数，不用 cookie，不读取你的讲义和课件。<a href="${REPO}/issues/new/choose">反馈问题或建议</a>`,
    promptFailed:'提示词加载失败。请通过网址访问本页（不要直接双击打开文件），或到 GitHub 仓库的 prompts 目录复制。',
    copied:'已复制。打开你常用的 AI，粘贴提示词，在末尾填上课程信息并附上讲义（文字或文件）。',
    copyManual:'浏览器不允许自动复制，已为你选中提示词，请按 Ctrl+C（Mac 为 ⌘+C）。',
    near:(line, col, code) => `第 ${line} 行第 ${col} 个字符附近：${code}`,
    noJson:'没有找到 JSON 内容。请确认粘贴的是 AI 按提示词输出的代码块。',
    badJson:where => `JSON 格式有误${where ? '，' + where : ''}。可以把这条报错发给 AI，请它“只输出修正后的完整 JSON”。`,
    badImage:'图片无法读取', imagesLoaded:(n, names) => `已载入 ${n} 张：${names.join('，')}`,
    recognized:(n, errors) => `已识别 ${n} 页${errors ? `，有 ${errors} 处版面问题建议修改` : '，版面检查通过'}。`,
    untitled:'未命名课件', listSep:'：', revealSlides:n => ` · ${n} 页含点击动画`,
    slideOf:n => `第 ${n} 页`, slideIssue:n => `第 ${n} 页：`, revealTag:' · 点击动画', notes:'授课备注',
    downloadSummary:n => `${n} 页 · 可编辑文字与图形 · 含授课备注`, sampleFailed:'示例加载失败，请通过网址访问本页。',
    generating:'正在生成…', failed:'生成失败：', fileName:'课件',
  },
  en: {
    title:'Lecture PPT Workflow · Lecture notes to editable slides',
    description:'Give your lecture notes to any AI chatbot, paste its answer, and download an editable teaching deck with speaker notes and click reveals. No install; files stay in your browser.',
    switchTo:'中文', h1:'Lecture PPT Workflow',
    intro:'Give your lecture notes to the AI chatbot you already use, paste its answer here, and download an <strong>editable</strong> teaching deck: layouts are computed for you, every slide has <strong>speaker notes</strong>, and case analyses and quiz answers <strong>appear on click</strong>. It can also reuse the fonts, colors and background of your own slides.',
    badge1:'No install, no sign-up', badge2:'Files stay in your browser; nothing is uploaded', badge3:'Works with ChatGPT, Claude, Gemini, Copilot, DeepSeek and more',
    s1:'Copy the prompt and send it to an AI with your notes',
    s1hint:'The prompt contains the layout guide and rules reviewed by a teacher: stay faithful to the notes, put key knowledge on screen and explanations in the notes, split slides instead of shrinking text, and do not invent cases.',
    promptLang:'Prompt language', promptZh:'Chinese prompt', promptEn:'English prompt', copy:'Copy prompt', showPrompt:'Show the prompt', loading:'Loading…',
    s2:'Paste the AI\'s answer here', s2hint:'Paste the whole answer; any text around it and ```json fences are removed automatically. Want to see it first? Click "Load sample".',
    outlineLabel:'Lecture outline JSON', preview:'Preview', sample:'Load sample (Chapter 3: Job Analysis)',
    s3:'Optional: reuse your own slide style and add original figures', templateLabel:'Reference deck (.pptx)',
    templateHint:'Reads the fonts, main colors and background images. Shape decorations in the slide master are not copied.',
    imagesLabel:'Original figures (PNG/JPG, several allowed)',
    imagesHint:'An image is placed automatically when its file name matches the image field of a figure slide; figure slides without one get an "insert the original figure" placeholder.',
    s4:'Check the preview and download the deck',
    s4hint:'The preview is approximate; PowerPoint or WPS is authoritative. Check every slide for accuracy, and fix red issues with the AI first (for example "Slide 5 has too much content; split it into two slides").',
    download:'Download PPTX',
    footer:`Open-source project <a href="${REPO}">lecture-ppt-workflow</a> (MIT license). Decks are generated with <a href="https://github.com/gitbrent/PptxGenJS">PptxGenJS</a>. AI-written content needs a teacher's review before class. Visits and downloads are counted anonymously with <a href="https://www.goatcounter.com">GoatCounter</a> (no cookies; your notes and slides are never read). <a href="${REPO}/issues/new/choose">Report a problem or suggest an idea</a>`,
    promptFailed:'The prompt could not be loaded. Open this page through its web address (not by double-clicking the file), or copy the prompt from the prompts folder of the GitHub repository.',
    copied:'Copied. Open your AI chatbot, paste the prompt, fill in your course details at the end and attach or paste your lecture notes.',
    copyManual:'Your browser blocked automatic copying, so the prompt is selected. Press Ctrl+C (⌘+C on a Mac).',
    near:(line, col, code) => `near line ${line}, character ${col}: ${code}`,
    noJson:'No JSON found. Make sure you pasted the code block the AI produced from the prompt.',
    badJson:where => `The JSON is not valid${where ? ', ' + where : ''}. You can send this message to the AI and ask it to "output only the corrected, complete JSON".`,
    badImage:'The image could not be read', imagesLoaded:(n, names) => `Loaded ${n}: ${names.join(', ')}`,
    recognized:(n, errors) => `Found ${n} slides${errors ? `; ${errors} layout issue${errors > 1 ? 's' : ''} should be fixed` : '; the layout check passed'}.`,
    untitled:'Untitled deck', listSep:': ', revealSlides:n => ` · ${n} slide${n > 1 ? 's' : ''} with click reveals`,
    slideOf:n => `Slide ${n}`, slideIssue:n => `Slide ${n}: `, revealTag:' · click reveal', notes:'Speaker notes',
    downloadSummary:n => `${n} slides · editable text and shapes · speaker notes`, sampleFailed:'The sample could not be loaded. Open this page through its web address.',
    generating:'Generating…', failed:'Generation failed: ', fileName:'lecture',
  },
};
const t = () => STRINGS[state.ui];
// Anonymous usage counts (GoatCounter: no cookies, no content). Skipped on localhost and when blocked.
const track = name => { try { window.goatcounter?.count?.({path:name, event:true}); } catch { /* ignore */ } };
const storage = {
  get() { try { return localStorage.getItem('lecture-ppt-ui'); } catch { return null; } },
  set(v) { try { localStorage.setItem('lecture-ppt-ui', v); } catch { /* private mode */ } },
};
function initialLanguage() {
  const asked = new URLSearchParams(location.search).get('lang');
  if (asked === 'en' || asked === 'zh') return asked;
  const saved = storage.get();
  if (saved === 'en' || saved === 'zh') return saved;
  return (navigator.languages ?? [navigator.language]).some(l => /^zh/i.test(l)) ? 'zh' : 'en';
}
function setLanguage(lang, {remember = false} = {}) {
  state.ui = lang;
  const s = t();
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  document.title = s.title;
  document.querySelector('meta[name=description]').content = s.description;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = s[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', s[el.dataset.i18nAria]));
  const toggle = $('ui-lang');
  toggle.textContent = s.switchTo;
  toggle.lang = lang === 'en' ? 'zh-CN' : 'en';
  if (remember) {
    storage.set(lang);
    const url = new URL(location.href); url.searchParams.set('lang', lang); history.replaceState(null, '', url);
  }
  loadPrompt(lang);
  if (state.templateFile) readTemplate(state.templateFile);
  else refresh();
}

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
    $('prompt-text').textContent = t().loading;
    try {
      const r = await fetch(`../prompts/prompt.${lang}.md`);
      if (!r.ok) throw Error(r.status);
      state.prompts[lang] = await r.text();
    } catch {
      state.prompts[lang] = '';
      $('prompt-text').textContent = t().promptFailed;
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
    status('prompt-status', 'ok', t().copied);
    track(`copy-prompt-${state.lang}`);
  } catch {
    $('prompt-text').closest('details').open = true;
    const range = document.createRange(); range.selectNodeContents($('prompt-text'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    status('prompt-status', 'warn', t().copyManual);
  }
});

// ---------- step 2: parse ----------
function locate(text, pos) {
  const before = text.slice(0, pos), line = before.split('\n').length, col = pos - before.lastIndexOf('\n');
  return t().near(line, col, `<code>${escapeHtml(text.slice(Math.max(0, pos - 20), pos + 20))}</code>`);
}
export function extractJson(raw) {
  let text = String(raw).replace(/^﻿/, '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1].includes('{')) text = fenced[1];
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw Error(t().noJson);
  text = text.slice(a, b + 1);
  try { return JSON.parse(text); }
  catch (first) {
    // Common AI slips: trailing commas and full-width punctuation used as JSON syntax.
    const repaired = text.replace(/,\s*([}\]])/g, '$1').replace(/([{,]\s*)“([^”"]+)”(\s*:)/g, '$1"$2"$3');
    try { return JSON.parse(repaired); }
    catch {
      const m = String(first.message).match(/position (\d+)/);
      throw Error(t().badJson(m ? locate(text, Number(m[1])) : ''));
    }
  }
}

// ---------- step 3: template and images ----------
const readDataUrl = file => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(file); });
const dimensions = src => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok({width:i.naturalWidth, height:i.naturalHeight}); i.onerror = () => bad(Error(t().badImage)); i.src = src; });
async function imageEntry(dataUrl) { return {data:dataUrl, ...(await dimensions(dataUrl))}; }
const bytesToDataUrl = (bytes, ext) => new Promise(ok => {
  const r = new FileReader(); r.onload = () => ok(r.result);
  r.readAsDataURL(new Blob([bytes], {type:{png:'image/png', gif:'image/gif'}[ext] ?? 'image/jpeg'}));
});

async function readTemplate(file) {
  state.templateFile = file;
  state.templateTheme = null; state.template = null; state.templateMedia.clear();
  $('template-info').textContent = '';
  if (!file) return refresh();
  try {
    const t = await extractTemplate(await JSZip.loadAsync(await file.arrayBuffer()), {lang:state.ui});
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
}
$('template').addEventListener('change', e => readTemplate(e.target.files[0] ?? null));
$('images').addEventListener('change', async e => {
  state.images.clear();
  for (const file of e.target.files) {
    try { state.images.set(file.name, await imageEntry(await readDataUrl(file))); } catch { /* skipped */ }
  }
  $('image-info').textContent = state.images.size ? t().imagesLoaded(state.images.size, [...state.images.keys()]) : '';
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
  Object.assign(canvas.style, {width:px(W), height:px(H), background:hex(slide.background) ?? '#F7F7F7',
    fontFamily:`"${spec.font}","Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif`});
  canvas.lang = spec.lang;
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
  try { result = layoutOutline(outline, {images:[...state.images.keys()], lang:state.ui}); }
  catch (err) { status('parse-status', 'err', escapeHtml(err.message)); $('result').hidden = true; $('download-bar').classList.remove('show'); return; }
  for (const slide of result.spec.slides) slide.elements = slide.elements.filter(e => e.type !== 'image' || resolve(e.path));
  state.result = result; state.title = result.summary.title;
  const {summary, issues, spec} = result, s = t(), names = layoutNames(state.ui);
  status('parse-status', summary.errors ? 'warn' : 'ok', s.recognized(summary.slides, summary.errors));
  const layoutText = Object.entries(summary.layouts).map(([k, v]) => `${names[k] ?? k} ${v}`).join(' · ');
  $('summary').innerHTML = `<div class="hint" style="margin:0">${escapeHtml(summary.title || s.untitled)}${s.listSep}${escapeHtml(layoutText)}${summary.revealSlides ? s.revealSlides(summary.revealSlides) : ''}</div>`;
  $('issues').innerHTML = issues.map(i => `<li class="${i.level}">${i.slide ? s.slideIssue(i.slide) : ''}${escapeHtml(i.message)}</li>`).join('');
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
    card.insertAdjacentHTML('beforeend', `<div class="slide-meta"><span>${s.slideOf(i + 1)}</span><span class="tag">${escapeHtml(names[layout] ?? layout)}${slide.reveal ? s.revealTag : ''}</span></div>` +
      (own.length ? `<div class="slide-issues">${own.map(x => `<div class="${x.level}">${escapeHtml(x.message)}</div>`).join('')}</div>` : '') +
      `<details class="slide-notes"><summary>${s.notes}</summary><div>${escapeHtml(slide.notes).replace(/\n/g, '<br>')}</div></details>`);
    deck.append(card);
  });
  $('result').hidden = false;
  $('download-bar').classList.add('show');
  $('download-summary').textContent = s.downloadSummary(summary.slides);
  requestAnimationFrame(fit);
  if (scroll) $('result').scrollIntoView({behavior:'smooth', block:'start'});
}
$('preview').addEventListener('click', () => build(true));
let timer;
$('outline').addEventListener('input', () => { state.sample = false; clearTimeout(timer); timer = setTimeout(() => build(false), 700); });
$('load-sample').addEventListener('click', async () => {
  try {
    const r = await fetch(state.ui === 'en' ? '../demo/en/outline.json' : '../demo/outline.json');
    if (!r.ok) throw Error(r.status);
    $('outline').value = await r.text();
    state.sample = true;
    build(true);
    track('load-sample');
  } catch { status('parse-status', 'err', t().sampleFailed); }
});

// ---------- download ----------
$('download').addEventListener('click', async () => {
  if (!state.result) return;
  const button = $('download'), s = t(); button.disabled = true; button.textContent = s.generating;
  try {
    const deck = renderDeck(state.result.spec, window.PptxGenJS, {resolveImage:resolver(), title:state.title || s.fileName});
    const zip = await JSZip.loadAsync(await deck.write({outputType:'arraybuffer'}));
    await finalizePackage(zip, {template:state.template, roles:state.result.spec.slides.map(s => s.role)});
    const blob = await zip.generateAsync({type:'blob', compression:'DEFLATE', mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(state.title || s.fileName).replace(/[\\/:*?"<>|]+/g, ' ').trim() || s.fileName}.pptx`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    track(state.sample ? 'download-sample' : state.template ? 'download-with-template' : 'download');
  } catch (err) {
    alert(s.failed + err.message);
  } finally { button.disabled = false; button.textContent = s.download; }
});

$('ui-lang').addEventListener('click', () => setLanguage(state.ui === 'en' ? 'zh' : 'en', {remember:true}));
setLanguage(initialLanguage());
