"""Bootstraps the package path so the CLI can run as ``python -m tools.cinematic``.

Keeping the bootstrap here (instead of installing the package) preserves a single
package identity for the ``cinematic`` modules regardless of how the entry point
is invoked.
"""

import sys
from pathlib import Path

_PACKAGE_ROOT = Path(__file__).resolve().parent

if str(_PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(_PACKAGE_ROOT))

from cinematic.cli import main  # noqa: E402

if __name__ == "__main__":
    main()
