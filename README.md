### UPDATE 7/3 - DAY 2 IS COMPLETE
### UPDATE 7/5 - DAY 3 IS COMPLETE
### UPDATE 7/7 - DAY 4 IS COMPLETE
### UPDATE 7/14 - DAY 5 IS COMPLETE


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
python3 -m py_compile server.py days/registry.py days/day01_boundary_value/model.py days/day02_damping/model.py days/day03_driven/model.py days/day04_coupled/model.py days/day05_traveling/model.py
node --check script.js
```
