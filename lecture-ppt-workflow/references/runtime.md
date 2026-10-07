# Runtime and licensing boundaries

The Python 3.10+ standard library covers indexing, style and coverage checks and package checks. The animation patcher also needs lxml. Generation needs Node and PptxGenJS from the public npm registry. Static rendering uses LibreOffice + Poppler, or `render_windows.ps1` with PowerPoint on Windows.

Local check on 2026-09-23: the old Artifact Tool 2.8.59 was marked private and the public npm registry returned 404, so it is no longer a generation dependency of the public version. The public version uses PptxGenJS 4.0.1 (MIT); users obtain dependencies with `npm ci`. Rights to the tool and to its dependencies are separate.

Generation dependencies are PptxGenJS 4.0.1, image-size 2.0.4 and JSZip 3.10.2 (MIT, or MIT/GPLv3 dual license), locked in package-lock.json. The repository's `app/vendor/` contains the PptxGenJS browser bundle (with JSZip) for the web page, with its license files alongside.

Run `npm ci --ignore-scripts` to install the public dependencies; do not commit node_modules. Run doctor.py first; if dependencies are missing, stop generating, but you can still organize content, index files and check existing decks. PptxGenJS builds new slides from a page specification; it does not losslessly rewrite complex existing templates.

This public version does not bundle Node dependencies, fonts, Office, other skills or their source code. Cross-platform static rendering depends on LibreOffice/Poppler; Windows can use the PowerPoint script. A fresh computer still needs its own fonts and office software.
