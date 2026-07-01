from __future__ import annotations

from simulations.day01_boundary_value import model as day01_boundary_value


MODULES = [
    day01_boundary_value,
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
