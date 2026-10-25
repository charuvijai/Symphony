/**
 * SYMPHONY – AI Supply Chain Control Tower
 * app.js  |  Navigation, interactions, AI Copilot, Scenario simulation
 */

// ─── PAGE NAVIGATION ─────────────────────────────────────────────────
const PAGE_TITLES = {
  problem:              'Problem Statement & Summary',
  'evidence-plan':      'Data Evidence & Verification Plan',
  'agent-architecture': 'Agent Roles & Architecture Design',
  executive:            'Executive Overview',
  demand:               'Demand Forecasting',
  inventory:            'Inventory & Procurement',
  logistics:            'Logistics & Suppliers',
  risk:                 'Risk & Scenarios',
  agents:               'Agentic AI Control Tower',
  recommendations:      'AI Recommendations',
  evaluation:           'Evaluation & Monitoring',
  copilot:              'AI Copilot'
};

let currentPage = 'executive';
let chartsInitialized = {};
let dashboardData = null;

async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    let message = `API request failed (${response.status})`;
    try {
      const detail = await response.json();
      if (detail.detail) message = detail.detail;
    } catch (error) {
      // Keep the HTTP status as the useful error when the response isn't JSON.
    }
    throw new Error(message);
  }
  return response.json();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function setBackendStatus(ready, message = '') {
  const status = document.getElementById('backendStatus');
  const banner = document.getElementById('backendUnavailable');
  if (status) {
    status.textContent = ready ? 'Backend connected · dataset model ready' : `Backend unavailable${message ? ` · ${message}` : ''}`;
    status.classList.toggle('text-green', ready);
    status.classList.toggle('text-amber', !ready);
  }
  document.body.classList.toggle('backend-unavailable', !ready);
  if (banner) {
    banner.hidden = ready;
    if (!ready) banner.textContent = `Dataset backend is unavailable. Start it with start_dashboard.bat, then reload this page.${message ? ` Details: ${message}` : ''}`;
  }
}

async function refreshDashboard() {
  try {
    dashboardData = await apiRequest('/dashboard');
    AGENT_LOG.splice(0, AGENT_LOG.length, ...dashboardData.logs);
    CONFLICTS.splice(0, CONFLICTS.length, ...dashboardData.conflicts);
    RECOMMENDATIONS.splice(0, RECOMMENDATIONS.length, ...dashboardData.recommendations);
    setBackendStatus(true);
    updateDashboardWidgets(dashboardData);
    if (currentPage === 'agents') initAgentPage();
    if (currentPage === 'recommendations') renderRecommendations();
  } catch (error) {
    setBackendStatus(false, error.message);
    showToast(`Backend connection failed: ${error.message}`, 'amber');
    throw error;
  }
}

