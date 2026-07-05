### UPDATE 7/3 - DAY 2 IS COMPLETE
### UPDATE 7/5 - DAY 3 IS COMPLETE


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
  day03_driven/
    model.py
    notes.md
```

- `index.html`, `styles.css`, `script.js`: the current webpage
- `server.py`: local static server plus JSON API routes
- `days/registry.py`: imports runnable day modules for the API
- `days/day01_boundary_value/`: Day 1 notes, images, and working solver
- `days/day02_damping/`: Day 2 notes and working damping solver
- `days/day03_driven/`: Day 3 notes and working driven oscillator solver
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
python3 -m py_compile server.py days/registry.py days/day01_boundary_value/model.py days/day02_damping/model.py days/day03_driven/model.py
node --check script.js
```
