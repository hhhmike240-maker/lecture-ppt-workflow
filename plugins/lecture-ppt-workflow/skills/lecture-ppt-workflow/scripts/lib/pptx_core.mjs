// Environment-neutral page specification core, shared by the Node CLI and the browser page.
// No filesystem, network or arbitrary code execution: callers pass PptxGenJS and resolved images.

const finite = n => typeof n === 'number' && Number.isFinite(n);
export const requireThat = (ok, message) => { if (!ok) throw Error(message); };
const ALIGN = ['left', 'center', 'right'], VALIGN = ['top', 'middle', 'bottom'];
const GEOMETRY = ['textbox', 'rect', 'roundRect', 'ellipse', 'line'];

function frame(o, size, label) {
  requireThat(o && ['left','top','width','height'].every(k => finite(o[k])), `${label}: invalid position`);
  requireThat(o.left >= 0 && o.top >= 0 && o.width > 0 && o.height > 0 &&
    o.left + o.width <= size.width + .01 && o.top + o.height <= size.height + .01, `${label}: outside slide`);
}

function checkRuns(runs, label) {
  requireThat(Array.isArray(runs) && runs.length, `${label}: runs must be a nonempty list`);
  for (const r of runs) {
    requireThat(r && typeof r.text === 'string', `${label}: every run needs text`);
    requireThat(r.fontSize === undefined || (finite(r.fontSize) && r.fontSize > 0), `${label}: invalid run size`);
  }
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
        requireThat(GEOMETRY.includes(e.geometry ?? 'textbox'), `${label}: unsupported geometry`);
        requireThat(e.text === undefined || typeof e.text === 'string', `${label}: text must be a string`);
        requireThat(!(e.text !== undefined && e.runs !== undefined), `${label}/${e.name}: use text or runs, not both`);
        if (e.runs !== undefined) checkRuns(e.runs, `${label}/${e.name}`);
        requireThat((e.text === undefined && e.runs === undefined) || (finite(e.fontSize) && e.fontSize > 0), `${label}: explicit text size required (pixels)`);
        requireThat(e.align === undefined || ALIGN.includes(e.align), `${label}/${e.name}: align must be left, center or right`);
        requireThat(e.valign === undefined || VALIGN.includes(e.valign), `${label}/${e.name}: valign must be top, middle or bottom`);
        requireThat(e.lineDash === undefined || ['solid','dash','sysDot','lgDash'].includes(e.lineDash), `${label}/${e.name}: unsupported lineDash`);
        requireThat(e.lineSpacing === undefined || (finite(e.lineSpacing) && e.lineSpacing >= .8 && e.lineSpacing <= 3), `${label}/${e.name}: lineSpacing must be 0.8-3`);
      }
      if (e.type === 'image') requireThat(typeof e.path === 'string' && e.path && !/^[a-z]+:\/\//i.test(e.path), `${label}: local image path required`);
      if (e.type === 'table') {
        requireThat(Array.isArray(e.values) && e.values.length && Array.isArray(e.values[0]) && e.values[0].length, `${label}: nonempty table required`);
        requireThat(e.values.every(row => Array.isArray(row) && row.length === e.values[0].length && row.every(x => typeof x === 'string' || finite(x))), `${label}: rectangular primitive table required`);
        requireThat(finite(e.fontSize) && e.fontSize > 0, `${label}: table text size required`);
        if(e.columnWidths) requireThat(e.columnWidths.length===e.values[0].length && e.columnWidths.every(v=>finite(v)&&v>0) && Math.abs(e.columnWidths.reduce((a,b)=>a+b,0)-e.position.width)<1, `${label}: columnWidths must match table width`);
        if(e.rowHeights) requireThat(e.rowHeights.length===e.values.length && e.rowHeights.every(v=>finite(v)&&v>0), `${label}: rowHeights must match row count`);
      }
    }
    for (const e of slide.elements.filter(e => e.type === 'connector')) {
      requireThat(names.get(e.from) === 'shape' && names.get(e.to) === 'shape' && e.from !== e.to, `${label}: connector endpoints must be distinct shape names`);
      requireThat(['left','right','top','bottom'].includes(e.fromSide) && ['left','right','top','bottom'].includes(e.toSide), `${label}: explicit connector sides required`);
    }
  }
  return spec;
}

