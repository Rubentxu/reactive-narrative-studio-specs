"""Exit codes for the cinematic CLI.

Every failure mode observable from the shell maps to a distinct code so callers
can react to specific problems without parsing stderr.
"""

EXIT_SUCCESS = 0
EXIT_VALIDATION_ERROR = 1
EXIT_CONFLICT = 2
EXIT_INPUT_MISSING = 3
EXIT_INTERNAL_ERROR = 4
EXIT_BLENDER_UNRESOLVED = 5
EXIT_RUN_FAILED = 6
EXIT_LIVE_DENIED = 7
