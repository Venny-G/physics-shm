# Day 3 - Problem Solving Video 3: Driven Harmonic Oscillators

## Problem-Solving Style

The video's main point is not just the formula for resonance. It is the method:

1. Start from a physical situation in words.
2. Use the laws of nature to translate it into a mathematical equation.
3. Solve the mathematical problem.
4. Return to the physical situation and interpret the answer.

The lecture shows that very different systems can reduce to the same generic
equation:

```text
RLC circuit driven by AC voltage
pendulum with its support moved sinusoidally
seismograph with the ground moving sinusoidally
```

Once the variables and constants are named correctly, the math is the same.

## Model Target

For this simulator, use the direct mechanical version: a damped mass-spring system
driven by an external sinusoidal force.

```text
m x'' + b x' + kx = F0 cos(omega t)
```

After dividing by `m`:

```text
x'' + gamma x' + omega0^2 x = (F0/m) cos(omega t)
gamma = b / m
omega0 = sqrt(k/m)
```

This is the same generic form used in the video:

```text
x'' + gamma x' + omega0^2 x = f cos(omega t)
f = F0 / m
```

## General Solution Shape

For the underdamped case, the solution has two pieces:

```text
x(t) = A(omega) cos(omega t - delta) + C e^(-gamma t/2) cos(omega' t + phi)
```

The first term is the steady-state response. It oscillates at the same frequency as
the driver.

The second term is the transient. It depends on the initial conditions and fades
away because of damping.

The steady-state amplitude and phase are:

```text
A(omega) = f / sqrt((omega0^2 - omega^2)^2 + (gamma omega)^2)
tan(delta) = gamma omega / (omega0^2 - omega^2)
```

## Resonance

When the drive frequency is near the oscillator's natural frequency, the
oscillator responds with a large amplitude. This is resonance.

Damping matters because it limits the peak response. With little damping, the
resonance peak is sharper and taller. With more damping, the peak is lower and
wider.

For displacement amplitude, the damped resonance estimate is:

```text
omega_res ~= sqrt(omega0^2 - gamma^2/2)
```

This estimate only applies when damping is weak enough for the expression inside
the square root to stay positive. Otherwise, the largest response is near zero
frequency instead of a clean resonance peak.

## Phase Interpretation

The lecture emphasizes the qualitative difference between driving slowly and
driving quickly:

```text
omega < omega0: response mostly in phase with the driver
omega > omega0: response mostly out of phase with the driver
```

Near resonance, the amplitude gets large and the phase changes rapidly.

## Coding Notes

The simulation uses RK4 time stepping so the transient and steady-state motion are
visible without solving for the constants `C` and `phi` by hand. The equation panel
still reports the lecture-style steady-state quantities `A(omega)` and `delta`.
