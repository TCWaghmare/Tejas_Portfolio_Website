/**
 * Tejas C. Waghmare - Portfolio Engine
 * High Performance Scroll-Driven Visual Sequence + UI Controller
 */

(function () {
  'use strict';

  // --- Device & Viewport Detection ---
  const isMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTablet = !isMobile && window.innerWidth >= 768 && window.innerWidth < 1024;

  // --- Configuration (Active on BOTH Laptop & Mobile for 60FPS fluid scroll) ---
  const CONFIG = {
    totalFrames: 240,
    framePath: (index) => `Asset/frames/frame_${String(index).padStart(4, '0')}.jpg`,
    lerpFactor: isMobile ? 0.22 : 0.18, // Ultra-smooth fluid deceleration
    concurrency: isMobile ? 2 : 4,      // Lightweight parallel worker pool (preserves 4G bandwidth)
    frameStride: isMobile ? 4 : 2,      // Mobile samples 60 keyframes (~3.5MB total), desktop samples 120 keyframes
    minLoadToUnlock: 0.001
  };

  // --- DOM Elements ---
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = document.getElementById('loader');
  const loaderPercent = document.getElementById('loader-percent');
  const loaderCounter = document.getElementById('loader-counter');
  const loaderProgressCircle = document.getElementById('loader-progress-circle');
  const loaderProgressFill = document.getElementById('loader-progress-fill');
  const siteHeader = document.getElementById('site-header');
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');
  const navItems = document.querySelectorAll('.nav-item');
  const lightboxModal = document.getElementById('media-lightbox');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxBody = document.getElementById('lightbox-body');

  // --- Frame Animation State ---
  const images = new Array(CONFIG.totalFrames + 1);
  let loadedCount = 0;
  let targetFrame = 1;
  let currentFrame = 1;
  let renderedFrame = -1;
  let renderedActualIndex = -1;
  let isPageInteractive = false;
  let animationFrameId = null;

  // --- Canvas Dimensions & DPI Scaling ---
  let canvasWidth = 0;
  let canvasHeight = 0;
  let dpr = 1;

  function resizeCanvas() {
    // On mobile screens, cap DPR to 1 (or 1.2) to match 720p frame resolution and ensure locked 60 FPS GPU fill rate
    dpr = isMobile ? Math.min(window.devicePixelRatio || 1, 1.2) : Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = isMobile ? 'medium' : 'high';

    renderedFrame = -1;
    drawFrame(Math.round(currentFrame));
  }

  // --- Aspect Ratio Cover Draw Algorithm (Zero Sticking & Progressive Refinement) ---
  function drawFrame(frameIndex) {
    const match = getClosestLoadedFrame(frameIndex);
    if (!match) return;

    // Skip redraw only if the exact same image is already displayed at this requested frame
    if (match.index === renderedActualIndex && renderedFrame === frameIndex) {
      return;
    }

    const img = match.img;
    const imgWidth = img.naturalWidth || 1280;
    const imgHeight = img.naturalHeight || 720;

    const scale = Math.max(canvas.width / imgWidth, canvas.height / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const offsetX = (canvas.width - drawWidth) / 2;
    const offsetY = (canvas.height - drawHeight) / 2;

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    renderedActualIndex = match.index;
    renderedFrame = frameIndex;
  }

  // --- Zero-Flicker Fallback to Closest Loaded Frame with Index ---
  function getClosestLoadedFrame(requestedIndex) {
    const target = Math.max(1, Math.min(CONFIG.totalFrames, Math.round(requestedIndex)));

    if (images[target] && images[target].complete && images[target].naturalWidth > 0) {
      return { img: images[target], index: target };
    }

    for (let offset = 1; offset < CONFIG.totalFrames; offset++) {
      const prev = target - offset;
      if (prev >= 1 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
        return { img: images[prev], index: prev };
      }
      const next = target + offset;
      if (next <= CONFIG.totalFrames && images[next] && images[next].complete && images[next].naturalWidth > 0) {
        return { img: images[next], index: next };
      }
    }

    return null;
  }

  // Backward compatibility alias
  function getClosestLoadedImage(requestedIndex) {
    const match = getClosestLoadedFrame(requestedIndex);
    return match ? match.img : null;
  }

  // --- Scroll Tracking: Operates smoothly on BOTH Laptop and Mobile ---
  function updateScrollProgress() {
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const totalHeight = Math.max(
      document.body.scrollHeight || 0,
      document.documentElement.scrollHeight || 0
    );
    const scrollMax = Math.max(1, totalHeight - viewportHeight);
    const progress = Math.min(1, Math.max(0, scrollY / scrollMax));

    // Calculate target frame across the full 1 to 240 range
    targetFrame = 1 + progress * (CONFIG.totalFrames - 1);

    // Wake up renderLoop if it was asleep
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(renderLoop);
    }
  }

  // Native C++ IntersectionObserver for active section link highlighting (0 layout reflows)
  function initNavObserver() {
    const sections = document.querySelectorAll('section[id]');
    if (!sections.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navItems.forEach((link) => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, { rootMargin: '-20% 0px -50% 0px', threshold: 0.05 });

    sections.forEach(sec => observer.observe(sec));
  }

  // --- Smooth Inertial Lerp Render Loop (60 FPS motion, 0% CPU when settled) ---
  function renderLoop() {
    const delta = targetFrame - currentFrame;

    // Smooth exponential lerp interpolation
    if (Math.abs(delta) > 0.005) {
      currentFrame += delta * CONFIG.lerpFactor;
    } else {
      currentFrame = targetFrame;
    }

    const nextFrameIndex = Math.max(1, Math.min(CONFIG.totalFrames, Math.round(currentFrame)));
    if (nextFrameIndex !== renderedFrame || renderedActualIndex === -1) {
      drawFrame(nextFrameIndex);
    }

    // Continue running while actively decelerating; sleep when settled to preserve battery & CPU
    if (Math.abs(targetFrame - currentFrame) > 0.04) {
      animationFrameId = requestAnimationFrame(renderLoop);
    } else {
      currentFrame = targetFrame;
      const finalIndex = Math.max(1, Math.min(CONFIG.totalFrames, Math.round(currentFrame)));
      drawFrame(finalIndex);
      animationFrameId = null;
    }
  }

  // --- Loader UI Updates ---
  function updateLoaderUI(loaded, total) {
    const fraction = Math.min(1, loaded / total);
    const percent = Math.round(fraction * 100);

    if (loaderPercent) loaderPercent.textContent = `${percent}%`;
    if (loaderCounter) loaderCounter.textContent = `${loaded} / ${total} FRAMES BUFFERED`;

    if (loaderProgressFill) {
      loaderProgressFill.style.width = `${percent}%`;
    }

    if (loaderProgressCircle) {
      const circumference = 314.16; // 2 * PI * 50
      const offset = circumference - (fraction * circumference);
      loaderProgressCircle.style.strokeDashoffset = offset;
    }
  }

  // --- Frame Preloading Pipeline ---
  function startPreloading() {
    resizeCanvas();
    updateScrollProgress();

    // Immediately unlock interface so hero content, typography and avatar render with zero delay
    unlockInterface();

    // 1. Immediately load Frame 1 in background for canvas scrub
    const firstImg = new Image();
    firstImg.src = CONFIG.framePath(1);
    firstImg.onload = () => {
      images[1] = firstImg;
      loadedCount++;
      updateScrollProgress();
      drawFrame(Math.round(currentFrame));
      deferBackgroundFrames();
    };
    firstImg.onerror = () => {
      console.warn('Initial frame load fallback.');
      deferBackgroundFrames();
    };
  }

  function animateLoaderToFull(callback) {
    const start = performance.now();
    const duration = 320; // 320ms quick smooth visual fill
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      updateLoaderUI(Math.round(progress * 100), 100);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        if (callback) callback();
      }
    }
    requestAnimationFrame(step);
  }

  let backgroundFramesScheduled = false;
  function deferBackgroundFrames() {
    if (backgroundFramesScheduled) return;

    function startBuffering() {
      if (backgroundFramesScheduled) return;
      backgroundFramesScheduled = true;
      window.removeEventListener('scroll', startBuffering);
      window.removeEventListener('wheel', startBuffering);
      window.removeEventListener('touchstart', startBuffering);
      window.removeEventListener('keydown', startBuffering);
      queueRemainingFrames();
    }

    // Start buffering promptly without blocking initial render
    window.addEventListener('scroll', startBuffering, { once: true, passive: true });
    window.addEventListener('wheel', startBuffering, { once: true, passive: true });
    window.addEventListener('touchstart', startBuffering, { once: true, passive: true });
    window.addEventListener('touchmove', startBuffering, { once: true, passive: true });
    window.addEventListener('keydown', startBuffering, { once: true, passive: true });

    // Begin background buffering 200ms after Frame 1 load so frames are ready before user scrolls
    setTimeout(() => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(startBuffering, { timeout: 500 });
      } else {
        startBuffering();
      }
    }, 200);
  }

  // Smart Prioritized Keyframe Pipeline (Never sticks, buffers 60 keyframes on mobile, 120 on desktop)
  function queueRemainingFrames() {
    const queue = [];
    const stride = CONFIG.frameStride || (isMobile ? 4 : 2);

    // Phase 1: Load evenly spaced keyframes across the entire scroll range (so full motion is available immediately!)
    for (let i = 1 + stride; i <= CONFIG.totalFrames; i += stride) {
      queue.push(i);
    }
    if (queue.length > 0 && queue[queue.length - 1] !== CONFIG.totalFrames) {
      queue.push(CONFIG.totalFrames);
    }

    // Phase 2: On desktop, queue intermediate frames for ultra-high 240fps fidelity
    if (!isMobile) {
      for (let i = 2; i <= CONFIG.totalFrames; i++) {
        if (!queue.includes(i)) {
          queue.push(i);
        }
      }
    }

    let activeWorkers = 0;
    const maxWorkers = CONFIG.concurrency || (isMobile ? 2 : 4);

    function work() {
      if (queue.length === 0 && activeWorkers === 0) return;

      // Sort pending queue by proximity to targetFrame so frames near user scroll position load first!
      if (queue.length > 1) {
        const cur = targetFrame;
        queue.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur));
      }

      while (activeWorkers < maxWorkers && queue.length > 0) {
        const frameIdx = queue.shift();
        activeWorkers++;

        const img = new Image();
        img.src = CONFIG.framePath(frameIdx);

        const onFinish = () => {
          images[frameIdx] = img;
          loadedCount++;
          activeWorkers--;

          // If the user's current scroll position would benefit from this newly loaded frame, redraw it immediately!
          const target = Math.round(currentFrame);
          if (renderedActualIndex !== target && Math.abs(target - frameIdx) < Math.abs(target - renderedActualIndex)) {
            drawFrame(target);
          }

          work();
        };

        img.onload = onFinish;
        img.onerror = onFinish;
      }
    }

    // Start background buffering gently without competing with initial paint
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => work(), { timeout: 300 });
    } else {
      setTimeout(work, 80);
    }
  }

  function unlockInterface() {
    if (isPageInteractive) return;
    isPageInteractive = true;

    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(renderLoop);
    }

    // Immediately reveal all elements in the hero section so nothing starts invisible
    const heroElements = document.querySelectorAll('#home .fade-up, #home .hero-mini-card, #home .bento-card, #home .hero-stage *');
    heroElements.forEach((el) => {
      el.classList.add('is-inview');
    });

    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => {
        loader.style.display = 'none';
      }, 220);
    }

    // Reveal elements currently in viewport
    document.querySelectorAll('.fade-up, .reveal-text').forEach((el) => {
      el.classList.add('is-inview');
    });

    // Schedule Spline viewer web component on user interaction or idle
    scheduleSplineViewer();
    initNavObserver();
  }

  function loadSplineViewerScript() {
    if (window.customElements && window.customElements.get('spline-viewer')) return;
    if (document.querySelector('script[src*="spline-viewer"]')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer/build/spline-viewer.js';
    document.body.appendChild(script);
  }

  function scheduleSplineViewer() {
    // Disable Spline 3D WebGL on mobile devices (saves 8MB data & guarantees 60 FPS scrolling on Android 11)
    if (isMobile || isSlowNetwork) {
      const viewer = document.getElementById('hero-spline-viewer');
      if (viewer) viewer.remove();
      return;
    }

    let triggered = false;
    function trigger() {
      if (triggered) return;
      triggered = true;
      window.removeEventListener('pointerdown', trigger);
      window.removeEventListener('keydown', trigger);
      window.removeEventListener('scroll', trigger);
      loadSplineViewerScript();
    }
    window.addEventListener('pointerdown', trigger, { once: true, passive: true });
    window.addEventListener('keydown', trigger, { once: true, passive: true });
    window.addEventListener('scroll', trigger, { once: true, passive: true });
    setTimeout(trigger, 5000);
  }

  // --- Mobile Navigation Toggle ---
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navLinks.classList.toggle('mobile-open');
      mobileToggle.classList.toggle('active', isOpen);
      mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close menu when clicking any nav item or mobile CTA
    navLinks.querySelectorAll('.nav-item, .nav-mobile-cta, .nav-mobile-resume-btn').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on outside click or Escape
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !mobileToggle.contains(e.target)) {
        navLinks.classList.remove('mobile-open');
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
        navLinks.classList.remove('mobile-open');
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // =========================================================================
  // Accessible Modal Focus & Keyboard Trap Controller (WCAG 2.4.3 & 2.1.2)
  // =========================================================================
  let activeModalElement = null;
  let lastActiveElementBeforeModal = null;

  function trapFocusInModal(modal) {
    if (!modal) return;
    lastActiveElementBeforeModal = document.activeElement;
    activeModalElement = modal;

    // Move focus inside the modal gracefully
    setTimeout(() => {
      const firstInput = modal.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled])');
      const closeBtn = modal.querySelector('.cm-close, .lightbox-close, button:not([disabled])');
      const target = firstInput || closeBtn;
      if (target && typeof target.focus === 'function') {
        target.focus();
      }
    }, 120);
  }

  function releaseFocusFromModal(modal) {
    if (activeModalElement === modal) {
      activeModalElement = null;
    }
    if (lastActiveElementBeforeModal && typeof lastActiveElementBeforeModal.focus === 'function') {
      try {
        lastActiveElementBeforeModal.focus();
      } catch (e) { }
    }
    lastActiveElementBeforeModal = null;
  }

  // Trap Tab and Shift+Tab navigation exclusively inside the open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && activeModalElement) {
      const focusable = Array.from(activeModalElement.querySelectorAll(
        'button:not([disabled]):not([aria-hidden="true"]), [href]:not([aria-hidden="true"]), input:not([type="hidden"]):not([disabled]):not([aria-hidden="true"]), select:not([disabled]):not([aria-hidden="true"]), textarea:not([disabled]):not([aria-hidden="true"]), [tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])'
      )).filter(el => el.offsetParent !== null || window.getComputedStyle(el).display !== 'none');

      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (!activeModalElement.contains(document.activeElement)) {
        e.preventDefault();
        if (e.shiftKey) {
          lastEl.focus();
        } else {
          firstEl.focus();
        }
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  });

  // Global keyboard activation for role="button" and .deck-front-card with Enter or Space
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const target = e.target;
      if (target && (target.classList.contains('deck-front-card') || (target.getAttribute('role') === 'button' && target.tagName !== 'BUTTON'))) {
        e.preventDefault();
        target.click();
      }
    }
  });

  // --- Global Lightbox Modal & Zoom Controller ---
  let lightboxScale = 1;
  let lightboxPanX = 0;
  let lightboxPanY = 0;
  let isLightboxDragging = false;
  let lightboxDragStartX = 0;
  let lightboxDragStartY = 0;

  function decodeHtmlEntities(str) {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  function getDescriptiveAltText(mediaSrc, title, customAlt) {
    if (customAlt && typeof customAlt === 'string') {
      return decodeHtmlEntities(customAlt);
    }
    const clean = decodeHtmlEntities(title || '');
    const src = (mediaSrc || '').toLowerCase();

    if (src.includes('dashboard 1') || src.includes('overview')) {
      return `High-resolution Power BI Overview Dashboard for NYC Airbnb Hospitality Intelligence: Analyzes 30,259 listings across 5 NYC boroughs, visualizing key metrics including $389.3M estimated revenue, 52.4% average occupancy, borough distribution, and pricing trends.`;
    }
    if (src.includes('dashboard 2') || src.includes('room')) {
      return `High-resolution Power BI Room Type Analysis Dashboard for NYC Airbnb: Comparative breakdown of Entire homes, Private rooms, and Shared rooms, evaluating average daily rates, booking frequency, and revenue generation.`;
    }
    if (src.includes('dashboard 3') || src.includes('host')) {
      return `High-resolution Power BI Host Performance Dashboard for NYC Airbnb: Analysis of superhost vs standard host metrics, listing density, host response speeds, and multi-property management impact.`;
    }
    if (src.includes('dashboard 4') || src.includes('rating')) {
      return `High-resolution Power BI Rating Distribution Dashboard for NYC Airbnb: Review score breakdown across cleanliness, communication, and location with customer sentiment distribution.`;
    }
    if (src.includes('backery sale dashboard') || src.includes('backery_sale')) {
      return `High-resolution Excel Pivot Dashboard for Bakery Sales and Profitability: Financial analysis of 16,569 transactions across 3 store locations, tracking \u20B93.44M revenue, item profit margins, and 40% waste cost reduction targets.`;
    }
    if (src.includes('backery_transaction')) {
      return `High-resolution Excel Transaction Dashboard for Bakery Operations: Hourly sales velocity, customer traffic patterns, peak morning/evening checkout volumes, and payment method distribution.`;
    }
    if (src.includes('backery data analysis insights')) {
      return `High-resolution Excel Analytical Insights view for Bakery Operations: Root cause diagnosis of discounting losses, seasonal demand forecasting, and inventory shelf-life optimization strategies.`;
    }
    if (src.includes('amazon_sales')) {
      return `High-resolution Executive Sales Performance Dashboard for Amazon E-Commerce: Cross-regional revenue analysis tracking 50,000+ orders, $32.8M total sales, 6 product categories, and 5 global fulfillment territories.`;
    }
    if (src.includes('badges/pl 300') || src.includes('pl 300.png')) {
      return `Official Microsoft Certified: Power BI Data Analyst Associate (PL-300) verified digital badge credential recognizing data modeling, DAX measures, and workspace deployment mastery.`;
    }
    if (src.includes('badges/dp 600') || src.includes('dp 600.png')) {
      return `Official Microsoft Certified: Fabric Analytics Engineer Associate (DP-600) verified digital badge credential recognizing lakehouse architecture, data warehousing, and semantic modeling expertise.`;
    }
    if (src.includes('badges/dp 700') || src.includes('dp 700.png')) {
      return `Official Microsoft Certified: Fabric Data Engineer Associate (DP-700) verified digital badge credential validating enterprise ETL pipelines, lakehouse ingestion, and data security architectures.`;
    }
    if (src.includes('ai-skills-fest')) {
      return `Official Microsoft: AI Skills Fest 2026 verified achievement digital badge credential demonstrating practical knowledge of AI tools, productivity acceleration, and ethical AI deployment.`;
    }
    if (src.includes('mckinsey-org-forward')) {
      return `Official McKinsey.org Forward Program digital badge credential certifying practical business problem solving, structured communications, digital toolkits, and adaptability.`;
    }
    if (src.includes('certificates/powerbi pl300')) {
      return `Official Microsoft Certified: Power BI Data Analyst Associate (PL-300) certificate awarded to Tejas C. Waghmare.`;
    }
    if (src.includes('dp 600.jpg')) {
      return `Official Microsoft Certified: Fabric Analytics Engineer Associate (DP-600) certificate awarded to Tejas C. Waghmare.`;
    }
    if (src.includes('dp-700') || src.includes('credentia.png')) {
      return `Official Microsoft Certified: Fabric Data Engineer Associate (DP-700) certificate awarded to Tejas C. Waghmare.`;
    }
    if (src.includes('udemy python')) {
      return `Official Udemy Certificate of Completion for Python for Data Science and Machine Learning Bootcamp awarded to Tejas C. Waghmare, validating Pandas, NumPy, visualization, and predictive modeling.`;
    }
    if (src.includes('hobby_analytical')) {
      return `Visual depiction of Analytical Thinking: Exploratory data analysis, hypothesis validation, and uncovering hidden data patterns.`;
    }
    if (src.includes('hobby_problem_solving')) {
      return `Structured Problem Solving Framework diagram: Methodical progression connecting Problem definition, Critical Thinking, and Data Solution.`;
    }
    if (src.includes('hobby_storytelling')) {
      return `Visual illustration of Data Storytelling: Translating complex statistical findings into actionable executive business roadmaps.`;
    }
    if (src.includes('hobby_design')) {
      return `Visual design system of Dashboard & UI Design: Clean user interface hierarchy, deliberate contrast, and intuitive business intelligence layouts.`;
    }
    if (src.includes('hobby_travelling')) {
      return `Photograph depicting Travelling and Trekking: Tejas exploring mountain peaks, waterfalls, and scenic outdoor trails.`;
    }
    if (src.includes('hobby_cooking')) {
      return `Photograph representing Culinary Craft: High-precision cooking with fresh ingredients and balanced culinary composition.`;
    }
    if (src.includes('hobby_music')) {
      return `Visual representing Music and Flow State: Studio headphones and curated ambient playlists for focused deep data work.`;
    }

    return clean ? `High-resolution preview of ${clean}` : 'High-resolution preview image';
  }

  function updateLightboxTransform() {
    if (!lightboxBody) return;
    const img = lightboxBody.querySelector('img');
    const zoomText = document.getElementById('lightbox-zoom-level');
    if (zoomText) {
      zoomText.textContent = Math.round(lightboxScale * 100) + '%';
    }
    if (!img) return;

    if (lightboxScale <= 1) {
      lightboxScale = 1;
      lightboxPanX = 0;
      lightboxPanY = 0;
      img.style.transform = '';
      img.classList.remove('is-zoomed', 'is-dragging');
      img.style.cursor = 'zoom-in';
    } else {
      img.style.transform = `scale(${lightboxScale}) translate(${lightboxPanX / lightboxScale}px, ${lightboxPanY / lightboxScale}px)`;
      img.classList.add('is-zoomed');
      if (!isLightboxDragging) img.style.cursor = 'grab';
    }
  }

  window.adjustLightboxZoom = function (delta) {
    if (!lightboxModal || !lightboxModal.classList.contains('active')) return;
    const img = lightboxBody ? lightboxBody.querySelector('img') : null;
    if (!img) return;

    const newScale = Math.round((lightboxScale + delta) * 100) / 100;
    if (newScale >= 0.5 && newScale <= 3.0) {
      lightboxScale = newScale;
      updateLightboxTransform();
    }
  };

  window.resetLightboxZoom = function () {
    lightboxScale = 1;
    lightboxPanX = 0;
    lightboxPanY = 0;
    updateLightboxTransform();
  };

  function panLightboxImage(dx, dy) {
    if (lightboxScale <= 1) return;
    lightboxPanX += dx;
    lightboxPanY += dy;
    updateLightboxTransform();
  }

  window.openLightbox = function (mediaSrc, mediaType, title, altText) {
    if (!lightboxModal || !lightboxBody) return;
    try {
      window.dispatchEvent(new CustomEvent('portfolio:lightbox', { detail: { mediaSrc, mediaType, title } }));
    } catch (e) { }

    const cleanTitle = decodeHtmlEntities(title || 'Preview');
    if (lightboxTitle) {
      lightboxTitle.textContent = cleanTitle;
    }

    const zoomControls = document.getElementById('lightbox-zoom-controls');
    lightboxBody.innerHTML = '';
    resetLightboxZoom();

    if (mediaType === 'video') {
      if (zoomControls) zoomControls.style.display = 'none';
      const video = document.createElement('video');
      video.src = mediaSrc;
      video.controls = true;
      video.autoplay = true;
      video.style.width = '100%';
      video.style.maxHeight = '75vh';
      video.setAttribute('aria-label', cleanTitle || 'Video walkthrough');
      video.tabIndex = 0;
      video.innerHTML = '<p>Your browser does not support the video tag. <a href="' + mediaSrc + '" download>Download video</a>.</p>';
      lightboxBody.appendChild(video);
    } else {
      if (zoomControls) zoomControls.style.display = 'flex';
      const img = document.createElement('img');
      img.src = mediaSrc;
      const descriptiveAlt = getDescriptiveAltText(mediaSrc, title, altText);
      img.alt = descriptiveAlt;
      img.setAttribute('role', 'img');
      img.setAttribute('aria-label', descriptiveAlt);
      img.title = cleanTitle + ' (Click or use +/- keys to zoom)';
      img.tabIndex = 0;
      lightboxBody.appendChild(img);
    }

    lightboxModal.classList.add('active');
    lightboxModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trapFocusInModal(lightboxModal);
  };

  window.closeLightbox = function () {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('active');
    lightboxModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    resetLightboxZoom();
    releaseFocusFromModal(lightboxModal);

    if (lightboxBody) {
      // Stop video playback if any
      const video = lightboxBody.querySelector('video');
      if (video) {
        video.pause();
        video.src = '';
      }
      lightboxBody.innerHTML = '';
    }
  };

  // Keyboard controls for Lightbox (Escape to close, +/- to zoom, 0/r to reset, arrows to pan)
  document.addEventListener('keydown', (e) => {
    if (!lightboxModal || !lightboxModal.classList.contains('active')) return;

    if (e.key === 'Escape') {
      window.closeLightbox();
      return;
    }

    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      window.adjustLightboxZoom(0.25);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      window.adjustLightboxZoom(-0.25);
    } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      window.resetLightboxZoom();
    } else if (lightboxScale > 1) {
      const step = 40;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        panLightboxImage(0, step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        panLightboxImage(0, -step);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        panLightboxImage(step, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        panLightboxImage(-step, 0);
      }
    }
  });

  // Lightbox mouse drag-to-pan, click-to-toggle-zoom, and wheel zoom
  if (lightboxBody) {
    lightboxBody.addEventListener('mousedown', (e) => {
      const img = lightboxBody.querySelector('img');
      if (!img || lightboxScale <= 1) return;
      isLightboxDragging = true;
      lightboxDragStartX = e.clientX - lightboxPanX;
      lightboxDragStartY = e.clientY - lightboxPanY;
      img.classList.add('is-dragging');
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isLightboxDragging) return;
      lightboxPanX = e.clientX - lightboxDragStartX;
      lightboxPanY = e.clientY - lightboxDragStartY;
      const img = lightboxBody ? lightboxBody.querySelector('img') : null;
      if (img) {
        img.style.transform = `scale(${lightboxScale}) translate(${lightboxPanX / lightboxScale}px, ${lightboxPanY / lightboxScale}px)`;
      }
    });

    window.addEventListener('mouseup', () => {
      if (isLightboxDragging) {
        isLightboxDragging = false;
        const img = lightboxBody ? lightboxBody.querySelector('img') : null;
        if (img) img.classList.remove('is-dragging');
        updateLightboxTransform();
      }
    });

    lightboxBody.addEventListener('click', (e) => {
      const img = lightboxBody.querySelector('img');
      if (e.target === img && !isLightboxDragging) {
        if (lightboxScale === 1) {
          lightboxScale = 1.75;
        } else {
          lightboxScale = 1;
          lightboxPanX = 0;
          lightboxPanY = 0;
        }
        updateLightboxTransform();
      }
    });

    lightboxBody.addEventListener('wheel', (e) => {
      const img = lightboxBody.querySelector('img');
      if (!img) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      window.adjustLightboxZoom(delta);
    }, { passive: false });
  }

  // =========================================================================
  // Kova "Let's talk." Interactive System
  // =========================================================================
  function initKovaContact() {
    // 1. Topic Pills ("WHAT BRINGS YOU HERE?")
    const pillsGroup = document.getElementById('kova-pills-group');
    const topicInput = document.getElementById('talk-topic');
    if (pillsGroup && topicInput) {
      const pills = pillsGroup.querySelectorAll('.kova-pill');
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pill.classList.toggle('active');
          const selected = Array.from(pills)
            .filter(p => p.classList.contains('active'))
            .map(p => p.getAttribute('data-topic'));
          topicInput.value = selected.length > 0 ? selected.join(', ') : 'General Discussion';
        });
      });
    }

    // 2. How Urgent Slider ("HOW URGENT?")
    const urgencySlider = document.getElementById('talk-urgency');
    const urgencyVal = document.getElementById('talk-urgency-val');

    function updateUrgencySlider(val) {
      if (!urgencyVal) return;
      let text = 'Sometime soon';
      if (val <= 18) {
        text = 'Whenever (No rush)';
      } else if (val <= 42) {
        text = 'Sometime soon';
      } else if (val <= 68) {
        text = 'In the next couple weeks';
      } else if (val <= 88) {
        text = 'Pretty urgent';
      } else {
        text = 'ASAP (Drop everything!)';
      }
      urgencyVal.textContent = text;

      // Update slider track gradient fill smoothly in brand Electric Yellow
      if (urgencySlider) {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const fillCol = '#F5E025';
        const trackCol = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.16)';
        urgencySlider.style.background = `linear-gradient(to right, ${fillCol} 0%, ${fillCol} ${val}%, ${trackCol} ${val}%, ${trackCol} 100%)`;
      }
    }

    if (urgencySlider) {
      urgencySlider.addEventListener('input', (e) => {
        updateUrgencySlider(parseInt(e.target.value, 10));
      });
      // Initial trigger
      updateUrgencySlider(parseInt(urgencySlider.value, 10));

      // Theme change observer for slider colors
      const themeObserver = new MutationObserver(() => {
        updateUrgencySlider(parseInt(urgencySlider.value, 10));
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    // 3. Contact Phone Number (Numeric Digits Only, Strict Filter)
    const phoneInput = document.getElementById('talk-phone');
    const phoneHint = document.getElementById('talk-phone-hint');
    let phoneAlertTimer = null;

    function triggerPhoneAlert() {
      if (!phoneHint) return;
      phoneHint.classList.add('hint-alert');
      clearTimeout(phoneAlertTimer);
      phoneAlertTimer = setTimeout(() => {
        phoneHint.classList.remove('hint-alert');
      }, 1200);
    }

    if (phoneInput) {
      // Prevent non-numeric keystrokes from typing
      phoneInput.addEventListener('keydown', (e) => {
        const allowedKeys = [
          'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          'Tab', 'Home', 'End', 'Enter', 'Escape'
        ];
        if (allowedKeys.includes(e.key)) return;
        // Allow standard modifier shortcuts (Ctrl/Cmd + A, C, V, X, Z)
        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) {
          return;
        }
        // Block anything that is not a numeric digit 0-9
        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          triggerPhoneAlert();
        }
      });

      // Filter on input (catches autofill, virtual keyboards, drag-drop)
      phoneInput.addEventListener('input', () => {
        const cleaned = phoneInput.value.replace(/\D/g, '');
        if (phoneInput.value !== cleaned) {
          phoneInput.value = cleaned;
          triggerPhoneAlert();
        }
      });

      // Filter on paste (strip non-digits, truncate to 15 digits)
      phoneInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text') || '';
        const digitsOnly = pastedText.replace(/\D/g, '');
        const start = phoneInput.selectionStart || 0;
        const end = phoneInput.selectionEnd || 0;
        const curr = phoneInput.value;
        const result = (curr.slice(0, start) + digitsOnly + curr.slice(end)).slice(0, 15);
        phoneInput.value = result;
        if (pastedText !== digitsOnly) {
          triggerPhoneAlert();
        }
      });
    }

    // 4. Live Pune Clock (IST: UTC+5:30)
    const clockEl = document.getElementById('kova-pune-clock');
    function updatePuneClock() {
      if (!clockEl) return;
      try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        clockEl.textContent = `${timeStr} IST`;
      } catch (err) {
        clockEl.textContent = 'IST (UTC+5:30)';
      }
    }
    updatePuneClock();
    setInterval(updatePuneClock, 10000);

    // 4. Floating Cursor Tooltip for "Let's build something" (kova.me style)
    function initFooterTip() {
      const tip = document.getElementById('footer-tip');
      const trigger = document.getElementById('lets-build-trigger') || document.querySelector('.lets-build-title');
      if (!tip || !trigger) return;

      const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (!canHover) return;

      let mouseX = 0, mouseY = 0;
      let tipX = 0, tipY = 0;
      let isHovered = false;
      let rafId = null;

      function renderTip() {
        if (!isHovered) return;
        tipX += (mouseX - tipX) * 0.22;
        tipY += (mouseY - tipY) * 0.22;
        tip.style.left = `${tipX}px`;
        tip.style.top = `${tipY}px`;
        rafId = requestAnimationFrame(renderTip);
      }

      trigger.addEventListener('mouseenter', (e) => {
        isHovered = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
        tipX = mouseX;
        tipY = mouseY;
        tip.style.left = `${tipX}px`;
        tip.style.top = `${tipY}px`;
        tip.classList.add('visible');
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(renderTip);
      });

      trigger.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      });

      trigger.addEventListener('mouseleave', () => {
        isHovered = false;
        tip.classList.remove('visible');
        if (rafId) cancelAnimationFrame(rafId);
      });

      trigger.addEventListener('click', () => {
        isHovered = false;
        tip.classList.remove('visible');
        if (rafId) cancelAnimationFrame(rafId);
      });
    }
    initFooterTip();
  }

  // 5. Modal Controllers for "Let's talk" (kova.me style)
  window.openContactModal = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    const modal = document.getElementById('kova-contact-modal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Hide footer tooltip immediately if visible
    const tip = document.getElementById('footer-tip');
    if (tip) tip.classList.remove('visible');

    // Ensure kinetic typography on modal title if present
    const modalTitle = modal.querySelector('.cm-title');
    if (modalTitle && window.setupKineticElement) {
      window.setupKineticElement(modalTitle);
    }

    trapFocusInModal(modal);
  };

  window.closeContactModal = function () {
    const modal = document.getElementById('kova-contact-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    releaseFocusFromModal(modal);
  };

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const contactModal = document.getElementById('kova-contact-modal');
      if (contactModal && contactModal.classList.contains('active')) {
        window.closeContactModal();
      }
      const resumeModal = document.getElementById('resume-modal');
      if (resumeModal && resumeModal.classList.contains('active')) {
        window.closeResumeModal();
      }
    }
  });

  // =========================================================================
  // Resume Preview Modal & Live PDF Viewer System
  // =========================================================================
  let resumePdfDoc = null;
  let resumePdfScale = 1.35;
  let isResumeLoaded = false;
  let currentResumeView = 'scan'; // 'scan' or 'embed'
  let downloadToastTimer = null;

  function getInitialResumeScale() {
    const w = window.innerWidth;
    if (w <= 480) return 0.65;
    if (w <= 768) return 0.85;
    if (w <= 1024) return 1.1;
    return 1.35;
  }

  window.openResumeModal = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    const modal = document.getElementById('resume-modal');
    if (!modal) return;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Hide footer cursor tip if visible
    const tip = document.getElementById('footer-tip');
    if (tip) tip.classList.remove('visible');

    // Trigger analytics tracking if available
    try {
      if (typeof window.trackPortfolioEvent === 'function') {
        window.trackPortfolioEvent('resume_modal_open', { trigger: 'resume_btn' });
      }
    } catch (err) { }

    // Load resume if not loaded yet
    if (!isResumeLoaded) {
      resumePdfScale = getInitialResumeScale();
      loadAndRenderResume();
    }

    trapFocusInModal(modal);
  };

  window.closeResumeModal = function () {
    const modal = document.getElementById('resume-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    releaseFocusFromModal(modal);
  };

  window.switchResumeView = function (viewMode) {
    currentResumeView = viewMode;
    const btnScan = document.getElementById('btn-view-scan');
    const btnEmbed = document.getElementById('btn-view-embed');
    const canvasWrap = document.getElementById('resume-canvas-container');
    const embedWrap = document.getElementById('resume-embed-container');
    const zoomControls = document.getElementById('resume-zoom-controls');
    const iframe = document.getElementById('resume-native-frame');

    if (viewMode === 'scan') {
      if (btnScan) btnScan.classList.add('active');
      if (btnEmbed) btnEmbed.classList.remove('active');
      if (canvasWrap) canvasWrap.style.display = 'flex';
      if (embedWrap) embedWrap.style.display = 'none';
      if (zoomControls) zoomControls.style.display = 'flex';
    } else {
      if (btnScan) btnScan.classList.remove('active');
      if (btnEmbed) btnEmbed.classList.add('active');
      if (canvasWrap) canvasWrap.style.display = 'none';
      if (embedWrap) embedWrap.style.display = 'block';
      if (zoomControls) zoomControls.style.display = 'none';

      // Always load latest version using cache-busting timestamp
      if (iframe && (!iframe.src || iframe.src.indexOf('tejas resume.pdf') === -1)) {
        iframe.src = 'tejas resume.pdf?v=' + Date.now() + '#toolbar=1&navpanes=0&view=FitH';
      }
    }
  };

  window.adjustResumeZoom = function (delta) {
    if (currentResumeView !== 'scan') return;
    const newScale = Math.round((resumePdfScale + delta) * 100) / 100;
    if (newScale >= 0.5 && newScale <= 2.5) {
      resumePdfScale = newScale;
      renderResumePages();
    }
  };

  window.resetResumeZoom = function () {
    if (currentResumeView !== 'scan') return;
    resumePdfScale = getInitialResumeScale();
    renderResumePages();
  };

  // Keyboard zoom controls for Resume Modal (+, -, 0, r)
  document.addEventListener('keydown', (e) => {
    const resumeModal = document.getElementById('resume-modal');
    if (!resumeModal || !resumeModal.classList.contains('active')) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      window.adjustResumeZoom(0.15);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      window.adjustResumeZoom(-0.15);
    } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      window.resetResumeZoom();
    }
  });

  async function loadAndRenderResume() {
    const loader = document.getElementById('resume-loading-indicator');
    const iframe = document.getElementById('resume-native-frame');

    if (loader) loader.style.display = 'flex';

    // Attempt rendering using PDF.js
    if (window.pdfjsLib) {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        // Cache-busting URL guarantees the latest version is always rendered
        const pdfUrl = 'tejas resume.pdf?v=' + Date.now();
        const loadingTask = window.pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true
        });

        resumePdfDoc = await loadingTask.promise;
        await renderResumePages();
        isResumeLoaded = true;
        if (loader) loader.style.display = 'none';
        return;
      } catch (e) {
        console.warn('PDF.js rendering note (switching to native embed fallback):', e);
      }
    }

    // Fallback to native PDF iframe
    if (loader) loader.style.display = 'none';
    if (iframe) {
      iframe.src = 'tejas resume.pdf?v=' + Date.now() + '#toolbar=1&navpanes=0&view=FitH';
    }
    window.switchResumeView('embed');
    isResumeLoaded = true;
  }

  async function renderResumePages() {
    if (!resumePdfDoc) return;
    const container = document.getElementById('resume-canvas-container');
    if (!container) return;
    container.innerHTML = '';

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    for (let pageNum = 1; pageNum <= resumePdfDoc.numPages; pageNum++) {
      const page = await resumePdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: resumePdfScale });

      const pageSheet = document.createElement('div');
      pageSheet.className = 'resume-page-sheet';

      const canvas = document.createElement('canvas');
      canvas.className = 'resume-canvas-page';
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `Tejas C. Waghmare Professional Resume - Page ${pageNum} of ${resumePdfDoc.numPages}`);
      canvas.tabIndex = 0;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      pageSheet.appendChild(canvas);
      container.appendChild(pageSheet);
    }

    const zoomLabel = document.getElementById('resume-zoom-level');
    if (zoomLabel) {
      const baseScale = getInitialResumeScale();
      const percent = Math.round((resumePdfScale / baseScale) * 100);
      zoomLabel.textContent = percent + '%';
    }
  }

  // Download Resume Function (Triggered by Header or Footer Download CTA)
  window.downloadResumeFromModal = function (triggerBtn) {
    // 1. Download file directly (with cache-busting to ensure latest version is fetched)
    const link = document.createElement('a');
    link.href = 'tejas resume.pdf?v=' + Date.now();
    link.download = 'Tejas_C_Waghmare_Resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 2. Track in analytics
    try {
      if (typeof window.trackPortfolioEvent === 'function') {
        window.trackPortfolioEvent('resume_download_success', {
          file_name: 'Tejas_C_Waghmare_Resume.pdf',
          source: 'resume_modal'
        });
      }
    } catch (e) { }

    // 3. Update all download buttons in modal (header and footer)
    const buttons = document.querySelectorAll('.resume-download-cta');
    buttons.forEach(btn => {
      btn.classList.add('downloading');
      const label = btn.querySelector('.download-btn-label');
      if (label) label.textContent = 'Downloading...';
    });

    setTimeout(() => {
      buttons.forEach(btn => {
        btn.classList.remove('downloading');
        btn.classList.add('download-complete');
        const label = btn.querySelector('.download-btn-label');
        if (label) label.textContent = '✓ Downloaded!';
      });

      // 4. Show the very short message of download completion (Toast)
      const toast = document.getElementById('resume-download-toast');
      if (toast) {
        toast.classList.add('show');
        if (downloadToastTimer) clearTimeout(downloadToastTimer);
        downloadToastTimer = setTimeout(() => {
          toast.classList.remove('show');
        }, 3400);
      }

      // 5. Revert button label back after 3.8s
      setTimeout(() => {
        buttons.forEach(btn => {
          btn.classList.remove('download-complete');
          const label = btn.querySelector('.download-btn-label');
          if (label) {
            if (btn.id === 'resume-download-btn-footer') {
              label.textContent = 'Download Latest Resume';
            } else {
              label.textContent = 'Download PDF';
            }
          }
        });
      }, 3800);
    }, 400);
  };

  // 6. One-Click Copy Contact Email
  window.copyContactEmail = function (btn) {
    const email = 'tejaswaghmare900@gmail.com';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(() => {
        const copyText = btn.querySelector('.copy-text');
        const originalText = copyText ? copyText.textContent : 'Copy';
        btn.classList.add('copied');
        if (copyText) copyText.textContent = 'Copied! ✓';
        setTimeout(() => {
          btn.classList.remove('copied');
          if (copyText) copyText.textContent = originalText;
        }, 2000);
      }).catch(() => {
        prompt('Copy email address:', email);
      });
    } else {
      prompt('Copy email address:', email);
    }
  };

  // --- Auto-Responder & Contact Transmission Configuration ---
  // Connects to your Google Apps Script Web App (or EmailJS) to send an INSTANT
  // warm, gentle auto-reply directly to the visitor's Gmail, with your portfolio & LinkedIn links.
  const AUTO_RESPONDER_CONFIG = {
    // 1. Google Apps Script Web App (RECOMMENDED: 100% Free native Gmail delivery directly to visitor)
    // Deploy google_apps_script_autoresponder.js in script.google.com and paste your Web App URL below:
    googleScriptUrl: 'https://script.google.com/macros/s/AKfycbyLaoX7UU9_uvtgNAC1Chcq1PEzcOvfbQl3kp53t2JlPrfD1dRw5btr2SwuTCpXAEfG1A/exec',

    // 2. EmailJS (Alternative client-side email dispatch service)
    emailjs: {
      enabled: false,
      publicKey: '',
      serviceId: '',
      autoReplyTemplateId: ''
    },

    // 3. Fallback: FormSubmit endpoint for notifying Tejas
    formSubmitEndpoint: 'https://formsubmit.co/ajax/tejaswaghmare900@gmail.com',

    // Tejas Public Profiles (included in auto-replies)
    ownerName: 'Tejas C. Waghmare',
    ownerEmail: 'tejaswaghmare900@gmail.com',

    portfolioUrl: 'https://www.tejaswaghmare.me/',
    linkedinUrl: 'https://www.linkedin.com/in/tejascwaghmare',
    githubUrl: 'https://github.com/TCWaghmare'
  };
  window.AUTO_RESPONDER_CONFIG = AUTO_RESPONDER_CONFIG;

  // --- Supabase Database Configuration for Contact Form Submissions ---
  const SUPABASE_CONFIG = {
    url: 'https://tkuggtlofzofaeltlzul.supabase.co',
    anonKey: 'sb_publishable_6jfofP0ME0VE5IrkyxVQGg_miRbVX_0',
    table: 'portfolio_contacts'
  };

  // Helper to persist submission records directly into Supabase table
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
  async function saveToSupabase(payload) {
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
      return { skipped: true, reason: 'Supabase credentials not configured' };
    }

    const endpoint = `${SUPABASE_CONFIG.url.replace(/\/$/, '')}/rest/v1/${SUPABASE_CONFIG.table}`;
    const headers = {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };

    // If key is in legacy JWT format (starts with eyJ), include Authorization header
    if (SUPABASE_CONFIG.anonKey.startsWith('eyJ')) {
      headers['Authorization'] = `Bearer ${SUPABASE_CONFIG.anonKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        call_whatsapp_permission: payload.call_whatsapp_permission,
        topic: payload.topic,
        urgency: payload.urgency,
        message: payload.message
      })
    });

    if (!response.ok) {
      const errDetail = await response.text().catch(() => '');
      throw new Error(`Supabase insert error (${response.status}): ${errDetail}`);
    }

    return { success: true };
  }

  // Helper to dispatch email notification and instant auto-reply to the visitor
  // Designed for sub-second, non-blocking execution with strict timeouts
  async function dispatchContactTransmission(payload) {
    let autoReplySent = false;
    let notificationSent = false;
    let providerUsed = 'none';

    // METHOD A: Google Apps Script Web App (Fast Direct Gmail Dispatch via mode: 'no-cors')
    if (AUTO_RESPONDER_CONFIG.googleScriptUrl && AUTO_RESPONDER_CONFIG.googleScriptUrl.startsWith('http')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        // Uses mode: 'no-cors' so the browser fires the request directly to Google Apps Script
        // without waiting for cross-origin preflight or redirect handshakes. Resolves in ~300ms!
        await fetch(AUTO_RESPONDER_CONFIG.googleScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          signal: controller.signal,
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });

        clearTimeout(timeoutId);
        autoReplySent = true;
        notificationSent = true;
        providerUsed = 'google_apps_script';
        console.log('⚡ [Auto-Responder] Google Apps Script email dispatched successfully.');
        return { success: true, autoReplySent, notificationSent, provider: providerUsed };
      } catch (gasErr) {
        console.warn('Google Apps Script dispatch notice:', gasErr);
      }
    }

    // METHOD B: EmailJS Browser SDK (if enabled)
    if (AUTO_RESPONDER_CONFIG.emailjs.enabled && window.emailjs && AUTO_RESPONDER_CONFIG.emailjs.publicKey) {
      try {
        emailjs.init(AUTO_RESPONDER_CONFIG.emailjs.publicKey);
        await emailjs.send(
          AUTO_RESPONDER_CONFIG.emailjs.serviceId,
          AUTO_RESPONDER_CONFIG.emailjs.autoReplyTemplateId,
          {
            to_name: payload.name,
            to_email: payload.email,
            topic: payload.topic,
            urgency: payload.urgency,
            message: payload.message,
            portfolio_url: AUTO_RESPONDER_CONFIG.portfolioUrl,
            linkedin_url: AUTO_RESPONDER_CONFIG.linkedinUrl
          }
        );
        autoReplySent = true;
        providerUsed = 'emailjs';
        return { success: true, autoReplySent, notificationSent: true, provider: providerUsed };
      } catch (emailjsErr) {
        console.warn('EmailJS error:', emailjsErr);
      }
    }

    // METHOD C: Fallback FormSubmit with strict 2.5s timeout (prevents hanging when FormSubmit is down)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const fsResponse = await fetch(AUTO_RESPONDER_CONFIG.formSubmitEndpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          call_whatsapp_permission: payload.call_whatsapp_permission,
          _subject: `[Portfolio Inquiry] ${payload.topic} from ${payload.name} (${payload.urgency})`,
          topic: payload.topic,
          urgency: payload.urgency,
          message: payload.message,
          _captcha: 'false',
          _template: 'table'
        })
      });
      clearTimeout(timeoutId);
      const fsData = await fsResponse.json().catch(() => ({}));
      if (fsResponse.ok && (fsData.success === 'true' || fsData.success === true || (fsData.message && fsData.message.toLowerCase().includes('activation')))) {
        notificationSent = true;
        return { success: true, autoReplySent, notificationSent, provider: 'formsubmit' };
      }
    } catch (fsErr) {
      console.warn('FormSubmit notice (service may be slow/down):', fsErr);
    }

    if (autoReplySent) {
      return { success: true, autoReplySent, notificationSent, provider: providerUsed };
    }

    return { success: false, reason: 'Email dispatchers timed out' };
  }

  // --- 7. Contact Form: Validation, Anti-Spam Protection & Success Engine ---
  const FORM_INIT_TIME = Date.now();
  let lastContactSubmitTime = 0;

  function escapeHtmlStr(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Individual field validation rules
  function validateContactName(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return { valid: false, message: 'Please enter your name.' };
    }
    if (trimmed.length < 2) {
      return { valid: false, message: 'Name must be at least 2 characters.' };
    }
    if (trimmed.length > 70) {
      return { valid: false, message: 'Name must be 70 characters or less.' };
    }
    if (!/[a-zA-Z]/.test(trimmed)) {
      return { valid: false, message: 'Please enter a valid name containing letters.' };
    }
    return { valid: true };
  }

  function validateContactEmail(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return { valid: false, message: 'Please enter your email address.' };
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, message: 'Please enter a valid email address (e.g. name@company.com).' };
    }
    return { valid: true };
  }

  function validateContactPhone(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return { valid: true }; // Optional field
    }
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return { valid: false, message: 'Phone number must be between 7 and 15 digits.' };
    }
    return { valid: true };
  }

  function validateContactMessage(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return { valid: false, message: 'Please enter your message.' };
    }
    if (trimmed.length < 10) {
      return { valid: false, message: 'Please enter at least 10 characters so Tejas can understand your request.' };
    }
    if (trimmed.length > 3000) {
      return { valid: false, message: 'Message must be 3,000 characters or less.' };
    }
    return { valid: true };
  }

  function setFieldError(inputEl, errorEl, message) {
    if (!inputEl) return;
    inputEl.classList.add('is-invalid');
    inputEl.classList.remove('is-valid');
    if (errorEl) {
      errorEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><span>${escapeHtmlStr(message)}</span>`;
      errorEl.classList.add('active');
    }
  }

  function clearFieldError(inputEl, errorEl) {
    if (!inputEl) return;
    inputEl.classList.remove('is-invalid');
    if (errorEl) {
      errorEl.innerHTML = '';
      errorEl.classList.remove('active');
    }
    if (inputEl.value && inputEl.value.trim().length > 0) {
      inputEl.classList.add('is-valid');
    } else {
      inputEl.classList.remove('is-valid');
    }
  }

  // Interactive Real-Time Validation Listeners
  function initContactFormValidation() {
    const form = document.getElementById('portfolio-contact-form');
    if (!form) return;

    const nameInput = document.getElementById('talk-name');
    const nameError = document.getElementById('talk-name-error');
    const emailInput = document.getElementById('talk-email');
    const emailError = document.getElementById('talk-email-error');
    const phoneInput = document.getElementById('talk-phone');
    const phoneError = document.getElementById('talk-phone-error');
    const messageInput = document.getElementById('talk-message');
    const messageError = document.getElementById('talk-message-error');

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        if (nameInput.classList.contains('is-invalid')) {
          const res = validateContactName(nameInput.value);
          if (res.valid) clearFieldError(nameInput, nameError);
        }
      });
      nameInput.addEventListener('blur', () => {
        if (nameInput.value.trim().length > 0) {
          const res = validateContactName(nameInput.value);
          if (!res.valid) setFieldError(nameInput, nameError, res.message);
          else clearFieldError(nameInput, nameError);
        }
      });
    }

    if (emailInput) {
      emailInput.addEventListener('input', () => {
        if (emailInput.classList.contains('is-invalid')) {
          const res = validateContactEmail(emailInput.value);
          if (res.valid) clearFieldError(emailInput, emailError);
        }
      });
      emailInput.addEventListener('blur', () => {
        if (emailInput.value.trim().length > 0) {
          const res = validateContactEmail(emailInput.value);
          if (!res.valid) setFieldError(emailInput, emailError, res.message);
          else clearFieldError(emailInput, emailError);
        }
      });
    }

    if (phoneInput) {
      phoneInput.addEventListener('input', () => {
        if (phoneInput.classList.contains('is-invalid')) {
          const res = validateContactPhone(phoneInput.value);
          if (res.valid) clearFieldError(phoneInput, phoneError);
        }
      });
      phoneInput.addEventListener('blur', () => {
        if (phoneInput.value.trim().length > 0) {
          const res = validateContactPhone(phoneInput.value);
          if (!res.valid) setFieldError(phoneInput, phoneError, res.message);
          else clearFieldError(phoneInput, phoneError);
        }
      });
    }

    if (messageInput) {
      messageInput.addEventListener('input', () => {
        if (messageInput.classList.contains('is-invalid')) {
          const res = validateContactMessage(messageInput.value);
          if (res.valid) clearFieldError(messageInput, messageError);
        }
      });
      messageInput.addEventListener('blur', () => {
        if (messageInput.value.trim().length > 0) {
          const res = validateContactMessage(messageInput.value);
          if (!res.valid) setFieldError(messageInput, messageError, res.message);
          else clearFieldError(messageInput, messageError);
        }
      });
    }
  }

  // Reset form and re-enable inputs after successful submission
  window.resetContactForm = function () {
    const form = document.getElementById('portfolio-contact-form');
    const feedback = document.getElementById('talk-form-feedback') || document.getElementById('form-feedback');
    if (form) {
      form.reset();
      form.querySelectorAll('.kova-input').forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
      });
      form.querySelectorAll('.kova-field-error').forEach(err => {
        err.classList.remove('active');
        err.innerHTML = '';
      });
    }
    if (feedback) {
      feedback.style.display = 'none';
      feedback.innerHTML = '';
      feedback.className = 'form-feedback';
    }
    const nameInput = document.getElementById('talk-name');
    if (nameInput) nameInput.focus();
  };

  // Helper to render high-clarity success card
  function displaySuccessCard(name, email, submitBtn, originalBtnHtml, form, topic, urgency) {
    lastContactSubmitTime = Date.now();
    const feedback = document.getElementById('talk-form-feedback') || document.getElementById('form-feedback');

    if (feedback) {
      feedback.className = 'form-feedback success';
      feedback.innerHTML = `
        <div class="kova-success-card">
          <div class="kova-success-badge">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Message Delivered Successfully</span>
          </div>
          <h3 class="kova-success-title">
            Thank you, <span class="highlight-yellow">${escapeHtmlStr(name)}</span>!
          </h3>
          <p class="kova-success-text">
            Your message is safely in my personal inbox. An instant confirmation email with my portfolio links and project details has been sent to <strong>${escapeHtmlStr(email)}</strong>.
          </p>
          <div class="kova-success-timeline">
            <span>⚡ Expected Response:</span> Typically within 24 hours.
          </div>
          <button type="button" class="kova-reset-btn" onclick="resetContactForm()">
            Send another message &rarr;
          </button>
        </div>
      `;
      feedback.style.display = 'block';
      setTimeout(function() { feedback.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
    }

    form.reset();
    form.querySelectorAll('.kova-input').forEach(input => {
      input.classList.remove('is-valid', 'is-invalid');
    });
    form.querySelectorAll('.kova-field-error').forEach(err => {
      err.classList.remove('active');
      err.innerHTML = '';
    });

    const phoneEl = document.getElementById('talk-phone');
    if (phoneEl) phoneEl.value = '';
    const permissionEl = document.getElementById('talk-permission');
    if (permissionEl) permissionEl.checked = false;

    // Reset topic pill & urgency slider
    const defaultPill = document.querySelector('.kova-pill[data-topic="A project"]');
    if (defaultPill) {
      document.querySelectorAll('.kova-pill').forEach(p => p.classList.remove('active'));
      defaultPill.classList.add('active');
      const topicInput = document.getElementById('talk-topic');
      if (topicInput) topicInput.value = 'A project';
    }
    const urgencyInput = document.getElementById('talk-urgency');
    const urgencyVal = document.getElementById('talk-urgency-val');
    if (urgencyInput) {
      urgencyInput.value = '40';
      if (urgencyVal) urgencyVal.textContent = 'Sometime soon';
    }

    if (submitBtn) {
      submitBtn.innerHTML = '<span>Sent Successfully! ✓</span>';
      try { if (window.PortfolioAnalytics) window.PortfolioAnalytics.track('contact_submit', { topic: topic, urgency: urgency }); } catch (e) { }
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
        submitBtn.innerHTML = originalBtnHtml;
      }, 4500);
    }
  }

  // 7. Contact Form Handler (Comprehensive Validation, Spam Protection & Instant Feedback)
  window.handleContactSubmit = async function (e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById('talk-submit-btn') || form.querySelector('button[type="submit"]');
    const nameInput = document.getElementById('talk-name') || form.name;
    const emailInput = document.getElementById('talk-email') || form.email;
    const phoneInput = document.getElementById('talk-phone') || form.phone;
    const messageInput = document.getElementById('talk-message') || form.message;
    const honeypotInput = document.getElementById('talk-website-hp') || form.website_hp;
    const permissionEl = document.getElementById('talk-permission') || form.permission_call_whatsapp;
    const permissionGranted = permissionEl ? permissionEl.checked : false;
    const topic = form.subject ? form.subject.value.trim() : 'Project Inquiry';
    const urgencyVal = document.getElementById('talk-urgency-val');
    const urgency = urgencyVal ? urgencyVal.textContent : 'Normal';
    const feedback = document.getElementById('talk-form-feedback') || document.getElementById('form-feedback');

    const nameError = document.getElementById('talk-name-error');
    const emailError = document.getElementById('talk-email-error');
    const phoneError = document.getElementById('talk-phone-error');
    const messageError = document.getElementById('talk-message-error');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.replace(/\D/g, '').trim() : '';
    const message = messageInput ? messageInput.value.trim() : '';
    const honeypot = honeypotInput ? honeypotInput.value.trim() : '';

    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '<span>Send it &rarr;</span>';

    // --------------------------------------------------------------------------
    // A. STRICT FORM VALIDATION
    // --------------------------------------------------------------------------
    let hasValidationError = false;
    let firstInvalidField = null;

    const nameCheck = validateContactName(name);
    if (!nameCheck.valid) {
      setFieldError(nameInput, nameError, nameCheck.message);
      hasValidationError = true;
      if (!firstInvalidField) firstInvalidField = nameInput;
    } else {
      clearFieldError(nameInput, nameError);
    }

    const emailCheck = validateContactEmail(email);
    if (!emailCheck.valid) {
      setFieldError(emailInput, emailError, emailCheck.message);
      hasValidationError = true;
      if (!firstInvalidField) firstInvalidField = emailInput;
    } else {
      clearFieldError(emailInput, emailError);
    }

    const phoneCheck = validateContactPhone(phoneInput ? phoneInput.value : '');
    if (!phoneCheck.valid) {
      setFieldError(phoneInput, phoneError, phoneCheck.message);
      hasValidationError = true;
      if (!firstInvalidField) firstInvalidField = phoneInput;
    } else {
      clearFieldError(phoneInput, phoneError);
    }

    const messageCheck = validateContactMessage(message);
    if (!messageCheck.valid) {
      setFieldError(messageInput, messageError, messageCheck.message);
      hasValidationError = true;
      if (!firstInvalidField) firstInvalidField = messageInput;
    } else {
      clearFieldError(messageInput, messageError);
    }

    if (hasValidationError) {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.innerHTML = '<strong>Please correct the highlighted fields</strong> before submitting.';
        feedback.style.display = 'block';
      }
      if (firstInvalidField) firstInvalidField.focus();
      return;
    }

    // --------------------------------------------------------------------------
    // B. ANTI-SPAM PROTECTION (Honeypot, Speed-Trap & Rate Limiting)
    // --------------------------------------------------------------------------
    // Check 1: Honeypot Trap
    // Invisible field only filled by automated scraper bots
    if (honeypot && honeypot.length > 0) {
      console.warn('[Anti-Spam] Bot detected via honeypot trap.');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Sending message...</span>';
      }
      await new Promise(r => setTimeout(r, 600));
      displaySuccessCard(name, email, submitBtn, originalBtnHtml, form, topic, urgency);
      return;
    }

    // Check 2: Headless Bot Speed Trap
    // Automated bots submit in < 1.5s from page initialization
    const elapsedSeconds = (Date.now() - FORM_INIT_TIME) / 1000;
    if (elapsedSeconds < 1.5) {
      console.warn(`[Anti-Spam] Bot detected: submission too rapid (${elapsedSeconds.toFixed(2)}s).`);
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Sending message...</span>';
      }
      await new Promise(r => setTimeout(r, 600));
      displaySuccessCard(name, email, submitBtn, originalBtnHtml, form, topic, urgency);
      return;
    }

    // Check 3: Session Rate Limiting (25-second cooldown between submissions)
    const nowTime = Date.now();
    if (nowTime - lastContactSubmitTime < 25000) {
      const remainingSeconds = Math.ceil((25000 - (nowTime - lastContactSubmitTime)) / 1000);
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.innerHTML = `<strong>Inquiry already received!</strong> Please wait ${remainingSeconds} seconds before sending another message.`;
        feedback.style.display = 'block';
      }
      return;
    }

    // --------------------------------------------------------------------------
    // C. SECURE TRANSMISSION
    // --------------------------------------------------------------------------
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      submitBtn.innerHTML = '<span>Sending message...</span>';
    }

    if (feedback) {
      feedback.className = 'form-feedback loading';
      feedback.innerHTML = '<span>Transmitting your message directly to Tejas...</span>';
      feedback.style.display = 'block';
    }

    const payload = {
      name: name,
      email: email,
      phone: phone ? phone : 'Not provided',
      call_whatsapp_permission: permissionGranted ? 'Granted (Permission for Call & WhatsApp)' : 'Not granted / Not provided',
      topic: topic,
      urgency: urgency,
      message: message,
      website_hp: honeypot,
      portfolio_url: AUTO_RESPONDER_CONFIG.portfolioUrl,
      linkedin_url: AUTO_RESPONDER_CONFIG.linkedinUrl,
      submitted_at: new Date().toISOString()
    };

    try {
      // 1. Dispatch email notifications & auto-reply (fast with timeout)
      const emailPromise = dispatchContactTransmission(payload);

      // 2. Persist contact record in Supabase database table (Reliable, fast cloud storage)
      const supabasePromise = saveToSupabase({
        name,
        email,
        phone,
        call_whatsapp_permission: permissionGranted,
        topic,
        urgency,
        message
      });

      // Run both in parallel without blocking each other
      const [emailResult, supaResult] = await Promise.allSettled([emailPromise, supabasePromise]);

      const isSupaSuccess = supaResult.status === 'fulfilled' && supaResult.value && supaResult.value.success;
      const isEmailSuccess = emailResult.status === 'fulfilled' && emailResult.value && emailResult.value.success;

      if (isSupaSuccess || isEmailSuccess) {
        displaySuccessCard(name, email, submitBtn, originalBtnHtml, form, topic, urgency);
      } else {
        throw new Error('Both database and email transmission were unsuccessful');
      }
    } catch (err) {
      console.error('Submission error:', err);
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.innerHTML = `<strong>Message could not be sent automatically.</strong> Please verify your connection or write directly to <a href="mailto:tejaswaghmare900@gmail.com" class="highlight-yellow" style="text-decoration:underline;">tejaswaghmare900@gmail.com</a>.`;
        feedback.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  };

  // Auto-initialize real-time validation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactFormValidation);
  } else {
    initContactFormValidation();
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('touchmove', updateScrollProgress, { passive: true });
  window.addEventListener('resize', resizeCanvas);

  // --- Spline 3D Watermark Cleaner & Scroll-Lock Controller ---
  function initSplineCleaner() {
    const viewer = document.getElementById('hero-spline-viewer');
    if (!viewer) return;

    // Prevent mouse wheel from zooming, tilting, or moving the 3D element up and down
    const stopWheelScroll = (e) => {
      e.stopImmediatePropagation();
    };

    viewer.addEventListener('wheel', stopWheelScroll, { capture: true, passive: true });

    const setupSpline = () => {
      try {
        const root = viewer.shadowRoot;
        if (root) {
          const canvas = root.querySelector('canvas');
          if (canvas) {
            canvas.addEventListener('wheel', stopWheelScroll, { capture: true, passive: true });
          }

          if (!root.querySelector('#spline-custom-style')) {
            const style = document.createElement('style');
            style.id = 'spline-custom-style';
            style.textContent = `
              #logo, 
              a[href*="spline.design"], 
              .spline-watermark, 
              [id*="logo"] {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
                clip-path: inset(100%) !important;
                width: 0 !important;
                height: 0 !important;
                position: absolute !important;
                bottom: -9999px !important;
                left: -9999px !important;
              }
            `;
            root.appendChild(style);
          }

          if (viewer._logo) {
            viewer._logo.style.setProperty('display', 'none', 'important');
            viewer._logo.style.setProperty('opacity', '0', 'important');
            viewer._logo.style.setProperty('visibility', 'hidden', 'important');
            try { viewer._logo.remove(); } catch (err) { }
          }

          const targets = root.querySelectorAll('#logo, a[href*="spline.design"], a, [id*="logo"]');
          targets.forEach((el) => {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('opacity', '0', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            el.style.setProperty('clip-path', 'inset(100%)', 'important');
            el.style.setProperty('width', '0px', 'important');
            el.style.setProperty('height', '0px', 'important');
            try { el.remove(); } catch (err) { }
          });
        }

        // Lock camera zoom and pan on Spline Application runtime so scroll never shifts the 3D scene
        if (viewer._app) {
          if (viewer._app.controls) {
            viewer._app.controls.enableZoom = false;
            viewer._app.controls.enablePan = false;
          }
          if (viewer._app._controls) {
            viewer._app._controls.enableZoom = false;
            viewer._app._controls.enablePan = false;
          }
        }
      } catch (e) {
        console.warn('Spline setup notice:', e);
      }
    };

    setupSpline();
    viewer.addEventListener('load', setupSpline);
    viewer.addEventListener('loaded', setupSpline);
    viewer.addEventListener('pointerenter', setupSpline);

    const attachObserver = () => {
      if (viewer.shadowRoot) {
        setupSpline();
        try {
          const observer = new MutationObserver(() => setupSpline());
          observer.observe(viewer.shadowRoot, { childList: true, subtree: true, attributes: true });
        } catch (err) { }
        return true;
      }
      return false;
    };

    if (!attachObserver()) {
      
    }

    setTimeout(setupSpline, 600);
  }

  // --- Reusable Stacked Deck Carousel Controller ---
  function setupStackedCarousel({
    containerId,
    viewportId,
    trackId,
    prevBtnId,
    nextBtnId,
    dotsId,
    interval = 3600
  }) {
    const container = document.getElementById(containerId);
    const viewport = document.getElementById(viewportId);
    const track = document.getElementById(trackId);
    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);
    const dotsContainer = document.getElementById(dotsId);

    if (!container || !viewport || !track) return;

    const originalSlides = Array.from(track.querySelectorAll('.cert-card-slide'));
    const totalOriginal = originalSlides.length;
    if (totalOriginal === 0) return;

    // Clone the first 3 slides to the end for seamless continuous looping
    const cloneCount = Math.min(3, totalOriginal);
    for (let i = 0; i < cloneCount; i++) {
      const clone = originalSlides[i].cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('inert', '');
      clone.querySelectorAll('a, button, input, textarea, select, [tabindex]').forEach(el => {
        el.setAttribute('tabindex', '-1');
        el.setAttribute('aria-hidden', 'true');
      });
      clone.classList.add('cert-slide-clone');
      track.appendChild(clone);
    }

    // Ensure pagination dots match the original slides count
    if (dotsContainer && dotsContainer.children.length !== totalOriginal) {
      dotsContainer.innerHTML = '';
      for (let i = 0; i < totalOriginal; i++) {
        const dot = document.createElement('button');
        dot.className = `cert-dot ${i === 0 ? 'active' : ''}`;
        dot.setAttribute('data-slide', i);
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        if (i === 0) dot.setAttribute('aria-current', 'true');
        dotsContainer.appendChild(dot);
      }
    }

    let currentIndex = 0;
    let autoPlayTimer = null;
    let isTransitioning = false;
    let isDragging = false;
    let startX = 0;
    let currentDiff = 0;
    let isHovered = false;

    // Helper to calculate card metrics dynamically
    function getSlideMetrics() {
      const firstSlide = track.querySelector('.cert-card-slide');
      if (!firstSlide) return { width: 350, gap: 24 };
      const rect = firstSlide.getBoundingClientRect();
      const style = window.getComputedStyle(track);
      const gap = parseFloat(style.gap) || 24;
      return { width: rect.width, gap };
    }

    function updateTrackPosition(withAnimation = true) {
      const { width, gap } = getSlideMetrics();
      const offset = currentIndex * (width + gap);

      if (withAnimation) {
        track.style.transition = 'transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)';
      } else {
        track.style.transition = 'none';
      }
      track.style.transform = `translateX(-${offset}px)`;
      updateDots();
    }

    function updateDots() {
      const activeDotIndex = currentIndex % totalOriginal;
      try { container.dispatchEvent(new CustomEvent('carousel:slide', { bubbles: true, detail: { activeIndex: activeDotIndex, containerId: containerId, totalSlides: totalOriginal } })); } catch (e) { }

      // Update active slide visual state during swipe
      const slides = track.querySelectorAll('.cert-card-slide');
      slides.forEach((slide) => {
        const slideIdx = parseInt(slide.getAttribute('data-index'), 10);
        if (slideIdx === activeDotIndex) {
          slide.classList.add('is-active-slide');
        } else {
          slide.classList.remove('is-active-slide');
        }
      });

      if (!dotsContainer) return;
      const dots = dotsContainer.querySelectorAll('.cert-dot');
      dots.forEach((dot, idx) => {
        if (idx === activeDotIndex) {
          dot.classList.add('active');
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.classList.remove('active');
          dot.removeAttribute('aria-current');
        }
      });
    }

    function goToSlide(index, withAnimation = true) {
      if (isTransitioning) return;
      isTransitioning = true;
      currentIndex = index;
      updateTrackPosition(withAnimation);
      setTimeout(() => {
        isTransitioning = false;
      }, 650);
    }

    function nextSlide() {
      if (isTransitioning) return;
      isTransitioning = true;
      currentIndex++;
      updateTrackPosition(true);

      // Handle seamless infinite wrap
      setTimeout(() => {
        if (currentIndex >= totalOriginal) {
          currentIndex = 0;
          updateTrackPosition(false);
        }
        isTransitioning = false;
      }, 660);
    }

    function prevSlide() {
      if (isTransitioning) return;
      if (currentIndex === 0) {
        // Jump to clone position instantly then animate back to last slide
        currentIndex = totalOriginal;
        updateTrackPosition(false);
        void track.offsetHeight; // Force reflow
        isTransitioning = true;
        currentIndex = totalOriginal - 1;
        updateTrackPosition(true);
        setTimeout(() => {
          isTransitioning = false;
        }, 660);
      } else {
        isTransitioning = true;
        currentIndex--;
        updateTrackPosition(true);
        setTimeout(() => {
          isTransitioning = false;
        }, 660);
      }
    }

    function startAutoPlay() {
      stopAutoPlay();
      if (!isHovered) {
        autoPlayTimer = setInterval(() => {
          nextSlide();
        }, interval);
      }
    }

    function stopAutoPlay() {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    }

    // Controls listeners
    // Keyboard navigation with ArrowLeft and ArrowRight keys
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
        startAutoPlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
        startAutoPlay();
      }
    });

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextSlide();
        startAutoPlay();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        prevSlide();
        startAutoPlay();
      });
    }

    if (dotsContainer) {
      dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('.cert-dot');
        if (!dot) return;
        const targetIndex = parseInt(dot.getAttribute('data-slide'), 10);
        if (!isNaN(targetIndex)) {
          goToSlide(targetIndex, true);
          startAutoPlay();
        }
      });
    }

    // Hover & focus management to pause autoplay
    container.addEventListener('mouseenter', () => {
      isHovered = true;
      stopAutoPlay();
    });

    container.addEventListener('mouseleave', () => {
      isHovered = false;
      startAutoPlay();
    });

    container.addEventListener('focusin', () => {
      isHovered = true;
      stopAutoPlay();
    });

    container.addEventListener('focusout', () => {
      isHovered = false;
      startAutoPlay();
    });

    // Touch & Pointer Drag (Swipe Gesture Support)
    function onDragStart(clientX) {
      if (isTransitioning) return;
      isDragging = true;
      startX = clientX;
      currentDiff = 0;
      stopAutoPlay();
      track.classList.add('is-dragging');
    }

    function onDragMove(clientX) {
      if (!isDragging) return;
      currentDiff = clientX - startX;
      const { width, gap } = getSlideMetrics();
      const currentOffset = currentIndex * (width + gap);
      track.style.transform = `translateX(-${currentOffset - currentDiff}px)`;
    }

    function onDragEnd() {
      if (!isDragging) return;
      isDragging = false;
      track.classList.remove('is-dragging');

      if (currentDiff < -50) {
        nextSlide();
      } else if (currentDiff > 50) {
        prevSlide();
      } else {
        updateTrackPosition(true);
      }
      currentDiff = 0;
      startAutoPlay();
    }

    // Touch Events
    track.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        onDragStart(e.touches[0].clientX);
      }
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        onDragMove(e.touches[0].clientX);
      }
    }, { passive: true });

    track.addEventListener('touchend', () => {
      onDragEnd();
    });

    // Mouse Drag Events
    track.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('a, button')) return;
      e.preventDefault();
      onDragStart(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        onDragMove(e.clientX);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        onDragEnd();
      }
    });

    // Resize Handler with Debounce
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateTrackPosition(false);
      }, 100);
    });

    // Initial positioning & start autoplay
    updateTrackPosition(false);
    startAutoPlay();
  }

  function initAllCarousels() {
    // 1. Projects Carousel
    setupStackedCarousel({
      containerId: 'project-carousel-container',
      viewportId: 'project-viewport',
      trackId: 'project-track',
      prevBtnId: 'project-prev-btn',
      nextBtnId: 'project-next-btn',
      dotsId: 'project-dots',
      interval: 4200
    });

    // 2. Badges Carousel
    setupStackedCarousel({
      containerId: 'badge-carousel-container',
      viewportId: 'badge-viewport',
      trackId: 'badge-track',
      prevBtnId: 'badge-prev-btn',
      nextBtnId: 'badge-next-btn',
      dotsId: 'badge-dots',
      interval: 3800
    });

    // 3. Certifications Carousel
    setupStackedCarousel({
      containerId: 'cert-carousel-container',
      viewportId: 'cert-viewport',
      trackId: 'cert-track',
      prevBtnId: 'cert-prev-btn',
      nextBtnId: 'cert-next-btn',
      dotsId: 'cert-dots',
      interval: 3600
    });

    // 4. Hobbies Carousel
    setupStackedCarousel({
      containerId: 'hobbies-carousel-container',
      viewportId: 'hobbies-viewport',
      trackId: 'hobbies-track',
      prevBtnId: 'hobbies-prev-btn',
      nextBtnId: 'hobbies-next-btn',
      dotsId: 'hobbies-dots',
      interval: 3900
    });
  }

  // --- Hero Section Kinetic Text & Typewriter Animations ---
  function initHeroAnimations() {
    // 1. Interactive Name Hover & Click Ripple Feedback
    const nameTarget = document.getElementById('hero-name-target');
    if (nameTarget) {
      nameTarget.addEventListener('click', () => {
        nameTarget.classList.add('hero-name-bounce');
        setTimeout(() => {
          nameTarget.classList.remove('hero-name-bounce');
        }, 600);
      });
    }

    // 2. High-Tech Typewriter Role Rotator
    const roleTypedEl = document.getElementById('hero-role-typed');
    const roleWrapper = document.getElementById('hero-role-wrapper');
    if (roleTypedEl) {
      const roles = [
        'Data Analyst',
        'BI & Dashboard Specialist',
        'Power BI Developer (PL-300)',
        'Fabric Analytics Engineer',
        'SQL & Python Practitioner'
      ];

      let currentRoleIndex = 0;
      let currentCharIndex = roles[0].length;
      let isDeleting = false;
      let isPaused = false;
      let typewriterTimeout = null;

      function typeLoop() {
        if (isPaused) return;

        const currentWord = roles[currentRoleIndex];

        if (isDeleting) {
          currentCharIndex--;
          roleTypedEl.textContent = currentWord.substring(0, currentCharIndex);

          if (currentCharIndex === 0) {
            isDeleting = false;
            currentRoleIndex = (currentRoleIndex + 1) % roles.length;
            typewriterTimeout = setTimeout(typeLoop, 380);
            return;
          }

          typewriterTimeout = setTimeout(typeLoop, 35);
        } else {
          currentCharIndex++;
          roleTypedEl.textContent = currentWord.substring(0, currentCharIndex);

          if (currentCharIndex === currentWord.length) {
            isDeleting = true;
            typewriterTimeout = setTimeout(typeLoop, 2500); // 2.5s hold on completed title
            return;
          }

          // Variable realistic keystroke cadence
          const randomJitter = Math.floor(Math.random() * 25);
          typewriterTimeout = setTimeout(typeLoop, 75 + randomJitter);
        }
      }

      // Start typing loop after initial display hold on default "Data Analyst"
      typewriterTimeout = setTimeout(() => {
        isDeleting = true;
        typeLoop();
      }, 2600);

      // Interactive Click on role heading to fast-forward to the next role
      if (roleWrapper) {
        roleWrapper.addEventListener('click', () => {
          clearTimeout(typewriterTimeout);
          isDeleting = false;
          currentRoleIndex = (currentRoleIndex + 1) % roles.length;
          currentCharIndex = roles[currentRoleIndex].length;
          roleTypedEl.textContent = roles[currentRoleIndex];

          // Micro pop feedback
          roleTypedEl.style.transform = 'scale(1.08)';
          setTimeout(() => {
            roleTypedEl.style.transform = '';
          }, 200);

          typewriterTimeout = setTimeout(() => {
            isDeleting = true;
            typeLoop();
          }, 2600);
        });
      }
    }
  }

  // --- Floating 3D Data Analytics Tool Orbs: Persistent Drag Placement & Anti-Clipping Physics ---
  function initFloatingTools() {
    const heroSection = document.getElementById('home') || document.querySelector('.hero-section');
    const orbs = document.querySelectorAll('.hero-tool-orb');
    if (!heroSection || !orbs.length) return;

    // Orb physics state objects
    const orbStates = Array.from(orbs).map((orb) => {
      return {
        el: orb,
        baseX: 0,
        baseY: 0,
        currX: 0,
        currY: 0,
        targetX: 0,
        targetY: 0,
        currRotX: 0,
        currRotY: 0,
        currRotZ: 0,
        targetRotX: 0,
        targetRotY: 0,
        targetRotZ: 0,
        scale: 1,
        targetScale: 1,
        isDragging: false,
        pointerStartX: 0,
        pointerStartY: 0,
        startBaseX: 0,
        startBaseY: 0
      };
    });

    const pointer = {
      x: window.innerWidth * 0.7,
      y: window.innerHeight * 0.5,
      isActive: false
    };

    let activeDragState = null;
    let animFrameId = null;
    let lastTime = performance.now();

    // 1. Mouse & Pointer Tracking on Hero Section
    function onPointerMove(e) {
      const rect = heroSection.getBoundingClientRect();
      if (e.clientY < rect.top - 120 || e.clientY > rect.bottom + 120) {
        pointer.isActive = false;
        return;
      }

      pointer.isActive = true;
      pointer.x = e.clientX;
      pointer.y = e.clientY;

      // If user is actively dragging an orb, follow cursor constrained strictly near profile image
      if (activeDragState) {
        const dx = e.clientX - activeDragState.pointerStartX;
        const dy = e.clientY - activeDragState.pointerStartY;
        let newX = activeDragState.startBaseX + dx;
        let newY = activeDragState.startBaseY + dy;

        // Restriction: Can ONLY move near the profile image (max 85px radius from resting spot)
        const maxRadius = 85;
        const distFromOrigin = Math.hypot(newX, newY);
        if (distFromOrigin > maxRadius) {
          newX = (newX / distFromOrigin) * maxRadius;
          newY = (newY / distFromOrigin) * maxRadius;
        }

        // Anti-Clipping Guard: Prevent pushing past the container boundaries
        newX = Math.max(-80, Math.min(30, newX));
        newY = Math.max(-75, Math.min(75, newY));

        activeDragState.targetX = newX;
        activeDragState.targetY = newY;
      }
    }

    heroSection.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    heroSection.addEventListener('pointerleave', () => {
      if (!activeDragState) {
        pointer.isActive = false;
      }
    });

    // 2. Drag & Drop: Click and move logo to any place NEAR profile image, then STAY and FLOAT
    orbStates.forEach((state) => {
      const orb = state.el;

      function onDragStart(clientX, clientY) {
        activeDragState = state;
        state.isDragging = true;
        state.pointerStartX = clientX;
        state.pointerStartY = clientY;
        state.startBaseX = state.baseX;
        state.startBaseY = state.baseY;
        orb.classList.add('is-dragging');
        orb.style.animation = 'none';
      }

      function onDragEnd() {
        if (state.isDragging) {
          // The logo STAYS in that new place and continues floating from there!
          state.baseX = state.targetX;
          state.baseY = state.targetY;
          state.isDragging = false;
          orb.classList.remove('is-dragging');
          if (activeDragState === state) activeDragState = null;
        }
      }

      orb.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        onDragStart(e.clientX, e.clientY);
      });

      orb.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          onDragStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: false });

      // Disable conflicting CSS keyframe transforms
      orb.style.animation = 'none';
    });

    function releaseGlobalDrag() {
      if (activeDragState) {
        activeDragState.baseX = activeDragState.targetX;
        activeDragState.baseY = activeDragState.targetY;
        activeDragState.el.classList.remove('is-dragging');
        activeDragState.isDragging = false;
        activeDragState = null;
      }
    }

    window.addEventListener('pointerup', releaseGlobalDrag);
    window.addEventListener('touchend', releaseGlobalDrag);
    window.addEventListener('pointercancel', releaseGlobalDrag);

    // 3. Physics Engine: Use pure GPU CSS keyframe animation on mobile; run JS physics on desktop only when visible
    if (isMobile) {
      // Return early: mobile uses 100% hardware-accelerated CSS animations with 0% main-thread CPU usage
      return;
    }

    function updatePhysics(now) {
      animFrameId = requestAnimationFrame(updatePhysics);

      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;
      const t = now * 0.0016;

      orbStates.forEach((state, i) => {
        const orb = state.el;

        if (state.isDragging) {
          state.targetScale = 1.15;
          state.targetRotZ = (state.targetX - state.currX) * 0.35;
        } else {
          // Natural organic sine wave floating in place
          const floatX = Math.sin(t + i * 1.4) * 4.5;
          const floatY = Math.cos(t * 0.85 + i * 1.3) * 5.5;

          // Proximity reaction when cursor is near (safe bounded micro-movement, max 8px)
          const rect = orb.getBoundingClientRect();
          const orbCenterX = rect.left + rect.width / 2;
          const orbCenterY = rect.top + rect.height / 2;
          const distMouseX = pointer.x - orbCenterX;
          const distMouseY = pointer.y - orbCenterY;
          const dist = Math.hypot(distMouseX, distMouseY);

          let hoverX = 0;
          let hoverY = 0;
          let tiltRotX = 0;
          let tiltRotY = 0;

          if (pointer.isActive && dist < 160 && dist > 0) {
            const pull = Math.max(0, 1 - dist / 160);
            hoverX = (distMouseX / dist) * pull * 7;
            hoverY = (distMouseY / dist) * pull * 7;
            tiltRotX = -distMouseY * 0.05 * pull;
            tiltRotY = distMouseX * 0.05 * pull;
            state.targetScale = 1.08;
          } else {
            state.targetScale = 1;
          }

          // Target is anchored at its user-placed spot (baseX, baseY) + floating wave + hover micro-drift
          state.targetX = state.baseX + floatX + hoverX;
          state.targetY = state.baseY + floatY + hoverY;
          state.targetRotX = tiltRotX;
          state.targetRotY = tiltRotY;
          state.targetRotZ = (state.targetX - state.currX) * 0.15;
        }

        // Smooth spring interpolation
        const ease = state.isDragging ? 0.4 : 0.12;
        state.currX += (state.targetX - state.currX) * ease;
        state.currY += (state.targetY - state.currY) * ease;
        state.currRotX += (state.targetRotX - state.currRotX) * ease;
        state.currRotY += (state.targetRotY - state.currRotY) * ease;
        state.currRotZ += (state.targetRotZ - state.currRotZ) * ease;
        state.scale += (state.targetScale - state.scale) * ease;

        // Apply clean 3D transform
        orb.style.transform = `translate3d(${state.currX.toFixed(1)}px, ${state.currY.toFixed(1)}px, 0px) rotateX(${state.currRotX.toFixed(1)}deg) rotateY(${state.currRotY.toFixed(1)}deg) rotateZ(${state.currRotZ.toFixed(1)}deg) scale(${state.scale.toFixed(2)})`;
      });
    }

    animFrameId = requestAnimationFrame(updatePhysics);
  }

  // --- Tools I Use For My Work: Interactive Marquee & Tooltips ---
  function initToolsMarquee() {
    const marqueeTrack = document.getElementById('tools-marquee-track');
    const toolItems = document.querySelectorAll('.tool-item');

    if (!marqueeTrack || !toolItems.length) return;

    // Explicitly manage animation play state on hover/focus/tap for bulletproof cross-browser pausing
    toolItems.forEach(item => {
      const activate = () => {
        marqueeTrack.style.animationPlayState = 'paused';
        toolItems.forEach(t => { if (t !== item) t.classList.remove('is-active'); });
        item.classList.add('is-active');
      };

      const deactivate = () => {
        marqueeTrack.style.animationPlayState = 'running';
        item.classList.remove('is-active');
      };

      item.addEventListener('mouseenter', activate);
      item.addEventListener('mouseleave', deactivate);
      item.addEventListener('focus', activate);
      item.addEventListener('blur', deactivate);

      // Support keyboard Enter / Space toggle
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (item.classList.contains('is-active')) {
            deactivate();
          } else {
            activate();
          }
        }
      });

      // Support mobile tap / direct click toggle
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.classList.contains('is-active')) {
          deactivate();
        } else {
          activate();
        }
      });
    });

    // Dismiss active tool when clicking elsewhere on the page
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tool-item')) {
        toolItems.forEach(t => t.classList.remove('is-active'));
        if (marqueeTrack) marqueeTrack.style.animationPlayState = 'running';
      }
    });
  }

  // ==========================================================================
  // Kinetic Typography Engine: Cursor & Touch Character Scatter Physics (Kova.me Style)
  // ==========================================================================
  function initKineticTypography() {
    // Selector covering hero name, brand name, section titles, card headers, and interactive titles
    const selector = [
      '#hero-name-target',
      '.hero-line-intro > span:first-child',
      '.brand-name',
      '.section-title',
      '.tools-card-title',
      '.about-lead',
      '.role-title',
      '.mini-card-title',
      '.cat-title',
      '.cert-card-title',
      '.edu-degree',
      '.contact-card-title',
      '.form-title',
      '.lets-build-title',
      '.footer-cta',
      '.cm-title'
    ].join(', ');

    const elements = document.querySelectorAll(selector);
    elements.forEach(el => setupKineticElement(el));

    function setupKineticElement(element) {
      if (!element || element.hasAttribute('data-scatter-ready')) return;
      if (element.closest('#hero-role-wrapper') || element.closest('#hero-role-typed')) return;

      const chars = [];
      const charStates = [];

      // Recursive DOM Text Node Splitter preserving all child elements, spans & classes
      function walkNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const rawText = node.textContent;
          if (!rawText || !rawText.replace(/\s/g, '')) return;

          // Strip leading and trailing newlines/tabs from code indentation
          const text = rawText.replace(/^\n\s*/, '').replace(/\n\s*$/, '');
          if (!text) return;

          const fragment = document.createDocumentFragment();
          const tokens = text.split(/(\s+)/);

          tokens.forEach(token => {
            if (!token) return;
            if (/^\s+$/.test(token)) {
              // Space placeholder preserving natural word separation
              const spaceSpan = document.createElement('span');
              spaceSpan.className = 'scatter-space';
              spaceSpan.textContent = '\u00A0';
              fragment.appendChild(spaceSpan);
            } else {
              // Word span prevents awkward mid-word breaks across lines
              const wordSpan = document.createElement('span');
              wordSpan.className = 'scatter-word';

              for (const ch of token) {
                const charSpan = document.createElement('span');
                charSpan.className = 'scatter-char';
                charSpan.textContent = ch;

                wordSpan.appendChild(charSpan);
                chars.push(charSpan);
                charStates.push({ dx: 0, dy: 0, rot: 0 });
              }
              fragment.appendChild(wordSpan);
            }
          });

          node.parentNode.replaceChild(fragment, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (
            node.classList.contains('scatter-word') ||
            node.classList.contains('scatter-char') ||
            node.classList.contains('no-scatter') ||
            node.id === 'hero-role-typed' ||
            node.id === 'hero-role-wrapper' ||
            node.id === 'inspector-name' ||
            node.tagName === 'SVG' ||
            node.tagName === 'IMG' ||
            node.tagName === 'SCRIPT'
          ) {
            return;
          }
          Array.from(node.childNodes).forEach(walkNodes);
        }
      }

      walkNodes(element);
      element.setAttribute('data-scatter-ready', 'true');
      element.classList.add('scatter-heading');

      if (chars.length === 0) return;

      // Adaptive physics properties calibrated with computed font size
      const computed = window.getComputedStyle(element);
      const fontSize = parseFloat(computed.fontSize) || 28;

      // Matches authentic kova.me physics parameters (ev=100, nv=60, jM=0.14, NM=0.07)
      const radius = Math.min(140, Math.max(55, fontSize * 1.85));
      const maxForce = Math.min(65, Math.max(18, fontSize * 0.8));
      const maxRot = Math.min(20, Math.max(9, fontSize * 0.3));

      const easeEnter = 0.15; // Snappy repulsion when pointer is active
      const easeLeave = 0.08; // Buttery soft deceleration returning to rest

      const pointerState = { x: 0, y: 0, active: false };
      let rafId = null;

      function renderFrame() {
        let isMoving = false;

        for (let i = 0; i < chars.length; i++) {
          const span = chars[i];
          const state = charStates[i];

          let targetX = 0;
          let targetY = 0;
          let targetRot = 0;

          if (pointerState.active) {
            const rect = span.getBoundingClientRect();
            const charCenterX = rect.left + rect.width / 2;
            const charCenterY = rect.top + rect.height / 2;
            const diffX = charCenterX - pointerState.x;
            const diffY = charCenterY - pointerState.y;
            const dist = Math.sqrt(diffX * diffX + diffY * diffY);

            if (dist < radius && dist > 0) {
              const intensity = 1 - (dist / radius);
              targetX = (diffX / dist) * intensity * maxForce;
              targetY = (diffY / dist) * intensity * maxForce;
              targetRot = -(diffX / dist) * intensity * maxRot;
            }
          }

          const ease = pointerState.active ? easeEnter : easeLeave;
          state.dx += (targetX - state.dx) * ease;
          state.dy += (targetY - state.dy) * ease;
          state.rot += (targetRot - state.rot) * ease;

          // Check if letter has settled back to origin
          const distFromTarget = Math.abs(targetX - state.dx) + Math.abs(targetY - state.dy) + Math.abs(targetRot - state.rot);
          if (distFromTarget > 0.04 || Math.abs(state.dx) > 0.05 || Math.abs(state.dy) > 0.05) {
            isMoving = true;
          }

          // Authentic kova.me dynamic velocity blur
          const velocity = Math.min(Math.sqrt(state.dx * state.dx + state.dy * state.dy) * 0.06, 2.5);

          span.style.transform = `translate(${state.dx.toFixed(1)}px, ${state.dy.toFixed(1)}px) rotate(${state.rot.toFixed(2)}deg)`;
          span.style.filter = velocity > 0.06 ? `blur(${velocity.toFixed(2)}px)` : '';
        }

        if (pointerState.active || isMoving) {
          rafId = requestAnimationFrame(renderFrame);
        } else {
          // Reset clean to rest and stop RAF loop (0% idle CPU overhead)
          for (let i = 0; i < chars.length; i++) {
            charStates[i].dx = 0;
            charStates[i].dy = 0;
            charStates[i].rot = 0;
            chars[i].style.transform = '';
            chars[i].style.filter = '';
          }
          rafId = null;
        }
      }

      function startLoop() {
        if (!rafId) {
          rafId = requestAnimationFrame(renderFrame);
        }
      }

      function handlePointerPos(clientX, clientY) {
        pointerState.x = clientX;
        pointerState.y = clientY;
        pointerState.active = true;
        startLoop();
      }

      function stopPointer() {
        pointerState.active = false;
        startLoop();
      }

      // 1. Unified Pointer Events (covers mouse, touch, and stylus)
      element.addEventListener('pointermove', (e) => {
        handlePointerPos(e.clientX, e.clientY);
      }, { passive: true });

      element.addEventListener('pointerenter', (e) => {
        handlePointerPos(e.clientX, e.clientY);
      }, { passive: true });

      element.addEventListener('pointerleave', stopPointer);
      element.addEventListener('pointercancel', stopPointer);
      element.addEventListener('pointerup', stopPointer);

      // 2. Mouse Events Fallback
      element.addEventListener('mousemove', (e) => {
        handlePointerPos(e.clientX, e.clientY);
      });
      element.addEventListener('mouseenter', (e) => {
        handlePointerPos(e.clientX, e.clientY);
      });
      element.addEventListener('mouseleave', stopPointer);

      // 3. Touch Events (Mobile Drag & Touch Support)
      element.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          handlePointerPos(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      element.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
          handlePointerPos(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: true });

      element.addEventListener('touchend', stopPointer, { passive: true });
      element.addEventListener('touchcancel', stopPointer, { passive: true });

      // 4. Tap / Click Spring Ripple Burst
      element.addEventListener('click', (e) => {
        const tapX = e.clientX || pointerState.x;
        const tapY = e.clientY || pointerState.y;

        for (let i = 0; i < chars.length; i++) {
          const rect = chars[i].getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = cx - tapX;
          const dy = cy - tapY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < radius * 1.5 && dist > 0) {
            charStates[i].dx += (dx / dist) * maxForce * 0.9;
            charStates[i].dy += (dy / dist) * maxForce * 0.9;
            charStates[i].rot += ((Math.random() - 0.5) * maxRot * 1.6);
          }
        }
        startLoop();
      });

      window.addEventListener('blur', () => {
        pointerState.active = false;
        startLoop();
      });
    }

    // Export setupKineticElement to window for dynamic modal title activation
    window.setupKineticElement = setupKineticElement;
  }

  // --- Kova.me Signature Scroll Reveal Controller (.fade-up and .reveal-text) ---
  function initScrollReveals() {
    // Automatically attach .fade-up to prominent section blocks (excluding #home elements so hero is always visible)
    const targetBlocks = document.querySelectorAll(
      'section:not(#home) .section-header, section:not(#home) .bento-card, .cert-card-inner, .contact-item, .tools-card-header, section:not(#home) .fade-up, section:not(#home) .reveal-text'
    );

    targetBlocks.forEach((el) => {
      if (!el.classList.contains('fade-up') && !el.classList.contains('reveal-text')) {
        el.classList.add('fade-up');
      }
    });

    // Ensure all hero elements are visible immediately
    document.querySelectorAll('#home .fade-up, #home .bento-card, #home .hero-mini-card').forEach((el) => {
      el.classList.add('is-inview');
    });

    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.fade-up, .reveal-text').forEach((el) => el.classList.add('is-inview'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '160px 0px 100px 0px',
      threshold: 0.02
    });

    document.querySelectorAll('.fade-up, .reveal-text').forEach((el) => {
      if (el.closest('#home')) {
        el.classList.add('is-inview');
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 120 && rect.bottom > 0) {
        el.classList.add('is-inview');
      } else {
        observer.observe(el);
      }
    });
  }

  // --- Interactive Chronological Education Timeline Controller ---
  function initEducationTimeline() {
    const section = document.getElementById('education');
    if (!section) return;

    // 1. Milestone Stepper Filter & Quick-Jump
    const tabs = section.querySelectorAll('.edu-step-tab');
    const items = Array.from(section.querySelectorAll('.edu-timeline-item'));

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        const target = tab.getAttribute('data-target');

        if (target === 'all') {
          items.forEach(item => {
            item.style.display = 'block';
            setTimeout(() => {
              item.style.opacity = '1';
              item.style.transform = 'translateY(0)';
            }, 20);
          });
          const wrapper = section.querySelector('.edu-timeline-wrapper');
          if (wrapper) {
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else {
          items.forEach(item => {
            const milestone = item.getAttribute('data-milestone');
            if (milestone === target) {
              item.style.display = 'block';
              setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
                item.classList.add('is-focused');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => item.classList.remove('is-focused'), 2000);
              }, 20);
            } else {
              item.style.opacity = '0.35';
            }
          });
        }
        setTimeout(updateSpineProgress, 350);
      });
    });

    // 2. Dynamic Scroll-Driven Timeline Spine Progress Line & Traveling Avatar
    const spine = section.querySelector('.edu-timeline-spine');
    const spineProgress = document.getElementById('edu-timeline-progress');
    const travelingAvatar = document.getElementById('edu-traveling-avatar');
    const wrapper = section.querySelector('.edu-timeline-wrapper');
    const markers = items.map(item => item.querySelector('.edu-node-marker'));
    const nodeWraps = items.map(item => item.querySelector('.edu-node-wrap'));

    let spineGeom = null;

    function updateSpineLayout() {
      if (!wrapper || !spine || !nodeWraps[0] || !nodeWraps[nodeWraps.length - 1]) return;
      const wRect = wrapper.getBoundingClientRect();
      const firstWrap = nodeWraps[0].getBoundingClientRect();
      const lastWrap = nodeWraps[nodeWraps.length - 1].getBoundingClientRect();
      const markerRadius = (markers[0] ? markers[0].offsetHeight / 2 : 24) || 24;

      const firstCenterY = (firstWrap.top + markerRadius) - wRect.top;
      const lastCenterY = (lastWrap.top + markerRadius) - wRect.top;
      const bottomInset = Math.max(wRect.height - lastCenterY, 0);

      spine.style.top = `${firstCenterY}px`;
      spine.style.bottom = `${bottomInset}px`;

      const nodeYs = nodeWraps.map(w => {
        const r = w.getBoundingClientRect();
        return (r.top + markerRadius) - (firstWrap.top + markerRadius);
      });

      spineGeom = { nodeYs, markerRadius };
    }

    function smoothStep(t) {
      const clamped = Math.max(0, Math.min(1, t));
      return clamped * clamped * (3 - 2 * clamped);
    }

    function updateSpineProgress() {
      if (!spineProgress || !wrapper || !travelingAvatar) return;
      if (!spineGeom) updateSpineLayout();
      if (!spineGeom || !spineGeom.nodeYs || spineGeom.nodeYs.length < 2) return;

      const nodeYs = spineGeom.nodeYs;
      const markerRadius = spineGeom.markerRadius || 24;
      const windowHeight = window.innerHeight;
      const focal = windowHeight * 0.45; // Optical center of viewport

      // Get current viewport vertical centers for each milestone marker (anchor to static wrap)
      const mCenters = nodeWraps.map(w => {
        const r = w.getBoundingClientRect();
        return r.top + markerRadius;
      });

      let targetY = nodeYs[0];

      if (focal <= mCenters[0]) {
        // Above or at first milestone -> Stop at Node 0
        targetY = nodeYs[0];
      } else if (focal >= mCenters[mCenters.length - 1]) {
        // At or past last milestone -> Stop at Node Last
        targetY = nodeYs[nodeYs.length - 1];
      } else {
        // Travel between milestones
        for (let i = 0; i < mCenters.length - 1; i++) {
          if (focal >= mCenters[i] && focal <= mCenters[i + 1]) {
            const span = mCenters[i + 1] - mCenters[i];
            const t = span > 0 ? (focal - mCenters[i]) / span : 0;
            targetY = nodeYs[i] + (nodeYs[i + 1] - nodeYs[i]) * smoothStep(t);
            break;
          }
        }
      }

      targetY = Math.max(nodeYs[0], Math.min(targetY, nodeYs[nodeYs.length - 1]));

      spineProgress.style.height = `${targetY}px`;
      travelingAvatar.style.top = `${targetY}px`;
      travelingAvatar.classList.add('is-active');

      // Manage active milestones: activate golden aura when reached, remove when scrolling backward
      markers.forEach((marker, idx) => {
        const isReached = (idx === 0)
          ? (focal >= mCenters[0] - 60)
          : (targetY >= nodeYs[idx] - 8);

        if (isReached) {
          items[idx].classList.add('is-active-milestone');
          if (marker) marker.classList.add('is-active-milestone');
        } else {
          items[idx].classList.remove('is-active-milestone');
          if (marker) marker.classList.remove('is-active-milestone');
        }
      });
    }

        // Only calculate milestone progress when education section is intersecting the viewport
    let isEduVisible = false;
    let spineTick = false;
    if ('IntersectionObserver' in window) {
      const eduObs = new IntersectionObserver((entries) => {
        isEduVisible = entries[0].isIntersecting;
        if (isEduVisible) updateSpineProgress();
      }, { rootMargin: '100px 0px' });
      eduObs.observe(section);
    } else {
      isEduVisible = true;
    }

    window.addEventListener('scroll', () => {
      if (!isEduVisible || spineTick) return;
      spineTick = true;
      requestAnimationFrame(() => {
        updateSpineProgress();
        spineTick = false;
      });
    }, { passive: true });
    window.addEventListener('resize', () => {
      updateSpineLayout();
      updateSpineProgress();
    }, { passive: true });
    window.addEventListener('load', () => {
      updateSpineLayout();
      updateSpineProgress();
    });

    updateSpineLayout();
    updateSpineProgress();
    setTimeout(() => {
      updateSpineLayout();
      updateSpineProgress();
    }, 400);

    // 3. Interactive Mouse Spotlight Glow on Cards
    const cards = section.querySelectorAll('.edu-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  // 4. Global Accordion Toggle for Education Takeaways
  window.toggleEduDetails = function (milestoneId) {
    const expandSection = document.getElementById(`edu-expand-${milestoneId}`);
    if (!expandSection) return;
    const isOpen = expandSection.classList.contains('open');
    const btn = expandSection.querySelector('.edu-toggle-btn');

    if (isOpen) {
      expandSection.classList.remove('open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    } else {
      expandSection.classList.add('open');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }
  };

  // --- Initialize ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startPreloading();
      initSplineCleaner();
      initAllCarousels();
      initHeroAnimations();
      initFloatingTools();
      initToolsMarquee();
      initKineticTypography();
      initScrollReveals();
      initKovaContact();
      initEducationTimeline();
    });
  } else {
    startPreloading();
    initSplineCleaner();
    initAllCarousels();
    initHeroAnimations();
    initFloatingTools();
    initToolsMarquee();
    initKineticTypography();
    initScrollReveals();
    initKovaContact();
    initEducationTimeline();
  }

})();

