import os
from PIL import Image, ImageDraw

WORKSPACE = r"e:\Antygravity\Tejas Portfolio website"
ART_DIR = r"C:\Users\tejas\.gemini\antigravity\brain\10f59182-aa1e-401e-9da6-01c6e829ceaf"

avatar_path = os.path.join(WORKSPACE, "Asset", "uploaded_profile_hero.jpg")
avatar = Image.open(avatar_path).convert("RGBA")

# Create circular mask for avatar
avatar_size = 210
avatar_resized = avatar.resize((avatar_size, avatar_size), Image.Resampling.LANCZOS)

mask = Image.new("L", (avatar_size, avatar_size), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse((0, 0, avatar_size, avatar_size), fill=255)

# Add thick white border ring around avatar matching LinkedIn UI
border_size = avatar_size + 14
avatar_ring = Image.new("RGBA", (border_size, border_size), (0, 0, 0, 0))
ring_draw = ImageDraw.Draw(avatar_ring)
ring_draw.ellipse((0, 0, border_size, border_size), fill=(255, 255, 255, 255))
avatar_ring.paste(avatar_resized, (7, 7), mask=mask)

banner_name = "linkedin_banner_final_hero_1584x396.png"
mockup_name = "mockup_desktop_final_hero.png"

banner_file = os.path.join(WORKSPACE, banner_name)
banner = Image.open(banner_file).convert("RGBA")

mockup_h = 470
mockup = Image.new("RGBA", (1584, mockup_h), (16, 17, 22, 255))
mockup.paste(banner, (0, 0))

card_draw = ImageDraw.Draw(mockup)
card_draw.rectangle([0, 396, 1584, mockup_h], fill=(17, 18, 23, 255))
card_draw.line([0, 396, 1584, 396], fill=(36, 38, 48, 255), width=2)

# Paste circular avatar onto the yellow highlight dock (x: 42, y: 236)
avatar_x = 42
avatar_y = 236
mockup.paste(avatar_ring, (avatar_x, avatar_y), avatar_ring)

out_ws = os.path.join(WORKSPACE, mockup_name)
out_art = os.path.join(ART_DIR, mockup_name)
mockup.save(out_ws)
mockup.save(out_art)
print(f"Saved {mockup_name}")
