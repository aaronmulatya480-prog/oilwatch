const REFRESH_MS = 60_000;

let chart = null;

function setStatus(state, text) {
  const dot = document.querySelector(".status-dot");
  dot.classList.remove("live", "error");
  if (state) dot.classList.add(state);
  document.getElementById("status-text").textContent = text;
}

function fmtUsd(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${Number(value).toFixed(decimals)}`;
}

function fmtPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function pointColors(dates, eventDate) {
  return dates.map((d) => (d === eventDate ? "#D64545" : "transparent"));
}

function pointRadii(dates, eventDate) {
  return dates.map((d) => (d === eventDate ? 5 : 0));
}

function renderChart(oil, eventDate) {
  const ctx = document.getElementById("oil-chart");
  const wti = oil.WTI || {};
  const brent = oil.Brent || {};
  const labels = wti.dates || brent.dates || [];

  const datasets = [];

  if (wti.prices) {
    datasets.push({
      label: "WTI",
      data: wti.prices,
      borderColor: "#E8A33D",
      backgroundColor: "transparent",
      borderWidth: 2,
      pointBackgroundColor: pointColors(wti.dates, eventDate),
      pointRadius: pointRadii(wti.dates, eventDate),
      tension: 0.2,
    });
  }

  if (brent.prices) {
    datasets.push({
      label: "Brent",
      data: brent.prices,
      borderColor: "#4FB8B0",
      backgroundColor: "transparent",
      borderWidth: 2,
      pointBackgroundColor: pointColors(brent.dates, eventDate),
      pointRadius: pointRadii(brent.dates, eventDate),
      tension: 0.2,
    });
  }

  const config = {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#161D2B",
          borderColor: "#262F42",
          borderWidth: 1,
          titleColor: "#EDEFF3",
          bodyColor: "#EDEFF3",
          callbacks: {
            label: (item) => `${item.dataset.label}: $${item.formattedValue}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#8792A8", maxTicksLimit: 8, font: { family: "IBM Plex Mono", size: 10 } },
          grid: { color: "#1C2436" },
        },
        y: {
          ticks: { color: "#8792A8", font: { family: "IBM Plex Mono", size: 10 } },
          grid: { color: "#1C2436" },
        },
      },
    },
  };

  if (chart) {
    chart.data = config.data;
    chart.update();
  } else {
    chart = new Chart(ctx, config);
  }
}

function renderHero(wti) {
  document.getElementById("hero-wti").textContent = fmtUsd(wti.latest);
  const deltaEl = document.getElementById("hero-wti-delta");
  if (wti.change_pct === undefined || wti.change_pct === null) {
    deltaEl.textContent = "";
    return;
  }
  deltaEl.textContent = `${fmtPct(wti.change_pct)} over 30 days`;
  deltaEl.classList.remove("up", "down");
  deltaEl.classList.add(wti.change_pct >= 0 ? "up" : "down");
}

function renderStats(oil, gas) {
  document.getElementById("stat-wti").textContent = oil.WTI ? fmtUsd(oil.WTI.latest) : "—";
  document.getElementById("stat-brent").textContent = oil.Brent ? fmtUsd(oil.Brent.latest) : "—";
  document.getElementById("stat-gas").textContent = gas ? fmtUsd(gas.price, 3) : "—";
  document.getElementById("gas-footnote").textContent = gas && gas.note ? gas.note : (gas && gas.source ? `Source: ${gas.source}` : "");
}

async function loadPrices() {
  try {
    setStatus(null, "updating…");
    const res = await fetch("/api/prices");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    renderHero(data.oil.WTI || {});
    renderStats(data.oil, data.gas);
    renderChart(data.oil, data.event ? data.event.date : null);

    const updated = new Date(data.updated);
    document.getElementById("updated-text").textContent =
      `Last updated ${updated.toLocaleTimeString()}`;
    setStatus("live", "live");
  } catch (err) {
    console.error(err);
    setStatus("error", "connection issue");
    document.getElementById("updated-text").textContent =
      "Couldn't reach the server — check the backend is running.";
  }
}

loadPrices();
setInterval(loadPrices, REFRESH_MS);
