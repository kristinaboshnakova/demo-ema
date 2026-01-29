// =====================
// LOADER (your original)
// =====================

const loader = document.getElementById("loader");
const app = document.getElementById("app"); // (ако нямаш #app в HTML, това е OK, ползваме optional chaining)
const barFill = document.getElementById("barFill");

const config = {
  minDurationMs: 2200,
  maxDurationMs: 3400,
  tickMs: 120,
};

let progress = 0;

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const totalDuration = rand(config.minDurationMs, config.maxDurationMs);
const steps = Math.ceil(totalDuration / config.tickMs);

function stepAmount(p) {
  if (p < 35) return rand(6, 11);
  if (p < 70) return rand(3, 7);
  if (p < 90) return rand(1, 3);
  return 0;
}

let currentStep = 0;

const interval = setInterval(() => {
  currentStep++;
  const cap = 92;

  progress = Math.min(cap, progress + stepAmount(progress));
  if (barFill) barFill.style.width = progress + "%";

  if (currentStep >= steps) {
    clearInterval(interval);

    if (barFill) barFill.style.width = "100%";

    setTimeout(() => {
      loader?.classList.add("loader--done");
      app?.classList.remove("app--hidden");
      document.body.classList.add("is-ready"); // ✅ за твоите entrance анимации
    }, 420);
  }
}, config.tickMs);




// =====================
// TOPBAR: milky bg on scroll
// =====================
const topbar = document.querySelector(".topbar");
const SCROLL_TRIGGER = 24;

function updateNavOnScroll() {
  if (!topbar) return;
  topbar.classList.toggle("is-scrolled", window.scrollY > SCROLL_TRIGGER);
}
window.addEventListener("scroll", updateNavOnScroll, { passive: true });
updateNavOnScroll();

// =====================
// MOBILE MENU + letters + swipe
// =====================
const burger = document.getElementById("burger");
const mobileMenu = document.getElementById("mobileMenu");
const mobileClose = document.getElementById("mobileMenuClose");

function openMenu() {
  if (!mobileMenu || !burger) return;
  mobileMenu.classList.add("is-open");
  burger.classList.add("is-open");
  mobileMenu.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  animateMobileLinksIn();
}

function closeMenu() {
  if (!mobileMenu || !burger) return;
  mobileMenu.classList.remove("is-open");
  burger.classList.remove("is-open");
  mobileMenu.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function toggleMenu() {
  if (!mobileMenu) return;
  const isOpen = mobileMenu.classList.contains("is-open");
  isOpen ? closeMenu() : openMenu();
}

if (burger && mobileMenu) burger.addEventListener("click", toggleMenu);
if (mobileClose) mobileClose.addEventListener("click", closeMenu);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mobileMenu?.classList.contains("is-open")) closeMenu();
});

mobileMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => closeMenu());
});

let lettersWrapped = false;

function wrapLinkLetters() {
  if (lettersWrapped || !mobileMenu) return;

  const links = mobileMenu.querySelectorAll(".mobileMenu__nav a");
  links.forEach((a) => {
    const text = a.textContent.trim();
    a.setAttribute("aria-label", text);

    const wrapper = document.createElement("span");
    wrapper.className = "letters";
    wrapper.setAttribute("aria-hidden", "true");

    [...text].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "letter";
      s.textContent = ch === " " ? "\u00A0" : ch;
      wrapper.appendChild(s);
    });

    a.textContent = "";
    a.appendChild(wrapper);
  });

  lettersWrapped = true;
}

function animateMobileLinksIn() {
  wrapLinkLetters();
  const letters = mobileMenu?.querySelectorAll(".letter") || [];
  letters.forEach((el) => el.classList.remove("in"));
  letters.forEach((el, i) => {
    el.style.transitionDelay = `${i * 12}ms`;
    requestAnimationFrame(() => el.classList.add("in"));
  });
}

let touchStartY = 0;
let touchStartX = 0;
let isSwiping = false;

