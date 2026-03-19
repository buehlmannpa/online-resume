(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const progressBar = document.getElementById("scroll-progress");
  const backToTopButton = document.getElementById("back-to-top");
  const copyEmailButton = document.getElementById("copy-email-btn");
  const copyToast = document.getElementById("copy-toast");
  const roleRotator = document.getElementById("role-rotator");
  const profileImage = document.getElementById("profile-image");
  const profileImageMobile = document.getElementById("profile-image-mobile");
  const imageLightbox = document.getElementById("image-lightbox");
  const imageLightboxPreview = document.getElementById("image-lightbox-preview");
  const imageLightboxClose = document.getElementById("image-lightbox-close");
  const themeDots = document.querySelectorAll(".theme-dot");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const themeStorageKey = "resume-theme";
  const imageAnimationMs = 260;
  let imageTransitionInProgress = false;
  let activeProfileImage = null;

  const configuredRoles = window.resumeContent &&
    window.resumeContent.about &&
    Array.isArray(window.resumeContent.about.focusAreas)
    ? window.resumeContent.about.focusAreas
    : null;
  const roles = configuredRoles && configuredRoles.length
    ? configuredRoles
    : [
        "Platform Engineering",
        "Cloud Automation",
        "DevOps Excellence",
        "Kubernetes Delivery"
      ];

  function applyTheme(themeName) {
    body.classList.remove("theme-sage", "theme-beige");

    if (themeName === "sage") {
      body.classList.add("theme-sage");
    } else if (themeName === "beige") {
      body.classList.add("theme-beige");
    } else {
      themeName = "blue";
    }

    themeDots.forEach((dot) => {
      const isActive = dot.dataset.theme === themeName;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    window.localStorage.setItem(themeStorageKey, themeName);
  }

  function initTheme() {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    const themeName = storedTheme === "sage" || storedTheme === "beige" ? storedTheme : "blue";
    applyTheme(themeName);
  }

  function updateScrollUI() {
    const scrollTop = root.scrollTop || body.scrollTop;
    const scrollHeight = root.scrollHeight - root.clientHeight;
    const percent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }

    if (backToTopButton) {
      if (percent > 12) {
        backToTopButton.classList.add("is-visible");
      } else {
        backToTopButton.classList.remove("is-visible");
      }
    }
  }

  function revealSections() {
    const sections = document.querySelectorAll(".resume-section");

    if (!("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    sections.forEach((section) => observer.observe(section));
  }

  function startRoleRotation() {
    if (!roleRotator) {
      return;
    }

    let roleIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const tick = () => {
      const role = roles[roleIndex];

      if (deleting) {
        charIndex -= 1;
      } else {
        charIndex += 1;
      }

      roleRotator.textContent = role.slice(0, charIndex);

      let delay = deleting ? 45 : 85;

      if (!deleting && charIndex === role.length) {
        delay = 1400;
        deleting = true;
      } else if (deleting && charIndex === 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        delay = 320;
      }

      window.setTimeout(tick, delay);
    };

    tick();
  }

  function showToast() {
    if (!copyToast) {
      return;
    }
    copyToast.classList.add("is-visible");
    window.setTimeout(() => copyToast.classList.remove("is-visible"), 1800);
  }

  async function copyEmailToClipboard() {
    const emailAnchor = document.querySelector('#about-content a[href^="mailto:"]');
    const email = emailAnchor ? emailAnchor.getAttribute("href").replace("mailto:", "") : "";
    if (!email) {
      return;
    }
    try {
      await navigator.clipboard.writeText(email);
      showToast();
    } catch (_error) {
      // Fallback for older browsers without async clipboard support.
      const tempInput = document.createElement("input");
      tempInput.value = email;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
      showToast();
    }
  }

  function getExpandedImageRect(sourceRect) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const sourceRatio = sourceRect.width / sourceRect.height || 1;
    const maxWidth = Math.min(viewportWidth * 0.8, 560);
    const maxHeight = viewportHeight * 0.84;

    let targetWidth = maxWidth;
    let targetHeight = targetWidth / sourceRatio;

    if (targetHeight > maxHeight) {
      targetHeight = maxHeight;
      targetWidth = targetHeight * sourceRatio;
    }

    return {
      width: targetWidth,
      height: targetHeight,
      left: (viewportWidth - targetWidth) / 2,
      top: (viewportHeight - targetHeight) / 2
    };
  }

  function setCloneGeometry(clone, rect, borderRadius) {
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.borderRadius = borderRadius;
  }

  function createImageClone(sourceImage, rect, borderRadius) {
    const clone = document.createElement("img");
    clone.className = "image-lightbox-clone";
    clone.src = sourceImage.src;
    clone.alt = "";
    setCloneGeometry(clone, rect, borderRadius);
    document.body.appendChild(clone);
    return clone;
  }

  function setProfileImageHidden(imageEl, isHidden) {
    if (!imageEl) {
      return;
    }
    imageEl.classList.toggle("is-hidden", isHidden);
  }

  function openImageLightbox(sourceImage) {
    if (!sourceImage || !imageLightbox || !imageLightboxPreview || imageTransitionInProgress) {
      return;
    }
    if (imageLightbox.classList.contains("is-open")) {
      return;
    }

    imageTransitionInProgress = true;
    activeProfileImage = sourceImage;
    const startRect = sourceImage.getBoundingClientRect();
    const endRect = getExpandedImageRect(startRect);

    imageLightboxPreview.classList.remove("is-visible");
    if (imageLightboxClose) {
      imageLightboxClose.classList.remove("is-visible");
    }
    imageLightboxPreview.src = sourceImage.src;
    imageLightboxPreview.alt = sourceImage.alt;
    imageLightbox.classList.add("is-open");
    imageLightbox.setAttribute("aria-hidden", "false");
    body.style.overflow = "hidden";

    if (prefersReducedMotion) {
      setProfileImageHidden(activeProfileImage, true);
      imageLightboxPreview.classList.add("is-visible");
      if (imageLightboxClose) {
        imageLightboxClose.classList.add("is-visible");
      }
      imageTransitionInProgress = false;
      return;
    }

    const clone = createImageClone(sourceImage, startRect, "999px");
    setProfileImageHidden(activeProfileImage, true);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        clone.style.transition = `all ${imageAnimationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        setCloneGeometry(clone, endRect, "50%");
        window.setTimeout(() => {
          imageLightboxPreview.classList.add("is-visible");
          if (imageLightboxClose) {
            imageLightboxClose.classList.add("is-visible");
          }
          window.requestAnimationFrame(() => {
            clone.remove();
            imageTransitionInProgress = false;
          });
        }, imageAnimationMs);
      });
    });
  }

  function closeImageLightbox() {
    if (!imageLightbox || !imageLightboxPreview || imageTransitionInProgress) {
      return;
    }
    if (!imageLightbox.classList.contains("is-open")) {
      return;
    }

    const fallbackImage = profileImage || profileImageMobile;
    const targetImage = activeProfileImage || fallbackImage;
    if (!targetImage) {
      return;
    }

    const endRect = targetImage.getBoundingClientRect();

    if (prefersReducedMotion) {
      imageLightbox.classList.remove("is-open");
      imageLightbox.setAttribute("aria-hidden", "true");
      imageLightboxPreview.classList.remove("is-visible");
      imageLightboxPreview.src = "";
      imageLightboxPreview.alt = "";
      if (imageLightboxClose) {
        imageLightboxClose.classList.remove("is-visible");
      }
      body.style.overflow = "";
      setProfileImageHidden(targetImage, false);
      activeProfileImage = null;
      return;
    }

    const startRect = imageLightboxPreview.getBoundingClientRect();
    imageTransitionInProgress = true;
    imageLightboxPreview.classList.remove("is-visible");
    if (imageLightboxClose) {
      imageLightboxClose.classList.remove("is-visible");
    }

    const clone = createImageClone(targetImage, startRect, "50%");
    window.requestAnimationFrame(() => {
      clone.style.transition = `all ${imageAnimationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      setCloneGeometry(clone, endRect, "999px");
      window.setTimeout(() => {
        clone.remove();
        imageLightbox.classList.remove("is-open");
        imageLightbox.setAttribute("aria-hidden", "true");
        imageLightboxPreview.src = "";
        imageLightboxPreview.alt = "";
        body.style.overflow = "";
        setProfileImageHidden(targetImage, false);
        activeProfileImage = null;
        imageTransitionInProgress = false;
      }, imageAnimationMs + 30);
    });
  }

  function wireEvents() {
    if (copyEmailButton) {
      copyEmailButton.addEventListener("click", copyEmailToClipboard);
    }

    if (backToTopButton) {
      backToTopButton.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    if (profileImage) {
      profileImage.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openImageLightbox(profileImage);
      });
      profileImage.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          openImageLightbox(profileImage);
        }
      });
    }

    if (profileImageMobile) {
      profileImageMobile.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openImageLightbox(profileImageMobile);
      });
      profileImageMobile.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          openImageLightbox(profileImageMobile);
        }
      });
    }

    if (imageLightboxClose) {
      imageLightboxClose.addEventListener("click", closeImageLightbox);
    }

    if (imageLightbox) {
      imageLightbox.addEventListener("click", (event) => {
        if (event.target === imageLightbox) {
          closeImageLightbox();
        }
      });
    }

    themeDots.forEach((dot) => {
      dot.addEventListener("click", () => {
        applyTheme(dot.dataset.theme || "blue");
      });
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && imageLightbox && imageLightbox.classList.contains("is-open")) {
        closeImageLightbox();
      }
    });

    window.addEventListener("scroll", updateScrollUI, { passive: true });
    window.addEventListener("resize", updateScrollUI);
  }

  function init() {
    initTheme();
    wireEvents();
    revealSections();
    startRoleRotation();
    updateScrollUI();
  }

  init();
})();
