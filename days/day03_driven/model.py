from __future__ import annotations

import math
from dataclasses import dataclass


SIMULATION = {
    "id": "day03_driven",
    "day": 3,
    "title": "Driven oscillations",
    "description": "A damped oscillator driven by an external sinusoidal force.",
}


@dataclass(frozen=True)
class DrivenInput:
    mass: float
    spring: float
    damping: float
    drive_force: float
    drive_omega: float
    x0: float
    v0: float
    duration: float


def solve_from_params(params: dict[str, list[str]]) -> dict:
    data = DrivenInput(
        mass=float(one(params, "m", "1")),
        spring=float(one(params, "k", "4")),
        damping=float(one(params, "b", "0.35")),
        drive_force=float(one(params, "F0", "1")),
        drive_omega=float(one(params, "omega", "2")),
        x0=float(one(params, "x0", "0")),
        v0=float(one(params, "v0", "0")),
        duration=float(one(params, "duration", "30")),
    )
    return solve_driven(data)


def solve_driven(data: DrivenInput, samples: int = 900) -> dict:
    if data.mass <= 0:
        raise ValueError("mass must be positive")
    if data.spring <= 0:
        raise ValueError("spring constant must be positive")
    if data.damping < 0:
        raise ValueError("damping must be non-negative")
    if data.drive_omega < 0:
        raise ValueError("drive frequency must be non-negative")
    if data.duration <= 0:
        raise ValueError("duration must be positive")

    omega0 = math.sqrt(data.spring / data.mass)
    gamma = data.damping / data.mass
    resonance_omega = resonance_frequency(omega0, gamma)
    response_amplitude = steady_response_amplitude(data.drive_force / data.mass, omega0, gamma, data.drive_omega)
    phase_delta = phase_lag(omega0, gamma, data.drive_omega)
    points = integrate_points(data, samples)
    response_curve = response_curve_points(data.drive_force / data.mass, omega0, gamma, data.drive_omega)
    warning = ""
    if data.damping == 0:
        warning = "No damping: near resonance, the driven response can grow very large."

    return {
        "simulation": SIMULATION,
        "input": {
            "mass": data.mass,
            "spring": data.spring,
            "damping": data.damping,
            "driveForce": data.drive_force,
            "driveOmega": data.drive_omega,
            "x0": data.x0,
            "v0": data.v0,
            "duration": data.duration,
        },
        "omega0": omega0,
        "gamma": gamma,
        "resonanceOmega": resonance_omega,
        "responseAmplitude": response_amplitude,
        "phaseDelta": phase_delta,
        "duration": data.duration,
        "loop": False,
        "warning": warning,
        "points": points,
        "responseCurve": response_curve,
        "equationText": equation_text(data, omega0, gamma, resonance_omega, response_amplitude, phase_delta, warning),
    }


def integrate_points(data: DrivenInput, samples: int) -> list[dict]:
    t = 0.0
    x = data.x0
    velocity = data.v0
    dt = data.duration / (samples - 1)
    points = []

    for index in range(samples):
        points.append(point_at(t, x, velocity, data))
        if index == samples - 1:
            break
        x, velocity = rk4_step(t, x, velocity, dt, data)
        t += dt

    return points


def point_at(t: float, x: float, velocity: float, data: DrivenInput) -> dict:
    drive = data.drive_force * math.cos(data.drive_omega * t)
    acceleration = (drive - data.damping * velocity - data.spring * x) / data.mass
    return {"t": t, "x": x, "v": velocity, "a": acceleration, "force": data.mass * acceleration, "drive": drive}


def rk4_step(t: float, x: float, velocity: float, dt: float, data: DrivenInput) -> tuple[float, float]:
    def derivative(time: float, state_x: float, state_v: float) -> tuple[float, float]:
        drive = data.drive_force * math.cos(data.drive_omega * time)
        acceleration = (drive - data.damping * state_v - data.spring * state_x) / data.mass
        return state_v, acceleration

    k1x, k1v = derivative(t, x, velocity)
    k2x, k2v = derivative(t + dt / 2, x + k1x * dt / 2, velocity + k1v * dt / 2)
    k3x, k3v = derivative(t + dt / 2, x + k2x * dt / 2, velocity + k2v * dt / 2)
    k4x, k4v = derivative(t + dt, x + k3x * dt, velocity + k3v * dt)

    next_x = x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x)
    next_v = velocity + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
    return next_x, next_v


def resonance_frequency(omega0: float, gamma: float) -> float:
    value = omega0**2 - gamma**2 / 2
    return math.sqrt(value) if value > 0 else 0.0


def steady_response_amplitude(force_per_mass: float, omega0: float, gamma: float, drive_omega: float) -> float:
    denominator = math.hypot(omega0**2 - drive_omega**2, gamma * drive_omega)
    return abs(force_per_mass) / denominator if denominator else math.inf


def phase_lag(omega0: float, gamma: float, drive_omega: float) -> float:
    return math.atan2(gamma * drive_omega, omega0**2 - drive_omega**2)


def response_curve_points(force_per_mass: float, omega0: float, gamma: float, drive_omega: float, samples: int = 180) -> list[dict]:
    omega_max = max(omega0 * 2.5, drive_omega * 1.25, 1.0)
    points = []
    for index in range(samples):
        omega = omega_max * index / (samples - 1)
        points.append(
            {
                "omega": omega,
                "amplitude": steady_response_amplitude(force_per_mass, omega0, gamma, omega),
                "phaseDelta": phase_lag(omega0, gamma, omega),
            }
        )
    return points


def equation_text(
    data: DrivenInput,
    omega0: float,
    gamma: float,
    resonance_omega: float,
    response_amplitude: float,
    phase_delta: float,
    warning: str,
) -> str:
    lines = [
        "Python solve:",
        "Step 1: physical setup -> equation of motion",
        "m x'' + b x' + kx = F0 cos(omega t)",
        "x'' + gamma x' + omega0^2 x = (F0/m) cos(omega t)",
        "",
        "Step 2: solve the generic math problem",
        "x(t) = A(omega) cos(omega t - delta) + transient",
        "transient = C e^(-gamma t/2) cos(omega' t + phi)",
        "",
        f"omega0 = sqrt(k/m) = {omega0:.3f}",
        f"gamma = b/m = {gamma:.3f}",
        f"drive omega = {data.drive_omega:.3f}",
        f"resonance estimate = {resonance_omega:.3f}",
        f"A(omega) = {response_amplitude:.3f}",
        f"delta = {phase_delta:.3f} rad",
        "",
        "Initial values:",
        f"x(0) = {data.x0:.3f}",
        f"v(0) = {data.v0:.3f}",
        "",
        "Step 3: interpret the answer",
        "early motion = transient + steady-state response",
        "late motion = steady-state response at the drive frequency",
        "below omega0: response mostly in phase",
        "above omega0: response mostly out of phase",
    ]
    if warning:
        lines.extend(["", f"warning: {warning}"])
    return "\n".join(lines)


def one(params: dict[str, list[str]], name: str, fallback: str) -> str:
    values = params.get(name)
    if not values or values[0] == "":
        return fallback
    return values[0]