mobileMenu?.addEventListener(
  "touchstart",
  (e) => {
    if (!mobileMenu.classList.contains("is-open")) return;
    const t = e.touches[0];
    touchStartY = t.clientY;
    touchStartX = t.clientX;
    isSwiping = true;
  },
  { passive: true }
);

mobileMenu?.addEventListener(
  "touchmove",
  (e) => {
    if (!isSwiping) return;
    const t = e.touches[0];
    const dy = t.clientY - touchStartY;
    const dx = t.clientX - touchStartX;

    if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      isSwiping = false;
      closeMenu();
    }
  },
  { passive: true }
);

mobileMenu?.addEventListener(
  "touchend",
  () => {
    isSwiping = false;
  },
  { passive: true }
);

// =====================
// SCROLL SPY (active link) ✅ FIXED (top-offset based)
// =====================
function setActiveLinkById(id) {
  const allLinks = document.querySelectorAll(".navPill__link, .mobileMenu__nav a");
  allLinks.forEach((a) => a.classList.remove("is-active"));

  const targets = document.querySelectorAll(
    `.navPill__link[href="#${CSS.escape(id)}"], .mobileMenu__nav a[href="#${CSS.escape(id)}"]`
  );
  targets.forEach((a) => a.classList.add("is-active"));
}

(function initScrollSpy() {
  // Ако browser няма CSS.escape (рядко), правим fallback
  if (!window.CSS) window.CSS = {};
  if (!CSS.escape) CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");

  // Колко пиксела под topbar-а искаш да “мериш”
  const TOP_OFFSET = 120; // ✅ може да го пипнеш: 96 / 110 / 120

  const candidates = Array.from(document.querySelectorAll("section[id], main[id], header[id]"));

  // Взимаме само тези, които имат и съответен линк в менюто
  const sections = candidates.filter((el) => {
    if (!el.id) return false;
    return !!document.querySelector(`a[href="#${CSS.escape(el.id)}"]`);
  });

  // Debug ако искаш:
  // console.log("ScrollSpy sections:", sections.map((s) => s.id));

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const inView = entries.filter((e) => e.isIntersecting);
      if (!inView.length) return;

      // ✅ Избираме секцията, чийто top е най-близо до TOP_OFFSET
      const best = inView
        .map((e) => ({
          id: e.target.id,
          dist: Math.abs(e.boundingClientRect.top - TOP_OFFSET),
        }))
        .sort((a, b) => a.dist - b.dist)[0];

      if (best?.id) setActiveLinkById(best.id);
    },
    {
      threshold: [0.01, 0.1, 0.2, 0.35],
      rootMargin: `-${TOP_OFFSET}px 0px -55% 0px`,
    }
  );

  sections.forEach((sec) => observer.observe(sec));

  // Ако има hash при load
  const hash = (location.hash || "").replace("#", "");
  if (hash && document.getElementById(hash)) setActiveLinkById(hash);
})();



// =====================
// HERO crossfade (2 photos)
// =====================
const heroImages = ["img/kushta-za-gosti-ema-nachalo.webp", "img/kushta-za-gosti-ema-nachalo1.webp"];

(function initHeroSlider() {
  const layerA = document.querySelector(".hero__bgLayer.is-a");
  const layerB = document.querySelector(".hero__bgLayer.is-b");
  if (!layerA || !layerB) return;

  layerA.style.backgroundImage = `url("${heroImages[0]}")`;
  layerB.style.backgroundImage = `url("${heroImages[1]}")`;

  let activeIsA = true;
  layerA.classList.add("is-active");

  const INTERVAL = 7500;

  setInterval(() => {
    activeIsA = !activeIsA;
    if (activeIsA) {
      layerA.classList.add("is-active");
      layerB.classList.remove("is-active");
    } else {
      layerB.classList.add("is-active");
      layerA.classList.remove("is-active");
    }
  }, INTERVAL);
})();

