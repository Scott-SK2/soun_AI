"""
Centralised logging setup for soun_AI.
Usage:
    from utils.logger import get_logger
    log = get_logger(__name__)
    log.info("message")
    log.warning("something odd")
    log.error("something failed: %s", err)
"""
from __future__ import annotations
import logging
import os
from pathlib import Path

from config import LOG_DIR


def get_logger(name: str, level: int | None = None) -> logging.Logger:
    """
    Return a configured logger. First call creates the root handler.
    Subsequent calls with the same name return the cached logger.
    """
    logger = logging.getLogger(name)

    # Only configure if no handlers have been added yet
    if not logger.handlers and not logging.getLogger().handlers:
        _setup_root_logger(level)

    return logger


def _setup_root_logger(level: int | None = None) -> None:
    log_level = level or int(os.environ.get("SOUN_LOG_LEVEL", logging.INFO))

    # Console handler
    console = logging.StreamHandler()
    console.setLevel(log_level)
    fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)-8s %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )
    console.setFormatter(fmt)

    # File handler (optional — created only if LOG_DIR is writable)
    handlers: list[logging.Handler] = [console]
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        fh = logging.FileHandler(LOG_DIR / "soun_ai.log", encoding="utf-8")
        fh.setLevel(log_level)
        fh.setFormatter(fmt)
        handlers.append(fh)
    except OSError:
        pass  # log dir not writable — console only

    logging.basicConfig(level=log_level, handlers=handlers)
