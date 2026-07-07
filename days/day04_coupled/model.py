from __future__ import annotations

import math
from dataclasses import dataclass


SIMULATION = {
    "id": "day04_coupled",
    "day": 4,
    "title": "Coupled oscillators",
    "description": "Two equal masses connected by springs, solved with normal modes.",
}


@dataclass(frozen=True)
class CoupledInput:
    mass: float
    spring: float
    coupling: float
    x1: float
    x2: float
    v1: float
    v2: float
    duration: float


def solve_from_params(params: dict[str, list[str]]) -> dict:
    data = CoupledInput(
        mass=float(one(params, "m", "1")),
        spring=float(one(params, "k", "4")),
        coupling=float(one(params, "kc", "1.5")),
        x1=float(one(params, "x1", "1")),
        x2=float(one(params, "x2", "0")),
        v1=float(one(params, "v1", "0")),
        v2=float(one(params, "v2", "0")),
        duration=float(one(params, "duration", "30")),
    )
    return solve_coupled(data)


def solve_coupled(data: CoupledInput, samples: int = 900) -> dict:
    if data.mass <= 0:
        raise ValueError("mass must be positive")
    if data.spring <= 0:
        raise ValueError("spring constant must be positive")
    if data.coupling < 0:
        raise ValueError("coupling spring must be non-negative")
    if data.duration <= 0:
        raise ValueError("duration must be positive")

    omega_in = math.sqrt(data.spring / data.mass)
    omega_out = math.sqrt((data.spring + 2 * data.coupling) / data.mass)
    points = [state_at(data.duration * i / (samples - 1), data, omega_in, omega_out) for i in range(samples)]

    return {
        "simulation": SIMULATION,
        "input": {
            "mass": data.mass,
            "spring": data.spring,
            "coupling": data.coupling,
            "x1": data.x1,
            "x2": data.x2,
            "v1": data.v1,
            "v2": data.v2,
            "duration": data.duration,
        },
        "omegaIn": omega_in,
        "omegaOut": omega_out,
        "duration": data.duration,
        "loop": True,
        "warning": "",
        "points": points,
        "equationText": equation_text(data, omega_in, omega_out),
    }


def state_at(t: float, data: CoupledInput, omega_in: float, omega_out: float) -> dict:
    q_plus0 = (data.x1 + data.x2) / 2
    q_minus0 = (data.x1 - data.x2) / 2
    v_plus0 = (data.v1 + data.v2) / 2
    v_minus0 = (data.v1 - data.v2) / 2

    q_plus = q_plus0 * math.cos(omega_in * t) + (v_plus0 / omega_in) * math.sin(omega_in * t)
    q_minus = q_minus0 * math.cos(omega_out * t) + (v_minus0 / omega_out) * math.sin(omega_out * t)
    v_plus = -q_plus0 * omega_in * math.sin(omega_in * t) + v_plus0 * math.cos(omega_in * t)
    v_minus = -q_minus0 * omega_out * math.sin(omega_out * t) + v_minus0 * math.cos(omega_out * t)

    x1 = q_plus + q_minus
    x2 = q_plus - q_minus
    v1 = v_plus + v_minus
    v2 = v_plus - v_minus
    a1 = (-(data.spring + data.coupling) * x1 + data.coupling * x2) / data.mass
    a2 = (data.coupling * x1 - (data.spring + data.coupling) * x2) / data.mass

    return {
        "t": t,
        "x": x1,
        "v": v1,
        "a": a1,
        "force": data.mass * a1,
        "x1": x1,
        "x2": x2,
        "v1": v1,
        "v2": v2,
        "a1": a1,
        "a2": a2,
        "force1": data.mass * a1,
        "force2": data.mass * a2,
        "qPlus": q_plus,
        "qMinus": q_minus,
    }


def equation_text(data: CoupledInput, omega_in: float, omega_out: float) -> str:
    return "\n".join(
        [
            "Python solve:",
            "Two masses, no damping, no driving.",
            "",
            "m x1'' = -k x1 - kc(x1 - x2)",
            "m x2'' = -k x2 - kc(x2 - x1)",
            "",
            "Use normal coordinates:",
            "q+ = (x1 + x2) / 2",
            "q- = (x1 - x2) / 2",
            "",
            "The equations separate:",
            "q+'' + (k/m) q+ = 0",
            "q-'' + ((k + 2kc)/m) q- = 0",
            "",
            f"omega_in = sqrt(k/m) = {omega_in:.3f}",
            f"omega_out = sqrt((k + 2kc)/m) = {omega_out:.3f}",
            "",
            "Initial values:",
            f"x1(0) = {data.x1:.3f}, x2(0) = {data.x2:.3f}",
            f"v1(0) = {data.v1:.3f}, v2(0) = {data.v2:.3f}",
            "",
            "Then convert back:",
            "x1 = q+ + q-",
            "x2 = q+ - q-",
        ]
    )


def one(params: dict[str, list[str]], name: str, fallback: str) -> str:
    values = params.get(name)
    if not values or values[0] == "":
        return fallback
    return values[0]