// =====================
// ABOUT (first about section) reveal
// =====================
(function initAboutReveal() {
    const about = document.querySelector(".about");
    if (!about) return;
  
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) about.classList.add("is-visible");
      },
      { threshold: 0.25 }
    );
  
    obs.observe(about);
  })();
  
  // =====================
  // ABOUT DETAILS reveal (ONLY ONCE) + REPLAY FILM EVERY 10s
  // =====================
  (function initAboutDetailsRevealAndReplay() {
    const section = document.querySelector(".aboutDetails");
  
    // ✅ вече не е .collage, а .film (вътре в .filmShowcase)
    const film = document.querySelector(".aboutDetails .film");
  
    if (!section || !film) return;
  
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  
    // ако има reduce motion -> показваме секцията без анимации
    if (reduceMotion) {
      section.classList.add("is-visible");
      return;
    }
  
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        if (entries[0].isIntersecting) {
          section.classList.add("is-visible");
          obs.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );
    revealObserver.observe(section);
  
    const PERIOD_MS = 10000;
    let timer = null;
  
    const replay = () => {
      if (!section.classList.contains("is-visible")) return;
  
      // ✅ клас за “replay” (ще го ползваш в CSS като анимация)
      film.classList.add("is-cycle");
      void film.offsetHeight; // force reflow
      film.classList.remove("is-cycle");
    };
  
    const start = () => {
      if (timer) return;
      timer = setInterval(replay, PERIOD_MS);
    };
  
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
  
    const inViewObs = new IntersectionObserver(
      (entries) => {
        const inView = entries[0]?.isIntersecting;
        if (inView) start();
        else stop();
      },
      { threshold: 0.25 }
    );
    inViewObs.observe(section);
  
    const classObs = new MutationObserver(() => {
      if (section.classList.contains("is-visible")) {
        replay();
        start();
        classObs.disconnect();
      }
    });
    classObs.observe(section, { attributes: true, attributeFilter: ["class"] });
  
    if (section.classList.contains("is-visible")) {
      replay();
      start();
    }
  })();
  

  // =====================
