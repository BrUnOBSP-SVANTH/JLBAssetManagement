const trackedTickers = ["PETR4", "VALE3", "ITUB4", "BBAS3", "AAPL", "MSFT", "SPY", "IVV", "QQQ", "BOVA11"];
const stockGrid = document.getElementById("stock-grid");
const marketStatus = document.getElementById("market-status");
const kpiStrip = document.getElementById("kpi-strip");

const fallbackAssets = [
  { symbol: "PETR4", regularMarketPrice: 39.2, regularMarketChangePercent: 1.4, dividendYield: 0.11, logourl: "https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/PETR4.png" },
  { symbol: "VALE3", regularMarketPrice: 65.8, regularMarketChangePercent: -0.8, dividendYield: 0.09, logourl: "https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/VALE3.png" },
  { symbol: "ITUB4", regularMarketPrice: 34.5, regularMarketChangePercent: 0.5, dividendYield: 0.07, logourl: "https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/ITUB4.png" },
  { symbol: "SPY", regularMarketPrice: 510.0, regularMarketChangePercent: 0.3, dividendYield: 0.014, logourl: "https://logo.clearbit.com/ssga.com" },
];

const formatCurrency = (value) => `R$ ${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;

function parseSeries(text) {
  return text.split(",").map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n));
}

function mean(arr) {
  return arr.reduce((sum, item) => sum + item, 0) / arr.length;
}

function variance(arr, avg) {
  return arr.reduce((sum, item) => sum + (item - avg) ** 2, 0) / (arr.length - 1);
}

function renderKpis(results) {
  const valid = results.filter((a) => typeof a.regularMarketChangePercent === "number");
  const avgChange = valid.length ? valid.reduce((s, a) => s + a.regularMarketChangePercent, 0) / valid.length : 0;
  const best = valid.reduce((max, a) => (a.regularMarketChangePercent > (max?.regularMarketChangePercent ?? -Infinity) ? a : max), null);
  const worst = valid.reduce((min, a) => (a.regularMarketChangePercent < (min?.regularMarketChangePercent ?? Infinity) ? a : min), null);

  kpiStrip.innerHTML = `
    <article class="kpi"><span>Ativos monitorados</span><strong>${results.length}</strong></article>
    <article class="kpi"><span>Variação média</span><strong>${avgChange.toFixed(2)}%</strong></article>
    <article class="kpi"><span>Melhor ativo</span><strong>${best ? `${best.symbol} (${best.regularMarketChangePercent.toFixed(2)}%)` : "N/D"}</strong></article>
    <article class="kpi"><span>Pior ativo</span><strong>${worst ? `${worst.symbol} (${worst.regularMarketChangePercent.toFixed(2)}%)` : "N/D"}</strong></article>
  `;
}

function renderStocks(results, sourceLabel) {
  stockGrid.innerHTML = results
    .map((asset) => {
      const price = typeof asset.regularMarketPrice === "number" ? asset.regularMarketPrice : 0;
      const dy = typeof asset.dividendYield === "number" ? `${(asset.dividendYield * 100).toFixed(2)}%` : "N/D";
      const roi = typeof asset.regularMarketChangePercent === "number" ? asset.regularMarketChangePercent : 0;
      const trend = roi >= 0 ? "up" : "down";
      return `
      <article class="stock">
        <div class="stock-top">
          <img src="${asset.logourl || "https://placehold.co/40x40"}" alt="Logo ${asset.symbol}" onerror="this.src='https://placehold.co/40x40'" />
          <strong>${asset.symbol}</strong>
          <span class="badge ${trend}">${roi.toFixed(2)}%</span>
        </div>
        <div>Preço: <strong>${formatCurrency(price)}</strong></div>
        <div>Dividend Yield: <strong>${dy}</strong></div>
        <div>ROI diário: <strong>${roi.toFixed(2)}%</strong></div>
      </article>`;
    })
    .join("");

  marketStatus.textContent = `${sourceLabel} • ${new Date().toLocaleTimeString("pt-BR")}`;
  renderKpis(results);
}

async function loadStocks() {
  try {
    const response = await fetch(`https://brapi.dev/api/quote/${trackedTickers.join(",")}?fundamental=true`);
    if (!response.ok) throw new Error("Falha de API");

    const payload = await response.json();
    const results = payload?.results || [];
    if (!results.length) throw new Error("Sem dados");

    renderStocks(results, "Fonte: Brapi");
  } catch {
    renderStocks(fallbackAssets, "Modo contingência");
  }
}

let simulationChart;
function calculateFutureValue({ principal, monthlyContribution, monthlyRate, months, taxRate = 0 }) {
  let balance = principal;
  const path = [];
  for (let i = 0; i < months; i += 1) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    const gross = balance;
    const net = gross - Math.max(0, gross - (principal + monthlyContribution * (i + 1))) * taxRate;
    path.push(Number(net.toFixed(2)));
  }
  return path;
}

