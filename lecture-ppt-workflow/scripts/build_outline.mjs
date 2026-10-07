// Lecture outline JSON -> editable PPTX with computed layouts, teaching notes and click reveals.
// Usage: node build_outline.mjs outline.json new-output-directory [--template reference.pptx] [--lang zh|en]
// --lang sets the language of issue messages (default: the deck language, from outline.language or its text).
// Writes lecture.pptx, report.json, spec.json and a copy of outline.json into a NEW directory. Never overwrites.
// Exit 0: no layout errors; 1: candidate written but layout errors need revision; 2: input error.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {layoutOutline, deckLanguage, messages} from './lib/outline.mjs';
import {renderDeck} from './lib/pptx_core.mjs';
import {finalizePackage} from './lib/finalize.mjs';
import {extractTemplate} from './lib/template.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');

async function dependencies() {
  try {
    return {PptxGenJS:(await import('pptxgenjs')).default, JSZip:(await import('jszip')).default, imageSize:(await import('image-size')).imageSize};
  } catch {
    throw Error('Missing generation dependencies. Run npm ci --ignore-scripts in the lecture-ppt-workflow directory.');
  }
}

export async function buildOutline(source, out, {template, allowOverflow = false, lang} = {}) {
  const input = path.resolve(source), destination = path.resolve(out);
  const raw = await fs.readFile(input);
  const outline = JSON.parse(raw.toString('utf8').replace(/^﻿/, ''));
  const {PptxGenJS, JSZip, imageSize} = await dependencies();
  lang ??= deckLanguage(outline);   // language of issue messages and the template report
  const images = new Map();       // name -> {data, width, height, sha256}
  const report = {input:path.basename(input), inputSha256:sha(raw), template:null};
  let reference = null;
  if (template) {
    const bytes = await fs.readFile(template);
    const t = await extractTemplate(await JSZip.loadAsync(bytes), {lang});
    outline.theme = {...t.theme, ...(outline.theme ?? {})};
    reference = t.template;
    report.template = {file:path.basename(template), sha256:sha(bytes), extracted:t.theme, notes:t.report};
  }
  const wanted = new Set([outline.theme?.backgroundImage, outline.theme?.coverImage,
    ...(outline.slides ?? []).map(s => s?.layout === 'figure' ? s.image : undefined)].filter(x => typeof x === 'string' && x));
  for (const name of wanted) {
    if (images.has(name)) continue;
    const file = path.resolve(path.dirname(input), name);
    try { images.set(name, await fs.readFile(file)); } catch { /* reported by layoutOutline */ }
  }
  const {spec, issues, summary} = layoutOutline(outline, {images:[...images.keys()], lang});
  const resolved = new Map();
  for (const [name, bytes] of images) {
    const buf = Buffer.from(bytes);
    const png = buf.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), jpg = buf[0] === 255 && buf[1] === 216;
    if (!png && !jpg) { issues.push({slide:0, level:'error', message:messages(lang).notImage(name)}); continue; }
    const dim = imageSize(buf);
    resolved.set(name, {data:`data:image/${png ? 'png' : 'jpeg'};base64,${buf.toString('base64')}`, width:dim.width, height:dim.height, sha256:sha(buf)});
  }
  // Missing images are dropped from the spec so a candidate can still be reviewed.
  for (const slide of spec.slides) slide.elements = slide.elements.filter(e => e.type !== 'image' || resolved.has(e.path));
  const deck = renderDeck(spec, PptxGenJS, {resolveImage:n => resolved.get(n), title:summary.title || 'Lecture'});
  const zip = await JSZip.loadAsync(await deck.write({outputType:'nodebuffer'}));
  const animation = await finalizePackage(zip, {template:reference, roles:spec.slides.map(s => s.role)});
  const pptx = await zip.generateAsync({type:'nodebuffer', compression:'DEFLATE'});
  await fs.mkdir(destination, {recursive:false});
  const file = path.join(destination, 'lecture.pptx');
  await fs.writeFile(file, pptx, {flag:'wx'});
  await fs.writeFile(path.join(destination, 'spec.json'), JSON.stringify(spec, null, 2), {flag:'wx'});
  await fs.writeFile(path.join(destination, 'outline.json'), raw, {flag:'wx'});   // the exact input, for later edits or restyling
  const errors = issues.filter(i => i.level === 'error');
  Object.assign(report, {output:'lecture.pptx', outputSha256:sha(pptx), summary, issues,
    animation:animation.filter(a => a.clicks), images:[...resolved].map(([n, v]) => ({name:n, sha256:v.sha256})),
    status:errors.length && !allowOverflow ? 'needs-revision' : 'candidate',
    reviewRequired:'Teacher review of content, rendered pages and slideshow playback is still required.'});
  await fs.writeFile(path.join(destination, 'report.json'), JSON.stringify(report, null, 2), {flag:'wx'});
  for (const i of issues) console.log(`${i.level === 'error' ? 'ERROR' : 'WARN '} slide ${i.slide}: ${i.message}`);
  console.log(`Created ${file} (${spec.slides.length} slides, ${animation.reduce((a, x) => a + x.clicks, 0)} click reveals). Status: ${report.status}.`);
  return {file, report};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), positional = [], options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--template') options.template = args[++i];
    else if (args[i] === '--allow-overflow') options.allowOverflow = true;
    else if (args[i] === '--lang') options.lang = args[++i];
    else positional.push(args[i]);
  }
  (async () => {
    if (positional.length !== 2 || ('template' in options && !options.template) || ('lang' in options && !['zh', 'en'].includes(options.lang)))
      throw Error('Usage: node build_outline.mjs outline.json new-output-directory [--template reference.pptx] [--allow-overflow] [--lang zh|en]');
    const {report} = await buildOutline(positional[0], positional[1], options);
    process.exitCode = report.status === 'needs-revision' ? 1 : 0;
  })().catch(e => { console.error(`ERROR: ${e.message}. Inputs unchanged; retry with a new output directory.`); process.exitCode = 2; });
}
