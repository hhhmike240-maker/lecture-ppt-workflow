// Explicit, local-only page specification -> editable candidate PPTX.
// This is an authoring helper, not a content/visual/animation acceptance test.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const finite = n => typeof n === 'number' && Number.isFinite(n);
const requireThat = (ok, message) => { if (!ok) throw Error(message); };
function frame(o, size, label) {
  requireThat(o && ['left','top','width','height'].every(k => finite(o[k])), `${label}: invalid position`);
  requireThat(o.left >= 0 && o.top >= 0 && o.width > 0 && o.height > 0 &&
    o.left + o.width <= size.width + .01 && o.top + o.height <= size.height + .01, `${label}: outside slide`);
}
export function validateSpec(spec) {
  requireThat(spec?.version === 1, 'Expected specification version 1');
  const size = spec.slideSize;
  requireThat(size && finite(size.width) && finite(size.height) && size.width > 0 && size.height > 0, 'Invalid slideSize');
  requireThat(typeof spec.font === 'string' && spec.font.trim(), 'Explicit font family required');
  requireThat(Array.isArray(spec.slides) && spec.slides.length > 0, 'At least one slide required');
  const slideIds = new Set();
  for (const [i, slide] of spec.slides.entries()) {
    const label = `Slide ${i+1}`;
    requireThat(typeof slide.id === 'string' && slide.id && !slideIds.has(slide.id), `${label}: missing/duplicate id`);
    slideIds.add(slide.id);
    requireThat(typeof slide.notes === 'string' && slide.notes.trim(), `${label}: teaching notes required`);
    requireThat(Array.isArray(slide.elements) && slide.elements.length, `${label}: elements required`);
    const names = new Map();
    for (const e of slide.elements) {
      requireThat(e && typeof e.name === 'string' && e.name && !names.has(e.name), `${label}: missing/duplicate element name`);
      names.set(e.name, e.type);
      requireThat(['shape','image','table','connector'].includes(e.type), `${label}/${e.name}: unsupported type`);
      if (e.type !== 'connector') frame(e.position, size, `${label}/${e.name}`);
      if (e.type === 'shape') {
        requireThat(['textbox','rect','roundRect','ellipse','line'].includes(e.geometry ?? 'textbox'), `${label}: unsupported geometry`);
        requireThat(e.text === undefined || typeof e.text === 'string', `${label}: text must be a string`);
        requireThat(e.text === undefined || (finite(e.fontSize) && e.fontSize > 0), `${label}: explicit text size required (pixels)`);
      }
      if (e.type === 'image') requireThat(typeof e.path === 'string' && e.path && !/^[a-z]+:\/\//i.test(e.path), `${label}: local image path required`);
      if (e.type === 'table') {
        requireThat(Array.isArray(e.values) && e.values.length && Array.isArray(e.values[0]) && e.values[0].length, `${label}: nonempty table required`);
        requireThat(e.values.every(row => Array.isArray(row) && row.length === e.values[0].length && row.every(x => typeof x === 'string' || finite(x))), `${label}: rectangular primitive table required`);
        requireThat(finite(e.fontSize) && e.fontSize > 0, `${label}: table text size required`);
        if(e.columnWidths) requireThat(e.columnWidths.length===e.values[0].length && e.columnWidths.every(v=>finite(v)&&v>0) && Math.abs(e.columnWidths.reduce((a,b)=>a+b,0)-e.position.width)<1, `${label}: columnWidths must match table width`);
      }
    }
    for (const e of slide.elements.filter(e => e.type === 'connector')) {
      requireThat(names.get(e.from) === 'shape' && names.get(e.to) === 'shape' && e.from !== e.to, `${label}: connector endpoints must be distinct shape names`);
      requireThat(['left','right','top','bottom'].includes(e.fromSide) && ['left','right','top','bottom'].includes(e.toSide), `${label}: explicit connector sides required`);
    }
  }
  return spec;
}

export async function build(source, out) {
  const input = path.resolve(source), destination = path.resolve(out);
  const raw = await fs.readFile(input);
  const spec = validateSpec(JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, '')));
  // Validate assets before creating output. No network access or arbitrary code in JSON.
  const assets = new Map();
  for (const slide of spec.slides) for (const e of slide.elements.filter(e => e.type === 'image')) {
    const assetPath = path.resolve(path.dirname(input), e.path);
    const ext = path.extname(assetPath).toLowerCase();
    requireThat(['.png','.jpg','.jpeg'].includes(ext), `Unsupported image type: ${ext}; use a verified PNG/JPEG`);
    const bytes = await fs.readFile(assetPath);
    const valid = ext === '.png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes[0] === 255 && bytes[1] === 216;
    requireThat(valid, `Image signature does not match extension: ${assetPath}`);
    assets.set(assetPath, bytes);
  }
  let PptxGenJS;
  try { PptxGenJS=(await import('pptxgenjs')).default; }
  catch { throw Error('Missing pptxgenjs. Run npm ci --ignore-scripts in the installed lecture-ppt-workflow directory.'); }
  const color = (v, fallback='263747') => {
    const c=(v ?? fallback).replace(/^#/,'');
    requireThat(/^[0-9A-Fa-f]{6}$/.test(c), `Expected six-digit RGB color: ${v}`);
    return c;
  };
  const pos = p => ({x:p.left/96,y:p.top/96,w:p.width/96,h:p.height/96});
  const fill = v => !v || v==='none' ? {color:'FFFFFF',transparency:100} : {color:color(v)};
  const line = (v,w=0) => !v || v==='none' ? {color:'FFFFFF',transparency:100,width:0} : {color:color(v),width:w*.75};
  const deck=new PptxGenJS();
  deck.defineLayout({name:'COURSE',width:spec.slideSize.width/96,height:spec.slideSize.height/96});
  deck.layout='COURSE'; deck.author='Lecture PPT Workflow contributors';
  deck.subject='Original teaching demonstration'; deck.title='Lecture';
  deck.lang='zh-CN'; deck.theme={headFontFace:spec.font,bodyFontFace:spec.font,lang:'zh-CN'};
  // Exclusive directory allocation protects originals and previous candidates.
  await fs.mkdir(destination, {recursive:false});
  for (const data of spec.slides) {
    const slide = deck.addSlide();
    slide.background={color:color(data.background,'F7F7F7')};
    const objects = new Map(data.elements.filter(e=>e.type==='shape').map(e=>[e.name,e.position]));
    // Lines are editable, but are not auto-routed/attached when nodes are moved.
    const edge=(p,side)=>({left:[p.left,p.top+p.height/2],right:[p.left+p.width,p.top+p.height/2],top:[p.left+p.width/2,p.top],bottom:[p.left+p.width/2,p.top+p.height]})[side];
    for(const e of data.elements.filter(e=>e.type==='connector')) {
      const [x1,y1]=edge(objects.get(e.from),e.fromSide),[x2,y2]=edge(objects.get(e.to),e.toSide);
      slide.addShape(deck.ShapeType.line,{x:Math.min(x1,x2)/96,y:Math.min(y1,y2)/96,w:Math.abs(x2-x1)/96,h:Math.abs(y2-y1)/96,
        flipH:x2<x1,flipV:y2<y1,objectName:e.name,
        line:{color:color(e.color,'36879A'),width:(e.width??1.5)*.75,...(e.arrow?{endArrowType:'triangle'}:{})}});
    }
    for (const e of data.elements.filter(e => e.type !== 'connector')) {
      if (e.type === 'shape') {
        const geometry=e.geometry??'textbox';
        const options={...pos(e.position),objectName:e.name,fill:fill(e.fill),line:line(e.lineColor,e.lineWidth),
          fontFace:spec.font,fontSize:(e.fontSize??23)*.75,bold:e.bold??false,color:color(e.color),
          margin:0,breakLine:false,valign:'top',paraSpaceAfterPt:0};
        if (e.text !== undefined) {
          slide.addText(e.text,{...options,...(geometry!=='textbox'?{shape:deck.ShapeType[geometry]}:{})});
        } else slide.addShape(deck.ShapeType[geometry==='textbox'?'rect':geometry],options);
      } else if (e.type === 'image') {
        const assetPath = path.resolve(path.dirname(input), e.path);
        const p=pos(e.position);
        slide.addImage({path:assetPath,...deck.imageSizingContain(assetPath,p.x,p.y,p.w,p.h),objectName:e.name,altText:e.alt??e.name});
      } else if (e.type === 'table') {
        const rows=e.values.map((row,r)=>row.map(value=>({text:String(value),options:{fill:r===0?'385F8E':r%2?'EFF5F7':'FFFFFF',color:r===0?'FFFFFF':color(e.color),bold:r===0}})));
        slide.addTable(rows,{...pos(e.position),objectName:e.name,fontFace:spec.font,fontSize:e.fontSize*.75,
          colW:e.columnWidths?.map(v=>v/96),rowH:e.position.height/e.values.length/96,
          border:{color:'C7D5DE',pt:0.75},margin:6,valign:'middle',autoPage:false,paraSpaceAfterPt:0});
      }
    }
    slide.addNotes(data.notes);
  }
  const pptx = path.join(destination,'candidate.pptx');
  await deck.writeFile({fileName:pptx});
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const receipt = {specificationSha256:hash(raw),outputSha256:hash(await fs.readFile(pptx)),slides:spec.slides.length,
    runtime:process.version,engine:'pptxgenjs',engineVersion:deck.version,status:'candidate-only',animationAdded:false,visualReviewPassed:false,
    assets:[...assets].map(([p,b])=>({path:path.relative(path.dirname(input),p),sha256:hash(b)}))};
  await fs.writeFile(path.join(destination,'build-receipt.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
  console.log(`Created ${pptx} (${spec.slides.length} slides). Candidate only: add animations, validate and render before delivery.`);
  return pptx;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [source,out,...rest] = process.argv.slice(2);
  (async()=>{ requireThat(source && out && !rest.length,'Usage: node build_from_spec.mjs specification.json new-output-directory'); await build(source,out); })()
    .catch(e=>{console.error(`ERROR: ${e.message}. Inputs unchanged. Partial output, if any, retained; retry in a new directory.`);process.exitCode=2;});
}
