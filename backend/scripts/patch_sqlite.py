from sqlalchemy import create_engine, text

engine = create_engine("sqlite:///./ramani.db")
patches = {
    "landmarks": [
        ("provenance", "VARCHAR(64) DEFAULT 'seed'"),
        ("geom_wkt", "TEXT"),
    ],
    "graph_edges": [
        ("provenance", "VARCHAR(64) DEFAULT 'seed'"),
        ("geom_wkt", "TEXT"),
    ],
    "sos_events": [
        ("phone_hash", "VARCHAR(64)"),
        ("needs_medical", "BOOLEAN DEFAULT 0"),
        ("location_hash", "VARCHAR(64)"),
    ],
    "hazard_events": [
        ("photo_path", "TEXT"),
        ("voice_path", "TEXT"),
    ],
}

with engine.begin() as conn:
    for table, columns in patches.items():
        existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})")).fetchall()}
        print(table, sorted(existing))
        for name, ddl in columns:
            if name not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
                print("added", table, name)
