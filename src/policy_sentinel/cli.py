"""Command-line interface for policy-sentinel.

Provides the ``policy-sentinel`` CLI entry point powered by Typer.
"""

import typer

app = typer.Typer(
    name="policy-sentinel",
    help="Sovereignty-centered policy intelligence engine.",
)


@app.command()
def init() -> None:
    """Scaffold a new deployment repository."""
    typer.echo("policy-sentinel init: scaffold a new deployment repository (stub).")
