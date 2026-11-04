import os
from PIL import Image

src_path = 'Asset/profile_hero.webp'
src = Image.open(src_path).convert('RGBA')

# 1. Multi-resolution favicon.ico
ico_sizes = [(16, 16), (32, 32), (48, 48)]
src.save('favicon.ico', format='ICO', sizes=ico_sizes)
print('Generated favicon.ico')

# 2. PNG favicons
png_specs = [
    ('favicon-16x16.png', (16, 16)),
    ('favicon-32x32.png', (32, 32)),
    ('favicon-48x48.png', (48, 48)),
    ('apple-touch-icon.png', (180, 180)),
    ('android-chrome-192x192.png', (192, 192)),
    ('android-chrome-512x512.png', (512, 512))
]

for filename, size in png_specs:
    resized = src.resize(size, Image.Resampling.LANCZOS)
    resized.save(filename, 'PNG', optimize=True)
    print(f'Generated {filename} ({size[0]}x{size[1]})')
