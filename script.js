/* Colores de acento: variantes accesibles de la paleta del sistema de Apple
   (contraste suficiente con texto blanco). */
const ACCENTS = ["#0071E3","#248A3D","#5E5CE6","#C93400","#D30F45","#8944AB","#0071A4"];
const A11Y_KEY = "mi_qr_a11y_v1";
const DESIGN_KEY = "mi_qr_design_v1";
const $ = (id)=> document.getElementById(id);

function showFatalError(msg){
  const b = $('errBanner');
  if(!b) return;
  b.style.display = 'block';
  b.textContent = msg;
}
window.addEventListener('error', (e)=>{
  showFatalError('Ocurrió un error: ' + (e.message || 'desconocido'));
});
window.addEventListener('unhandledrejection', (e)=>{
  showFatalError('Ocurrió un error: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
});

/* ---------------- Avisos apilados (al estilo Sonner) ----------------
   Entran y salen por el mismo lado, se apilan con transiciones
   interrumpibles y nunca muestran más de tres a la vez. */
let toasts = [];
function showToast(msg){
  let host = document.querySelector('.toaster');
  if(!host){
    host = document.createElement('ol');
    host.className = 'toaster';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const t = document.createElement('li');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  t.style.setProperty('--i', 0);
  host.appendChild(t);
  toasts.unshift(t);
  layoutToasts();
  setTimeout(()=> dismissToast(t), 3200);
}
function layoutToasts(){
  toasts.forEach((el, i)=>{
    el.style.setProperty('--i', i);
    el.toggleAttribute('data-hidden', i >= 3);
  });
}
function dismissToast(t){
  if(!toasts.includes(t)) return;
  toasts = toasts.filter(x => x !== t);
  t.setAttribute('data-leaving', '');
  layoutToasts();
  setTimeout(()=> t.remove(), 420);
}

/* ---------------- Almacenamiento seguro ---------------- */
function readJSON(key){
  try{ return JSON.parse(localStorage.getItem(key)) || {}; }catch(e){ return {}; }
}
function writeJSON(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
}

/* ---------------- Accesibilidad (tema, acento, contraste, movimiento) ---------------- */
function loadA11y(){ return readJSON(A11Y_KEY); }
function saveA11y(state){ writeJSON(A11Y_KEY, state); }

function setThemeColor(dark){
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', dark ? '#000000' : '#F5F5F7'));
}

function initA11y(){
  const state = loadA11y();
  const body = document.body;
  // Si nunca eligió tema, seguimos el del sistema.
  const dark = typeof state.dark === 'boolean' ? state.dark : window.matchMedia('(prefers-color-scheme: dark)').matches;

  body.classList.toggle('dark', dark);
  setThemeColor(dark);
  if(state.contrast) body.classList.add('high-contrast');
  if(state.motion) body.classList.add('reduce-motion');
  if(state.fontScale) document.documentElement.style.fontSize = (16 * state.fontScale) + 'px';
  const accent = ACCENTS.includes(state.accent) ? state.accent : ACCENTS[0];
  document.documentElement.style.setProperty('--accent', accent);

  $('darkToggle').checked = dark;
  $('contrastToggle').checked = !!state.contrast;
  $('motionToggle').checked = !!state.motion;
  $('fontScaleSelect').value = String(state.fontScale || 1);

  const swatchWrap = $('swatches');
  ACCENTS.forEach((color, i)=>{
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch';
    sw.style.background = color;
    sw.setAttribute('aria-label', 'Color de acento ' + (i + 1));
    sw.setAttribute('aria-pressed', String(accent === color));
    if(accent === color) sw.classList.add('selected');
    sw.addEventListener('click', ()=>{
      document.documentElement.style.setProperty('--accent', color);
      [...swatchWrap.children].forEach(c=>{ c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
      sw.classList.add('selected');
      sw.setAttribute('aria-pressed', 'true');
      const s = loadA11y(); s.accent = color; saveA11y(s);
      syncAllRanges();
    });
    swatchWrap.appendChild(sw);
  });

  $('darkToggle').addEventListener('change', (e)=>{
    body.classList.toggle('dark', e.target.checked);
    setThemeColor(e.target.checked);
    const s = loadA11y(); s.dark = e.target.checked; saveA11y(s);
    scheduleRender();
  });
  $('contrastToggle').addEventListener('change', (e)=>{
    body.classList.toggle('high-contrast', e.target.checked);
    const s = loadA11y(); s.contrast = e.target.checked; saveA11y(s);
  });
  $('motionToggle').addEventListener('change', (e)=>{
    body.classList.toggle('reduce-motion', e.target.checked);
    const s = loadA11y(); s.motion = e.target.checked; saveA11y(s);
  });
  $('fontScaleSelect').addEventListener('change', (e)=>{
    document.documentElement.style.fontSize = (16 * parseFloat(e.target.value)) + 'px';
    const s = loadA11y(); s.fontScale = parseFloat(e.target.value); saveA11y(s);
    requestAnimationFrame(positionSegIndicator);
  });
}

/* ---------------- Hojas laterales (accesibilidad y ayuda) ---------------- */
let openSheet = null;
let lastFocus = null;
function openDrawer(drawerId, overlayId){
  const drawer = $(drawerId), overlay = $(overlayId);
  lastFocus = document.activeElement;
  overlay.classList.add('open');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  openSheet = { drawer, overlay };
  requestAnimationFrame(()=> drawer.querySelector('.drawer-close').focus({ preventScroll:true }));
}
function closeDrawer(){
  if(!openSheet) return;
  openSheet.overlay.classList.remove('open');
  openSheet.drawer.classList.remove('open');
  openSheet.drawer.setAttribute('aria-hidden', 'true');
  openSheet = null;
  if(lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll:true });
}
function initDrawers(){
  $('openCustomize').addEventListener('click', ()=> openDrawer('drawer', 'overlay'));
  $('openHelp').addEventListener('click', ()=> openDrawer('helpDrawer', 'helpOverlay'));
  $('closeDrawer').addEventListener('click', closeDrawer);
  $('closeHelpDrawer').addEventListener('click', closeDrawer);
  $('overlay').addEventListener('click', closeDrawer);
  $('helpOverlay').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeDrawer(); });
}

/* ---------------- Panel de estilo colapsable ---------------- */
function initCollapse(){
  const btn = $('collapseStyleBtn');
  const body = $('styleBody');
  const design = readJSON(DESIGN_KEY);
  const apply = (collapsed)=>{
    body.classList.toggle('collapsed', collapsed);
    btn.classList.toggle('collapsed', collapsed);
    btn.setAttribute('aria-expanded', String(!collapsed));
    body.inert = collapsed;
  };
  apply(!!design.styleCollapsed);
  btn.addEventListener('click', ()=>{
    const collapsed = !body.classList.contains('collapsed');
    apply(collapsed);
    const d = readJSON(DESIGN_KEY); d.styleCollapsed = collapsed; writeJSON(DESIGN_KEY, d);
  });
}

/* ---------------- Control segmentado de contenido ---------------- */
let currentContentType = 'url';
const CONTENT_TYPES = ['url', 'text', 'wifi', 'vcard'];

function positionSegIndicator(){
  const bar = $('contentTabs');
  const active = bar.querySelector('.tab.active');
  const ind = bar.querySelector('.seg-indicator');
  if(!active || !ind) return;
  ind.style.width = active.offsetWidth + 'px';
  ind.style.transform = `translateX(${active.offsetLeft}px)`;
}

function setContentType(type, focus){
  if(!CONTENT_TYPES.includes(type)) type = 'url';
  currentContentType = type;
  const panels = { url:$('fieldsUrl'), text:$('fieldsText'), wifi:$('fieldsWifi'), vcard:$('fieldsVcard') };
  document.querySelectorAll('#contentTabs .tab').forEach(t=>{
    const on = t.dataset.type === type;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if(on && focus) t.focus();
  });
  Object.entries(panels).forEach(([key, el])=>{ el.hidden = key !== type; });
  positionSegIndicator();
}

function initContentTabs(){
  const tabs = [...document.querySelectorAll('#contentTabs .tab')];
  const ind = document.querySelector('#contentTabs .seg-indicator');
  tabs.forEach(tab=>{
    tab.addEventListener('click', ()=>{
      setContentType(tab.dataset.type);
      saveDesign();
      scheduleRender();
    });
  });
  $('contentTabs').addEventListener('keydown', (e)=>{
    if(e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = CONTENT_TYPES.indexOf(currentContentType);
    const next = CONTENT_TYPES[(i + (e.key === 'ArrowRight' ? 1 : CONTENT_TYPES.length - 1)) % CONTENT_TYPES.length];
    setContentType(next, true);
    saveDesign();
    scheduleRender();
  });
  // Primera colocación sin animación; las siguientes sí se deslizan.
  ind.style.transition = 'none';
  setContentType(currentContentType);
  requestAnimationFrame(()=> requestAnimationFrame(()=>{ ind.style.transition = ''; }));
  window.addEventListener('resize', positionSegIndicator);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(positionSegIndicator);
}

/* ---------------- Contenido codificado ---------------- */
// Wi‑Fi: \ ; , : " deben escaparse con barra invertida.
function escapeWifi(v){
  return (v || '').replace(/([\\;,:"])/g, '\\$1');
}
// vCard 3.0: barra invertida, punto y coma, coma y saltos de línea.
function escapeVCard(v){
  return (v || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

function buildPayload(){
  if(currentContentType === 'url'){
    let v = $('inputUrl').value.trim();
    if(v && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) v = 'https://' + v;
    return v;
  }
  if(currentContentType === 'text'){
    return $('inputText').value;
  }
  if(currentContentType === 'wifi'){
    const ssid = $('wifiSsid').value;
    const pass = $('wifiPass').value;
    const sec = $('wifiSec').value;
    const hidden = $('wifiHidden').checked;
    if(!ssid.trim()) return '';
    let s = `WIFI:T:${sec};S:${escapeWifi(ssid)};`;
    if(sec !== 'nopass') s += `P:${escapeWifi(pass)};`;
    if(hidden) s += 'H:true;';
    return s + ';';
  }
  if(currentContentType === 'vcard'){
    const name = $('vcName').value.trim();
    const phone = $('vcPhone').value.trim();
    const email = $('vcEmail').value.trim();
    const org = $('vcOrg').value.trim();
    if(!name) return '';
    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:;${escapeVCard(name)};;;`, `FN:${escapeVCard(name)}`];
    if(org) lines.push('ORG:' + escapeVCard(org));
    if(phone) lines.push('TEL;TYPE=CELL:' + escapeVCard(phone));
    if(email) lines.push('EMAIL:' + escapeVCard(email));
    lines.push('END:VCARD');
    return lines.join('\r\n');
  }
  return '';
}

/* ---------------- Logo ---------------- */
let logoImage = null;
let logoDataUrl = null;
function initLogo(){
  const input = $('logoInput');
  const preview = $('logoPreview');
  const removeBtn = $('logoRemoveBtn');
  const label = $('logoBtnLabel');

  input.addEventListener('change', ()=>{
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = new Image();
      img.onload = ()=>{
        logoImage = img;
        logoDataUrl = e.target.result;
        preview.style.backgroundImage = `url(${e.target.result})`;
        preview.hidden = false;
        removeBtn.hidden = false;
        label.textContent = 'Cambiar logo';
        if($('errorLevel').value !== 'H'){
          $('errorLevel').value = 'H';
          showToast('Corrección de errores en Máxima para que el logo no afecte la lectura');
        }
        scheduleRender();
      };
      img.onerror = ()=> showToast('No se pudo leer la imagen. Prueba con otro archivo.');
      img.src = e.target.result;
    };
    reader.onerror = ()=> showToast('No se pudo leer el archivo.');
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener('click', ()=>{
    logoImage = null;
    logoDataUrl = null;
    input.value = '';
    preview.hidden = true;
    removeBtn.hidden = true;
    label.textContent = 'Subir logo';
    scheduleRender();
  });
}

/* ---------------- Geometría compartida entre canvas y SVG ---------------- */
const SHAPE = {
  roundedModule: 0.5,  // radio del módulo redondeado, relativo al módulo
  dot: 0.46,           // radio del punto, relativo al módulo
  eyeRounded: [1.8, 1.2, 0.8] // radios exterior, medio e interior (en módulos)
};

function roundedRectPath(ctx, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawModule(ctx, x, y, size, shape){
  if(shape === 'square'){
    // Un píxel extra evita las líneas finas entre módulos al antialiasing.
    ctx.fillRect(x, y, size + 0.5, size + 0.5);
  } else if(shape === 'dots'){
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * SHAPE.dot, 0, Math.PI * 2);
    ctx.fill();
  } else {
    roundedRectPath(ctx, x, y, size, size, size * SHAPE.roundedModule);
    ctx.fill();
  }
}

function isInEyeZone(row, col, count){
  const inCorner = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 7;
  return (
    inCorner(row, col) ||
    inCorner(row, col - (count - 7)) ||
    inCorner(row - (count - 7), col)
  );
}

// Cada ojo son tres formas rellenas (exterior, anillo de fondo, interior).
// No usamos recorte: dejaría el anillo transparente al exportar.
function drawEye(ctx, baseX, baseY, m, shape, fgColor, bgColor){
  const outer = m * 7, mid = m * 5, inner = m * 3;
  const cx = baseX + outer / 2, cy = baseY + outer / 2;

  if(shape === 'circle'){
    ctx.fillStyle = fgColor; ctx.beginPath(); ctx.arc(cx, cy, outer / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bgColor; ctx.beginPath(); ctx.arc(cx, cy, mid / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fgColor; ctx.beginPath(); ctx.arc(cx, cy, inner / 2, 0, Math.PI * 2); ctx.fill();
  } else if(shape === 'rounded'){
    const [r1, r2, r3] = SHAPE.eyeRounded;
    ctx.fillStyle = fgColor; roundedRectPath(ctx, baseX, baseY, outer, outer, m * r1); ctx.fill();
    ctx.fillStyle = bgColor; roundedRectPath(ctx, baseX + m, baseY + m, mid, mid, m * r2); ctx.fill();
    ctx.fillStyle = fgColor; roundedRectPath(ctx, baseX + m * 2, baseY + m * 2, inner, inner, m * r3); ctx.fill();
  } else {
    ctx.fillStyle = fgColor; ctx.fillRect(baseX, baseY, outer, outer);
    ctx.fillStyle = bgColor; ctx.fillRect(baseX + m, baseY + m, mid, mid);
    ctx.fillStyle = fgColor; ctx.fillRect(baseX + m * 2, baseY + m * 2, inner, inner);
  }
}

function generateMatrix(){
  const payload = buildPayload();
  if(!payload) return null;
  if(typeof qrcode !== 'function') return null;
  const level = $('errorLevel').value;
  try{
    // TextEncoder garantiza UTF‑8 para tildes, eñes y emojis.
    if(qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    const qr = qrcode(0, level);
    qr.addData(payload);
    qr.make();
    return qr;
  }catch(e){
    return 'too-long';
  }
}

function logoBox(size, opts){
  const logoSize = size * (opts.logoSize / 100);
  const lx = (size - logoSize) / 2;
  const ly = (size - logoSize) / 2;
  const pad = logoSize * 0.14;
  return { logoSize, lx, ly, pad };
}

function paintQR(ctx, size, opts, qr){
  ctx.clearRect(0, 0, size, size);

  if(!qr || qr === 'too-long'){
    if(!opts.transparent){ ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, size, size); }
    ctx.fillStyle = '#8E8E93';
    ctx.font = `500 ${Math.round(size * 0.034)}px -apple-system, "Inter", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(qr === 'too-long' ? 'El contenido es demasiado largo' : 'Completa el contenido para ver el QR', size / 2, size / 2);
    return;
  }

  const count = qr.getModuleCount();
  const margin = opts.margin;
  const moduleSize = size / (count + margin * 2);

  if(!opts.transparent){
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, size, size);
  }

  ctx.fillStyle = opts.fg;
  const eyeBg = opts.transparent ? '#ffffff' : opts.bg;

  for(let row = 0; row < count; row++){
    for(let col = 0; col < count; col++){
      if(!qr.isDark(row, col) || isInEyeZone(row, col, count)) continue;
      drawModule(ctx, (col + margin) * moduleSize, (row + margin) * moduleSize, moduleSize, opts.moduleStyle);
    }
  }

  [[0, 0], [0, count - 7], [count - 7, 0]].forEach(([r, c])=>{
    drawEye(ctx, (c + margin) * moduleSize, (r + margin) * moduleSize, moduleSize, opts.eyeStyle, opts.fg, eyeBg);
  });

  if(logoImage){
    const { logoSize, lx, ly, pad } = logoBox(size, opts);
    if(opts.logoBg){
      ctx.save();
      ctx.fillStyle = opts.transparent ? '#ffffff' : opts.bg;
      if(opts.logoRound){
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, (logoSize + pad) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        roundedRectPath(ctx, lx - pad / 2, ly - pad / 2, logoSize + pad, logoSize + pad, (logoSize + pad) * 0.18);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.save();
    if(opts.logoRound){
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
    } else {
      roundedRectPath(ctx, lx, ly, logoSize, logoSize, logoSize * 0.12);
      ctx.clip();
    }
    drawImageCover(ctx, logoImage, lx, ly, logoSize, logoSize);
    ctx.restore();
  }
}

// Dibuja la imagen recortada al centro (como object-fit: cover) para que
// los logos que no son cuadrados no se deformen.
function drawImageCover(ctx, img, x, y, w, h){
  const ir = img.width / img.height;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if(ir > 1){ sw = img.height; sx = (img.width - sw) / 2; }
  else if(ir < 1){ sh = img.width; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function getOptions(){
  return {
    fg: $('fgColor').value,
    bg: $('bgColor').value,
    transparent: $('transparentBgToggle').checked,
    moduleStyle: $('moduleStyle').value,
    eyeStyle: $('eyeStyle').value,
    margin: parseInt($('marginRange').value, 10),
    logoSize: parseInt($('logoSizeRange').value, 10),
    logoBg: $('logoBgToggle').checked,
    logoRound: $('logoRoundToggle').checked,
  };
}

/* ---------------- Contraste ---------------- */
function luminance(hex){
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v=>{
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function updateWarning(opts, qr){
  const warn = $('qrWarn');
  let msg = '';
  if(qr === 'too-long'){
    msg = 'Ese contenido no cabe en un QR. Acórtalo o baja la corrección de errores.';
  } else if(qr){
    const lf = luminance(opts.fg);
    const lb = opts.transparent ? 1 : luminance(opts.bg);
    const ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
    if(lf > lb) msg = 'El QR es más claro que el fondo. Muchos lectores no leen códigos invertidos.';
    else if(ratio < 3) msg = 'Poco contraste entre el QR y el fondo. Oscurece el color del QR para que se lea bien.';
    else if(logoImage && opts.logoSize > 26 && $('errorLevel').value !== 'H') msg = 'Con un logo tan grande, usa corrección de errores Máxima.';
  }
  warn.hidden = !msg;
  warn.textContent = msg;
}

/* ---------------- Render ---------------- */
let renderQueued = false;
function scheduleRender(){
  if(renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(()=>{ renderQueued = false; renderQR(); });
}

function renderQR(){
  const canvas = $('qrCanvas');
  const size = parseInt($('sizeRange').value, 10);
  if(canvas.width !== size){ canvas.width = size; canvas.height = size; }
  const opts = getOptions();
  const qr = generateMatrix();
  paintQR(canvas.getContext('2d'), size, opts, qr);
  $('qrCanvasWrap').classList.toggle('is-transparent', opts.transparent);
  $('sizeChip').textContent = `${size} × ${size}`;
  updateWarning(opts, qr);
  saveDesign();
}

/* ---------------- Descargas ---------------- */
function hasContent(){
  const qr = generateMatrix();
  if(!qr){ showToast('Completa el contenido antes de descargar'); return false; }
  if(qr === 'too-long'){ showToast('El contenido es demasiado largo para un QR'); return false; }
  return true;
}

function triggerDownload(href, filename){
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadPng(){
  if(!hasContent()) return;
  renderQR();
  $('qrCanvas').toBlob((blob)=>{
    if(!blob){ showToast('No se pudo generar la imagen'); return; }
    const url = URL.createObjectURL(blob);
    triggerDownload(url, 'mi-qr.png');
    setTimeout(()=> URL.revokeObjectURL(url), 1000);
    showToast('QR descargado como PNG');
  }, 'image/png');
}

async function copyPng(){
  if(!hasContent()) return;
  renderQR();
  if(!navigator.clipboard || typeof ClipboardItem === 'undefined'){
    showToast('Tu navegador no permite copiar imágenes. Usa Descargar PNG.');
    return;
  }
  try{
    const blobPromise = new Promise((resolve, reject)=> $('qrCanvas').toBlob(b => b ? resolve(b) : reject(new Error('blob')), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
    showToast('QR copiado. Pégalo donde quieras.');
  }catch(e){
    showToast('No se pudo copiar. Usa Descargar PNG.');
  }
}

const fmt = (n)=> +n.toFixed(3);

function buildSvg(){
  const qr = generateMatrix();
  if(!qr || qr === 'too-long') return null;
  const opts = getOptions();
  const size = parseInt($('sizeRange').value, 10);
  const count = qr.getModuleCount();
  const margin = opts.margin;
  const m = size / (count + margin * 2);
  const eyeBg = opts.transparent ? '#ffffff' : opts.bg;

  let shapes = '';
  const bgRect = opts.transparent ? '' : `<rect width="${size}" height="${size}" fill="${opts.bg}"/>`;

  // Los módulos cuadrados se agrupan en un solo path: archivo más liviano y sin costuras.
  let squarePath = '';
  for(let row = 0; row < count; row++){
    for(let col = 0; col < count; col++){
      if(!qr.isDark(row, col) || isInEyeZone(row, col, count)) continue;
      const x = (col + margin) * m;
      const y = (row + margin) * m;
      if(opts.moduleStyle === 'dots'){
        shapes += `<circle cx="${fmt(x + m / 2)}" cy="${fmt(y + m / 2)}" r="${fmt(m * SHAPE.dot)}"/>`;
      } else if(opts.moduleStyle === 'square'){
        squarePath += `M${fmt(x)} ${fmt(y)}h${fmt(m)}v${fmt(m)}h-${fmt(m)}z`;
      } else {
        const r = fmt(m * SHAPE.roundedModule);
        shapes += `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(m)}" height="${fmt(m)}" rx="${r}"/>`;
      }
    }
  }
  if(squarePath) shapes += `<path d="${squarePath}"/>`;

  let eyes = '';
  [[0, 0], [0, count - 7], [count - 7, 0]].forEach(([r, c])=>{
    const x = (c + margin) * m;
    const y = (r + margin) * m;
    const outer = m * 7;
    if(opts.eyeStyle === 'circle'){
      const cx = fmt(x + outer / 2), cy = fmt(y + outer / 2);
      eyes += `<circle cx="${cx}" cy="${cy}" r="${fmt(outer / 2)}" fill="${opts.fg}"/>`;
      eyes += `<circle cx="${cx}" cy="${cy}" r="${fmt(m * 2.5)}" fill="${eyeBg}"/>`;
      eyes += `<circle cx="${cx}" cy="${cy}" r="${fmt(m * 1.5)}" fill="${opts.fg}"/>`;
    } else {
      const [r1, r2, r3] = opts.eyeStyle === 'rounded' ? SHAPE.eyeRounded.map(v => fmt(v * m)) : [0, 0, 0];
      eyes += `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(outer)}" height="${fmt(outer)}" rx="${r1}" fill="${opts.fg}"/>`;
      eyes += `<rect x="${fmt(x + m)}" y="${fmt(y + m)}" width="${fmt(m * 5)}" height="${fmt(m * 5)}" rx="${r2}" fill="${eyeBg}"/>`;
      eyes += `<rect x="${fmt(x + m * 2)}" y="${fmt(y + m * 2)}" width="${fmt(m * 3)}" height="${fmt(m * 3)}" rx="${r3}" fill="${opts.fg}"/>`;
    }
  });

  let logo = '';
  let defs = '';
  if(logoImage && logoDataUrl){
    const { logoSize, lx, ly, pad } = logoBox(size, opts);
    if(opts.logoBg){
      const fill = opts.transparent ? '#ffffff' : opts.bg;
      logo += opts.logoRound
        ? `<circle cx="${size / 2}" cy="${size / 2}" r="${fmt((logoSize + pad) / 2)}" fill="${fill}"/>`
        : `<rect x="${fmt(lx - pad / 2)}" y="${fmt(ly - pad / 2)}" width="${fmt(logoSize + pad)}" height="${fmt(logoSize + pad)}" rx="${fmt((logoSize + pad) * 0.18)}" fill="${fill}"/>`;
    }
    defs = `<defs><clipPath id="logoClip">${opts.logoRound
      ? `<circle cx="${size / 2}" cy="${size / 2}" r="${fmt(logoSize / 2)}"/>`
      : `<rect x="${fmt(lx)}" y="${fmt(ly)}" width="${fmt(logoSize)}" height="${fmt(logoSize)}" rx="${fmt(logoSize * 0.12)}"/>`}</clipPath></defs>`;
    logo += `<image href="${logoDataUrl}" x="${fmt(lx)}" y="${fmt(ly)}" width="${fmt(logoSize)}" height="${fmt(logoSize)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip)"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="${opts.moduleStyle === 'square' ? 'crispEdges' : 'geometricPrecision'}">${defs}${bgRect}<g fill="${opts.fg}">${shapes}</g>${eyes}${logo}</svg>`;
}

function downloadSvg(){
  if(!hasContent()) return;
  const svg = buildSvg();
  if(!svg) return;
  const url = URL.createObjectURL(new Blob([svg], { type:'image/svg+xml' }));
  triggerDownload(url, 'mi-qr.svg');
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
  showToast('QR descargado como SVG');
}

/* ---------------- Deslizadores con relleno ---------------- */
function syncRange(el){
  const min = parseFloat(el.min) || 0, max = parseFloat(el.max) || 100;
  el.style.setProperty('--p', ((parseFloat(el.value) - min) / (max - min) * 100) + '%');
}
function syncAllRanges(){ document.querySelectorAll('input[type="range"]').forEach(syncRange); }

/* ---------------- Recordar el diseño ---------------- */
const SAVED_FIELDS = ['inputUrl','inputText','wifiSsid','wifiSec','vcName','vcPhone','vcEmail','vcOrg',
  'moduleStyle','eyeStyle','fgColor','bgColor','errorLevel','sizeRange','marginRange','logoSizeRange'];
const SAVED_TOGGLES = ['transparentBgToggle','logoBgToggle','logoRoundToggle','wifiHidden'];
let designReady = false;

function saveDesign(){
  if(!designReady) return;
  const d = readJSON(DESIGN_KEY);
  d.type = currentContentType;
  d.fields = {};
  SAVED_FIELDS.forEach(id => { d.fields[id] = $(id).value; });
  SAVED_TOGGLES.forEach(id => { d.fields[id] = $(id).checked; });
  writeJSON(DESIGN_KEY, d);
}
function restoreDesign(){
  const d = readJSON(DESIGN_KEY);
  if(d.fields){
    SAVED_FIELDS.forEach(id => { if(typeof d.fields[id] === 'string') $(id).value = d.fields[id]; });
    SAVED_TOGGLES.forEach(id => { if(typeof d.fields[id] === 'boolean') $(id).checked = d.fields[id]; });
  }
  if(d.type) currentContentType = d.type;
  $('fgColorVal').textContent = $('fgColor').value.toUpperCase();
  $('bgColorVal').textContent = $('bgColor').value.toUpperCase();
  $('sizeVal').textContent = $('sizeRange').value + ' px';
  $('marginVal').textContent = pluralModules($('marginRange').value);
  $('logoSizeVal').textContent = $('logoSizeRange').value + ' %';
}
const pr = new Intl.PluralRules('es');
function pluralModules(n){ return `${n} ${pr.select(Number(n)) === 'one' ? 'módulo' : 'módulos'}`; }

/* ---------------- Listeners de personalización ---------------- */
function initStyleListeners(){
  const liveInputs = [
    'inputUrl','inputText','wifiSsid','wifiPass','wifiSec','wifiHidden',
    'vcName','vcPhone','vcEmail','vcOrg',
    'moduleStyle','eyeStyle','errorLevel','logoBgToggle','logoRoundToggle','transparentBgToggle'
  ];
  liveInputs.forEach(id=>{
    const el = $(id);
    el.addEventListener('input', scheduleRender);
    el.addEventListener('change', scheduleRender);
  });

  const bind = (id, valId, format)=>{
    const el = $(id), out = $(valId);
    el.addEventListener('input', ()=>{
      out.textContent = format(el.value);
      if(el.type === 'range') syncRange(el);
      scheduleRender();
    });
  };
  bind('fgColor', 'fgColorVal', v => v.toUpperCase());
  bind('bgColor', 'bgColorVal', v => v.toUpperCase());
  bind('sizeRange', 'sizeVal', v => v + ' px');
  bind('marginRange', 'marginVal', pluralModules);
  bind('logoSizeRange', 'logoSizeVal', v => v + ' %');

  $('downloadPng').addEventListener('click', downloadPng);
  $('downloadSvg').addEventListener('click', downloadSvg);
  $('copyPng').addEventListener('click', copyPng);
}

/* ---------------- Init ---------------- */
window.addEventListener('DOMContentLoaded', ()=>{
  initA11y();
  initDrawers();
  restoreDesign();
  initCollapse();
  initContentTabs();
  initLogo();
  initStyleListeners();
  syncAllRanges();
  designReady = true;
  renderQR();
});