// ROOMS TABS (5 стаи)
// =====================
// =====================
// ROOMS TABS (5 стаи)
// =====================
(function initRoomsTabs(){
    const tablist = document.querySelector(".roomsTabs .tabsPill");
    if (!tablist) return;
  
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  
    function activateTab(tab){
      tabs.forEach((t) => {
        const isOn = t === tab;
  
        t.classList.toggle("is-active", isOn);
        t.setAttribute("aria-selected", isOn ? "true" : "false");
        t.tabIndex = isOn ? 0 : -1;
  
        const panelId = t.getAttribute("aria-controls");
        const panel = panelId ? document.getElementById(panelId) : null;
  
        if (panel){
          panel.hidden = !isOn;
          panel.classList.toggle("is-active", isOn);
        }
      });
    }
  
    tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab)));
  
    tablist.addEventListener("keydown", (e) => {
      const currentIndex = tabs.findIndex(t => t.getAttribute("aria-selected") === "true");
      if (currentIndex < 0) return;
  
      let nextIndex = currentIndex;
  
      if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") nextIndex = 0;
      if (e.key === "End") nextIndex = tabs.length - 1;
  
      if (nextIndex !== currentIndex){
        e.preventDefault();
        tabs[nextIndex].focus();
        activateTab(tabs[nextIndex]);
      }
    });
  
    const active = tabs.find(t => t.classList.contains("is-active")) || tabs[0];
    activateTab(active);
  })();
  
  
  // =====================
  // PHOTO MODAL (popup) + slider
  // =====================
  (function initRoomPhotoModal(){
    const modal = document.getElementById("photoModal");
    if (!modal) return;
  
    const titleEl = modal.querySelector("#photoModalTitle");
    const imgEl = modal.querySelector(".photoModal__img");
    const dotsEl = modal.querySelector(".photoModal__dots");
    const prevBtn = modal.querySelector(".photoModal__nav--prev");
    const nextBtn = modal.querySelector(".photoModal__nav--next");
  
    // ✅ ТУК СЛАГАШ ТВОИТЕ СНИМКИ (2-3 на стая)
    const ROOM_PHOTOS = {
      "double-twin": [
        "img/staia-1.webp",
        "img/staia-1-1.webp",
        "img/staia-1-2.webp",
      ],
      "double-double": [
        "img/staia-3.webp",
        "img/staia-3-1.webp",
        "img/staia-3-2.webp",
      ],
      "triple": [
        "img/staia-2.webp",
        "img/staia-2-1.webp",
        "img/staia-2-2.webp",
      ],
      "triple-balcony": [
        "img/troina-staia-s-balkon.webp",
        "img/troina-staia-s-balkon1.webp",
        "img/troina-staia-s-balkon2.webp",
      ],
      "junior-suite": [
        "img/junior-suit.webp",
        "img/junior-suit1.webp",
        "img/junior-suit2.webp",
      ],
    };
  
    // заглавия за модала (по желание)
    const ROOM_TITLES = {
      "double-twin": "Двойна стая – 2 отделни легла",
      "double-double": "Двойна стая – двойно легло",
      "triple": "Тройна стая",
      "triple-balcony": "Тройна стая с балкон",
      "junior-suite": "Джуниър суит – планински изглед",
    };
  
    let currentRoomKey = null;
    let currentIndex = 0;
    let lastActiveTrigger = null;
  
    function lockScroll(locked){
      document.body.style.overflow = locked ? "hidden" : "";
    }
  
    function setImage(index){
      const list = ROOM_PHOTOS[currentRoomKey] || [];
      if (!list.length) return;
  
      currentIndex = (index + list.length) % list.length;
  
      const src = list[currentIndex];
      imgEl.src = src;
  
      // alt + title
      const roomTitle = ROOM_TITLES[currentRoomKey] || "Снимки";
      imgEl.alt = `${roomTitle} – снимка ${currentIndex + 1}`;
      if (titleEl) titleEl.textContent = roomTitle;
  
      // dots
      if (dotsEl){
        const dots = Array.from(dotsEl.querySelectorAll(".photoDot"));
        dots.forEach((d, i) => d.classList.toggle("is-active", i === currentIndex));
      }
    }
  
    function buildDots(){
      if (!dotsEl) return;
      dotsEl.innerHTML = "";
  
      const list = ROOM_PHOTOS[currentRoomKey] || [];
      list.forEach((_, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "photoDot" + (i === currentIndex ? " is-active" : "");
        b.setAttribute("aria-label", `Снимка ${i + 1}`);
        b.addEventListener("click", () => setImage(i));
        dotsEl.appendChild(b);
      });
    }
  
    function openModal(roomKey, triggerEl){
      currentRoomKey = roomKey;
      currentIndex = 0;
      lastActiveTrigger = triggerEl || null;
  
      // ако няма снимки - не отваряме
      const list = ROOM_PHOTOS[currentRoomKey] || [];
      if (!list.length) return;
  
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      lockScroll(true);
  
      buildDots();
      setImage(0);
  
      // focus close button
      const closeBtn = modal.querySelector('[data-close="1"]');
      closeBtn?.focus?.();
    }
  
    function closeModal(){
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      lockScroll(false);
  
      // връщаме фокус към бутона "ВИЖ СНИМКИ"
      lastActiveTrigger?.focus?.();
      lastActiveTrigger = null;
    }
  
    // click open
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".seePhotosBtn");
      if (!btn) return;
  
      const roomKey = btn.getAttribute("data-room");
      if (!roomKey) return;
  
      openModal(roomKey, btn);
    });
  
    // close (backdrop or close button)
    modal.addEventListener("click", (e) => {
      const shouldClose = e.target?.closest?.('[data-close="1"]');
      if (shouldClose) closeModal();
    });
  
    // nav buttons
    prevBtn?.addEventListener("click", () => setImage(currentIndex - 1));
    nextBtn?.addEventListener("click", () => setImage(currentIndex + 1));
  
    // keyboard (ESC + arrows)
    window.addEventListener("keydown", (e) => {
      if (!modal.classList.contains("is-open")) return;
  
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
  
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setImage(currentIndex - 1);
      }
  
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setImage(currentIndex + 1);
      }
    });
  
    // swipe (mobile) - simple
    let sx = 0;
    let sy = 0;
    let tracking = false;
  
    const figure = modal.querySelector(".photoModal__figure");
    figure?.addEventListener("touchstart", (e) => {
      if (!modal.classList.contains("is-open")) return;
      const t = e.touches[0];
      sx = t.clientX;
      sy = t.clientY;
      tracking = true;
    }, { passive: true });
  
    figure?.addEventListener("touchmove", (e) => {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
  
      // хоризонтален swipe
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.2){
        tracking = false;
        if (dx < 0) setImage(currentIndex + 1);
        else setImage(currentIndex - 1);
      }
    }, { passive: true });
  
    figure?.addEventListener("touchend", () => {
      tracking = false;
    }, { passive: true });
  
  })();
  

  // =====================
