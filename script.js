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
    lerpFactor: 0.08, // Buttery smooth deceleration
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
  const hudFrameNum = document.getElementById('hud-frame-num');
  const hudPercentVal = document.getElementById('hud-percent-val');
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

    updateHUD(frameIndex);
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

  // --- HUD Telemetry Update ---
  function updateHUD(frameIndex) {
    if (hudFrameNum) {
      hudFrameNum.textContent = String(frameIndex).padStart(3, '0');
    }
    if (hudPercentVal) {
      const percent = ((frameIndex - 1) / (CONFIG.totalFrames - 1)) * 100;
      hudPercentVal.textContent = percent.toFixed(1) + '%';
    }
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

  // --- Interactive Contact Form Handler ---
  window.handleContactSubmit = function (e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();
    const feedback = document.getElementById('form-feedback');

    if (!feedback) return;

    // Simulate sending inquiry with visual success state
    feedback.className = 'form-feedback success';
    feedback.textContent = `Thank you, ${name}! Your message has been prepared. Opening your email client to send to tejaswaghmare900@gmail.com...`;
    feedback.style.display = 'block';

    const mailtoUrl = `mailto:tejaswaghmare900@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Hi Tejas,\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
    
    setTimeout(() => {
      window.location.href = mailtoUrl;
    }, 1000);
  };

  // --- Event Listeners ---
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', resizeCanvas);

  // --- Initialize ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPreloading);
  } else {
    startPreloading();
  }

})();
