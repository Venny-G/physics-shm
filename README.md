# Harmonic Osciliators - Ven's Notes

An interactive, note-like browser simulator for learning simple harmonic motion boundary value problems at a differential equations level.

The project is meant to grow one study day at a time. Each new topic should be added as a small simulation module, not mixed into the Day 1 code.

## Web Version

Open the notebook here:

```text
https://venny-g.github.io/physics-shm/
```

The web version uses the same Day 1 formula in a browser fallback so the simulation can run on GitHub Pages. The local version below uses Python for the physics solve.

## Run

```bash
python3 server.py
```

Then open:

```text
http://127.0.0.1:5173/index.html
```

If the canvas says `failed to fetch`, the browser probably cannot reach `server.py`; leave the server running and use the URL above instead of relying on a static file server.

If you have Node installed, syntax-check the app with:

```bash
node --check script.js
```

Python checks:

```bash
python3 -m py_compile server.py physics.py simulations/registry.py simulations/day01_boundary_value/model.py
```

## Add-On Layout

```text
index.html
styles.css
script.js
server.py
simulations/
  registry.py
  day01_boundary_value/
    model.py
    README.md
notes/
```

- `index.html`: notebook page, controls, notes, and day tabs
- `script.js`: reads browser inputs, asks Python for solved points, draws the canvas
- `server.py`: local web server plus API routes
- `simulations/registry.py`: list of installed simulation modules
- `simulations/day01_boundary_value/model.py`: Day 1 physics add-on
- `notes/`: messy lecture notes and images
- `physics.py`: compatibility wrapper that points to the Day 1 model

## Current Focus

Boundary solve is the main simulator. You choose:

```text
x(0), x(T), T, m, k
```

and the app solves for the missing starting velocity:

```text
v0 = w0 * (xT - x0 cos(w0 T)) / sin(w0 T)
A = sqrt(x0^2 + (v0/w0)^2)
phi = atan2(-v0/w0, x0)
x(t) = A cos(w0 t + phi)
```

## Study Log

- Day 1: lecture 1 notes and undamped SHM.
- Day 2: damping tab, planned next.
- Day 3: driven oscillator tab.
- Day 4: coupled oscillator tab.

## Adding A New Simulation

1. Copy `simulations/day01_boundary_value/` to a new folder, such as `simulations/day02_damping/`.
2. Update the `SIMULATION` dictionary in the new `model.py`.
3. Change `solve_from_params` and the physics formulas.
4. Register the module in `simulations/registry.py`.
5. Add or activate a matching button in `index.html`.
6. Update `script.js` when the new simulation needs different controls or drawing.

## Equations

For ideal 1D SHM:

```text
mx'' = -kx
x'' + (k/m)x = 0
w0 = sqrt(k/m)
x(t) = A cos(w0 t + phi)
```

## Files

- `index.html`: app shell and controls
- `styles.css`: minimal notebook styling
- `server.py`: local Python API/static server
- `script.js`: UI events, API calls, and canvas drawing
- `simulations/day01_boundary_value/model.py`: boundary-value SHM math
- `lesson.md`: longer SHM explanation
- `notes/day-01-lecture-01.md`: messy Day 1 notes
