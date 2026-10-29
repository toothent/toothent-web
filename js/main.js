(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header: transparent inside the hero, floating white pill once scrolled
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const setMenu = (open) => {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('nav-open')));
  document.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', (e) => { if (!header.contains(e.target)) setMenu(false); });

  // Card fans: cards spread on an arc around the active one.
  // The treatments fan curves down at the sides; a .fan--up fan curves up (smile shape).
  document.querySelectorAll('[data-fan]').forEach((fan) => {
    const section = fan.closest('section');
    const up = fan.classList.contains('fan--up');
    const cards = [...fan.children];
    let active = Math.floor(cards.length / 2);
    const prevOff = new Map();
    const layout = () => {
      const narrow = window.innerWidth < 600;
      const step = narrow ? 175 : Math.min(250, window.innerWidth * .19);
      cards.forEach((card, n) => {
        let off = n - active;
        const half = cards.length / 2;
        if (off > half) off -= cards.length;          // wrap so the fan stays balanced
        if (off < -half) off += cards.length;
        const a = Math.abs(off);
        // A card wrapping from one end to the other jumps there (no slide behind the fan), then fades in
        const wrapped = prevOff.has(card) && Math.abs(off - prevOff.get(card)) > cards.length / 2;
        prevOff.set(card, off);
        if (wrapped) {
          card.style.transition = 'none';
          card.style.opacity = '0';
          requestAnimationFrame(() => requestAnimationFrame(() => {
            card.style.transition = '';
            card.style.opacity = a > 3 ? '0' : '1';
          }));
        }
        const dir = up ? -1 : 1;
        card.style.transform = `translateX(${off * step}px) translateY(${dir * (a * a * 14 + a * 26)}px) rotate(${dir * off * 11}deg)`;
        card.style.zIndex = String(20 - a);
        if (!wrapped) card.style.opacity = a > 3 ? '0' : '1';
        card.style.pointerEvents = a > 3 ? 'none' : '';
        card.classList.toggle('is-side', a > 0);
        card.tabIndex = a > 3 ? -1 : 0;
      });
    };
    const move = (d) => { active = (active + d + cards.length) % cards.length; layout(); };
    section.querySelector('[data-fan-prev]').addEventListener('click', () => move(-1));
    section.querySelector('[data-fan-next]').addEventListener('click', () => move(1));
    // Clicking a side card brings it to the centre first instead of navigating
    cards.forEach((card, n) => card.addEventListener('click', (e) => {
      if (n !== active) { e.preventDefault(); active = n; layout(); }
    }));
    window.addEventListener('resize', layout);
    layout();
  });

  // Floating consultation bar: appears after the hero, hides over the footer
  const bar = document.querySelector('[data-consult]');
  if (bar) {
    const footer = document.querySelector('.site-footer');
    const toggleBar = () => {
      const past = window.scrollY > window.innerHeight * .6;
      const atFooter = footer.getBoundingClientRect().top < window.innerHeight - 40;
      bar.classList.toggle('is-on', past && !atFooter);
    };
    toggleBar();
    window.addEventListener('scroll', toggleBar, { passive: true });
  }

  // Hero image slider
  const slider = document.querySelector('[data-slider]');
  if (slider) {
    const slides = slider.querySelectorAll('.hero-slides img');
    const current = slider.querySelector('[data-current]');
    let i = 0;
    let timer;
    const show = (n) => {
      slides[i].classList.remove('is-active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-active');
      current.textContent = String(i + 1).padStart(2, '0');
    };
    const restart = () => {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(() => show(i + 1), 6000);
    };
    slider.querySelector('[data-prev]').addEventListener('click', () => { show(i - 1); restart(); });
    slider.querySelector('[data-next]').addEventListener('click', () => { show(i + 1); restart(); });
    restart();
  }

  // Treatments carousel arrows
  const track = document.querySelector('[data-carousel]');
  if (track) {
    const prev = document.querySelector('[data-carousel-prev]');
    const next = document.querySelector('[data-carousel-next]');
    const step = () => (track.firstElementChild.getBoundingClientRect().width + 20);
    const update = () => {
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // Reveal on scroll (content is only hidden once JS is confirmed running)
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el, n) => {
      el.classList.add('reveal-ready');
      el.style.transitionDelay = `${(n % 4) * 80}ms`;
      io.observe(el);
    });
  }

  // Appointment form: sends the request to the clinic's WhatsApp, ready for the patient to send
  const CLINIC_WHATSAPP = '917902200015';
  const form = document.getElementById('appointment-form');
  if (form) {
    const note = form.querySelector('.form-note');
    const dateInput = form.querySelector('[name="date"]');
    const today = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dateInput) dateInput.min = iso(today); // no past dates

    const field = (n) => form.elements.namedItem(n);
    const fail = (msg, el) => {
      note.classList.add('is-error');
      note.textContent = msg;
      if (el) { el.classList.add('is-invalid'); el.focus(); }
    };
    form.querySelectorAll('input, select, textarea').forEach((f) => f.addEventListener('input', () => f.classList.remove('is-invalid')));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.querySelectorAll('.is-invalid').forEach((f) => f.classList.remove('is-invalid'));
      const name = field('name').value.trim();
      const phone = field('phone').value.trim();
      const digits = phone.replace(/\D/g, '');
      if (!name) return fail('Please tell us your name.', field('name'));
      if (digits.length < 10 || digits.length > 13) return fail('Please enter a valid phone number so we can call you back.', field('phone'));

      let dateText = 'Any day';
      if (dateInput.value) {
        const d = new Date(dateInput.value + 'T00:00');
        if (dateInput.value < iso(today)) return fail('Please pick today or a future date.', dateInput);
        if (d.getDay() === 0) return fail('We’re closed on Sundays. Please pick Monday to Saturday.', dateInput);
        dateText = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      }

      const lines = [
        'Hello Toothent! I’d like to book an appointment.',
        '',
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Treatment: ${field('treatment').value}`,
        `Preferred date: ${dateText}`,
      ];
      const msg = field('message').value.trim();
      if (msg) lines.push(`Message: ${msg}`);

      const url = `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
      const win = window.open(url, '_blank');
      if (win) win.opener = null;
      note.classList.remove('is-error');
      if (win) {
        note.textContent = 'WhatsApp is opening with your request. Just tap send, and we’ll get back to you soon.';
        form.reset();
      } else {
        note.innerHTML = `Your browser blocked the pop-up. <a href="${url}" target="_blank" rel="noopener">Tap here to open WhatsApp</a>, or call us on +91 79022 00015.`;
      }
    });
  }

  // Before & after carousel: drag the handle to compare, arrows switch smiles
  const ba = document.querySelector('[data-ba]');
  if (ba) {
    const slides = JSON.parse(ba.dataset.baSlides);
    const main = ba.querySelector('[data-ba-main]');
    const range = main.querySelector('.ba-range');
    const peeks = [ba.querySelector('[data-ba-prev-peek]'), ba.querySelector('[data-ba-next-peek]')];
    const pad = (n) => String(n).padStart(2, '0');
    let i = 0;
    const fill = (box, s) => { box.querySelector('.ba-after-img').src = s.after; box.querySelector('.ba-before-img').src = s.before; };
    const show = (n, animate) => {
      i = (n + slides.length) % slides.length;
      const s = slides[i];
      main.querySelector('.ba-after-img').alt = s.alt + ' (after)';
      main.querySelector('.ba-before-img').alt = s.alt + ' (before)';
      fill(main, s);
      fill(peeks[0], slides[(i - 1 + slides.length) % slides.length]);
      fill(peeks[1], slides[(i + 1) % slides.length]);
      range.value = 50; main.style.setProperty('--pos', '50%');
      ba.querySelector('[data-ba-now]').textContent = pad(i + 1);
      ba.querySelector('[data-ba-bar]').style.top = (i / slides.length) * 100 + '%';
      if (animate) { main.classList.remove('is-swapping'); void main.offsetWidth; main.classList.add('is-swapping'); }
    };
    ba.querySelector('[data-ba-total]').textContent = pad(slides.length);
    ba.querySelector('[data-ba-bar]').style.height = 100 / slides.length + '%';
    range.addEventListener('input', () => main.style.setProperty('--pos', range.value + '%'));
    ba.querySelector('[data-ba-prev]').addEventListener('click', () => show(i - 1, true));
    ba.querySelector('[data-ba-next]').addEventListener('click', () => show(i + 1, true));
    show(0, false);
  }

  document.querySelectorAll('.year').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
