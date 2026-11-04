import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 630

# Create base canvas with deep matte graphite color #0c0e12
canvas = Image.new('RGBA', (W, H), (12, 14, 18, 255))

# Create an ambient glow layer
glow_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_layer)

# Yellow ambient glow behind the portrait (right side)
glow_draw.ellipse([740, 80, 1180, 520], fill=(245, 224, 37, 45))

# Subtle blue/indigo ambient glow in top-left
glow_draw.ellipse([20, 20, 480, 440], fill=(45, 95, 175, 25))

# Blur the ambient glow
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(60))
canvas = Image.alpha_composite(canvas, glow_layer)

# Draw subtle grid dots for high-tech data analytics vibe
grid_draw = ImageDraw.Draw(canvas)
for gx in range(40, W - 40, 36):
    for gy in range(40, H - 40, 36):
        # Don't draw dots right under the text or portrait
        if (50 <= gx <= 720 and 50 <= gy <= 580) or (740 <= gx <= 1160 and 60 <= gy <= 560):
            continue
        grid_draw.rectangle([gx, gy, gx + 1, gy + 1], fill=(255, 255, 255, 16))

# Fonts
font_dir = r"C:\Windows\Fonts"
font_bold = os.path.join(font_dir, "segoeuib.ttf")
font_reg = os.path.join(font_dir, "segoeui.ttf")

f_pill = ImageFont.truetype(font_bold, 14)
f_title = ImageFont.truetype(font_bold, 54)
f_subtitle = ImageFont.truetype(font_bold, 28)
f_desc = ImageFont.truetype(font_reg, 19)
f_pill_sm = ImageFont.truetype(font_bold, 14)
f_badge_code = ImageFont.truetype(font_bold, 15)
f_badge_title = ImageFont.truetype(font_bold, 13)
f_badge_sub = ImageFont.truetype(font_reg, 11)
f_url = ImageFont.truetype(font_bold, 17)
f_tag = ImageFont.truetype(font_reg, 14)
f_pill_badge = ImageFont.truetype(font_bold, 13)

draw = ImageDraw.Draw(canvas)

# Inset card border
draw.rounded_rectangle([12, 12, W - 12, H - 12], radius=24, outline=(38, 43, 54, 220), width=2)
# Glowing yellow corner accent lines
draw.line([(36, 12), (180, 12)], fill=(245, 224, 37, 255), width=2)
draw.line([(12, 36), (12, 180)], fill=(245, 224, 37, 255), width=2)

# --- LEFT COLUMN ---
# 1. Eyebrow Tag Pill
eyebrow_text = "MICROSOFT CERTIFIED DATA ANALYST"
eb_bbox = draw.textbbox((0, 0), eyebrow_text, font=f_pill)
eb_tw = eb_bbox[2] - eb_bbox[0]
eb_th = eb_bbox[3] - eb_bbox[1]
pill_w = eb_tw + 48
pill_h = 36
pill_x = 60
pill_y = 52

draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=18, fill=(22, 25, 33, 230), outline=(48, 55, 70, 255), width=1)
# Glowing yellow status dot
dot_cx = pill_x + 18
dot_cy = pill_y + pill_h // 2
draw.ellipse([dot_cx - 4, dot_cy - 4, dot_cx + 4, dot_cy + 4], fill=(245, 224, 37, 255))
draw.text((pill_x + 32, pill_y + (pill_h - eb_th) // 2 - 2), eyebrow_text, font=f_pill, fill=(230, 235, 245, 255))

# 2. Main Title (Tejas C. Waghmare)
draw.text((60, 108), "Tejas C. Waghmare", font=f_title, fill=(255, 255, 255, 255))

# 3. Subtitle / Role (Electric Yellow)
draw.text((60, 178), "Data Analyst & BI Specialist", font=f_subtitle, fill=(245, 224, 37, 255))

# 4. Description / Value Proposition
desc_line1 = "Uncovering marketplace patterns, building executive dashboards"
desc_line2 = "& driving data-informed decisions with Power BI, SQL & Fabric."
draw.text((60, 228), desc_line1, font=f_desc, fill=(175, 182, 198, 255))
draw.text((60, 256), desc_line2, font=f_desc, fill=(175, 182, 198, 255))

# 5. Core Tech Stack Pills
tech_skills = ["Power BI", "SQL & DAX", "Python", "Microsoft Fabric", "Excel"]
cur_x = 60
skill_y = 305
for skill in tech_skills:
    bbox = draw.textbbox((0, 0), skill, font=f_pill_sm)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pw = tw + 26
    ph = 32
    box = [cur_x, skill_y, cur_x + pw, skill_y + ph]
    draw.rounded_rectangle(box, radius=16, fill=(24, 27, 36, 230), outline=(50, 56, 72, 255), width=1)
    draw.text((cur_x + 13, skill_y + (ph - th) // 2 - 1), skill, font=f_pill_sm, fill=(235, 240, 250, 255))
    cur_x += pw + 12

# 6. Certification Badges Section
cert_label = "3X MICROSOFT CERTIFIED ASSOCIATE"
draw.text((60, 366), cert_label, font=f_badge_title, fill=(245, 224, 37, 245))

# Composite Badges (PL-300, DP-600, DP-700)
badges_info = [
    ("Badges/pl 300.png", "PL-300", "Power BI Analyst"),
    ("Badges/dp 600.png", "DP-600", "Fabric Analytics"),
    ("Badges/dp 700.png", "DP-700", "Fabric Data Eng")
]

badge_x = 60
badge_y = 396
card_w = 200
card_h = 66

for b_path, code, title in badges_info:
    if os.path.exists(b_path):
        b_img = Image.open(b_path).convert('RGBA')
        b_img = b_img.resize((50, 50), Image.Resampling.LANCZOS)
        
        card_box = [badge_x, badge_y, badge_x + card_w, badge_y + card_h]
        draw.rounded_rectangle(card_box, radius=14, fill=(20, 23, 30, 235), outline=(44, 49, 63, 255), width=1)
        
        # Paste badge image centered vertically in card
        canvas.alpha_composite(b_img, (badge_x + 8, badge_y + 8))
        
        # Text next to badge
        draw.text((badge_x + 68, badge_y + 13), code, font=f_badge_code, fill=(255, 255, 255, 255))
        draw.text((badge_x + 68, badge_y + 35), title, font=f_badge_sub, fill=(155, 163, 178, 255))
        
        badge_x += card_w + 14

# 7. Bottom Bar / Domain Watermark
bar_y = 502
draw.line([(60, bar_y), (690, bar_y)], fill=(34, 38, 49, 255), width=1)

url_str = "tcwaghmare.github.io"
url_bbox = draw.textbbox((0, 0), url_str, font=f_url)
url_tw = url_bbox[2] - url_bbox[0]
url_th = url_bbox[3] - url_bbox[1]
url_pill_w = url_tw + 52
url_pill_h = 38
url_pill_y = bar_y + 18

draw.rounded_rectangle([60, url_pill_y, 60 + url_pill_w, url_pill_y + url_pill_h], radius=19, fill=(245, 224, 37, 24), outline=(245, 224, 37, 190), width=1)
# Yellow dot inside URL pill
dot2_cx = 60 + 18
dot2_cy = url_pill_y + url_pill_h // 2
draw.ellipse([dot2_cx - 4, dot2_cy - 4, dot2_cx + 4, dot2_cy + 4], fill=(245, 224, 37, 255))
draw.text((60 + 32, url_pill_y + (url_pill_h - url_th) // 2 - 2), url_str, font=f_url, fill=(245, 224, 37, 255))

draw.text((60 + url_pill_w + 18, url_pill_y + 10), "•  Live Dashboards & Interactive Analytics", font=f_tag, fill=(160, 168, 185, 255))


# --- RIGHT COLUMN (HERO PORTRAIT) ---
port_size = 370
port_x = 760
port_y = 100

# Outer shadow / glow ring for the portrait
glow_ring = Image.new('RGBA', (W, H), (0, 0, 0, 0))
glow_ring_draw = ImageDraw.Draw(glow_ring)
glow_ring_draw.ellipse([port_x - 14, port_y - 14, port_x + port_size + 14, port_y + port_size + 14], fill=(245, 224, 37, 70))
glow_ring = glow_ring.filter(ImageFilter.GaussianBlur(18))
canvas = Image.alpha_composite(canvas, glow_ring)

# Load profile hero image
p_path = 'Asset/profile_hero.webp'
if not os.path.exists(p_path):
    p_path = 'Asset/hero_portrait_optimized.jpg'

hero_src = Image.open(p_path).convert('RGBA')
hero_src = hero_src.resize((port_size, port_size), Image.Resampling.LANCZOS)

# Antialiased circular mask
mask = Image.new('L', (port_size * 2, port_size * 2), 0)
mask_draw = ImageDraw.Draw(mask)
mask_draw.ellipse([0, 0, port_size * 2, port_size * 2], fill=255)
mask = mask.resize((port_size, port_size), Image.Resampling.LANCZOS)

hero_circle = Image.new('RGBA', (port_size, port_size), (0, 0, 0, 0))
hero_circle.paste(hero_src, (0, 0), mask=mask)
canvas.alpha_composite(hero_circle, (port_x, port_y))

# Crisp electric yellow border around circle
border_overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
border_draw = ImageDraw.Draw(border_overlay)
border_draw.ellipse([port_x, port_y, port_x + port_size, port_y + port_size], outline=(245, 224, 37, 255), width=4)
canvas = Image.alpha_composite(canvas, border_overlay)

# Floating badge overlay on bottom of portrait
badge_text = "★ 3x Certified Microsoft Associate"
b_bbox = draw.textbbox((0, 0), badge_text, font=f_pill_badge)
b_tw = b_bbox[2] - b_bbox[0]
b_th = b_bbox[3] - b_bbox[1]
b_pw = b_tw + 36
b_ph = 36
b_px = port_x + (port_size - b_pw) // 2
b_py = port_y + port_size - 22

badge_draw = ImageDraw.Draw(canvas)
badge_draw.rounded_rectangle([b_px, b_py, b_px + b_pw, b_py + b_ph], radius=18, fill=(16, 18, 24, 250), outline=(245, 224, 37, 255), width=2)
badge_draw.text((b_px + (b_pw - b_tw) // 2, b_py + (b_ph - b_th) // 2 - 2), badge_text, font=f_pill_badge, fill=(255, 255, 255, 255))

# Save output files
# 1. High Quality JPG (ideal for WhatsApp < 300KB and LinkedIn)
rgb_canvas = canvas.convert('RGB')
jpg_path = 'Asset/og-image.jpg'
rgb_canvas.save(jpg_path, 'JPEG', quality=90, optimize=True)

# 2. High Quality PNG
png_path = 'Asset/og-image.png'
canvas.save(png_path, 'PNG', optimize=True)

print(f"Generated {jpg_path} ({os.path.getsize(jpg_path)} bytes)")
print(f"Generated {png_path} ({os.path.getsize(png_path)} bytes)")
