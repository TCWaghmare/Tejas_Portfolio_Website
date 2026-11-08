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

# Badges & Avatar
b64_pl300 = get_base64_file("Badges/pl 300.png")
b64_dp600 = get_base64_file("Badges/dp 600.png")
b64_dp700 = get_base64_file("Badges/dp 700.png")
b64_avatar = get_base64_file("Asset/current_linkedin_avatar.jpg")

# Tool Vector Logos (Top-Left)
b64_powerbi = get_base64_file("Asset/tools/powerbi.svg")
b64_fabric = get_base64_file("Asset/tools/fabric.svg")
b64_mssql = get_base64_file("Asset/tools/mssql.svg")
b64_python = get_base64_file("Asset/tools/python.svg")
b64_excel = get_base64_file("Asset/tools/excel.svg")

# Backgrounds
b64_bg_3d = get_base64_file("Asset/bg_3d_landscape.jpg")

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
  background-color: #0d0e12;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
"""

# ==============================================================================
# REFINED TEMPLATE 1: "The Certified Authority" (Top-Left Logos, Large Clear Badges, Email & Web)
# ==============================================================================
html_refined_1 = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
{FONTS_IMPORT}
<style>
{SHARED_CSS}

.banner-root {{
  position: relative;
  width: 1584px;
  height: 396px;
  background: 
    radial-gradient(circle at 12% 88%, rgba(245, 224, 37, 0.16) 0%, rgba(245, 224, 37, 0.04) 45%, transparent 65%),
    radial-gradient(circle at 92% 15%, rgba(56, 189, 248, 0.09) 0%, transparent 45%),
    linear-gradient(135deg, #0a0b0e 0%, #111217 45%, #16171e 100%);
  display: grid;
  grid-template-columns: 290px 1fr 450px;
  gap: 24px;
  padding: 22px 34px 22px 28px;
  align-items: center;
}}

/* Subtle tech grid */
.grid-mesh {{
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 36px 36px;
  pointer-events: none;
}}

/* ================= LEFT COLUMN: TOP TOOL LOGOS DOCK ================= */
.col-left {{
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  z-index: 2;
}}

.tools-dock-wrap {{
  display: flex;
  flex-direction: column;
  gap: 8px;
}}

.tools-dock-label {{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}}

.tools-dock-label .dot {{
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #F5E025;
  box-shadow: 0 0 8px #F5E025;
}}

.tools-icons-row {{
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(22, 23, 29, 0.85);
  border: 1px solid rgba(245, 224, 37, 0.25);
  padding: 8px 12px;
  border-radius: 14px;
  backdrop-filter: blur(12px);
  width: fit-content;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}}

.tool-orb {{
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(32, 33, 40, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}}

.tool-orb img {{
  width: 22px;
  height: 22px;
  object-fit: contain;
}}

.avatar-ambient-glow {{
  position: absolute;
  left: 10px;
  bottom: -40px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 224, 37, 0.22) 0%, rgba(245, 224, 37, 0.04) 55%, transparent 75%);
  filter: blur(10px);
  pointer-events: none;
}}

/* ================= CENTER COLUMN: IDENTITY & CONTACT ================= */
.col-center {{
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}}

.status-row {{
  display: flex;
  align-items: center;
  gap: 10px;
}}

.status-pill {{
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(245, 224, 37, 0.1);
  border: 1px solid rgba(245, 224, 37, 0.35);
  color: #F5E025;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 9999px;
  letter-spacing: 0.5px;
}}

.pulse-green {{
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}}

.spec-text {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #9da3af;
  letter-spacing: 0.3px;
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

.role-headline {{
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 19px;
  font-weight: 600;
  color: #e5e7eb;
}}

.role-headline .serif {{
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-weight: 400;
  font-size: 24px;
  color: #F5E025;
}}

.mission-statement {{
  font-family: 'DM Sans', sans-serif;
  font-size: 13.5px;
  line-height: 1.45;
  color: #a3aab8;
  max-width: 530px;
}}

.disciplines-chips {{
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}}

.d-chip {{
  background: rgba(28, 29, 36, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 11px;
  border-radius: 9999px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  color: #e5e7eb;
}}

/* CONTACT DOCK (Email + Web) */
.contact-dock {{
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}}

.contact-pill {{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(24, 25, 31, 0.95);
  border: 1px solid rgba(245, 224, 37, 0.3);
  padding: 6px 14px;
  border-radius: 9999px;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}}

.contact-pill.web {{
  background: rgba(245, 224, 37, 0.12);
  border-color: rgba(245, 224, 37, 0.45);
  color: #F5E025;
  font-weight: 700;
}}

.contact-pill svg {{
  color: #F5E025;
}}

/* ================= RIGHT COLUMN: BIG CLEAR MICROSOFT BADGES ================= */
.col-right {{
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}}

.badges-card {{
  background: linear-gradient(150deg, rgba(28, 29, 36, 0.92) 0%, rgba(18, 19, 24, 0.96) 100%);
  border: 1px solid rgba(245, 224, 37, 0.3);
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 16px 18px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  backdrop-filter: blur(14px);
}}

.badges-header-badge {{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}}

.stars-row {{
  color: #F5E025;
  font-size: 11px;
  letter-spacing: 2px;
}}

.badges-card-title {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}}

.badges-card-sub {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10px;
  color: #9da3af;
  letter-spacing: 0.4px;
}}

.badges-row-large {{
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
  margin: 6px 0 2px;
}}

.badge-item-lg {{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 115px;
}}

.badge-img-lg {{
  width: 82px;
  height: 82px;
  object-fit: contain;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5));
  transition: transform 0.2s;
}}

.badge-code-lg {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 800;
  color: #F5E025;
  background: rgba(245, 224, 37, 0.1);
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid rgba(245, 224, 37, 0.25);
}}

.badge-desc-sm {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 9.5px;
  font-weight: 600;
  color: #d1d5db;
  text-align: center;
  line-height: 1.2;
}}

.badges-footer-ribbon {{
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.5px;
}}
</style>
</head>
<body>
  <div class="banner-root">
    <div class="grid-mesh"></div>

    <!-- LEFT COLUMN: Top Tool Logos Dock -->
    <div class="col-left">
      <div class="tools-dock-wrap">
        <div class="tools-dock-label">
          <span class="dot"></span>
          <span>Core Analytics Stack</span>
        </div>
        <div class="tools-icons-row" title="Power BI, Microsoft Fabric, SQL Server, Python, Advanced Excel">
          <div class="tool-orb" title="Microsoft Power BI (PL-300)">
            <img src="{b64_powerbi}" alt="Power BI">
          </div>
          <div class="tool-orb" title="Microsoft Fabric (DP-600 & DP-700)">
            <img src="{b64_fabric}" alt="Microsoft Fabric">
          </div>
          <div class="tool-orb" title="Microsoft SQL Server & T-SQL">
            <img src="{b64_mssql}" alt="SQL">
          </div>
          <div class="tool-orb" title="Python (Pandas, NumPy, EDA)">
            <img src="{b64_python}" alt="Python">
          </div>
          <div class="tool-orb" title="Microsoft Excel & DAX">
            <img src="{b64_excel}" alt="Excel">
          </div>
        </div>
      </div>

      <div class="avatar-ambient-glow"></div>
    </div>

    <!-- CENTER COLUMN: Who I Am & Contact Details -->
    <div class="col-center">
      <div class="status-row">
        <div class="status-pill">
          <span class="pulse-green"></span>
          <span>AVAILABLE FOR BI &amp; DATA ROLES</span>
        </div>
        <span class="spec-text">Executive Reporting &bull; Scalable Lakehouses</span>
      </div>

      <h1 class="hero-name">TEJAS <span class="gold">WAGHMARE</span></h1>

      <div class="role-headline">
        <span>Data Analyst &amp; BI Specialist</span>
        <span class="serif">&mdash; Turning Data into Executive Decisions</span>
      </div>

      <p class="mission-statement">
        Architecting end-to-end data pipelines, star-schema models, and board-ready Power BI dashboards that transform complex raw data into high-ROI business intelligence.
      </p>

      <div class="disciplines-chips">
        <span class="d-chip">&#128202; Executive Power BI</span>
        <span class="d-chip">&#9881; Star Schema &amp; DAX</span>
        <span class="d-chip">&#129504; Analytical Rigor</span>
        <span class="d-chip">&#128200; Data Storytelling</span>
        <span class="d-chip">&#127912; Dashboard UX</span>
      </div>

      <!-- Gmail & Portfolio Web (Requested by User) -->
      <div class="contact-dock">
        <div class="contact-pill" title="Email Tejas">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>tejaswaghmare900@gmail.com</span>
        </div>

        <div class="contact-pill web" title="Visit Portfolio Website">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span>tejaswaghmare.me</span>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN: Simple, Crisp, Large Microsoft Badges Showcase -->
    <div class="col-right">
      <div class="badges-card">
        <div class="badges-header-badge">
          <span class="stars-row">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
          <span class="badges-card-title">3x Microsoft Certified</span>
          <span class="badges-card-sub">Associate Level Enterprise Credentials</span>
        </div>

        <div class="badges-row-large">
          <!-- 1. PL-300 -->
          <div class="badge-item-lg">
            <img src="{b64_pl300}" alt="Microsoft Certified: Power BI Data Analyst Associate (PL-300)" class="badge-img-lg">
            <span class="badge-code-lg">PL-300</span>
            <span class="badge-desc-sm">Power BI Analyst</span>
          </div>

          <!-- 2. DP-600 -->
          <div class="badge-item-lg">
            <img src="{b64_dp600}" alt="Microsoft Certified: Fabric Analytics Engineer Associate (DP-600)" class="badge-img-lg">
            <span class="badge-code-lg">DP-600</span>
            <span class="badge-desc-sm">Fabric Analytics</span>
          </div>

          <!-- 3. DP-700 -->
          <div class="badge-item-lg">
            <img src="{b64_dp700}" alt="Microsoft Certified: Fabric Data Engineer Associate (DP-700)" class="badge-img-lg">
            <span class="badge-code-lg">DP-700</span>
            <span class="badge-desc-sm">Fabric Data Eng</span>
          </div>
        </div>

        <div class="badges-footer-ribbon">
          <span>Officially Verified on Microsoft Learn</span>
        </div>
      </div>
    </div>

  </div>
</body>
</html>
"""

