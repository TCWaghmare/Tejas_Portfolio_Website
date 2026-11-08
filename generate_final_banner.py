import os
import subprocess
import base64
from PIL import Image

WORKSPACE = r"e:\Antygravity\Tejas Portfolio website"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def load_base64(path):
    if not os.path.isabs(path):
        path = os.path.join(WORKSPACE, path)
    if not os.path.exists(path):
        print(f"Warning: {path} not found")
        return ""
    with open(path, "rb") as f:
        data = f.read()
    
    # Determine mime type
    ext = os.path.splitext(path)[1].lower()
    if ext == ".png": mime = "image/png"
    elif ext in [".jpg", ".jpeg"]: mime = "image/jpeg"
    elif ext == ".webp": mime = "image/webp"
    elif ext == ".svg": mime = "image/svg+xml"
    else:
        # Check magic bytes for files without extension
        if data.startswith(b'\xff\xd8'): mime = "image/jpeg"
        elif data.startswith(b'\x89PNG'): mime = "image/png"
        elif data.startswith(b'RIFF'): mime = "image/webp"
        else: mime = "image/jpeg"
        
    return f"data:{mime};base64,{base64.b64encode(data).decode('utf-8')}"

# Load real tool logos strictly from 'tool logos'
b64_pbi = load_base64("tool logos/power bi logo.jpg")
b64_fabric = load_base64("tool logos/fabric logo")
b64_mssql = load_base64("tool logos/microsoft-sql-server.png")
b64_postgres = load_base64("tool logos/postgres sql logo.jpg")
b64_vscode = load_base64("tool logos/vs code logo.jpg")
b64_copilot = load_base64("tool logos/copilot logo.jpg")
b64_claude = load_base64("tool logos/claude logo.png")
b64_chatgpt = load_base64("tool logos/chatgpt")
b64_gemini = load_base64("tool logos/gemini logo.jpg")
b64_antigravity = load_base64("tool logos/antygraity")
b64_notion = load_base64("tool logos/notion-logo.webp")

# Supporting logos from Asset/tools
b64_python = load_base64("Asset/tools/python.svg")
b64_excel = load_base64("Asset/tools/excel.svg")
b64_github = load_base64("Asset/tools/github.svg")

# Badges and Hero Portrait
b64_pl300 = load_base64("Badges/pl 300.png")
b64_dp600 = load_base64("Badges/dp 600.png")
b64_dp700 = load_base64("Badges/dp 700.png")
b64_hero = load_base64("Asset/uploaded_profile_hero.jpg")

FONTS_IMPORT = """
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=DM+Sans:ital,opsz,wght@0,9..40,300..800;1,9..40,300..800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
"""

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
{FONTS_IMPORT}
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{
  width: 1584px;
  height: 396px;
  overflow: hidden;
  background-color: #08090c;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}}

.banner-canvas {{
  position: relative;
  width: 1584px;
  height: 396px;
  background: 
    radial-gradient(circle at 11% 88%, rgba(245, 224, 37, 0.28) 0%, rgba(245, 224, 37, 0.10) 35%, transparent 60%),
    radial-gradient(circle at 55% 15%, rgba(245, 224, 37, 0.05) 0%, transparent 45%),
    linear-gradient(135deg, #07080b 0%, #0f1015 50%, #14151b 100%);
  display: grid;
  grid-template-columns: 330px 1fr 396px;
  overflow: hidden;
}}

/* Subtle tech grid mesh */
.bg-grid {{
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 36px 36px;
  pointer-events: none;
}}

/* =========================================================================
   1. LEFT COLUMN: TOOLS STARTING STRICTLY FROM TOP-LEFT + YELLOW AVATAR HIGHLIGHT
   ========================================================================= */
.left-col {{
  position: relative;
  z-index: 2;
  padding: 20px 14px 20px 28px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* STRICTLY TOP-LEFT */
  gap: 10px;
}}

.section-label {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}}

.section-label .dot {{
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #F5E025;
  box-shadow: 0 0 8px #F5E025;
}}

/* Priority 1 & Priority 2 Groups */
.tier-group {{
  display: flex;
  flex-direction: column;
  gap: 5px;
}}

.tier-caption {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #9da3af;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}}

.tools-grid {{
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}}

.tool-chip {{
  background: rgba(20, 21, 28, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  padding: 5px 7px;
  display: flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
}}

.tool-chip.p1 {{
  border-color: rgba(245, 224, 37, 0.3);
  background: rgba(245, 224, 37, 0.06);
}}

.tool-chip img {{
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 4px;
  flex-shrink: 0;
}}

.tool-chip span {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #f3f4f6;
  white-space: nowrap;
}}

/* =========================================================================
   YELLOW HIGHLIGHT DOCK WHERE LINKEDIN PROFILE PICTURE COMES
   ========================================================================= */
.avatar-highlight-dock {{
  position: absolute;
  left: 36px;
  bottom: -46px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
}}

/* Outer pulsing ambient amber aura */
.avatar-highlight-aura {{
  position: absolute;
  inset: -15px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 224, 37, 0.4) 0%, rgba(245, 224, 37, 0.15) 50%, transparent 72%);
  filter: blur(12px);
}}