function updateDashboardWidgets(data) {
  const metrics = data.metrics;
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  setText('kpi-total-units', Math.round(metrics.actual_units).toLocaleString());
  setText('kpi-forecast-accuracy', `${Math.max(0, 100 - metrics.wape).toFixed(1)}%`);
  setText('kpi-inventory-cost', `$${(metrics.inventory_cost / 1e6).toFixed(2)}M`);
  setText('kpi-service-level', `${(100 - metrics.observed_stockout_rate).toFixed(1)}%`);
  setText('kpi-otif-value', `${(data.suppliers.reduce((total, supplier) => total + supplier.otif, 0) / Math.max(data.suppliers.length, 1) * 100).toFixed(1)}%`);
  setText('kpi-accuracy-detail', `Holdout WAPE ${metrics.wape.toFixed(2)}% · ${metrics.validation_rows.toLocaleString()} rows`);
  setText('kpi-service-detail', `${metrics.stockout_units.toLocaleString()} stockout flags in source data`);
  setText('kpi-data-scope', `${data.dataset.date_start}–${data.dataset.date_end} · ${data.dataset.sku_count} SKUs · ${data.dataset.store_count} stores · ${data.dataset.rows.toLocaleString()} records`);
  setText('eval-mape', `${metrics.wape.toFixed(2)}% WAPE`);
  setText('eval-wape', `${metrics.seasonal_naive_wape.toFixed(2)}%`);
  setText('eval-bias', `${(metrics.mae).toFixed(2)} MAE`);
  setText('eval-quality', `${metrics.validation_rows.toLocaleString()}`);
  setText('eval-quality-detail', `Holdout ${metrics.validated_from}–${metrics.validated_to}`);
  setText('copilot-total-units', Math.round(metrics.actual_units).toLocaleString());
  setText('copilot-forecast-accuracy', `${Math.max(0, 100 - metrics.wape).toFixed(1)}%`);
  setText('copilot-wape', `${metrics.wape.toFixed(2)}%`);
  setText('copilot-inventory-cost', `$${(metrics.inventory_cost / 1e6).toFixed(2)}M`);
  setText('copilot-service-level', `${(100 - metrics.observed_stockout_rate).toFixed(1)}%`);
  setText('copilot-pending-recs', String(data.recommendations.filter(rec => rec.status === 'pending').length));
  document.querySelectorAll('[data-agent-name]').forEach(element => {
    const isActive = data.agents.some(agent => agent.name === element.dataset.agentName);
    element.textContent = isActive ? 'Active' : 'Offline';
  });

  if (CHARTS.execDemand && data.categories.length) {
    CHARTS.execDemand.data.labels = data.categories.map(item => item.category);
    CHARTS.execDemand.data.datasets[0].data = data.categories.map(item => item.actual);
    CHARTS.execDemand.data.datasets[1].data = data.categories.map(item => item.forecast);
    CHARTS.execDemand.update();
  }
  if (CHARTS.dfMain && data.daily_validation.length) {
    const labels = data.daily_validation.map(item => item.date);
    CHARTS.dfMain.data.labels = labels;
    CHARTS.dfMain.data.datasets = [
      {
        label: 'Model forecast',
        data: data.daily_validation.map(item => item.forecast),
        borderColor: '#a78bfa',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        borderDash: [5, 3],
        pointRadius: 2,
        tension: 0.25
      },
      {
        label: 'Actual demand',
        data: data.daily_validation.map(item => item.actual),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.08)',
        borderWidth: 2,
        pointRadius: 2,
        fill: true,
        tension: 0.25
      }
    ];
    CHARTS.dfMain.update();
  }
  if (CHARTS.evWape && data.categories.length) {
    CHARTS.evWape.data.labels = data.categories.map(item => item.category);
    CHARTS.evWape.data.datasets[0].data = data.categories.map(item => item.wape);
    CHARTS.evWape.options.scales.y.min = 0;
    CHARTS.evWape.update();
  }
  if (CHARTS.logOtif && data.suppliers.length) {
    CHARTS.logOtif.data.labels = data.suppliers.map(item => item.supplier_name);
    CHARTS.logOtif.data.datasets[0].data = data.suppliers.map(item => item.otif * 100);
    CHARTS.logOtif.update();
  }
  if (CHARTS.logLt && data.suppliers.length) {
    CHARTS.logLt.data.labels = data.suppliers.map(item => item.supplier_name);
    CHARTS.logLt.data.datasets[0].data = data.suppliers.map(item => item.lead_time);
    CHARTS.logLt.data.datasets[1].data = data.suppliers.map(item => item.lead_time_std);
    CHARTS.logLt.update();
  }
  if (CHARTS.logScatter && data.suppliers.length) {
    CHARTS.logScatter.data.datasets[0].data = data.suppliers.map(item => ({
      x: item.lead_time,
      y: item.fill_rate * 100
    }));
    CHARTS.logScatter.options.plugins.tooltip.callbacks.label = context => {
      const supplier = data.suppliers[context.dataIndex];
      return ` ${supplier.supplier_name}: LT=${supplier.lead_time.toFixed(1)}d · Fill=${(supplier.fill_rate * 100).toFixed(1)}%`;
    };
    CHARTS.logScatter.update();
  }
  if (CHARTS.riskSo && data.category_risk.length) {
    CHARTS.riskSo.data.labels = data.category_risk.map(item => item.category);
    CHARTS.riskSo.data.datasets[0].data = data.category_risk.map(item => item.stockout_rate * 100);
    CHARTS.riskSo.data.datasets[0].label = 'Observed stockout rate %';
    CHARTS.riskSo.options.scales.y.min = 0;
    CHARTS.riskSo.update();
  }
  if (CHARTS.riskConc && data.suppliers.length) {
    CHARTS.riskConc.data.labels = data.suppliers.map(item => `${item.supplier_name} · cost`);
    CHARTS.riskConc.data.datasets[0].data = data.suppliers.map(item => item.inventory_cost);
    CHARTS.riskConc.update();
  }
  if (CHARTS.recScatter) {
    const actions = ['ORDER', 'HOLD', 'REDUCE'];
    CHARTS.recScatter.data.datasets.forEach((dataset, index) => {
      dataset.data = data.recommendations
        .filter(rec => rec.action === actions[index])
        .map(rec => ({ x: rec.confidence * 100, y: rec.totalCost }));
    });
    CHARTS.recScatter.update();
  }
}

