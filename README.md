# Harmonic Oscillators - Ven's Notes

An interactive, note-like browser simulator for learning harmonic motion one
study day at a time.

## Web Version

Open the notebook here:

```text
https://venny-g.github.io/physics-shm/
```

The web version keeps a browser fallback for Day 1 so it can run on GitHub
Pages. The local version uses Python simulation modules from `days/`.

## Repo Layout

```text
index.html
styles.css
script.js
server.py
package.json
assets/
days/
  registry.py
  day01_boundary_value/
    model.py
    notes.md
    images/
  day02_damping/
    model.py
    notes.md
```

- `index.html`, `styles.css`, `script.js`: the current webpage
- `server.py`: local static server plus JSON API routes
- `days/registry.py`: imports runnable day modules for the API
- `days/day01_boundary_value/`: Day 1 notes, images, and working solver
- `days/day02_damping/`: Day 2 notes and placeholder solver
- `.github/`: GitHub Pages and automation files

## Run Locally

```bash
python3 server.py
```

Then open:

```text
http://127.0.0.1:5173/index.html
```

If the canvas says `failed to fetch`, the browser probably cannot reach
`server.py`; leave the server running and use the URL above.

## Checks

```bash
npm run check
```

The check runs:

```bash
python3 -m py_compile server.py days/registry.py days/day01_boundary_value/model.py days/day02_damping/model.py
node --check script.js
```

## Study Log

- Day 1: boundary-value SHM. Given `x(0)`, `x(T)`, `T`, `m`, and `k`, solve the missing initial velocity and animate the motion.
- Day 2: damping. Scaffolded as its own folder; not registered as a runnable simulation yet.
- Day 3: driven oscillator, planned.
- Day 4: coupled oscillator, planned.

## Adding A New Day

1. Add a folder under `days/`, such as `days/day03_driven/`.
2. Give it its own `notes.md` and `model.py`.
3. Add a `SIMULATION` dictionary and `solve_from_params` in `model.py`.
4. Register the module in `days/registry.py` when it is ready to run.
5. Add or activate the matching day button in `index.html`.
6. Update `script.js` only when the new day needs different controls or drawing.

## Day 1 Equation

For ideal 1D SHM:

```text
mx'' = -kx
x'' + (k/m)x = 0
w0 = sqrt(k/m)
```

Boundary solve:

```text
v0 = w0 * (xT - x0 cos(w0 T)) / sin(w0 T)
A = sqrt(x0^2 + (v0/w0)^2)
phi = atan2(-v0/w0, x0)
x(t) = A cos(w0 t + phi)
```
