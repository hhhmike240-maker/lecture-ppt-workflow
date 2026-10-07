// Explicit, local-only page specification -> editable candidate PPTX.
// This is an authoring helper, not a content/visual/animation acceptance test.
// For content-only outlines with computed layouts, use build_outline.mjs instead.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateSpec, renderDeck, requireThat} from './lib/pptx_core.mjs';
import {renumberShapeIds} from './lib/finalize.mjs';

export {validateSpec};

export async function build(source, out) {
  const input = path.resolve(source), destination = path.resolve(out);
  const raw = await fs.readFile(input);
  const spec = validateSpec(JSON.parse(raw.toString('utf8').replace(/^﻿/, '')));
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
  let PptxGenJS, imageSize, JSZip;
  try {
    PptxGenJS=(await import('pptxgenjs')).default;
    ({imageSize}=await import('image-size'));
    JSZip=(await import('jszip')).default;
  }
  catch { throw Error('Missing generation dependencies. Run npm ci --ignore-scripts in a fresh installed lecture-ppt-workflow directory.'); }
  const dimensions = new Map();
  for (const [assetPath, bytes] of assets) {
    const size = imageSize(bytes);
    requireThat(Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0,
      `Invalid image dimensions: ${assetPath}`);
    dimensions.set(assetPath, size);
  }
  const deck = renderDeck(spec, PptxGenJS, {
    title:'Lecture', author:'Lecture PPT Workflow contributors',
    resolveImage:p => { const a=path.resolve(path.dirname(input), p); return {path:a, ...dimensions.get(a)}; },
  });
  deck.subject='Original teaching demonstration';
  // Exclusive directory allocation protects originals and previous candidates.
  await fs.mkdir(destination, {recursive:false});
  // Unique shape ids per slide; animation is still a separate, explicit step.
  const zip = await JSZip.loadAsync(await deck.write({outputType:'nodebuffer'}));
  for (const name of Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)))
    zip.file(name, renumberShapeIds(await zip.file(name).async('string')));
  const pptx = path.join(destination,'candidate.pptx');
  await fs.writeFile(pptx, await zip.generateAsync({type:'nodebuffer', compression:'DEFLATE'}), {flag:'wx'});
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
