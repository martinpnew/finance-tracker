const storageKey = "financeTrackerPwaV2";
const todayString = new Date().toISOString().slice(0, 10);
document.getElementById("spendDate").value = todayString;

let deferredInstallPrompt = null;
let state = loadState();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.getElementById("installBanner").classList.add("show");
});

document.getElementById("installButton").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById("installBanner").classList.remove("show");
});

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return { accounts: [], spending: [] };
    }
  }
  return { accounts: [], spending: [] };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function money(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function showTab(id, button) {
  document.querySelectorAll("section").forEach(section => section.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  button.classList.add("active");
  renderAll();
}

function addAccount() {
  const name = document.getElementById("accountName").value.trim();
  const owner = document.getElementById("accountOwner").value;
  const type = document.getElementById("accountType").value;
  const balance = parseFloat(document.getElementById("accountBalance").value);
  const rate = parseFloat(document.getElementById("accountRate").value || "0");
  const monthlyContribution = parseFloat(document.getElementById("monthlyContribution").value || "0");
  const monthlyWithdrawal = parseFloat(document.getElementById("monthlyWithdrawal").value || "0");

  if (!name || isNaN(balance)) {
    alert("Please add a name and balance.");
    return;
  }

  state.accounts.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    owner,
    type,
    balance,
    rate,
    monthlyContribution,
    monthlyWithdrawal
  });

  ["accountName", "accountBalance", "accountRate", "monthlyContribution", "monthlyWithdrawal"].forEach(id => {
    document.getElementById(id).value = "";
  });

  saveState();
  renderAll();
}

function deleteAccount(id) {
  state.accounts = state.accounts.filter(account => account.id !== id);
  saveState();
  renderAll();
}

function addSpending() {
  const date = document.getElementById("spendDate").value || todayString;
  const category = document.getElementById("spendCategory").value;
  const amount = parseFloat(document.getElementById("spendAmount").value);
  const note = document.getElementById("spendNote").value.trim();

  if (isNaN(amount) || amount <= 0) {
    alert("Please add a spending amount.");
    return;
  }

  state.spending.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date,
    category,
    amount,
    note
  });

  document.getElementById("spendAmount").value = "";
  document.getElementById("spendNote").value = "";

  saveState();
  renderAll();
}

function deleteSpending(id) {
  state.spending = state.spending.filter(item => item.id !== id);
  saveState();
  renderAll();
}

function resetData() {
  if (!confirm("Reset all saved accounts and spending?")) return;
  state = { accounts: [], spending: [] };
  saveState();
  renderAll();
}

function loadSampleData() {
  state = {
    accounts: [
      { id: "a1", name: "Current account", owner: "Me", type: "Current account", balance: 2500, rate: 0, monthlyContribution: 0, monthlyWithdrawal: 0 },
      { id: "a2", name: "Savings account", owner: "Me", type: "Savings", balance: 70000, rate: 4.4, monthlyContribution: 250, monthlyWithdrawal: 0 },
      { id: "a3", name: "Cash ISA", owner: "Me", type: "Cash ISA", balance: 20000, rate: 4.1, monthlyContribution: 0, monthlyWithdrawal: 0 },
      { id: "a4", name: "Premium Bonds", owner: "Me", type: "Premium Bonds", balance: 50000, rate: 3.8, monthlyContribution: 0, monthlyWithdrawal: 0 },
      { id: "a5", name: "Pension", owner: "Me", type: "Pension", balance: 192000, rate: 5, monthlyContribution: 180, monthlyWithdrawal: 0 },
      { id: "a6", name: "House", owner: "Joint", type: "Property", balance: 340000, rate: 2, monthlyContribution: 0, monthlyWithdrawal: 0 }
    ],
    spending: [
      { id: "s1", date: todayString, category: "Food", amount: 42, note: "Groceries" },
      { id: "s2", date: todayString, category: "Eating out", amount: 65, note: "Dinner" },
      { id: "s3", date: todayString, category: "Car", amount: 55, note: "Petrol" }
    ]
  };
  saveState();
  renderAll();
}

