/**
 * Tejas C. Waghmare - Portfolio Engine
 * High Performance Scroll-Driven Visual Sequence + UI Controller
 */

(function () {
  'use strict';

  // --- Device & Viewport Detection ---
  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

  // --- Configuration ---
  const CONFIG = {
    totalFrames: 240,
    framePath: (index) => `Asset/frames/frame_${String(index).padStart(4, '0')}.png`,
    lerpFactor: 0.20, // Quick, agile and silky smooth deceleration
    concurrency: isMobile ? 3 : 6, // Low-overhead parallel pool to prevent network throttling
    frameStride: isMobile ? 6 : 2, // Sample frames: on mobile ~40 frames, on desktop 120 keyframes
    minLoadToUnlock: 0.005 // Instant unlock as soon as first frame is ready!
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
  let isPageInteractive = false;
  let animationFrameId = null;

  // --- Canvas Dimensions & DPI Scaling ---
  let canvasWidth = 0;
  let canvasHeight = 0;
  let dpr = 1;

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    renderedFrame = -1;
    drawFrame(Math.round(currentFrame));
  }

  // --- Aspect Ratio Cover Draw Algorithm ---
  function drawFrame(frameIndex) {
    const img = getClosestLoadedImage(frameIndex);
    if (!img) return;

    const imgWidth = img.naturalWidth || 1280;
    const imgHeight = img.naturalHeight || 720;

    const scale = Math.max(canvas.width / imgWidth, canvas.height / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const offsetX = (canvas.width - drawWidth) / 2;
    const offsetY = (canvas.height - drawHeight) / 2;

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    renderedFrame = frameIndex;

  }

  // --- Zero-Flicker Fallback to Closest Loaded Frame ---
  function getClosestLoadedImage(requestedIndex) {
    const target = Math.max(1, Math.min(CONFIG.totalFrames, Math.round(requestedIndex)));

    if (images[target] && images[target].complete && images[target].naturalWidth > 0) {
      return images[target];
    }

    for (let offset = 1; offset < CONFIG.totalFrames; offset++) {
      const prev = target - offset;
      if (prev >= 1 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
        return images[prev];
      }
      const next = target + offset;
      if (next <= CONFIG.totalFrames && images[next] && images[next].complete && images[next].naturalWidth > 0) {
        return images[next];
      }
    }

    return null;
  }

  // --- Scroll Tracking & Active Navigation Link ---
  function updateScrollProgress() {
    const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
    const scrollY = Math.max(0, window.scrollY);
    const progress = scrollMax > 0 ? Math.min(1, Math.max(0, scrollY / scrollMax)) : 0;

    targetFrame = 1 + progress * (CONFIG.totalFrames - 1);

    // Header subtle elevation on scroll
    if (siteHeader) {
      if (scrollY > 50) {
        siteHeader.style.transform = 'translateY(0)';
      }
    }

    // Highlight current active nav item based on viewport section
    highlightActiveSection();
  }

  function highlightActiveSection() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 200;

    sections.forEach((sec) => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navItems.forEach((link) => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }

  // --- Smooth Inertial Lerp Render Loop ---
  function renderLoop() {
    const delta = targetFrame - currentFrame;

    if (Math.abs(delta) > 0.001) {
      currentFrame += delta * CONFIG.lerpFactor;
    } else {
      currentFrame = targetFrame;
    }

    const nextFrameIndex = Math.round(currentFrame);
    if (nextFrameIndex !== renderedFrame) {
      drawFrame(nextFrameIndex);
    }

    animationFrameId = requestAnimationFrame(renderLoop);
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

    // Safety fallback: Never let the user wait longer than 850ms, even on slow network
    const unlockTimeout = setTimeout(() => {
      unlockInterface();
    }, 850);

    // 1. Immediately load Frame 1
    const firstImg = new Image();
    firstImg.src = CONFIG.framePath(1);
    firstImg.onload = () => {
      images[1] = firstImg;
      loadedCount++;
      drawFrame(1);
      
      // Snappy, gratifying progress animation from 0% -> 100%
      animateLoaderToFull(() => {
        clearTimeout(unlockTimeout);
        unlockInterface();
      });

      // Queue remaining background frames lazily
      queueRemainingFrames();
    };
    firstImg.onerror = () => {
      console.warn('Initial frame load fallback.');
      clearTimeout(unlockTimeout);
      unlockInterface();
      queueRemainingFrames();
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

  function queueRemainingFrames() {
    const queue = [];
    const stride = CONFIG.frameStride || 1;
    
    // Priority 1: Keyframes spaced by stride
    for (let i = 1 + stride; i <= CONFIG.totalFrames; i += stride) {
      queue.push(i);
    }
    if (queue[queue.length - 1] !== CONFIG.totalFrames) {
      queue.push(CONFIG.totalFrames);
    }

    // Priority 2: On non-mobile screens, queue the remaining intermediate frames for ultra-high fidelity
    if (!isMobile) {
      for (let i = 2; i <= CONFIG.totalFrames; i++) {
        if (!queue.includes(i)) {
          queue.push(i);
        }
      }
    }

    let activeWorkers = 0;

    function work() {
      if (queue.length === 0 && activeWorkers === 0) return;

      while (activeWorkers < CONFIG.concurrency && queue.length > 0) {
        const frameIdx = queue.shift();
        activeWorkers++;

        const img = new Image();
        img.src = CONFIG.framePath(frameIdx);

        const onFinish = () => {
          images[frameIdx] = img;
          loadedCount++;
          activeWorkers--;
          work();
        };

        img.onload = onFinish;
        img.onerror = onFinish;
      }
    }

    // Defer background frame loading to idle time so main UI thread stays 100% responsive
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => work(), { timeout: 800 });
    } else {
      setTimeout(work, 150);
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

    setTimeout(() => {
      if (loader) {
        loader.classList.add('hidden');
      }

      // Reveal elements currently in viewport
      document.querySelectorAll('.fade-up, .reveal-text').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 150 && rect.bottom > 0) {
          el.classList.add('is-inview');
        }
      });

      // Asynchronously load the Spline viewer web component now that critical UI is interactive
      loadSplineViewerScript();
    }, 200);
  }

  function loadSplineViewerScript() {
    if (window.customElements && window.customElements.get('spline-viewer')) return;
    if (document.querySelector('script[src*="spline-viewer"]')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer/build/spline-viewer.js';
    document.body.appendChild(script);
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
    navLinks.querySelectorAll('.nav-item, .nav-mobile-cta').forEach((link) => {
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

  // --- Global Lightbox Modal Controller ---
  window.openLightbox = function (mediaSrc, mediaType, title) {
    if (!lightboxModal || !lightboxBody) return;

    if (lightboxTitle) {
      lightboxTitle.textContent = title || 'Preview';
    }

    lightboxBody.innerHTML = '';

    if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = mediaSrc;
      video.controls = true;
      video.autoplay = true;
      video.style.width = '100%';
      video.style.maxHeight = '75vh';
      lightboxBody.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = mediaSrc;
      img.alt = title || 'Preview Image';
      lightboxBody.appendChild(img);
    }

    lightboxModal.classList.add('active');
    lightboxModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  window.closeLightbox = function () {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('active');
    lightboxModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

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

  // Close lightbox on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxModal && lightboxModal.classList.contains('active')) {
      window.closeLightbox();
    }
  });

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

    // 3. Live Pune Clock (IST: UTC+5:30)
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
  window.openContactModal = function(e) {
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

    // Auto-focus first input field for smooth accessibility
    setTimeout(() => {
      const firstInput = modal.querySelector('#talk-name');
      if (firstInput) firstInput.focus();
    }, 150);
  };

  window.closeContactModal = function() {
    const modal = document.getElementById('kova-contact-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('kova-contact-modal');
      if (modal && modal.classList.contains('active')) {
        window.closeContactModal();
      }
    }
  });

  // 6. One-Click Copy Contact Email
  window.copyContactEmail = function(btn) {
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

  // 7. Contact Form Handler (Supports tags, urgency, clean feedback, and mailto)
  window.handleContactSubmit = function (e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name ? form.name.value.trim() : '';
    const email = form.email ? form.email.value.trim() : '';
    const topic = form.subject ? form.subject.value.trim() : 'Project Inquiry';
    const urgencyVal = document.getElementById('talk-urgency-val');
    const urgency = urgencyVal ? urgencyVal.textContent : 'Normal';
    const message = form.message ? form.message.value.trim() : '';
    const feedback = document.getElementById('talk-form-feedback') || document.getElementById('form-feedback');

    if (feedback) {
      feedback.className = 'form-feedback success';
      feedback.innerHTML = `<strong>Nice one, ${name}!</strong> Your inquiry regarding <em>${topic}</em> (${urgency}) is prepared. Opening your email client to connect with <strong>tejaswaghmare900@gmail.com</strong>...`;
      feedback.style.display = 'block';
    }

    const emailSubject = `[Inquiry: ${topic}] from ${name} (${urgency})`;
    const emailBody = `Hi Tejas,\n\nName: ${name}\nEmail: ${email}\nTopics: ${topic}\nTimeline / Urgency: ${urgency}\n\nMessage:\n${message}\n\n--\nSent via Portfolio Contact Form (kova.me style)`;
    const mailtoUrl = `mailto:tejaswaghmare900@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    setTimeout(() => {
      window.location.href = mailtoUrl;
    }, 1200);
  };


  // --- Event Listeners ---
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
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
            try { viewer._logo.remove(); } catch (err) {}
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
            try { el.remove(); } catch (err) {}
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
        } catch (err) {}
        return true;
      }
      return false;
    };

    if (!attachObserver()) {
      const waitInterval = setInterval(() => {
        if (attachObserver()) {
          clearInterval(waitInterval);
        }
      }, 50);
      setTimeout(() => clearInterval(waitInterval), 10000);
    }

    const poller = setInterval(setupSpline, 150);
    setTimeout(() => clearInterval(poller), 12000);
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
      clone.classList.add('cert-slide-clone');
      track.appendChild(clone);
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

    // 3. 60FPS Physics Engine: Organic floating at placed spot + gentle hover reaction without clipping
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

    window.addEventListener('scroll', updateSpineProgress, { passive: true });
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
  window.toggleEduDetails = function(milestoneId) {
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