async function runAgentCycle() {
  const button = document.getElementById('run-agent-cycle');
  if (button) button.disabled = true;
  try {
    await apiRequest('/cycle', { method: 'POST' });
    await refreshDashboard();
    showToast('Agent cycle completed using the retail dataset.', 'green');
  } catch (error) {
    if (button) button.disabled = false;
    showToast(`Agent cycle failed: ${error.message}`, 'amber');
    return;
  }
  if (button) button.disabled = false;
}

function navigateTo(page) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Update pages
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === `page-${page}`);
  });

  // Update breadcrumb
  const bc = document.getElementById('breadcrumbCurrent');
  if (bc) bc.textContent = PAGE_TITLES[page] || page;

  currentPage = page;

  // Lazy init charts
  if (!chartsInitialized[page]) {
    chartsInitialized[page] = true;
    setTimeout(() => initPageCharts(page), 80);
  }
}

function initPageCharts(page) {
  switch(page) {
    case 'demand':          initDemandCharts(); break;
    case 'inventory':       initInventoryCharts(); break;
    case 'logistics':       initLogisticsCharts(); break;
    case 'risk':            initRiskCharts(); break;
    case 'agents':          initAgentPage(); break;
    case 'recommendations': initRecommendations(); break;
    case 'evaluation':      initEvalCharts(); break;
    case 'copilot':         /* no charts */ break;
  }
  if (dashboardData) updateDashboardWidgets(dashboardData);
}

// ─── RECOMMENDATIONS PAGE ─────────────────────────────────────────────
function initRecommendations() {
  renderRecommendations();
  initRecChart();
}

