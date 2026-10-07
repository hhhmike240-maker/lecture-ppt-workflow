// Post-process a generated PPTX package (JSZip instance), shared by Node and the browser.
// 1. Renumber shape IDs per slide: PptxGenJS can give a table the same id as another shape.
// 2. Add native click-triggered fade-in for shapes named reveal_<group>_<item>[_label],
//    using the same OOXML structure as add_animations.py (validated by its Python checks).
// Static structure only; slideshow playback must be checked in PowerPoint/WPS.

const REVEAL = /^reveal_(\d+)_(\d+)(?:_|$)/;
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];

export function renumberShapeIds(xml) {
  let next = 0;
  return xml.replace(/<p:cNvPr\b[^>]*?\bid="\d+"/g, tag => tag.replace(/\bid="\d+"/, `id="${++next}"`));
}

export function revealGroups(xml) {
  const groups = new Map(), ids = new Set();
  for (const m of xml.matchAll(/<p:cNvPr\b[^>]*>/g)) {
    const tag = m[0], id = attr(tag, 'id'), name = attr(tag, 'name') ?? '';
    if (ids.has(id)) throw Error(`Duplicate shape id ${id}`);
    ids.add(id);
    const r = name.match(REVEAL);
    if (!r) { if (name.startsWith('reveal_')) throw Error(`Malformed reveal shape name ${name}`); continue; }
    if (!['0', 'false', undefined].includes(attr(tag, 'hidden'))) throw Error(`Reveal shape ${id} is permanently hidden`);
    const g = Number(r[1]);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({id, name, item:Number(r[2])});
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([group, shapes]) => ({group, shapes:shapes.sort((a, b) => a.item - b.item)}));
}

export function timingXml(groups) {
  let n = 0;
  const cond = d => `<p:stCondLst><p:cond delay="${d}"/></p:stCondLst>`;
  const tgt = id => `<p:tgtEl><p:spTgt spid="${id}"/></p:tgtEl>`;
  // Build depth-first in the same id order as the Python implementation.
  const root = () => {
    const rootId = ++n, mainId = ++n;
    const clicks = groups.map(({shapes}) => {
      const clickId = ++n, delayId = ++n;
      const effects = shapes.map((s, i) => {
        const effectId = ++n, setId = ++n, fadeId = ++n;
        return `<p:par><p:cTn id="${effectId}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" grpId="0" nodeType="${i ? 'withEffect' : 'clickEffect'}">${cond(0)}<p:childTnLst>` +
          `<p:set><p:cBhvr><p:cTn id="${setId}" dur="1" fill="hold">${cond(0)}</p:cTn>${tgt(s.id)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>` +
          `<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${fadeId}" dur="400"/>${tgt(s.id)}</p:cBhvr></p:animEffect>` +
          `</p:childTnLst></p:cTn></p:par>`;
      }).join('');
      return `<p:par><p:cTn id="${clickId}" fill="hold">${cond('indefinite')}<p:childTnLst><p:par><p:cTn id="${delayId}" fill="hold">${cond(0)}<p:childTnLst>${effects}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
    }).join('');
    return `<p:tnLst><p:par><p:cTn id="${rootId}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>` +
      `<p:seq concurrent="1" nextAc="seek"><p:cTn id="${mainId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${clicks}</p:childTnLst></p:cTn>` +
      `<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>` +
      `<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>` +
      `</p:childTnLst></p:cTn></p:par></p:tnLst>`;
  };
  return `<p:timing>${root()}</p:timing>`;
}

export function addReveals(xml) {
  const groups = revealGroups(xml);
  if (!groups.length) return {xml, clicks:0, shapes:0};
  if (/<p:timing\b/.test(xml)) throw Error('Slide already has timing; existing animations are preserved, not overwritten');
  const timing = timingXml(groups);
  const out = /<p:extLst\b(?![\s\S]*<\/p:cSld>)/.test(xml) ? xml.replace(/<p:extLst\b(?![\s\S]*<\/p:cSld>)/, timing + '<p:extLst') : xml.replace(/<\/p:sld>\s*$/, timing + '</p:sld>');
  if (out === xml) throw Error('Could not place timing element');
  return {xml:out, clicks:groups.length, shapes:groups.reduce((a, g) => a + g.shapes.length, 0)};
}

/**
 * Finalize all slides in a JSZip package. Returns an audit list.
 * Optional template (from extractTemplate) and roles (per slide: cover/content/section)
 * copy the reference deck's decorations and backgrounds behind the generated content.
 */
export async function finalizePackage(zip, {template = null, roles = []} = {}) {
  const names = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/g).pop()) - Number(b.match(/\d+/g).pop()));
  if (template) {
    const {applyTemplateToSlide, registerExtensions} = await import('./template.mjs');
    const ctx = {mediaNames:new Map(), relCounter:0, extensions:new Set()};
    for (const [i, name] of names.entries()) await applyTemplateToSlide(zip, name, roles[i] ?? 'content', template, ctx);
    await registerExtensions(zip, ctx.extensions);
  }
  const audit = [];
  for (const name of names) {
    const original = await zip.file(name).async('string');
    const r = addReveals(renumberShapeIds(original));
    zip.file(name, r.xml);
    audit.push({slide:Number(name.match(/(\d+)\.xml$/)[1]), clicks:r.clicks, animatedShapes:r.shapes});
  }
  return audit;
}
