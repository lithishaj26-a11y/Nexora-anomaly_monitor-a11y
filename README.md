# Nexora

# Sentinel — Sensor Monitoring & Anomaly Detection Dashboard

Sentinel is a sensor-monitoring prototype that receives numeric readings, detects unusual values using a robust statistical threshold, stores reading history in SQLite, and exposes the results through a Flask API for a dashboard.

## Features

- Accepts sensor readings through a REST API.
- Checks new readings against the previous 10 stored readings.
- Uses the median and Median Absolute Deviation (MAD)-based scale to estimate how unusual a reading is.
- Labels readings as `NORMAL`, `ANOMALOUS`, or `NOT_EVALUATED` while collecting enough history.
- Stores timestamps, values, anomaly scores, labels, and explanatory evidence in SQLite.
- Provides API endpoints to check service health and retrieve recent readings.
- Includes a simulator that generates mostly normal readings and occasional high values.
- Includes a notebook named `Sentinel_BestThreshold_Executed.ipynb` for the threshold-related experiment.

## Project files

| File | Purpose |
|---|---|
| `app.py` | Flask API, anomaly detection, and database operations |
| `simulator.py` | Generates sample readings and sends them to the API |
| `command.js` | Front-end JavaScript for dashboard interactions |
| `styling.css` | Dashboard layout, charts/tables styling, and responsive design |
| `Sentinel_BestThreshold_Executed.ipynb` | Notebook used for the threshold experiment |
| `anomaly_history.db` | SQLite database; created automatically by the backend if missing |

> The dashboard also needs its HTML page and any required JavaScript/chart-library dependencies. Keep those files in the same project structure expected by `command.js`.

## Technologies used

- Python
- Flask — REST API
- Flask-CORS — cross-origin API access
- NumPy — statistical calculations
- SQLite — persistent reading history
- Requests — simulator-to-API HTTP requests
- HTML, CSS, and JavaScript — dashboard interface
- Jupyter Notebook — threshold experiment

## How it works

1. The simulator generates a reading and timestamp.
2. It sends the reading to `POST /api/readings`.
3. The backend validates that the value is numeric.
4. The backend retrieves the previous 10 stored values.
5. If fewer than 10 previous readings are available, the result is labelled `NOT_EVALUATED` while history is collected.
6. Once 10 previous readings are available, the backend calculates the median baseline and the median absolute deviation (MAD).
7. It estimates the scale as `1.4826 × MAD`. If that scale is effectively zero, it falls back to the standard deviation.
8. The anomaly score is the absolute difference between the new value and the median baseline, divided by the scale. If both the scale and the difference are effectively zero, the score is `0`; if the scale is zero but the value differs from the baseline, the reading is marked anomalous.
9. A score **greater than 2.5** is labelled `ANOMALOUS`; otherwise, it is labelled `NORMAL`.
10. The result, including explanatory evidence, is saved in SQLite and returned as JSON.

**Important:** The threshold `2.5` is the value configured in `app.py`. The notebook name suggests a best-threshold experiment, but this README does not assume the notebook's results independently validate that threshold.

## Requirements

- Python 3.9 or newer recommended
- `pip`
- A terminal/command prompt
- A web browser

## Installation

### 1. Open the project folder

Open a terminal in the directory containing `app.py` and `simulator.py`.

### 2. Create and activate a virtual environment (recommended)

**Windows**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**macOS / Linux**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install flask flask-cors numpy requests
```

If you plan to run the notebook, install Jupyter as well:

```bash
pip install notebook
```

## Run the project

Open **two terminals** in the project folder. Activate the virtual environment in both.

### Terminal 1 — start the backend

```bash
python app.py
```

The Flask API runs at:

```text
http://127.0.0.1:5000
```

The database table is initialized automatically. Keep this terminal running.

### Terminal 2 — start the simulator

```bash
python simulator.py
```

The simulator sends a reading about every two seconds. It generates values around `40–46` most of the time and occasionally values around `85–100`, so you can observe both ordinary and unusual readings. Press **Ctrl+C** to stop it.

### Open the dashboard

Open the project's HTML dashboard page in a browser, or use the web server configured for the front end if your project has one. The provided Python files establish the API, but the exact HTML filename and front-end serving method depend on the files included in your project.

## API endpoints

### `GET /api/health`

Checks whether the backend is running.

Example response:

```json
{
  "status": "running",
  "service": "anomaly-monitor"
}
```

### `POST /api/readings`

Submits a new reading.

Example request body:

```json
{
  "timestamp": "2026-10-27T17:00:00",
  "value": 43.5
}
```

The timestamp is optional; the backend supplies the current timestamp if it is omitted.

Example response fields:

```json
{
  "timestamp": "2026-10-27T17:00:00",
  "value": 43.5,
  "anomaly_score": 0.0,
  "label": "NOT_EVALUATED",
  "evidence": "Collecting 10 previous readings"
}
```

The actual score, label, and evidence depend on the stored history and submitted value. A successful submission returns HTTP status `201`. Invalid or missing values return an error response.

### `GET /api/readings`

Returns up to the latest 100 stored readings in chronological order, along with a count.

## Database

SQLite stores each result in the `readings` table with these fields:

- `id` — automatically generated record ID
- `timestamp` — reading time
- `value` — numeric sensor value
- `anomaly_score` — calculated score
- `label` — `NORMAL`, `ANOMALOUS`, or `NOT_EVALUATED`
- `evidence` — explanation of the classification

Readings are retained in the database between application runs unless the database file is deleted.

## Troubleshooting

- **Cannot contact backend:** Start `app.py` first and verify that port `5000` is available.
- **Missing Python module:** Activate the correct virtual environment and install the dependencies.
- **Dashboard does not show new readings:** Check the browser console, the API URL used by the front end, and whether the backend is running.
- **Readings are initially `NOT_EVALUATED`:** This is expected until 10 previous readings have been collected.
- **Port already in use:** Stop the other process using port `5000` or change the port in `app.py` and update the simulator's API URL to match.
- **Old readings appear:** The database persists historical results. Back up the database before clearing it.

## Limitations

- The simulator uses synthetic values, not a physical sensor.
- The configured threshold is fixed at `2.5` in the backend.
- The detector compares each reading with recent history and may not identify every kind of anomaly.
- The API currently stores a single numeric value per reading.
- This is a prototype and should be tested with representative real-world data before operational use.
- Flask's debug server is for development, not production deployment.

## Future improvements

- Connect a real sensor or streaming data source.
- Add configurable thresholds and detection windows.
- Add authentication, input limits, and production-grade deployment settings.
- Add alerts and downloadable reports.
- Evaluate the detector on labelled data and document precision, recall, and false-positive rates.
- Add automated tests for normal readings, anomalies, and insufficient history.

## License

Add your chosen license here before distributing the project.
