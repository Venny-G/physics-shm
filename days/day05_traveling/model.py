from __future__ import annotations

import math
from dataclasses import dataclass


SIMULATION = {
    "id": "day05_traveling",
    "day": 5,
    "title": "Traveling waves",
    "description": "Sinusoidal waves and pulses traveling on an ideal taut string.",
}


@dataclass(frozen=True)
class TravelingWaveInput:
    tension: float
    linear_density: float
    amplitude: float
    wavelength: float
    phase: float
    direction: int
    waveform: str
    length: float
    duration: float


def solve_from_params(params: dict[str, list[str]]) -> dict:
    direction = int(float(one(params, "direction", "1")))
    data = TravelingWaveInput(
        tension=float(one(params, "tension", "4")),
        linear_density=float(one(params, "mu", "0.25")),
        amplitude=float(one(params, "amplitude", "0.8")),
        wavelength=float(one(params, "wavelength", "4")),
        phase=float(one(params, "phase", "0")),
        direction=1 if direction >= 0 else -1,
        waveform=one(params, "waveform", "sinusoid"),
        length=float(one(params, "length", "12")),
        duration=float(one(params, "duration", "6")),
    )
    return solve_traveling_wave(data)


def solve_traveling_wave(data: TravelingWaveInput, samples: int = 360, spatial_samples: int = 181) -> dict:
    if data.tension <= 0:
        raise ValueError("tension must be positive")
    if data.linear_density <= 0:
        raise ValueError("linear density must be positive")
    if data.wavelength <= 0:
        raise ValueError("wavelength must be positive")
    if data.length <= 0 or data.duration <= 0:
        raise ValueError("length and duration must be positive")
    if data.waveform not in {"sinusoid", "pulse"}:
        raise ValueError("waveform must be sinusoid or pulse")

    speed = math.sqrt(data.tension / data.linear_density)
    wave_number = 2 * math.pi / data.wavelength
    omega = speed * wave_number
    probe_x = data.length / 2
    x_values = [data.length * i / (spatial_samples - 1) for i in range(spatial_samples)]
    points = []
    for i in range(samples):
        t = data.duration * i / (samples - 1)
        y_values = [displacement(x, t, data, speed, wave_number) for x in x_values]
        y_probe = displacement(probe_x, t, data, speed, wave_number)
        v_probe = transverse_velocity(probe_x, t, data, speed, wave_number)
        points.append({"t": t, "x": y_probe, "v": v_probe, "a": probe_acceleration(probe_x, t, data, speed, wave_number), "force": 0.0, "yValues": y_values})

    return {
        "simulation": SIMULATION,
        "input": {
            "tension": data.tension,
            "linearDensity": data.linear_density,
            "amplitude": data.amplitude,
            "wavelength": data.wavelength,
            "phase": data.phase,
            "direction": data.direction,
            "waveform": data.waveform,
            "length": data.length,
            "duration": data.duration,
        },
        "speed": speed,
        "waveNumber": wave_number,
        "omega": omega,
        "probeX": probe_x,
        "xValues": x_values,
        "duration": data.duration,
        "loop": True,
        "warning": "",
        "points": points,
        "equationText": equation_text(data, speed, wave_number, omega),
    }


def wrapped_coordinate(value: float, length: float) -> float:
    return (value + length / 2) % length - length / 2


def displacement(x: float, t: float, data: TravelingWaveInput, speed: float, wave_number: float) -> float:
    traveling_x = x - data.direction * speed * t
    if data.waveform == "pulse":
        center = data.length * 0.25
        width = data.wavelength / 3
        distance = wrapped_coordinate(traveling_x - center, data.length)
        return data.amplitude * math.exp(-((distance / width) ** 2))
    return data.amplitude * math.cos(wave_number * traveling_x + data.phase)


def transverse_velocity(x: float, t: float, data: TravelingWaveInput, speed: float, wave_number: float) -> float:
    traveling_x = x - data.direction * speed * t
    if data.waveform == "pulse":
        center = data.length * 0.25
        width = data.wavelength / 3
        distance = wrapped_coordinate(traveling_x - center, data.length)
        y = data.amplitude * math.exp(-((distance / width) ** 2))
        return data.direction * speed * (2 * distance / (width ** 2)) * y
    angle = wave_number * traveling_x + data.phase
    return data.direction * data.amplitude * speed * wave_number * math.sin(angle)


def probe_acceleration(x: float, t: float, data: TravelingWaveInput, speed: float, wave_number: float) -> float:
    if data.waveform == "sinusoid":
        return -(speed * wave_number) ** 2 * displacement(x, t, data, speed, wave_number)
    dt = 1e-4
    return (transverse_velocity(x, t + dt, data, speed, wave_number) - transverse_velocity(x, t - dt, data, speed, wave_number)) / (2 * dt)


def equation_text(data: TravelingWaveInput, speed: float, wave_number: float, omega: float) -> str:
    direction_text = "right" if data.direction > 0 else "left"
    shape = "f(x - ct)" if data.direction > 0 else "g(x + ct)"
    lines = [
        "Python solve:",
        "Ideal taut string, no damping.",
        "",
        "d2y/dt2 = c^2 d2y/dx2",
        f"c = sqrt(T/mu) = {speed:.3f}",
        "",
        f"This shape moves {direction_text}:",
        f"y(x,t) = {shape}",
    ]
    if data.waveform == "sinusoid":
        lines.extend(["", "y(x,t) = A cos(k(x -/+ ct) + phi)", f"k = 2pi/lambda = {wave_number:.3f}", f"omega = ck = {omega:.3f}"])
    else:
        lines.extend(["", "The Gaussian pulse keeps its shape as it travels.", "Periodic wrapping represents a long repeating string."])
    lines.extend(["", "String points move up and down.", "The wave pattern and energy move along the string."])
    return "\n".join(lines)


def one(params: dict[str, list[str]], name: str, fallback: str) -> str:
    values = params.get(name)
    if not values or values[0] == "":
        return fallback
    return values[0]
