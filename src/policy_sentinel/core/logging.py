"""Logging utilities for policy-sentinel.

Sovereignty Posture
-------------------
Logs MUST NOT contain Tribal-specific data at INFO level or above.
Debug-level logs may reference document IDs but never corpus content,
tribe names, or sovereignty configuration values.
"""

import logging

_DEFAULT_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"


def get_logger(name: str) -> logging.Logger:
    """Return a configured logger for the given module name.

    Parameters
    ----------
    name : str
        Logger name, typically ``__name__`` of the calling module.

    Returns
    -------
    logging.Logger
        A logger instance with the default format applied.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(_DEFAULT_FORMAT))
        logger.addHandler(handler)
    return logger
