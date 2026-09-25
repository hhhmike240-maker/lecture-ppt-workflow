// Cross-platform rendering helper. Uses a locally installed LibreOffice/soffice.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
async function main(){
const [source,out,...options]=process.argv.slice(2);
if(!source||!out)throw Error('Usage: node render.mjs input.pptx new-output-directory');
const {spawn}=await import('node:child_process');
await fs.mkdir(out,{recursive:false});
const soffice=process.env.LIBREOFFICE||process.env.SOFFICE||'soffice';
const pdfDir=await fs.mkdtemp(path.join(path.dirname(out),'ppt-render-'));
const run=(command,args)=>new Promise((resolve,reject)=>{const p=spawn(command,args,{stdio:'pipe'});let stderr='';p.stderr.on('data',d=>stderr+=d);p.on('error',reject);p.on('close',code=>code?reject(Error(`${command} exited ${code}: ${stderr.slice(-800)}`)):resolve());});
try { await run(soffice,['--headless','--convert-to','pdf','--outdir',pdfDir,path.resolve(source)]); }
catch(e){ throw Error(`Static rendering needs LibreOffice/soffice (${e.message}). Generation and structural checks can still run.`); }
const base=path.join(pdfDir,path.basename(source,path.extname(source))+'.pdf');
const pdftoppm=process.env.PDFTOPPM||'pdftoppm';
try { await run(pdftoppm,['-png','-r','96',base,path.join(out,'slide')]); }
catch(e){ throw Error(`PNG preview needs pdftoppm (${e.message}). PDF export may still be available.`); }
const files=(await fs.readdir(out)).filter(x=>/^slide-\d+\.png$/.test(x)).sort();
for(const [i,f] of files.entries()){const dest=path.join(out,`${String(i+1).padStart(3,'0')}.png`);await fs.rename(path.join(out,f),dest);}
await fs.writeFile(path.join(out,'render-receipt.json'),JSON.stringify({source:path.resolve(source),renderer:'LibreOffice + Poppler',pages:files.length,staticOnly:true,slideshowPlaybackTested:false},null,2),{flag:'wx'});
}
main().catch(e=>{console.error(`ERROR: ${e.message}. Inputs are unchanged. Partial previews, if any, are retained; use a fresh output directory for retry.`);process.exitCode=2;});
