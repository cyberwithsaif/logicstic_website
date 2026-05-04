import os, glob

html_files = glob.glob('*.html')

find_logo = 'logo/ChatGPT-Image-Jan-7-2026-03_34_11-PM-300x200.png'
replace_logo = 'images/logo.png'

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace(find_logo, replace_logo)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_content)

print(f'Replaced image paths in {len(html_files)} files.')