function exportData() {
  const backup = {
    app: "Finance tracker",
    version: 2,
    exportedAt: new Date().toISOString(),
    data: state
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `finance-tracker-backup-${todayString}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      const data = imported.data || imported;
      if (!Array.isArray(data.accounts) || !Array.isArray(data.spending)) {
        alert("This does not look like a valid finance tracker backup.");
        return;
      }
      if (!confirm("Import this backup and replace current data?")) return;
      state = data;
      saveState();
      renderAll();
      alert("Backup imported.");
    } catch {
      alert("Sorry, this backup could not be imported.");
    }
  };
  reader.readAsText(file);
}

function monthlySpendingTotal() {
  const ym = new Date().toISOString().slice(0, 7);
  return state.spending
    .filter(item => item.date && item.date.slice(0, 7) === ym)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function forecastMonths(months) {
  let balances = state.accounts.map(account => ({ ...account }));
  const points = [];

  for (let m = 0; m <= months; m++) {
    const total = balances.reduce((sum, account) => sum + account.balance, 0);
    points.push(total);

    balances = balances.map(account => {
      const monthlyRate = Math.pow(1 + (Number(account.rate || 0) / 100), 1 / 12) - 1;
      const nextBalance = account.balance * (1 + monthlyRate)
        + Number(account.monthlyContribution || 0)
        - Number(account.monthlyWithdrawal || 0);
      return { ...account, balance: Math.max(0, nextBalance) };
    });
  }

  return points;
}

function renderDashboard() {
  const total = state.accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const growth = state.accounts.reduce((sum, account) => sum + Number(account.balance || 0) * Number(account.rate || 0) / 100, 0);
  const spend = monthlySpendingTotal();
  const twelveMonth = forecastMonths(12).at(-1);

  document.getElementById("totalBalance").textContent = money(total);
  document.getElementById("annualGrowth").textContent = money(growth);
  document.getElementById("monthlySpend").textContent = money(spend);
  document.getElementById("projection12").textContent = money(twelveMonth);
}

function renderAccounts() {
  const container = document.getElementById("accountsTable");
  if (!state.accounts.length) {
    container.innerHTML = '<div class="empty">No accounts added yet.</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Owner</th>
          <th>Type</th>
          <th>Rate</th>
          <th>Balance</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${state.accounts.map(account => `
          <tr>
            <td><strong>${escapeHtml(account.name)}</strong><br><span class="small">Monthly net: ${money((account.monthlyContribution || 0) - (account.monthlyWithdrawal || 0))}</span></td>
            <td>${escapeHtml(account.owner || "Me")}</td>
            <td>${escapeHtml(account.type)}</td>
            <td>${Number(account.rate || 0).toFixed(2)}%</td>
            <td>${money(account.balance)}</td>
            <td><button class="danger" onclick="deleteAccount('${account.id}')">Delete</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderSpending() {
  const container = document.getElementById("spendingTable");
  const items = [...state.spending].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

  if (!items.length) {
    container.innerHTML = '<div class="empty">No spending added yet.</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Category</th>
          <th>Note</th>
          <th>Amount</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${escapeHtml(item.date)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.note || "")}</td>
            <td>${money(item.amount)}</td>
            <td><button class="danger" onclick="deleteSpending('${item.id}')">Delete</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderForecastSummary() {
  const years = Math.max(1, Math.min(40, Number(document.getElementById("forecastYears").value || 10)));
  const points = forecastMonths(years * 12);
  const start = points[0] || 0;
  const end = points.at(-1) || 0;
  const difference = end - start;
  const inflation = Number(document.getElementById("inflationRate").value || 0) / 100;
  const realEnd = end / Math.pow(1 + inflation, years);

  document.getElementById("forecastSummary").innerHTML = `
    <table>
      <tbody>
        <tr><th>Starting balance</th><td>${money(start)}</td></tr>
        <tr><th>Projected balance after ${years} years</th><td>${money(end)}</td></tr>
        <tr><th>Change</th><td class="${difference >= 0 ? "positive" : "negative"}">${money(difference)}</td></tr>
        <tr><th>Inflation-adjusted estimate</th><td>${money(realEnd)}</td></tr>
      </tbody>
    </table>
  `;
}

function drawBarChart(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = setupCanvas(canvas);
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (!values.length || Math.max(...values) <= 0) {
    drawEmpty(ctx, rect, "No data yet");
    return;
  }

  const width = rect.width;
  const height = rect.height;
  const padding = 36;
  const max = Math.max(...values);
  const barWidth = (width - padding * 2) / values.length * 0.65;

  ctx.font = "12px system-ui";
  ctx.strokeStyle = "#d9dde5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  values.forEach((value, i) => {
    const x = padding + i * ((width - padding * 2) / values.length) + barWidth * 0.25;
    const barHeight = (value / max) * (height - padding * 2);
    const y = height - padding - barHeight;

    ctx.fillStyle = "#2563eb";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#667085";
    ctx.save();
    ctx.translate(x + barWidth / 2, height - 8);
    ctx.rotate(-0.35);
    ctx.textAlign = "right";
    ctx.fillText(labels[i].slice(0, 16), 0, 0);
    ctx.restore();
  });
}

function drawLineChart(canvasId, points) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = setupCanvas(canvas);
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (!points.length || Math.max(...points) <= 0) {
    drawEmpty(ctx, rect, "No data yet");
    return;
  }

  const width = rect.width;
  const height = rect.height;
  const padding = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  ctx.strokeStyle = "#d9dde5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 4;
  ctx.beginPath();

  points.forEach((point, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point - min) / range) * (height - padding * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.fillStyle = "#667085";
  ctx.font = "12px system-ui";
  ctx.fillText(money(max), padding, 20);
  ctx.fillText(money(min), padding, height - 10);
}

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  return ctx;
}

function drawEmpty(ctx, rect, text) {
  ctx.fillStyle = "#667085";
  ctx.font = "16px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, rect.width / 2, 110);
  ctx.textAlign = "left";
}

function groupAccountsByType() {
  const grouped = {};
  state.accounts.forEach(account => {
    grouped[account.type] = (grouped[account.type] || 0) + Number(account.balance || 0);
  });
  return grouped;
}

function groupSpendingThisMonth() {
  const ym = new Date().toISOString().slice(0, 7);
  const grouped = {};
  state.spending
    .filter(item => item.date && item.date.slice(0, 7) === ym)
    .forEach(item => {
      grouped[item.category] = (grouped[item.category] || 0) + Number(item.amount || 0);
    });
  return grouped;
}

function renderCharts() {
  const typeGroups = groupAccountsByType();
  drawBarChart("typeChart", Object.keys(typeGroups), Object.values(typeGroups));
  drawLineChart("forecastChart", forecastMonths(12));

  const spendGroups = groupSpendingThisMonth();
  drawBarChart("spendChart", Object.keys(spendGroups), Object.values(spendGroups));

  const years = Math.max(1, Math.min(40, Number(document.getElementById("forecastYears").value || 10)));
  drawLineChart("longForecastChart", forecastMonths(years * 12).filter((_, i) => i % 12 === 0));
}

function renderAll() {
  renderDashboard();
  renderAccounts();
  renderSpending();
  renderForecastSummary();
  setTimeout(renderCharts, 20);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.addEventListener("resize", renderCharts);
renderAll();
