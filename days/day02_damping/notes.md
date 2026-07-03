# Day 2 - Lecture 2: Damping

## Model target

Start from the damped oscillator:

```text
m x'' + b x' + kx = 0
```

or:

```text
x'' + 2 gamma x' + omega0^2 x = 0
gamma = b / (2m)
omega0 = sqrt(k/m)
```

## Cases to implement

- underdamped: `gamma < omega0`
- critically damped: `gamma = omega0`
- overdamped: `gamma > omega0`

## Coding notes

Keep this day separate from Day 1. The homepage can import this module through
`days/registry.py` after the solver and controls exist.