const color = (v, fallback='263747') => {
  const c=String(v ?? fallback).replace(/^#/,'');
  requireThat(/^[0-9A-Fa-f]{6}$/.test(c), `Expected six-digit RGB color: ${v}`);
  return c.toUpperCase();
};

/**
 * Render a validated specification into a PptxGenJS deck.
 * resolveImage(path) must return {data|path, width, height} for every image element.
 */
export function renderDeck(spec, PptxGenJS, {resolveImage, title='Lecture', author='Lecture PPT Workflow'} = {}) {
  validateSpec(spec);
  const pos = p => ({x:p.left/96,y:p.top/96,w:p.width/96,h:p.height/96});
  const fill = v => !v || v==='none' ? {color:'FFFFFF',transparency:100} : {color:color(v)};
  const line = (v,w=0,dash) => !v || v==='none' ? {color:'FFFFFF',transparency:100,width:0} : {color:color(v),width:w*.75,...(dash?{dashType:dash}:{})};
  const deck=new PptxGenJS();
  deck.defineLayout({name:'COURSE',width:spec.slideSize.width/96,height:spec.slideSize.height/96});
  deck.layout='COURSE'; deck.author=author; deck.title=title;
  deck.lang=spec.lang ?? 'zh-CN'; deck.theme={headFontFace:spec.font,bodyFontFace:spec.font,lang:spec.lang ?? 'zh-CN'};
  for (const data of spec.slides) {
    const slide = deck.addSlide();
    slide.background={color:color(data.background,'F7F7F7')};
    const objects = new Map(data.elements.filter(e=>e.type==='shape').map(e=>[e.name,e.position]));
    const edge=(p,side)=>({left:[p.left,p.top+p.height/2],right:[p.left+p.width,p.top+p.height/2],top:[p.left+p.width/2,p.top],bottom:[p.left+p.width/2,p.top+p.height]})[side];
    const connector = e => {
      // Lines are editable, but are not auto-routed/attached when nodes are moved.
      const [x1,y1]=edge(objects.get(e.from),e.fromSide),[x2,y2]=edge(objects.get(e.to),e.toSide);
      slide.addShape(deck.ShapeType.line,{x:Math.min(x1,x2)/96,y:Math.min(y1,y2)/96,w:Math.abs(x2-x1)/96,h:Math.abs(y2-y1)/96,
        flipH:x2<x1,flipV:y2<y1,objectName:e.name,
        line:{color:color(e.color,'36879A'),width:(e.width??1.5)*.75,...(e.arrow?{endArrowType:'triangle'}:{})}});
    };
    // Connectors are drawn first so that boxes cover line ends; later list order is preserved.
    for (const e of data.elements.filter(e=>e.type==='connector')) connector(e);
    for (const e of data.elements.filter(e => e.type !== 'connector')) {
      if (e.type === 'shape') {
        const geometry=e.geometry??'textbox';
        const options={...pos(e.position),objectName:e.name,fill:fill(e.fill),line:line(e.lineColor,e.lineWidth,e.lineDash),
          fontFace:spec.font,fontSize:(e.fontSize??23)*.75,bold:e.bold??false,color:color(e.color),
          margin:e.margin===undefined?0:e.margin*.75,breakLine:false,align:e.align??'left',valign:e.valign??'top',
          paraSpaceAfter:(e.paragraphSpacing??0)*.75,
          ...(e.lineSpacing?{lineSpacingMultiple:e.lineSpacing}:{}),
          ...(geometry==='roundRect'?{rectRadius:e.radius??.08}:{})};
        const shape = geometry!=='textbox'?{shape:deck.ShapeType[geometry]}:{};
        if (e.runs !== undefined) {
          const runs=e.runs.map((r,i)=>({text:r.text,options:{
            bold:r.bold??e.bold??false,color:color(r.color??e.color),
            ...(r.fontSize?{fontSize:r.fontSize*.75}:{}),
            ...(r.bullet?{bullet:r.indent?{indent:18,characterCode:'25E6'}:{indent:18},indentLevel:r.indent?1:0}:{}),
            breakLine:r.breakLine ?? (i<e.runs.length-1 && /\n$/.test(r.text) ? true : false)}}));
          for (const r of runs) if (r.options.breakLine) r.text=r.text.replace(/\n$/,'');
          slide.addText(runs,{...options,...shape});
        } else if (e.text !== undefined) {
          slide.addText(e.text,{...options,...shape});
        } else slide.addShape(deck.ShapeType[geometry==='textbox'?'rect':geometry],options);
      } else if (e.type === 'image') {
        const image=resolveImage?.(e.path);
        requireThat(image && finite(image.width) && finite(image.height) && image.width>0 && image.height>0, `Unresolved image: ${e.path}`);
        const p=pos(e.position);
        const scale=e.fit==='cover'?Math.max(p.w/image.width,p.h/image.height):Math.min(p.w/image.width,p.h/image.height);
        const w=e.fit==='cover'?p.w:image.width*scale,h=e.fit==='cover'?p.h:image.height*scale;
        slide.addImage({...(image.data?{data:image.data}:{path:image.path}),x:p.x+(p.w-w)/2,y:p.y+(p.h-h)/2,w,h,
          objectName:e.name,altText:e.alt??e.name,
          ...(e.fit==='cover'?{sizing:{type:'cover',w:p.w,h:p.h}}:{})});
      } else if (e.type === 'table') {
        const head=color(e.headerFill,'385F8E'), band=color(e.bandFill,'EFF5F7');
        const rows=e.values.map((row,r)=>row.map((value,c)=>({text:String(value),options:{
          fill:{color:r===0?head:r%2?band:'FFFFFF'},color:r===0?'FFFFFF':color(e.color),
          bold:r===0||(e.boldFirstColumn&&c===0),align:r===0?'center':'left'}})));
        slide.addTable(rows,{...pos(e.position),objectName:e.name,fontFace:spec.font,fontSize:e.fontSize*.75,
          colW:e.columnWidths?.map(v=>v/96),rowH:e.rowHeights?e.rowHeights.map(v=>v/96):e.position.height/e.values.length/96,
          border:{type:'solid',color:color(e.borderColor,'C7D5DE'),pt:0.75},margin:[4,6,4,6],valign:'middle',autoPage:false,paraSpaceAfter:0});
      }
    }
    slide.addNotes(data.notes);
  }
  return deck;
}