# ==============================================================================
# REFINED TEMPLATE 2: "Executive Dark Luxury" (Ultra-Clean, Large Badges & Prominent Identity)
# ==============================================================================
html_refined_2 = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
{FONTS_IMPORT}
<style>
{SHARED_CSS}

.b2-root {{
  position: relative;
  width: 1584px;
  height: 396px;
  background: 
    radial-gradient(circle at 10% 85%, rgba(245, 224, 37, 0.18) 0%, transparent 42%),
    radial-gradient(circle at 85% 20%, rgba(245, 224, 37, 0.08) 0%, transparent 50%),
    linear-gradient(180deg, #090a0d 0%, #121318 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 22px 36px 20px 28px;
}}

/* Top Bar: Tool Logos on Left + Official Badges on Right */
.b2-top-bar {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}}

.b2-tools-group {{
  display: flex;
  align-items: center;
  gap: 12px;
}}

.b2-tools-tag {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}}

.b2-tools-row {{
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(25, 26, 32, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 6px 12px;
  border-radius: 9999px;
  backdrop-filter: blur(10px);
}}

.b2-tool-icon {{
  width: 24px;
  height: 24px;
  object-fit: contain;
}}

.b2-right-status {{
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(245, 224, 37, 0.1);
  border: 1px solid rgba(245, 224, 37, 0.35);
  padding: 6px 14px;
  border-radius: 9999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #F5E025;
}}

.b2-dot-green {{
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}}

/* Main Middle Body: Left Space for Avatar, Center Name, Right Big Badges */
.b2-middle-body {{
  display: grid;
  grid-template-columns: 280px 1fr 440px;
  gap: 20px;
  align-items: center;
  position: relative;
  z-index: 2;
  margin-top: -6px;
}}

.b2-avatar-placeholder {{
  position: relative;
  height: 100%;
}}

.b2-avatar-halo {{
  position: absolute;
  left: 20px;
  bottom: -40px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 224, 37, 0.22) 0%, transparent 70%);
  filter: blur(8px);
}}

