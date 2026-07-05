# Day 3: Driven Oscillations

## Files

- `model.py`: runnable Python solver used by the local API
- `notes.md`: Day 3 notes

## Simulation

This module solves the driven, damped oscillator:

```text
m x'' + b x' + kx = F0 cos(omega t)
```

The key comparison is between the drive frequency and the natural frequency:

```text
omega0 = sqrt(k/m)
```

Following the MIT OCW problem-solving video, the lesson emphasizes that many
physical systems reduce to the same generic driven-oscillator equation:

```text
x'' + gamma x' + omega0^2 x = f cos(omega t)
```

The answer is interpreted as:

```text
steady-state response + decaying transient
```

When the drive frequency is near the system's preferred frequency, the response
gets larger. Damping prevents the amplitude from growing without bound and
controls the phase lag between the driver and the oscillator.
