# Traveling Waves Without Damping

An ideal string obeys the one-dimensional wave equation:

```text
d2y/dt2 = c^2 d2y/dx2
c = sqrt(T / mu)
```

Its general solution is a superposition of two unchanged shapes:

```text
y(x,t) = f(x - ct) + g(x + ct)
```

`f` moves right and `g` moves left. For a sinusoidal wave,

```text
y(x,t) = A cos(kx - omega t + phi)
k = 2pi/lambda
omega = ck
```

Every point on the string oscillates transversely while the pattern and energy
travel along the string. The material of the string does not travel with the
wave.