.b2-center-info {{
  display: flex;
  flex-direction: column;
  gap: 8px;
}}

.b2-name {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 44px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.8px;
  color: #ffffff;
}}

.b2-name .gold {{
  color: #F5E025;
}}

.b2-role {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #e5e7eb;
}}

.b2-role .serif {{
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-size: 23px;
  color: #F5E025;
}}

.b2-tagline {{
  font-family: 'DM Sans', sans-serif;
  font-size: 13.5px;
  color: #9ca3af;
  max-width: 480px;
  line-height: 1.4;
}}

/* Right Badges Showcase */
.b2-badges-showcase {{
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  background: rgba(22, 23, 29, 0.85);
  border: 1px solid rgba(245, 224, 37, 0.3);
  padding: 14px 20px;
  border-radius: 18px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
}}

.b2-badge-unit {{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}}

.b2-badge-unit img {{
  width: 78px;
  height: 78px;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5));
}}

.b2-badge-label {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 800;
  color: #F5E025;
}}

/* Bottom Bar: Contact Info (Gmail + Web) */
.b2-bottom-bar {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
  margin-left: 280px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}}

.b2-contacts-row {{
  display: flex;
  align-items: center;
  gap: 14px;
}}

.b2-contact-item {{
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #f3f4f6;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 5px 14px;
  border-radius: 9999px;
}}