/* Stylized glowing dashed contour ring */
.avatar-highlight-ring {{
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2.5px dashed rgba(245, 224, 37, 0.85);
  box-shadow: 0 0 20px rgba(245, 224, 37, 0.4), inset 0 0 20px rgba(245, 224, 37, 0.15);
}}

/* Elegant indicator badge marking profile position */
.avatar-dock-tag {{
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(14, 15, 20, 0.95);
  border: 1px solid rgba(245, 224, 37, 0.6);
  padding: 3px 10px;
  border-radius: 9999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 800;
  color: #F5E025;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  white-space: nowrap;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
}}

.avatar-dock-tag .sparkle {{
  font-size: 10px;
}}

/* =========================================================================
   2. CENTER COLUMN: IDENTITY & CENTERED MICROSOFT BADGES
   ========================================================================= */
.center-col {{
  position: relative;
  z-index: 2;
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
}}

.open-pill {{
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(245, 224, 37, 0.1);
  border: 1px solid rgba(245, 224, 37, 0.35);
  padding: 4px 14px;
  border-radius: 9999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 0.5px;
}}

.green-dot {{
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}}

.hero-name {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 45px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.8px;
  color: #ffffff;
}}

.hero-name .gold {{
  color: #F5E025;
  text-shadow: 0 0 25px rgba(245, 224, 37, 0.35);
}}

.hero-role {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #e5e7eb;
  display: flex;
  align-items: baseline;
  gap: 6px;
}}

.hero-role .serif {{
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-size: 23px;
  color: #F5E025;
}}

/* Centered Microsoft Badges Showcase */
.badges-center-panel {{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: rgba(18, 19, 26, 0.9);
  border: 1px solid rgba(245, 224, 37, 0.3);
  padding: 10px 24px 8px;
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  width: fit-content;
}}

.badges-header-text {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 1px;
  text-transform: uppercase;
}}

.badges-trio-row {{
  display: flex;
  align-items: center;
  gap: 22px;
}}

.badge-item {{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}}

.badge-item img {{
  width: 76px;
  height: 76px;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55));
}}

.badge-item span.code {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 800;
  color: #F5E025;
}}

.badge-item span.label {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: #d1d5db;
}}

/* Contact Bar (Gmail + Portfolio Web) */
.contact-dock {{
  display: flex;
  align-items: center;
  gap: 12px;
}}

