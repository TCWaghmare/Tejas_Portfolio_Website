import os
import subprocess
import base64
from PIL import Image

WORKSPACE = r"e:\Antygravity\Tejas Portfolio website"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def get_base64_img(rel_path):
    full_path = os.path.join(WORKSPACE, rel_path)
    if not os.path.exists(full_path):
        print(f"Warning: {full_path} not found")
        return ""
    with open(full_path, "rb") as f:
        data = f.read()
    ext = os.path.splitext(full_path)[1].lower().replace(".", "")
    if ext == "jpg": ext = "jpeg"
    return f"data:image/{ext};base64,{base64.b64encode(data).decode('utf-8')}"

b64_pl300 = get_base64_img("Badges/pl 300.png")
b64_dp600 = get_base64_img("Badges/dp 600.png")
b64_dp700 = get_base64_img("Badges/dp 700.png")
b64_avatar = get_base64_img("Asset/current_linkedin_avatar.jpg")
b64_bg_3d = get_base64_img("Asset/bg_3d_landscape.jpg")
b64_bg_prisms = get_base64_img("Asset/bg_3d_prisms.jpg")

# Common Fonts & Shared Styles
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
.banner-canvas {
  position: relative;
  width: 1584px;
  height: 396px;
  overflow: hidden;
  display: flex;
}
"""

# ==============================================================================
# TEMPLATE 1: "The Certified BI Specialist" (Executive Bento UI)
# ==============================================================================
html_banner_1 = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
{FONTS_IMPORT}
<style>
{SHARED_CSS}

.b1-root {{
  position: relative;
  width: 1584px;
  height: 396px;
  background: radial-gradient(circle at 14% 85%, rgba(245, 224, 37, 0.12) 0%, transparent 38%),
              radial-gradient(circle at 85% 15%, rgba(56, 189, 248, 0.08) 0%, transparent 45%),
              linear-gradient(135deg, #0b0c10 0%, #131418 50%, #181920 100%);
  display: grid;
  grid-template-columns: 310px 1fr 340px;
  gap: 20px;
  padding: 24px 36px 24px 28px;
  align-items: center;
}}

/* Subtle background grid */
.b1-grid-pattern {{
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 36px 36px;
  pointer-events: none;
}}

/* Left Column: Avatar Dock Space & Ambient Halo */
.b1-col-left {{
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  z-index: 2;
}}

.b1-status-pill {{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(26, 27, 33, 0.85);
  border: 1px solid rgba(245, 224, 37, 0.3);
  padding: 6px 14px;
  border-radius: 9999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #F5E025;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
  width: fit-content;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}}

.b1-pulse-dot {{
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 10px #22c55e;
}}

.b1-avatar-aura {{
  position: absolute;
  left: 20px;
  bottom: -40px;
  width: 230px;
  height: 230px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 224, 37, 0.22) 0%, rgba(245, 224, 37, 0.05) 55%, transparent 75%);
  filter: blur(8px);
  pointer-events: none;
}}

.b1-avatar-dock-hint {{
  position: absolute;
  left: 20px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.8px;
  text-transform: uppercase;
}}

/* Center Column: Name, Title, Career Journey & Tech Stack */
.b1-col-center {{
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}}

.b1-credentials-ribbon {{
  display: flex;
  align-items: center;
  gap: 10px;
}}

.b1-badge-tag {{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 224, 37, 0.12);
  border: 1px solid rgba(245, 224, 37, 0.35);
  color: #F5E025;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}}

.b1-badge-sep {{
  color: rgba(255, 255, 255, 0.25);
  font-size: 11px;
}}

.b1-meta-text {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #9da3af;
  letter-spacing: 0.3px;
}}

.b1-name-headline {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 42px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.8px;
  color: #ffffff;
}}

.b1-name-headline .highlight {{
  color: #F5E025;
  text-shadow: 0 0 25px rgba(245, 224, 37, 0.3);
}}

.b1-role-line {{
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 19px;
  font-weight: 600;
  color: #e5e7eb;
}}

.b1-role-line .serif-accent {{
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-weight: 400;
  font-size: 24px;
  color: #F5E025;
}}

.b1-career-path-bar {{
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(25, 26, 32, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px 14px;
  border-radius: 12px;
  width: fit-content;
  backdrop-filter: blur(8px);
}}

.b1-path-label {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-right: 4px;
}}

.b1-path-step {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #d1d5db;
}}

.b1-path-arrow {{
  color: #F5E025;
  font-weight: bold;
  font-size: 12px;
}}

.b1-stack-row {{
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}}

.b1-stack-pill {{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(31, 32, 38, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 11px;
  border-radius: 9999px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #f3f4f6;
}}

.b1-stack-pill .dot {{
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #F5E025;
}}

.b1-stack-pill.interest {{
  background: rgba(245, 224, 37, 0.06);
  border-color: rgba(245, 224, 37, 0.2);
  color: #e5e7eb;
}}

.b1-stack-pill.interest .icon {{
  font-size: 12px;
}}

/* Right Column: 3x Certified Microsoft Badges Bento Card */
.b1-col-right {{
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}}

.b1-cert-card {{
  background: linear-gradient(145deg, rgba(31, 32, 38, 0.9) 0%, rgba(20, 21, 26, 0.95) 100%);
  border: 1px solid rgba(245, 224, 37, 0.25);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  backdrop-filter: blur(12px);
}}

.b1-cert-header {{
  display: flex;
  align-items: center;
  gap: 6px;
}}

.b1-cert-stars {{
  color: #F5E025;
  font-size: 12px;
  letter-spacing: 2px;
}}

.b1-cert-title {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}}

.b1-badges-trio {{
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 2px 0;
}}

.b1-badge-item {{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}}

.b1-badge-img {{
  width: 58px;
  height: 58px;
  object-fit: contain;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.45));
}}

.b1-badge-code {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #F5E025;
}}

.b1-url-pill {{
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 224, 37, 0.1);
  border: 1px solid rgba(245, 224, 37, 0.3);
  padding: 5px 12px;
  border-radius: 9999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #F5E025;
  letter-spacing: 0.3px;
}}
</style>
</head>
<body>
  <div class="b1-root">
    <div class="b1-grid-pattern"></div>
    
    <!-- Left: Profile Bay & Status -->
    <div class="b1-col-left">
      <div class="b1-status-pill">
        <span class="b1-pulse-dot"></span>
        <span>OPEN FOR ROLES</span>
      </div>
      <div class="b1-avatar-aura"></div>
      <div class="b1-avatar-dock-hint">
        <span>&bull; Executive Analytics</span>
      </div>
    </div>

    <!-- Center: Main Headline, Career Pathway & Stack -->
    <div class="b1-col-center">
      <div class="b1-credentials-ribbon">
        <span class="b1-badge-tag">MICROSOFT 3x CERTIFIED</span>
        <span class="b1-badge-sep">&bull;</span>
        <span class="b1-meta-text">Power BI &bull; Fabric Lakehouse &bull; SQL</span>
      </div>

      <h1 class="b1-name-headline">TEJAS <span class="highlight">WAGHMARE</span></h1>
      
      <div class="b1-role-line">
        <span>Data Analyst &amp; BI Specialist</span>
        <span class="serif-accent">&mdash; Turning Data into Decisions</span>
      </div>

      <!-- Career Path Progression -->
      <div class="b1-career-path-bar">
        <span class="b1-path-label">PATH:</span>
        <span class="b1-path-step">Engineering Rigor (B.Tech)</span>
        <span class="b1-path-arrow">&rarr;</span>
        <span class="b1-path-step">Industrial Analytics</span>
        <span class="b1-path-arrow">&rarr;</span>
        <span class="b1-path-step" style="color: #F5E025; font-weight:700;">Enterprise BI &amp; Fabric</span>
      </div>

      <!-- Core Stack & Passions -->
      <div class="b1-stack-row">
        <span class="b1-stack-pill"><span class="dot"></span>Power BI</span>
        <span class="b1-stack-pill"><span class="dot"></span>Microsoft Fabric</span>
        <span class="b1-stack-pill"><span class="dot"></span>SQL Server</span>
        <span class="b1-stack-pill"><span class="dot"></span>Python</span>
        <span class="b1-stack-pill"><span class="dot"></span>Advanced DAX</span>
        
        <span class="b1-stack-pill interest"><span class="icon">&#129504;</span>Analytical Thinking</span>
        <span class="b1-stack-pill interest"><span class="icon">&#128202;</span>Storytelling</span>
        <span class="b1-stack-pill interest"><span class="icon">&#127912;</span>Dashboard UX</span>
        <span class="b1-stack-pill interest"><span class="icon">&#9968;</span>Trekking</span>
      </div>
    </div>

    <!-- Right: 3x Certified Microsoft Badges Card -->
    <div class="b1-col-right">
      <div class="b1-cert-card">
        <div class="b1-cert-header">
          <span class="b1-cert-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
        </div>
        <div class="b1-cert-title">Official Microsoft Credentials</div>
        
        <div class="b1-badges-trio">
          <div class="b1-badge-item">
            <img src="{b64_pl300}" alt="PL-300" class="b1-badge-img">
            <span class="b1-badge-code">PL-300</span>
          </div>
          <div class="b1-badge-item">
            <img src="{b64_dp600}" alt="DP-600" class="b1-badge-img">
            <span class="b1-badge-code">DP-600</span>
          </div>
          <div class="b1-badge-item">
            <img src="{b64_dp700}" alt="DP-700" class="b1-badge-img">
            <span class="b1-badge-code">DP-700</span>
          </div>
        </div>

        <div class="b1-url-pill">
          <span>tejaswaghmare.me</span>
        </div>
      </div>
    </div>

  </div>
</body>
</html>
"""

