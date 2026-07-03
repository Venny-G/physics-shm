const canvas = document.querySelector('#simCanvas');
const ctx = canvas.getContext('2d');
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

const ui = {
  equationText: qs('#equationText'),
  boundaryWarning: qs('#boundaryWarning'),
  dampingWarning: qs('#dampingWarning'),
  boundaryControls: qs('#boundaryControls'),
  dampingControls: qs('#dampingControls'),
  pausePlayback: qs('#pausePlayback'),
  slowPlayback: qs('#slowPlayback'),
  normalPlayback: qs('#normalPlayback'),
  reset: qs('#reset'),
  dayTabs: qsa('.day-tabs button'),
  noteSheets: qsa('[data-note]'),
};

const controls = {
  boundary: {
    mass: qs('#bMass'),
    spring: qs('#bSpring'),
    x0: qs('#bx0'),
    xT: qs('#bxT'),
    targetTime: qs('#bT'),
  },
  damping: {
    mass: qs('#dMass'),
    spring: qs('#dSpring'),
    damping: qs('#dDamping'),
    x0: qs('#dx0'),
    v0: qs('#dv0'),
    duration: qs('#dDuration'),
  },
};

const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5173' : '';
const SIMS = {
  day01_boundary_value: {
    controls: 'boundary',
    warning: ui.boundaryWarning,
    fallback: solveBoundaryInBrowser,
  },
  day02_damping: {
    controls: 'damping',
    warning: ui.dampingWarning,
    fallback: solveDampingInBrowser,
  },
};

let activeSimulation = 'day01_boundary_value';
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

const inputNumber = (group, name) => {
  const input = controls[group][name];
  const v = Number(input.value);
  return Number.isFinite(v) ? v : Number(input.defaultValue);
};

const fetchSolve = async (params, signal) => {
  const res = await fetch(`${API_BASE}/api/solve?${params.toString()}`, { signal });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, payload: json };
};

function boundaryParams() {
  return new URLSearchParams({
    sim: 'day01_boundary_value',
    m: inputNumber('boundary', 'mass'),
    k: inputNumber('boundary', 'spring'),
    x0: inputNumber('boundary', 'x0'),
    xT: inputNumber('boundary', 'xT'),
    T: inputNumber('boundary', 'targetTime'),
  });
}

function dampingParams() {
  return new URLSearchParams({
    sim: 'day02_damping',
    m: inputNumber('damping', 'mass'),
    k: inputNumber('damping', 'spring'),
    b: inputNumber('damping', 'damping'),
    x0: inputNumber('damping', 'x0'),
    v0: inputNumber('damping', 'v0'),
    duration: inputNumber('damping', 'duration'),
  });
}

function paramsForActiveSimulation() {
  return activeSimulation === 'day02_damping' ? dampingParams() : boundaryParams();
}

function solveBoundaryInBrowser(params) {
  const mass = Number(params.get('m') || 1);
  const spring = Number(params.get('k') || 4);
  const x0 = Number(params.get('x0') || 1);
  const xT = Number(params.get('xT') || -1);
  const targetTime = Number(params.get('T') || 1.2);
  if (mass <= 0 || spring <= 0 || targetTime <= 0) throw new Error('m, k, and T must be positive.');

  const omega = Math.sqrt(spring / mass);
  const period = 2 * Math.PI / omega;
  const denominator = Math.sin(omega * targetTime);
  let warning = '';
  let v0 = 0;
  if (Math.abs(denominator) < 0.035) {
    warning = 'Near singular boundary time: target may be impossible or non-unique.';
  } else {
    v0 = omega * (xT - x0 * Math.cos(omega * targetTime)) / denominator;
  }

  const amplitude = Math.hypot(x0, v0 / omega);
  const phase = Math.atan2(-v0 / omega, x0);
  const duration = Math.max(period * 2, targetTime * 1.25, 1);
  const points = samplePoints(duration, (t) => {
    const angle = omega * t + phase;
    const x = amplitude * Math.cos(angle);
    const v = -amplitude * omega * Math.sin(angle);
    const a = -(omega ** 2) * x;
    return { t, x, v, a, force: -spring * x };
  });

  return {
    simulation: { id: 'day01_boundary_value', day: 1, title: 'Boundary-value SHM' },
    input: { mass, spring, x0, xT, targetTime },
    omega,
    period,
    v0,
    amplitude,
    phase,
    duration,
    loop: true,
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
      'Position:',
      'x(t) = A cos(w0 t + phi)',
      `x(t) = ${amplitude.toFixed(3)} cos(${omega.toFixed(3)}t + ${phase.toFixed(3)})`,
    ].join('\n'),
  };
}

