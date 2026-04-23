# Observation Package — HTTP traffic capture
# Only middleware.py remains; store.py and schemas.py were removed
# as part of the SQLite → Redis/OpenSearch migration.
from .middleware import ObservationMiddleware
