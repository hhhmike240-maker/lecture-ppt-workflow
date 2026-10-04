import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from background_patch import selected

class Selection(unittest.TestCase):
    def test_mixed_reversed_range(self):
        with self.assertRaisesRegex(ValueError,'Reversed'):
            selected('1,5-3',6)
    def test_mixed_valid_ranges(self):
        self.assertEqual(selected('1,3-5,4',6),[1,3,4,5])