function renderRecommendations() {
  const grid = document.getElementById('recGrid');
  if (!grid) return;

  grid.innerHTML = RECOMMENDATIONS.map(r => {
    const actionClass = r.action === 'ORDER' ? 'rec-order-card' : r.action === 'HOLD' ? 'rec-hold-card' : 'rec-reduce-card';
    const badgeClass  = r.action === 'ORDER' ? 'rec-order-b' : r.action === 'HOLD' ? 'rec-hold-b' : 'rec-reduce-b';
    const urgCls = r.urgency === 'High' ? 'badge-high' : r.urgency === 'Medium' ? 'badge-medium' : 'badge-low';

    const actionsHtml = r.status === 'approved' ?
      `<div class="rec-approved-state">✓ Approved · recorded locally (no ERP order sent)</div>` :
      r.status === 'rejected' ?
      `<div class="rec-rejected-state">✕ Rejected · decision recorded</div>` :
      `<div class="rec-actions">
        <button class="rec-btn-approve" onclick="approveRec('${r.id}')">✓ Approve</button>
        <button class="rec-btn-reject" onclick="rejectRec('${r.id}')">✕ Reject</button>
      </div>`;

    const confidencePct = Math.round(r.confidence * 100);
    const confColor = confidencePct >= 90 ? 'prog-green' : confidencePct >= 80 ? 'prog-blue' : 'prog-amber';

    return `<div class="rec-card ${actionClass}" id="rec-card-${r.id}">
      <div class="rec-card-hdr">
        <div>
          <span class="rec-action-badge ${badgeClass}">${r.action}</span>
        </div>
        <span class="badge ${urgCls}">${r.urgency} Priority</span>
      </div>
      <div class="rec-card-title">${escapeHTML(r.skuName)} – ${escapeHTML(r.sku)}</div>
      <div class="rec-card-sub">${escapeHTML(r.category)} · ${escapeHTML(r.supplier)}${r.store ? ` · ${escapeHTML(r.store)}` : ''}${r.qty > 0 ? ` · Qty: ${r.qty} units` : r.qty < 0 ? ` · Return: ${Math.abs(r.qty)} units` : ''}</div>
      <div class="rec-rationale">${escapeHTML(r.rationale)}</div>
      <div class="rec-impact-row">
        ${r.impact.map(imp => `<span class="rec-impact-chip">${escapeHTML(imp)}</span>`).join('')}
      </div>
      <div style="margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; font-size:10.5px; color:var(--text-muted); margin-bottom:4px;">
          <span>AI Confidence</span><span class="${confidencePct>=90?'text-green':confidencePct>=80?'text-blue':'text-amber'}">${confidencePct}%</span>
        </div>
        <div class="prog-bar-wrap">
          <div class="prog-bar ${confColor}" style="width:${confidencePct}%"></div>
        </div>
      </div>
      ${actionsHtml}
    </div>`;
  }).join('');

  updateRecCounts();
}

async function approveRec(id) {
  const rec = RECOMMENDATIONS.find(r => r.id === id);
  if (!rec) return;
  try {
    await apiRequest(`/recommendations/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'approved' })
    });
    rec.status = 'approved';
    renderRecommendations();
    showToast(`✓ ${rec.action} recommendation for ${rec.sku} approved and recorded.`, 'green');
  } catch (error) {
    showToast(`Approval failed: ${error.message}`, 'amber');
  }
}

async function rejectRec(id) {
  const rec = RECOMMENDATIONS.find(r => r.id === id);
  if (!rec) return;
  try {
    await apiRequest(`/recommendations/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'rejected' })
    });
    rec.status = 'rejected';
    renderRecommendations();
    showToast(`Recommendation for ${rec.sku} rejected and recorded.`, 'amber');
  } catch (error) {
    showToast(`Rejection failed: ${error.message}`, 'amber');
  }
}

function updateRecCounts() {
  const counts = { ORDER: 0, HOLD: 0, REDUCE: 0, approved: 0, rejected: 0 };
  RECOMMENDATIONS.forEach(r => {
    if (r.status === 'approved') counts.approved++;
    else if (r.status === 'rejected') counts.rejected++;
    else counts[r.action]++;
  });
  const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setEl('cnt-order', counts.ORDER);
  setEl('cnt-hold', counts.HOLD);
  setEl('cnt-reduce', counts.REDUCE);
  setEl('cnt-approved', counts.approved);
  setEl('cnt-rejected', counts.rejected);

  // Update nav badge
  const navBadge = document.querySelector('[data-page="recommendations"] .warn-badge');
  const pendingTotal = counts.ORDER + counts.HOLD + counts.REDUCE;
  if (navBadge) navBadge.textContent = pendingTotal;
}

// ─── AGENT PAGE ───────────────────────────────────────────────────────
function initAgentPage() {
  populateAgentLog(AGENT_LOG);
  populateConflicts();
  initAgentTooltips();
}

