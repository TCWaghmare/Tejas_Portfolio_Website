/**
 * ==============================================================================
 * Tejas C. Waghmare - Telemetry Command Center & Admin Dashboard Controller (v2.2)
 * 
 * Functions:
 *   1. Zero-Trust Admin Authentication:
 *      - Supabase Google OAuth One-Click Sign-in
 *      - Supabase Auth Email/Password
 *      - Client-Side Web Crypto SHA-256 Master Key Gate
 *   2. Supabase Cloud Pipeline Aggregator (portfolio_events & portfolio_contacts)
 *   3. Real-Time Telemetry Metrics & Recruiter Conversion Funnel
 *   4. High-Fidelity Chart.js Visualizations (Matte Graphite / Electric Yellow Bento)
 *   5. Data Hygiene: Bot Filtering, Admin Self-Exclusion & Test Data Cleanup
 *   6. Full CRM Read/Write/Edit Capabilities (Lead Status, Notes & Star Priority)
 *   7. Audience Geography (City/Country from Vercel Serverless Headers)
 *   8. CSV Exporters for Microsoft Power BI & Excel Modeling
 * ==============================================================================
 */

(function () {
  'use strict';

  // ============================================================================
  // 1. CONFIGURATION & CREDENTIALS
  // ============================================================================
  const CONFIG = {
    authorizedEmail: 'tejaswaghmare900@gmail.com',
    
    // Master security key (fallback if Google OAuth or Supabase Auth is not yet used)
    // SHA-256 hash of "TejasAdmin@2026!"
    masterHash: 'd607d6d478877505c0d2407460ff08899b76f74c75473f41cc084a50e4d3ef64',
    initialPlainSecret: 'TejasAdmin@2026!',

    supabase: {
      url: 'https://tkuggtlofzofaeltlzul.supabase.co',
      anonKey: 'sb_publishable_6jfofP0ME0VE5IrkyxVQGg_miRbVX_0',
      eventsTable: 'portfolio_events',
      contactsTable: 'portfolio_contacts'
    }
  };

  // State Management
  const state = {
    isAuthenticated: false,
    selectedRange: '7d', // 'today', '7d', '30d', 'all'
    filterBots: true,
    events: [],
    contacts: [],
    charts: {},
    liveTickerTimer: null
  };

  // Initialize Supabase Client
  let supaClient = null;
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    supaClient = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
  }

  // ============================================================================
  // 2. AUTHENTICATION & PASSWORD RECOVERY ENGINE (Supabase Auth + Master Key)
  // ============================================================================

  async function sha256(str) {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Toggle Password input visibility (works for any password field ID)
  function togglePasswordVisibility(inputId = 'admin-password') {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  // Standard Admin Login with Supabase Auth
  async function handleAdminLogin(e) {
    if (e) e.preventDefault();
    const emailInput = document.getElementById('admin-email');
    const pwdInput = document.getElementById('admin-password');
    const errBanner = document.getElementById('auth-error-msg');
    const submitBtn = document.getElementById('auth-submit-btn');

    const email = (emailInput.value || '').trim().toLowerCase();
    const password = (pwdInput.value || '').trim();

    errBanner.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.querySelector('.auth-btn-text').textContent = 'Verifying credentials...';

    // 1. Verify email identity against authorized admin email
    if (email !== CONFIG.authorizedEmail.toLowerCase()) {
      showAuthError('Access Denied. Only the authorized administrator account can unlock this dashboard.');
      submitBtn.disabled = false;
      submitBtn.querySelector('.auth-btn-text').textContent = 'Authenticate & Unlock';
      return;
    }

    try {
      let authSuccessful = false;
      let supaAuthError = null;

      // 2. Authenticate directly via Supabase Auth
      if (supaClient && supaClient.auth) {
        try {
          const { data, error } = await supaClient.auth.signInWithPassword({
            email: email,
            password: password
          });
          if (data && data.session) {
            authSuccessful = true;
            sessionStorage.setItem('tp_supabase_jwt', data.session.access_token);
            if (data.user) sessionStorage.setItem('tp_admin_email', data.user.email);
          } else if (error) {
            supaAuthError = error.message;
          }
        } catch (supaErr) {
          supaAuthError = supaErr.message;
        }
      }

      // 3. Fallback to Master Passcode / SHA-256 Verification
      if (!authSuccessful) {
        const inputHash = await sha256(password);
        if (inputHash === CONFIG.masterHash || password === CONFIG.initialPlainSecret) {
          authSuccessful = true;
        }
      }

      if (authSuccessful) {
        state.isAuthenticated = true;
        sessionStorage.setItem('tp_admin_auth_token', 'authorized_' + Date.now());
        unlockDashboard();
      } else {
        let errorHint = 'Invalid email or password.';
        if (supaAuthError) {
          errorHint = supaAuthError;
        }
        showAuthError(errorHint);
      }
    } catch (err) {
      showAuthError('Authentication error: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('.auth-btn-text').textContent = 'Authenticate & Unlock';
    }
  }

  function showAuthError(msg) {
    const errBanner = document.getElementById('auth-error-msg');
    errBanner.textContent = msg;
    errBanner.style.display = 'block';
  }

  function unlockDashboard() {
    document.getElementById('auth-gate').style.display = 'none';
    document.getElementById('dashboard-app').style.display = 'block';

    // Check opt-out toggle state
    const optOutCheckbox = document.getElementById('admin-optout-checkbox');
    if (optOutCheckbox) {
      optOutCheckbox.checked = (localStorage.getItem('tp_admin_opt_out') === 'true');
    }

    // Check bot filter state
    const botCheckbox = document.getElementById('bot-filter-checkbox');
    if (botCheckbox) {
      botCheckbox.checked = state.filterBots;
    }

    // Load Data
    fetchDashboardData();

    // Start Live Heartbeat Ticker
    if (state.liveTickerTimer) clearInterval(state.liveTickerTimer);
    state.liveTickerTimer = setInterval(fetchLiveActiveCount, 30000);
  }

  function handleAdminLogout() {
    sessionStorage.removeItem('tp_admin_auth_token');
    sessionStorage.removeItem('tp_supabase_jwt');
    if (supaClient && supaClient.auth) supaClient.auth.signOut().catch(() => {});
    window.location.reload();
  }

  // Handle Setting New Password when arriving from Supabase Email Recovery Link
  async function handleUpdateNewPassword(e) {
    if (e) e.preventDefault();
    const newPwdInput = document.getElementById('new-password');
    const confirmPwdInput = document.getElementById('confirm-password');
    const errBanner = document.getElementById('reset-error-msg');
    const submitBtn = document.getElementById('reset-submit-btn');

    const newPassword = (newPwdInput.value || '').trim();
    const confirmPassword = (confirmPwdInput.value || '').trim();

    errBanner.style.display = 'none';

    if (newPassword.length < 6) {
      errBanner.textContent = 'Password must be at least 6 characters long.';
      errBanner.style.display = 'block';
      return;
    }

    if (newPassword !== confirmPassword) {
      errBanner.textContent = 'Passwords do not match. Please re-enter identical passwords.';
      errBanner.style.display = 'block';
      return;
    }

    if (!supaClient || !supaClient.auth) {
      errBanner.textContent = 'Supabase client unavailable.';
      errBanner.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.querySelector('.reset-btn-text').textContent = 'Updating password...';

    try {
      const { data, error } = await supaClient.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      showToast('Password updated successfully! Unlocking...', 'success');
      state.isAuthenticated = true;
      sessionStorage.setItem('tp_admin_auth_token', 'supabase_auth_' + Date.now());
      if (data && data.user) {
        sessionStorage.setItem('tp_admin_email', data.user.email);
      }

      // Clean recovery tokens from address bar URL
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, null, window.location.pathname);
      }

      unlockDashboard();
    } catch (err) {
      errBanner.textContent = 'Password update failed: ' + (err.message || 'Session expired. Please request a new reset link.');
      errBanner.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.querySelector('.reset-btn-text').textContent = 'Save New Password & Unlock';
    }
  }

  // Show recovery box if arriving via a verified Supabase recovery email link
  function checkRecoveryState() {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const isRecovery = hash.includes('type=recovery') || search.includes('type=recovery');

    if (isRecovery) {
      const loginBox = document.getElementById('auth-login-box');
      const recoveryBox = document.getElementById('auth-recovery-box');
      if (loginBox) loginBox.style.display = 'none';
      if (recoveryBox) recoveryBox.style.display = 'block';
    }

    if (supaClient && supaClient.auth) {
      try {
        supaClient.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            const loginBox = document.getElementById('auth-login-box');
            const recoveryBox = document.getElementById('auth-recovery-box');
            if (loginBox) loginBox.style.display = 'none';
            if (recoveryBox) recoveryBox.style.display = 'block';
          }
        });
      } catch (e) {}
    }
  }

  async function checkStoredSession() {
    // 0. Check if arriving via Supabase password recovery link
    checkRecoveryState();

    // 1. Check active Supabase Auth session first
    if (supaClient && supaClient.auth) {
      try {
        const { data } = await supaClient.auth.getSession();
        if (data && data.session && data.session.user && data.session.user.email.toLowerCase() === CONFIG.authorizedEmail.toLowerCase()) {
          state.isAuthenticated = true;
          sessionStorage.setItem('tp_supabase_jwt', data.session.access_token);
          sessionStorage.setItem('tp_admin_auth_token', 'supabase_session_' + Date.now());
          unlockDashboard();
          return;
        }
      } catch (e) {
        console.warn('Supabase getSession notice:', e);
      }
    }

    // 2. Check local session storage token
    const token = sessionStorage.getItem('tp_admin_auth_token');
    if (token) {
      state.isAuthenticated = true;
      unlockDashboard();
    }
  }

  // ============================================================================
  // 3. TOGGLE CONTROLS (Admin Opt-Out & Bot Filter)
  // ============================================================================

  function handleAdminOptOutToggle(checkbox) {
    if (checkbox.checked) {
      localStorage.setItem('tp_admin_opt_out', 'true');
      showToast('Admin Opt-Out active. Your visits are now excluded.', 'success');
    } else {
      localStorage.removeItem('tp_admin_opt_out');
      showToast('Admin Opt-Out disabled. Your visits will be tracked.', 'success');
    }
  }

  function handleBotFilterToggle(checkbox) {
    state.filterBots = checkbox.checked;
    computeAndRenderKPIs();
    renderCharts();
    renderAuditTable();
    showToast(state.filterBots ? 'Bot traffic filtered out.' : 'Showing all traffic including bots.', 'info');
  }

  // ============================================================================
  // 4. SUPABASE DATA QUERY & PIPELINE
  // ============================================================================

  function getDateFilterISO(range) {
    const now = new Date();
    if (range === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return todayStart.toISOString();
    }
    if (range === '7d') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d.toISOString();
    }
    if (range === '30d') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return d.toISOString();
    }
    return null; // 'all'
  }

  async function fetchDashboardData(isManualRefresh = false) {
    const refreshBtn = document.querySelector('.dash-icon-btn');
    if (refreshBtn) refreshBtn.classList.add('rotating');

    try {
      const startDate = getDateFilterISO(state.selectedRange);

      // Build fetch URL for events
      let eventsUrl = `${CONFIG.supabase.url}/rest/v1/${CONFIG.supabase.eventsTable}?select=*&order=created_at.desc&limit=2500`;
      if (startDate) {
        eventsUrl += `&created_at=gte.${encodeURIComponent(startDate)}`;
      }

      // Build fetch URL for contacts
      const contactsUrl = `${CONFIG.supabase.url}/rest/v1/${CONFIG.supabase.contactsTable}?select=*&order=created_at.desc`;

      const headers = {
        'apikey': CONFIG.supabase.anonKey,
        'Content-Type': 'application/json'
      };
      const jwt = sessionStorage.getItem('tp_supabase_jwt');
      if (jwt) {
        headers['Authorization'] = `Bearer ${jwt}`;
      } else if (CONFIG.supabase.anonKey.startsWith('eyJ')) {
        headers['Authorization'] = `Bearer ${CONFIG.supabase.anonKey}`;
      }

      // Parallel Fetch
      const [eventsRes, contactsRes] = await Promise.all([
        fetch(eventsUrl, { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(contactsUrl, { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      state.events = eventsRes || [];
      state.contacts = contactsRes || [];

      // Compute & Render all components
      computeAndRenderKPIs();
      renderCharts();
      renderCRMTable();
      renderAuditTable();
      fetchLiveActiveCount();

      if (isManualRefresh) {
        showToast(`Telemetry updated: ${state.events.length} events loaded.`, 'success');
      }
    } catch (err) {
      showToast('Error fetching telemetry data: ' + err.message, 'error');
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('rotating');
    }
  }

  function setFilterRange(range) {
    state.selectedRange = range;
    document.querySelectorAll('.dash-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-range') === range);
    });
    fetchDashboardData();
  }

  // ============================================================================
  // 5. METRIC COMPUTATION & KPI RENDERING
  // ============================================================================

  function computeAndRenderKPIs() {
    // Filter bots if active
    const events = state.filterBots ? state.events.filter(e => !e.is_bot) : state.events;

    // 1. Visitors & Sessions
    const visitorsSet = new Set();
    const sessionsSet = new Set();
    let returningCount = 0;
    let totalDwellSeconds = 0;
    let dwellCount = 0;

    // High Intent metrics
    let resumePreviews = 0;
    let resumeDownloads = 0;
    let formStarts = 0;
    let formSubmissions = 0;

    // Bounce tracking
    const sessionEventCounts = {};

    events.forEach(ev => {
      const vId = ev.visitor_id || (ev.metadata && ev.metadata.visitor_id) || 'anon';
      const sId = ev.session_id || (ev.metadata && ev.metadata.session_id) || 'ses_anon';

      visitorsSet.add(vId);
      sessionsSet.add(sId);

      sessionEventCounts[sId] = (sessionEventCounts[sId] || 0) + 1;

      if (ev.metadata && ev.metadata.is_returning) {
        returningCount++;
      }

      if (ev.dwell_time_seconds > 0) {
        totalDwellSeconds += Number(ev.dwell_time_seconds);
        dwellCount++;
      }

      if (ev.event_name === 'resume_preview_open' || (ev.element && ev.element.includes('resume-nav'))) resumePreviews++;
      if (ev.event_name === 'resume_download' || (ev.element && ev.element.includes('resume-download'))) resumeDownloads++;
      if (ev.event_name === 'form_start') formStarts++;
      if (ev.event_name === 'form_submit') formSubmissions++;
    });

    const totalVisitors = visitorsSet.size;
    const totalSessions = sessionsSet.size || 1;
    const totalPageviews = events.filter(e => e.event_name === 'page_view').length;

    // Avg Focused Dwell Time
    const avgDwellSeconds = dwellCount > 0 ? Math.round(totalDwellSeconds / dwellCount) : 0;
    const dwellDisplay = avgDwellSeconds > 60
      ? `${Math.floor(avgDwellSeconds / 60)}m ${avgDwellSeconds % 60}s`
      : `${avgDwellSeconds}s`;

    // Returning Ratio
    const returnPct = totalVisitors > 0 ? Math.min(100, Math.round((returningCount / totalVisitors) * 100)) : 0;
    const newPct = 100 - returnPct;

    // Views per Session
    const viewsPerSession = (totalPageviews / totalSessions).toFixed(1);

    // High-Value Conversions (Resume Downloads + Inquiries)
    const totalConversions = resumeDownloads + state.contacts.length;
    const conversionRate = totalVisitors > 0
      ? ((totalConversions / totalVisitors) * 100).toFixed(1)
      : '0.0';

    // Bounce Rate
    let singleHitSessions = 0;
    Object.values(sessionEventCounts).forEach(cnt => {
      if (cnt === 1) singleHitSessions++;
    });
    const bounceRate = totalSessions > 0
      ? ((singleHitSessions / totalSessions) * 100).toFixed(1)
      : '0.0';

    // Update KPI DOM
    document.getElementById('kpi-visitors').textContent = totalVisitors.toLocaleString();
    document.getElementById('kpi-returning-ratio').textContent = `${newPct}% New / ${returnPct}% Return`;

    document.getElementById('kpi-pageviews').textContent = totalPageviews.toLocaleString();
    document.getElementById('kpi-views-per-session').textContent = `${viewsPerSession} Views / Session`;

    document.getElementById('kpi-dwell-time').textContent = dwellDisplay;

    document.getElementById('kpi-resume-rate').textContent = `${conversionRate}%`;
    document.getElementById('kpi-resume-counts').textContent = `${resumeDownloads} CVs / ${state.contacts.length} Leads`;

    document.getElementById('kpi-bounce-rate').textContent = `${bounceRate}%`;

    // Update Funnel Component
    updateFunnelUI(totalVisitors, events, resumePreviews + formStarts, totalConversions);
  }

  function updateFunnelUI(totalVisitors, events, intentActions, totalConversions) {
    const projectViews = events.filter(e => e.event_name === 'project_view' || e.event_name === 'project_inspect' || (e.element && e.element.startsWith('project-'))).length;

    document.getElementById('funnel-v-count').textContent = totalVisitors.toLocaleString();
    document.getElementById('funnel-p-count').textContent = projectViews.toLocaleString();
    document.getElementById('funnel-r-count').textContent = intentActions.toLocaleString();
    document.getElementById('funnel-d-count').textContent = totalConversions.toLocaleString();

    const base = totalVisitors || 1;
    const pPct = Math.min(100, Math.round((projectViews / base) * 100));
    const rPct = Math.min(100, Math.round((intentActions / base) * 100));
    const dPct = Math.min(100, Math.round((totalConversions / base) * 100));

    document.getElementById('funnel-p-bar').style.width = `${Math.max(5, pPct)}%`;
    document.getElementById('funnel-p-conv').textContent = `${pPct}% of visitors`;

    document.getElementById('funnel-r-bar').style.width = `${Math.max(5, rPct)}%`;
    document.getElementById('funnel-r-conv').textContent = `${rPct}% showed recruiter intent`;

    document.getElementById('funnel-d-bar').style.width = `${Math.max(5, dPct)}%`;
    document.getElementById('funnel-d-conv').textContent = `${dPct}% converted`;
  }

  async function fetchLiveActiveCount() {
    try {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const url = `${CONFIG.supabase.url}/rest/v1/${CONFIG.supabase.eventsTable}?select=visitor_id&created_at=gte.${encodeURIComponent(fiveMinsAgo)}`;
      const headers = { 'apikey': CONFIG.supabase.anonKey };
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        const activeVisitors = new Set(data.map(d => d.visitor_id)).size;
        const countDisplay = activeVisitors > 0 ? activeVisitors : 1;
        document.getElementById('live-visitors-count').textContent = `Live: ${countDisplay} Active`;
      }
    } catch (e) {}
  }

  // ============================================================================
  // 6. CHART.JS VISUALIZATIONS
  // ============================================================================

  function renderCharts() {
    renderTrafficTrendChart();
    renderPlatformPieChart();
    renderSectionDwellChart();
    renderButtonClicksChart();
    renderHardwareStats();
  }

  // 1. Traffic Velocity Chart (Daily Line)
  function renderTrafficTrendChart() {
    const ctx = document.getElementById('trafficTrendChart');
    if (!ctx) return;

    const events = state.filterBots ? state.events.filter(e => !e.is_bot) : state.events;

    const dailyViews = {};
    const dailyVisitors = {};

    events.forEach(ev => {
      const dateStr = ev.created_at ? ev.created_at.split('T')[0] : 'Today';
      dailyViews[dateStr] = (dailyViews[dateStr] || 0) + (ev.event_name === 'page_view' ? 1 : 0);
      
      if (!dailyVisitors[dateStr]) dailyVisitors[dateStr] = new Set();
      if (ev.visitor_id) dailyVisitors[dateStr].add(ev.visitor_id);
    });

    const labels = Object.keys(dailyViews).sort();
    if (labels.length === 0) labels.push('No Data');

    const viewsData = labels.map(l => dailyViews[l] || 0);
    const visitorsData = labels.map(l => (dailyVisitors[l] ? dailyVisitors[l].size : 0));

    if (state.charts.traffic) state.charts.traffic.destroy();

    state.charts.traffic = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Pageviews',
            data: viewsData,
            borderColor: '#F5E025',
            backgroundColor: 'rgba(245, 224, 37, 0.1)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#F5E025',
            pointRadius: 4
          },
          {
            label: 'Unique Visitors',
            data: visitorsData,
            borderColor: '#38bdf8',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.35,
            pointBackgroundColor: '#38bdf8',
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2025',
            titleColor: '#ffffff',
            bodyColor: '#9da3af',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            displayColors: true
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#6b7280', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#6b7280', font: { family: 'JetBrains Mono', size: 10 }, stepSize: 1 }
          }
        }
      }
    });
  }

  // 2. Acquisition Platforms (Doughnut)
  function renderPlatformPieChart() {
    const ctx = document.getElementById('platformPieChart');
    if (!ctx) return;

    const events = state.filterBots ? state.events.filter(e => !e.is_bot) : state.events;

    const platformCounts = {};
    events.forEach(ev => {
      let src = ev.platform_source || 'direct';
      if (ev.utm_source) src = ev.utm_source;
      platformCounts[src] = (platformCounts[src] || 0) + 1;
    });

    const labels = Object.keys(platformCounts);
    const data = labels.map(l => platformCounts[l]);

    const colors = [
      '#F5E025', // Electric Yellow
      '#0a66c2', // LinkedIn Blue
      '#a855f7', // GitHub Purple
      '#38bdf8', // Google/Direct Cyan
      '#22c55e', // WhatsApp Green
      '#f97316', // Naukri Orange
      '#ec4899'  // Pink
    ];

    if (state.charts.platform) state.charts.platform.destroy();

    state.charts.platform = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data.length > 0 ? data : [1],
          backgroundColor: data.length > 0 ? colors.slice(0, data.length) : ['#2a2b31'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '68%'
      }
    });

    // Render Platform List
    const listContainer = document.getElementById('platform-breakdown-list');
    listContainer.innerHTML = '';
    labels.forEach((plat, idx) => {
      const item = document.createElement('div');
      item.className = 'source-item';
      item.innerHTML = `
        <span class="source-name">
          <span class="legend-color" style="background: ${colors[idx % colors.length]};"></span>
          ${plat}
        </span>
        <span class="source-count">${platformCounts[plat]} hits</span>
      `;
      listContainer.appendChild(item);
    });
  }

  // 3. Section Scroll Dwell Heatmap (Horizontal Bar)
  function renderSectionDwellChart() {
    const ctx = document.getElementById('sectionDwellChart');
    if (!ctx) return;

    const events = state.filterBots ? state.events.filter(e => !e.is_bot) : state.events;

    const sectionDwells = {};
    const sectionCounts = {};

    events.filter(e => e.event_name === 'section_dwell' && e.section_id).forEach(ev => {
      const sec = ev.section_id;
      sectionDwells[sec] = (sectionDwells[sec] || 0) + Number(ev.dwell_time_seconds || 0);
      sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
    });

    const labels = ['projects', 'about', 'experience', 'skills', 'certificates', 'contact', 'hero'];
    const avgData = labels.map(l => {
      if (!sectionCounts[l]) return 0;
      return Math.round((sectionDwells[l] / sectionCounts[l]) * 10) / 10;
    });

    if (state.charts.section) state.charts.section.destroy();

    state.charts.section = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.map(l => l.toUpperCase()),
        datasets: [{
          label: 'Avg Dwell Seconds',
          data: avgData,
          backgroundColor: avgData.map(v => v >= 10 ? '#F5E025' : '#38bdf8'),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#6b7280', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#ffffff', font: { family: 'JetBrains Mono', size: 11, weight: 'bold' } }
          }
        }
      }
    });
  }

  // 4. Interactive Button & CTA Matrix
  function renderButtonClicksChart() {
    const ctx = document.getElementById('buttonClicksChart');
    if (!ctx) return;

    const events = state.filterBots ? state.events.filter(e => !e.is_bot) : state.events;

    const buttonCounts = {
      'Resume Download': 0,
      'Resume Preview': 0,
      'Project Demo/Inspect': 0,
      'GitHub Repos': 0,
      'Credly Badges': 0,
      'Contact Channels': 0
    };

    events.forEach(ev => {
      const el = ev.element || '';
      if (ev.event_name === 'resume_download' || el.includes('resume-download')) buttonCounts['Resume Download']++;
      if (ev.event_name === 'resume_preview_open' || el.includes('resume-nav')) buttonCounts['Resume Preview']++;
      if (ev.event_name === 'project_inspect' || ev.event_name === 'lightbox_open' || el.startsWith('project-')) buttonCounts['Project Demo/Inspect']++;
      if (ev.event_name === 'project_github_click' || el.includes('github')) buttonCounts['GitHub Repos']++;
      if (ev.event_name === 'credential_verify_click' || el.startsWith('credential-') || el.includes('credly')) buttonCounts['Credly Badges']++;
      if (ev.event_name === 'contact_channel_click' || ev.event_name === 'contact_modal_open' || el.startsWith('contact-')) buttonCounts['Contact Channels']++;
    });

    const labels = Object.keys(buttonCounts);
    const data = labels.map(l => buttonCounts[l]);

    if (state.charts.buttons) state.charts.buttons.destroy();

    state.charts.buttons = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: '#F5E025',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#9da3af', font: { size: 10 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#6b7280', font: { family: 'JetBrains Mono', size: 10 }, stepSize: 1 }
          }
        }
      }
    });
  }

  // 5. Hardware & Audience Geography Breakdown
  function renderHardwareStats() {
    const events = state.filterBots ? state.events.filter(e => !e.is_bot) : state.events;

    const devices = { desktop: 0, mobile: 0, tablet: 0 };
    const browserCounts = {};
    const geoCounts = {};

    events.forEach(ev => {
      if (ev.device_type) devices[ev.device_type] = (devices[ev.device_type] || 0) + 1;
      if (ev.browser) browserCounts[ev.browser] = (browserCounts[ev.browser] || 0) + 1;

      // Geography
      let loc = '';
      if (ev.city && ev.country) loc = `${ev.city}, ${ev.country}`;
      else if (ev.country) loc = ev.country;
      else if (ev.country_timezone) {
        const parts = ev.country_timezone.split('/');
        loc = parts[parts.length - 1].replace(/_/g, ' ');
      }
      if (loc) geoCounts[loc] = (geoCounts[loc] || 0) + 1;
    });

    const totalDev = (devices.desktop + devices.mobile + devices.tablet) || 1;
    const devContainer = document.getElementById('tech-device-list');
    devContainer.innerHTML = `
      <div class="tech-row"><span class="tech-name">Desktop</span><span class="tech-pct">${Math.round((devices.desktop / totalDev) * 100)}%</span></div>
      <div class="tech-row"><span class="tech-name">Mobile</span><span class="tech-pct">${Math.round((devices.mobile / totalDev) * 100)}%</span></div>
      <div class="tech-row"><span class="tech-name">Tablet</span><span class="tech-pct">${Math.round((devices.tablet / totalDev) * 100)}%</span></div>
    `;

    const browserContainer = document.getElementById('tech-browser-list');
    browserContainer.innerHTML = Object.keys(browserCounts).slice(0, 3).map(br => `
      <div class="tech-row"><span class="tech-name">${br}</span><span class="tech-pct">${browserCounts[br]}</span></div>
    `).join('') || '<div class="tech-row"><span class="tech-name">No data yet</span></div>';

    // Top Locations (Claude Proposal)
    const geoContainer = document.getElementById('tech-geo-list');
    if (geoContainer) {
      const topLocations = Object.keys(geoCounts).sort((a, b) => geoCounts[b] - geoCounts[a]).slice(0, 3);
      if (topLocations.length > 0) {
        geoContainer.innerHTML = topLocations.map(loc => `
          <div class="tech-row"><span class="tech-name">${loc}</span><span class="tech-pct">${geoCounts[loc]} hits</span></div>
        `).join('');
      } else {
        geoContainer.innerHTML = '<div class="tech-row"><span class="tech-name">Global (Direct)</span><span class="tech-pct">100%</span></div>';
      }
    }
  }


  // ============================================================================
  // 7. INQUIRY CRM (READ, WRITE, EDIT DATA CONTROLS)
  // ============================================================================

  function renderCRMTable() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;

    if (state.contacts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty-row">No contact inquiries recorded yet. Form submissions will appear here in real-time.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.contacts.map(c => {
      const dateStr = c.created_at ? new Date(c.created_at).toLocaleString() : 'N/A';
      const status = c.status || 'new';
      const starred = c.starred ? 'starred' : '';
      const notes = c.admin_notes || '';

      return `
        <tr data-contact-id="${c.id}">
          <td>
            <button type="button" class="star-btn ${starred}" onclick="toggleContactStar(${c.id}, ${!c.starred})" title="Star inquiry">
              ★
            </button>
          </td>
          <td style="font-family: var(--font-mono); font-size: 11px;">${dateStr}</td>
          <td>
            <div class="sender-name">${escapeHtml(c.name || 'Anonymous')}</div>
            <div class="sender-email"><a href="mailto:${escapeHtml(c.email || '')}" style="color: inherit;">${escapeHtml(c.email || '')}</a></div>
            ${c.phone ? `<div class="sender-email">Tel: ${escapeHtml(c.phone)}</div>` : ''}
          </td>
          <td>
            <span class="badge-pill new">${escapeHtml(c.topic || 'General')}</span>
            ${c.urgency ? `<span class="badge-pill discussion" style="margin-top: 4px;">${escapeHtml(c.urgency)}</span>` : ''}
          </td>
          <td style="max-width: 280px; font-size: 11.5px; line-height: 1.4;">
            ${escapeHtml(c.message || '')}
          </td>
          <td>
            <select class="status-select" onchange="updateContactStatus(${c.id}, this.value)">
              <option value="new" ${status === 'new' ? 'selected' : ''}>New Inquiry</option>
              <option value="in_discussion" ${status === 'in_discussion' ? 'selected' : ''}>In Discussion</option>
              <option value="interview_scheduled" ${status === 'interview_scheduled' ? 'selected' : ''}>Interview Scheduled</option>
              <option value="archived" ${status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </td>
          <td>
            <input type="text" class="notes-input" value="${escapeHtml(notes)}" placeholder="Add note &amp; press Enter" onchange="updateContactNotes(${c.id}, this.value)">
          </td>
          <td>
            <button type="button" class="dash-btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deleteContact(${c.id})">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Update Status in Supabase (WRITE / EDIT)
  async function updateContactStatus(id, newStatus) {
    try {
      const endpoint = `${CONFIG.supabase.url}/rest/v1/${CONFIG.supabase.contactsTable}?id=eq.${id}`;
      const headers = {
        'apikey': CONFIG.supabase.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      };
      const jwt = sessionStorage.getItem('tp_supabase_jwt');
      if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        showToast('Lead status updated successfully.', 'success');
      } else {
        throw new Error('Server returned ' + res.status);
      }
    } catch (e) {
      showToast('Error updating status: ' + e.message, 'error');
    }
  }

  // Update Notes in Supabase (WRITE / EDIT)
  async function updateContactNotes(id, notes) {
    try {
      const endpoint = `${CONFIG.supabase.url}/rest/v1/${CONFIG.supabase.contactsTable}?id=eq.${id}`;
      const headers = {
        'apikey': CONFIG.supabase.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      };
      const jwt = sessionStorage.getItem('tp_supabase_jwt');
      if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ admin_notes: notes })
      });

      if (res.ok) {
        showToast('Admin note saved.', 'success');
      }
    } catch (e) {
      showToast('Error saving note: ' + e.message, 'error');
    }
  }

  // Toggle Star Priority
  async function toggleContactStar(id, isStarred) {
    try {
      const endpoint = `${CONFIG.supabase.url}/rest/v1/${CONFIG.supabase.contactsTable}?id=eq.${id}`;
      const headers = {
        'apikey': CONFIG.supabase.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      };
      const jwt = sessionStorage.getItem('tp_supabase_jwt');
      if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

      await fetch(endpoint, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ starred: isStarred })
      });

      fetchDashboardData();
    } catch (e) {}
  }

  // Delete Contact
  async function deleteContact(id) {
    if (!confirm('Are you sure you want to delete this contact submission?')) return;
    try {
      const endpoint = `${CONFIG.supabase.url}/rest/v1/${CONFIG.supabase.contactsTable}?id=eq.${id}`;
      const headers = {
        'apikey': CONFIG.supabase.anonKey,
        'Prefer': 'return=minimal'
      };
      const jwt = sessionStorage.getItem('tp_supabase_jwt');
      if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

      await fetch(endpoint, { method: 'DELETE', headers });
      showToast('Inquiry deleted.', 'success');
      fetchDashboardData();
    } catch (e) {
      showToast('Error deleting contact: ' + e.message, 'error');
    }
  }


  // ============================================================================
  // 8. AUDIT TABLE & RECENT EVENTS
  // ============================================================================

  function renderAuditTable() {
    const tbody = document.getElementById('audit-table-body');
    if (!tbody) return;

    const events = state.filterBots ? state.events.filter(e => !e.is_bot) : state.events;
    const recent = events.slice(0, 50);

    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty-row">No telemetry events logged yet for this period.</td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map(ev => {
      const dateStr = ev.created_at ? new Date(ev.created_at).toLocaleTimeString() : 'N/A';
      const target = ev.element || ev.project_name || ev.section_id || ev.page_path || '-';
      const dwell = ev.dwell_time_seconds ? `${ev.dwell_time_seconds}s` : '-';
      const metaStr = ev.metadata ? JSON.stringify(ev.metadata).substring(0, 60) : '{}';

      return `
        <tr>
          <td style="font-family: var(--font-mono); font-size: 11px;">${dateStr}</td>
          <td>
            <strong style="color: var(--text-pure); font-family: var(--font-mono);">${escapeHtml(ev.event_name)}</strong>
            ${ev.is_bot ? '<span style="font-size: 9px; color: #f87171; margin-left: 4px;">[BOT]</span>' : ''}
          </td>
          <td><span class="badge-pill new">${escapeHtml(ev.event_category || 'general')}</span></td>
          <td style="text-transform: capitalize;">${escapeHtml(ev.platform_source || 'direct')}</td>
          <td>${escapeHtml(ev.device_type || 'desktop')}</td>
          <td>${escapeHtml(target)}</td>
          <td style="font-family: var(--font-mono);">${dwell}</td>
          <td style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(metaStr)}">${escapeHtml(metaStr)}</td>
        </tr>
      `;
    }).join('');
  }

  // Clean Test Events
  async function promptCleanTestEvents() {
    if (!confirm('Clean all test events where referrer is internal or page_path is local? This will clean up test metrics.')) return;

    try {
      const endpoint = `${CONFIG.supabase.url}/rest/v1/${CONFIG.supabase.eventsTable}?platform_source=eq.internal`;
      const headers = { 'apikey': CONFIG.supabase.anonKey };
      const jwt = sessionStorage.getItem('tp_supabase_jwt');
      if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

      await fetch(endpoint, { method: 'DELETE', headers });
      showToast('Test telemetry events cleaned.', 'success');
      fetchDashboardData();
    } catch (e) {
      showToast('Cleanup error: ' + e.message, 'error');
    }
  }


  // ============================================================================
  // 9. CSV EXPORTERS (FOR POWER BI & EXCEL MODELING)
  // ============================================================================

  function exportEventsToCSV() {
    if (state.events.length === 0) {
      showToast('No events available to export.', 'error');
      return;
    }

    const headers = ['id', 'timestamp', 'event_name', 'event_category', 'platform_source', 'element', 'dwell_time_seconds', 'country', 'city', 'device_type', 'browser', 'os', 'is_bot'];
    const rows = state.events.map(ev => [
      ev.id || '',
      ev.created_at || '',
      `"${ev.event_name || ''}"`,
      `"${ev.event_category || ''}"`,
      `"${ev.platform_source || ''}"`,
      `"${ev.element || ev.project_name || ''}"`,
      ev.dwell_time_seconds || 0,
      `"${ev.country || ''}"`,
      `"${ev.city || ''}"`,
      `"${ev.device_type || ''}"`,
      `"${ev.browser || ''}"`,
      `"${ev.os || ''}"`,
      ev.is_bot ? 'TRUE' : 'FALSE'
    ]);

    downloadCSV([headers, ...rows], `tejas_portfolio_events_${Date.now()}.csv`);
  }

  function exportContactsToCSV() {
    if (state.contacts.length === 0) {
      showToast('No contacts available to export.', 'error');
      return;
    }

    const headers = ['id', 'created_at', 'name', 'email', 'phone', 'topic', 'urgency', 'status', 'admin_notes', 'message'];
    const rows = state.contacts.map(c => [
      c.id || '',
      c.created_at || '',
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      `"${c.topic || ''}"`,
      `"${c.urgency || ''}"`,
      `"${c.status || ''}"`,
      `"${(c.admin_notes || '').replace(/"/g, '""')}"`,
      `"${(c.message || '').replace(/"/g, '""')}"`
    ]);

    downloadCSV([headers, ...rows], `tejas_portfolio_contacts_${Date.now()}.csv`);
  }

  function downloadCSV(rows, filename) {
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded: ${filename}`, 'success');
  }


  // ============================================================================
  // 10. UTILITIES
  // ============================================================================

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('dash-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `dash-toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Global window exposure for UI button triggers
  window.handleAdminLogin = handleAdminLogin;
  window.handleUpdateNewPassword = handleUpdateNewPassword;
  window.handleAdminLogout = handleAdminLogout;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.setFilterRange = setFilterRange;
  window.fetchDashboardData = fetchDashboardData;
  window.handleAdminOptOutToggle = handleAdminOptOutToggle;
  window.handleBotFilterToggle = handleBotFilterToggle;
  window.updateContactStatus = updateContactStatus;
  window.updateContactNotes = updateContactNotes;
  window.toggleContactStar = toggleContactStar;
  window.deleteContact = deleteContact;
  window.promptCleanTestEvents = promptCleanTestEvents;
  window.exportEventsToCSV = exportEventsToCSV;
  window.exportContactsToCSV = exportContactsToCSV;

  // Auto-launch verification
  checkStoredSession();

})();
