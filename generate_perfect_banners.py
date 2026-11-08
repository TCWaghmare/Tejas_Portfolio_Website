import os
import subprocess
import base64
from PIL import Image

WORKSPACE = r"e:\Antygravity\Tejas Portfolio website"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def get_base64_file(rel_path):
    full_path = os.path.join(WORKSPACE, rel_path)
    if not os.path.exists(full_path):
        print(f"Warning: {full_path} not found")
        return ""
    with open(full_path, "rb") as f:
        data = f.read()
    ext = os.path.splitext(full_path)[1].lower().replace(".", "")
    if ext == "jpg": ext = "jpeg"
    elif ext == "svg": ext = "svg+xml"
    return f"data:image/{ext};base64,{base64.b64encode(data).decode('utf-8')}"

# Profile Image (Covers upper and lower end on right side)
b64_profile_hero = get_base64_file("Asset/uploaded_profile_hero.jpg")

# Microsoft Badges (Centered)
b64_pl300 = get_base64_file("Badges/pl 300.png")
b64_dp600 = get_base64_file("Badges/dp 600.png")
b64_dp700 = get_base64_file("Badges/dp 700.png")

# All Priority Tool Logos from Asset/tools
b64_powerbi = get_base64_file("Asset/tools/powerbi.svg")
b64_fabric = get_base64_file("Asset/tools/fabric.svg")
b64_mssql = get_base64_file("Asset/tools/mssql.svg")
b64_python = get_base64_file("Asset/tools/python.svg")
b64_excel = get_base64_file("Asset/tools/excel.svg")
b64_postgres = get_base64_file("Asset/tools/postgresql.svg")

b64_vscode = get_base64_file("Asset/tools/vscode.svg")
b64_github = get_base64_file("Asset/tools/github.svg")
b64_copilot = get_base64_file("Asset/tools/copilot.svg")
b64_claude = get_base64_file("Asset/tools/claude.svg")
b64_gemini = get_base64_file("Asset/tools/gemini.svg")
b64_chatgpt = get_base64_file("Asset/tools/chatgpt.svg")

FONTS_IMPORT = """
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=DM+Sans:ital,opsz,wght@0,9..40,300..800;1,9..40,300..800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
"""

SHARED_CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 1584px;
  height: 396px;
  overflow: hidden;
  background-color: #0b0c10;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