function populateAgentLog(entries) {
  const log = document.getElementById('agentLog');
  if (!log) return;
  log.innerHTML = entries.map(e => `
    <div class="log-entry" data-type="${e.type}">
      <span class="log-time">[${escapeHTML(e.time)}]</span>
      <span class="log-agent ${escapeHTML(e.cls)}">${escapeHTML(e.agent)}</span>
      <span class="log-msg ${e.type === 'decision' ? 'log-type-decision' : e.type === 'conflict' ? 'log-type-conflict' : ''}">${escapeHTML(e.msg)}</span>
    </div>`).join('');
}

function populateConflicts() {
  const tbody = document.getElementById('body-conflicts');
  if (!tbody) return;
  tbody.innerHTML = CONFLICTS.map(c => `<tr>
    <td class="mono">${escapeHTML(c.cycle)}</td>
    <td class="text-blue">${escapeHTML(c.agentA)}</td>
    <td class="text-purple">${escapeHTML(c.agentB)}</td>
    <td><span class="badge badge-high">${escapeHTML(c.type)}</span></td>
    <td style="max-width:180px; white-space:normal; font-size:12px">${escapeHTML(c.posA)}</td>
    <td style="max-width:180px; white-space:normal; font-size:12px">${escapeHTML(c.posB)}</td>
    <td style="max-width:200px; white-space:normal; font-size:12px; color:var(--green-400)">${escapeHTML(c.resolution)}</td>
    <td><span class="badge ${c.status==='Resolved'?'badge-ok':'badge-warn'}">${escapeHTML(c.status)}</span></td>
  </tr>`).join('');
}

function initAgentTooltips() {
  const nodes = document.querySelectorAll('.flow-node[data-tooltip]');
  const tooltip = document.getElementById('fnTooltip');
  if (!tooltip) return;

  nodes.forEach(node => {
    if (node.dataset.tooltipInitialized) return;
    node.dataset.tooltipInitialized = 'true';
    node.addEventListener('mouseenter', (e) => {
      tooltip.textContent = node.dataset.tooltip;
      tooltip.classList.remove('hidden');
    });
    node.addEventListener('mousemove', (e) => {
      tooltip.style.left = (e.clientX + 16) + 'px';
      tooltip.style.top  = (e.clientY + 10) + 'px';
    });
    node.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden');
    });
  });
}

// Log filter buttons
document.addEventListener('click', (e) => {
  if (!e.target.classList.contains('log-btn')) return;
  if (e.target.id === 'run-agent-cycle') return;
  document.querySelectorAll('.log-btn').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  const filter = e.target.id;
  const entries = filter === 'log-all' ? AGENT_LOG :
                  filter === 'log-decisions' ? AGENT_LOG.filter(e => e.type === 'decision') :
                  AGENT_LOG.filter(e => e.type === 'conflict');
  populateAgentLog(entries);
});

// ─── SCENARIO SIMULATION ──────────────────────────────────────────────
function initScenarioControls() {
  const sliders = {
    shock:   { el: document.getElementById('sl-shock'),   lbl: document.getElementById('lbl-shock'),   format: v => v + '%' },
    lt:      { el: document.getElementById('sl-lt'),      lbl: document.getElementById('lbl-lt'),      format: v => v + '%' },
    sup:     { el: document.getElementById('sl-sup'),     lbl: document.getElementById('lbl-sup'),     format: v => `${v} of 5` },
    ss:      { el: document.getElementById('sl-ss'),      lbl: document.getElementById('lbl-ss'),      format: v => parseFloat(v).toFixed(1) + '×' },
  };

  Object.values(sliders).forEach(({ el, lbl, format }) => {
    if (!el) return;
    el.addEventListener('input', () => { lbl.textContent = format(el.value); });
  });

  const btn = document.getElementById('btn-run-scenario');
  if (btn) btn.addEventListener('click', runScenario);
}