# ==============================================================================
# TEMPLATE 2: "The Career Odyssey" (Engineering Rigor ➔ Fabric Intelligence)
# ==============================================================================
html_banner_2 = f"""<!DOCTYPE html>
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
  background: radial-gradient(circle at 12% 80%, rgba(245, 224, 37, 0.15) 0%, transparent 40%),
              radial-gradient(circle at 90% 20%, rgba(245, 224, 37, 0.08) 0%, transparent 50%),
              linear-gradient(180deg, #0e0f14 0%, #14151a 100%);
  padding: 24px 38px 20px 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}}

/* Top Row: Name, Roles & Badges */
.b2-top-row {{
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 2;
}}

.b2-left-spacer {{
  width: 290px;
  flex-shrink: 0;
}}

.b2-brand-block {{
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}}

.b2-name {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 38px;
  font-weight: 800;
  letter-spacing: -0.6px;
  line-height: 1.1;
  color: #ffffff;
}}

.b2-name .gold {{
  color: #F5E025;
}}

.b2-tagline {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 17px;
  font-weight: 600;
  color: #d1d5db;
  display: flex;
  align-items: baseline;
  gap: 8px;
}}

.b2-tagline .serif {{
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-size: 22px;
  color: #F5E025;
}}

.b2-top-right-badges {{
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(24, 25, 31, 0.85);
  border: 1px solid rgba(245, 224, 37, 0.3);
  padding: 8px 16px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}}

.b2-trio-img {{
  width: 44px;
  height: 44px;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
}}

.b2-trio-meta {{
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}}

.b2-trio-badge {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 0.5px;
}}

.b2-trio-sub {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  color: #9ca3af;
}}

/* Middle: Horizontal Career Odyssey Timeline */
.b2-timeline-section {{
  position: relative;
  z-index: 2;
  margin-left: 290px;
  background: rgba(20, 21, 26, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 12px 20px;
  backdrop-filter: blur(10px);
}}

.b2-timeline-title-row {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}}

.b2-timeline-heading {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 1px;
  text-transform: uppercase;
}}

.b2-timeline-quote {{
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-size: 15px;
  color: #9da3af;
}}

.b2-nodes-row {{
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 12px;
}}

.b2-node-card {{
  background: rgba(30, 31, 38, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}}

.b2-node-card.active {{
  border-color: rgba(245, 224, 37, 0.4);
  background: rgba(245, 224, 37, 0.06);
}}

.b2-node-header {{
  display: flex;
  align-items: center;
  gap: 6px;
}}

.b2-node-dot {{
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #F5E025;
}}

.b2-node-title {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
}}

.b2-node-desc {{
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  color: #9da3af;
  line-height: 1.25;
}}

.b2-node-connector {{
  color: #F5E025;
  font-size: 16px;
  font-weight: bold;
}}

/* Bottom Row: Interests, Tools & Contact */
.b2-bottom-row {{
  position: relative;
  z-index: 2;
  margin-left: 290px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}}

.b2-interests-group {{
  display: flex;
  align-items: center;
  gap: 8px;
}}

.b2-interest-tag {{
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(30, 31, 37, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.07);
  padding: 4px 10px;
  border-radius: 9999px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #e5e7eb;
}}

.b2-interest-tag .emoji {{
  font-size: 12px;
}}

.b2-contact-pills {{
  display: flex;
  align-items: center;
  gap: 10px;
}}

.b2-url {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #F5E025;
  background: rgba(245, 224, 37, 0.1);
  border: 1px solid rgba(245, 224, 37, 0.3);
  padding: 4px 12px;
  border-radius: 9999px;
}}
</style>
</head>
<body>
  <div class="b2-root">
    
    <!-- Top Row -->
    <div class="b2-top-row">
      <div class="b2-left-spacer"></div>
      
      <div class="b2-brand-block">
        <h1 class="b2-name">TEJAS <span class="gold">WAGHMARE</span></h1>
        <div class="b2-tagline">
          <span>Microsoft Certified Data Analyst &amp; BI Specialist</span>
          <span class="serif">&mdash; Engineering Rigor to Scalable Intelligence</span>
        </div>
      </div>

      <div class="b2-top-right-badges">
        <img src="{b64_pl300}" class="b2-trio-img" alt="PL-300">
        <img src="{b64_dp600}" class="b2-trio-img" alt="DP-600">
        <img src="{b64_dp700}" class="b2-trio-img" alt="DP-700">
        <div class="b2-trio-meta">
          <span class="b2-trio-badge">3x CERTIFIED</span>
          <span class="b2-trio-sub">PL-300 &bull; DP-600 &bull; DP-700</span>
        </div>
      </div>
    </div>

    <!-- Middle: Career Odyssey Progression Bar -->
    <div class="b2-timeline-section">
      <div class="b2-timeline-title-row">
        <span class="b2-timeline-heading">&#9881; CAREER PATHWAY &amp; SPECIALIZATION</span>
        <span class="b2-timeline-quote">"Structured thinking from mechanical engineering applied to data ecosystems"</span>
      </div>
      
      <div class="b2-nodes-row">
        <!-- Node 1 -->
        <div class="b2-node-card">
          <div class="b2-node-header">
            <span class="b2-node-dot"></span>
            <span class="b2-node-title">1. Engineering Rigor</span>
          </div>
          <p class="b2-node-desc">B.Tech Mechanical (CGPA 8.04) &bull; First-Principles Problem Solving</p>
        </div>

        <span class="b2-node-connector">&rarr;</span>

        <!-- Node 2 -->
        <div class="b2-node-card">
          <div class="b2-node-header">
            <span class="b2-node-dot"></span>
            <span class="b2-node-title">2. Industrial Analytics</span>
          </div>
          <p class="b2-node-desc">Cybernetic India &amp; ASDC &bull; ERP Auditing, KPIs &amp; Predictive ML</p>
        </div>

        <span class="b2-node-connector">&rarr;</span>

        <!-- Node 3 -->
        <div class="b2-node-card active">
          <div class="b2-node-header">
            <span class="b2-node-dot" style="background:#22c55e; box-shadow:0 0 8px #22c55e;"></span>
            <span class="b2-node-title" style="color:#F5E025;">3. Enterprise BI &amp; Fabric</span>
          </div>
          <p class="b2-node-desc">Power BI &bull; Fabric Lakehouses &bull; Star Schema &bull; Executive Dashboards</p>
        </div>
      </div>
    </div>

    <!-- Bottom Row: Personal Passions & URL -->
    <div class="b2-bottom-row">
      <div class="b2-interests-group">
        <span class="b2-interest-tag"><span class="emoji">&#129504;</span> Analytical Thinking</span>
        <span class="b2-interest-tag"><span class="emoji">&#128202;</span> Data Storytelling</span>
        <span class="b2-interest-tag"><span class="emoji">&#127912;</span> Dashboard UI/UX</span>
        <span class="b2-interest-tag"><span class="emoji">&#9968;</span> Mountain Trekking</span>
        <span class="b2-interest-tag"><span class="emoji">&#128640;</span> Continuous Learning</span>
      </div>

      <div class="b2-contact-pills">
        <span class="b2-url">tejaswaghmare.me</span>
      </div>
    </div>

  </div>
</body>
</html>
"""