function solveDampingInBrowser(params) {
  const mass = Number(params.get('m') || 1);
  const spring = Number(params.get('k') || 4);
  const damping = Number(params.get('b') || 0.8);
  const x0 = Number(params.get('x0') || 1);
  const v0 = Number(params.get('v0') || 0);
  const duration = Number(params.get('duration') || 8);
  if (mass <= 0 || spring <= 0 || duration <= 0) throw new Error('m, k, and duration must be positive.');
  if (damping < 0) throw new Error('damping must be non-negative.');

  const omega0 = Math.sqrt(spring / mass);
  const gamma = damping / (2 * mass);
  const caseName = dampingCase(gamma, omega0);
  const warning = caseName === 'undamped' ? 'b = 0, so this is undamped motion.' : '';
  const points = samplePoints(duration, (t) => {
    const state = dampingStateAt(t, x0, v0, gamma, omega0, caseName);
    const a = -(damping * state.v + spring * state.x) / mass;
    return { t, x: state.x, v: state.v, a, force: mass * a };
  });

  return {
    simulation: { id: 'day02_damping', day: 2, title: 'Damping' },
    input: { mass, spring, damping, x0, v0, duration },
    omega0,
    gamma,
    case: caseName,
    duration,
    loop: false,
    warning,
    points,
    equationText: dampingEquationText(omega0, gamma, caseName, x0, v0, warning, 'Browser fallback solve:'),
  };
}

function samplePoints(duration, fn, samples = 600) {
  const points = [];
  for (let i = 0; i < samples; i++) {
    points.push(fn((duration * i) / (samples - 1)));
  }
  return points;
}

function dampingCase(gamma, omega0) {
  if (gamma === 0) return 'undamped';
  if (Math.abs(gamma - omega0) < 1e-9) return 'critical';
  return gamma < omega0 ? 'underdamped' : 'overdamped';
}

function dampingStateAt(t, x0, v0, gamma, omega0, caseName) {
  if (caseName === 'undamped') {
    return {
      x: x0 * Math.cos(omega0 * t) + (v0 / omega0) * Math.sin(omega0 * t),
      v: -x0 * omega0 * Math.sin(omega0 * t) + v0 * Math.cos(omega0 * t),
    };
  }
  if (caseName === 'underdamped') {
    const omegaD = Math.sqrt(omega0 ** 2 - gamma ** 2);
    const a = x0;
    const b = (v0 + gamma * x0) / omegaD;
    const envelope = Math.exp(-gamma * t);
    const carrier = a * Math.cos(omegaD * t) + b * Math.sin(omegaD * t);
    const carrierPrime = -a * omegaD * Math.sin(omegaD * t) + b * omegaD * Math.cos(omegaD * t);
    return { x: envelope * carrier, v: envelope * (carrierPrime - gamma * carrier) };
  }
  if (caseName === 'critical') {
    const a = x0;
    const b = v0 + gamma * x0;
    const envelope = Math.exp(-gamma * t);
    const carrier = a + b * t;
    return { x: envelope * carrier, v: envelope * (b - gamma * carrier) };
  }
  const decay = Math.sqrt(gamma ** 2 - omega0 ** 2);
  const r1 = -gamma + decay;
  const r2 = -gamma - decay;
  const c1 = (v0 - r2 * x0) / (r1 - r2);
  const c2 = x0 - c1;
  return {
    x: c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t),
    v: c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t),
  };
}

function dampingEquationText(omega0, gamma, caseName, x0, v0, warning, heading) {
  const lines = [
    heading,
    "m x'' + b x' + kx = 0",
    "x'' + 2 gamma x' + omega0^2 x = 0",
    '',
    `omega0 = ${omega0.toFixed(3)}`,
    `gamma = ${gamma.toFixed(3)}`,
    `case = ${caseName}`,
    '',
    `x(0) = ${x0.toFixed(3)}`,
    `v(0) = ${v0.toFixed(3)}`,
  ];
  if (caseName === 'underdamped') {
    lines.push('', `omega_d = ${Math.sqrt(omega0 ** 2 - gamma ** 2).toFixed(3)}`, 'x(t) = e^(-gamma t)(A cos(omega_d t) + B sin(omega_d t))');
  } else if (caseName === 'critical') {
    lines.push('', 'x(t) = e^(-gamma t)(A + Bt)');
  } else if (caseName === 'overdamped') {
    lines.push('', 'x(t) = C1 e^(r1 t) + C2 e^(r2 t)');
  } else {
    lines.push('', 'x(t) = x0 cos(omega0 t) + (v0/omega0) sin(omega0 t)');
  }
  if (warning) lines.push('', `warning: ${warning}`);
  return lines.join('\n');
}

