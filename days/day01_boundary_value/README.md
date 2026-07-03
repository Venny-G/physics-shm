# Day 1: Boundary-Value SHM

## Files

- `model.py`: runnable Python solver used by the local API
- `notes.md`: cleaned lecture notes
- `images/`: source note photos used by the homepage

## Simulation

This module solves the undamped harmonic oscillator from:

```text
m, k, x(0), x(T), T
```

It returns sampled points for the browser:

```text
t, x, v, a, force
```

To add another simulation, copy this folder, change `SIMULATION`, write a new
`solve_from_params`, and register the module in `days/registry.py` once it is
ready to run.