# ==============================================================================
# TEMPLATE 3: "3D Cybernetic Horizon" (Futuristic Luxury Tech Art)
# ==============================================================================
html_banner_3 = f"""<!DOCTYPE html>
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
  background-color: #0d0e12;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 24px 36px 24px 30px;
}}

/* 3D Rendered Photorealistic Artwork as Deep Background Layer */
.b3-bg-art {{
  position: absolute;
  top: 0;
  right: 0;
  width: 72%;
  height: 100%;
  background-image: url('{b64_bg_3d}');
  background-size: cover;
  background-position: center right;
  opacity: 0.85;
  filter: contrast(1.1) brightness(0.9);
}}

/* Seamless dark gradient fade towards the left avatar bay */
.b3-fade-overlay {{
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, 
    #0c0d11 0%, 
    #0c0d11 22%, 
    rgba(12, 13, 17, 0.95) 32%, 
    rgba(12, 13, 17, 0.6) 55%, 
    rgba(12, 13, 17, 0.15) 85%, 
    transparent 100%);
  pointer-events: none;
}}

.b3-content-grid {{
  position: relative;
  z-index: 2;
  width: 100%;
  display: grid;
  grid-template-columns: 290px 1fr 320px;
  gap: 20px;
  align-items: center;
}}

.b3-col-left {{
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
}}

.b3-status-glow {{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(18, 19, 24, 0.8);
  border: 1px solid rgba(245, 224, 37, 0.35);
  padding: 6px 14px;
  border-radius: 9999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #F5E025;
  width: fit-content;
  backdrop-filter: blur(12px);
}}

.b3-dot {{
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #F5E025;
  box-shadow: 0 0 10px #F5E025;
}}

.b3-col-center {{
  display: flex;
  flex-direction: column;
  gap: 10px;
}}

.b3-credentials-badge {{
  display: flex;
  align-items: center;
  gap: 8px;
}}

.b3-badge-pill {{
  background: rgba(245, 224, 37, 0.15);
  border: 1px solid rgba(245, 224, 37, 0.4);
  color: #F5E025;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}}

.b3-tag-text {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  color: #d1d5db;
  font-weight: 500;
}}

.b3-headline {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -0.8px;
  line-height: 1.05;
  color: #ffffff;
}}

.b3-headline .accent {{
  color: #F5E025;
  text-shadow: 0 0 25px rgba(245, 224, 37, 0.35);
}}

.b3-subline {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #f3f4f6;
  display: flex;
  align-items: baseline;
  gap: 8px;
}}

.b3-subline .serif {{
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-size: 24px;
  color: #F5E025;
}}

.b3-metrics-strip {{
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(18, 19, 25, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 14px;
  border-radius: 12px;
  backdrop-filter: blur(14px);
  width: fit-content;
}}

.b3-metric-val {{
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: #F5E025;
}}

.b3-metric-desc {{
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #d1d5db;
  font-weight: 500;
}}

.b3-chips-row {{
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}}

.b3-chip {{
  background: rgba(25, 26, 32, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 10px;
  border-radius: 9999px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #e5e7eb;
}}

.b3-col-right {{
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
}}

.b3-glass-badges-panel {{
  background: rgba(18, 19, 25, 0.8);
  border: 1px solid rgba(245, 224, 37, 0.3);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 14px 18px;
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}}

.b3-panel-title {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #F5E025;
  letter-spacing: 1px;
  text-transform: uppercase;
}}

.b3-trio-imgs {{
  display: flex;
  align-items: center;
  gap: 10px;
}}

.b3-trio-imgs img {{
  width: 52px;
  height: 52px;
  object-fit: contain;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
}}

.b3-url-tag {{
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  background: rgba(245, 224, 37, 0.15);
  border: 1px solid rgba(245, 224, 37, 0.4);
  padding: 5px 14px;
  border-radius: 9999px;
  letter-spacing: 0.4px;
}}
</style>
</head>
<body>
  <div class="b3-root">
    <div class="b3-bg-art"></div>
    <div class="b3-fade-overlay"></div>

    <div class="b3-content-grid">
      <!-- Left: Profile Bay -->
      <div class="b3-col-left">
        <div class="b3-status-glow">
          <span class="b3-dot"></span>
          <span>AVAILABLE FOR HIRE</span>
        </div>
      </div>

      <!-- Center: Main Headline, Metrics & Stack -->
      <div class="b3-col-center">
        <div class="b3-credentials-badge">
          <span class="b3-badge-pill">MICROSOFT CERTIFIED 3x</span>
          <span class="b3-tag-text">PL-300 &bull; DP-600 &bull; DP-700</span>
        </div>

        <h1 class="b3-headline">TEJAS <span class="accent">WAGHMARE</span></h1>

        <div class="b3-subline">
          <span>Data Analyst &amp; BI Specialist</span>
          <span class="serif">&mdash; Executive Business Intelligence</span>
        </div>

        <div class="b3-metrics-strip">
          <span class="b3-metric-val">$389.3M+</span>
          <span class="b3-metric-desc">Marketplace Data Analyzed</span>
          <span style="color:rgba(255,255,255,0.2)">&bull;</span>
          <span class="b3-metric-val">Star Schema</span>
          <span class="b3-metric-desc">Fabric Lakehouse</span>
        </div>

        <div class="b3-chips-row">
          <span class="b3-chip">Engineering Rigor &rarr; BI</span>
          <span class="b3-chip">Power BI &amp; DAX</span>
          <span class="b3-chip">SQL &amp; Python</span>
          <span class="b3-chip">&#129504; Analytical Thinking</span>
          <span class="b3-chip">&#128202; Data Storytelling</span>
          <span class="b3-chip">&#9968; Trekking</span>
        </div>
      </div>

      <!-- Right: Badges HUD Panel & Domain -->
      <div class="b3-col-right">
        <div class="b3-glass-badges-panel">
          <span class="b3-panel-title">Official Microsoft Badges</span>
          <div class="b3-trio-imgs">
            <img src="{b64_pl300}" alt="PL-300">
            <img src="{b64_dp600}" alt="DP-600">
            <img src="{b64_dp700}" alt="DP-700">
          </div>
        </div>
        <div class="b3-url-tag">tejaswaghmare.me</div>
      </div>

    </div>
  </div>
</body>
</html>
"""

# Write HTML templates to disk
configs = [
    ("banner_1_certified_specialist.html", html_banner_1, "linkedin_banner_1_certified_specialist"),
    ("banner_2_career_pathway.html", html_banner_2, "linkedin_banner_2_career_pathway"),
    ("banner_3_cyber_landscape.html", html_banner_3, "linkedin_banner_3_cyber_landscape"),
]

for html_file, content, png_prefix in configs:
    file_path = os.path.join(WORKSPACE, html_file)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Wrote {html_file}")

# Render using Chrome Headless at 1x (1584x396) and 2x Retina (3168x792)
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

    # Verify generated sizes
    for out_path in [out_1x, out_2x]:
        if os.path.exists(out_path):
            im = Image.open(out_path)
            print(f"Generated: {os.path.basename(out_path)} - {im.size} - {os.path.getsize(out_path):,} bytes")
        else:
            print(f"Failed to generate {out_path}")

print("All banners generated successfully!")
