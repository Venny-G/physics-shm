from __future__ import annotations

import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from days.registry import list_simulations, solve_simulation


class Handler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/simulations":
            self.send_json({"simulations": list_simulations()})
            return
        if parsed.path == "/api/solve":
            self.handle_solve(parsed.query)
            return
        super().do_GET()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def handle_solve(self, query: str) -> None:
        try:
            params = parse_qs(query)
            simulation_id = one(params, "sim", "day01_boundary_value")
            payload = solve_simulation(simulation_id, params)
            self.send_json(payload)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=400)

    def send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def one(params: dict[str, list[str]], name: str, fallback: str) -> str:
    values = params.get(name)
    if not values or values[0] == "":
        return fallback
    return values[0]


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 5173), Handler)
    print("Serving http://127.0.0.1:5173")
    server.serve_forever()


if __name__ == "__main__":
    main()
