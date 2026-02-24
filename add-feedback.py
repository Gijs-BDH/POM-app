#!/usr/bin/env python3
import os
import glob

script_tag = '  <script type="module" src="/feedback/init-feedback.js"></script>\n'

html_files = glob.glob('*.html')
html_files = [f for f in html_files if not f.startswith('feedback/')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    if '/feedback/init-feedback.js' in content:
        print(f'Skipping {file} - already has feedback script')
        continue

    content = content.replace('</body>', f'{script_tag}</body>')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'Added feedback to {file}')

print('Done!')
