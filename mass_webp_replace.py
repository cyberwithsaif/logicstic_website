import os
import re

def replace_in_files():
    # Target extensions to replace
    extensions = ['.png', '.jpg', '.jpeg']
    replacement = '.webp'
    
    # Files to process
    target_files = []
    for root, dirs, files in os.walk('.'):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
        for file in files:
            if file.endswith(('.html', '.js', '.json')):
                target_files.append(os.path.join(root, file))
    
    for file_path in target_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for ext in extensions:
                # Use regex to replace only when it looks like a file extension in a path
                # e.g., images/logo.png -> images/logo.webp
                new_content = re.sub(re.escape(ext), replacement, new_content, flags=re.IGNORECASE)
            
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated: {file_path}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    replace_in_files()