"""

# ==============================================================================
# DESIGN 1: "The Executive Showcase" (Diagonal Angle Split & Centered Badges)
# ==============================================================================
html_design_1 = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
{FONTS_IMPORT}
<style>
{SHARED_CSS}

.banner-1 {{
  position: relative;
  width: 1584px;
  height: 396px;
  background: 
    radial-gradient(circle at 10% 80%, rgba(245, 224, 37, 0.12) 0%, transparent 40%),
    radial-gradient(circle at 55% 20%, rgba(245, 224, 37, 0.05) 0%, transparent 45%),
    linear-gradient(135deg, #090a0d 0%, #111217 50%, #15161d 100%);
  display: grid;
  grid-template-columns: 320px 1fr 396px;
  overflow: hidden;
}}

/* Subtle tech grid background */
.bg-grid {{
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 36px 36px;
  pointer-events: none;
}}

/* ================= 1. LEFT COLUMN: TOOLS BY PRIORITY ================= */
.left-col {{
  position: relative;
  z-index: 2;
  padding: 24px 16px 24px 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
}}

.section-label {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
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

/* Priority Tier 1: Core BI & Data */
.tier-group {{
  display: flex;
  flex-direction: column;
  gap: 6px;
}}

.tier-caption {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 600;
  color: #9da3af;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}}

.tools-grid {{
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}}

.tool-chip {{
  background: rgba(24, 25, 32, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 7px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}}

.tool-chip.priority-high {{
  border-color: rgba(245, 224, 37, 0.25);
  background: rgba(245, 224, 37, 0.04);
}}

.tool-chip img {{
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}}

.tool-chip span {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #e5e7eb;
  white-space: nowrap;
}}

/* ================= 2. CENTER COLUMN: IDENTITY & CENTERED BADGES ================= */
.center-col {{
  position: relative;
  z-index: 2;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
}}

.open-badge {{
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

.dot-green {{
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}}

.hero-name {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 44px;
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
  background: rgba(20, 21, 28, 0.85);
  border: 1px solid rgba(245, 224, 37, 0.3);
  padding: 10px 24px 8px;
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  width: fit-content;
}}

.badges-caption {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
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
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5));
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
  background: rgba(20, 21, 27, 0.9);
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

/* ================= 3. RIGHT COLUMN: FULL-HEIGHT HERO PORTRAIT ================= */
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
}}

.slanted-border-line {{
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 14%;
  pointer-events: none;
  filter: drop-shadow(-3px 0 10px rgba(0, 0, 0, 0.4));
}}

.slanted-border-line svg {{
  width: 100%;
  height: 100%;
}}
</style>
</head>
<body>
  <div class="banner-1">
    <div class="bg-grid"></div>

    <!-- LEFT: Tools Priority Dock -->
    <div class="left-col">
      <div class="section-label">
        <span class="dot"></span>
        <span>Technical Arsenal</span>
      </div>

      <!-- Priority 1: Core BI & Data -->
      <div class="tier-group">
        <span class="tier-caption">Core BI &amp; Data Stack (Priority 1)</span>
        <div class="tools-grid">
          <div class="tool-chip priority-high" title="Power BI">
            <img src="{b64_powerbi}" alt="Power BI">
            <span>Power BI</span>
          </div>
          <div class="tool-chip priority-high" title="Microsoft Fabric">
            <img src="{b64_fabric}" alt="Fabric">
            <span>Fabric</span>
          </div>
          <div class="tool-chip priority-high" title="MS SQL Server">
            <img src="{b64_mssql}" alt="SQL">
            <span>SQL</span>
          </div>
          <div class="tool-chip priority-high" title="Python">
            <img src="{b64_python}" alt="Python">
            <span>Python</span>
          </div>
          <div class="tool-chip priority-high" title="Microsoft Excel">
            <img src="{b64_excel}" alt="Excel">
            <span>Excel</span>
          </div>
          <div class="tool-chip priority-high" title="PostgreSQL">
            <img src="{b64_postgres}" alt="PostgreSQL">
            <span>Postgres</span>
          </div>
        </div>
      </div>

      <!-- Priority 2: AI & Development -->
      <div class="tier-group">
        <span class="tier-caption">AI &amp; Dev Environment (Priority 2)</span>
        <div class="tools-grid">
          <div class="tool-chip" title="VS Code">
            <img src="{b64_vscode}" alt="VS Code">
            <span>VS Code</span>
          </div>
          <div class="tool-chip" title="GitHub">
            <img src="{b64_github}" alt="GitHub">
            <span>GitHub</span>
          </div>
          <div class="tool-chip" title="GitHub Copilot">
            <img src="{b64_copilot}" alt="Copilot">
            <span>Copilot</span>
          </div>
          <div class="tool-chip" title="Claude">
            <img src="{b64_claude}" alt="Claude">
            <span>Claude</span>
          </div>
          <div class="tool-chip" title="Google Gemini">
            <img src="{b64_gemini}" alt="Gemini">
            <span>Gemini</span>
          </div>
          <div class="tool-chip" title="ChatGPT">
            <img src="{b64_chatgpt}" alt="ChatGPT">
            <span>ChatGPT</span>
          </div>
        </div>
      </div>
    </div>

    <!-- CENTER: Name, Role, Centered Microsoft Badges & Contacts -->
    <div class="center-col">
      <div class="open-badge">
        <span class="dot-green"></span>
        <span>OPEN FOR OPPORTUNITIES</span>
      </div>

      <h1 class="hero-name">TEJAS <span class="gold">WAGHMARE</span></h1>

      <div class="hero-role">
        <span>Data Analyst &amp; BI Specialist</span>
        <span class="serif">&mdash; Turning Data into Decisions</span>
      </div>

      <!-- Centered Microsoft Badges -->
      <div class="badges-center-panel">
        <div class="badges-caption">&#9733; 3x Microsoft Certified Associate &#9733;</div>
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
        <div class="contact-pill web" title="Visit Portfolio">
          <span>&#127760;</span>
          <span>tejaswaghmare.me</span>
        </div>
      </div>
    </div>

    <!-- RIGHT: Full-Height Portrait (Covering Upper & Lower End) -->
    <div class="right-col">
      <img src="{b64_profile_hero}" alt="Tejas Waghmare" class="right-portrait-img">
    </div>

  </div>
</body>
</html>
"""

