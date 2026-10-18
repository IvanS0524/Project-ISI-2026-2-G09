(function(){
  'use strict';

  /* Año actual dinámico */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* Encabezado sticky con cambio de fondo */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function(){ header.classList.toggle('is-scrolled', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Menú móvil accesible */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');
  var mq = window.matchMedia('(min-width: 1025px)');

  if (!burger || !menu) return;

  function closeMenu(){
    burger.setAttribute('aria-expanded','false');
    burger.setAttribute('aria-label','Abrir menú de navegación');
    menu.classList.remove('is-open');
  }
  function openMenu(){
    burger.setAttribute('aria-expanded','true');
    burger.setAttribute('aria-label','Cerrar menú de navegación');
    menu.classList.add('is-open');
  }
  burger.addEventListener('click', function(){
    if (menu.classList.contains('is-open')) { closeMenu(); } else { openMenu(); }
  });
  menu.addEventListener('click', function(e){
    if (e.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); burger.focus(); }
  });
  var onMq = function(){ if (mq.matches) closeMenu(); };
  if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);

  /* Selector funcional de vehículo en la sección de tarifas */
  var fBtnMoto = document.getElementById('btnMoto');
  var fBtnCarro = document.getElementById('btnCarro');
  var cellsMoto = document.querySelectorAll('.price[data-moto]');
  var cellsCarro = document.querySelectorAll('.price[data-carro]');

  function setVeh(veh){
    var isMoto = veh === 'moto';
    fBtnMoto.setAttribute('aria-pressed', isMoto ? 'true' : 'false');
    fBtnCarro.setAttribute('aria-pressed', isMoto ? 'false' : 'true');
    cellsMoto.forEach(function(c){ c.classList.toggle('is-active', isMoto); });
    cellsCarro.forEach(function(c){ c.classList.toggle('is-active', !isMoto); });
  }
  if (fBtnMoto && fBtnCarro) {
    fBtnMoto.addEventListener('click', function(){ setVeh('moto'); });
    fBtnCarro.addEventListener('click', function(){ setVeh('carro'); });
    setVeh('moto');
  }

  /* Animación de entrada de secciones */
  /* Animación de entrada: SOLO se animan los bloques que ya están dentro de la
     primera pantalla. El resto del documento permanece visible por defecto, de modo
     que el contenido se lee igual si el JavaScript falla, al imprimir o en capturas. */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var vh = window.innerHeight || 800;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animated = [];
  reveals.forEach(function(el){
    var r = el.getBoundingClientRect();
    if (!reduceMotion && r.top < vh * 0.92 && r.bottom > 0) {
      el.classList.add('fx');
      animated.push(el);
    }
  });
  function showAnimated(){ animated.forEach(function(el){ el.classList.add('is-in'); }); }
  if (animated.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.05 });
    animated.forEach(function(el, i){
      el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
      io.observe(el);
    });
    /* Lo que ya está en pantalla se revela en el siguiente fotograma: la transición
       se ve, pero el contenido nunca queda oculto si algo falla. */
    requestAnimationFrame(function(){ requestAnimationFrame(showAnimated); });
    window.addEventListener('load', function(){ setTimeout(showAnimated, 900); });
  } else {
    showAnimated();
  }

  /* Navegación activa: secciones + enlaces internos */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav__links .nav-link'));
  var sections = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  if ('IntersectionObserver' in window && sections.length) {
    var navIo = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        var idx = sections.indexOf(en.target);
        if (idx < 0) return;
        links.forEach(function(l, i){ l.classList.toggle('is-active', i === idx); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function(s){ if (s) navIo.observe(s); });
  }

  /* Desplazamiento suave con compensación del header sticky */
  var headerOffset = function(){
    var h = getComputedStyle(document.documentElement).getPropertyValue('--nav-h').trim();
    var n = parseFloat(h);
    return isNaN(n) ? 74 : n;
  };
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var top = target.getBoundingClientRect().top + window.pageYOffset - (headerOffset() - 1);
    window.scrollTo({ top: top < 0 ? 0 : top, behavior: reduce ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id);
    if (target.hasAttribute('tabindex') === false) target.setAttribute('tabindex','-1');
    target.focus({ preventScroll: true });
  });
})();

