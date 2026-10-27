
import random
import time
from datetime import datetime
import requests

API_URL = "http://127.0.0.1:5000/api/readings"

def generate_reading():
    if random.random() < 0.9:
        value = round(random.uniform(40, 46), 2)
    else:
        value = round(random.uniform(85, 100), 2)

    return {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "value": value
    }

if __name__ == "__main__":
    while True:
        reading = generate_reading()

        try:
            response = requests.post(
                API_URL,
                json=reading,
                timeout=5
            )

            print("Reading sent:", reading)
            print("Backend response:", response.json())
            print("-" * 40)

        except requests.RequestException as error:
            print("Could not contact backend:", error)

        time.sleep(2)