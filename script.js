const canvas = document.querySelector('#simCanvas');
const ctx = canvas.getContext('2d');
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

const ui = {
  equationText: qs('#equationText'),
  boundaryWarning: qs('#boundaryWarning'),
  dampingWarning: qs('#dampingWarning'),
  drivenWarning: qs('#drivenWarning'),
  coupledWarning: qs('#coupledWarning'),
  boundaryControls: qs('#boundaryControls'),
  dampingControls: qs('#dampingControls'),
  drivenControls: qs('#drivenControls'),
  coupledControls: qs('#coupledControls'),
  pausePlayback: qs('#pausePlayback'),
  slowPlayback: qs('#slowPlayback'),
  normalPlayback: qs('#normalPlayback'),
  reset: qs('#reset'),
  weakDamping: qs('#weakDamping'),
  criticalDamping: qs('#criticalDamping'),
  strongDamping: qs('#strongDamping'),
  belowDrive: qs('#belowDrive'),
  resonanceDrive: qs('#resonanceDrive'),
  aboveDrive: qs('#aboveDrive'),
  inPhaseCoupled: qs('#inPhaseCoupled'),
  outPhaseCoupled: qs('#outPhaseCoupled'),
  beatCoupled: qs('#beatCoupled'),
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
  driven: {
    mass: qs('#rMass'),
    spring: qs('#rSpring'),
    damping: qs('#rDamping'),
    driveForce: qs('#rForce'),
    driveOmega: qs('#rOmega'),
    x0: qs('#rx0'),
    v0: qs('#rv0'),
    duration: qs('#rDuration'),
  },
  coupled: {
    mass: qs('#cMass'),
    spring: qs('#cSpring'),
    coupling: qs('#cCoupling'),
    x1: qs('#cx1'),
    x2: qs('#cx2'),
    v1: qs('#cv1'),
    v2: qs('#cv2'),
    duration: qs('#cDuration'),
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
  day03_driven: {
    controls: 'driven',
    warning: ui.drivenWarning,
    fallback: solveDrivenInBrowser,
  },
  day04_coupled: {
    controls: 'coupled',
    warning: ui.coupledWarning,
    fallback: solveCoupledInBrowser,
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

function drivenParams() {
  return new URLSearchParams({
    sim: 'day03_driven',
    m: inputNumber('driven', 'mass'),
    k: inputNumber('driven', 'spring'),
    b: inputNumber('driven', 'damping'),
    F0: inputNumber('driven', 'driveForce'),
    omega: inputNumber('driven', 'driveOmega'),
    x0: inputNumber('driven', 'x0'),
    v0: inputNumber('driven', 'v0'),
    duration: inputNumber('driven', 'duration'),
  });
}

function coupledParams() {
  return new URLSearchParams({
    sim: 'day04_coupled',
    m: inputNumber('coupled', 'mass'),
    k: inputNumber('coupled', 'spring'),
    kc: inputNumber('coupled', 'coupling'),
    x1: inputNumber('coupled', 'x1'),
    x2: inputNumber('coupled', 'x2'),
    v1: inputNumber('coupled', 'v1'),
    v2: inputNumber('coupled', 'v2'),
    duration: inputNumber('coupled', 'duration'),
  });
}

function paramsForActiveSimulation() {
  if (activeSimulation === 'day02_damping') return dampingParams();
  if (activeSimulation === 'day03_driven') return drivenParams();
  if (activeSimulation === 'day04_coupled') return coupledParams();
  return boundaryParams();
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
  const gamma = damping / mass;
  const caseId = dampingCase(gamma, omega0);
  const caseName = dampingCaseTitle(caseId);
  const omegaPrime = caseId === 'weak' ? Math.sqrt(omega0 ** 2 - (gamma ** 2 / 4)) : null;
  const qualityFactor = caseId === 'weak' && gamma > 0 ? omega0 / gamma : null;
  let warning = '';
  if (caseId === 'none') warning = 'b = 0, so there is no damping.';
  if (caseId === 'critical') warning = 'Critical damping is the boundary between weak oscillation and strong non-oscillation.';
  const points = samplePoints(duration, (t) => {
    const state = dampingStateAt(t, x0, v0, gamma, omega0, caseId);
    const a = -(damping * state.v + spring * state.x) / mass;
    return { t, x: state.x, v: state.v, a, force: mass * a };
  });

  return {
    simulation: { id: 'day02_damping', day: 2, title: 'Weak and strong damping' },
    input: { mass, spring, damping, x0, v0, duration },
    omega0,
    gamma,
    threshold: 2 * omega0,
    omegaPrime,
    qualityFactor,
    case: caseName,
    caseId,
    duration,
    loop: false,
    warning,
    points,
    equationText: dampingEquationText(omega0, gamma, omegaPrime, qualityFactor, caseId, caseName, x0, v0, warning, 'Browser fallback solve:'),
  };
}

function solveDrivenInBrowser(params) {
  const mass = Number(params.get('m') || 1);
  const spring = Number(params.get('k') || 4);
  const damping = Number(params.get('b') || 0.35);
  const driveForce = Number(params.get('F0') || 1);
  const driveOmega = Number(params.get('omega') || 2);
  const x0 = Number(params.get('x0') || 0);
  const v0 = Number(params.get('v0') || 0);
  const duration = Number(params.get('duration') || 30);
  if (mass <= 0 || spring <= 0 || duration <= 0) throw new Error('m, k, and duration must be positive.');
  if (damping < 0) throw new Error('damping must be non-negative.');
  if (driveOmega < 0) throw new Error('drive frequency must be non-negative.');

  const omega0 = Math.sqrt(spring / mass);
  const gamma = damping / mass;
  const resonanceOmega = resonanceFrequency(omega0, gamma);
  const responseAmplitude = steadyResponseAmplitude(driveForce / mass, omega0, gamma, driveOmega);
  const phaseDelta = phaseLag(omega0, gamma, driveOmega);
  const warning = damping === 0 ? 'No damping: near resonance, the driven response can grow very large.' : '';
  const points = drivenPoints({ mass, spring, damping, driveForce, driveOmega, x0, v0, duration }, 900);
  const responseCurve = responseCurvePoints(driveForce / mass, omega0, gamma, driveOmega);

  return {
    simulation: { id: 'day03_driven', day: 3, title: 'Driven oscillations' },
    input: { mass, spring, damping, driveForce, driveOmega, x0, v0, duration },
    omega0,
    gamma,
    resonanceOmega,
    responseAmplitude,
    phaseDelta,
    duration,
    loop: false,
    warning,
    points,
    responseCurve,
    equationText: drivenEquationText(omega0, gamma, driveOmega, resonanceOmega, responseAmplitude, phaseDelta, x0, v0, warning, 'Browser fallback solve:'),
  };
}

function solveCoupledInBrowser(params) {
  const mass = Number(params.get('m') || 1);
  const spring = Number(params.get('k') || 4);
  const coupling = Number(params.get('kc') || 1.5);
  const x1 = Number(params.get('x1') || 1);
  const x2 = Number(params.get('x2') || 0);
  const v1 = Number(params.get('v1') || 0);
  const v2 = Number(params.get('v2') || 0);
  const duration = Number(params.get('duration') || 30);
  if (mass <= 0 || spring <= 0 || duration <= 0) throw new Error('m, k, and duration must be positive.');
  if (coupling < 0) throw new Error('coupling spring must be non-negative.');

  const omegaIn = Math.sqrt(spring / mass);
  const omegaOut = Math.sqrt((spring + 2 * coupling) / mass);
  const input = { mass, spring, coupling, x1, x2, v1, v2, duration };
  const points = samplePoints(duration, (t) => coupledStateAt(t, input, omegaIn, omegaOut), 900);

  return {
    simulation: { id: 'day04_coupled', day: 4, title: 'Coupled oscillators' },
    input,
    omegaIn,
    omegaOut,
    duration,
    loop: true,
    warning: '',
    points,
    equationText: coupledEquationText(input, omegaIn, omegaOut, 'Browser fallback solve:'),
  };
}

function coupledStateAt(t, input, omegaIn, omegaOut) {
  const qPlus0 = (input.x1 + input.x2) / 2;
  const qMinus0 = (input.x1 - input.x2) / 2;
  const vPlus0 = (input.v1 + input.v2) / 2;
  const vMinus0 = (input.v1 - input.v2) / 2;
  const qPlus = qPlus0 * Math.cos(omegaIn * t) + (vPlus0 / omegaIn) * Math.sin(omegaIn * t);
  const qMinus = qMinus0 * Math.cos(omegaOut * t) + (vMinus0 / omegaOut) * Math.sin(omegaOut * t);
  const vPlus = -qPlus0 * omegaIn * Math.sin(omegaIn * t) + vPlus0 * Math.cos(omegaIn * t);
  const vMinus = -qMinus0 * omegaOut * Math.sin(omegaOut * t) + vMinus0 * Math.cos(omegaOut * t);
  const x1 = qPlus + qMinus;
  const x2 = qPlus - qMinus;
  const v1 = vPlus + vMinus;
  const v2 = vPlus - vMinus;
  const a1 = (-(input.spring + input.coupling) * x1 + input.coupling * x2) / input.mass;
  const a2 = (input.coupling * x1 - (input.spring + input.coupling) * x2) / input.mass;
  return {
    t,
    x: x1,
    v: v1,
    a: a1,
    force: input.mass * a1,
    x1,
    x2,
    v1,
    v2,
    a1,
    a2,
    force1: input.mass * a1,
    force2: input.mass * a2,
    qPlus,
    qMinus,
  };
}

function samplePoints(duration, fn, samples = 600) {
  const points = [];
  for (let i = 0; i < samples; i++) {
    points.push(fn((duration * i) / (samples - 1)));
  }
  return points;
}

function drivenPoints(input, samples) {
  let t = 0;
  let x = input.x0;
  let v = input.v0;
  const dt = input.duration / (samples - 1);
  const points = [];
  for (let i = 0; i < samples; i++) {
    points.push(drivenPointAt(t, x, v, input));
    if (i < samples - 1) {
      const next = rk4DrivenStep(t, x, v, dt, input);
      x = next.x;
      v = next.v;
      t += dt;
    }
  }
  return points;
}

function drivenPointAt(t, x, v, input) {
  const drive = input.driveForce * Math.cos(input.driveOmega * t);
  const a = (drive - input.damping * v - input.spring * x) / input.mass;
  return { t, x, v, a, force: input.mass * a, drive };
}

function rk4DrivenStep(t, x, v, dt, input) {
  const derivative = (time, stateX, stateV) => {
    const drive = input.driveForce * Math.cos(input.driveOmega * time);
    return {
      dx: stateV,
      dv: (drive - input.damping * stateV - input.spring * stateX) / input.mass,
    };
  };
  const k1 = derivative(t, x, v);
  const k2 = derivative(t + dt / 2, x + k1.dx * dt / 2, v + k1.dv * dt / 2);
  const k3 = derivative(t + dt / 2, x + k2.dx * dt / 2, v + k2.dv * dt / 2);
  const k4 = derivative(t + dt, x + k3.dx * dt, v + k3.dv * dt);
  return {
    x: x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
    v: v + (dt / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv),
  };
}

function resonanceFrequency(omega0, gamma) {
  const value = omega0 ** 2 - gamma ** 2 / 2;
  return value > 0 ? Math.sqrt(value) : 0;
}

function steadyResponseAmplitude(forcePerMass, omega0, gamma, driveOmega) {
  const denominator = Math.hypot(omega0 ** 2 - driveOmega ** 2, gamma * driveOmega);
  return denominator ? Math.abs(forcePerMass) / denominator : Infinity;
}

function phaseLag(omega0, gamma, driveOmega) {
  return Math.atan2(gamma * driveOmega, omega0 ** 2 - driveOmega ** 2);
}

function responseCurvePoints(forcePerMass, omega0, gamma, driveOmega, samples = 180) {
  const omegaMax = Math.max(omega0 * 2.5, driveOmega * 1.25, 1);
  const points = [];
  for (let i = 0; i < samples; i++) {
    const omega = (omegaMax * i) / (samples - 1);
    points.push({
      omega,
      amplitude: steadyResponseAmplitude(forcePerMass, omega0, gamma, omega),
      phaseDelta: phaseLag(omega0, gamma, omega),
    });
  }
  return points;
}

function dampingCase(gamma, omega0) {
  if (gamma === 0) return 'none';
  const discriminant = gamma ** 2 - 4 * omega0 ** 2;
  const tolerance = 1e-9 * Math.max(1, gamma ** 2, 4 * omega0 ** 2);
  if (Math.abs(discriminant) <= tolerance) return 'critical';
  return discriminant < 0 ? 'weak' : 'strong';
}

function dampingCaseTitle(caseId) {
  return {
    none: 'no damping',
    weak: 'weak damping',
    critical: 'critical damping',
    strong: 'strong damping',
  }[caseId];
}

function dampingStateAt(t, x0, v0, gamma, omega0, caseId) {
  if (caseId === 'none') {
    return {
      x: x0 * Math.cos(omega0 * t) + (v0 / omega0) * Math.sin(omega0 * t),
      v: -x0 * omega0 * Math.sin(omega0 * t) + v0 * Math.cos(omega0 * t),
    };
  }
  if (caseId === 'weak') {
    const omegaD = Math.sqrt(omega0 ** 2 - (gamma ** 2 / 4));
    const a = x0;
    const b = (v0 + (gamma * x0 / 2)) / omegaD;
    const envelope = Math.exp(-(gamma * t) / 2);
    const carrier = a * Math.cos(omegaD * t) + b * Math.sin(omegaD * t);
    const carrierPrime = -a * omegaD * Math.sin(omegaD * t) + b * omegaD * Math.cos(omegaD * t);
    return { x: envelope * carrier, v: envelope * (carrierPrime - (gamma * carrier / 2)) };
  }
  if (caseId === 'critical') {
    const alpha = gamma / 2;
    const a = x0;
    const b = v0 + alpha * x0;
    const envelope = Math.exp(-alpha * t);
    const carrier = a + b * t;
    return { x: envelope * carrier, v: envelope * (b - alpha * carrier) };
  }
  const spread = Math.sqrt(gamma ** 2 - 4 * omega0 ** 2);
  const alpha1 = (gamma - spread) / 2;
  const alpha2 = (gamma + spread) / 2;
  const a = (v0 + alpha2 * x0) / (alpha2 - alpha1);
  const b = x0 - a;
  return {
    x: a * Math.exp(-alpha1 * t) + b * Math.exp(-alpha2 * t),
    v: -alpha1 * a * Math.exp(-alpha1 * t) - alpha2 * b * Math.exp(-alpha2 * t),
  };
}

function dampingEquationText(omega0, gamma, omegaPrime, qualityFactor, caseId, caseName, x0, v0, warning, heading) {
  const lines = [
    heading,
    "m x'' + b x' + kx = 0",
    "x'' + gamma x' + omega0^2 x = 0",
    '',
    `omega0 = ${omega0.toFixed(3)}`,
    `gamma = b/m = ${gamma.toFixed(3)}`,
    `2 omega0 = ${(2 * omega0).toFixed(3)}`,
    `case = ${caseName}`,
    '',
    `x(0) = ${x0.toFixed(3)}`,
    `v(0) = ${v0.toFixed(3)}`,
    '',
    'OCW classification:',
    'gamma^2 < 4 omega0^2: weak damping',
    'gamma^2 = 4 omega0^2: critical damping',
    'gamma^2 > 4 omega0^2: strong damping',
  ];
  if (caseId === 'weak') {
    lines.push('', `omega' = ${omegaPrime.toFixed(3)}`, "x(t) = e^(-gamma t/2)(A cos(omega' t) + B sin(omega' t))", `Q ~= omega0/gamma = ${qualityFactor.toFixed(3)}`);
  } else if (caseId === 'critical') {
    lines.push('', 'x(t) = e^(-gamma t/2)(A + Bt)');
  } else if (caseId === 'strong') {
    lines.push('', 'alpha1,2 = (gamma +/- sqrt(gamma^2 - 4 omega0^2)) / 2', 'x(t) = A e^(-alpha1 t) + B e^(-alpha2 t)');
  } else {
    lines.push('', 'x(t) = x0 cos(omega0 t) + (v0/omega0) sin(omega0 t)');
  }
  if (warning) lines.push('', `warning: ${warning}`);
  return lines.join('\n');
}

function drivenEquationText(omega0, gamma, driveOmega, resonanceOmega, responseAmplitude, phaseDelta, x0, v0, warning, heading) {
  const lines = [
    heading,
    'Step 1: physical setup -> equation of motion',
    "m x'' + b x' + kx = F0 cos(omega t)",
    "x'' + gamma x' + omega0^2 x = (F0/m) cos(omega t)",
    '',
    'Step 2: solve the generic math problem',
    'x(t) = A(omega) cos(omega t - delta) + transient',
    "transient = C e^(-gamma t/2) cos(omega' t + phi)",
    '',
    `omega0 = ${omega0.toFixed(3)}`,
    `gamma = b/m = ${gamma.toFixed(3)}`,
    `drive omega = ${driveOmega.toFixed(3)}`,
    `resonance estimate = ${resonanceOmega.toFixed(3)}`,
    `A(omega) = ${formatNumber(responseAmplitude)}`,
    `delta = ${phaseDelta.toFixed(3)} rad`,
    '',
    `x(0) = ${x0.toFixed(3)}`,
    `v(0) = ${v0.toFixed(3)}`,
    '',
    'Step 3: interpret the answer',
    'early motion = transient + steady-state response',
    'late motion = steady-state response at the drive frequency',
    'below omega0: response mostly in phase',
    'above omega0: response mostly out of phase',
  ];
  if (warning) lines.push('', `warning: ${warning}`);
  return lines.join('\n');
}

function coupledEquationText(input, omegaIn, omegaOut, heading) {
  return [
    heading,
    'Two masses, no damping, no driving.',
    '',
    "m x1'' = -k x1 - kc(x1 - x2)",
    "m x2'' = -k x2 - kc(x2 - x1)",
    '',
    'Use normal coordinates:',
    'q+ = (x1 + x2) / 2',
    'q- = (x1 - x2) / 2',
    '',
    'The equations separate:',
    "q+'' + (k/m) q+ = 0",
    "q-'' + ((k + 2kc)/m) q- = 0",
    '',
    `omega_in = ${omegaIn.toFixed(3)}`,
    `omega_out = ${omegaOut.toFixed(3)}`,
    '',
    `x1(0) = ${input.x1.toFixed(3)}, x2(0) = ${input.x2.toFixed(3)}`,
    `v1(0) = ${input.v1.toFixed(3)}, v2(0) = ${input.v2.toFixed(3)}`,
    '',
    'Convert back:',
    'x1 = q+ + q-',
    'x2 = q+ - q-',
  ].join('\n');
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(3) : 'infinite';
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
      if (!payload?.error || payload.error.includes('unknown simulation')) {
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
  solution = prepareSolution(payload);
  ui.equationText.textContent = payload.equationText || '';
  setWarning(payload.warning || '');
  setDampingPresetState(payload.caseId || '');
  setDrivePresetState();
  setCoupledPresetState();
  simTime = 0;
  lastFrame = performance.now();
}

function prepareSolution(payload) {
  const points = payload.points || [];
  return {
    ...payload,
    maxAbsX: Math.max(1, ...points.flatMap((p) => [Math.abs(p.x), Math.abs(p.x1 || 0), Math.abs(p.x2 || 0)])),
    plotPathCache: null,
    responsePathCache: null,
  };
}

function setWarning(message) {
  ui.boundaryWarning.textContent = activeSimulation === 'day01_boundary_value' ? message : '';
  ui.dampingWarning.textContent = activeSimulation === 'day02_damping' ? message : '';
  ui.drivenWarning.textContent = activeSimulation === 'day03_driven' ? message : '';
  ui.coupledWarning.textContent = activeSimulation === 'day04_coupled' ? message : '';
}

function setDampingPreset(kind) {
  const mass = inputNumber('damping', 'mass');
  const spring = inputNumber('damping', 'spring');
  const omega0 = Math.sqrt(spring / mass);
  const criticalGamma = 2 * omega0;
  const gamma = {
    weak: criticalGamma * 0.35,
    critical: criticalGamma,
    strong: criticalGamma * 1.6,
  }[kind];
  controls.damping.damping.value = (gamma * mass).toFixed(2);
  scheduleSolve(0);
}

function setDampingPresetState(caseId) {
  ui.weakDamping.classList.toggle('active', activeSimulation === 'day02_damping' && caseId === 'weak');
  ui.criticalDamping.classList.toggle('active', activeSimulation === 'day02_damping' && caseId === 'critical');
  ui.strongDamping.classList.toggle('active', activeSimulation === 'day02_damping' && caseId === 'strong');
}

function setDrivePreset(kind) {
  const mass = inputNumber('driven', 'mass');
  const spring = inputNumber('driven', 'spring');
  const damping = inputNumber('driven', 'damping');
  const omega0 = Math.sqrt(spring / mass);
  const gamma = damping / mass;
  const resonance = resonanceFrequency(omega0, gamma);
  const omega = {
    below: omega0 * 0.65,
    resonance: resonance || omega0,
    above: omega0 * 1.35,
  }[kind];
  controls.driven.driveOmega.value = omega.toFixed(2);
  scheduleSolve(0);
}

function setDrivePresetState() {
  if (activeSimulation !== 'day03_driven' || !solution) {
    ui.belowDrive.classList.toggle('active', false);
    ui.resonanceDrive.classList.toggle('active', false);
    ui.aboveDrive.classList.toggle('active', false);
    return;
  }
  const driveOmega = solution.input?.driveOmega || 0;
  const omega0 = solution.omega0 || 1;
  const resonance = solution.resonanceOmega || omega0;
  ui.belowDrive.classList.toggle('active', Math.abs(driveOmega - omega0 * 0.65) < 0.03);
  ui.resonanceDrive.classList.toggle('active', Math.abs(driveOmega - resonance) < 0.03);
  ui.aboveDrive.classList.toggle('active', Math.abs(driveOmega - omega0 * 1.35) < 0.03);
}

function setCoupledPreset(kind) {
  const values = {
    in: [1, 1, 0, 0],
    out: [1, -1, 0, 0],
    beat: [1, 0, 0, 0],
  }[kind];
  [controls.coupled.x1.value, controls.coupled.x2.value, controls.coupled.v1.value, controls.coupled.v2.value] = values;
  scheduleSolve(0);
}

function setCoupledPresetState() {
  const isCoupled = activeSimulation === 'day04_coupled';
  const x1 = inputNumber('coupled', 'x1');
  const x2 = inputNumber('coupled', 'x2');
  const v1 = inputNumber('coupled', 'v1');
  const v2 = inputNumber('coupled', 'v2');
  const rest = Math.abs(v1) < 0.01 && Math.abs(v2) < 0.01;
  ui.inPhaseCoupled.classList.toggle('active', isCoupled && rest && Math.abs(x1 - 1) < 0.01 && Math.abs(x2 - 1) < 0.01);
  ui.outPhaseCoupled.classList.toggle('active', isCoupled && rest && Math.abs(x1 - 1) < 0.01 && Math.abs(x2 + 1) < 0.01);
  ui.beatCoupled.classList.toggle('active', isCoupled && rest && Math.abs(x1 - 1) < 0.01 && Math.abs(x2) < 0.01);
}

function setActiveSimulation(simulationId) {
  if (!SIMS[simulationId]) return;
  activeSimulation = simulationId;
  solution = null;
  solveError = '';
  pendingId += 1;
  if (currentAbort) currentAbort.abort();
  qsa('.controls, .sim-wrap, .equation-card').forEach((panel) => panel.classList.toggle('is-hidden', false));
  ui.boundaryControls.classList.toggle('is-hidden', simulationId !== 'day01_boundary_value');
  ui.dampingControls.classList.toggle('is-hidden', simulationId !== 'day02_damping');
  ui.drivenControls.classList.toggle('is-hidden', simulationId !== 'day03_driven');
  ui.coupledControls.classList.toggle('is-hidden', simulationId !== 'day04_coupled');
  ui.dayTabs.forEach((button) => {
    const isActive = button.dataset.sim === simulationId;
    button.classList.toggle('active', isActive);
    button.classList.toggle('ghost', !isActive);
  });
  ui.noteSheets.forEach((sheet) => sheet.classList.toggle('is-hidden', sheet.dataset.note !== simulationId));
  ui.equationText.textContent = '';
  setWarning('');
  setDampingPresetState('');
  setDrivePresetState();
  setCoupledPresetState();
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
  const scaledIndex = (t / solution.duration) * (solution.points.length - 1);
  const leftIndex = Math.floor(scaledIndex);
  const rightIndex = Math.min(solution.points.length - 1, leftIndex + 1);
  const mix = scaledIndex - leftIndex;
  const left = solution.points[leftIndex];
  const right = solution.points[rightIndex];
  if (!left || !right || left === right) return left || right || null;
  return interpolatePoint(left, right, mix);
}

function interpolatePoint(a, b, mix) {
  const point = {
    t: a.t + (b.t - a.t) * mix,
    x: a.x + (b.x - a.x) * mix,
    v: a.v + (b.v - a.v) * mix,
    a: a.a + (b.a - a.a) * mix,
    force: a.force + (b.force - a.force) * mix,
    drive: (a.drive || 0) + ((b.drive || 0) - (a.drive || 0)) * mix,
  };
  ['x1', 'x2', 'v1', 'v2', 'a1', 'a2', 'force1', 'force2', 'qPlus', 'qMinus'].forEach((key) => {
    if (a[key] != null || b[key] != null) {
      point[key] = (a[key] || 0) + ((b[key] || 0) - (a[key] || 0)) * mix;
    }
  });
  return point;
}

function simulationColor() {
  return {
    day01_boundary_value: '#d1242f',
    day02_damping: '#bf8700',
    day03_driven: '#1f883d',
    day04_coupled: '#0969da',
  }[activeSimulation] || '#0969da';
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
  const maxAbs = solution.maxAbsX;
  const scale = Math.min(90, rect.width / (maxAbs * 6));
  const massX = originX + cur.x * scale;
  ctx.fillStyle = '#eaeef2';
  ctx.fillRect(wallX - 16, y - 70, 20, 140);
  ctx.fillStyle = '#24292f';
  ctx.fillRect(wallX - 4, y - 70, 4, 140);
  drawSpring(wallX, y, massX - 28);
  ctx.fillStyle = simulationColor();
  ctx.strokeStyle = '#24292f';
  ctx.lineWidth = 1;
  ctx.fillRect(massX - 28, y - 24, 56, 48);
  ctx.strokeRect(massX - 28, y - 24, 56, 48);
  if (activeSimulation === 'day03_driven') drawDriveArrow(massX, y, cur);
  ctx.strokeStyle = '#0969da';
  ctx.beginPath();
  ctx.moveTo(originX, y + 38);
  ctx.lineTo(originX, y + 68);
  ctx.stroke();
  const titleText = solution.simulation?.title || 'simulation';
  drawText(titleText, 24, 30);
  drawText(`x=${cur.x.toFixed(3)} v=${cur.v.toFixed(3)} a=${cur.a.toFixed(3)} F=${cur.force.toFixed(3)}`, 24, 52);
}

function drawCoupledMassSpring(rect, cur) {
  const y = rect.height * 0.34;
  const leftWall = 58;
  const rightWall = rect.width - 58;
  const origin1 = rect.width * 0.38;
  const origin2 = rect.width * 0.62;
  const scale = Math.min(78, rect.width / (solution.maxAbsX * 8));
  const mass1X = origin1 + cur.x1 * scale;
  const mass2X = origin2 + cur.x2 * scale;

  ctx.fillStyle = '#eaeef2';
  ctx.fillRect(leftWall - 16, y - 70, 20, 140);
  ctx.fillRect(rightWall - 4, y - 70, 20, 140);
  ctx.fillStyle = '#24292f';
  ctx.fillRect(leftWall - 4, y - 70, 4, 140);
  ctx.fillRect(rightWall, y - 70, 4, 140);

  drawSpring(leftWall, y, mass1X - 28);
  drawSpring(mass1X + 28, y, mass2X - 28);
  drawSpring(mass2X + 28, y, rightWall);

  drawEquilibriumTick(origin1, y, '#0969da');
  drawEquilibriumTick(origin2, y, '#8250df');
  drawBlock(mass1X, y, '#0969da');
  drawBlock(mass2X, y, '#8250df');

  drawText(solution.simulation?.title || 'coupled oscillators', 24, 30);
  drawText(`x1=${cur.x1.toFixed(3)} x2=${cur.x2.toFixed(3)}`, 24, 52);
  drawText(`omega_in=${solution.omegaIn.toFixed(3)} omega_out=${solution.omegaOut.toFixed(3)}`, 24, 74);
}

function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#24292f';
  ctx.lineWidth = 1;
  ctx.fillRect(x - 28, y - 24, 56, 48);
  ctx.strokeRect(x - 28, y - 24, 56, 48);
}

function drawEquilibriumTick(x, y, color) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + 38);
  ctx.lineTo(x, y + 68);
  ctx.stroke();
}

function drawDriveArrow(massX, y, cur) {
  const driveForce = solution.input?.driveForce ?? 1;
  if (driveForce === 0) return;
  const length = Math.max(12, Math.min(70, Math.abs(cur.drive || 0) / Math.max(0.1, driveForce) * 70));
  const direction = (cur.drive || 0) >= 0 ? 1 : -1;
  const startX = massX;
  const endX = startX + direction * length;
  ctx.strokeStyle = '#1f883d';
  ctx.fillStyle = '#1f883d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(endX, y);
  ctx.lineTo(endX - direction * 8, y - 6);
  ctx.lineTo(endX - direction * 8, y + 6);
  ctx.closePath();
  ctx.fill();
  drawText('drive', Math.min(startX, endX), y - 12, '#1f883d');
}

function drawPositionGraph(rect) {
  if (!solution?.points?.length) return;
  if (activeSimulation === 'day04_coupled') {
    drawCoupledPositionGraph(rect);
    return;
  }
  const gx = 52;
  const gy = rect.height - 155;
  const gw = rect.width - 104;
  const gh = 95;
  const maxAbs = solution.maxAbsX;
  ctx.strokeStyle = '#d0d7de';
  ctx.strokeRect(gx, gy, gw, gh);
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh / 2);
  ctx.lineTo(gx + gw, gy + gh / 2);
  ctx.stroke();
  ctx.strokeStyle = activeSimulation === 'day01_boundary_value' ? '#0969da' : simulationColor();
  ctx.lineWidth = 2;
  const path = positionGraphPath(gx, gy, gw, gh, maxAbs);
  if (path) {
    ctx.stroke(path);
  } else {
    ctx.beginPath();
    solution.points.forEach((p, i) => {
      const px = gx + (p.t / solution.duration) * gw;
      const py = gy + gh / 2 - (p.x / maxAbs) * (gh * 0.42);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.stroke();
  }
  const markerX = gx + (currentPlotTime() / solution.duration) * gw;
  ctx.strokeStyle = '#d1242f';
  ctx.beginPath();
  ctx.moveTo(markerX, gy);
  ctx.lineTo(markerX, gy + gh);
  ctx.stroke();
  drawText('x(t)', gx, gy - 8);
}

function drawCoupledPositionGraph(rect) {
  const gx = 52;
  const gy = rect.height - 155;
  const gw = rect.width - 104;
  const gh = 95;
  const maxAbs = solution.maxAbsX;
  ctx.strokeStyle = '#d0d7de';
  ctx.strokeRect(gx, gy, gw, gh);
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh / 2);
  ctx.lineTo(gx + gw, gy + gh / 2);
  ctx.stroke();
  drawCoupledGraphLine(gx, gy, gw, gh, maxAbs, 'x1', '#0969da');
  drawCoupledGraphLine(gx, gy, gw, gh, maxAbs, 'x2', '#8250df');
  const markerX = gx + (currentPlotTime() / solution.duration) * gw;
  ctx.strokeStyle = '#d1242f';
  ctx.beginPath();
  ctx.moveTo(markerX, gy);
  ctx.lineTo(markerX, gy + gh);
  ctx.stroke();
  drawText('x1(t)', gx, gy - 8, '#0969da');
  drawText('x2(t)', gx + 54, gy - 8, '#8250df');
}

function drawCoupledGraphLine(gx, gy, gw, gh, maxAbs, key, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  solution.points.forEach((p, i) => {
    const px = gx + (p.t / solution.duration) * gw;
    const py = gy + gh / 2 - (p[key] / maxAbs) * (gh * 0.42);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  });
  ctx.stroke();
}

function drawResponseGraph(rect) {
  if (activeSimulation !== 'day03_driven' || !solution?.responseCurve?.length) return;
  const gw = Math.min(280, rect.width * 0.34);
  const gh = 92;
  if (gw < 190 || rect.height < 300) return;
  const gx = rect.width - gw - 34;
  const gy = 24;
  const curve = solution.responseCurve.filter((p) => Number.isFinite(p.amplitude));
  if (!curve.length) return;
  const omegaMax = Math.max(...curve.map((p) => p.omega), 1);
  const ampMax = Math.max(1, ...curve.map((p) => p.amplitude));

  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
  ctx.fillRect(gx - 8, gy - 18, gw + 16, gh + 42);
  ctx.strokeStyle = '#d0d7de';
  ctx.strokeRect(gx, gy, gw, gh);
  ctx.strokeStyle = '#1f883d';
  ctx.lineWidth = 2;
  const path = responseGraphPath(gx, gy, gw, gh, omegaMax, ampMax);
  if (path) {
    ctx.stroke(path);
  } else {
    ctx.beginPath();
    curve.forEach((p, i) => {
      const px = gx + (p.omega / omegaMax) * gw;
      const py = gy + gh - (p.amplitude / ampMax) * (gh * 0.86);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.stroke();
  }

  drawFrequencyMarker(gx, gy, gw, gh, omegaMax, solution.omega0, '#8250df', 'omega0');
  drawFrequencyMarker(gx, gy, gw, gh, omegaMax, solution.resonanceOmega, '#bf8700', 'res');
  drawFrequencyMarker(gx, gy, gw, gh, omegaMax, solution.input?.driveOmega, '#d1242f', 'drive');
  drawText('A(omega)', gx, gy - 6);
  drawText(`delta=${formatNumber(solution.phaseDelta)} rad`, gx, gy + gh + 24, '#1f883d');
}

function responseGraphPath(gx, gy, gw, gh, omegaMax, ampMax) {
  if (typeof Path2D === 'undefined') return null;
  const cacheKey = `${gx}:${gy}:${gw}:${gh}:${omegaMax}:${ampMax}:${solution.responseCurve.length}`;
  if (solution.responsePathCache?.key === cacheKey) return solution.responsePathCache.path;

  const path = new Path2D();
  let drawn = false;
  solution.responseCurve.forEach((p) => {
    if (!Number.isFinite(p.amplitude)) return;
    const px = gx + (p.omega / omegaMax) * gw;
    const py = gy + gh - (p.amplitude / ampMax) * (gh * 0.86);
    drawn ? path.lineTo(px, py) : path.moveTo(px, py);
    drawn = true;
  });
  solution.responsePathCache = { key: cacheKey, path };
  return path;
}

function drawFrequencyMarker(gx, gy, gw, gh, omegaMax, omega, color, label) {
  if (omega == null || !Number.isFinite(omega)) return;
  const x = gx + (Math.min(omega, omegaMax) / omegaMax) * gw;
  ctx.strokeStyle = color;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, gy);
  ctx.lineTo(x, gy + gh);
  ctx.stroke();
  ctx.setLineDash([]);
  drawText(label, x + 3, gy + 12, color);
}

function positionGraphPath(gx, gy, gw, gh, maxAbs) {
  if (typeof Path2D === 'undefined') return null;
  const cacheKey = `${gx}:${gy}:${gw}:${gh}:${maxAbs}:${solution.points.length}`;
  if (solution.plotPathCache?.key === cacheKey) return solution.plotPathCache.path;

  const path = new Path2D();
  solution.points.forEach((p, i) => {
    const px = gx + (p.t / solution.duration) * gw;
    const py = gy + gh / 2 - (p.x / maxAbs) * (gh * 0.42);
    i ? path.lineTo(px, py) : path.moveTo(px, py);
  });
  solution.plotPathCache = { key: cacheKey, path };
  return path;
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
ui.weakDamping.addEventListener('click', () => setDampingPreset('weak'));
ui.criticalDamping.addEventListener('click', () => setDampingPreset('critical'));
ui.strongDamping.addEventListener('click', () => setDampingPreset('strong'));
ui.belowDrive.addEventListener('click', () => setDrivePreset('below'));
ui.resonanceDrive.addEventListener('click', () => setDrivePreset('resonance'));
ui.aboveDrive.addEventListener('click', () => setDrivePreset('above'));
ui.inPhaseCoupled.addEventListener('click', () => setCoupledPreset('in'));
ui.outPhaseCoupled.addEventListener('click', () => setCoupledPreset('out'));
ui.beatCoupled.addEventListener('click', () => setCoupledPreset('beat'));
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
  if (cur && activeSimulation === 'day04_coupled') drawCoupledMassSpring(rect, cur);
  if (cur && activeSimulation !== 'day04_coupled') drawMassSpring(rect, cur);
  drawResponseGraph(rect);
  drawPositionGraph(rect);
  drawTargetMarker(rect);
  requestAnimationFrame(loop);
})();
