from __future__ import annotations

import math
from dataclasses import dataclass


SIMULATION = {
    "id": "day02_damping",
    "day": 2,
    "title": "Weak and strong damping",
    "description": "Damped oscillator cases using the OCW gamma^2 vs 4 omega0^2 test.",
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
    gamma = data.damping / data.mass
    case_id = damping_case(gamma, omega0)
    case_label = case_title(case_id)
    omega_prime = omega_prime_for(gamma, omega0, case_id)
    quality_factor = omega0 / gamma if case_id == "weak" and gamma > 0 else None
    duration = data.duration
    points = []

    for index in range(samples):
        t = duration * index / (samples - 1)
        x, velocity = state_at(t, data.x0, data.v0, gamma, omega0, case_id)
        acceleration = -(data.damping * velocity + data.spring * x) / data.mass
        force = data.mass * acceleration
        points.append({"t": t, "x": x, "v": velocity, "a": acceleration, "force": force})

    warning = ""
    if case_id == "none":
        warning = "b = 0, so there is no damping."
    elif case_id == "critical":
        warning = "Critical damping is the boundary between weak oscillation and strong non-oscillation."

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
        "threshold": 2 * omega0,
        "omegaPrime": omega_prime,
        "qualityFactor": quality_factor,
        "case": case_label,
        "caseId": case_id,
        "duration": duration,
        "loop": False,
        "warning": warning,
        "points": points,
        "equationText": equation_text(data, omega0, gamma, omega_prime, quality_factor, case_id, case_label, warning),
    }


def damping_case(gamma: float, omega0: float) -> str:
    if gamma == 0:
        return "none"
    discriminant = gamma**2 - 4 * omega0**2
    tolerance = 1e-9 * max(1.0, gamma**2, 4 * omega0**2)
    if abs(discriminant) <= tolerance:
        return "critical"
    if discriminant < 0:
        return "weak"
    return "strong"


def case_title(case_id: str) -> str:
    return {
        "none": "no damping",
        "weak": "weak damping",
        "critical": "critical damping",
        "strong": "strong damping",
    }[case_id]


def omega_prime_for(gamma: float, omega0: float, case_id: str) -> float | None:
    if case_id != "weak":
        return None
    return math.sqrt(omega0**2 - (gamma**2 / 4))


def state_at(t: float, x0: float, v0: float, gamma: float, omega0: float, case_id: str) -> tuple[float, float]:
    if case_id == "none":
        x = x0 * math.cos(omega0 * t) + (v0 / omega0) * math.sin(omega0 * t)
        velocity = -x0 * omega0 * math.sin(omega0 * t) + v0 * math.cos(omega0 * t)
        return x, velocity

    if case_id == "weak":
        omega_prime = math.sqrt(omega0**2 - (gamma**2 / 4))
        a = x0
        b = (v0 + (gamma * x0 / 2)) / omega_prime
        envelope = math.exp(-(gamma * t) / 2)
        carrier = a * math.cos(omega_prime * t) + b * math.sin(omega_prime * t)
        carrier_prime = -a * omega_prime * math.sin(omega_prime * t) + b * omega_prime * math.cos(omega_prime * t)
        return envelope * carrier, envelope * (carrier_prime - (gamma * carrier / 2))

    if case_id == "critical":
        alpha = gamma / 2
        a = x0
        b = v0 + alpha * x0
        envelope = math.exp(-alpha * t)
        carrier = a + b * t
        return envelope * carrier, envelope * (b - alpha * carrier)

    spread = math.sqrt(gamma**2 - 4 * omega0**2)
    alpha1 = (gamma - spread) / 2
    alpha2 = (gamma + spread) / 2
    a = (v0 + alpha2 * x0) / (alpha2 - alpha1)
    b = x0 - a
    x = a * math.exp(-alpha1 * t) + b * math.exp(-alpha2 * t)
    velocity = -alpha1 * a * math.exp(-alpha1 * t) - alpha2 * b * math.exp(-alpha2 * t)
    return x, velocity


def equation_text(
    data: DampingInput,
    omega0: float,
    gamma: float,
    omega_prime: float | None,
    quality_factor: float | None,
    case_id: str,
    case_label: str,
    warning: str,
) -> str:
    lines = [
        "Python solve:",
        "m x'' + b x' + kx = 0",
        "x'' + gamma x' + omega0^2 x = 0",
        "",
        f"omega0 = sqrt(k/m) = {omega0:.3f}",
        f"gamma = b/m = {gamma:.3f}",
        f"2 omega0 = {2 * omega0:.3f}",
        f"case = {case_label}",
        "",
        "Initial values:",
        f"x(0) = {data.x0:.3f}",
        f"v(0) = {data.v0:.3f}",
        "",
        "OCW classification:",
        "gamma^2 < 4 omega0^2: weak damping",
        "gamma^2 = 4 omega0^2: critical damping",
        "gamma^2 > 4 omega0^2: strong damping",
    ]
    if case_id == "weak":
        lines.extend(
            [
                "",
                f"omega' = sqrt(omega0^2 - gamma^2/4) = {omega_prime:.3f}",
                "x(t) = e^(-gamma t/2)(A cos(omega' t) + B sin(omega' t))",
                f"Q ~= omega0/gamma = {quality_factor:.3f}",
            ]
        )
    elif case_id == "critical":
        lines.extend(["", "x(t) = e^(-gamma t/2)(A + Bt)"])
    elif case_id == "strong":
        lines.extend(
            [
                "",
                "alpha1,2 = (gamma +/- sqrt(gamma^2 - 4 omega0^2)) / 2",
                "x(t) = A e^(-alpha1 t) + B e^(-alpha2 t)",
            ]
        )
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
