// Reuse a teacher's reference PPTX (JSZip instance) as the visual frame of generated slides.
// Environment-neutral. Reads slide size, fonts, colors, backgrounds and decoration shapes
// (logos, rules, ornaments: non-placeholder shapes without text) from the master, layout
// and slide of three roles: cover (first slide), content (second slide) and section (last slide).
// Generated text is placed around the decorations; nothing in the reference file is modified.

export const OUT_CY = 5143500;            // generated decks are 540 px high: 540 x 9525 EMU
const EMU_PX = 9525;
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];
const readText = async (zip, name) => zip.file(name) ? zip.file(name).async('string') : null;

function resolvePart(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop(); else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}
const relsPath = part => part.replace(/([^/]+)$/, '_rels/$1.rels');
async function rels(zip, part) {
  const xml = await readText(zip, relsPath(part));
  const map = new Map();
  if (!xml) return map;
  for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], 'Id'), target = attr(m[0], 'Target'), mode = attr(m[0], 'TargetMode'), type = attr(m[0], 'Type') ?? '';
    if (id && target) map.set(id, {part:mode === 'External' ? null : resolvePart(part, target), type, external:mode === 'External'});
  }
  return map;
}

// ---------- colors ----------
const SCHEME_ALIAS = {tx1:'dk1', bg1:'lt1', tx2:'dk2', bg2:'lt2'};
function schemeColors(themeXml) {
  const out = {};
  for (const key of ['dk1','lt1','dk2','lt2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink']) {
    const m = themeXml.match(new RegExp(`<a:${key}>([\\s\\S]*?)</a:${key}>`));
    if (!m) continue;
    const hex = (attr(m[1].match(/<a:sysClr\b[^>]*>/)?.[0] ?? '', 'lastClr') ?? attr(m[1].match(/<a:srgbClr\b[^>]*>/)?.[0] ?? '', 'val') ?? '').toUpperCase();
    if (/^[0-9A-F]{6}$/.test(hex)) out[key] = hex;
  }
  return out;
}
function toHsl(hex) {
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl([h, s, l]) {
  const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [0, 8, 4].map(n => Math.round(f(n) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
/** Resolve the first color in a fill fragment to RGB hex, applying lumMod/lumOff. */
function fragmentColor(xml, scheme) {
  const m = xml?.match(/<a:(srgbClr|schemeClr|sysClr)\b([^>]*?)(\/>|>([\s\S]*?)<\/a:\1>)/);
  if (!m) return null;
  let hex = m[1] === 'schemeClr' ? scheme[SCHEME_ALIAS[attr(m[2], 'val')] ?? attr(m[2], 'val')] : (attr(m[2], 'lastClr') ?? attr(m[2], 'val'));
  if (!hex) return null;
  hex = hex.toUpperCase();
  const mod = Number(attr(m[4]?.match(/<a:lumMod\b[^>]*>/)?.[0] ?? '', 'val') ?? 100000) / 100000;
  const off = Number(attr(m[4]?.match(/<a:lumOff\b[^>]*>/)?.[0] ?? '', 'val') ?? 0) / 100000;
  if (mod !== 1 || off) { const hsl = toHsl(hex); hsl[2] = Math.max(0, Math.min(1, hsl[2] * mod + off)); hex = fromHsl(hsl); }
  return hex;
}
/** Replace theme color references with literal RGB so copied shapes keep their look in another theme. */
function literalColors(xml, scheme) {
  return xml.replace(/<a:schemeClr val="(\w+)"(\s*\/?)>/g, (all, v, close) => {
    const hex = scheme[SCHEME_ALIAS[v] ?? v];
    return hex ? `<a:srgbClr val="${hex}"${close}>` : all;
  }).replace(/<\/a:schemeClr>/g, '</a:srgbClr>')
    // Any unresolved phClr-style references are left as schemeClr; keep their closing tags balanced.
    .replace(/<a:schemeClr val="(\w+)">([\s\S]*?)<\/a:srgbClr>/g, '<a:schemeClr val="$1">$2</a:schemeClr>');
}
const luminance = hex => { const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); return .299 * r + .587 * g + .114 * b; };
const saturated = hex => { const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; return mx - mn > 45 && l > 25 && l < 215; };

// ---------- shapes ----------
/** Top-level children of p:spTree as XML strings. */
export function topLevelShapes(xml) {
  const tree = xml.indexOf('<p:spTree>');
  if (tree < 0) return [];
  const startAt = xml.indexOf('</p:grpSpPr>', tree);
  const re = /<(\/?)p:(sp|pic|grpSp|cxnSp|graphicFrame|contentPart)\b[^>]*?(\/?)>/g;
  re.lastIndex = startAt;
  const out = []; let depth = 0, start = -1, m;
  while ((m = re.exec(xml))) {
    if (m[3]) { if (depth === 0) out.push(m[0]); continue; }
    if (!m[1]) { if (depth === 0) start = m.index; depth++; }
    else if (--depth === 0) out.push(xml.slice(start, re.lastIndex));
    if (depth < 0) break;
  }
  return out;
}
const hasText = s => [...s.matchAll(/<a:t>([^<]*)<\/a:t>/g)].some(t => t[1].trim());
const isDecoration = s => !/<p:ph\b/.test(s) && !hasText(s) && !/^<p:(graphicFrame|contentPart)/.test(s) && !/<p:(oleObj|video|audio)/.test(s);
function boxOf(s) {
  const m = s.match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/);
  return m ? m.slice(1).map(Number) : null;
}

async function bgOf(zip, part) {
  const xml = await readText(zip, part);
  const bg = xml?.match(/<p:bg>[\s\S]*?<\/p:bg>/)?.[0];
  return bg ? {xml:bg, part} : null;
}

async function roleFrom(zip, slidePart, scheme, scale) {
  const slideXml = await readText(zip, slidePart) ?? '';
  const slideRels = await rels(zip, slidePart);
  const layout = [...slideRels.values()].find(x => x.type.endsWith('/slideLayout'))?.part;
  const layoutXml = layout ? await readText(zip, layout) : '';
  const master = layout ? [...(await rels(zip, layout)).values()].find(x => x.type.endsWith('/slideMaster'))?.part : null;
  const hideMaster = /<p:sld\b[^>]*showMasterSp="0"/.test(slideXml) || /<p:sldLayout\b[^>]*showMasterSp="0"/.test(layoutXml ?? '');
  const hideLayout = /<p:sld\b[^>]*showMasterSp="0"/.test(slideXml);
  const chain = [...(master && !hideMaster ? [master] : []), ...(layout && !hideLayout ? [layout] : []), slidePart];
  const decor = [], boxes = [];
  let skippedText = 0;
  for (const part of chain) {
    const xml = part === slidePart ? slideXml : await readText(zip, part);
    for (const s of topLevelShapes(xml ?? '')) {
      if (!isDecoration(s)) { if (!/<p:ph\b/.test(s) && hasText(s)) skippedText++; continue; }
      const b = boxOf(s);
      const spPr = s.match(/<p:spPr>[\s\S]*?<\/p:spPr>/)?.[0];
      const box = b ? {left:b[0] * scale / EMU_PX, top:b[1] * scale / EMU_PX, width:b[2] * scale / EMU_PX, height:b[3] * scale / EMU_PX,
        kind:s.startsWith('<p:pic') ? 'picture' : (s.startsWith('<p:cxnSp') || b[3] === 0 || b[2] === 0 ? 'line' : 'shape'),
        fill:fragmentColor(spPr?.match(/<a:solidFill>[\s\S]*?<\/a:solidFill>/)?.[0], scheme),
        line:fragmentColor(spPr?.match(/<a:ln\b[\s\S]*?<\/a:ln>/)?.[0], scheme),
        rect:/<a:prstGeom prst="rect"/.test(spPr ?? ''), embed:attr(s.match(/<a:blip\b[^>]*>/)?.[0] ?? '', 'r:embed')} : null;
      decor.push({xml:literalColors(s, scheme), part, box});
      if (box) boxes.push(box);
    }
  }
  let bg = null;
  for (const part of [slidePart, layout, master].filter(Boolean)) { bg = await bgOf(zip, part); if (bg) break; }
  const bgColor = bg ? fragmentColor(bg.xml.match(/<a:solidFill>[\s\S]*?<\/a:solidFill>/)?.[0], scheme) : null;
  const bgPicture = bg && /<a:blip\b/.test(bg.xml);
  return {part:slidePart, decor, boxes, bg:bg ? {xml:literalColors(bg.xml, scheme), part:bg.part} : null, bgColor, bgPicture, skippedText};
}

/** Where generated text may go, given decoration boxes of the content role (px). */
function contentFrame(boxes, W, H) {
  const frame = {};
  const rule = boxes.filter(b => b.kind === 'line' && b.width > W * .5 && b.top > 20 && b.top < H * .3).sort((a, b) => a.top - b.top)[0];
  if (rule) { frame.ruleY = Math.round(rule.top); frame.ownRule = false; }
  const band = frame.ruleY ?? 72;
  // Decorations in the title band shorten the heading; small overlaps (<6 px) are ignored.
  const right = boxes.filter(b => b.kind !== 'line' && b.top < band - 6 && b.top + b.height > band - 46 && b.left > W * .4).map(b => b.left - 8);
  if (right.length) frame.headingRight = Math.round(Math.min(...right));
  // Decorations reaching into the lower content area raise the content bottom.
  const overlapX = b => Math.min(b.left + b.width, W - 48) - Math.max(b.left, 48);
  const low = boxes.filter(b => b.kind !== 'line' && b.top > H * .6 && b.top < 474 && b.width * b.height < W * H * .25 && overlapX(b) >= 48);
  if (low.length) frame.bottom = Math.round(Math.max(H * .7, Math.min(...low.map(b => b.top - 10))));
  const foot = boxes.filter(b => b.kind !== 'line' && b.top + b.height > 482 && b.left > W * .6);
  if (foot.length) frame.footerRight = Math.round(Math.min(...foot.map(b => b.left)) - 8);
  return frame;
}

/** Wide, text-free filled rectangle on the cover, used as the title band if present. */
function coverTitleBox(boxes, W, H) {
  const c = boxes.filter(b => b.kind === 'shape' && b.fill && b.width > W * .4 && b.height >= 40 && b.height <= 140 && b.top > H * .2 && b.top < H * .7)
    .sort((a, b) => b.width * b.height - a.width * a.height)[0];
  return c ? {left:c.left, top:c.top, width:c.width, height:c.height, color:luminance(c.fill) < 140 ? '#FFFFFF' : null} : null;
}

const REPORT = {
  zh: {invalid:'这不是有效的 PPTX 文件（缺少 ppt/presentation.xml）', empty:'参考 PPT 中没有幻灯片',
    style:(ratio, font, latin, primary, accent) => `页面比例 ${ratio ?? '其他'}，字体 ${font}${latin !== font ? `（西文 ${latin}）` : ''}，主色 #${primary}，强调色 #${accent}`,
    reused:(content, cover) => `已复用 ${content} 个内容页装饰、${cover} 个封面装饰（标志、线条、图形）`,
    none:'参考 PPT 中没有可复用的装饰形状，仅套用字体和配色', rule:'识别到标题横线，标题将放在横线上方',
    skipped:n => `${n} 个带文字的形状没有复制（避免把示例文字带进新课件）`, check:'占位符样式和继承字号不复制；请预览检查标题、正文是否与装饰重叠'},
  en: {invalid:'This is not a valid PPTX file (ppt/presentation.xml is missing)', empty:'The reference deck has no slides',
    style:(ratio, font, latin, primary, accent) => `Aspect ratio ${ratio ?? 'other'}, font ${font}${latin !== font ? ` (Latin text: ${latin})` : ''}, primary #${primary}, accent #${accent}`,
    reused:(content, cover) => `Reused ${content} content-slide and ${cover} cover decorations (logos, lines, shapes)`,
    none:'The reference deck has no reusable decorations; only its fonts and colors are applied', rule:'Found a title rule; headings are placed above it',
    skipped:n => `${n} shapes with text were not copied (so sample text does not end up in the new deck)`,
    check:'Placeholder styles and inherited font sizes are not copied; check the preview for headings or text overlapping decorations'},
};

/** Returns {theme, images, template, report}. `template` is passed to finalizePackage. options.lang: report language ('zh' or 'en'). */
export async function extractTemplate(zip, {lang = 'zh'} = {}) {
  const report = [], t = REPORT[lang === 'en' ? 'en' : 'zh'];
  const pres = await readText(zip, 'ppt/presentation.xml');
  if (!pres) throw Error(t.invalid);
  const size = pres.match(/<p:sldSz\b[^>]*>/)?.[0];
  const cx = Number(attr(size ?? '', 'cx')) || 12192000, cy = Number(attr(size ?? '', 'cy')) || 6858000;
  const width = Math.round(540 * cx / cy), H = 540, scale = OUT_CY / cy;
  const presRels = await rels(zip, 'ppt/presentation.xml');
  const slideParts = [...pres.matchAll(/<p:sldId\b[^>]*>/g)].map(m => presRels.get(attr(m[0], 'r:id'))?.part).filter(Boolean);
  if (!slideParts.length) throw Error(t.empty);
  const themePart = Object.keys(zip.files).filter(n => /^ppt\/theme\/theme\d+\.xml$/.test(n)).sort()[0];
  const themeXml = themePart ? await readText(zip, themePart) : '';
  const scheme = schemeColors(themeXml);
  const minor = themeXml.match(/<a:minorFont>([\s\S]*?)<\/a:minorFont>/)?.[1] ?? '';
  const themeLatin = attr(minor.match(/<a:latin\b[^>]*>/)?.[0] ?? '', 'typeface');
  const themeFont = attr(minor.match(/<a:ea\b[^>]*>/)?.[0] ?? '', 'typeface') || themeLatin;

  const fonts = new Map(), latinFonts = new Map(), colors = new Map(), titleColors = new Map();
  for (const part of slideParts.slice(0, 12)) {
    const xml = await readText(zip, part) ?? '';
    for (const m of xml.matchAll(/<a:(ea|latin)\b[^>]*typeface="([^"+][^"]*)"/g)) {
      fonts.set(m[2], (fonts.get(m[2]) ?? 0) + 1);
      if (m[1] === 'latin') latinFonts.set(m[2], (latinFonts.get(m[2]) ?? 0) + 1);
    }
    for (const m of xml.matchAll(/<a:rPr\b([^>]*)>([\s\S]*?)<\/a:rPr>/g)) {
      const hex = fragmentColor(m[2].match(/<a:solidFill>[\s\S]*?<\/a:solidFill>/)?.[0], scheme);
      if (!hex) continue;
      colors.set(hex, (colors.get(hex) ?? 0) + 1);
      if (Number(attr(m[1], 'sz')) >= 2400) titleColors.set(hex, (titleColors.get(hex) ?? 0) + 1);
    }
  }
  const ranked = map => [...map.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const font = ranked(fonts)[0] || themeFont || 'Microsoft YaHei';
  const latinFont = ranked(latinFonts)[0] || themeLatin || font;   // used for English decks

  const roles = {
    cover:await roleFrom(zip, slideParts[0], scheme, scale),
    content:await roleFrom(zip, slideParts[Math.min(1, slideParts.length - 1)], scheme, scale),
  };
  roles.section = slideParts.length >= 3 ? await roleFrom(zip, slideParts[slideParts.length - 1], scheme, scale) : roles.cover;
  const decoColors = roles.content.boxes.map(b => b.fill).filter(c => c && saturated(c));
  // Headings and white-on-color table headers need contrast: primary must be dark, accent mid-dark.
  const sat = [...ranked(titleColors), ...ranked(colors), ...decoColors, scheme.dk2, scheme.accent1, scheme.accent2, scheme.accent5].filter(c => c && saturated(c));
  const darken = (hex, target) => { const hsl = toHsl(hex); hsl[2] = Math.min(hsl[2], target); return fromHsl(hsl); };
  const primary = sat.find(c => luminance(c) < 120) || (sat[0] ? darken(sat[0], .32) : '2F5D7C');
  const accent = sat.find(c => c !== primary && luminance(c) < 165 && Math.abs(luminance(c) - luminance(primary)) > 12)
    || (sat.find(c => c !== primary) ? darken(sat.find(c => c !== primary), .42) : '167A85');
  const text = ranked(colors).find(c => luminance(c) < 90 && !saturated(c)) || (scheme.dk1 && luminance(scheme.dk1) < 90 ? scheme.dk1 : '243746');

  // Media used by copied decorations and backgrounds, keyed by source part.
  const media = {};
  for (const role of new Set(Object.values(roles))) {
    for (const item of [...role.decor, ...(role.bg ? [role.bg] : [])]) {
      const r = await rels(zip, item.part);
      item.rels = {};
      for (const id of new Set([...item.xml.matchAll(/\br:(?:embed|link|id)="([^"]+)"/g)].map(m => m[1]))) {
        const rel = r.get(id);
        if (!rel || rel.external || !rel.part || !zip.file(rel.part)) continue;
        item.rels[id] = {part:rel.part, type:rel.type};
        if (!media[rel.part]) media[rel.part] = await zip.file(rel.part).async('uint8array');
      }
    }
  }
  const frame = contentFrame(roles.content.boxes, width, H);
  const cover = coverTitleBox(roles.cover.boxes, width, H);
  if (cover) frame.coverTitle = cover;
  const sectionBg = roles.section.bgColor;
  frame.sectionDark = sectionBg ? luminance(sectionBg) < 140 : true;
  frame.coverDecorated = roles.cover.decor.length > 0;
  const bgHex = roles.content.bgColor;
  const theme = {font, latinFont, primary:'#' + primary, accent:'#' + accent, text:'#' + text, width,
    background:bgHex && !roles.content.bgPicture ? '#' + bgHex : '#F7F8FA', frame};
  const template = {scale, roles:{cover:pack(roles.cover), content:pack(roles.content), section:pack(roles.section)}, media};

  report.push(t.style(cx > cy * 1.5 ? '16:9' : (cx > cy * 1.2 ? '4:3' : null), font, latinFont, primary, accent));
  const n = roles.content.decor.length + roles.cover.decor.length;
  report.push(n ? t.reused(roles.content.decor.length, roles.cover.decor.length) : t.none);
  if (frame.ruleY) report.push(t.rule);
  const skipped = roles.content.skippedText + roles.cover.skippedText;
  if (skipped) report.push(t.skipped(skipped));
  report.push(t.check);
  return {theme, images:{}, template, report};
}
const pack = role => ({decor:role.decor, bg:role.bg, bgColor:role.bgColor, boxes:role.boxes});

/** Approximate preview items for one role: pictures (with media part), lines and plain filled rectangles. */
export function previewItems(template, role) {
  const r = template.roles[role];
  if (!r) return [];
  return r.decor.filter(d => d.box).map(d => {
    const b = d.box, media = b.embed ? d.rels?.[b.embed]?.part : null;
    if (b.kind === 'picture') return media && template.media[media] ? {kind:'picture', box:b, media} : null;
    if (b.kind === 'line') return {kind:'line', box:b, color:b.line ?? '888888'};
    if (b.rect && b.fill) return {kind:'rect', box:b, color:b.fill};
    return null;
  }).filter(Boolean);
}

// ---------- apply to a generated package ----------
const CONTENT_TYPES = {png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', bmp:'image/bmp', emf:'image/x-emf', wmf:'image/x-wmf', svg:'image/svg+xml', tif:'image/tiff', tiff:'image/tiff'};

function scaleTopLevel(xml, scale) {
  if (Math.abs(scale - 1) < 1e-6) return xml;
  // Only the first transform of a top-level shape is in slide coordinates; group children stay relative.
  return xml.replace(/<a:off x="(-?\d+)" y="(-?\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/, (_, x, y, w, h) =>
    `<a:off x="${Math.round(x * scale)}" y="${Math.round(y * scale)}"/><a:ext cx="${Math.round(w * scale)}" cy="${Math.round(h * scale)}"/>`);
}

/**
 * Inject template decorations/background into one generated slide.
 * ctx: {zip, template, mediaNames: Map(sourcePart -> new part), relCounter}
 */
export async function applyTemplateToSlide(zip, slidePart, role, template, ctx) {
  const r = template.roles[role];
  if (!r) return 0;
  let xml = await zip.file(slidePart).async('string');
  const relsPart = relsPath(slidePart);
  let relsXml = await readText(zip, relsPart) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const addRel = (sourcePart, type) => {
    if (!ctx.mediaNames.has(sourcePart)) {
      const ext = sourcePart.split('.').pop().toLowerCase();
      const name = `ppt/media/template-${ctx.mediaNames.size + 1}.${ext}`;
      zip.file(name, template.media[sourcePart]);
      ctx.mediaNames.set(sourcePart, name);
      ctx.extensions.add(ext);
    }
    const id = `rIdTpl${++ctx.relCounter}`;
    relsXml = relsXml.replace('</Relationships>', `<Relationship Id="${id}" Type="${type}" Target="../media/${ctx.mediaNames.get(sourcePart).split('/').pop()}"/></Relationships>`);
    return id;
  };
  const remap = item => {
    let s = item.xml.replace(/<a:hlinkClick\b[^>]*\/>|<a:hlinkClick\b[\s\S]*?<\/a:hlinkClick>/g, '');
    const local = {};
    // A picture whose image cannot be carried over is dropped rather than left broken.
    for (const m of s.matchAll(/\br:(embed|link)="([^"]+)"/g)) if (!template.media[item.rels?.[m[2]]?.part]) return null;
    s = s.replace(/\br:(embed|link|id)="([^"]+)"/g, (all, kind, id) => {
      const rel = item.rels?.[id];
      if (!rel || !template.media[rel.part]) return '';
      local[id] ??= addRel(rel.part, rel.type);
      return `r:${kind}="${local[id]}"`;
    });
    return s;
  };
  const shapes = r.decor.map(remap).filter(Boolean).map(x => scaleTopLevel(x, template.scale)).join('');
  xml = xml.replace(/(<p:spTree>[\s\S]*?<\/p:grpSpPr>)/, `$1${shapes}`);
  const bg = r.bg ? remap(r.bg) : null;
  if (bg) {
    xml = /<p:bg>[\s\S]*?<\/p:bg>/.test(xml) ? xml.replace(/<p:bg>[\s\S]*?<\/p:bg>/, bg) : xml.replace(/<p:cSld([^>]*)>/, `<p:cSld$1>${bg}`);
  }
  zip.file(slidePart, xml);
  zip.file(relsPart, relsXml);
  return r.decor.length;
}

export async function registerExtensions(zip, extensions) {
  let types = await zip.file('[Content_Types].xml').async('string');
  for (const ext of extensions) {
    if (new RegExp(`<Default Extension="${ext}"`, 'i').test(types) || !CONTENT_TYPES[ext]) continue;
    types = types.replace('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="${ext}" ContentType="${CONTENT_TYPES[ext]}"/>`);
  }
  zip.file('[Content_Types].xml', types);
}
