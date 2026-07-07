# Day 4: Coupled Oscillators

Two equal masses move without damping. Each mass has a spring to a wall, and the
two masses are connected by a coupling spring.

The useful trick is to stop solving for `x1` and `x2` directly. Instead use:

```text
q+ = (x1 + x2) / 2
q- = (x1 - x2) / 2
```

`q+` is the in-phase mode and `q-` is the out-of-phase mode.

