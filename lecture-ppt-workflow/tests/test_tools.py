"""Package-level regression tests. Retains fixtures; no cleanup/deletion."""
import sys,tempfile,unittest
from pathlib import Path
from zipfile import ZipFile
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from office_audit import audit,compare,slides,NS
from background_patch import patch,selected
from add_animations import process
from check_coverage import check

P=NS['p'];A=NS['a'];R=NS['r'];PR='http://schemas.openxmlformats.org/package/2006/relationships'
def slide(label,bg='',timing='',name='plain'):
    return f'<p:sld xmlns:p="{P}" xmlns:a="{A}" xmlns:r="{R}"><p:cSld>{bg}<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/></p:nvGrpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="{name}"/></p:nvSpPr><p:txBody><a:p><a:r><a:t>{label}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>{timing}</p:sld>'
def fixture(path,reveal=False,timed=False,broken=False):
    # Deliberately reverse physical part numbers to detect page-order bugs.
    parts={'ppt/presentation.xml':f'<p:presentation xmlns:p="{P}" xmlns:r="{R}"><p:sldIdLst><p:sldId id="256" r:id="r1"/><p:sldId id="257" r:id="r2"/></p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/></p:presentation>',
      'ppt/_rels/presentation.xml.rels':f'<Relationships xmlns="{PR}"><Relationship Id="r1" Type="{R}/slide" Target="slides/slide9.xml"/><Relationship Id="r2" Type="{R}/slide" Target="slides/{"missing" if broken else "slide2"}.xml"/></Relationships>',
      'ppt/slides/slide9.xml':slide('第一知识点','<p:bg><p:bgPr><a:solidFill><a:srgbClr val="F7F7F7"/></a:solidFill></p:bgPr></p:bg>', '<p:timing/>' if timed else '', 'reveal_1_1' if reveal else 'plain'),
      'ppt/slides/slide2.xml':slide('第二知识点'), 'ppt/media/video.mp4':b'RETAIN-MEDIA-BYTES'}
    with ZipFile(path,'x') as z:
        for name,data in parts.items():z.writestr(name,data)
    return path

class ToolsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir=Path(tempfile.mkdtemp(prefix='bupt-skill-tests-'))
        print('Retained fixtures:',cls.dir)
    def paths(self):
        d=self.dir/self._testMethodName;d.mkdir();return d
    def test_actual_order(self):
        d=self.paths();s=fixture(d/'a.pptx')
        r=audit(s);self.assertEqual(r['index']['slides'][0]['part'],'ppt/slides/slide9.xml');self.assertEqual(r['checks']['errors'],[])
    def test_background_only_and_media_preservation(self):
        d=self.paths();s=fixture(d/'a.pptx');out=d/'b.pptx';r=patch(s,s,1,'2',out)
        self.assertEqual(r['changed_parts'],['ppt/slides/slide2.xml']);self.assertFalse(r['out_of_scope_parts'])
        with ZipFile(s) as a,ZipFile(out) as b:self.assertEqual(a.read('ppt/media/video.mp4'),b.read('ppt/media/video.mp4'))
    def test_no_overwrite(self):
        d=self.paths();s=fixture(d/'a.pptx')
        with self.assertRaises(FileExistsError):patch(s,s,1,'2',s)
    def test_missing_direct_background(self):
        d=self.paths();s=fixture(d/'a.pptx')
        with self.assertRaises(ValueError):patch(s,s,2,'1',d/'b.pptx')
        self.assertFalse((d/'b.pptx').exists())
    def test_invalid_selection(self):
        for v in ['0','3','2-1','1-2-3']:
            with self.assertRaises(ValueError):selected(v,2)
    def test_animation_target_and_order(self):
        d=self.paths();s=fixture(d/'a.pptx',reveal=True);out=d/'b.pptx';r=process(s,out,pages='1')
        self.assertEqual(r['slides'][0]['slide'],1)
        info=audit(out);self.assertFalse(info['checks']['errors']);self.assertEqual(info['index']['slides'][0]['click_effects'],1)
        self.assertEqual(compare(s,out)['changed_parts'],['ppt/slides/slide9.xml'])
    def test_existing_animation_refused(self):
        d=self.paths();s=fixture(d/'a.pptx',reveal=True,timed=True)
        with self.assertRaises(ValueError):process(s,d/'b.pptx',pages='1')
        self.assertFalse((d/'b.pptx').exists())
    def test_unselected_animation_preserved(self):
        d=self.paths();s=fixture(d/'a.pptx',reveal=True);out=d/'b.pptx';process(s,out,pages='1')
        gray=d/'c.pptx';patch(out,out,1,'2',gray)
        with ZipFile(out) as a,ZipFile(gray) as b:self.assertEqual(a.read('ppt/slides/slide9.xml'),b.read('ppt/slides/slide9.xml'))
    def test_coverage_missing_and_out_of_range(self):
        d=self.paths();s=fixture(d/'a.pptx')
        good={'knowledge':[{'id':'K1','slides':[1],'on_screen':['第一知识点']}]} 
        self.assertFalse(check(good,s)['errors'])
        bad={'knowledge':[{'id':'K1','slides':[2],'on_screen':['第一知识点']},{'id':'K2','slides':[3]}]}
        self.assertEqual(len(check(bad,s)['errors']),2)
    def test_out_of_scope_detected(self):
        d=self.paths();s=fixture(d/'a.pptx',reveal=True);out=d/'b.pptx';process(s,out,pages='1')
        self.assertEqual(compare(s,out,True)['out_of_scope_parts'],['ppt/slides/slide9.xml'])

if __name__=='__main__':unittest.main(verbosity=2)
