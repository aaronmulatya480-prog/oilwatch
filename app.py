"""
OilWatch backend.

Serves the dashboard and a small JSON API with:
  - WTI and Brent crude oil futures (last 30 days), via yfinance (no API key needed)
  - US national average retail gasoline price, via the EIA Open Data API
    (optional — falls back to a fixed reference value if no key is set)

Run:
    pip install -r requirements.txt
    python app.py
Then open http://localhost:5000
"""

import os
from datetime import datetime, timezone

import requests
import yfinance as yf
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# Free key from https://www.eia.gov/opendata/register.php — optional.
EIA_API_KEY = os.environ.get("EIA_API_KEY")

# The date the Houthi forces seized the Red Sea island — used to draw an
# "event marker" on the price chart so the spike has context.
EVENT_DATE = "2026-09-12"
EVENT_LABEL = "Houthis seize Red Sea island / Saudi shuts pipeline"

TICKERS = {"WTI": "CL=F", "Brent": "BZ=F"}


def get_oil_series():
    """Fetch ~30 days of daily closes for WTI and Brent crude futures."""
    series = {}
    for name, symbol in TICKERS.items():
        try:
            hist = yf.Ticker(symbol).history(period="30d")
            if hist.empty:
                series[name] = {"error": "no data returned"}
                continue

            closes = [round(v, 2) for v in hist["Close"].tolist()]
            dates = [d.strftime("%Y-%m-%d") for d in hist.index]
            first, last = closes[0], closes[-1]

            series[name] = {
                "dates": dates,
                "prices": closes,
                "latest": last,
                "change_abs": round(last - first, 2),
                "change_pct": round((last - first) / first * 100, 2) if first else None,
            }
        except Exception as exc:  # network hiccup, bad symbol, etc.
            series[name] = {"error": str(exc)}
    return series


def get_us_gas_price():
    """US national average retail regular gasoline price ($/gal)."""
    if not EIA_API_KEY:
        return {
            "source": "reference value (no EIA_API_KEY set)",
            "price": 4.15,
            "note": "Set the EIA_API_KEY env var for a live figure — "
                    "free key at https://www.eia.gov/opendata/register.php",
        }
    try:
        url = (
            "https://api.eia.gov/v2/petroleum/pri/gnd/data/"
            f"?api_key={EIA_API_KEY}"
            "&frequency=weekly"
            "&data[0]=value"
            "&facets[product][]=EPMR"
            "&facets[duoarea][]=NUS"
            "&sort[0][column]=period"
            "&sort[0][direction]=desc"
            "&length=1"
        )
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        record = resp.json()["response"]["data"][0]
        return {
            "source": "EIA (live)",
            "price": round(float(record["value"]), 3),
            "period": record["period"],
        }
    except Exception as exc:
        return {"source": "reference value (EIA request failed)", "price": 4.15, "error": str(exc)}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/prices")
def prices():
    return jsonify(
        {
            "oil": get_oil_series(),
            "gas": get_us_gas_price(),
            "event": {"date": EVENT_DATE, "label": EVENT_LABEL},
            "updated": datetime.now(timezone.utc).isoformat(),
        }
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
