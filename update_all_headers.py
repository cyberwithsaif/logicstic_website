import glob

old_cta = '''            <div class="header-cta">
                <a href="contact.html" class="btn btn-primary">Get a Quote</a>'''

new_cta = '''            <div class="header-cta">
                <a href="contact.html" class="cssbuttons-io-button">
                    Get a Quote
                    <div class="icon">
                        <svg height="24" width="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0 0h24v24H0z" fill="none"></path>
                            <path d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z"
                                fill="currentColor"></path>
                        </svg>
                    </div>
                </a>'''

files = glob.glob('*.html')
count = 0

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_cta in content:
        new_content = content.replace(old_cta, new_cta)
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += 1

print(f'Updated header CTA in {count} files.')