# ==============================================================================
# DESIGN 2: "Seamless Dark Luxury" (Smooth Gradient Fade from Obsidian to Yellow Hero)
# ==============================================================================
html_design_2 = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
{FONTS_IMPORT}
<style>
{SHARED_CSS}

.banner-2 {{
  position: relative;
  width: 1584px;
  height: 396px;
  background-color: #0b0c10;
  display: grid;
  grid-template-columns: 320px 1fr 396px;
  overflow: hidden;
}}

/* Right side background image extending full height */
.right-portrait-bg {{
  position: absolute;
  top: 0;
  right: 0;
  width: 440px;
  height: 396px;
  background-image: url('{b64_profile_hero}');
  background-size: cover;
  background-position: center;
  z-index: 1;
}}

/* Smooth luxury dark gradient fade from dark canvas into the yellow portrait */
.gradient-fade-mask {{
  position: absolute;
  top: 0;
  right: 260px;
  width: 220px;
  height: 396px;
  background: linear-gradient(90deg, #0b0c10 0%, rgba(11, 12, 16, 0.95) 25%, rgba(11, 12, 16, 0.4) 65%, transparent 100%);
  z-index: 2;
  pointer-events: none;
}}

.left-stack-panel {{
  position: relative;
  z-index: 3;
  padding: 24px 14px 24px 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}}

.stack-title {{
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

.stack-title .dot {{
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #F5E025;
  box-shadow: 0 0 8px #F5E025;
}}

.stack-tier-label {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 600;
  color: #9da3af;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 2px;
}}

.stack-icons-dock {{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}}

.dock-pill {{
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(22, 23, 30, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 5px 9px;
}}

.dock-pill.highlight {{
  border-color: rgba(245, 224, 37, 0.3);
  background: rgba(245, 224, 37, 0.05);
}}

.dock-pill img {{
  width: 18px;
  height: 18px;
  object-fit: contain;
}}

.dock-pill span {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #e5e7eb;
}}

/* Center Area */
.center-content {{
  position: relative;
  z-index: 3;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
}}

.name-headline {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 42px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.8px;
  color: #ffffff;
}}

.name-headline .gold {{
  color: #F5E025;
}}

.role-sub {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 17.5px;
  font-weight: 600;
  color: #d1d5db;
}}

/* Centered Badges Container */
.badges-container-center {{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: rgba(18, 19, 25, 0.9);
  border: 1px solid rgba(245, 224, 37, 0.3);
  padding: 10px 22px 8px;
  border-radius: 16px;
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}}

.badges-stars-title {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 1px;
}}

.badges-strip {{
  display: flex;
  align-items: center;
  gap: 20px;
}}

.badge-card-sm {{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}}

.badge-card-sm img {{
  width: 76px;
  height: 76px;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5));
}}

.badge-card-sm span.exam {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 800;
  color: #F5E025;
}}

.badge-card-sm span.tit {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: #e5e7eb;
}}

/* Contact Links */
.contacts-bar {{
  display: flex;
  align-items: center;
  gap: 12px;
}}

