# Day 2 - Lecture 2: Weak and Strong Damping

## Model Target

Start from the damped oscillator:

```text
m x'' + b x' + kx = 0
```

Divide by `m` and match the OCW notation:

```text
x'' + gamma x' + omega0^2 x = 0
gamma = b / m
omega0 = sqrt(k/m)
```

The damping force is idealized as proportional to velocity. The lecture uses that
choice because it keeps the differential equation analytically solvable.

## Strong Damping

Strong damping means:

```text
gamma^2 > 4 omega0^2
```

The motion does not oscillate. The solution is a sum of two decaying exponentials:

```text
alpha1,2 = (gamma +/- sqrt(gamma^2 - 4 omega0^2)) / 2
x(t) = A e^(-alpha1 t) + B e^(-alpha2 t)
```

Qualitatively, the mass moves away from equilibrium after the initial kick, slows
down, and returns without overshooting.

## Weak Damping

Weak damping means:

```text
gamma^2 < 4 omega0^2
```

The motion still oscillates, but the amplitude envelope decays:

```text
omega' = sqrt(omega0^2 - gamma^2/4)
x(t) = e^(-gamma t/2)(A cos(omega' t) + B sin(omega' t))
```

For a reasonably good oscillator, the lecture estimates:

```text
Q ~= omega0 / gamma
```

`Q` only really makes sense in the weak damping case, where the system completes
several oscillations before the amplitude dies away.

## Critical Damping

Critical damping is the boundary:

```text
gamma^2 = 4 omega0^2
```

It returns to equilibrium without oscillation and without the slow double-exponential
tail of strong damping.

## Coding Notes

This day is registered through `days/registry.py`. The local server uses the
Python solver, and the static GitHub Pages version uses the matching browser
fallback in `script.js`.