// Tabs scroll hint (mobile)
// =====================
(function initTabsScrollHint(){
    const tabsPill = document.querySelector(".roomsTabs .tabsPill");
    if (!tabsPill) return;
  
    const mq = window.matchMedia("(max-width: 640px)");
  
    function updateScrollable(){
      // има ли реално overflow?
      const isScrollable = tabsPill.scrollWidth > tabsPill.clientWidth + 4;
      tabsPill.classList.toggle("is-scrollable", mq.matches && isScrollable);
  
      // ако сме стигнали до края, пак може да скрием fade/hint
      const atEnd = (tabsPill.scrollLeft + tabsPill.clientWidth) >= (tabsPill.scrollWidth - 2);
      if (atEnd) tabsPill.classList.add("is-scrolled");
    }
  
    function onScroll(){
      if (!mq.matches) return;
      // щом има някакъв scroll, скриваме подсказката
      if (tabsPill.scrollLeft > 6) tabsPill.classList.add("is-scrolled");
  
      // ако се върне в началото, може пак да я покажем (по желание)
      // ако не искаш да се връща никога -> махни else блока
      else tabsPill.classList.remove("is-scrolled");
    }
  
    tabsPill.addEventListener("scroll", onScroll, { passive: true });
  
    // при resize/rotate
    if (mq.addEventListener) mq.addEventListener("change", updateScrollable);
    window.addEventListener("resize", updateScrollable, { passive: true });
  
    // init
    updateScrollable();
  })();

  // =====================