.b2-contact-item.gold {{
  background: rgba(245, 224, 37, 0.12);
  border-color: rgba(245, 224, 37, 0.4);
  color: #F5E025;
  font-weight: 700;
}}

.b2-interests-inline {{
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #9ca3af;
}}
</style>
</head>
<body>
  <div class="b2-root">
    
    <!-- Top Bar: Tool Logos on Top Left -->
    <div class="b2-top-bar">
      <div class="b2-tools-group">
        <span class="b2-tools-tag">&#9881; Core Stack:</span>
        <div class="b2-tools-row">
          <img src="{b64_powerbi}" class="b2-tool-icon" alt="Power BI" title="Power BI">
          <img src="{b64_fabric}" class="b2-tool-icon" alt="Fabric" title="Microsoft Fabric">
          <img src="{b64_mssql}" class="b2-tool-icon" alt="SQL Server" title="SQL Server">
          <img src="{b64_python}" class="b2-tool-icon" alt="Python" title="Python">
          <img src="{b64_excel}" class="b2-tool-icon" alt="Excel" title="Excel">
        </div>
      </div>

      <div class="b2-right-status">
        <span class="b2-dot-green"></span>
        <span>OPEN FOR ROLES</span>
      </div>
    </div>

    <!-- Middle Body: Avatar Space on Left, Identity in Center, Badges on Right -->
    <div class="b2-middle-body">
      <div class="b2-avatar-placeholder">
        <div class="b2-avatar-halo"></div>
      </div>

      <div class="b2-center-info">
        <h1 class="b2-name">TEJAS <span class="gold">WAGHMARE</span></h1>
        
        <div class="b2-role">
          <span>Microsoft Certified Data Analyst &amp; BI Specialist</span>
        </div>

        <p class="b2-tagline">
          Transforming complex datasets into executive clarity, high-ROI business intelligence, and scalable data models.
        </p>
      </div>

      <!-- Large, Clear Badges Showcase -->
      <div class="b2-badges-showcase">
        <div class="b2-badge-unit">
          <img src="{b64_pl300}" alt="PL-300">
          <span class="b2-badge-label">PL-300</span>
        </div>
        <div class="b2-badge-unit">
          <img src="{b64_dp600}" alt="DP-600">
          <span class="b2-badge-label">DP-600</span>
        </div>
        <div class="b2-badge-unit">
          <img src="{b64_dp700}" alt="DP-700">
          <span class="b2-badge-label">DP-700</span>
        </div>
      </div>
    </div>

    <!-- Bottom Bar: Contact Info (Gmail + Web) & Disciplines -->
    <div class="b2-bottom-bar">
      <div class="b2-contacts-row">
        <div class="b2-contact-item" title="Email Tejas">
          <span>&#9993;</span>
          <span>tejaswaghmare900@gmail.com</span>
        </div>
        <div class="b2-contact-item gold" title="Portfolio">
          <span>&#127760;</span>
          <span>tejaswaghmare.me</span>
        </div>
      </div>

      <div class="b2-interests-inline">
        <span>Analytical Thinking &bull; Data Storytelling &bull; Dashboard UX &bull; Mountain Trekking</span>
      </div>
    </div>

  </div>
