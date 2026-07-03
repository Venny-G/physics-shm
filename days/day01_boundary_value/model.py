from __future__ import annotations

import math
from dataclasses import dataclass


SIMULATION = {
    "id": "day01_boundary_value",
    "day": 1,
    "title": "Boundary-value SHM",
    "description": "Undamped spring motion solved from x(0), x(T), T, m, and k.",
}


@dataclass(frozen=True)
class BoundaryInput:
    mass: float
    spring: float
    x0: float
    xT: float
    target_time: float


def solve_from_params(params: dict[str, list[str]]) -> dict:
    data = BoundaryInput(
        mass=float(one(params, "m", "1")),
        spring=float(one(params, "k", "4")),
        x0=float(one(params, "x0", "1")),
        xT=float(one(params, "xT", "-1")),
        target_time=float(one(params, "T", "1.2")),
    )
    return solve_boundary(data)


def solve_boundary(data: BoundaryInput, samples: int = 600) -> dict:
    if data.mass <= 0:
        raise ValueError("mass must be positive")
    if data.spring <= 0:
        raise ValueError("spring constant must be positive")
    if data.target_time <= 0:
        raise ValueError("target time must be positive")

    omega = math.sqrt(data.spring / data.mass)
    period = 2 * math.pi / omega
    denominator = math.sin(omega * data.target_time)
    warning = ""

    if abs(denominator) < 0.035:
        v0 = 0.0
        warning = "Near singular boundary time: target may be impossible or non-unique."
    else:
        v0 = omega * (data.xT - data.x0 * math.cos(omega * data.target_time)) / denominator

    amplitude, phase = amplitude_phase(data.x0, v0, omega)
    duration = max(period * 2.0, data.target_time * 1.25, 1.0)
    points = []
    for index in range(samples):
        t = duration * index / (samples - 1)
        x = position_at(t, amplitude, phase, omega)
        velocity = velocity_at(t, amplitude, phase, omega)
        acceleration = -(omega**2) * x
        force = -data.spring * x
        points.append(
            {
                "t": t,
                "x": x,
                "v": velocity,
                "a": acceleration,
                "force": force,
            }
        )

    return {
        "simulation": SIMULATION,
        "input": {
            "mass": data.mass,
            "spring": data.spring,
            "x0": data.x0,
            "xT": data.xT,
            "targetTime": data.target_time,
        },
        "omega": omega,
        "period": period,
        "v0": v0,
        "amplitude": amplitude,
        "phase": phase,
        "duration": duration,
        "warning": warning,
        "points": points,
        "equationText": equation_text(data, omega, period, v0, amplitude, phase, warning),
    }


def amplitude_phase(x0: float, v0: float, omega: float) -> tuple[float, float]:
    amplitude = math.hypot(x0, v0 / omega)
    phase = math.atan2(-v0 / omega, x0)
    return amplitude, phase


def position_at(t: float, amplitude: float, phase: float, omega: float) -> float:
    return amplitude * math.cos(omega * t + phase)


def velocity_at(t: float, amplitude: float, phase: float, omega: float) -> float:
    return -amplitude * omega * math.sin(omega * t + phase)


def equation_text(
    data: BoundaryInput,
    omega: float,
    period: float,
    v0: float,
    amplitude: float,
    phase: float,
    warning: str,
) -> str:
    lines = [
        "Python solve:",
        "m x'' = -k x",
        f"x'' + ({omega:.3f})^2 x = 0",
        "",
        "Boundary values:",
        f"x(0) = {data.x0:.3f}",
        f"x({data.target_time:.3f}) = {data.xT:.3f}",
        "",
        "Solve missing initial velocity:",
        "v0 = w0 * (xT - x0 cos(w0 T)) / sin(w0 T)",
        f"v0 = {v0:.3f}",
        "",
        "Convert to your lecture-note form:",
        "x(0) = A cos(phi)",
        "v(0) = -A w0 sin(phi)",
        "A = sqrt(x0^2 + (v0/w0)^2)",
        "phi = atan2(-v0/w0, x0)",
        f"A = {amplitude:.3f}",
        f"phi = {phase:.3f} rad",
        "",
        "Position:",
        "x(t) = A cos(w0 t + phi)",
        f"x(t) = {amplitude:.3f} cos({omega:.3f}t + {phase:.3f})",
        "",
        "Derived values:",
        f"period = {period:.3f}",
        "a(t) = -w0^2 x(t)",
        "F(t) = -k x(t)",
    ]
    if warning:
        lines.extend(["", f"warning: {warning}"])
    return "\n".join(lines)


def one(params: dict[str, list[str]], name: str, fallback: str) -> str:
    values = params.get(name)
    if not values or values[0] == "":
        return fallback
    return values[0]
