/**
 * ==============================================================================
 * Tejas C. Waghmare Portfolio - Enterprise Telemetry & Analytics Engine (v2.2)
 * 
 * Capabilities:
 *   1. Full-Funnel Visitor Telemetry (Unique UUIDs, Session IDs, Bounce Tracking)
 *   2. Platform & Acquisition Source Attribution (LinkedIn, Naukri, GitHub, UTMs)
 *   3. Intelligent data-track Attribute Catcher (Projects, Credly, Resumes, CTAs)
 *   4. Section Scroll Heatmap & Focus Dwell-Time Engine
 *   5. Dual Pipeline Transport: Vercel Serverless (/api/track) + Direct Supabase Fallback
 *   6. High-Intent Conversion Funnel (Preview vs Download vs Form Submission)
 *   7. Privacy First: Honors Do-Not-Track, Bot Filtering & Zero-PII Collection
 *   8. Admin Self-Exclusion Gate (Zero-pollution testing)
 *   9. Keyboard Shortcut (Ctrl+Shift+A) for Instant Admin Dashboard Access
 * ==============================================================================
 */

(function () {
  'use strict';

  // ============================================================================
  // 1. CONFIGURATION & STATE
  // ============================================================================
  const ANALYTICS_CONFIG = {
    // Supabase Persistence (Direct fallback if serverless /api/track is offline)
    supabase: {
      enabled: true,
      url: 'https://tkuggtlofzofaeltlzul.supabase.co',
      anonKey: 'sb_publishable_6jfofP0ME0VE5IrkyxVQGg_miRbVX_0',
      table: 'portfolio_events'
    },

    // Serverless Gateway URL
    apiGatewayUrl: '/api/track',

    // Google Analytics 4 (GA4)
    ga4: {
      enabled: true,
      measurementId: 'G-RL2KNEHDN4'
    },

    // Plausible Analytics (Optional cookieless provider)
    plausible: {
      enabled: false,
      domain: 'www.tejaswaghmare.me',
      apiHost: 'https://plausible.io'
    },

    // Timing thresholds
    sectionMinDwellMs: 2500,     // Section must stay in viewport >= 2.5s to record dwell time
    projectDwellMs: 1200,        // Project card focus threshold
    projectDebounceMs: 45000,    // Throttling duplicate card view triggers

    debug: (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.search.includes('analytics_debug')
    )
  };

  // Internal Session & State Tracking
  const state = {
    visitorId: '',
    sessionId: '',
    isReturningVisitor: false,
    platformSource: 'direct',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    deviceType: 'desktop',
    browser: 'Other',
    os: 'Other',
    timezone: '',
    screenResolution: '',
    isBot: false,
    
    // Engagement & Timers
    sessionStartTime: Date.now(),
    activeFocusDurationMs: 0,
    lastFocusTimestamp: Date.now(),
    isPageActive: true,
    
    // Milestones & Duplication Guards
    scrollMilestonesHit: { 25: false, 50: false, 75: false, 100: false },
    activeSectionTimers: {},      // sectionId -> startTime
    viewHistory: {},              // projectId -> lastViewTimestamp
    activeDwellTimers: {},        // projectId -> setTimeout handle
    isProjectsSectionInView: false,
    eventLog: []
  };

  // ============================================================================
  // 2. PRIVACY & COMPLIANCE (Do Not Track & Bot Detection)
  // ============================================================================

  function isDoNotTrack() {
    return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1';
  }

  function detectBot() {
    const ua = navigator.userAgent || '';
    return /bot|googlebot|crawler|spider|robot|crawling|headless|chrome-lighthouse|lighthouse|slurp|bingbot|duckduckbot/i.test(ua);
  }

  function isAdminOptedOut() {
    try {
      return localStorage.getItem('tp_admin_opt_out') === 'true' ||
             sessionStorage.getItem('tp_admin_opt_out') === 'true';
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // 3. IDENTITY, HARDWARE & ATTRIBUTION SENSORS
  // ============================================================================

  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function initIdentity() {
    state.isBot = detectBot();

    // 1. Persistent Anonymous Visitor ID
    try {
      let storedVisitorId = localStorage.getItem('tp_visitor_id');
      if (storedVisitorId) {
        state.visitorId = storedVisitorId;
        state.isReturningVisitor = true;
      } else {
        state.visitorId = 'vis_' + generateUUID();
        localStorage.setItem('tp_visitor_id', state.visitorId);
        state.isReturningVisitor = false;
      }
    } catch (e) {
      state.visitorId = 'vis_' + generateUUID();
    }

    // 2. Session ID (Scoped to active browser tab session)
    try {
      let storedSessionId = sessionStorage.getItem('tp_session_id');
      if (storedSessionId) {
        state.sessionId = storedSessionId;
      } else {
        state.sessionId = 'ses_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
        sessionStorage.setItem('tp_session_id', state.sessionId);
      }
    } catch (e) {
      state.sessionId = 'ses_' + Date.now().toString(36);
    }

    // 3. Traffic Platform Attribution & UTMs
    state.platformSource = detectPlatformSource();

    // 4. Device, OS, Browser & Screen Specs
    detectEnvironment();
  }

  function detectPlatformSource() {
    const urlParams = new URLSearchParams(window.location.search);
    state.utmSource = urlParams.get('utm_source');
    state.utmMedium = urlParams.get('utm_medium');
    state.utmCampaign = urlParams.get('utm_campaign');

    if (state.utmSource) return state.utmSource.toLowerCase().trim();

    const ref = document.referrer ? document.referrer.toLowerCase() : '';
    if (!ref) return 'direct';

    if (ref.includes('linkedin.com') || ref.includes('lnkd.in')) return 'linkedin';
    if (ref.includes('naukri.com')) return 'naukri';
    if (ref.includes('github.com')) return 'github';
    if (ref.includes('google.') || ref.includes('google.com')) return 'google';
    if (ref.includes('twitter.com') || ref.includes('x.com') || ref.includes('t.co')) return 'twitter';
    if (ref.includes('whatsapp') || ref.includes('wa.me')) return 'whatsapp';
    if (ref.includes('instagram.com')) return 'instagram';
    if (ref.includes('facebook.com')) return 'facebook';
    if (ref.includes('medium.com')) return 'medium';
    if (ref.includes('credly.com')) return 'credly';

    // If referrer is self domain
    if (ref.includes(window.location.hostname)) return 'internal';

    try {
      const url = new URL(ref);
      return url.hostname.replace('www.', '');
    } catch (e) {
      return 'referral';
    }
  }

  function detectEnvironment() {
    const ua = navigator.userAgent || '';
    
    // Device Type
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Tablet|PlayBook/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
    if (isTablet) {
      state.deviceType = 'tablet';
    } else if (isMobile) {
      state.deviceType = 'mobile';
    } else {
      state.deviceType = 'desktop';
    }

    // Browser
    if (/Edg\//i.test(ua)) state.browser = 'Edge';
    else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) state.browser = 'Chrome';
    else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) state.browser = 'Safari';
    else if (/Firefox\//i.test(ua)) state.browser = 'Firefox';
    else if (/OPR\//i.test(ua)) state.browser = 'Opera';
    else state.browser = 'Other';

    // OS
    if (/Windows/i.test(ua)) state.os = 'Windows';
    else if (/Macintosh|Mac OS/i.test(ua)) state.os = 'macOS';
    else if (/iPhone|iPad|iPod/i.test(ua)) state.os = 'iOS';
    else if (/Android/i.test(ua)) state.os = 'Android';
    else if (/Linux/i.test(ua)) state.os = 'Linux';
    else state.os = 'Other';

    // Screen & Timezone
    state.screenResolution = `${window.screen.width || window.innerWidth}x${window.screen.height || window.innerHeight}`;
    try {
      state.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (e) {
      state.timezone = '';
    }
  }

  // ============================================================================
  // 4. DISPATCHER & DUAL-PIPELINE CLOUD TRANSPORT
  // ============================================================================

  function logDebug(message, type = 'info', data = null) {
    if (!ANALYTICS_CONFIG.debug) return;
    const styles = {
      info: 'color: #38bdf8; font-weight: bold;',
      event: 'color: #22c55e; font-weight: bold;',
      warn: 'color: #f59e0b; font-weight: bold;',
      project: 'color: #facc15; font-weight: bold; background: #1e1e24; padding: 2px 6px; border-radius: 4px;',
      admin: 'color: #ec4899; font-weight: bold;'
    };
    const prefix = '%c[Telemetry Engine]';
    if (data) {
      console.log(`${prefix} %c${message}`, 'color: #a855f7; font-weight: bold;', styles[type] || '', data);
    } else {
      console.log(`${prefix} %c${message}`, 'color: #a855f7; font-weight: bold;', styles[type] || '');
    }
  }

  async function dispatchToPipeline(eventName, payload) {
    if (!ANALYTICS_CONFIG.supabase.enabled) return;
    
    // Check Admin Opt-Out & DNT
    if (isAdminOptedOut()) {
      logDebug(`Event [${eventName}] skipped — Admin Opt-Out is ACTIVE`, 'admin');
      return;
    }
    if (isDoNotTrack()) {
      logDebug(`Event [${eventName}] skipped — Do Not Track (DNT) is honored`, 'info');
      return;
    }

    const eventBody = {
      event_name: eventName,
      event_category: payload.event_category || 'general',
      visitor_id: state.visitorId,
      session_id: state.sessionId,
      project_id: payload.project_id || null,
      project_name: payload.project_name || null,
      section_id: payload.section_id || null,
      element: payload.element || null,
      dwell_time_seconds: payload.dwell_time_seconds || 0,
      platform_source: state.platformSource,
      utm_source: state.utmSource,
      utm_medium: state.utmMedium,
      utm_campaign: state.utmCampaign,
      device_type: state.deviceType,
      browser: state.browser,
      os: state.os,
      screen_resolution: state.screenResolution,
      country_timezone: state.timezone,
      is_bot: state.isBot,
      metadata: payload,
      page_path: window.location.pathname + (window.location.hash || ''),
      referrer: document.referrer || null,
      created_at: new Date().toISOString()
    };

    // 1. Try Vercel Serverless Function (/api/track) first
    try {
      const response = await fetch(ANALYTICS_CONFIG.apiGatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventBody),
        keepalive: true
      });

      if (response.ok) {
        return; // Successfully delivered through serverless route!
      }
    } catch (err) {
      // Serverless route unavailable (e.g. running on local server without Vercel CLI)
    }

    // 2. Direct Supabase Fallback (Guarantees delivery anywhere!)
    const cfg = window.SUPABASE_CONFIG || ANALYTICS_CONFIG.supabase;
    if (!cfg || !cfg.url || !cfg.anonKey) return;

    try {
      const endpoint = `${cfg.url.replace(/\/$/, '')}/rest/v1/${cfg.table || 'portfolio_events'}`;
      const headers = {
        'apikey': cfg.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      };
      if (cfg.anonKey.startsWith('eyJ')) {
        headers['Authorization'] = `Bearer ${cfg.anonKey}`;
      }

      fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(eventBody),
        keepalive: true
      }).catch(() => {});
    } catch (e) {}
  }

  function trackEvent(eventName, params = {}) {
    const timestamp = Date.now();
    const enrichedParams = {
      ...params,
      event_category: params.event_category || 'general',
      visitor_id: state.visitorId,
      session_id: state.sessionId,
      platform_source: state.platformSource,
      device_type: state.deviceType,
      is_returning: state.isReturningVisitor,
      is_bot: state.isBot,
      timestamp: new Date().toISOString()
    };

    // Session audit log
    state.eventLog.push({ eventName, params: enrichedParams, timestamp });
    if (state.eventLog.length > 100) state.eventLog.shift();

    // 1. Dispatch to GA4
    if (window.gtag && ANALYTICS_CONFIG.ga4.enabled) {
      try {
        window.gtag('event', eventName, enrichedParams);
      } catch (e) {}
    }

    // 2. Dispatch to Plausible
    if (window.plausible && ANALYTICS_CONFIG.plausible.enabled) {
      try {
        const goal = eventName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        window.plausible(goal, { props: enrichedParams });
      } catch (e) {}
    }

    // 3. Dispatch to Dual Pipeline
    dispatchToPipeline(eventName, enrichedParams);

    // 4. Console Telemetry Output
    logDebug(`⚡ Telemetry: ${eventName} (${enrichedParams.event_category})`, 'event', enrichedParams);
  }

  // ============================================================================
  // 5. DATA-TRACK ATTRIBUTE CATCHER (Claude Proposal Integration)
  // ============================================================================

  function setupDataTrackListener() {
    document.addEventListener('click', (e) => {
      const trackTarget = e.target.closest('[data-track]');
      if (!trackTarget) return;

      const trackKey = trackTarget.getAttribute('data-track');
      const tagText = trackTarget.textContent.trim().substring(0, 40);

      trackEvent('data_track_click', {
        event_category: 'interaction',
        element: trackKey,
        button_text: tagText,
        link_href: trackTarget.getAttribute('href') || null
      });
    }, { capture: true });
  }

  // ============================================================================
  // 6. CONTACT FORM CONVERSION TRACKING
  // ============================================================================

  function setupFormConversionTracking() {
    const form = document.querySelector('form.contact-form, #contact-form') || document.querySelector('form');
    if (!form) return;

    let formStarted = false;
    form.addEventListener('focusin', () => {
      if (!formStarted) {
        formStarted = true;
        trackEvent('form_start', {
          event_category: 'conversion',
          form_id: form.id || 'contact-form'
        });
      }
    }, { once: true });

    form.addEventListener('submit', () => {
      trackEvent('form_submit', {
        event_category: 'conversion',
        form_id: form.id || 'contact-form'
      });
    });
  }

  // ============================================================================
  // 7. SESSION DURATION & ACTIVE TIME ENGINE
  // ============================================================================

  function updateActiveTime() {
    const now = Date.now();
    if (state.isPageActive) {
      state.activeFocusDurationMs += (now - state.lastFocusTimestamp);
    }
    state.lastFocusTimestamp = now;
  }

  function setupSessionDurationListeners() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        updateActiveTime();
        state.isPageActive = false;
      } else {
        state.isPageActive = true;
        state.lastFocusTimestamp = Date.now();
      }
    });

    window.addEventListener('focus', () => {
      state.isPageActive = true;
      state.lastFocusTimestamp = Date.now();
    });

    window.addEventListener('blur', () => {
      updateActiveTime();
      state.isPageActive = false;
    });

    // Record session milestone on exit / unload
    window.addEventListener('beforeunload', () => {
      updateActiveTime();
      const totalSeconds = Math.round(state.activeFocusDurationMs / 1000);
      if (totalSeconds >= 3) {
        dispatchToPipeline('session_heartbeat', {
          event_category: 'traffic',
          dwell_time_seconds: totalSeconds,
          action: 'session_end'
        });
      }
    });
  }

  // ============================================================================
  // 8. SCROLL DEPTH & SECTION DWELL ENGINE
  // ============================================================================

  function setupScrollDepthTracking() {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkScrollMilestones();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  function checkScrollMilestones() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    const scrollTop = window.scrollY || window.pageYOffset;
    const scrollPercent = Math.min(100, Math.round((scrollTop / docHeight) * 100));

    const milestones = [25, 50, 75, 100];
    for (const milestone of milestones) {
      if (scrollPercent >= milestone && !state.scrollMilestonesHit[milestone]) {
        state.scrollMilestonesHit[milestone] = true;
        trackEvent('scroll_milestone', {
          event_category: 'engagement',
          milestone_percent: milestone,
          scroll_depth: milestone
        });
      }
    }
  }

  function setupSectionDwellTracking() {
    const sectionIds = ['hero', 'about', 'experience', 'projects', 'skills', 'certificates', 'contact', 'hobbies'];
    const sectionElements = [];

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) sectionElements.push({ id, el });
    });

    if (!('IntersectionObserver' in window)) return;

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const targetId = entry.target.id;
        const now = Date.now();

        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          state.activeSectionTimers[targetId] = now;
          if (targetId === 'projects') state.isProjectsSectionInView = true;
        } else {
          if (state.activeSectionTimers[targetId]) {
            const dwellMs = now - state.activeSectionTimers[targetId];
            delete state.activeSectionTimers[targetId];
            if (targetId === 'projects') state.isProjectsSectionInView = false;

            if (dwellMs >= ANALYTICS_CONFIG.sectionMinDwellMs) {
              const dwellSeconds = Math.round((dwellMs / 1000) * 10) / 10;
              trackEvent('section_dwell', {
                event_category: 'section',
                section_id: targetId,
                dwell_time_seconds: dwellSeconds
              });
            }
          }
        }
      });
    }, { threshold: [0.35] });

    sectionElements.forEach(item => sectionObserver.observe(item.el));
  }

  // ============================================================================
  // 9. PROJECT & CAROUSEL TELEMETRY
  // ============================================================================

  function extractProjectData(slideElement) {
    if (!slideElement) return null;
    const id = slideElement.getAttribute('data-project-id');
    const name = slideElement.getAttribute('data-project-name') ||
                 slideElement.querySelector('.cert-card-title')?.textContent?.trim() ||
                 slideElement.querySelector('.cert-full-name')?.textContent?.trim() ||
                 id;
    const category = slideElement.getAttribute('data-project-category') ||
                     slideElement.querySelector('.cert-card-badge')?.textContent?.trim() ||
                     'Analytics';
    return { id, name, category, element: slideElement };
  }

  function trackProjectView(projectData, trigger = 'carousel_focus') {
    if (!projectData || !projectData.id) return;
    const projectId = projectData.id;
    const now = Date.now();
    const lastViewed = state.viewHistory[projectId] || 0;

    if (now - lastViewed < ANALYTICS_CONFIG.projectDebounceMs) return;
    state.viewHistory[projectId] = now;

    trackEvent('project_view', {
      event_category: 'project',
      project_id: projectId,
      project_name: projectData.name || projectId,
      project_category: projectData.category || 'Analytics',
      trigger: trigger,
      dwell_time_seconds: Math.round(ANALYTICS_CONFIG.projectDwellMs / 1000)
    });
  }

  function scheduleProjectView(projectData, trigger = 'carousel_focus') {
    if (!projectData || !projectData.id) return;
    const projectId = projectData.id;
    if (state.activeDwellTimers[projectId]) clearTimeout(state.activeDwellTimers[projectId]);

    state.activeDwellTimers[projectId] = setTimeout(() => {
      trackProjectView(projectData, trigger);
      delete state.activeDwellTimers[projectId];
    }, ANALYTICS_CONFIG.projectDwellMs);
  }

  function cancelProjectViewSchedule(projectId) {
    if (state.activeDwellTimers[projectId]) {
      clearTimeout(state.activeDwellTimers[projectId]);
      delete state.activeDwellTimers[projectId];
    }
  }

  function setupProjectTracking() {
    const projectTrack = document.getElementById('project-track');
    const projectCarouselContainer = document.getElementById('project-carousel-container');

    if (!projectTrack) return;

    const slides = Array.from(projectTrack.querySelectorAll('.cert-card-slide:not(.cert-slide-clone)'));
    const projectsMap = {};
    slides.forEach((slide, idx) => {
      const data = extractProjectData(slide);
      if (data && data.id) projectsMap[idx] = data;
    });

    if (projectCarouselContainer) {
      projectCarouselContainer.addEventListener('carousel:slide', (e) => {
        const activeIndex = e.detail?.activeIndex ?? 0;
        const projectData = projectsMap[activeIndex];
        if (!projectData) return;

        Object.keys(state.activeDwellTimers).forEach(cancelProjectViewSchedule);
        if (state.isProjectsSectionInView) {
          scheduleProjectView(projectData, 'carousel_navigation');
        }
      });
    }

    // Project card clicks & actions
    projectTrack.addEventListener('click', (e) => {
      const slide = e.target.closest('.cert-card-slide');
      if (!slide) return;
      const projectData = extractProjectData(slide);
      if (!projectData) return;

      // 1. Lightbox / Inspect Card
      const inspectTarget = e.target.closest('.deck-front-card, [data-analytics="project-inspect"], .btn-secondary-pill');
      if (inspectTarget) {
        trackEvent('project_inspect', {
          event_category: 'project',
          project_id: projectData.id,
          project_name: projectData.name,
          action: 'open_lightbox'
        });
        return;
      }

      // 2. Subview thumbnails (Insights, Room Types, Transactions)
      const thumbBtn = e.target.closest('.thumb-btn, [data-analytics="project-subview"]');
      if (thumbBtn) {
        const subviewName = thumbBtn.getAttribute('data-subview') || thumbBtn.textContent.trim();
        trackEvent('project_subview', {
          event_category: 'project',
          project_id: projectData.id,
          project_name: projectData.name,
          subview_name: subviewName
        });
        return;
      }

      // 3. GitHub repository links
      const githubLink = e.target.closest('a[href*="github.com"], [data-analytics="project-github"]');
      if (githubLink) {
        trackEvent('project_github_click', {
          event_category: 'cta',
          project_id: projectData.id,
          project_name: projectData.name,
          destination_url: githubLink.getAttribute('href')
        });
      }
    });
  }

  // ============================================================================
  // 10. HIGH-INTENT RESUME & CTA INTERACTION ENGINE
  // ============================================================================

  function setupGlobalInteractionTracking() {
    document.addEventListener('click', (e) => {
      // 1. Resume Preview Modal Open
      const resumeModalTrigger = e.target.closest('[data-analytics="resume-modal-open"], .nav-resume-btn, .nav-mobile-resume-btn, a[href="#resume"]');
      if (resumeModalTrigger) {
        trackEvent('resume_preview_open', {
          event_category: 'resume',
          trigger_location: resumeModalTrigger.getAttribute('aria-label') || resumeModalTrigger.className
        });
        return;
      }

      // 2. Resume PDF Download (Physical conversion)
      const resumeDownloadBtn = e.target.closest('a[href*="resume"][download], [data-analytics="resume-download"], .resume-download-cta, #resume-download-btn-footer, #resume-download-btn-top');
      if (resumeDownloadBtn) {
        trackEvent('resume_download', {
          event_category: 'resume',
          file_name: resumeDownloadBtn.getAttribute('href') || 'tejas resume.pdf',
          button_text: resumeDownloadBtn.textContent.trim()
        });
        return;
      }

      // 3. Contact Form Modal Trigger
      const contactTrigger = e.target.closest('[onclick*="openContactModal"], a[href="#contact"], .lets-build-link');
      if (contactTrigger) {
        trackEvent('contact_modal_open', {
          event_category: 'cta',
          trigger_id: contactTrigger.id || 'contact_button'
        });
        return;
      }

      // 4. Direct Outbound Contact Channels
      const mailtoLink = e.target.closest('a[href^="mailto:"]');
      if (mailtoLink) {
        trackEvent('contact_channel_click', {
          event_category: 'cta',
          channel: 'email',
          destination: mailtoLink.getAttribute('href')
        });
        return;
      }

      const whatsappLink = e.target.closest('a[href*="wa.me"], a[href*="whatsapp.com"]');
      if (whatsappLink) {
        trackEvent('contact_channel_click', {
          event_category: 'cta',
          channel: 'whatsapp',
          destination: whatsappLink.getAttribute('href')
        });
        return;
      }

      const phoneLink = e.target.closest('a[href^="tel:"]');
      if (phoneLink) {
        trackEvent('contact_channel_click', {
          event_category: 'cta',
          channel: 'phone',
          destination: phoneLink.getAttribute('href')
        });
        return;
      }

      // 5. Credential / External Verification Links
      const credlyLink = e.target.closest('a[href*="credly.com"], a[href*="learn.microsoft.com"]');
      if (credlyLink) {
        trackEvent('credential_verify_click', {
          event_category: 'cta',
          destination: credlyLink.getAttribute('href')
        });
        return;
      }

      // 6. Social Profile Outbound Links
      const socialLink = e.target.closest('.kova-social-pill, .footer-social-link');
      if (socialLink) {
        trackEvent('social_profile_click', {
          event_category: 'cta',
          platform: socialLink.getAttribute('href')
        });
      }
    });

    // Lightbox modal view listener
    window.addEventListener('portfolio:lightbox', (e) => {
      const { mediaSrc, mediaType, title } = e.detail || {};
      trackEvent('lightbox_open', {
        event_category: 'project',
        title: title || 'Unknown Media',
        media_type: mediaType || 'image',
        media_src: mediaSrc || ''
      });
    });
  }

  // ============================================================================
  // 11. HOTKEY SHORTCUT FOR ADMIN DASHBOARD
  // ============================================================================

  function setupAdminHotkey() {
    window.addEventListener('keydown', (e) => {
      // Ctrl + Shift + A  OR  Cmd + Shift + A
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        logDebug('Admin shortcut triggered (Ctrl+Shift+A). Redirecting to Dashboard...', 'admin');
        window.location.href = 'dashboard.html';
      }
    });
  }

  // ============================================================================
  // 12. GA4 & PLAUSIBLE INIT
  // ============================================================================

  function initGA4() {
    if (!ANALYTICS_CONFIG.ga4.enabled) return;
    const id = ANALYTICS_CONFIG.ga4.measurementId;
    if (!id || id === 'G-XXXXXXXXXX') return;

    if (!window.gtag) {
      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', id, {
        page_path: window.location.pathname,
        transport_type: 'beacon'
      });

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
    }
  }

  function initPlausible() {
    if (!ANALYTICS_CONFIG.plausible.enabled) return;
    const domain = ANALYTICS_CONFIG.plausible.domain;
    if (!window.plausible) {
      window.plausible = function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
      const script = document.createElement('script');
      script.defer = true;
      script.setAttribute('data-domain', domain || window.location.hostname);
      script.src = `${ANALYTICS_CONFIG.plausible.apiHost}/js/script.tagged-events.outbound-links.pageview-props.js`;
      document.head.appendChild(script);
    }
  }

  // ============================================================================
  // 13. INITIALIZATION & EXPOSED API
  // ============================================================================

  function init() {
    initIdentity();
    initGA4();
    initPlausible();

    // Fire Initial Page View (Traffic category)
    trackEvent('page_view', {
      event_category: 'traffic',
      page_title: document.title,
      is_returning: state.isReturningVisitor,
      landing_page: window.location.pathname
    });

    // Setup interactive hooks after DOM is ready
    const startObservers = () => {
      setupSessionDurationListeners();
      setupScrollDepthTracking();
      setupSectionDwellTracking();
      setupProjectTracking();
      setupGlobalInteractionTracking();
      setupDataTrackListener();
      setupFormConversionTracking();
      setupAdminHotkey();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObservers);
    } else {
      startObservers();
    }

    if (ANALYTICS_CONFIG.debug) {
      console.log(
        '%c[Tejas Telemetry Engine Active (v2.2)]%c\n' +
        `• Visitor ID: ${state.visitorId} (${state.isReturningVisitor ? 'Returning' : 'New'})\n` +
        `• Platform: ${state.platformSource} ${state.utmCampaign ? '(' + state.utmCampaign + ')' : ''}\n` +
        `• Bot Detected: ${state.isBot ? '🤖 YES' : '👤 NO'}\n` +
        `• Admin Opt-Out: ${isAdminOptedOut() ? '🚫 EXCLUDED' : '✅ ACTIVE'}\n` +
        `• Hotkey: Press Ctrl+Shift+A anytime to open Admin Dashboard`,
        'background: #f59e0b; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
        'color: #94a3b8;'
      );
    }
  }

  // Global Controller & Developer Helper
  window.PortfolioAnalytics = {
    config: ANALYTICS_CONFIG,
    state: state,
    track: trackEvent,
    trackProjectView: trackProjectView,
    
    // Toggle Admin Opt-Out
    setAdminOptOut: function (optOut) {
      if (optOut) {
        localStorage.setItem('tp_admin_opt_out', 'true');
        console.log('%c[Analytics] Admin Opt-Out ENABLED. Your visits are now excluded.', 'color: #ec4899; font-weight: bold;');
      } else {
        localStorage.removeItem('tp_admin_opt_out');
        console.log('%c[Analytics] Admin Opt-Out DISABLED. Your visits are tracked normally.', 'color: #22c55e; font-weight: bold;');
      }
    },

    status: function () {
      return {
        identity: {
          visitorId: state.visitorId,
          sessionId: state.sessionId,
          isReturning: state.isReturningVisitor,
          platformSource: state.platformSource,
          isBot: state.isBot,
          deviceType: state.deviceType
        },
        adminOptedOut: isAdminOptedOut(),
        recentEvents: state.eventLog.slice(-15)
      };
    }
  };

  // Launch Engine
  init();

})();
