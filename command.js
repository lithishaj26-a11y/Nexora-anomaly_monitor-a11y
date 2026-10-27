
/* Sentinel - Dashboard Data and Interactions */

// Person 3 will provide the actual API URL.
// Leave empty while developing with sample data.
const API_URL = "http://127.0.0.1:5000/api/readings";

const sampleReadings = [
    {
        time: "10:00",
        value: 49,
        score: 0.2,
        label: "NORMAL",
        reason: "Reading is close to the recent baseline."
    },
    {
        time: "10:01",
        value: 51,
        score: 0.4,
        label: "NORMAL",
        reason: "Reading is within the expected range."
    },
    {
        time: "10:02",
        value: 50,
        score: 0.1,
        label: "NORMAL",
        reason: "No unusual change detected."
    },
    {
        time: "10:03",
        value: 48,
        score: 0.8,
        label: "NORMAL",
        reason: "Reading is within the expected range."
    },
    {
        time: "10:04",
        value: 52,
        score: 0.9,
        label: "NORMAL",
        reason: "Reading is within the expected range."
    },
    {
        time: "10:05",
        value: 50,
        score: 0.3,
        label: "NORMAL",
        reason: "Reading is close to the recent baseline."
    },
    {
        time: "10:06",
        value: 90,
        score: 4.2,
        label: "ANOMALOUS",
        reason: "Sudden deviation from recent readings."
    },
    {
        time: "10:07",
        value: 51,
        score: 0.4,
        label: "NORMAL",
        reason: "Reading returned to the expected range."
    }
];

let readings = [];
let activeFilter = "ALL";
let sensorChart = null;

// Convert incoming records into a consistent format.

function normalizeReading(item) {
    const rawLabel = String(
        item.label ?? item.status ?? "NOT_EVALUATED"
    ).toUpperCase();

    let label;

    if (["ANOMALOUS", "ANOMALY", "ABNORMAL"].includes(rawLabel)) {
        label = "ANOMALOUS";
    } else if (rawLabel === "NORMAL") {
        label = "NORMAL";
    } else {
        label = "NOT_EVALUATED";
    }

    const rawTime = String(item.time ?? item.timestamp ?? "--");

    return {
        id: item.id,
        time: rawTime.includes("T")
            ? rawTime.replace("T", " ").slice(0, 19)
            : rawTime,
        value: Number(item.value ?? item.sensor_value ?? 0),
        score: Number(item.score ?? item.anomaly_score ?? 0),
        label,
        reason: String(
            item.reason ??
            item.evidence ??
            item.explanation ??
            "No explanation provided."
        )
    };
}


// Update the connection indicator and data mode.
function setDataMode(isLive, message) {
    const text = document.getElementById("connectionText");
    const tag = document.getElementById("dataModeTag");
    const dot = document.querySelector(".online-dot");

    if (text) text.textContent = message;

    if (tag) {
       tag.textContent = isLive ? "LIVE DATA" : "OFFLINE";
        tag.style.background = isLive ? "#e2f5ec" : "#fff1d8";
        tag.style.color = isLive ? "#18794e" : "#93631b";
    }

    if (dot) {
        dot.style.background = isLive ? "#39c58a" : "#e0a43b";
    }
}

// Update summary cards.
function updateSummary() {
    const anomalies = readings.filter(
        item => item.label === "ANOMALOUS"
    ).length;

    document.getElementById("totalReadings").textContent =
        readings.length;

    document.getElementById("anomalyCount").textContent =
        anomalies;

   document.getElementById("normalCount").textContent =
    readings.filter(item => item.label === "NORMAL").length;

    document.getElementById("latestStatus").textContent =
        readings.length
            ? readings[readings.length - 1].label
            : "--";
}

// Safely build the detection table.
function renderTable() {
    const searchText = document
        .getElementById("searchInput")
        .value.toLowerCase()
        .trim();

    const filtered = readings.filter(item => {
        const matchesFilter =
            activeFilter === "ALL" ||
            item.label === activeFilter;

        const searchableText = [
            item.time,
            item.value,
            item.score,
            item.label,
            item.reason
        ].join(" ").toLowerCase();

        return matchesFilter &&
            searchableText.includes(searchText);
    });

    const table = document.getElementById("alertsBody");
    table.replaceChildren();

    filtered.forEach(item => {
        const row = document.createElement("tr");

        const values = [
            item.time,
            item.value,
            item.score.toFixed(2)
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement("td");
        const pill = document.createElement("span");
pill.className =
    "status-pill " +
    (item.label === "ANOMALOUS"
        ? "anomalous"
        : item.label === "NORMAL"
            ? "normal"
            : "not-evaluated");

        pill.textContent = item.label;
        statusCell.appendChild(pill);
        row.appendChild(statusCell);

        const reasonCell = document.createElement("td");
        reasonCell.textContent = item.reason;
        row.appendChild(reasonCell);

        table.appendChild(row);
    });

    document.getElementById("tableCount").textContent =
        `Showing ${filtered.length} of ${readings.length} readings`;
}

// Draw or update the graph.
function updateChart() {
    const canvas = document.getElementById("sensorChart");

    if (!canvas || typeof Chart === "undefined") {
        console.error("Chart canvas or Chart.js is missing.");
        return;
    }
    const chartData = {
        labels: readings.map(item => item.time),
        datasets: [{
            label: "Sensor Value",
            data: readings.map(item => item.value),
            borderColor: "#3568c0",
            borderWidth: 2,
            tension: 0.15,
            fill: false,
            pointRadius: readings.map(
                item => item.label === "ANOMALOUS" ? 6 : 3
            ),
            pointBackgroundColor: readings.map(
                item => item.label === "ANOMALOUS"
                    ? "#d9535d"
                    : "#3568c0"
            )
        }]
    };

    if (sensorChart) {
        sensorChart.data = chartData;
        sensorChart.update();
        return;
    }

    sensorChart = new Chart(canvas, {
        type: "line",
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation:false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        afterBody: items => {
                            if (!items.length) return "";

                            const item = readings[items[0].dataIndex];

                            return [
                                `Status: ${item.label}`,
                                `Score: ${item.score}`,
                                `Explanation: ${item.reason}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Time"
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Sensor Value"
                    }
                }
            }
        }
    });
}

// Refresh all dashboard sections from the same data.
function renderDashboard() {
    updateSummary();
    renderTable();
    updateChart();
}

// Search readings.
document.getElementById("searchInput")
    .addEventListener("input", renderTable);

// Filter readings.
document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;

        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.toggle("selected", btn === button);
        });

        renderTable();
    });
});

// Load readings from Person 3's API when it is ready.

async function loadLiveData() {
    if (!API_URL) {
        setDataMode(false, "API URL not configured");
        return;
    }

    try {
        const response = await fetch(API_URL, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();

        const records = Array.isArray(result)
            ? result
            : result.readings;

        if (!Array.isArray(records)) {
            throw new Error("Unexpected API response format");
        }

        // Use only the readings returned by Flask.
        readings = records.map(normalizeReading);

        renderDashboard();
        setDataMode(true, "Connected to backend");

    } catch (error) {
    console.error("Sentinel API error:", error);

    readings = [];
    renderDashboard();
    setDataMode(false, "API unavailable — check Flask");
}
}

// Start with sample data while the backend is under development.

loadLiveData();
setInterval(loadLiveData, 2000);
