import glob
import re

html_files = glob.glob('*.html')
css_files = glob.glob('css/*.css')

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Update extensions to .webp
    new_content = re.sub(r'(src="|url\()([^"]+)\.(png|jpg|jpeg)', r'\1\2.webp', content)
    
    # 2. Add loading="lazy" to images that don't have it (and aren't the logo)
    # We look for <img ... >
    def add_lazy(match):
        img_tag = match.group(0)
        if 'loading=' in img_tag or 'logo.webp' in img_tag:
            return img_tag
        return img_tag.replace('<img ', '<img loading="lazy" ')

    new_content = re.sub(r'<img [^>]+>', add_lazy, new_content)
    
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file}")

for file in css_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(r'url\(([^)]+)\.(png|jpg|jpeg)\)', r'url(\1.webp)', content)
    
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file}")