function scheduleSolve(delay = 250) {
  clearTimeout(solveTimer);
  solveTimer = setTimeout(async () => {
    if (currentAbort) currentAbort.abort();
    currentAbort = new AbortController();
    const id = ++pendingId;
    const params = paramsForActiveSimulation();
    const config = SIMS[activeSimulation];
    const { ok, payload } = await fetchSolve(params, currentAbort.signal).catch((err) => {
      if (err?.name === 'AbortError') return { ok: false, payload: { error: '' } };
      return { ok: true, payload: config.fallback(params) };
    });
    if (id !== pendingId) return;
    if (!ok) {
      if (!payload?.error) {
        applySolution(config.fallback(params));
        currentAbort = null;
        return;
      }
      solveError = payload?.error || 'Python solve failed.';
      solution = null;
      setWarning(solveError);
      return;
    }
    solveError = '';
    applySolution(payload);
    currentAbort = null;
  }, delay);
}

function applySolution(payload) {
  solution = payload;
  ui.equationText.textContent = payload.equationText || '';
  setWarning(payload.warning || '');
  simTime = 0;
  lastFrame = performance.now();
}

function setWarning(message) {
  ui.boundaryWarning.textContent = activeSimulation === 'day01_boundary_value' ? message : '';
  ui.dampingWarning.textContent = activeSimulation === 'day02_damping' ? message : '';
}

function setActiveSimulation(simulationId) {
  if (!SIMS[simulationId]) return;
  activeSimulation = simulationId;
  solution = null;
  solveError = '';
  ui.boundaryControls.classList.toggle('is-hidden', simulationId !== 'day01_boundary_value');
  ui.dampingControls.classList.toggle('is-hidden', simulationId !== 'day02_damping');
  ui.dayTabs.forEach((button) => {
    const isActive = button.dataset.sim === simulationId;
    button.classList.toggle('active', isActive);
    button.classList.toggle('ghost', !isActive);
  });
  ui.noteSheets.forEach((sheet) => sheet.classList.toggle('is-hidden', sheet.dataset.note !== simulationId));
  setWarning('');
  scheduleSolve(0);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return rect;
}

function drawGrid(w, h) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  for (let x = CONST.GRID_GAP; x < w; x += CONST.GRID_GAP) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = CONST.GRID_GAP; y < h; y += CONST.GRID_GAP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function currentPlotTime() {
  if (!solution) return 0;
  return solution.loop === false ? Math.min(simTime, solution.duration) : simTime % solution.duration;
}

function pointAt(time) {
  if (!solution?.points?.length) return null;
  const t = solution.loop === false ? Math.min(time, solution.duration) : time % solution.duration;
  const idx = Math.round((t / solution.duration) * (solution.points.length - 1));
  return solution.points[Math.min(solution.points.length - 1, idx)];
}

function drawSpring(x1, y, x2) {
  ctx.strokeStyle = '#24292f';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x1 + CONST.SPRING_LEAD, y);
  for (let i = 0; i <= CONST.SPRING_COILS * 2; i++) {
    const p = i / (CONST.SPRING_COILS * 2);
    const x = x1 + CONST.SPRING_LEAD + p * (x2 - x1 - 2 * CONST.SPRING_LEAD);
    ctx.lineTo(x, y + (i % 2 === 0 ? -CONST.SPRING_AMP : CONST.SPRING_AMP));
  }
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function drawMassSpring(rect, cur) {
  const y = rect.height * 0.34;
  const wallX = 70;
  const originX = rect.width * 0.5;
  const maxAbs = Math.max(1, ...solution.points.map((p) => Math.abs(p.x)));
  const scale = Math.min(90, rect.width / (maxAbs * 6));
  const massX = originX + cur.x * scale;
  ctx.fillStyle = '#eaeef2';
  ctx.fillRect(wallX - 16, y - 70, 20, 140);
  ctx.fillStyle = '#24292f';
  ctx.fillRect(wallX - 4, y - 70, 4, 140);
  drawSpring(wallX, y, massX - 28);
  ctx.fillStyle = activeSimulation === 'day02_damping' ? '#bf8700' : '#d1242f';
  ctx.strokeStyle = '#24292f';
  ctx.lineWidth = 1;
  ctx.fillRect(massX - 28, y - 24, 56, 48);
  ctx.strokeRect(massX - 28, y - 24, 56, 48);
  ctx.strokeStyle = '#0969da';
  ctx.beginPath();
  ctx.moveTo(originX, y + 38);
  ctx.lineTo(originX, y + 68);
  ctx.stroke();
  const caseText = solution.case ? ` ${solution.case}` : '';
  drawText(`${solution.simulation?.title || 'simulation'}${caseText}`, 24, 30);
  drawText(`x=${cur.x.toFixed(3)} v=${cur.v.toFixed(3)} a=${cur.a.toFixed(3)} F=${cur.force.toFixed(3)}`, 24, 52);
}