function runScenario() {
  const shock = parseFloat(document.getElementById('sl-shock').value) / 100;
  const ltInc = parseFloat(document.getElementById('sl-lt').value) / 100;
  const supsDis = parseInt(document.getElementById('sl-sup').value, 10);
  const ssMult = parseFloat(document.getElementById('sl-ss').value);
  const button = document.getElementById('btn-run-scenario');
  if (button) button.disabled = true;
  apiRequest('/scenario', {
    method: 'POST',
    body: JSON.stringify({
      demand_shock: shock,
      lead_time_increase: ltInc,
      disrupted_suppliers: supsDis,
      safety_stock_multiplier: ssMult
    })
  }).then(result => {
    const newSO = result.stockout_risk_pct;
    const revLoss = result.estimated_lost_revenue;
    const newSS = result.safety_stock_units;
    const addCost = result.additional_holding_cost;
    const baseSS = result.baseline_safety_stock_units;

    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const setClass = (id, cls) => { const el = document.getElementById(id); if (el) el.className = 'kpi-delta ' + cls; };

    setVal('scen-so', newSO.toFixed(1) + '%');
    setClass('scen-so-d', newSO > 5 ? 'delta-neg' : newSO > 2 ? 'delta-neutral' : 'delta-pos');
    setVal('scen-so-d', `Dataset-based stress estimate · ${result.simulation_scope}`);

    setVal('scen-rev', fmtMoney(revLoss));
    setClass('scen-rev-d', revLoss > 50000 ? 'delta-neg' : revLoss > 10000 ? 'delta-neutral' : 'delta-pos');
    setVal('scen-rev-d', 'Estimated from retail prices and inventory exposure');

    setVal('scen-ss-v', newSS.toFixed(1) + ' u');
    setVal('scen-ss-d', `Baseline average: ${baseSS.toFixed(1)} u`);

    setVal('scen-cost', fmtMoney(addCost));
    setClass('scen-cost-d', addCost > 100000 ? 'delta-neg' : 'delta-neutral');
    setVal('scen-cost-d', 'Estimated additional 90-day holding cost');

    const res = document.getElementById('scenario-results');
    if (res) res.classList.remove('hidden');
    if (CHARTS.riskMc) {
      CHARTS.riskMc.data.labels = result.monte_carlo.days.map(day => day % 10 === 0 ? `Day ${day}` : '');
      CHARTS.riskMc.data.datasets[0].data = result.monte_carlo.p90;
      CHARTS.riskMc.data.datasets[1].data = result.monte_carlo.p10;
      CHARTS.riskMc.data.datasets[2].data = result.monte_carlo.p50;
      CHARTS.riskMc.update();
    }
    showToast('Dataset-backed scenario analysis complete.', 'blue');
  }).catch(error => {
    showToast(`Scenario analysis failed: ${error.message}`, 'amber');
  }).finally(() => {
    if (button) button.disabled = false;
  });
}

// ─── ALERT STRIP ──────────────────────────────────────────────────────
function initAlertStrip() {
  const closeBtn = document.getElementById('alertStripClose');
  const strip = document.getElementById('alertStrip');
  if (closeBtn && strip) {
    closeBtn.addEventListener('click', () => {
      strip.style.opacity = '0';
      strip.style.transform = 'translateY(-100%)';
      setTimeout(() => strip.style.display = 'none', 300);
    });
  }
}

// ─── CHART VIEW TOGGLES ───────────────────────────────────────────────
function initChartToggles() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.chart-toggle');
    if (!btn) return;
    const target = btn.dataset.target;
    const view   = btn.dataset.view;
    if (!target || !CHARTS[target]) return;

    btn.closest('.chart-btns').querySelectorAll('.chart-toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Flip exec demand chart between bar and horizontal bar
    if (target === 'execDemand') {
      CHARTS[target].config.options.indexAxis = view === 'horizontalBar' ? 'y' : 'x';
      CHARTS[target].update();
    }
  });
}

