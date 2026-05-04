import os
import glob
from PIL import Image

image_dir = 'images'
output_dir = 'images' # Overwrite or same dir

supported_extensions = ['*.png', '*.jpg', '*.jpeg']
files = []
for ext in supported_extensions:
    files.extend(glob.glob(os.path.join(image_dir, ext)))

for file_path in files:
    try:
        img = Image.open(file_path)
        
        # Resize if too large
        max_width = 1920
        if img.width > max_width:
            height = int((max_width / img.width) * img.height)
            img = img.resize((max_width, height), Image.LANCZOS)
            print(f"Resized {file_path}")

        # Convert to WebP
        base_name = os.path.splitext(file_path)[0]
        webp_path = base_name + '.webp'
        
        img.save(webp_path, 'WEBP', quality=75)
        print(f"Converted {file_path} to {webp_path}")
        
        # Optional: remove original to save space (but let's keep it for now and just update HTML)
        # os.remove(file_path)
        
    except Exception as e:
        print(f"Failed to process {file_path}: {e}")
