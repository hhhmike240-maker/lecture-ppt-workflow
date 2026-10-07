"""Cross-check: click reveals written by the JavaScript finalizer pass the Python animation validator."""
import re, shutil, subprocess, sys, tempfile, unittest, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
NODE = shutil.which('node')
READY = NODE and (ROOT / 'node_modules' / 'pptxgenjs').is_dir()
try:
    from lxml import etree as ET
    from add_animations import gather, validate, NS
except SystemExit:  # lxml missing
    ET = None


@unittest.skipUnless(READY and ET is not None, 'needs node, npm ci and lxml')
class JsRevealTest(unittest.TestCase):
    def test_demo_reveals_match_python_structure(self):
        out = Path(tempfile.mkdtemp(prefix='lecture-js-reveal-')) / 'build'
        subprocess.run([NODE, str(ROOT / 'scripts' / 'build_outline.mjs'), str(ROOT / 'examples' / 'outline.json'), str(out)],
                       check=True, capture_output=True)
        checked = 0
        with zipfile.ZipFile(out / 'lecture.pptx') as z:
            for name in z.namelist():
                if not re.match(r'ppt/slides/slide\d+\.xml$', name):
                    continue
                root = ET.fromstring(z.read(name))
                groups, ids = gather(root)
                if root.find('p:timing', NS) is not None:
                    validate(root, groups, ids)
                    checked += 1
        self.assertEqual(checked, 2)


if __name__ == '__main__':
    unittest.main()