// ─── TOAST NOTIFICATIONS ──────────────────────────────────────────────
function showToast(msg, color = 'blue') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    background: var(--navy-800); border: 1px solid var(--border-bright);
    border-left: 4px solid ${color === 'green' ? 'var(--green-400)' : color === 'amber' ? 'var(--amber-400)' : 'var(--blue-400)'};
    border-radius: 10px; padding: 12px 18px;
    font-size: 13px; color: var(--text-primary);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    animation: toastIn 0.3s ease;
    max-width: 360px;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add toast animations
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes toastIn { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
  @keyframes toastOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(30px); } }
`;
document.head.appendChild(toastStyle);

// ─── AI COPILOT ───────────────────────────────────────────────────────
function initCopilot() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');
  const window_ = document.getElementById('chatWindow');

  if (!input || !sendBtn || !window_) return;

  function sendMessage() {
    const msg = input.value.trim();
    if (!msg) return;
    appendUserMessage(msg);
    input.value = '';
    input.style.height = 'auto';
    showTyping();
    apiRequest('/copilot', { method: 'POST', body: JSON.stringify({ question: msg }) })
      .then(result => {
        removeTyping();
        appendAssistantMessage(result.answer);
      })
      .catch(error => {
      removeTyping();
        showToast(`Copilot request failed: ${error.message}`, 'amber');
      });
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // Prompt chips
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.p;
      sendMessage();
    });
  });
}

function appendUserMessage(msg) {
  const win = document.getElementById('chatWindow');
  if (!win) return;
  const div = document.createElement('div');
  div.className = 'chat-msg chat-user';
  div.innerHTML = `
    <div class="chat-avatar" style="background:var(--navy-700); font-size:12px; color:var(--text-muted);">G2</div>
    <div class="chat-bubble">${escapeHTML(msg)}</div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function showTyping() {
  const win = document.getElementById('chatWindow');
  if (!win) return;
  const div = document.createElement('div');
  div.className = 'chat-msg chat-assist';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="chat-avatar" style="background:linear-gradient(135deg,#60a5fa,#a78bfa);">🎯</div>
    <div class="chat-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function appendAssistantMessage(msg) {
  const win = document.getElementById('chatWindow');
  if (!win) return;
  const div = document.createElement('div');
  div.className = 'chat-msg chat-assist';
  // Convert basic markdown-like formatting
  const formatted = escapeHTML(msg)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>')
    .replace(/\| /g, '<td style="padding:4px 8px;border:1px solid rgba(255,255,255,0.07);">')
    .replace(/ \|/g, '</td>')
    .replace(/\|---.*?\|/g, '')
    .replace(/<td>\| #/g, '<tr><td style="padding:4px 8px;border:1px solid rgba(255,255,255,0.07);">#')
    .replace(/- (.+)/g, '<li>$1</li>');
  div.innerHTML = `
    <div class="chat-avatar" style="background:linear-gradient(135deg,#60a5fa,#a78bfa);">🎯</div>
    <div class="chat-bubble">${formatted}</div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;

  // Hide chips after first real interaction
  const chips = document.getElementById('promptChips');
  if (chips) chips.style.display = 'none';
}

// ─── INIT ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setBackendStatus(false);
  // Nav clicks
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Init executive charts immediately (it's the landing page)
  chartsInitialized['executive'] = true;
  setTimeout(() => {
    initExecutiveCharts();
    if (dashboardData) updateDashboardWidgets(dashboardData);
  }, 100);

  // Scenario sliders
  initScenarioControls();

  // Alert strip
  initAlertStrip();

  // Chart view toggles
  initChartToggles();

  // Copilot
  initCopilot();

  const runCycleButton = document.getElementById('run-agent-cycle');
  if (runCycleButton) runCycleButton.addEventListener('click', runAgentCycle);
  refreshDashboard().catch(() => {});
});
