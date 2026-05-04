import glob

script_tag = '<script src="js/dynamic-content.js"></script>'

files = glob.glob('*.html')
count = 0

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if script_tag not in content:
        if '</body>' in content:
            new_content = content.replace('</body>', f'    {script_tag}\n</body>')
            with open(file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            count += 1

print(f'Added dynamic content script to {count} files.')
