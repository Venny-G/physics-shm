# Day 2: Weak and Strong Damping

## Files

- `model.py`: runnable Python solver used by the local API
- `notes.md`: Day 2 notes

## Simulation

This module solves the damped oscillator from:

```text
m, b, k, x(0), v(0)
```

It classifies the motion as no damping, weak damping, critical damping, or strong
damping and returns sampled points for the browser.

The notation follows the OCW lecture:

```text
x'' + gamma x' + omega0^2 x = 0
gamma = b / m
omega0 = sqrt(k/m)
```

The main comparison is:

```text
gamma^2 < 4 omega0^2: weak damping
gamma^2 = 4 omega0^2: critical damping
gamma^2 > 4 omega0^2: strong damping
```
