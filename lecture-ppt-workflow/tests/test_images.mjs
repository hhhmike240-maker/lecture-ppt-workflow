import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import JSZip from 'jszip';
import {build} from '../scripts/build_from_spec.mjs';

const packageRoot=fileURLToPath(new URL('../',import.meta.url));
// Original 4 x 2 solid-color PNG, generated for this test without external assets.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAD0lEQVR4nGNgaGhAIGQOAGQaCAHzfxz6AAAAAElFTkSuQmCC','base64');
const spec=(elements)=>({version:1,font:'Arial',slideSize:{width:960,height:540},slides:[{id:'images',notes:'Original synthetic image fixture.',elements}]});
const picture=(name,filename,position)=>({type:'image',name,path:filename,position});

test('PNG build preserves aspect ratio and centers both containment directions',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lecture-images-'));
  t.diagnostic(`Retained: ${dir}`);
  await fs.writeFile(path.join(dir,'source.png'),png,{flag:'wx'});
  await fs.writeFile(path.join(dir,'spec.json'),JSON.stringify(spec([
    picture('square-frame','source.png',{left:40,top:40,width:300,height:300}),
    picture('wide-frame','source.png',{left:400,top:100,width:400,height:100})
  ])),{flag:'wx'});
  const filename=await build(path.join(dir,'spec.json'),path.join(dir,'result'));
  const zip=await JSZip.loadAsync(await fs.readFile(filename));
  const xml=await zip.file('ppt/slides/slide1.xml').async('string');
  const pictures=[...xml.matchAll(/<p:pic\b[\s\S]*?<\/p:pic>/g)].map(m=>m[0]);
  assert.equal(pictures.length,2);
  const expected=[[40,115,300,150],[500,100,200,100]];
  for(let i=0;i<pictures.length;i++) {
    const values=pictures[i].match(/<a:xfrm[^>]*>\s*<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    assert.ok(values,'image geometry present');
    const actual=values.slice(1).map(Number);
    expected[i].forEach((v,j)=>assert.ok(Math.abs(actual[j]-v*9525)<=1,`image ${i+1}, coordinate ${j}`));
  }
  const media=Object.values(zip.files).filter(f=>/^ppt\/media\/.*\.png$/.test(f.name));
  assert.ok(media.length>0);
  assert.deepEqual(await media[0].async('nodebuffer'),png);
  const notes=await zip.file('ppt/notesSlides/notesSlide1.xml').async('string');
  assert.match(notes,/Original synthetic image fixture/);
});

test('SVG and disguised ICNS inputs are rejected before allocating output',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lecture-image-rejections-'));
  t.diagnostic(`Retained: ${dir}`);
  for(const [name,data] of [
    ['source.svg','<svg xmlns="http://www.w3.org/2000/svg" width="4" height="2"></svg>'],
    ['disguised.png',Buffer.from('69636e73000000106973333200000000','hex')]
  ]) {
    await fs.writeFile(path.join(dir,name),data,{flag:'wx'});
    const input=path.join(dir,`${name}.json`),out=path.join(dir,`${name}-output`);
    await fs.writeFile(input,JSON.stringify(spec([picture('asset',name,{left:10,top:10,width:100,height:100})])),{flag:'wx'});
    await assert.rejects(build(input,out),/Unsupported image type|signature does not match/);
    await assert.rejects(fs.access(out));
  }
});

const box=(type,body=Buffer.alloc(0),size=body.length+8)=>{
  const head=Buffer.alloc(8);head.writeUInt32BE(size);head.write(type,4,'ascii');return Buffer.concat([head,body]);
};
const ftyp=brand=>box('ftyp',Buffer.concat([Buffer.from(brand),Buffer.alloc(4),Buffer.from(brand)]));
const malformed={
  ICNS:Buffer.from('69636e73000000106973333200000000','hex'),
  JXL:Buffer.concat([box('JXL ',Buffer.from([13,10,135,10])),ftyp('jxl '),box('jxlp',Buffer.alloc(4),0)]),
  HEIF:Buffer.concat([ftyp('heic'),box('meta',Buffer.concat([Buffer.alloc(4),box('iprp',box('ipco',box('ispe',Buffer.alloc(12),0)))]))])
};
for(const [format,bytes] of Object.entries(malformed)) {
  test(`${format} zero-length input is rejected without hanging image-size`,()=>{
    // A subprocess deadline keeps a future parser regression from hanging the test suite.
    const result=spawnSync(process.execPath,['--input-type=module','-e',
      `import {imageSize} from 'image-size'; let rejected=false; try { imageSize(Buffer.from(process.argv[1],'hex')); } catch { rejected=true; } if (!rejected) process.exit(3);`,bytes.toString('hex')],
      {cwd:packageRoot,timeout:2000,encoding:'utf8'});
    assert.equal(result.error,undefined,`${format}: ${result.error?.message}`);
    assert.equal(result.status,0,`${format}: ${result.stderr}`);
  });
}