// FIX: exact scroll offset for menu anchors
// =====================
(function initExactAnchorScroll(){
    const topbarInner = document.querySelector(".topbar__inner");
    if (!topbarInner) return;
  
    function getOffset(){
      const rect = topbarInner.getBoundingClientRect();
      // + малко въздух
      return Math.round(rect.height + 26);
    }
  
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
  
      const href = a.getAttribute("href");
      if (!href || href.length < 2) return;
  
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;
  
      // prevent default anchor jump
      e.preventDefault();
  
      const y = target.getBoundingClientRect().top + window.pageYOffset - getOffset();
      window.scrollTo({ top: y, behavior: "smooth" });
  
      // update URL hash без “jump”
      history.pushState(null, "", href);
    });
  })();
  

  (function puzzleGallery() {
  const grid = document.getElementById("puzzleGrid");
  const items = grid ? Array.from(grid.querySelectorAll(".puzzleItem")) : [];
  if (!grid || !items.length) return;

  // ✅ Stagger animation without heavy libs
  items.forEach((b, i) => {
    b.style.setProperty("--d", `${i * 45}ms`);
  });

  // ✅ Build array of images
  const images = items.map((b) => b.getAttribute("data-full") || b.querySelector("img")?.src).filter(Boolean);

  const lb = document.getElementById("puzzleLightbox");
  const lbImg = document.getElementById("puzzleImg");
  const lbCount = document.getElementById("puzzleCount");
  const btnPrev = lb?.querySelector(".puzzleLightbox__nav--prev");
  const btnNext = lb?.querySelector(".puzzleLightbox__nav--next");

  if (!lb || !lbImg || !lbCount) return;

  let index = 0;

  function render(i){
    index = (i + images.length) % images.length;
    lbImg.src = images[index];
    lbCount.textContent = `${index + 1} / ${images.length}`;

    applyOrientationClass(images[index]);
  }

  function openLB(i){
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    render(i);
  }

  function closeLB(){
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  items.forEach((b, i) => b.addEventListener("click", () => openLB(i)));

  lb.addEventListener("click", (e) => {
    if (e.target.closest('[data-close="1"]')) closeLB();
  });

  btnPrev?.addEventListener("click", () => render(index - 1));
  btnNext?.addEventListener("click", () => render(index + 1));

  window.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLB();
    if (e.key === "ArrowLeft") render(index - 1);
    if (e.key === "ArrowRight") render(index + 1);
  }, { passive: true });
})();

function applyOrientationClass(src) {
    const panel = document.querySelector(".puzzleLightbox__panel");
    if (!panel) return;
  
    const probe = new Image();
    probe.onload = () => {
      const w = probe.naturalWidth || 1;
      const h = probe.naturalHeight || 1;
      const r = w / h; // ratio
  
      panel.classList.remove("is-portrait", "is-square", "is-wide");
  
      // wide
      if (r > 1.15) panel.classList.add("is-wide");
      // square-ish
      else if (r >= 0.85 && r <= 1.15) panel.classList.add("is-square");
      // tall (portrait)
      else panel.classList.add("is-portrait");
    };
    probe.src = src;
  }
  

