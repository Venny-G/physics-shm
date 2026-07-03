from __future__ import annotations

import math
from dataclasses import dataclass


SIMULATION = {
    "id": "day02_damping",
    "day": 2,
    "title": "Damping",
    "description": "Damped oscillator cases: underdamped, critical, and overdamped.",
}


@dataclass(frozen=True)
class DampingInput:
    mass: float
    spring: float
    damping: float
    x0: float
    v0: float
    duration: float


def solve_from_params(params: dict[str, list[str]]) -> dict:
    data = DampingInput(
        mass=float(one(params, "m", "1")),
        spring=float(one(params, "k", "4")),
        damping=float(one(params, "b", "0.8")),
        x0=float(one(params, "x0", "1")),
        v0=float(one(params, "v0", "0")),
        duration=float(one(params, "duration", "8")),
    )
    return solve_damping(data)


def solve_damping(data: DampingInput, samples: int = 600) -> dict:
    if data.mass <= 0:
        raise ValueError("mass must be positive")
    if data.spring <= 0:
        raise ValueError("spring constant must be positive")
    if data.damping < 0:
        raise ValueError("damping must be non-negative")
    if data.duration <= 0:
        raise ValueError("duration must be positive")

    omega0 = math.sqrt(data.spring / data.mass)
    gamma = data.damping / (2 * data.mass)
    case = damping_case(gamma, omega0)
    duration = data.duration
    points = []

    for index in range(samples):
        t = duration * index / (samples - 1)
        x, velocity = state_at(t, data.x0, data.v0, gamma, omega0, case)
        acceleration = -(data.damping * velocity + data.spring * x) / data.mass
        force = data.mass * acceleration
        points.append({"t": t, "x": x, "v": velocity, "a": acceleration, "force": force})

    warning = ""
    if case == "undamped":
        warning = "b = 0, so this is the Day 1 oscillator with initial position and velocity."

    return {
        "simulation": SIMULATION,
        "input": {
            "mass": data.mass,
            "spring": data.spring,
            "damping": data.damping,
            "x0": data.x0,
            "v0": data.v0,
            "duration": duration,
        },
        "omega0": omega0,
        "gamma": gamma,
        "case": case,
        "duration": duration,
        "loop": False,
        "warning": warning,
        "points": points,
        "equationText": equation_text(data, omega0, gamma, case, warning),
    }


def damping_case(gamma: float, omega0: float) -> str:
    if gamma == 0:
        return "undamped"
    if abs(gamma - omega0) < 1e-9:
        return "critical"
    if gamma < omega0:
        return "underdamped"
    return "overdamped"


def state_at(t: float, x0: float, v0: float, gamma: float, omega0: float, case: str) -> tuple[float, float]:
    if case == "undamped":
        x = x0 * math.cos(omega0 * t) + (v0 / omega0) * math.sin(omega0 * t)
        velocity = -x0 * omega0 * math.sin(omega0 * t) + v0 * math.cos(omega0 * t)
        return x, velocity

    if case == "underdamped":
        omega_d = math.sqrt(omega0**2 - gamma**2)
        a = x0
        b = (v0 + gamma * x0) / omega_d
        envelope = math.exp(-gamma * t)
        carrier = a * math.cos(omega_d * t) + b * math.sin(omega_d * t)
        carrier_prime = -a * omega_d * math.sin(omega_d * t) + b * omega_d * math.cos(omega_d * t)
        return envelope * carrier, envelope * (carrier_prime - gamma * carrier)

    if case == "critical":
        a = x0
        b = v0 + gamma * x0
        envelope = math.exp(-gamma * t)
        carrier = a + b * t
        return envelope * carrier, envelope * (b - gamma * carrier)

    decay = math.sqrt(gamma**2 - omega0**2)
    r1 = -gamma + decay
    r2 = -gamma - decay
    c1 = (v0 - r2 * x0) / (r1 - r2)
    c2 = x0 - c1
    x = c1 * math.exp(r1 * t) + c2 * math.exp(r2 * t)
    velocity = c1 * r1 * math.exp(r1 * t) + c2 * r2 * math.exp(r2 * t)
    return x, velocity


def equation_text(data: DampingInput, omega0: float, gamma: float, case: str, warning: str) -> str:
    lines = [
        "Python solve:",
        "m x'' + b x' + kx = 0",
        "x'' + 2 gamma x' + omega0^2 x = 0",
        "",
        f"omega0 = sqrt(k/m) = {omega0:.3f}",
        f"gamma = b/(2m) = {gamma:.3f}",
        f"case = {case}",
        "",
        "Initial values:",
        f"x(0) = {data.x0:.3f}",
        f"v(0) = {data.v0:.3f}",
        "",
        "Classification:",
        "gamma < omega0: underdamped",
        "gamma = omega0: critical",
        "gamma > omega0: overdamped",
    ]
    if case == "underdamped":
        omega_d = math.sqrt(omega0**2 - gamma**2)
        lines.extend(["", f"omega_d = sqrt(omega0^2 - gamma^2) = {omega_d:.3f}", "x(t) = e^(-gamma t)(A cos(omega_d t) + B sin(omega_d t))"])
    elif case == "critical":
        lines.extend(["", "x(t) = e^(-gamma t)(A + Bt)"])
    elif case == "overdamped":
        lines.extend(["", "x(t) = C1 e^(r1 t) + C2 e^(r2 t)"])
    else:
        lines.extend(["", "x(t) = x0 cos(omega0 t) + (v0/omega0) sin(omega0 t)"])
    if warning:
        lines.extend(["", f"warning: {warning}"])
    return "\n".join(lines)


def one(params: dict[str, list[str]], name: str, fallback: str) -> str:
    values = params.get(name)
    if not values or values[0] == "":
        return fallback
    return values[0]
