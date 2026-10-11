import logging
import sys
from typing import Optional


class ColoredFormatter(logging.Formatter):
    """
    Custom console formatter that adds ANSI color coding to log levels.
    """
    COLORS = {
        logging.DEBUG: "\033[36m",     # Cyan
        logging.INFO: "\033[32m",      # Green
        logging.WARNING: "\033[33m",   # Yellow
        logging.ERROR: "\033[31m",     # Red
        logging.CRITICAL: "\033[1;31m" # Bold Red
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        """
        """
        color = self.COLORS.get(record.levelno, self.RESET)
        record.levelname = f"{color}{record.levelname:<8}{self.RESET}"
        return super().format(record)


def setup_logging(level: int = logging.INFO) -> None:
    """
    Configures the root logging handler with formatting.
    """
    handler = logging.StreamHandler(sys.stdout)
    formatter = ColoredFormatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    if not root_logger.handlers:
        root_logger.setLevel(level)
        root_logger.addHandler(handler)


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Returns a configured logger instance for the given module name.

    Args:
        name: Name of the logger (typically __name__).

    Returns:
        logging.Logger: Configured logger.
    """
    setup_logging()
    return logging.getLogger(name or "nottex")
