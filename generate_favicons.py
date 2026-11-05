import os
from PIL import Image, ImageDraw

src_path = 'Asset/profile_hero.webp'
src = Image.open(src_path).convert('RGBA')
w, h = src.size

# 1. High-resolution antialiased circular mask
scale = 4
big_w, big_h = w * scale, h * scale

mask_hi = Image.new('L', (big_w, big_h), 0)
draw_mask = ImageDraw.Draw(mask_hi)
# Inset slightly (2px) to ensure no border clipping
inset = 3
draw_mask.ellipse([inset, inset, big_w - inset - 1, big_h - inset - 1], fill=255)
mask = mask_hi.resize((w, h), Image.Resampling.LANCZOS)

# Create transparent circular image
circ_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
circ_img.paste(src, (0, 0), mask=mask)

# Add a subtle clean outline so the yellow circle stands out against light and dark tabs
border_layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
border_draw = ImageDraw.Draw(border_layer)
border_draw.ellipse([1, 1, w - 2, h - 2], outline=(220, 195, 0, 200), width=3)
circ_img = Image.alpha_composite(circ_img, border_layer)

# 2. Multi-resolution favicon.ico with transparency
ico_sizes = [(16, 16), (32, 32), (48, 48)]
circ_img.save('favicon.ico', format='ICO', sizes=ico_sizes)
print('Generated circular favicon.ico with sizes (16, 32, 48)')

# 3. PNG favicons
png_specs = [
    ('favicon-16x16.png', (16, 16)),
    ('favicon-32x32.png', (32, 32)),
    ('favicon-48x48.png', (48, 48)),
    ('apple-touch-icon.png', (180, 180)),
    ('android-chrome-192x192.png', (192, 192)),
    ('android-chrome-512x512.png', (512, 512))
]

for filename, size in png_specs:
    resized = circ_img.resize(size, Image.Resampling.LANCZOS)
    resized.save(filename, 'PNG', optimize=True)
    print(f'Generated circular {filename} ({size[0]}x{size[1]})')

# Verify transparency
print('Corner pixel of 32x32:', Image.open('favicon-32x32.png').getpixel((0, 0)))
