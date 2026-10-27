
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import sqlite3

app = Flask(__name__)
CORS(app)

DB_NAME = "anomaly_history.db"


# Create the database and table if they do not exist
def init_db():
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                value REAL NOT NULL,
                anomaly_score REAL NOT NULL,
                label TEXT NOT NULL,
                evidence TEXT NOT NULL
            )
        """)


# Save one detection result permanently
def save_reading(result):
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute("""
            INSERT INTO readings
            (timestamp, value, anomaly_score, label, evidence)
            VALUES (?, ?, ?, ?, ?)
        """, (
            result["timestamp"],
            result["value"],
            result["anomaly_score"],
            result["label"],
            result["evidence"]
        ))


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "service": "anomaly-monitor"
    })



@app.route("/api/readings", methods=["POST"])
def add_reading():
    data = request.get_json(silent=True)

    if not data or "value" not in data:
        return jsonify({"error": "Please provide a value"}), 400

    try:
        value = float(data["value"])
    except (ValueError, TypeError):
        return jsonify({"error": "Value must be a number"}), 400

    # Get the previous 10 readings
    with sqlite3.connect(DB_NAME) as conn:
        rows = conn.execute("""
            SELECT value FROM readings
            ORDER BY id DESC
            LIMIT 10
        """).fetchall()

    history = np.array(
        [row[0] for row in reversed(rows)],
        dtype=float
    )

    WINDOW = 10
    BEST_THRESHOLD = 2.5

    label = "NOT_EVALUATED"
    score = 0.0
    evidence = f"Collecting {WINDOW} previous readings"

    if len(history) >= WINDOW:
        baseline = float(np.median(history))
        deviations = np.abs(history - baseline)
        mad = float(np.median(deviations))

        scale = 1.4826 * mad

        if scale <= 1e-9:
            scale = float(np.std(history))

        difference = abs(value - baseline)

        if scale <= 1e-9:
            if difference <= 1e-9:
                score = 0.0
                label = "NORMAL"
                evidence = (
                    f"Reading matches constant baseline {baseline:.2f}"
                )
            else:
                score = BEST_THRESHOLD + 1
                label = "ANOMALOUS"
                evidence = (
                    f"Reading {value:.2f} differs from constant "
                    f"baseline {baseline:.2f}"
                )
        else:
            score = difference / scale

            if score > BEST_THRESHOLD:
                label = "ANOMALOUS"
                evidence = (
                    f"Score {score:.2f} exceeds threshold "
                    f"{BEST_THRESHOLD:.2f}; baseline {baseline:.2f}"
                )
            else:
                label = "NORMAL"
                evidence = (
                    f"Score {score:.2f} is within threshold "
                    f"{BEST_THRESHOLD:.2f}; baseline {baseline:.2f}"
                )

    # Save every reading, including readings not yet evaluated
    result = {
        "timestamp": data.get(
            "timestamp",
            datetime.now().isoformat(timespec="seconds")
        ),
        "value": value,
        "anomaly_score": round(float(score), 2),
        "label": label,
        "evidence": evidence
    }

    save_reading(result)
    return jsonify(result), 201


@app.route("/api/readings", methods=["GET"])
def get_readings():
   with sqlite3.connect(DB_NAME) as conn:
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT *
        FROM (
            SELECT id, timestamp, value, anomaly_score, label, evidence
            FROM readings
            ORDER BY id DESC
            LIMIT 100
        )
        ORDER BY id ASC
    """).fetchall()

    history = [dict(row) for row in rows]

    return jsonify({
        "count": len(history),
        "readings": history
    })


# Create the database before starting Flask
init_db()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
