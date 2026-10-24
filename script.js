/**
 * Tejas C. Waghmare - Portfolio Engine
 * High Performance Scroll-Driven Visual Sequence + UI Controller
 */

(function () {
  'use strict';

  // --- Configuration ---
  const CONFIG = {
    totalFrames: 240,
    framePath: (index) => `Asset/frames/frame_${String(index).padStart(4, '0')}.png`,
    lerpFactor: 0.20, // Quick, agile and silky smooth deceleration
    concurrency: 12,  // Parallel preloading worker pool
    minLoadToUnlock: 0.95
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

    // 1. Immediately load Frame 1
    const firstImg = new Image();
    firstImg.src = CONFIG.framePath(1);
    firstImg.onload = () => {
      images[1] = firstImg;
      loadedCount++;
      drawFrame(1);
      updateLoaderUI(loadedCount, CONFIG.totalFrames);
      queueRemainingFrames();
    };
    firstImg.onerror = () => {
      console.warn('Initial frame load failed, starting queue.');
      queueRemainingFrames();
    };
  }

  function queueRemainingFrames() {
    const queue = [];
    for (let i = 2; i <= CONFIG.totalFrames; i++) {
      queue.push(i);
    }

    let activeWorkers = 0;

    function work() {
      if (!isPageInteractive && (loadedCount / CONFIG.totalFrames >= CONFIG.minLoadToUnlock)) {
        unlockInterface();
      }

      if (queue.length === 0 && activeWorkers === 0) {
        if (!isPageInteractive) unlockInterface();
        return;
      }

      while (activeWorkers < CONFIG.concurrency && queue.length > 0) {
        const frameIdx = queue.shift();
        activeWorkers++;

        const img = new Image();
        img.src = CONFIG.framePath(frameIdx);

        const onFinish = () => {
          images[frameIdx] = img;
          loadedCount++;
          activeWorkers--;
          updateLoaderUI(loadedCount, CONFIG.totalFrames);
          work();
        };

        img.onload = onFinish;
        img.onerror = () => {
          onFinish();
        };
      }
    }

    work();
  }

  function unlockInterface() {
    if (isPageInteractive) return;
    isPageInteractive = true;

    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(renderLoop);
    }

    setTimeout(() => {
      loader.classList.add('hidden');
      document.querySelectorAll('.fade-up, .reveal-text').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('is-inview');
        }
      });
    }, 250);
  }

  // --- Mobile Navigation Toggle ---
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });

    // Close menu when clicking any nav item
    navItems.forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
      });
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
  // Kinetic Typography Engine: Cursor Character Scatter Physics (Kova.me Style)
  // ==========================================================================
  function initKineticTypography() {
    // Only enable interactive cursor physics on fine-pointer devices (saves mobile CPU)
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover) return;

    // Selector covering hero name, brand name, section titles, card headers, and kova.me interactive titles
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
      const radius = Math.min(130, Math.max(50, fontSize * 1.75));
      const maxForce = Math.min(60, Math.max(16, fontSize * 0.75));
      const maxRot = Math.min(18, Math.max(8, fontSize * 0.28));

      const easeEnter = 0.14; // Snappy repulsion when mouse is active
      const easeLeave = 0.07; // Buttery soft deceleration returning to rest

      const mouseState = { x: 0, y: 0, active: false };
      let rafId = null;

      function renderFrame() {
        let isMoving = false;

        for (let i = 0; i < chars.length; i++) {
          const span = chars[i];
          const state = charStates[i];

          let targetX = 0;
          let targetY = 0;
          let targetRot = 0;

          if (mouseState.active) {
            const rect = span.getBoundingClientRect();
            const charCenterX = rect.left + rect.width / 2;
            const charCenterY = rect.top + rect.height / 2;
            const diffX = charCenterX - mouseState.x;
            const diffY = charCenterY - mouseState.y;
            const dist = Math.sqrt(diffX * diffX + diffY * diffY);

            if (dist < radius && dist > 0) {
              const intensity = 1 - (dist / radius);
              targetX = (diffX / dist) * intensity * maxForce;
              targetY = (diffY / dist) * intensity * maxForce;
              targetRot = -(diffX / dist) * intensity * maxRot;
            }
          }

          const ease = mouseState.active ? easeEnter : easeLeave;
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

        if (mouseState.active || isMoving) {
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

      element.addEventListener('mousemove', (e) => {
        mouseState.x = e.clientX;
        mouseState.y = e.clientY;
        mouseState.active = true;
        startLoop();
      });

      element.addEventListener('mouseenter', (e) => {
        mouseState.x = e.clientX;
        mouseState.y = e.clientY;
        mouseState.active = true;
        startLoop();
      });

      element.addEventListener('mouseleave', () => {
        mouseState.active = false;
        startLoop();
      });

      window.addEventListener('blur', () => {
        mouseState.active = false;
        startLoop();
      });
    }
    // Export setupKineticElement to window for dynamic modal title activation
    window.setupKineticElement = setupKineticElement;
  }

  // --- Kova.me Signature Scroll Reveal Controller (.fade-up and .reveal-text) ---
  function initScrollReveals() {
    // Automatically attach .fade-up to prominent section blocks
    const targetBlocks = document.querySelectorAll(
      '.section-header, .bento-card, .cert-card-inner, .contact-item, .hero-mini-card, .tools-card-header, .fade-up, .reveal-text'
    );

    targetBlocks.forEach((el) => {
      if (!el.classList.contains('fade-up') && !el.classList.contains('reveal-text')) {
        el.classList.add('fade-up');
      }
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
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.05
    });

    document.querySelectorAll('.fade-up, .reveal-text').forEach((el) => {
      // Elements already above or within the viewport get revealed immediately
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
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
    const items = section.querySelectorAll('.edu-timeline-item');

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
      });
    });

    // 2. Dynamic Scroll-Driven Timeline Spine Progress Line
    const spineProgress = document.getElementById('edu-timeline-progress');
    const wrapper = section.querySelector('.edu-timeline-wrapper');

    function updateSpineProgress() {
      if (!spineProgress || !wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate progress between wrapper entering and leaving viewport center
      const start = windowHeight * 0.75;
      const totalHeight = rect.height;
      const currentScroll = start - rect.top;
      const progress = Math.min(Math.max(currentScroll / totalHeight, 0), 1);

      spineProgress.style.height = `${(progress * 100).toFixed(1)}%`;

      // Illuminate nodes as progress passes them
      items.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        if (itemRect.top < windowHeight * 0.7) {
          item.classList.add('is-active-milestone');
        } else {
          item.classList.remove('is-active-milestone');
        }
      });
    }

    window.addEventListener('scroll', updateSpineProgress, { passive: true });
    updateSpineProgress();

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
    initToolsMarquee();
    initKineticTypography();
    initScrollReveals();
    initKovaContact();
    initEducationTimeline();
  }

})();

