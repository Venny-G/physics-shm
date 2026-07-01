const canvas = document.querySelector('#simCanvas');
const ctx = canvas.getContext('2d');
const qs = (s) => document.querySelector(s);

const ui = {
  equationText: qs('#equationText'),
  boundaryWarning: qs('#boundaryWarning'),
  pausePlayback: qs('#pausePlayback'),
  slowPlayback: qs('#slowPlayback'),
  normalPlayback: qs('#normalPlayback'),
  reset: qs('#reset'),
};

const controls = {
  mass: qs('#bMass'),
  spring: qs('#bSpring'),
  x0: qs('#bx0'),
  xT: qs('#bxT'),
  targetTime: qs('#bT'),
};

const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5173' : '';
const SERVER_HELP = 'Could not reach Python server. Run python3 server.py, then open http://127.0.0.1:5173/index.html';
const ACTIVE_SIMULATION = 'day01_boundary_value';

// state
let solution = null;
let running = true;
let playbackScale = 1;
let simTime = 0;
let lastFrame = performance.now();
let solveTimer = null;
let currentAbort = null;
let pendingId = 0;
let solveError = '';

const CONST = {
  GRID_GAP: 40,
  SPRING_COILS: 14,
  SPRING_AMP: 14,
  SPRING_LEAD: 22,
};

const inputNumber = (name) => {
  const v = Number(controls[name].value);
  return Number.isFinite(v) ? v : Number(controls[name].defaultValue);
};

const fetchSolve = async (params, signal) => {
  const res = await fetch(`${API_BASE}/api/solve?${params.toString()}`, { signal });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, payload: json };
};

function solveInBrowser(params) {
  const mass = Number(params.get('m') || 1);
  const spring = Number(params.get('k') || 4);
  const x0 = Number(params.get('x0') || 1);
  const xT = Number(params.get('xT') || -1);
  const targetTime = Number(params.get('T') || 1.2);
  if (mass <= 0 || spring <= 0 || targetTime <= 0) throw new Error('m, k, and T must be positive.');

  const omega = Math.sqrt(spring / mass);
  const period = 2 * Math.PI / omega;
  const denominator = Math.sin(omega * targetTime);
  let warning = 'Static page fallback: using the browser copy of the Day 1 solve.';
  let v0 = 0;
  if (Math.abs(denominator) < 0.035) {
    warning = 'Near singular boundary time: target may be impossible or non-unique.';
  } else {
    v0 = omega * (xT - x0 * Math.cos(omega * targetTime)) / denominator;
  }

  const amplitude = Math.hypot(x0, v0 / omega);
  const phase = Math.atan2(-v0 / omega, x0);
  const duration = Math.max(period * 2, targetTime * 1.25, 1);
  const points = [];
  for (let i = 0; i < 600; i++) {
    const t = duration * i / 599;
    const angle = omega * t + phase;
    const x = amplitude * Math.cos(angle);
    const v = -amplitude * omega * Math.sin(angle);
    const a = -(omega ** 2) * x;
    points.push({ t, x, v, a, force: -spring * x });
  }

  return {
    input: { mass, spring, x0, xT, targetTime },
    omega,
    period,
    v0,
    amplitude,
    phase,
    duration,
    warning,
    points,
    equationText: [
      'Browser fallback solve:',
      "m x'' = -k x",
      `x'' + (${omega.toFixed(3)})^2 x = 0`,
      '',
      'Boundary values:',
      `x(0) = ${x0.toFixed(3)}`,
      `x(${targetTime.toFixed(3)}) = ${xT.toFixed(3)}`,
      '',
      'Solve missing initial velocity:',
      'v0 = w0 * (xT - x0 cos(w0 T)) / sin(w0 T)',
      `v0 = ${v0.toFixed(3)}`,
      '',
      'Convert to lecture-note form:',
      'A = sqrt(x0^2 + (v0/w0)^2)',
      'phi = atan2(-v0/w0, x0)',
      `A = ${amplitude.toFixed(3)}`,
      `phi = ${phase.toFixed(3)} rad`,
      '',
      'Position:',
      'x(t) = A cos(w0 t + phi)',
      `x(t) = ${amplitude.toFixed(3)} cos(${omega.toFixed(3)}t + ${phase.toFixed(3)})`,
    ].join('\n'),
  };
}

// debounce + AbortController
function scheduleSolve(delay = 250) {
  clearTimeout(solveTimer);
  solveTimer = setTimeout(async () => {
    if (currentAbort) currentAbort.abort();
    currentAbort = new AbortController();
    const id = ++pendingId;
    const params = new URLSearchParams({ sim: ACTIVE_SIMULATION, m: inputNumber('mass'), k: inputNumber('spring'), x0: inputNumber('x0'), xT: inputNumber('xT'), T: inputNumber('targetTime') });
    const { ok, payload } = await fetchSolve(params, currentAbort.signal).catch((err) => {
      if (err?.name === 'AbortError') return { ok: false, payload: { error: '' } };
      return { ok: true, payload: solveInBrowser(params) };
    });
    if (id !== pendingId) return;
    if (!ok) {
      solveError = payload?.error || 'Python solve failed.';
      solution = null;
      ui.boundaryWarning.textContent = solveError;
      return;
    }
    solveError = '';
    solution = payload;
    ui.equationText.textContent = payload.equationText || '';
    ui.boundaryWarning.textContent = payload.warning || '';
    simTime = 0;
    lastFrame = performance.now();
    currentAbort = null;
  }, delay);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) (canvas.width = w, canvas.height = h);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return rect;
}

