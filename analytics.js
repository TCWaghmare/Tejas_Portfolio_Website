/**
 * ==============================================================================
 * Tejas C. Waghmare Portfolio - Analytics & Project Telemetry Engine
 * 
 * Supports:
 *   1. Google Analytics 4 (GA4 / gtag.js)
 *   2. Plausible Analytics (Cookie-less, Lightweight & Privacy-friendly)
 *   3. Supabase Direct Event Table (portfolio_events)
 *   4. Local Developer Console Inspection & Session Metrics
 * ==============================================================================
 */

(function () {
  'use strict';

  // ============================================================================
  // 1. CONFIGURATION
  // ============================================================================
  const ANALYTICS_CONFIG = {
    // Google Analytics 4 (GA4)
    // Replace 'G-XXXXXXXXXX' with your Google Measurement ID from GA4
    ga4: {
      enabled: true,
      measurementId: 'G-XXXXXXXXXX' // e.g. 'G-ABC123XYZ0'
    },

    // Plausible Analytics (Privacy-first, cookieless)
    // Set enabled to true and replace domain with your site's custom domain
    plausible: {
      enabled: false,
      domain: 'tejaswaghmare.com', // e.g. 'yourdomain.com'
      apiHost: 'https://plausible.io'
    },

    // Supabase Event Logging (Directly logs project views to your Supabase table)
    supabase: {
      enabled: true,
      table: 'portfolio_events'
    },

    // Timing & Deduplication Parameters
    // Dwell time: card must stay in viewport or focused in carousel for >= 1200ms to count as a genuine view
    dwellTimeMs: 1200,

    // Debounce time: minimum delay (in ms) before re-logging the SAME project in a single session
    // Default: 45 seconds (prevents carousel loop rotations from inflating view counts)
    projectDebounceMs: 45000,

    // Debugging: outputs stylish colored logs to DevTools console
    debug: (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.search.includes('analytics_debug')
    )
  };

  // Internal session storage for event history and view throttling
  const sessionState = {
    viewHistory: {},        // Map of projectId -> lastViewTimestamp
    eventLog: [],           // Recent logged events for inspection via PortfolioAnalytics.getStats()
    activeDwellTimers: {},  // Map of projectId -> setTimeout handle
    isProjectsSectionInView: false
  };

  // Helper for stylish debug logging
  function logDebug(message, type = 'info', data = null) {
    if (!ANALYTICS_CONFIG.debug) return;
    const styles = {
      info: 'color: #38bdf8; font-weight: bold;',
      event: 'color: #22c55e; font-weight: bold;',
      warn: 'color: #f59e0b; font-weight: bold;',
      project: 'color: #facc15; font-weight: bold; background: #1e1e24; padding: 2px 6px; border-radius: 4px;'
    };
    const prefix = '%c[Analytics]';
    if (data) {
      console.log(`${prefix} %c${message}`, 'color: #a855f7; font-weight: bold;', styles[type] || '', data);
    } else {
      console.log(`${prefix} %c${message}`, 'color: #a855f7; font-weight: bold;', styles[type] || '');
    }
  }

  // ============================================================================
  // 2. PROVIDER INITIALIZATION
  // ============================================================================

  // Initialize Google Analytics 4 (GA4)
  function initGA4() {
    if (!ANALYTICS_CONFIG.ga4.enabled) return;

    const id = ANALYTICS_CONFIG.ga4.measurementId;
    if (!id || id === 'G-XXXXXXXXXX') {
      logDebug('GA4 is enabled in analytics.js, but Measurement ID is still default "G-XXXXXXXXXX". Update measurementId to send live hits to GA4.', 'warn');
      return;
    }

    // Check if gtag script is already present in document
    if (!window.gtag) {
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        window.dataLayer.push(arguments);
      }
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
      logDebug(`GA4 initialized successfully with Measurement ID: ${id}`, 'info');
    }
  }

  // Initialize Plausible Analytics
  function initPlausible() {
    if (!ANALYTICS_CONFIG.plausible.enabled) return;

    const domain = ANALYTICS_CONFIG.plausible.domain;
    if (!domain || domain === 'tejaswaghmare.com' || domain === 'yourdomain.com') {
      logDebug('Plausible is enabled, but custom domain is still default. Update domain in analytics.js once your site domain is registered.', 'warn');
    }

    if (!window.plausible) {
      window.plausible = function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };

      const script = document.createElement('script');
      script.defer = true;
      script.setAttribute('data-domain', domain || window.location.hostname);
      script.src = `${ANALYTICS_CONFIG.plausible.apiHost}/js/script.tagged-events.outbound-links.pageview-props.js`;
      document.head.appendChild(script);
      logDebug(`Plausible initialized for domain: ${domain || window.location.hostname}`, 'info');
    }
  }

  // Send Event to Supabase (Optional direct database persistence)
  async function sendToSupabase(eventName, payload) {
    if (!ANALYTICS_CONFIG.supabase.enabled) return;

    // Use global Supabase config if defined by script.js
    const supabaseConfig = window.SUPABASE_CONFIG;
    if (!supabaseConfig || !supabaseConfig.url || !supabaseConfig.anonKey) {
      return;
    }

    try {
      const endpoint = `${supabaseConfig.url.replace(/\/$/, '')}/rest/v1/${ANALYTICS_CONFIG.supabase.table}`;
      const headers = {
        'apikey': supabaseConfig.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      };
      if (supabaseConfig.anonKey.startsWith('eyJ')) {
        headers['Authorization'] = `Bearer ${supabaseConfig.anonKey}`;
      }

      const body = {
        event_name: eventName,
        project_id: payload.project_id || null,
        project_name: payload.project_name || null,
        metadata: payload,
        page_path: window.location.pathname + window.location.hash,
        referrer: document.referrer || null,
        created_at: new Date().toISOString()
      };

      // Non-blocking fire-and-forget fetch
      fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      }).catch(() => {
        // Silently catch in production if table doesn't exist yet
      });
    } catch (err) {
      // Ignore network errors on tracking
    }
  }

  // ============================================================================
  // 3. CORE DISPATCHER
  // ============================================================================

  /**
   * Dispatches an event to all enabled analytics backends.
   * @param {string} eventName Snake_case event identifier (e.g., 'project_view')
   * @param {Object} params Key-value event metadata
   */
  function trackEvent(eventName, params = {}) {
    const timestamp = Date.now();
    const enrichedParams = {
      ...params,
      timestamp: new Date().toISOString(),
      screen_width: window.innerWidth,
      viewport_orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };

    // Store in session log for debugging & status inspection
    sessionState.eventLog.push({
      eventName,
      params: enrichedParams,
      timestamp
    });
    if (sessionState.eventLog.length > 100) {
      sessionState.eventLog.shift();
    }

    // 1. Dispatch to GA4
    if (window.gtag && ANALYTICS_CONFIG.ga4.enabled) {
      try {
        window.gtag('event', eventName, enrichedParams);
      } catch (e) {
        logDebug('Error delivering event to GA4: ' + e.message, 'warn');
      }
    }

    // 2. Dispatch to Plausible
    if (window.plausible && ANALYTICS_CONFIG.plausible.enabled) {
      try {
        // Plausible custom event titles are typically Title Case
        const plausibleGoal = eventName
          .split('_')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        window.plausible(plausibleGoal, { props: enrichedParams });
      } catch (e) {
        logDebug('Error delivering event to Plausible: ' + e.message, 'warn');
      }
    }

    // 3. Dispatch to Supabase
    sendToSupabase(eventName, enrichedParams);

    // 4. Console Debug Output
    if (eventName === 'project_view') {
      logDebug(`👁️ Project View: "${params.project_name || params.project_id}" (via ${params.trigger || 'unknown'})`, 'project', params);
    } else {
      logDebug(`⚡ Event: ${eventName}`, 'event', params);
    }
  }

  // ============================================================================
  // 4. PROJECT TELEMETRY HANDLERS
  // ============================================================================

  /**
   * Tracks a genuine project view with dwell-time and session throttling.
   */
  function trackProjectView(projectData, trigger = 'carousel_focus') {
    if (!projectData || !projectData.id) return;

    const projectId = projectData.id;
    const now = Date.now();
    const lastViewed = sessionState.viewHistory[projectId] || 0;

    // Throttle duplicate views of the same project within projectDebounceMs
    if (now - lastViewed < ANALYTICS_CONFIG.projectDebounceMs) {
      logDebug(`Project "${projectData.name}" was viewed recently (${Math.round((now - lastViewed) / 1000)}s ago) — skipping duplicate view event.`, 'info');
      return;
    }

    sessionState.viewHistory[projectId] = now;

    trackEvent('project_view', {
      project_id: projectId,
      project_name: projectData.name || projectId,
      project_category: projectData.category || 'Analytics',
      trigger: trigger,
      dwell_ms: ANALYTICS_CONFIG.dwellTimeMs
    });
  }

  /**
   * Schedules a debounced view trigger with dwell time check.
   */
  function scheduleProjectView(projectData, trigger = 'carousel_focus') {
    if (!projectData || !projectData.id) return;
    const projectId = projectData.id;

    // Clear any pending timer for this project
    if (sessionState.activeDwellTimers[projectId]) {
      clearTimeout(sessionState.activeDwellTimers[projectId]);
    }

    sessionState.activeDwellTimers[projectId] = setTimeout(() => {
      trackProjectView(projectData, trigger);
      delete sessionState.activeDwellTimers[projectId];
    }, ANALYTICS_CONFIG.dwellTimeMs);
  }

  function cancelProjectViewSchedule(projectId) {
    if (sessionState.activeDwellTimers[projectId]) {
      clearTimeout(sessionState.activeDwellTimers[projectId]);
      delete sessionState.activeDwellTimers[projectId];
    }
  }

  /**
   * Extracts clean metadata from a project card slide element.
   */
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
    const index = parseInt(slideElement.getAttribute('data-index') || '0', 10);

    return { id, name, category, index, element: slideElement };
  }

  // ============================================================================
  // 5. AUTOMATIC EVENT HOOKS & LISTENERS
  // ============================================================================

  function setupProjectTracking() {
    const projectsSection = document.getElementById('projects');
    const projectCarouselContainer = document.getElementById('project-carousel-container');
    const projectTrack = document.getElementById('project-track');

    if (!projectsSection || !projectTrack) {
      logDebug('Projects section or track not found in DOM; skipping carousel observer.', 'warn');
      return;
    }

    // Retrieve all original project slides (excluding clones)
    const slides = Array.from(projectTrack.querySelectorAll('.cert-card-slide:not(.cert-slide-clone)'));
    const projectsMap = {};
    slides.forEach((slide, idx) => {
      const data = extractProjectData(slide);
      if (data && data.id) {
        projectsMap[idx] = data;
      }
    });

    // --------------------------------------------------------------------------
    // A. Track Projects Section Visibility in Viewport
    // --------------------------------------------------------------------------
    if ('IntersectionObserver' in window) {
      // 1. Observe entire Projects section
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          sessionState.isProjectsSectionInView = entry.isIntersecting;
          if (entry.isIntersecting) {
            logDebug('Projects section entered viewport.', 'info');
            trackEvent('section_view', { section_id: 'projects' });

            // If a project is currently active, schedule view
            const activeSlide = projectTrack.querySelector('.cert-card-slide.is-active-slide:not(.cert-slide-clone)') || slides[0];
            if (activeSlide) {
              const data = extractProjectData(activeSlide);
              if (data) scheduleProjectView(data, 'viewport_scroll');
            }
          } else {
            // Cancel any pending timers if user scrolls away quickly
            Object.keys(sessionState.activeDwellTimers).forEach(cancelProjectViewSchedule);
          }
        });
      }, { threshold: 0.25 });

      sectionObserver.observe(projectsSection);

      // 2. Observe individual project slides (for desktop grid view or direct scroll)
      const slideObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const target = entry.target;
          if (target.classList.contains('cert-slide-clone')) return;
          const data = extractProjectData(target);
          if (!data) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            scheduleProjectView(data, 'card_in_view');
          } else {
            cancelProjectViewSchedule(data.id);
          }
        });
      }, { threshold: [0.45] });

      slides.forEach(slide => slideObserver.observe(slide));
    }

    // --------------------------------------------------------------------------
    // B. Carousel Slide Change Listener
    // --------------------------------------------------------------------------
    if (projectCarouselContainer) {
      projectCarouselContainer.addEventListener('carousel:slide', (e) => {
        const activeIndex = e.detail?.activeIndex ?? 0;
        const projectData = projectsMap[activeIndex];
        if (!projectData) return;

        // Cancel previous pending timers
        Object.keys(sessionState.activeDwellTimers).forEach(cancelProjectViewSchedule);

        // Only register carousel view if the section is currently in view
        if (sessionState.isProjectsSectionInView) {
          scheduleProjectView(projectData, 'carousel_navigation');
        }
      });
    }

    // --------------------------------------------------------------------------
    // C. Click Delegator for Project Interactions
    // --------------------------------------------------------------------------
    projectTrack.addEventListener('click', (e) => {
      const slide = e.target.closest('.cert-card-slide');
      if (!slide) return;
      const projectData = extractProjectData(slide);
      if (!projectData) return;

      // 1. Front card or Enlarge button clicked
      const inspectTarget = e.target.closest('.deck-front-card, [data-analytics="project-inspect"], .btn-secondary-pill');
      if (inspectTarget) {
        trackEvent('project_inspect', {
          project_id: projectData.id,
          project_name: projectData.name,
          project_category: projectData.category,
          action: 'open_lightbox'
        });
        return;
      }

      // 2. Extra Dashboard Subview Thumbnails ("Room Types", "Transactions", "Insights", etc.)
      const thumbBtn = e.target.closest('.thumb-btn, [data-analytics="project-subview"]');
      if (thumbBtn) {
        const subviewName = thumbBtn.getAttribute('data-subview') || thumbBtn.textContent.trim();
        trackEvent('project_subview', {
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
          project_id: projectData.id,
          project_name: projectData.name,
          destination_url: githubLink.getAttribute('href')
        });
      }
    });

    // --------------------------------------------------------------------------
    // D. Global Lightbox Open Listener
    // --------------------------------------------------------------------------
    window.addEventListener('portfolio:lightbox', (e) => {
      const { mediaSrc, mediaType, title } = e.detail || {};
      trackEvent('lightbox_open', {
        title: title || 'Unknown Media',
        media_type: mediaType || 'image',
        media_src: mediaSrc || ''
      });
    });

    // --------------------------------------------------------------------------
    // E. Resume Download Tracking
    // --------------------------------------------------------------------------
    document.addEventListener('click', (e) => {
      const resumeLink = e.target.closest('a[href*="resume"], [data-analytics="resume-download"]');
      if (resumeLink) {
        trackEvent('resume_download', {
          file_name: resumeLink.getAttribute('href') || 'resume.pdf',
          link_text: resumeLink.textContent.trim()
        });
      }
    });
  }

  // ============================================================================
  // 6. INITIALIZATION & PUBLIC API
  // ============================================================================

  function init() {
    initGA4();
    initPlausible();

    const startObservers = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(setupProjectTracking, { timeout: 2000 });
      } else {
        setTimeout(setupProjectTracking, 100);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObservers);
    } else {
      startObservers();
    }

    if (ANALYTICS_CONFIG.debug) {
      console.log(
        '%c[Portfolio Analytics Engine Active]%c\n' +
        `• GA4 Status: ${ANALYTICS_CONFIG.ga4.enabled ? (ANALYTICS_CONFIG.ga4.measurementId === 'G-XXXXXXXXXX' ? '⚠️ Ready (Awaiting Measurement ID)' : '✅ Active (' + ANALYTICS_CONFIG.ga4.measurementId + ')') : '❌ Disabled'}\n` +
        `• Plausible Status: ${ANALYTICS_CONFIG.plausible.enabled ? '✅ Active (' + ANALYTICS_CONFIG.plausible.domain + ')' : '❌ Disabled'}\n` +
        `• Supabase Events: ${ANALYTICS_CONFIG.supabase.enabled ? '✅ Active (' + ANALYTICS_CONFIG.supabase.table + ')' : '❌ Disabled'}\n` +
        'Type %cPortfolioAnalytics.status()%c in this console anytime to inspect real-time metrics.',
        'background: #f59e0b; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
        'color: #94a3b8;',
        'color: #38bdf8; font-weight: bold;',
        'color: #94a3b8;'
      );
    }
  }

  // Expose global controller
  window.PortfolioAnalytics = {
    config: ANALYTICS_CONFIG,
    track: trackEvent,
    trackProjectView: trackProjectView,

    // Helper to view status & project view counts in console
    status: function () {
      const viewCounts = {};
      sessionState.eventLog
        .filter(ev => ev.eventName === 'project_view')
        .forEach(ev => {
          const id = ev.params.project_name || ev.params.project_id;
          viewCounts[id] = (viewCounts[id] || 0) + 1;
        });

      return {
        configuredProviders: {
          ga4: ANALYTICS_CONFIG.ga4,
          plausible: ANALYTICS_CONFIG.plausible,
          supabase: ANALYTICS_CONFIG.supabase
        },
        sessionViewCounts: viewCounts,
        recentEvents: sessionState.eventLog.slice(-15)
      };
    },

    getRecentEvents: function () {
      return sessionState.eventLog;
    }
  };

  // Run initialization
  init();

})();

