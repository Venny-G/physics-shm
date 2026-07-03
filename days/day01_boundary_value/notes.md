# Day 1 - Lecture 1: SHM From Boundary Values

## Model

Ideal undamped mass-spring oscillator. These notes use `x` for displacement from equilibrium. In the handwritten vertical-spring notes this same displacement is written as `y`.

```text
F = -kx
mx'' = -kx
x'' + (k/m)x = 0
omega = sqrt(k/m)
```

## Vertical spring offset

For vertical motion, gravity shifts the equilibrium position.

```text
k y0 = mg
```

If displacement is measured from that equilibrium position, the constant gravity term cancels:

```text
y'' = -(k/m)y
y'' = -omega0^2 y
```

## General solution

```text
x(t) = A cos(omega t + phi)
```

At `t = 0`:

```text
x(0) = A cos(phi) = x0
```

Velocity:

```text
v(t) = x'(t)
v(t) = -A omega sin(omega t + phi)
```

So:

```text
v(0) = -A omega sin(phi) = v0
```

## Boundary values

Instead of giving `v0`, give:

```text
x(0) = x0
x(T) = xT
```

The code first solves the missing initial velocity:

```text
v0 = omega * (xT - x0 cos(omega T)) / sin(omega T)
```

Then convert to the form from lecture:

```text
A = sqrt(x0^2 + (v0/omega)^2)
phi = atan2(-v0/omega, x0)
x(t) = A cos(omega t + phi)
```

## Velocity, acceleration, force

```text
v(t) = -A omega sin(omega t + phi)
```

```text
a(t) = x''(t) = -omega^2 x(t)
```

```text
F(t) = ma(t) = -kx(t)
```

## Period

```text
period = 2pi / omega
period = 2pi * sqrt(m/k)
```

Period comes from `m` and `k`, not from amplitude or boundary positions in the ideal linear model.

## Singular boundary times

The boundary formula uses:

```text
sin(omega T)
```

If:

```text
sin(omega T) = 0
```

then:

```text
T = n*pi/omega
```

At those times, the requested final position may be impossible or non-unique.

## Source images

```text
days/day01_boundary_value/images/lecture-01-spread.jpg
days/day01_boundary_value/images/lecture-01-vertical-spring.jpg
```