</body>
</html>
"""

# ==============================================================================
# REFINED TEMPLATE 3: "3D Cyber Horizon & Badges Focus" (Rich 3D Data Visuals + Clear Badges)
# ==============================================================================
html_refined_3 = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
{FONTS_IMPORT}
<style>
{SHARED_CSS}

.b3-root {{
  position: relative;
  width: 1584px;
  height: 396px;
  background-color: #0b0c10;
  overflow: hidden;
  display: grid;
  grid-template-columns: 290px 1fr 450px;
  gap: 20px;
  padding: 22px 34px 22px 28px;
  align-items: center;
}}

/* Photorealistic 3D art on right with smooth gradient fade to the left */
.b3-bg-layer {{
  position: absolute;
  top: 0;
  right: 0;
  width: 70%;
  height: 100%;
  background-image: url('{b64_bg_3d}');
  background-size: cover;
  background-position: center right;
  opacity: 0.85;
}}

.b3-fade {{
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, 
    #0a0b0e 0%, 
    #0a0b0e 24%, 
    rgba(10, 11, 14, 0.95) 34%, 
    rgba(10, 11, 14, 0.65) 58%, 
    rgba(10, 11, 14, 0.25) 85%, 
    transparent 100%);
  pointer-events: none;
}}

/* Left Column: Tool Logos Dock */
.b3-col-left {{
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}}

.b3-tool-dock {{
  display: flex;
  flex-direction: column;
  gap: 8px;
}}

.b3-dock-title {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}}

.b3-dock-title .dot {{
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #F5E025;
  box-shadow: 0 0 8px #F5E025;
}}

.b3-tool-pills {{
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(18, 19, 25, 0.85);
  border: 1px solid rgba(245, 224, 37, 0.25);
  padding: 8px 12px;
  border-radius: 14px;
  backdrop-filter: blur(12px);
  width: fit-content;
}}

.b3-tool-cube {{
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(28, 29, 36, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}}

.b3-tool-cube img {{
  width: 22px;
  height: 22px;
  object-fit: contain;
}}

.b3-avatar-glow {{
  position: absolute;
  left: 10px;
  bottom: -40px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 224, 37, 0.22) 0%, transparent 70%);
  filter: blur(10px);
}}

/* Center Column */
.b3-col-center {{
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}}

.b3-headline {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 44px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.8px;
  color: #ffffff;
}}

.b3-headline .accent {{
  color: #F5E025;
  text-shadow: 0 0 25px rgba(245, 224, 37, 0.35);
}}

.b3-role-text {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 19px;
  font-weight: 600;
  color: #f3f4f6;
  display: flex;
  align-items: baseline;
  gap: 8px;
}}

.b3-role-text .serif {{
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-size: 24px;
  color: #F5E025;
}}

.b3-metric-pill {{
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: rgba(18, 19, 25, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 14px;
  border-radius: 12px;
  backdrop-filter: blur(12px);
  width: fit-content;
}}

.b3-num {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: #F5E025;
}}

.b3-num-desc {{
  font-family: 'DM Sans', sans-serif;
  font-size: 12.5px;
  color: #d1d5db;
}}

/* Contact Dock */
.b3-contact-row {{
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}}

.b3-contact-pill {{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(18, 19, 25, 0.95);
  border: 1px solid rgba(245, 224, 37, 0.3);
  padding: 6px 14px;
  border-radius: 9999px;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 600;
  backdrop-filter: blur(10px);
}}

.b3-contact-pill.web {{
  background: rgba(245, 224, 37, 0.15);
  border-color: rgba(245, 224, 37, 0.45);
  color: #F5E025;
  font-weight: 700;
}}

/* Right Column: Badges */
.b3-col-right {{
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}}

.b3-badges-box {{
  background: rgba(18, 19, 26, 0.88);
  border: 1px solid rgba(245, 224, 37, 0.3);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 16px 18px 14px;
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}}

.b3-box-stars {{
  color: #F5E025;
  font-size: 11px;
  letter-spacing: 2px;
}}

.b3-box-title {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}}

.b3-box-sub {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10px;
  color: #9da3af;
}}

.b3-badges-trio {{
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 16px;
  margin: 6px 0 2px;
}}

.b3-badge-card {{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 115px;
}}

.b3-badge-card img {{
  width: 82px;
  height: 82px;
  object-fit: contain;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5));
}}

.b3-badge-card span.code {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 800;
  color: #F5E025;
  background: rgba(245, 224, 37, 0.1);
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid rgba(245, 224, 37, 0.25);
}}

.b3-badge-card span.sub {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 9.5px;
  font-weight: 600;
  color: #d1d5db;
  line-height: 1.2;
}}
</style>
</head>
<body>
  <div class="b3-root">
    <div class="b3-bg-layer"></div>
    <div class="b3-fade"></div>

    <!-- LEFT: Tool Logos Dock on Top Left -->
    <div class="b3-col-left">
      <div class="b3-tool-dock">
        <div class="b3-dock-title">
          <span class="dot"></span>
          <span>Core Analytics Stack</span>
        </div>
        <div class="b3-tool-pills" title="Power BI, Fabric, SQL, Python, Excel">
          <div class="b3-tool-cube" title="Power BI"><img src="{b64_powerbi}" alt="Power BI"></div>
          <div class="b3-tool-cube" title="Microsoft Fabric"><img src="{b64_fabric}" alt="Fabric"></div>
          <div class="b3-tool-cube" title="SQL Server"><img src="{b64_mssql}" alt="SQL"></div>
          <div class="b3-tool-cube" title="Python"><img src="{b64_python}" alt="Python"></div>
          <div class="b3-tool-cube" title="Excel"><img src="{b64_excel}" alt="Excel"></div>
        </div>
      </div>

      <div class="b3-avatar-glow"></div>
    </div>

    <!-- CENTER: Who I Am & Contact Info -->
    <div class="b3-col-center">
      <h1 class="b3-headline">TEJAS <span class="accent">WAGHMARE</span></h1>

      <div class="b3-role-text">
        <span>Data Analyst &amp; BI Specialist</span>
        <span class="serif">&mdash; Executive Business Intelligence</span>
      </div>

      <div class="b3-metric-pill">
        <span class="b3-num">$389.3M+</span>
        <span class="b3-num-desc">Marketplace Data Modeled</span>
        <span style="color:rgba(255,255,255,0.2)">&bull;</span>
        <span class="b3-num">Star Schema</span>
        <span class="b3-num-desc">Fabric Lakehouse</span>
      </div>

      <!-- Contact Info (Gmail + Web) -->
      <div class="b3-contact-row">
        <div class="b3-contact-pill" title="Email Tejas">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>tejaswaghmare900@gmail.com</span>
        </div>

        <div class="b3-contact-pill web" title="Portfolio">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span>tejaswaghmare.me</span>
        </div>
      </div>
    </div>

    <!-- RIGHT: Clear, Large Microsoft Badges -->
    <div class="b3-col-right">
      <div class="b3-badges-box">
        <span class="b3-box-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
        <span class="b3-box-title">3x Microsoft Certified</span>
        <span class="b3-box-sub">Associate Level Enterprise Credentials</span>

        <div class="b3-badges-trio">
          <div class="b3-badge-card">
            <img src="{b64_pl300}" alt="PL-300">
            <span class="code">PL-300</span>
            <span class="sub">Power BI Analyst</span>
          </div>

          <div class="b3-badge-card">
            <img src="{b64_dp600}" alt="DP-600">
            <span class="code">DP-600</span>
            <span class="sub">Fabric Analytics</span>
          </div>

          <div class="b3-badge-card">
            <img src="{b64_dp700}" alt="DP-700">
            <span class="code">DP-700</span>
            <span class="sub">Fabric Data Eng</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</body>
</html>
"""

configs = [
    ("banner_refined_1_certified_focus.html", html_refined_1, "linkedin_banner_refined_1_certified_focus"),
    ("banner_refined_2_executive_minimal.html", html_refined_2, "linkedin_banner_refined_2_executive_minimal"),
    ("banner_refined_3_cyber_landscape.html", html_refined_3, "linkedin_banner_refined_3_cyber_landscape"),
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

print("All refined banners generated successfully!")