// =====================
// PRICES -> SELECT ROOM + SCROLL TO BOOKING
// =====================
(function initPricesToBooking(){
  const cards = Array.from(document.querySelectorAll(".priceCard"));
  const bookingSection = document.getElementById("rezervacia");

  const roomOut = document.getElementById("bookingRoom");
  const roomHidden = document.getElementById("room");
  const priceHidden = document.getElementById("pricePerNight");

  const guestsSelect = document.getElementById("guests");

  function setSelectedCard(card){
    cards.forEach(c => c.classList.remove("is-selected"));
    card.classList.add("is-selected");

    const roomName = card.getAttribute("data-room") || "—";
    const price = Number(card.getAttribute("data-price") || 0);
    const guests = card.getAttribute("data-guests");

    if (roomOut) roomOut.innerHTML = `Избрана опция: <strong>${roomName}</strong>`;
    if (roomHidden) roomHidden.value = roomName;
    if (priceHidden) priceHidden.value = price ? String(price) : "";

    if (guestsSelect && guests) guestsSelect.value = String(guests);

    // recalc total if dates already chosen
    if (typeof window.__recalcBookingTotal === "function") {
      window.__recalcBookingTotal();
    }
  }

  cards.forEach(card => {
    const btn = card.querySelector("[data-book-now]");
    if (!btn) return;

    btn.addEventListener("click", () => {
      setSelectedCard(card);
      bookingSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Optional: select first card by default
  if (cards[0]) setSelectedCard(cards[0]);
})();

// =====================
// BOOKING: ROOM DROPDOWN -> SET PRICE + GUESTS + RECALC
// =====================
(function initRoomDropdown(){
  const roomSelect = document.getElementById("roomSelect");
  if (!roomSelect) return;

  const guestsSelect = document.getElementById("guests");

  const roomHidden = document.getElementById("room");
  const priceHidden = document.getElementById("pricePerNight");

  function applySelectedOption(){
    const opt = roomSelect.options[roomSelect.selectedIndex];
    if (!opt) return;

    const roomName = opt.getAttribute("data-room") || "";
    const price = Number(opt.getAttribute("data-price") || 0);
    const guests = opt.getAttribute("data-guests") || "";

    if (roomHidden) roomHidden.value = roomName;
    if (priceHidden) priceHidden.value = price ? String(price) : "";

    // Auto set guests to match the chosen option (you can remove this if you prefer)
    if (guestsSelect && guests) guestsSelect.value = String(guests);

    if (typeof window.__recalcBookingTotal === "function") {
      window.__recalcBookingTotal();
    }
  }

  roomSelect.addEventListener("change", applySelectedOption);

  // Optional: preselect first real option
  // roomSelect.selectedIndex = 1; applySelectedOption();
})();


// =====================
// BOOKING CALENDAR (check-in + check-out range) + PRICE CALC
// =====================
(function initBookingCalendar(){
  const cal = document.getElementById("cal");
  if (!cal) return;

  const grid = document.getElementById("calGrid");
  const title = document.getElementById("calTitle");
  const prev = document.getElementById("calPrev");
  const next = document.getElementById("calNext");

  const checkinInput = document.getElementById("checkin");
  const checkoutInput = document.getElementById("checkout");
  const submitBtn = document.getElementById("submitBtn");
  const dateNote = document.getElementById("dateNote");

  const bookingPriceEl = document.getElementById("bookingPrice");
  const calHint = document.getElementById("calHint");

  const pricePerNightHidden = document.getElementById("pricePerNight");
  const nightsHidden = document.getElementById("nights");
  const totalPriceHidden = document.getElementById("totalPrice");

  const monthsBg = ["Януари","Февруари","Март","Април","Май","Юни","Юли","Август","Септември","Октомври","Ноември","Декември"];

  const today = new Date();
  today.setHours(0,0,0,0);

  let view = new Date(today.getFullYear(), today.getMonth(), 1);

  let start = null;
  let end = null;

  function fmt(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function isSameDay(a,b){
    return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  }

  function nightsBetween(a,b){
    if (!a || !b) return 0;
    const ms = 24*60*60*1000;
    const aa = new Date(a); aa.setHours(0,0,0,0);
    const bb = new Date(b); bb.setHours(0,0,0,0);
    return Math.max(0, Math.round((bb - aa)/ms));
  }

  function eur(n){ return `${Math.round(n)} €`; }

  function setSubmitState(){
    const price = Number(pricePerNightHidden?.value || 0);
    const ok = !!(start && end && price > 0);

    if (submitBtn) submitBtn.disabled = !ok;

    if (dateNote) {
      if (!start || !end) {
        dateNote.textContent = `* Моля, изберете дата на настаняване и дата на напускане, и изберете опция.`;
      } else if (price <= 0) {
        dateNote.textContent = `Избрано: ${fmt(start)} → ${fmt(end)} • Изберете опция, за да се изчисли цена.`;
      } else {
        dateNote.textContent = `Избрано: ${fmt(start)} → ${fmt(end)}`;
      }
    }
  }

  function recalcTotal(){
    const price = Number(pricePerNightHidden?.value || 0);
    const n = nightsBetween(start, end);
    const total = price > 0 ? price * n : 0;

    if (nightsHidden) nightsHidden.value = n ? String(n) : "";
    if (totalPriceHidden) totalPriceHidden.value = total ? String(total) : "";

    const strong = bookingPriceEl?.querySelector("strong");
    if (strong) {
      if (!start || !end || price <= 0 || n <= 0) strong.textContent = "--";
      else strong.textContent = `${eur(total)} (${n} нощ${n === 1 ? "" : "увки"})`;
    }

    if (calHint) {
      if (!start || !end) calHint.textContent = "ИЗБЕРЕТЕ ДАТИ ЗА ДА ВИДИТЕ ЦЕНА";
      else if (price <= 0) calHint.textContent = "ИЗБЕРЕТЕ ОПЦИЯ ЗА ДА ВИДИТЕ ЦЕНА";
      else calHint.textContent = `ОБЩО: ${eur(total)} • ${n} НОЩУВКИ`;
    }

    setSubmitState();
  }

  window.__recalcBookingTotal = recalcTotal;

  function render(){
    if (!grid || !title) return;

    grid.innerHTML = "";
    title.textContent = `${monthsBg[view.getMonth()]} ${view.getFullYear()}`;

    const firstDay = new Date(view.getFullYear(), view.getMonth(), 1);
    const lastDay  = new Date(view.getFullYear(), view.getMonth()+1, 0);

    const startIndex = (firstDay.getDay() + 6) % 7;
    const prevLast = new Date(view.getFullYear(), view.getMonth(), 0).getDate();

    const total = 42;

    for (let i=0; i<total; i++){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calDay";

      let cellDate = null;
      let dayNum = 0;

      if (i < startIndex){
        dayNum = prevLast - (startIndex - 1 - i);
        btn.classList.add("is-muted");
        cellDate = new Date(view.getFullYear(), view.getMonth()-1, dayNum);
      } else if (i >= startIndex + lastDay.getDate()){
        dayNum = i - (startIndex + lastDay.getDate()) + 1;
        btn.classList.add("is-muted");
        cellDate = new Date(view.getFullYear(), view.getMonth()+1, dayNum);
      } else {
        dayNum = i - startIndex + 1;
        cellDate = new Date(view.getFullYear(), view.getMonth(), dayNum);
      }

      btn.textContent = String(dayNum);

      const d0 = new Date(cellDate);
      d0.setHours(0,0,0,0);
      const isPast = d0 < today;
      if (isPast) btn.classList.add("is-disabled");

      if (start && isSameDay(d0, start)) btn.classList.add("is-start");
      if (end && isSameDay(d0, end)) btn.classList.add("is-end");
      if (start && end && d0 > start && d0 < end) btn.classList.add("is-inRange");

      btn.addEventListener("click", () => {
        if (isPast) return;

        if (!start || (start && end)){
          start = d0;
          end = null;
        } else {
          if (d0 <= start){
            start = d0;
            end = null;
          } else {
            end = d0;
          }
        }

        if (checkinInput) checkinInput.value = start ? fmt(start) : "";
        if (checkoutInput) checkoutInput.value = end ? fmt(end) : "";

        if (btn.classList.contains("is-muted")){
          view = new Date(d0.getFullYear(), d0.getMonth(), 1);
        }

        render();
        recalcTotal();
      });

      grid.appendChild(btn);
    }
  }

  prev?.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth()-1, 1);
    render();
  });

  next?.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth()+1, 1);
    render();
  });

  render();
  recalcTotal();
})();


// =====================
// BOOKING FORM submit (примерен)
// =====================
(function initBookingForm(){
  const form = document.getElementById("bookForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
  
    const successBox = document.getElementById("bookingSuccess");
  
    // demo submit (тук по-късно можеш да вържеш backend)
    const data = new FormData(form);
    console.log("Booking request:", Object.fromEntries(data.entries()));
  
    // reset form
    form.reset();
  
    // show success
    if (successBox) {
      successBox.classList.add("is-show");
  
      // auto hide after 6 sec
      setTimeout(() => {
        successBox.classList.remove("is-show");
      }, 6000);
    }
  
    // scroll to message nicely
    successBox?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  });
  
})();


// =====================
// SCROLL TO TOP BUTTON
// =====================
(function initScrollTop(){
  const btn = document.getElementById("toTop");
  if (!btn) return;

  const showAfter = 300;

  function toggleBtn(){
    if (window.scrollY > showAfter) {
      btn.classList.add("is-show");
    } else {
      btn.classList.remove("is-show");
    }
  }

  btn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  window.addEventListener("scroll", toggleBtn, { passive: true });
  toggleBtn();
})();
