import glob
import re

# Update all images to .webp and add loading="lazy"
files = glob.glob('*.html') + glob.glob('css/*.css')

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace .png, .jpg, .jpeg with .webp (inside url() or src="")
    # Handles quotes, single quotes, or no quotes
    new_content = re.sub(r'(\.(?:png|jpg|jpeg))', '.webp', content)
    
    if '.html' in file_path:
        # Add loading="lazy" if not present
        def add_lazy(match):
            tag = match.group(0)
            if 'loading=' in tag or 'logo.webp' in tag:
                return tag
            return tag.replace('<img ', '<img loading="lazy" ')
        
        new_content = re.sub(r'<img [^>]+>', add_lazy, new_content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Optimized {file_path}")