function drawGrid(w, h) {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1;
  for (let x = CONST.GRID_GAP; x < w; x += CONST.GRID_GAP) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = CONST.GRID_GAP; y < h; y += CONST.GRID_GAP) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
}

function pointAt(time) {
  if (!solution?.points?.length) return null;
  const wrapped = time % solution.duration;
  const idx = Math.round((wrapped / solution.duration) * (solution.points.length - 1));
  return solution.points[Math.min(solution.points.length - 1, idx)];
}

function drawSpring(x1, y, x2) {
  ctx.strokeStyle = '#24292f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + CONST.SPRING_LEAD, y);
  for (let i = 0; i <= CONST.SPRING_COILS * 2; i++) {
    const p = i / (CONST.SPRING_COILS * 2);
    const x = x1 + CONST.SPRING_LEAD + p * (x2 - x1 - 2 * CONST.SPRING_LEAD);
    ctx.lineTo(x, y + (i % 2 === 0 ? -CONST.SPRING_AMP : CONST.SPRING_AMP));
  }
  ctx.lineTo(x2, y); ctx.stroke();
}

function drawMassSpring(rect, cur) {
  const y = rect.height * 0.34; const wallX = 70; const originX = rect.width * 0.5; const scale = Math.min(90, rect.width / 9);
  const massX = originX + cur.x * scale;
  ctx.fillStyle = '#eaeef2'; ctx.fillRect(wallX - 16, y - 70, 20, 140);
  ctx.fillStyle = '#24292f'; ctx.fillRect(wallX - 4, y - 70, 4, 140);
  drawSpring(wallX, y, massX - 28);
  ctx.fillStyle = '#d1242f'; ctx.strokeStyle = '#24292f'; ctx.lineWidth = 1; ctx.fillRect(massX - 28, y - 24, 56, 48); ctx.strokeRect(massX - 28, y - 24, 56, 48);
  ctx.strokeStyle = '#0969da'; ctx.beginPath(); ctx.moveTo(originX, y + 38); ctx.lineTo(originX, y + 68); ctx.stroke();
  drawText(`x=${cur.x.toFixed(3)} v=${cur.v.toFixed(3)} a=${cur.a.toFixed(3)} F=${cur.force.toFixed(3)}`, 24, 30);
}

function drawPositionGraph(rect) {
  if (!solution?.points?.length) return;
  const gx = 52; const gy = rect.height - 155; const gw = rect.width - 104; const gh = 95;
  const maxAbs = Math.max(1, ...solution.points.map(p => Math.abs(p.x)));
  ctx.strokeStyle = '#d0d7de'; ctx.strokeRect(gx, gy, gw, gh);
  ctx.beginPath(); ctx.moveTo(gx, gy + gh / 2); ctx.lineTo(gx + gw, gy + gh / 2); ctx.stroke();
  ctx.strokeStyle = '#0969da'; ctx.lineWidth = 2; ctx.beginPath();
  solution.points.forEach((p, i) => { const px = gx + (p.t / solution.duration) * gw; const py = gy + gh / 2 - (p.x / maxAbs) * (gh * 0.42); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.stroke();
  const markerX = gx + ((simTime % solution.duration) / solution.duration) * gw;
  ctx.strokeStyle = '#d1242f'; ctx.beginPath(); ctx.moveTo(markerX, gy); ctx.lineTo(markerX, gy + gh); ctx.stroke(); drawText('x(t)', gx, gy - 8);
}

function drawTargetMarker(rect) {
  if (!solution) return;
  const target = solution.input?.targetTime;
  if (target == null || target > solution.duration) return;
  const gx = 52; const gy = rect.height - 155; const gw = rect.width - 104; const markerX = gx + (target / solution.duration) * gw;
  ctx.strokeStyle = '#8250df'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(markerX, gy); ctx.lineTo(markerX, gy + 95); ctx.stroke(); ctx.setLineDash([]); drawText('T', markerX + 4, gy + 14, '#8250df');
}

function drawText(text, x, y, color = '#24292f') { ctx.fillStyle = color; ctx.fillText(text, x, y); }

function setPlayback(state) { running = state !== 'pause'; playbackScale = state === 'slow' ? 0.35 : 1; lastFrame = performance.now(); ui.pausePlayback.classList.toggle('active', state === 'pause'); ui.slowPlayback.classList.toggle('active', state === 'slow'); ui.normalPlayback.classList.toggle('active', state === 'normal'); }

Object.values(controls).forEach(input => input.addEventListener('input', () => scheduleSolve()));
ui.pausePlayback.addEventListener('click', () => setPlayback('pause'));
ui.slowPlayback.addEventListener('click', () => setPlayback('slow'));
ui.normalPlayback.addEventListener('click', () => setPlayback('normal'));
ui.reset.addEventListener('click', () => { simTime = 0; lastFrame = performance.now(); });
window.addEventListener('resize', resizeCanvas);

// initial
scheduleSolve(0);
(function loop(){ const now = performance.now(); const dt = ((now - lastFrame) / 1000) * playbackScale; lastFrame = now; if (running) simTime += dt; const rect = resizeCanvas(); drawGrid(rect.width, rect.height); if (!solution) { drawText(solveError || 'waiting for Python solve...', 24, 34); requestAnimationFrame(loop); return; } const cur = pointAt(simTime); if (cur) drawMassSpring(rect, cur); drawPositionGraph(rect); drawTargetMarker(rect); requestAnimationFrame(loop); })();