.contact-pill {{
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(18, 19, 25, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 5px 14px;
  border-radius: 9999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 600;
  color: #ffffff;
}}

.contact-pill.web {{
  background: rgba(245, 224, 37, 0.12);
  border-color: rgba(245, 224, 37, 0.4);
  color: #F5E025;
  font-weight: 700;
}}

/* =========================================================================
   3. RIGHT COLUMN: FULL-HEIGHT HERO PORTRAIT (COVERING UPPER & LOWER END)
   ========================================================================= */
.right-col {{
  position: relative;
  width: 396px;
  height: 396px;
  overflow: hidden;
  clip-path: polygon(14% 0, 100% 0, 100% 100%, 0% 100%);
  background-color: #FFDF01;
}}

.right-portrait-img {{
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  image-rendering: -webkit-optimize-contrast;
}}

.slanted-border-glow {{
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 14%;
  pointer-events: none;
  background: linear-gradient(90deg, rgba(245, 224, 37, 0.3) 0%, transparent 100%);
}}
</style>
</head>
<body>
  <div class="banner-canvas">
    <div class="bg-grid"></div>

    <!-- 1. LEFT COLUMN: Tools Strictly Top-Left + Yellow Avatar Highlight Dock -->
    <div class="left-col">
      <div class="section-label">
        <span class="dot"></span>
        <span>Technical Arsenal</span>
      </div>

      <!-- Priority 1: Core BI & Data Stack -->
      <div class="tier-group">
        <span class="tier-caption">Core BI &amp; Data Stack (Priority 1)</span>
        <div class="tools-grid">
          <div class="tool-chip p1" title="Power BI (from tool logos)">
            <img src="{b64_pbi}" alt="Power BI">
            <span>Power BI</span>
          </div>
          <div class="tool-chip p1" title="Microsoft Fabric (from tool logos)">
            <img src="{b64_fabric}" alt="Fabric">
            <span>Fabric</span>
          </div>
          <div class="tool-chip p1" title="MS SQL Server (from tool logos)">
            <img src="{b64_mssql}" alt="SQL">
            <span>SQL</span>
          </div>
          <div class="tool-chip p1" title="Python">
            <img src="{b64_python}" alt="Python">
            <span>Python</span>
          </div>
          <div class="tool-chip p1" title="Microsoft Excel">
            <img src="{b64_excel}" alt="Excel">
            <span>Excel</span>
          </div>
          <div class="tool-chip p1" title="PostgreSQL (from tool logos)">
            <img src="{b64_postgres}" alt="PostgreSQL">
            <span>Postgres</span>
          </div>
        </div>
      </div>

      <!-- Priority 2: AI & Dev Environment -->
      <div class="tier-group">
        <span class="tier-caption">AI &amp; Dev Environment (Priority 2)</span>
        <div class="tools-grid">
          <div class="tool-chip" title="VS Code (from tool logos)">
            <img src="{b64_vscode}" alt="VS Code">
            <span>VS Code</span>
          </div>
          <div class="tool-chip" title="GitHub">
            <img src="{b64_github}" alt="GitHub">
            <span>GitHub</span>
          </div>
          <div class="tool-chip" title="GitHub Copilot (from tool logos)">
            <img src="{b64_copilot}" alt="Copilot">
            <span>Copilot</span>
          </div>
          <div class="tool-chip" title="Claude (from tool logos)">
            <img src="{b64_claude}" alt="Claude">
            <span>Claude</span>
          </div>
          <div class="tool-chip" title="Google Gemini (from tool logos)">
            <img src="{b64_gemini}" alt="Gemini">
            <span>Gemini</span>
          </div>
          <div class="tool-chip" title="ChatGPT (from tool logos)">
            <img src="{b64_chatgpt}" alt="ChatGPT">
            <span>ChatGPT</span>
          </div>
        </div>
      </div>

      <!-- Yellow Highlight Dock where LinkedIn Profile Photo Appears -->
      <div class="avatar-highlight-dock" title="LinkedIn Profile Picture Dock">
        <div class="avatar-highlight-aura"></div>
        <div class="avatar-highlight-ring"></div>
        <div class="avatar-dock-tag">
          <span class="sparkle">&#10024;</span>
          <span>Profile Photo Dock</span>
        </div>
      </div>
    </div>

    <!-- 2. CENTER COLUMN: Name, Role, Badges in Center, Contacts -->
    <div class="center-col">
      <div class="open-pill">
        <span class="green-dot"></span>
        <span>OPEN FOR OPPORTUNITIES</span>
      </div>

      <h1 class="hero-name">TEJAS <span class="gold">WAGHMARE</span></h1>

      <div class="hero-role">
        <span>Data Analyst &amp; BI Specialist</span>
        <span class="serif">&mdash; Turning Data into Decisions</span>
      </div>

      <!-- Centered Microsoft Badges Showcase -->
      <div class="badges-center-panel">
        <div class="badges-header-text">&#9733; 3x Microsoft Certified Associate &#9733;</div>
        <div class="badges-trio-row">
          <div class="badge-item">
            <img src="{b64_pl300}" alt="PL-300">
            <span class="code">PL-300</span>
            <span class="label">Power BI Analyst</span>
          </div>
          <div class="badge-item">
            <img src="{b64_dp600}" alt="DP-600">
            <span class="code">DP-600</span>
            <span class="label">Fabric Analytics</span>
          </div>
          <div class="badge-item">
            <img src="{b64_dp700}" alt="DP-700">
            <span class="code">DP-700</span>
            <span class="label">Fabric Data Eng</span>
          </div>
        </div>
      </div>

      <!-- Contact Bar (Gmail + Portfolio Web) -->
      <div class="contact-dock">
        <div class="contact-pill" title="Email Tejas">
          <span>&#9993;</span>
          <span>tejaswaghmare900@gmail.com</span>
        </div>
        <div class="contact-pill web" title="Visit Portfolio Website">
          <span>&#127760;</span>
          <span>tejaswaghmare.me</span>
        </div>
      </div>
    </div>

    <!-- 3. RIGHT COLUMN: Full-Height Hero Portrait Covering Upper and Lower End -->
    <div class="right-col">
      <img src="{b64_hero}" alt="Tejas Waghmare" class="right-portrait-img">
      <div class="slanted-border-glow"></div>
    </div>

  </div>
</body>
</html>
"""

html_file = os.path.join(WORKSPACE, "banner_final_hero_edition.html")
with open(html_file, "w", encoding="utf-8") as f:
    f.write(html_content)
print("Wrote banner_final_hero_edition.html")

html_url = "file:///" + html_file.replace("\\", "/")

# 1. Standard 1584x396 (1x)
out_1x = os.path.join(WORKSPACE, "linkedin_banner_final_hero_1584x396.png")
cmd_1x = [
    CHROME_PATH,
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1584,396",
    f"--screenshot={out_1x}",
    html_url
]
subprocess.run(cmd_1x, capture_output=True, text=True)

# 2. Ultra-HD 3168x792 (2x Retina)
out_2x = os.path.join(WORKSPACE, "linkedin_banner_final_hero_3168x792_retina.png")
cmd_2x = [
    CHROME_PATH,
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    "--window-size=1584,396",
    f"--screenshot={out_2x}",
    html_url
]
subprocess.run(cmd_2x, capture_output=True, text=True)

for p in [out_1x, out_2x]:
    if os.path.exists(p):
        im = Image.open(p)
        print(f"Generated: {os.path.basename(p)} - {im.size} - {os.path.getsize(p):,} bytes")
    else:
        print(f"Failed to generate {p}")

print("Final banners generated successfully!")

