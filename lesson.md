# Simple Harmonic Motion at a Differential Equations Level

## 1. The model

For an ideal horizontal mass-spring system with no friction:

```text
Hooke's law:      F = -kx
Newton's law:    F = mx''
```

So:

```text
mx'' = -kx
x'' + (k/m)x = 0
```

Define:

```text
omega = sqrt(k/m)
```

Then the differential equation is:

```text
x'' + omega^2 x = 0
```

This is the clean core of simple harmonic motion.

## 2. General solution

The characteristic equation is:

```text
r^2 + omega^2 = 0
r = +/- i omega
```

One common way to write the solution is:

```text
x(t) = C1 cos(omega t) + C2 sin(omega t)
```

In these notes, I mostly use the lecture form:

```text
x(t) = A cos(omega t + phi)
```

Velocity is:

```text
v(t) = x'(t)
v(t) = -C1 omega sin(omega t) + C2 omega cos(omega t)
```

## 3. Initial value problem

If you know:

```text
x(0) = x0
v(0) = v0
```

then the constants in lecture form obey:

```text
x0 = A cos(phi)
v0 = -A omega sin(phi)
```

Therefore:

```text
A = sqrt(x0^2 + (v0/omega)^2)
phi = atan2(-v0/omega, x0)
x(t) = A cos(omega t + phi)
```

That is the main formula for predicting position at any time.

## 4. Boundary value problem

Sometimes you are given two positions:

```text
x(0) = x0
x(T) = xT
```

The code first solves the missing initial velocity. An equivalent temporary form is:

```text
x(t) = C1 cos(omega t) + C2 sin(omega t)
```

The first boundary gives:

```text
C1 = x0
```

The second gives:

```text
xT = x0 cos(omega T) + C2 sin(omega T)
```

So, if `sin(omega T) != 0`:

```text
C2 = (xT - x0 cos(omega T)) / sin(omega T)
v0 = omega C2
```

or:

```text
v0 = omega * (xT - x0 cos(omega T)) / sin(omega T)
```

That is the velocity needed at `t = 0` to hit position `xT` at time `T`.

Then convert that `v0` back into lecture form:

```text
A = sqrt(x0^2 + (v0/omega)^2)
phi = atan2(-v0/omega, x0)
x(t) = A cos(omega t + phi)
```

## 5. The singular boundary issue

If:

```text
sin(omega T) = 0
```

then the boundary problem becomes special. This happens when:

```text
omega T = n pi
T = n pi / omega
```

At those times, the final position is forced to be:

```text
x(T) = x0 cos(omega T)
```

That means:

- if your requested `xT` matches that value, infinitely many initial velocities may satisfy the position boundary
- if it does not match, no initial velocity can satisfy the boundary

This is why boundary value problems can behave differently from initial value problems.

## 6. Pendulum connection

For a small-angle pendulum:

```text
theta'' + (g/L) theta = 0
```

So it has the same mathematical form:

```text
theta(t) = theta0 cos(sqrt(g/L)t) + (theta0'/sqrt(g/L)) sin(sqrt(g/L)t)
```

The catch is that this is only the linearized small-angle pendulum. The exact pendulum equation is:

```text
theta'' + (g/L) sin(theta) = 0
```

That one is nonlinear and usually needs numerical methods.

## 7. What to experiment with

Open `index.html` in a browser and try:

- increase `k`: the spring gets stiffer, so `omega` increases and the period decreases
- increase `m`: the system gets slower, so `omega` decreases and the period increases
- set `x0 = 0` and `v0 != 0`: the mass starts at equilibrium but still oscillates
- use boundary mode and move `T`: watch the required initial velocity change
- move `T` near `n*pi/omega`: the boundary problem becomes singular
