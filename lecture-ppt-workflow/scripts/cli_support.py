"""Small CLI error boundary; never removes failed drafts."""
import sys
from zipfile import BadZipFile
import xml.etree.ElementTree as E

def utf8_console():
    """Chinese output must not crash on consoles with a legacy code page (e.g. cp1252)."""
    for stream in (sys.stdout, sys.stderr):
        try: stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError): pass

def run(fn):
    utf8_console()
    try:
        return fn() or 0
    except (OSError, ValueError, KeyError, TypeError, BadZipFile, E.ParseError, AssertionError, RuntimeError) as ex:
        print(f'ERROR [{type(ex).__name__}]: {ex}. Inputs are not modified; any partial output is retained. Choose a fresh output path after correcting the problem.',file=sys.stderr)
        return 2
