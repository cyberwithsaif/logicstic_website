import glob, re

HTML_FILES = glob.glob('*.html')

NEW_HEAD = '''    <!-- Preconnect to external resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdnjs.cloudflare.com">

    <!-- Google Fonts (non-blocking) -->
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- CSS -->
    <link rel="stylesheet" href="css/style.css">

    <!-- FontAwesome (deferred) -->
    <link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></noscript>'''

PAGE_LOADER = '''
    <!-- Page Loader -->
    <div id="page-loader">
        <div class="loader-inner">
            <div class="loader-logo">AGL</div>
            <div class="loader-bar"><div class="loader-progress"></div></div>
        </div>
    </div>

'''

LOADER_SCRIPT = '''
    <script>
        window.addEventListener('load', () => {
            const loader = document.getElementById('page-loader');
            if (loader) { loader.classList.add('loader-hidden'); setTimeout(() => loader.remove(), 600); }
        });
        setTimeout(() => {
            const loader = document.getElementById('page-loader');
            if (loader) { loader.classList.add('loader-hidden'); setTimeout(() => loader.remove(), 600); }
        }, 2500);
    </script>'''

for f in HTML_FILES:
    with open(f, 'r', encoding='utf-8') as fh:
        c = fh.read()

    # Skip already done
    if 'preconnect' in c and 'page-loader' in c:
        print(f'Skipped {f} (already optimized)')
        continue

    # Replace old head block (CSS + FontAwesome links)
    c = re.sub(
        r'\s*<!-- CSS -->\s*<link rel="stylesheet" href="css/style\.css">.*?<!-- FontAwesome.*?-->\s*<link rel="stylesheet" href="https://cdnjs\.cloudflare\.com[^"]*">',
        '\n' + NEW_HEAD,
        c, flags=re.DOTALL
    )

    # Add loader right after <body>
    c = c.replace('<body>\n', '<body>\n' + PAGE_LOADER, 1)

    # Defer scripts
    c = c.replace('<script src="js/script.js"></script>', '<script src="js/script.js" defer></script>')
    c = c.replace('<script src="js/dynamic-content.js"></script>', '<script src="js/dynamic-content.js" defer></script>')

    # Add loader script before </body>
    if 'loader-hidden' not in c:
        c = c.replace('</body>', LOADER_SCRIPT + '\n</body>')

    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(c)
    print(f'Optimized {f}')