function runSimulation() {
  const principal = Number(document.getElementById("initial").value);
  const monthly = Number(document.getElementById("monthly").value);
  const years = Number(document.getElementById("years").value);
  const cdi = Number(document.getElementById("cdi").value) / 100;
  const ipca = Number(document.getElementById("ipca").value) / 100;
  const extReturn = Number(document.getElementById("extReturn").value) / 100;

  const months = years * 12;
  const labels = Array.from({ length: months }, (_, idx) => `M${idx + 1}`);

  const scenarios = [
    { label: "CDB 104% CDI (líquido)", rate: (cdi * 1.04) / 12, tax: 0.15, color: "#58b8ff" },
    { label: "LCI/LCA 92% CDI (isento)", rate: (cdi * 0.92) / 12, tax: 0, color: "#53d896" },
    { label: "Tesouro Selic + IPCA (líquido)", rate: (cdi + ipca) / 12, tax: 0.15, color: "#ffb362" },
    { label: "Fundos Exterior", rate: extReturn / 12, tax: 0.15, color: "#c6a6ff" },
  ];

  const datasets = scenarios.map((scenario) => ({
    label: scenario.label,
    data: calculateFutureValue({
      principal,
      monthlyContribution: monthly,
      monthlyRate: scenario.rate,
      months,
      taxRate: scenario.tax,
    }),
    borderColor: scenario.color,
    pointRadius: 0,
    tension: 0.22,
  }));

  if (simulationChart) simulationChart.destroy();
  simulationChart = new Chart(document.getElementById("simChart"), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#fff" } } },
      scales: {
        x: { ticks: { color: "#d5e8ff", maxTicksLimit: 10 } },
        y: { ticks: { color: "#d5e8ff" } },
      },
    },
  });

  const summary = datasets.map((dataset) => `${dataset.label}: ${formatCurrency(dataset.data.at(-1))}`).join(" | ");
  document.getElementById("sim-result").textContent = `Resultado projetado (${years} anos): ${summary}`;
}

let derivativeChart;
function buildDerivativeChart() {
  const notional = Number(document.getElementById("notional").value);
  const leverage = Number(document.getElementById("leverage").value);
  const scenarios = [0.12, 0.03, -0.1];
  const labels = ["Alta (+12%)", "Neutro (+3%)", "Queda (-10%)"];
  const values = scenarios.map((s) => Number((notional * leverage * s).toFixed(2)));

  if (derivativeChart) derivativeChart.destroy();
  derivativeChart = new Chart(document.getElementById("derivChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "P/L projetado (R$)", data: values, backgroundColor: ["#58b8ff", "#53d896", "#ff6f83"] }],
    },
    options: {
      plugins: { legend: { labels: { color: "#fff" } } },
      scales: {
        x: { ticks: { color: "#d5e8ff" } },
        y: { ticks: { color: "#d5e8ff" } },
      },
    },
  });
}

function buildCalendar() {
  const container = document.getElementById("calendar");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const cdiRate = (0.105 * 1.04) / 12;
  let balance = 30000;

  container.innerHTML = months
    .map((month, index) => {
      const aporte = index % 2 === 0 ? 500 : 300;
      balance = balance * (1 + cdiRate) + aporte;
      return `<article class="month"><strong>${month}</strong><br/>Aporte: ${formatCurrency(aporte)}<br/>Saldo estimado: <strong>${formatCurrency(balance)}</strong></article>`;
    })
    .join("");
}

function buildBehaviorChart() {
  new Chart(document.getElementById("behaviorChart"), {
    type: "doughnut",
    data: {
      labels: ["Investe no exterior", "Investe no Brasil", "Empreende", "Poupança/Previdência", "Sem investimento ativo"],
      datasets: [{ data: [8, 26, 14, 32, 20], backgroundColor: ["#58b8ff", "#53d896", "#ffb362", "#9eaeff", "#ff6f83"] }],
    },
    options: { plugins: { legend: { labels: { color: "#fff" } } } },
  });
}

function runCorrelation() {
  const x = parseSeries(document.getElementById("serieX").value);
  const y = parseSeries(document.getElementById("serieY").value);
  const result = document.getElementById("corr-result");

  if (x.length !== y.length || x.length < 2) {
    result.textContent = "Erro: as séries devem ter mesmo tamanho e no mínimo 2 pontos.";
    return;
  }

  const mx = mean(x);
  const my = mean(y);
  const cov = x.reduce((sum, xi, index) => sum + (xi - mx) * (y[index] - my), 0) / (x.length - 1);
  const vx = variance(x, mx);
  const vy = variance(y, my);
  const corr = cov / Math.sqrt(vx * vy);

  const interpretation = corr > 0.7 ? "Forte positiva" : corr < -0.7 ? "Forte negativa" : "Moderada/Fraca";

  result.textContent = `Covariância: ${cov.toFixed(4)} | Correlação: ${corr.toFixed(4)} (${interpretation}) | Var(X): ${vx.toFixed(4)} | Var(Y): ${vy.toFixed(4)}`;
}

document.getElementById("calc-corr").addEventListener("click", runCorrelation);
document.getElementById("simulate").addEventListener("click", runSimulation);
document.getElementById("refresh-market").addEventListener("click", loadStocks);
document.getElementById("recalc-deriv").addEventListener("click", buildDerivativeChart);

loadStocks();
runCorrelation();
runSimulation();
buildDerivativeChart();
buildCalendar();
buildBehaviorChart();