.c-pill {{
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(22, 23, 30, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 5px 14px;
  border-radius: 9999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 600;
  color: #ffffff;
}}

.c-pill.gold {{
  background: rgba(245, 224, 37, 0.12);
  border-color: rgba(245, 224, 37, 0.4);
  color: #F5E025;
  font-weight: 700;
}}
</style>
</head>
<body>
  <div class="banner-2">
    
    <!-- LEFT: Tools by Priority -->
    <div class="left-stack-panel">
      <div class="stack-title">
        <span class="dot"></span>
        <span>Skills &amp; Engines</span>
      </div>

      <!-- Priority 1: BI & Data -->
      <div>
        <div class="stack-tier-label">Priority 1 &bull; BI &amp; Data Analysis</div>
        <div class="stack-icons-dock">
          <div class="dock-pill highlight"><img src="{b64_powerbi}" alt="Power BI"><span>Power BI</span></div>
          <div class="dock-pill highlight"><img src="{b64_fabric}" alt="Fabric"><span>Fabric</span></div>
          <div class="dock-pill highlight"><img src="{b64_mssql}" alt="SQL"><span>SQL</span></div>
          <div class="dock-pill highlight"><img src="{b64_python}" alt="Python"><span>Python</span></div>
          <div class="dock-pill highlight"><img src="{b64_excel}" alt="Excel"><span>Excel</span></div>
          <div class="dock-pill highlight"><img src="{b64_postgres}" alt="Postgres"><span>Postgres</span></div>
        </div>
      </div>

      <!-- Priority 2: AI & Dev Stack -->
      <div>
        <div class="stack-tier-label">Priority 2 &bull; AI &amp; Code Development</div>
        <div class="stack-icons-dock">
          <div class="dock-pill"><img src="{b64_vscode}" alt="VS Code"><span>VS Code</span></div>
          <div class="dock-pill"><img src="{b64_github}" alt="GitHub"><span>GitHub</span></div>
          <div class="dock-pill"><img src="{b64_copilot}" alt="Copilot"><span>Copilot</span></div>
          <div class="dock-pill"><img src="{b64_claude}" alt="Claude"><span>Claude</span></div>
          <div class="dock-pill"><img src="{b64_gemini}" alt="Gemini"><span>Gemini</span></div>
          <div class="dock-pill"><img src="{b64_chatgpt}" alt="ChatGPT"><span>ChatGPT</span></div>
        </div>
      </div>
    </div>

    <!-- CENTER: Name, Role, Badges & Contacts -->
    <div class="center-content">
      <h1 class="name-headline">TEJAS <span class="gold">WAGHMARE</span></h1>
      <div class="role-sub">Microsoft Certified Data Analyst &amp; BI Specialist</div>

      <!-- Badges in Center below name & description -->
      <div class="badges-container-center">
        <span class="badges-stars-title">&#9733; 3x MICROSOFT CERTIFIED ASSOCIATE &#9733;</span>
        <div class="badges-strip">
          <div class="badge-card-sm">
            <img src="{b64_pl300}" alt="PL-300">
            <span class="exam">PL-300</span>
            <span class="tit">Power BI Analyst</span>
          </div>
          <div class="badge-card-sm">
            <img src="{b64_dp600}" alt="DP-600">
            <span class="exam">DP-600</span>
            <span class="tit">Fabric Analytics</span>
          </div>
          <div class="badge-card-sm">
            <img src="{b64_dp700}" alt="DP-700">
            <span class="exam">DP-700</span>
            <span class="tit">Fabric Data Eng</span>
          </div>
        </div>
      </div>

      <!-- Gmail & Web -->
      <div class="contacts-bar">
        <div class="c-pill">&#9993; tejaswaghmare900@gmail.com</div>
        <div class="c-pill gold">&#127760; tejaswaghmare.me</div>
      </div>
    </div>

    <!-- RIGHT: Full Height Profile Portrait with Gradient Fade -->
    <div class="gradient-fade-mask"></div>
    <div class="right-portrait-bg"></div>

  </div>
</body>
</html>
"""

# ==============================================================================
# DESIGN 3: "Framed Hero Card" (Clean Geometric Split with Gold Border Trim)
# ==============================================================================
html_design_3 = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
{FONTS_IMPORT}
<style>
{SHARED_CSS}

.banner-3 {{
  position: relative;
  width: 1584px;
  height: 396px;
  background: 
    radial-gradient(circle at 15% 85%, rgba(245, 224, 37, 0.1) 0%, transparent 40%),
    linear-gradient(135deg, #090a0d 0%, #111218 55%, #15161f 100%);
  display: grid;
  grid-template-columns: 320px 1fr 396px;
  overflow: hidden;
}}

.left-stack-3 {{
  position: relative;
  z-index: 2;
  padding: 24px 16px 24px 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}}

.tag-header {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}}

.tag-header .dot {{
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #F5E025;
}}

.tier-title-3 {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 600;
  color: #9da3af;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 2px;
}}

.icon-bubbles-row {{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}}

.bubble-tool {{
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(25, 26, 33, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 5px 9px;
}}

.bubble-tool.p1 {{
  border-color: rgba(245, 224, 37, 0.3);
  background: rgba(245, 224, 37, 0.06);
}}

.bubble-tool img {{
  width: 18px;
  height: 18px;
  object-fit: contain;
}}

.bubble-tool span {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #e5e7eb;
}}

/* Center Area */
.center-3 {{
  position: relative;
  z-index: 2;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
}}

.title-3 {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 44px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.8px;
  color: #ffffff;
}}

.title-3 .gold {{
  color: #F5E025;
}}

.role-3 {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #d1d5db;
}}

.badges-card-3 {{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: rgba(18, 19, 25, 0.9);
  border: 1px solid rgba(245, 224, 37, 0.3);
  padding: 10px 24px 8px;
  border-radius: 16px;
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
}}

.badges-sub-3 {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 1px;
}}

.badges-trio-3 {{
  display: flex;
  align-items: center;
  gap: 22px;
}}

.badge-col-3 {{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}}

.badge-col-3 img {{
  width: 76px;
  height: 76px;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5));
}}

.badge-col-3 span.c {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 800;
  color: #F5E025;
}}

.badge-col-3 span.l {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: #e5e7eb;
}}

.contacts-3 {{
  display: flex;
  align-items: center;
  gap: 12px;
}}

.pill-3 {{
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(22, 23, 30, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 5px 14px;
  border-radius: 9999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 600;
  color: #ffffff;
}}

.pill-3.gold {{
  background: rgba(245, 224, 37, 0.12);
  border-color: rgba(245, 224, 37, 0.4);
  color: #F5E025;
  font-weight: 700;
}}

/* Right: Full Height Framed Hero Card with 2px gold border */
.right-framed-hero {{
  position: relative;
  width: 396px;
  height: 396px;
  border-left: 2px solid rgba(245, 224, 37, 0.4);
  background-color: #FFDF01;
  overflow: hidden;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.4);
}}

.right-framed-hero img {{
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}}
</style>
</head>
<body>
  <div class="banner-3">
    
    <!-- LEFT: Tools Priority Dock -->
    <div class="left-stack-3">
      <div class="tag-header">
        <span class="dot"></span>
        <span>Skills &amp; Tools</span>
      </div>

      <!-- Priority 1 -->
      <div>
        <div class="tier-title-3">Priority 1 &bull; BI &amp; Analytics</div>
        <div class="icon-bubbles-row">
          <div class="bubble-tool p1"><img src="{b64_powerbi}" alt="Power BI"><span>Power BI</span></div>
          <div class="bubble-tool p1"><img src="{b64_fabric}" alt="Fabric"><span>Fabric</span></div>
          <div class="bubble-tool p1"><img src="{b64_mssql}" alt="SQL"><span>SQL</span></div>
          <div class="bubble-tool p1"><img src="{b64_python}" alt="Python"><span>Python</span></div>
          <div class="bubble-tool p1"><img src="{b64_excel}" alt="Excel"><span>Excel</span></div>
          <div class="bubble-tool p1"><img src="{b64_postgres}" alt="Postgres"><span>Postgres</span></div>
        </div>
      </div>

      <!-- Priority 2 -->
      <div>
        <div class="tier-title-3">Priority 2 &bull; AI &amp; Code</div>
        <div class="icon-bubbles-row">
          <div class="bubble-tool"><img src="{b64_vscode}" alt="VS Code"><span>VS Code</span></div>
          <div class="bubble-tool"><img src="{b64_github}" alt="GitHub"><span>GitHub</span></div>
          <div class="bubble-tool"><img src="{b64_copilot}" alt="Copilot"><span>Copilot</span></div>
          <div class="bubble-tool"><img src="{b64_claude}" alt="Claude"><span>Claude</span></div>
          <div class="bubble-tool"><img src="{b64_gemini}" alt="Gemini"><span>Gemini</span></div>
          <div class="bubble-tool"><img src="{b64_chatgpt}" alt="ChatGPT"><span>ChatGPT</span></div>
        </div>
      </div>
    </div>

    <!-- CENTER: Name, Role, Badges, Contacts -->
    <div class="center-3">
      <h1 class="title-3">TEJAS <span class="gold">WAGHMARE</span></h1>
      <div class="role-3">Microsoft Certified Data Analyst &amp; BI Specialist</div>

      <div class="badges-card-3">
        <span class="badges-sub-3">&#9733; 3x MICROSOFT CERTIFIED ASSOCIATE &#9733;</span>
        <div class="badges-trio-3">
          <div class="badge-col-3">
            <img src="{b64_pl300}" alt="PL-300">
            <span class="c">PL-300</span>
            <span class="l">Power BI Analyst</span>
          </div>
          <div class="badge-col-3">
            <img src="{b64_dp600}" alt="DP-600">
            <span class="c">DP-600</span>
            <span class="l">Fabric Analytics</span>
          </div>
          <div class="badge-col-3">
            <img src="{b64_dp700}" alt="DP-700">
            <span class="c">DP-700</span>
            <span class="l">Fabric Data Eng</span>
          </div>
        </div>
      </div>

      <div class="contacts-3">
        <div class="pill-3">&#9993; tejaswaghmare900@gmail.com</div>
        <div class="pill-3 gold">&#127760; tejaswaghmare.me</div>
      </div>
    </div>

    <!-- RIGHT: Full Height Hero Card with Gold Border Trim -->
    <div class="right-framed-hero">
      <img src="{b64_profile_hero}" alt="Tejas Waghmare">
    </div>

  </div>
</body>
</html>
"""

configs = [
    ("banner_perfect_1_diagonal_hero.html", html_design_1, "linkedin_banner_perfect_1_diagonal_hero"),
    ("banner_perfect_2_seamless_fade.html", html_design_2, "linkedin_banner_perfect_2_seamless_fade"),
    ("banner_perfect_3_framed_card.html", html_design_3, "linkedin_banner_perfect_3_framed_card"),
]

for html_file, content, png_prefix in configs:
    file_path = os.path.join(WORKSPACE, html_file)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Wrote {html_file}")

# Render to 1x (1584x396) and 2x Retina (3168x792)
for html_file, _, png_prefix in configs:
    html_url = "file:///" + os.path.join(WORKSPACE, html_file).replace("\\", "/")
    
    # 1. Standard 1584x396 (1x)
    out_1x = os.path.join(WORKSPACE, f"{png_prefix}_1584x396.png")
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
    out_2x = os.path.join(WORKSPACE, f"{png_prefix}_3168x792_retina.png")
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

    for out_path in [out_1x, out_2x]:
        if os.path.exists(out_path):
            im = Image.open(out_path)
            print(f"Generated: {os.path.basename(out_path)} - {im.size} - {os.path.getsize(out_path):,} bytes")
        else:
            print(f"Failed to generate {out_path}")

print("All perfect banners generated successfully!")

