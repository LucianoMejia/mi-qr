const ACCENTS = ["#3B4B8C","#2E7D5B","#C6512E","#A34D74","#B37B1E","#6A4FA0","#2E7C8C"];
const A11Y_KEY = "mi_qr_a11y_v1";

function showFatalError(msg){
  const b = document.getElementById('errBanner');
  if(!b) return;
  b.style.display = 'block';
  b.textContent = '⚠ ' + msg;
}
window.addEventListener('error', (e)=>{
  showFatalError('Ocurrió un error: ' + (e.message || 'desconocido'));
});
window.addEventListener('unhandledrejection', (e)=>{
  showFatalError('Ocurrió un error: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
});

function showToast(msg){
  const old = document.querySelector('.toast');
  if(old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 3200);
}

/* ---------------- Accesibilidad (tema, acento, contraste, movimiento) ---------------- */
function loadA11y(){
  try{ return JSON.parse(localStorage.getItem(A11Y_KEY)) || {}; }catch(e){ return {}; }
}
function saveA11y(state){
  try{ localStorage.setItem(A11Y_KEY, JSON.stringify(state)); }catch(e){}
}
function initA11y(){
  const state = loadA11y();
  const body = document.body;

  if(state.dark) body.classList.add('dark');
  if(state.contrast) body.classList.add('high-contrast');
  if(state.motion) body.classList.add('reduce-motion');
  if(state.fontScale) document.documentElement.style.fontSize = (16 * state.fontScale) + 'px';
  if(state.accent) document.documentElement.style.setProperty('--accent', state.accent);

  document.getElementById('darkToggle').checked = !!state.dark;
  document.getElementById('contrastToggle').checked = !!state.contrast;
  document.getElementById('motionToggle').checked = !!state.motion;
  document.getElementById('fontScaleSelect').value = state.fontScale || 1;

  const swatchWrap = document.getElementById('swatches');
  ACCENTS.forEach(color=>{
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = color;
    if((state.accent || ACCENTS[0]) === color) sw.classList.add('selected');
    sw.addEventListener('click', ()=>{
      document.documentElement.style.setProperty('--accent', color);
      [...swatchWrap.children].forEach(c=>c.classList.remove('selected'));
      sw.classList.add('selected');
      const s = loadA11y(); s.accent = color; saveA11y(s);
    });
    swatchWrap.appendChild(sw);
  });

  document.getElementById('darkToggle').addEventListener('change', (e)=>{
    body.classList.toggle('dark', e.target.checked);
    const s = loadA11y(); s.dark = e.target.checked; saveA11y(s);
    renderQR();
  });
  document.getElementById('contrastToggle').addEventListener('change', (e)=>{
    body.classList.toggle('high-contrast', e.target.checked);
    const s = loadA11y(); s.contrast = e.target.checked; saveA11y(s);
  });
  document.getElementById('motionToggle').addEventListener('change', (e)=>{
    body.classList.toggle('reduce-motion', e.target.checked);
    const s = loadA11y(); s.motion = e.target.checked; saveA11y(s);
  });
  document.getElementById('fontScaleSelect').addEventListener('change', (e)=>{
    document.documentElement.style.fontSize = (16 * parseFloat(e.target.value)) + 'px';
    const s = loadA11y(); s.fontScale = parseFloat(e.target.value); saveA11y(s);
  });
}

function initDrawers(){
  const overlay = document.getElementById('overlay');
  const drawer = document.getElementById('drawer');
  document.getElementById('openCustomize').addEventListener('click', ()=>{
    overlay.classList.add('open'); drawer.classList.add('open');
  });
  document.getElementById('closeDrawer').addEventListener('click', ()=>{
    overlay.classList.remove('open'); drawer.classList.remove('open');
  });
  overlay.addEventListener('click', ()=>{
    overlay.classList.remove('open'); drawer.classList.remove('open');
  });

  const helpOverlay = document.getElementById('helpOverlay');
  const helpDrawer = document.getElementById('helpDrawer');
  document.getElementById('openHelp').addEventListener('click', ()=>{
    helpOverlay.classList.add('open'); helpDrawer.classList.add('open');
  });
  document.getElementById('closeHelpDrawer').addEventListener('click', ()=>{
    helpOverlay.classList.remove('open'); helpDrawer.classList.remove('open');
  });
  helpOverlay.addEventListener('click', ()=>{
    helpOverlay.classList.remove('open'); helpDrawer.classList.remove('open');
  });
}

/* ---------------- Panel de estilo colapsable ---------------- */
function initCollapse(){
  const btn = document.getElementById('collapseStyleBtn');
  const body = document.getElementById('styleBody');
  const icon = document.getElementById('collapseStyleIcon');
  btn.addEventListener('click', ()=>{
    const collapsed = body.classList.toggle('collapsed');
    btn.classList.toggle('collapsed', collapsed);
    icon.textContent = collapsed ? '▸' : '▾';
  });
}

/* ---------------- Tabs de contenido ---------------- */
let currentContentType = 'url';
function initContentTabs(){
  const tabs = document.querySelectorAll('#contentTabs .tab');
  const panels = {
    url: document.getElementById('fieldsUrl'),
    text: document.getElementById('fieldsText'),
    wifi: document.getElementById('fieldsWifi'),
    vcard: document.getElementById('fieldsVcard'),
  };
  tabs.forEach(tab=>{
    tab.addEventListener('click', ()=>{
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      currentContentType = tab.dataset.type;
      Object.entries(panels).forEach(([key, el])=>{
        el.hidden = key !== currentContentType;
      });
      renderQR();
    });
  });
}

function escapeVCard(v){
  return (v || '').replace(/([,;])/g, '\\$1');
}

function buildPayload(){
  if(currentContentType === 'url'){
    let v = document.getElementById('inputUrl').value.trim();
    if(v && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) v = 'https://' + v;
    return v;
  }
  if(currentContentType === 'text'){
    return document.getElementById('inputText').value;
  }
  if(currentContentType === 'wifi'){
    const ssid = document.getElementById('wifiSsid').value.trim();
    const pass = document.getElementById('wifiPass').value;
    const sec = document.getElementById('wifiSec').value;
    if(!ssid) return '';
    return `WIFI:T:${sec};S:${ssid};${sec === 'nopass' ? '' : 'P:' + pass + ';'};;`;
  }
  if(currentContentType === 'vcard'){
    const name = document.getElementById('vcName').value.trim();
    const phone = document.getElementById('vcPhone').value.trim();
    const email = document.getElementById('vcEmail').value.trim();
    const org = document.getElementById('vcOrg').value.trim();
    if(!name) return '';
    return `BEGIN:VCARD\nVERSION:3.0\nN:${escapeVCard(name)}\nFN:${escapeVCard(name)}\n${org ? 'ORG:' + escapeVCard(org) + '\n' : ''}${phone ? 'TEL:' + escapeVCard(phone) + '\n' : ''}${email ? 'EMAIL:' + escapeVCard(email) + '\n' : ''}END:VCARD`;
  }
  return '';
}

/* ---------------- Logo ---------------- */
let logoImage = null;
function initLogo(){
  const input = document.getElementById('logoInput');
  const preview = document.getElementById('logoPreview');
  const removeBtn = document.getElementById('logoRemoveBtn');

  input.addEventListener('change', ()=>{
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = new Image();
      img.onload = ()=>{
        logoImage = img;
        preview.style.backgroundImage = `url(${e.target.result})`;
        preview.hidden = false;
        removeBtn.hidden = false;
        document.getElementById('errorLevel').value = 'H';
        renderQR();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener('click', ()=>{
    logoImage = null;
    input.value = '';
    preview.hidden = true;
    removeBtn.hidden = true;
    renderQR();
  });
}

/* ---------------- Dibujo del QR en canvas ---------------- */
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
  ctx.beginPath();
  if(shape === 'square'){
    ctx.rect(x, y, size, size);
  } else if(shape === 'dots'){
    const r = size / 2;
    ctx.arc(x + r, y + r, r * 0.92, 0, Math.PI * 2);
  } else {
    // "rounded": radio generoso para que se note claramente redondeado
    roundedRectPath(ctx, x, y, size, size, size * 0.5);
    ctx.fill();
    return;
  }
  ctx.closePath();
  ctx.fill();
}

function isInEyeZone(row, col, count){
  const inCorner = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 7;
  return (
    inCorner(row, col) ||
    inCorner(row, col - (count - 7)) ||
    inCorner(row - (count - 7), col)
  );
}

// Dibuja cada ojo como TRES formas rellenas independientes (exterior, anillo
// de fondo, interior). No usamos "recorte" (destination-out): eso dejaba el
// anillo del medio realmente transparente, y al exportar a PNG se veían
// esos cuadros raros en vez del color de fondo.
function drawEye(ctx, baseX, baseY, moduleSize, shape, fgColor, bgColor){
  const outer = moduleSize * 7;
  const mid = moduleSize * 5;
  const inner = moduleSize * 3;
  const cx = baseX + outer / 2;
  const cy = baseY + outer / 2;

  if(shape === 'circle'){
    ctx.fillStyle = fgColor;
    ctx.beginPath(); ctx.arc(cx, cy, outer / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bgColor;
    ctx.beginPath(); ctx.arc(cx, cy, mid / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fgColor;
    ctx.beginPath(); ctx.arc(cx, cy, inner / 2, 0, Math.PI * 2); ctx.fill();
  } else if(shape === 'rounded'){
    ctx.fillStyle = fgColor;
    roundedRectPath(ctx, baseX, baseY, outer, outer, moduleSize * 1.8); ctx.fill();
    ctx.fillStyle = bgColor;
    roundedRectPath(ctx, baseX + moduleSize, baseY + moduleSize, mid, mid, moduleSize * 1.2); ctx.fill();
    ctx.fillStyle = fgColor;
    roundedRectPath(ctx, baseX + moduleSize * 2, baseY + moduleSize * 2, inner, inner, moduleSize * 0.8); ctx.fill();
  } else {
    ctx.fillStyle = fgColor;
    ctx.fillRect(baseX, baseY, outer, outer);
    ctx.fillStyle = bgColor;
    ctx.fillRect(baseX + moduleSize, baseY + moduleSize, mid, mid);
    ctx.fillStyle = fgColor;
    ctx.fillRect(baseX + moduleSize * 2, baseY + moduleSize * 2, inner, inner);
  }
}

function generateMatrix(){
  const payload = buildPayload();
  if(!payload) return null;
  const level = document.getElementById('errorLevel').value;
  const qr = qrcode(0, level);
  qr.addData(payload);
  qr.make();
  return qr;
}

function paintQR(ctx, size, opts){
  const qr = generateMatrix();
  ctx.clearRect(0, 0, size, size);

  if(!qr){
    ctx.fillStyle = opts.transparent ? 'rgba(0,0,0,0)' : opts.bg;
    if(!opts.transparent) ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#9A9DB4';
    ctx.font = '15px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Completa el contenido para ver el QR', size/2, size/2);
    return;
  }

  const count = qr.getModuleCount();
  const margin = opts.margin;
  const totalModules = count + margin * 2;
  const moduleSize = size / totalModules;

  if(!opts.transparent){
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, size, size);
  }

  ctx.fillStyle = opts.fg;
  // Si el fondo es transparente, los anillos de "hueco" de los ojos igual
  // necesitan un color sólido para verse bien: usamos blanco por defecto.
  const eyeBg = opts.transparent ? '#ffffff' : opts.bg;

  for(let row = 0; row < count; row++){
    for(let col = 0; col < count; col++){
      if(!qr.isDark(row, col)) continue;
      if(isInEyeZone(row, col, count)) continue;
      const x = (col + margin) * moduleSize;
      const y = (row + margin) * moduleSize;
      drawModule(ctx, x, y, moduleSize, opts.moduleStyle);
    }
  }

  const eyePositions = [
    [0, 0],
    [0, count - 7],
    [count - 7, 0]
  ];
  eyePositions.forEach(([r, c])=>{
    const x = (c + margin) * moduleSize;
    const y = (r + margin) * moduleSize;
    drawEye(ctx, x, y, moduleSize, opts.eyeStyle, opts.fg, eyeBg);
  });

  if(logoImage){
    const logoRatio = opts.logoSize / 100;
    const logoSize = size * logoRatio;
    const lx = (size - logoSize) / 2;
    const ly = (size - logoSize) / 2;

    if(opts.logoBg){
      const pad = logoSize * 0.14;
      ctx.save();
      ctx.fillStyle = opts.transparent ? '#ffffff' : opts.bg;
      if(opts.logoRound){
        ctx.beginPath();
        ctx.arc(size/2, size/2, (logoSize + pad)/2, 0, Math.PI*2);
        ctx.fill();
      } else {
        const r = 10;
        const x = lx - pad/2, y = ly - pad/2, w = logoSize + pad, h = logoSize + pad;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    if(opts.logoRound){
      ctx.beginPath();
      ctx.arc(size/2, size/2, logoSize/2, 0, Math.PI*2);
      ctx.clip();
    }
    ctx.drawImage(logoImage, lx, ly, logoSize, logoSize);
    ctx.restore();
  }
}

function getOptions(){
  return {
    fg: document.getElementById('fgColor').value,
    bg: document.getElementById('bgColor').value,
    transparent: document.getElementById('transparentBgToggle').checked,
    moduleStyle: document.getElementById('moduleStyle').value,
    eyeStyle: document.getElementById('eyeStyle').value,
    margin: parseInt(document.getElementById('marginRange').value, 10),
    logoSize: parseInt(document.getElementById('logoSizeRange').value, 10),
    logoBg: document.getElementById('logoBgToggle').checked,
    logoRound: document.getElementById('logoRoundToggle').checked,
  };
}

function renderQR(){
  const canvas = document.getElementById('qrCanvas');
  const size = parseInt(document.getElementById('sizeRange').value, 10);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  paintQR(ctx, size, getOptions());
}

/* ---------------- Descargas ---------------- */
function downloadPng(){
  const qr = generateMatrix();
  if(!qr){ showToast('Completa el contenido antes de descargar'); return; }
  const canvas = document.getElementById('qrCanvas');
  const link = document.createElement('a');
  link.download = 'mi-qr.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('QR descargado como PNG');
}

function buildSvg(){
  const qr = generateMatrix();
  if(!qr) return null;
  const opts = getOptions();
  const size = parseInt(document.getElementById('sizeRange').value, 10);
  const count = qr.getModuleCount();
  const margin = opts.margin;
  const totalModules = count + margin * 2;
  const moduleSize = size / totalModules;

  let shapes = '';
  const bgRect = opts.transparent ? '' : `<rect width="${size}" height="${size}" fill="${opts.bg}"/>`;

  for(let row = 0; row < count; row++){
    for(let col = 0; col < count; col++){
      if(!qr.isDark(row, col)) continue;
      if(isInEyeZone(row, col, count)) continue;
      const x = (col + margin) * moduleSize;
      const y = (row + margin) * moduleSize;
      if(opts.moduleStyle === 'dots'){
        const r = moduleSize/2*0.86;
        shapes += `<circle cx="${x + moduleSize/2}" cy="${y + moduleSize/2}" r="${r}" fill="${opts.fg}"/>`;
      } else if(opts.moduleStyle === 'square'){
        shapes += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${opts.fg}"/>`;
      } else {
        const r = moduleSize * 0.35;
        shapes += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" rx="${r}" ry="${r}" fill="${opts.fg}"/>`;
      }
    }
  }

  const eyePositions = [[0,0],[0,count-7],[count-7,0]];
  eyePositions.forEach(([r,c])=>{
    const x = (c + margin) * moduleSize;
    const y = (r + margin) * moduleSize;
    const outer = moduleSize * 7;
    if(opts.eyeStyle === 'circle'){
      shapes += `<circle cx="${x+outer/2}" cy="${y+outer/2}" r="${outer/2}" fill="${opts.fg}"/>`;
      shapes += `<circle cx="${x+outer/2}" cy="${y+outer/2}" r="${moduleSize*2.5}" fill="${opts.transparent ? '#ffffff' : opts.bg}"/>`;
      shapes += `<circle cx="${x+outer/2}" cy="${y+outer/2}" r="${moduleSize*1.5}" fill="${opts.fg}"/>`;
    } else {
      const rad = opts.eyeStyle === 'rounded' ? moduleSize * 1.6 : 0;
      const radIn = opts.eyeStyle === 'rounded' ? moduleSize * 0.8 : 0;
      shapes += `<rect x="${x}" y="${y}" width="${outer}" height="${outer}" rx="${rad}" ry="${rad}" fill="${opts.fg}"/>`;
      shapes += `<rect x="${x+moduleSize}" y="${y+moduleSize}" width="${moduleSize*5}" height="${moduleSize*5}" rx="${rad*0.7}" ry="${rad*0.7}" fill="${opts.transparent ? '#ffffff' : opts.bg}"/>`;
      shapes += `<rect x="${x+moduleSize*2}" y="${y+moduleSize*2}" width="${moduleSize*3}" height="${moduleSize*3}" rx="${radIn}" ry="${radIn}" fill="${opts.fg}"/>`;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bgRect}${shapes}</svg>`;
}

function downloadSvg(){
  const svg = buildSvg();
  if(!svg){ showToast('Completa el contenido antes de descargar'); return; }
  if(logoImage){ showToast('El SVG no incluye el logo; usa PNG para eso'); }
  const blob = new Blob([svg], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = 'mi-qr.svg';
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------------- Listeners de personalización ---------------- */
function initStyleListeners(){
  const liveInputs = [
    'inputUrl','inputText','wifiSsid','wifiPass','wifiSec',
    'vcName','vcPhone','vcEmail','vcOrg',
    'moduleStyle','eyeStyle','errorLevel','logoBgToggle','logoRoundToggle','transparentBgToggle'
  ];
  liveInputs.forEach(id=>{
    const el = document.getElementById(id);
    el.addEventListener('input', renderQR);
    el.addEventListener('change', renderQR);
  });

  const fg = document.getElementById('fgColor');
  const fgVal = document.getElementById('fgColorVal');
  fg.addEventListener('input', ()=>{ fgVal.textContent = fg.value.toUpperCase(); renderQR(); });

  const bg = document.getElementById('bgColor');
  const bgVal = document.getElementById('bgColorVal');
  bg.addEventListener('input', ()=>{ bgVal.textContent = bg.value.toUpperCase(); renderQR(); });

  const size = document.getElementById('sizeRange');
  const sizeVal = document.getElementById('sizeVal');
  size.addEventListener('input', ()=>{ sizeVal.textContent = size.value + 'px'; renderQR(); });

  const margin = document.getElementById('marginRange');
  const marginVal = document.getElementById('marginVal');
  margin.addEventListener('input', ()=>{ marginVal.textContent = margin.value + ' módulos'; renderQR(); });

  const logoSize = document.getElementById('logoSizeRange');
  const logoSizeVal = document.getElementById('logoSizeVal');
  logoSize.addEventListener('input', ()=>{ logoSizeVal.textContent = logoSize.value + '%'; renderQR(); });

  document.getElementById('downloadPng').addEventListener('click', downloadPng);
  document.getElementById('downloadSvg').addEventListener('click', downloadSvg);
}

/* ---------------- Init ---------------- */
window.addEventListener('DOMContentLoaded', ()=>{
  initA11y();
  initDrawers();
  initCollapse();
  initContentTabs();
  initLogo();
  initStyleListeners();
  renderQR();
});