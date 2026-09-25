"""Isolated synthetic-input tests, retaining all files for diagnosis."""
import json,subprocess,sys,tempfile,unittest
from pathlib import Path
from zipfile import ZipFile
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from test_tools import fixture,NS,PR,R
from office_audit import audit
from style_check import inspect
from validate_skill import validate

class Extended(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.root=Path(tempfile.mkdtemp(prefix='bupt-extended-'));print('Retained:',cls.root)
    def folder(self):
        p=self.root/self._testMethodName;p.mkdir();return p
    def test_group_transform(self):
        d=self.folder();src=fixture(d/'source.pptx');target=d/'group.pptx'
        with ZipFile(src) as a,ZipFile(target,'x') as b:
            for n in a.namelist():
                raw=a.read(n)
                if n=='ppt/slides/slide9.xml':
                    s=raw.decode();start=s.index('<p:sp>');end=s.index('</p:sp>')+len('</p:sp>')
                    shape=s[start:end].replace('<p:txBody>','<p:spPr><a:xfrm><a:off x="10" y="20"/><a:ext cx="10" cy="10"/></a:xfrm></p:spPr><p:txBody>')
                    group='<p:grpSp><p:grpSpPr><a:xfrm><a:off x="100" y="200"/><a:ext cx="1000" cy="500"/><a:chOff x="10" y="20"/><a:chExt cx="100" cy="50"/></a:xfrm></p:grpSpPr>'+shape+'</p:grpSp>'
                    raw=(s[:start]+group+s[end:]).encode()
                b.writestr(n,raw)
        r=inspect(target);self.assertEqual(r['slides'][0]['objects'][0]['bounds_emu'],[100,200,200,300])
        self.assertTrue(inspect(target,{'roles':{'plain':{'top_min':201}}})['errors'])
    def test_background_inheritance(self):
        d=self.folder();src=fixture(d/'source.pptx')
        with ZipFile(src,'a') as z:
            z.writestr('ppt/slides/_rels/slide2.xml.rels',f'<Relationships xmlns="{PR}"><Relationship Id="layout" Type="{R}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>')
            z.writestr('ppt/slideLayouts/slideLayout1.xml',f'<p:sldLayout xmlns:p="{NS["p"]}" xmlns:a="{NS["a"]}"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="F7F7F7"/></a:solidFill></p:bgPr></p:bg></p:cSld></p:sldLayout>')
        r=inspect(src);self.assertEqual(r['slides'][1]['background']['source'],'ppt/slideLayouts/slideLayout1.xml')
    def test_docx_runs_table_image(self):
        d=self.folder();src=d/'doc.docx';w=NS['w'];a=NS['a']
        with ZipFile(src,'x') as z:
            z.writestr('word/document.xml',f'<w:document xmlns:w="{w}" xmlns:a="{a}" xmlns:r="{R}"><w:body><w:p><w:r><w:t>人力</w:t></w:r><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>资源</w:t></w:r><w:r><w:drawing><a:blip r:embed="img"/></w:drawing></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>表格知识</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>')
            z.writestr('word/_rels/document.xml.rels',f'<Relationships xmlns="{PR}"><Relationship Id="img" Type="{R}/image" Target="media/image1.png"/></Relationships>')
            z.writestr('word/media/image1.png',b'IMAGE-BYTES')
        r=audit(src);self.assertEqual(r['index']['paragraphs'][0]['text'],'人力资源');self.assertEqual(len(r['index']['images']),1);self.assertEqual(r['index']['tables'][0][0][0],'表格知识')
    def test_missing_input_cli(self):
        d=self.folder();tool=Path(__file__).resolve().parents[1]/'scripts/office_audit.py'
        p=subprocess.run([sys.executable,str(tool),'index',str(d/'absent.pptx'),'--out',str(d/'report.json')],capture_output=True,text=True)
        self.assertEqual(p.returncode,2);self.assertIn('ERROR',p.stderr);self.assertNotIn('Traceback',p.stderr);self.assertFalse((d/'report.json').exists())
    def test_broken_relationship(self):
        d=self.folder();src=fixture(d/'broken.pptx',broken=True)
        with self.assertRaises(KeyError):audit(src)
    def test_skill_references(self):self.assertFalse(validate(Path(__file__).resolve().parents[1])['errors'])
if __name__=='__main__':unittest.main(verbosity=2)
