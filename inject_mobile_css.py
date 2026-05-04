import glob, re

HTML_FILES = glob.glob('*.html')

for f in HTML_FILES:
    with open(f, 'r', encoding='utf-8') as fh:
        c = fh.read()

    # Skip if already has mobile.css
    if 'mobile.css' in c:
        print(f'Skipped {f} (already has mobile.css)')
        continue

    # Inject after style.css link
    c = c.replace(
        '<link rel="stylesheet" href="css/style.css">',
        '<link rel="stylesheet" href="css/style.css">\n    <link rel="stylesheet" href="css/mobile.css">'
    )

    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(c)
    print(f'Injected mobile.css into {f}')
