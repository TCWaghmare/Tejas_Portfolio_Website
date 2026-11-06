import os
from PIL import Image, ImageDraw

src_path = 'Asset/profile heroes image.png'
if not os.path.exists(src_path):
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

# Add a subtle clean gold/yellow outline so the circular avatar pops on both light and dark backgrounds
border_layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
border_draw = ImageDraw.Draw(border_layer)
border_draw.ellipse([1, 1, w - 2, h - 2], outline=(234, 179, 8, 230), width=4)
circ_img = Image.alpha_composite(circ_img, border_layer)

# 2. Multi-resolution favicon.ico with transparency (16, 32, 48)
ico_sizes = [(16, 16), (32, 32), (48, 48)]
circ_img.save('favicon.ico', format='ICO', sizes=ico_sizes)
print('Generated multi-resolution favicon.ico with sizes (16, 32, 48)')

# 3. Complete PNG Favicon Suite (Google, Chrome, Edge, Safari, Bing)
png_specs = [
    ('favicon-16x16.png', (16, 16)),
    ('favicon-32x32.png', (32, 32)),
    ('favicon-48x48.png', (48, 48)),
    ('favicon-96x96.png', (96, 96)),
    ('favicon-144x144.png', (144, 144)),
    ('apple-touch-icon.png', (180, 180)),
    ('android-chrome-192x192.png', (192, 192)),
    ('android-chrome-512x512.png', (512, 512))
]

for filename, size in png_specs:
    resized = circ_img.resize(size, Image.Resampling.LANCZOS)
    resized.save(filename, 'PNG', optimize=True)
    print(f'Generated circular {filename} ({size[0]}x{size[1]})')

# Generate crisp SVG favicon with embedded high-res circular avatar and gold rim
import base64
with open('android-chrome-192x192.png', 'rb') as f:
    b64_data = base64.b64encode(f.read()).decode('utf-8')

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="100%" height="100%">
  <defs>
    <clipPath id="circleClip">
      <circle cx="96" cy="96" r="92" />
    </clipPath>
  </defs>
  <circle cx="96" cy="96" r="94" fill="#131417" stroke="#eab308" stroke-width="4" />
  <image href="data:image/png;base64,{b64_data}" x="0" y="0" width="192" height="192" clip-path="url(#circleClip)" />
</svg>'''

with open('favicon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)
print('Generated favicon.svg (Vector SVG Favicon with high-res portrait and gold rim)')

# 4. Generate high-resolution Search Snippet Portrait Thumbnails
# Google, Bing, Yahoo search snippet thumbnail requirements:
# High-resolution, square aspect ratio, solid RGB background so it displays cleanly in search result cards
portrait_square = Image.new('RGB', (800, 800), (19, 20, 23)) # Dark graphite background matching portfolio theme
# Composite circular image onto dark background
portrait_square.paste(circ_img, (0, 0), mask=circ_img.split()[3])

# Save as JPEG and PNG for rich snippet thumbnails and Schema.org
portrait_square.save('Asset/tejas-waghmare-data-analyst.jpg', 'JPEG', quality=95, optimize=True)
print('Generated Asset/tejas-waghmare-data-analyst.jpg (800x800 RGB)')

circ_img.save('Asset/tejas-waghmare-data-analyst.png', 'PNG', optimize=True)
print('Generated Asset/tejas-waghmare-data-analyst.png (800x800 RGBA)')

# Also save a clean light-background version if needed or standard headshot
portrait_light = Image.new('RGB', (800, 800), (255, 255, 255))
portrait_light.paste(circ_img, (0, 0), mask=circ_img.split()[3])
portrait_light.save('Asset/tejas-waghmare-headshot-light.jpg', 'JPEG', quality=95, optimize=True)
print('Generated Asset/tejas-waghmare-headshot-light.jpg (800x800 RGB)')

print('All favicon and search thumbnail assets generated successfully!')
