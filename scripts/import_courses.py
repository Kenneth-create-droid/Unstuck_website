#!/usr/bin/env python3
"""Import locally saved Ontario Tech Acalog course-description HTML pages."""
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import parse_qs, urlparse
import json, re, sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'catalogue-pages'
DEST = ROOT / 'web' / 'src' / 'data' / 'courses.json'
PATTERN = re.compile(r'^([A-Z]{3,5}\s+\d{4}[A-Z]?)\s*[–—-]\s*(.+)$')
records = {}
page_numbers = set()
files = sorted(SOURCE.glob('*.html'))
if not files:
    sys.exit(f'No HTML files found in {SOURCE}. Save the catalogue pages there first.')
for file in files:
    soup = BeautifulSoup(file.read_text(encoding='utf-8', errors='replace'), 'html.parser')
    page_courses = 0
    for a in soup.select('a[href*="preview_course"]'):
        label = ' '.join(a.get_text(' ', strip=True).split())
        m = PATTERN.match(label)
        if m:
            code, name = m.groups()
            records[code] = {'code': code, 'name': name.strip()}
            page_courses += 1
    # infer page from filename, if numbered by the user; page 1 is the plain filename
    n = re.search(r'(?:page|courses)[-_ ]?(\d{1,2})', file.stem, re.I)
    if n:
        page_numbers.add(int(n.group(1)))
    elif file.stem.lower() in ('page1','page-1','courses1','courses-1'):
        page_numbers.add(1)
    print(f'{file.name}: {page_courses} entries')
if not records:
    sys.exit('No valid course entries found. Nothing written.')
DEST.parent.mkdir(parents=True, exist_ok=True)
DEST.write_text(json.dumps(sorted(records.values(), key=lambda x:x['code']), indent=2, ensure_ascii=False)+'\n')
print(f'\nSaved {len(records)} unique courses to {DEST}')
print(f'Files inspected: {len(files)}. Expected catalogue pages: 14.')
if len(files) < 14:
    print('WARNING: Fewer than 14 saved pages. Catalogue is INCOMPLETE.')
else:
    print('Check that pages 1–14 are distinct; file count alone does not prove completeness.')
