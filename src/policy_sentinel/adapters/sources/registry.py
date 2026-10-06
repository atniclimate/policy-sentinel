"""Source adapter registry.

A simple dict-based registry for looking up source adapters by name.
Adapters are registered explicitly at import time.
"""

from __future__ import annotations

_registry: dict[str, type] = {}


def register(name: str, cls: type) -> None:
    """Register a source adapter class under the given name.

    Parameters
    ----------
    name : str
        A unique short name for the adapter (e.g. ``"federal_register"``).
    cls : type
        The adapter class -- must satisfy the ``SourceAdapter`` protocol.

    Raises
    ------
    TypeError
        If *cls* does not implement the ``SourceAdapter`` protocol.
    """
    has_methods = hasattr(cls, "query") and hasattr(cls, "parse") and hasattr(cls, "compare")
    if not has_methods:
        msg = f"{cls!r} does not implement the SourceAdapter protocol"
        raise TypeError(msg)
    _registry[name] = cls


def get(name: str) -> type:
    """Retrieve a registered adapter class by name.

    Parameters
    ----------
    name : str
        The adapter name used during registration.

    Returns
    -------
    type
        The adapter class.

    Raises
    ------
    KeyError
        If no adapter is registered under *name*.
    """
    return _registry[name]


def list_adapters() -> list[str]:
    """Return the names of all registered adapters.

    Returns
    -------
    list[str]
        Sorted list of registered adapter names.
    """
    return sorted(_registry)
