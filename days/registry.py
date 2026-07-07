from __future__ import annotations

from days.day01_boundary_value import model as day01_boundary_value
from days.day02_damping import model as day02_damping
from days.day03_driven import model as day03_driven
from days.day04_coupled import model as day04_coupled


MODULES = [
    day01_boundary_value,
    day02_damping,
    day03_driven,
    day04_coupled,
]

SIMULATIONS = {module.SIMULATION["id"]: module for module in MODULES}


def list_simulations() -> list[dict]:
    return [module.SIMULATION for module in MODULES]


def solve_simulation(simulation_id: str, params: dict[str, list[str]]) -> dict:
    module = SIMULATIONS.get(simulation_id)
    if module is None:
        known = ", ".join(SIMULATIONS)
        raise ValueError(f"unknown simulation '{simulation_id}'. known: {known}")
    return module.solve_from_params(params)
