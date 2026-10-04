"""Small CLI error boundary; never removes failed drafts."""
import sys
from zipfile import BadZipFile
import xml.etree.ElementTree as E

def run(fn):
    try:
        return fn() or 0
    except (OSError, ValueError, KeyError, TypeError, BadZipFile, E.ParseError, AssertionError, RuntimeError) as ex:
        print(f'ERROR [{type(ex).__name__}]: {ex}. Inputs are not modified; any partial output is retained. Choose a fresh output path after correcting the problem.',file=sys.stderr)
        return 2
