import glob
import re

files = glob.glob('*.html')

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace href="filename.html" with href="filename"
    # Avoiding external links or links starting with http
    new_content = re.sub(r'href="([^":]+)\.html"', r'href="\1"', content)
    
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated links in {file}")
