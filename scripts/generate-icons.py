import os
import shutil
from PIL import Image

src_path = r'C:\Users\yasin\.gemini\antigravity-ide\brain\01998168-87a3-4fb9-9d5c-f3a18a1e146f\.user_uploaded\media_1791370904888.jpg'

if not os.path.exists(src_path):
    raise FileNotFoundError(f"Source image not found: {src_path}")

img = Image.open(src_path).convert('RGBA')

# Target directories
os.makedirs('public', exist_ok=True)
os.makedirs('public/downloads', exist_ok=True)
os.makedirs('electron', exist_ok=True)
os.makedirs('src/app', exist_ok=True)

# 1. Generate ICO files with multiple icon sizes for Windows Explorer & Shortcuts
ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]

electron_ico = 'electron/app.ico'
public_ico = 'public/favicon.ico'
app_ico = 'src/app/favicon.ico'
downloads_ico = 'public/downloads/app.ico'

img.save(electron_ico, format='ICO', sizes=ico_sizes)
shutil.copyfile(electron_ico, public_ico)
shutil.copyfile(electron_ico, app_ico)
shutil.copyfile(electron_ico, downloads_ico)
print(f"Generated ICO files: {electron_ico}, {public_ico}, {downloads_ico}")

# 2. Generate PNG icons for Web, PWA, and desktop UI
img.save('public/logo.png', format='PNG')
img.resize((512, 512), Image.Resampling.LANCZOS).save('public/icon.png', format='PNG')
img.resize((512, 512), Image.Resampling.LANCZOS).save('public/icon-512.png', format='PNG')
img.resize((192, 192), Image.Resampling.LANCZOS).save('public/icon-192.png', format='PNG')
img.resize((64, 64), Image.Resampling.LANCZOS).save('public/icon-64.png', format='PNG')
img.resize((32, 32), Image.Resampling.LANCZOS).save('public/icon-32.png', format='PNG')
print("Generated all PNG icons in public/")
