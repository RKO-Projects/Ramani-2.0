"""Deprecated in-memory store. Use IncidentService via repositories."""

from app.domain.incidents import IncidentService


def add_sos(db, **kwargs):
    return IncidentService(db).add_sos(**kwargs)


def add_hazard(db, **kwargs):
    return IncidentService(db).add_hazard(**kwargs)
