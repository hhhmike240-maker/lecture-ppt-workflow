// Generate the original sample reference deck used to demonstrate template reuse.
// No institution names, logos or third-party images: the "logo" is plain vector shapes.
// Usage (from the repository root, after npm ci in lecture-ppt-workflow):
//   node demo/template/make_sample_template.mjs demo/template/sample-template.pptx
import fs from 'node:fs/promises';

const {default: PptxGenJS} = await import(new URL('../../lecture-ppt-workflow/node_modules/pptxgenjs/dist/pptxgen.es.js', import.meta.url));
const out = process.argv[2];
if (!out) throw Error('Usage: node make_sample_template.mjs output.pptx');

const TEAL = '2A6F6B', DEEP = '1E4F4C', AMBER = 'C8873A', PAPER = 'F5F7F6';
// Master objects have no ellipse type; a text object without text carries the shape.
const circle = (x, y, d, color) => ({text:{text:'', options:{x, y, w:d, h:d, shape:'ellipse', fill:{color}, line:{color, width:0}}}});
const logo = (x, y, light = false) => [
  circle(x, y, .42, light ? 'FFFFFF' : TEAL),
  {rect:{x:x + .13, y:y + .12, w:.16, h:.18, fill:{color:light ? TEAL : 'FFFFFF'}}},
  {rect:{x:x + .5, y:y + .1, w:.9, h:.07, fill:{color:light ? 'FFFFFF' : TEAL}}},
  {rect:{x:x + .5, y:y + .24, w:.6, h:.07, fill:{color:AMBER}}},
];
const deck = new PptxGenJS();
deck.layout = 'LAYOUT_16x9';
deck.author = 'Lecture PPT Workflow contributors';
deck.title = 'Sample course template';
deck.defineSlideMaster({title:'COVER', background:{color:PAPER}, objects:[
  {rect:{x:0, y:0, w:3.3, h:5.625, fill:{color:TEAL}}},
  {rect:{x:3.3, y:0, w:.12, h:5.625, fill:{color:AMBER}}},
  {rect:{x:3.9, y:1.95, w:5.6, h:1.05, fill:{color:'FFFFFF'}, line:{color:'D9E3E1', width:1}}},
  ...logo(.45, .45, true),
]});
deck.defineSlideMaster({title:'CONTENT', background:{color:PAPER}, objects:[
  {line:{x:.5, y:.68, w:9, h:0, line:{color:TEAL, width:1.25}}},
  ...logo(8.05, .14),
  {rect:{x:0, y:5.5, w:2.4, h:.125, fill:{color:AMBER}}},
  {rect:{x:2.4, y:5.5, w:7.6, h:.125, fill:{color:TEAL}}},
]});
deck.defineSlideMaster({title:'SECTION', background:{color:DEEP}, objects:[
  circle(6.9, -1.1, 4.2, TEAL),
  {rect:{x:0, y:5.5, w:10, h:.125, fill:{color:AMBER}}},
  ...logo(.45, .45, true),
]});
const text = (slide, value, opts) => slide.addText(value, {fontFace:'Microsoft YaHei', margin:0, ...opts});
text(deck.addSlide({masterName:'COVER'}), '课程名称', {x:4.1, y:2.1, w:5.2, h:.75, fontSize:30, bold:true, color:DEEP, align:'center'});
const content = deck.addSlide({masterName:'CONTENT'});
text(content, '章节标题', {x:.5, y:.2, w:6, h:.45, fontSize:24, bold:true, color:DEEP});
text(content, '正文示例：定义、要点与图表放在横线下方。', {x:.5, y:1.1, w:9, h:.5, fontSize:18, color:'2B3A3A'});
text(deck.addSlide({masterName:'SECTION'}), '谢谢', {x:.9, y:2.3, w:6, h:.8, fontSize:36, bold:true, color:'FFFFFF'});
await fs.writeFile(out, Buffer.from(await deck.write({outputType:'nodebuffer'})), {flag:'wx'});
console.log('Created', out);
