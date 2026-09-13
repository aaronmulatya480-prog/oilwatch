# OilWatch

A live dashboard tracking crude oil (WTI + Brent) and US gas prices, with context
on the current Red Sea / Bab el-Mandeb shipping disruption driving the moves.

## Run it

```bash
pip install -r requirements.txt
python app.py
```

Then open **http://localhost:5000**.

## Live gas price (optional)

By default the US gas price shown is a fixed reference value ($4.15/gal). To pull
a live weekly figure from the EIA:

1. Get a free API key: https://www.eia.gov/opendata/register.php
2. Run with the key set:

```bash
EIA_API_KEY=your_key_here python app.py
```

Crude oil prices (WTI, Brent) come from Yahoo Finance futures data via `yfinance`
and need no API key.

## Files

```
oilwatch/
├── app.py              Flask backend + /api/prices endpoint
├── requirements.txt
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```

The frontend polls `/api/prices` every 60 seconds and redraws the chart, so leaving
the tab open keeps it current.