function drawPositionGraph(rect) {
  if (!solution?.points?.length) return;
  const gx = 52;
  const gy = rect.height - 155;
  const gw = rect.width - 104;
  const gh = 95;
  const maxAbs = Math.max(1, ...solution.points.map((p) => Math.abs(p.x)));
  ctx.strokeStyle = '#d0d7de';
  ctx.strokeRect(gx, gy, gw, gh);
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh / 2);
  ctx.lineTo(gx + gw, gy + gh / 2);
  ctx.stroke();
  ctx.strokeStyle = activeSimulation === 'day02_damping' ? '#bf8700' : '#0969da';
  ctx.lineWidth = 2;
  ctx.beginPath();
  solution.points.forEach((p, i) => {
    const px = gx + (p.t / solution.duration) * gw;
    const py = gy + gh / 2 - (p.x / maxAbs) * (gh * 0.42);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  });
  ctx.stroke();
  const markerX = gx + (currentPlotTime() / solution.duration) * gw;
  ctx.strokeStyle = '#d1242f';
  ctx.beginPath();
  ctx.moveTo(markerX, gy);
  ctx.lineTo(markerX, gy + gh);
  ctx.stroke();
  drawText('x(t)', gx, gy - 8);
}

function drawTargetMarker(rect) {
  if (!solution) return;
  const target = solution.input?.targetTime;
  if (target == null || target > solution.duration) return;
  const gx = 52;
  const gy = rect.height - 155;
  const gw = rect.width - 104;
  const markerX = gx + (target / solution.duration) * gw;
  ctx.strokeStyle = '#8250df';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(markerX, gy);
  ctx.lineTo(markerX, gy + 95);
  ctx.stroke();
  ctx.setLineDash([]);
  drawText('T', markerX + 4, gy + 14, '#8250df');
}

function drawText(text, x, y, color = '#24292f') {
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function setPlayback(state) {
  running = state !== 'pause';
  playbackScale = state === 'slow' ? 0.35 : 1;
  lastFrame = performance.now();
  ui.pausePlayback.classList.toggle('active', state === 'pause');
  ui.slowPlayback.classList.toggle('active', state === 'slow');
  ui.normalPlayback.classList.toggle('active', state === 'normal');
}

Object.values(controls).forEach((group) => {
  Object.values(group).forEach((input) => input.addEventListener('input', () => scheduleSolve()));
});
ui.dayTabs.forEach((button) => button.addEventListener('click', () => setActiveSimulation(button.dataset.sim)));
ui.pausePlayback.addEventListener('click', () => setPlayback('pause'));
ui.slowPlayback.addEventListener('click', () => setPlayback('slow'));
ui.normalPlayback.addEventListener('click', () => setPlayback('normal'));
ui.reset.addEventListener('click', () => {
  simTime = 0;
  lastFrame = performance.now();
});
window.addEventListener('resize', resizeCanvas);

scheduleSolve(0);
(function loop() {
  const now = performance.now();
  const dt = ((now - lastFrame) / 1000) * playbackScale;
  lastFrame = now;
  if (running) simTime += dt;
  const rect = resizeCanvas();
  drawGrid(rect.width, rect.height);
  if (!solution) {
    drawText(solveError || 'waiting for solve...', 24, 34);
    requestAnimationFrame(loop);
    return;
  }
  const cur = pointAt(simTime);
  if (cur) drawMassSpring(rect, cur);
  drawPositionGraph(rect);
  drawTargetMarker(rect);
  requestAnimationFrame(loop);
})();
