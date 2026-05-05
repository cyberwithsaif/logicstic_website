import glob

old_logo = '''            <a href="index.html" class="logo">
                <img src="images/logo.png" alt="Ashtam Global Logistics" class="site-logo">
            </a>'''

new_logo = '''            <a href="index.html" class="logo">
                <img src="images/logo.png" alt="Ashtam Global Logistics" class="site-logo">
                <span class="logo-text">Ashtam Global Logistics</span>
            </a>'''

files = glob.glob('*.html')
count = 0

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_logo in content:
        new_content = content.replace(old_logo, new_logo)
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += 1

print(f'Updated logo text in {count} files.')
