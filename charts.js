/**
 * SYMPHONY – AI Supply Chain Control Tower
 * charts.js  |  All Chart.js chart initializations
 */

// ─── GLOBAL CHART DEFAULTS ──────────────────────────────────────────
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.07)';
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

const COLORS = {
  blue:   '#60a5fa', blue2:   '#3b82f6',
  purple: '#a78bfa', purple2: '#8b5cf6',
  teal:   '#2dd4bf', teal2:   '#14b8a6',
  green:  '#4ade80', green2:  '#22c55e',
  amber:  '#fbbf24', amber2:  '#f59e0b',
  rose:   '#fb7185', rose2:   '#f43f5e',
  slate:  '#94a3b8',
  cats:   ['#60a5fa','#a78bfa','#2dd4bf','#fbbf24','#fb7185','#4ade80'],
  sups:   ['#60a5fa','#a78bfa','#2dd4bf','#fbbf24','#fb7185'],
};

function alpha(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeOutQuart' },
  plugins: {
    legend: { labels: { boxWidth: 12, padding: 14, font: { size: 11 } } },
    tooltip: {
      backgroundColor: 'rgba(13,21,38,0.95)',
      borderColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      titleFont: { size: 12, weight: '700' },
      bodyFont: { size: 11 },
      padding: 10,
    }
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } } }
  }
};

const NO_SCALE_OPTS = { ...CHART_OPTS, scales: {} };

// Store all chart instances
const CHARTS = {};

// ─── SPARKLINES ─────────────────────────────────────────────────────
function makeSparkline(id, data, color) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const min = Math.min(...data) * 0.95;
  const max = Math.max(...data) * 1.05;
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_,i) => i),
      datasets: [{ data, borderColor: color, borderWidth: 2,
        fill: true, backgroundColor: alpha(color, 0.1),
        tension: 0.4, pointRadius: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false, min, max }
      }
    }
  });
}

// ─── EXECUTIVE OVERVIEW CHARTS ──────────────────────────────────────
function initExecutiveCharts() {
  // Sparklines
  const sparkData = {
    units:    [71000,74200,76800,77500,79100,80200,81500,82100,83200,85100],
    accuracy: [88.2,88.5,88.9,89.1,89.3,89.5,89.5,89.4,89.5,89.5],
    cost:     [1.72,1.75,1.78,1.81,1.84,1.87,1.89,1.91,1.93,1.94],
    service:  [100,100,100,100,100,100,100,100,100,100],
    ss:       [18.5,18.6,18.7,18.8,18.9,18.9,19.0,19.0,19.0,18.99],
    otif:     [93.8,93.5,93.4,93.2,93.1,93.2,93.3,93.2,93.2,93.2],
  };
  makeSparkline('spark-units',    sparkData.units,    COLORS.blue);
  makeSparkline('spark-accuracy', sparkData.accuracy, COLORS.purple);
  makeSparkline('spark-cost',     sparkData.cost,     COLORS.amber);
  makeSparkline('spark-service',  sparkData.service,  COLORS.green);
  makeSparkline('spark-ss',       sparkData.ss,       COLORS.teal);
  makeSparkline('spark-otif',     sparkData.otif,     COLORS.rose);

  // Actual vs Forecast by Category
  const cats = CATEGORY_SUMMARY.map(c => c.category.replace(' & ', ' & ').replace(' furnishings & décor', ' Furn.'));
  const actuals = CATEGORY_SUMMARY.map(c => c.actual);
  const forecasts = CATEGORY_SUMMARY.map(c => Math.round(c.forecast));

  CHARTS.execDemand = new Chart(document.getElementById('chart-exec-demand'), {
    type: 'bar',
    data: {
      labels: cats,
      datasets: [
        { label:'Actual Units', data: actuals, backgroundColor: alpha(COLORS.blue, 0.8), borderRadius: 4, borderSkipped: false },
        { label:'Forecast Units', data: forecasts, backgroundColor: alpha(COLORS.purple, 0.6), borderRadius: 4, borderSkipped: false }
      ]
    },
    options: {
      ...CHART_OPTS,
      plugins: {
        ...CHART_OPTS.plugins,
        legend: { display: true, position: 'top', labels: { boxWidth: 10, padding: 8, font: { size: 10.5 } } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 9.5 }, maxRotation: 0 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 10 } } }
      }
    }
  });

  // Inventory Cost by Category
  const invCosts = CATEGORY_SUMMARY.map(c => c.invCost);
  CHARTS.execInvCost = new Chart(document.getElementById('chart-exec-invcost'), {
    type: 'doughnut',
    data: {
      labels: CATEGORY_SUMMARY.map(c => c.category),
      datasets: [{ data: invCosts, backgroundColor: COLORS.cats.map(c => alpha(c, 0.85)),
        borderColor: COLORS.cats, borderWidth: 1.5, hoverOffset: 6 }]
    },
    options: { ...NO_SCALE_OPTS,
      cutout: '64%',
      plugins: { legend: { position: 'right', labels: { font: { size: 9.5 }, boxWidth: 9, padding: 6 } } }
    }
  });

  // Supplier Radar
  const supNames = SUPPLIERS.map(s => s.name.split(' ')[0]);
  const radarDatasets = [
    { label:'OTIF %', data: SUPPLIERS.map(s => s.otif*100), backgroundColor: alpha(COLORS.blue, 0.15), borderColor: COLORS.blue, borderWidth: 2, pointBackgroundColor: COLORS.blue },
    { label:'Fill Rate %', data: SUPPLIERS.map(s => s.fillRate*100), backgroundColor: alpha(COLORS.green, 0.1), borderColor: COLORS.green, borderWidth: 2, pointBackgroundColor: COLORS.green },
    { label:'Speed (10-LT)*10', data: SUPPLIERS.map(s => (10-s.lt)/10*100), backgroundColor: alpha(COLORS.purple, 0.1), borderColor: COLORS.purple, borderWidth: 2, pointBackgroundColor: COLORS.purple },
  ];
  CHARTS.execRadar = new Chart(document.getElementById('chart-exec-radar'), {
    type: 'radar',
    data: { labels: supNames, datasets: radarDatasets },
    options: { ...NO_SCALE_OPTS,
      scales: { r: { min: 50, max: 105, grid: { color: 'rgba(255,255,255,0.08)' },
        ticks: { color: '#64748b', font: { size: 10 }, backdropColor: 'transparent', stepSize: 10 },
        pointLabels: { color: '#94a3b8', font: { size: 11 } } }
      },
      plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } }
    }
  });

  // Velocity Donut
  CHARTS.execVelocity = new Chart(document.getElementById('chart-exec-velocity'), {
    type: 'doughnut',
    data: {
      labels: ['A – Fast (22 SKUs)','B – Medium (28 SKUs)','C – Slow (20 SKUs)'],
      datasets: [{ data: [VELOCITY.A, VELOCITY.B, VELOCITY.C],
        backgroundColor: [alpha(COLORS.green,0.8), alpha(COLORS.blue,0.8), alpha(COLORS.amber,0.8)],
        borderColor: [COLORS.green, COLORS.blue, COLORS.amber], borderWidth: 2, hoverOffset: 8 }]
    },
    options: { ...NO_SCALE_OPTS, cutout: '58%',
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
    }
  });

  // Alerts Table
  populateAlertsTable();
}

function populateAlertsTable() {
  const tbody = document.getElementById('body-alerts');
  if (!tbody) return;
  tbody.innerHTML = EXEC_ALERTS.map(a => {
    const svClass = a.severity === 'HIGH' ? 'badge-high' : a.severity === 'MEDIUM' ? 'badge-medium' : 'badge-low';
    return `<tr>
      <td><span class="badge ${svClass}">${a.severity}</span></td>
      <td>${a.type}</td>
      <td><strong>${a.entity}</strong></td>
      <td style="max-width:300px; white-space:normal">${a.desc}</td>
      <td class="text-amber mono" style="white-space:nowrap">${a.impact}</td>
      <td style="max-width:200px; white-space:normal">${a.rec}</td>
      <td><button class="action-btn action-approve" onclick="alert('Action recorded: ${a.type}')">Act</button></td>
    </tr>`;
  }).join('');
}

// ─── DEMAND FORECASTING CHARTS ──────────────────────────────────────
function initDemandCharts() {
  // Main Forecast Chart with uncertainty bands
  const ctx = document.getElementById('chart-df-main');
  CHARTS.dfMain = new Chart(ctx, {
    type: 'line',
    data: {
      labels: WEEKS,
      datasets: [
        {
          label: 'P90 Bound', data: WEEKLY_FORECAST_P90,
          borderColor: 'transparent', backgroundColor: alpha(COLORS.purple, 0.12),
          fill: '+1', pointRadius: 0, tension: 0.4, borderWidth: 0
        },
        {
          label: 'P10 Bound', data: WEEKLY_FORECAST_P10,
          borderColor: 'transparent', backgroundColor: alpha(COLORS.purple, 0.12),
          fill: false, pointRadius: 0, tension: 0.4, borderWidth: 0
        },
        {
          label: 'Forecast P50', data: WEEKLY_FORECAST_P50,
          borderColor: COLORS.purple, backgroundColor: 'transparent',
          borderWidth: 2.5, borderDash: [5,3], pointRadius: 3,
          pointBackgroundColor: COLORS.purple, tension: 0.4
        },
        {
          label: 'Actual Demand', data: WEEKLY_ACTUAL,
          borderColor: COLORS.blue, backgroundColor: alpha(COLORS.blue, 0.08),
          borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: COLORS.blue,
          fill: true, tension: 0.4
        }
      ]
    },
    options: { ...CHART_OPTS,
      interaction: { mode: 'index', intersect: false },
      plugins: { ...CHART_OPTS.plugins,
        legend: { display: false },
        tooltip: { ...CHART_OPTS.plugins.tooltip,
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label.includes('Bound')) return null;
              return ` ${ctx.dataset.label}: ${fmt(ctx.raw)} units`;
            }
          }
        }
      }
    }
  });

  // Stacked area by category
  const catColors = [COLORS.blue, COLORS.purple, COLORS.teal, COLORS.amber, COLORS.rose, COLORS.green];
  const catDatasets = CATEGORY_SUMMARY.map((c, i) => ({
    label: c.category,
    data: WEEKS.map((_, wi) => Math.round(c.actual / WEEKS.length * (1 + 0.05 * Math.sin(wi + i)))),
    backgroundColor: alpha(catColors[i], 0.7),
    borderColor: catColors[i],
    borderWidth: 1, fill: true, tension: 0.3
  }));

  CHARTS.dfStacked = new Chart(document.getElementById('chart-df-stacked'), {
    type: 'line',
    data: { labels: WEEKS, datasets: catDatasets },
    options: { ...CHART_OPTS, interaction: { mode: 'index' },
      plugins: { ...CHART_OPTS.plugins, legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } } }
    }
  });

  // APE distribution bar
  CHARTS.dfApe = new Chart(document.getElementById('chart-df-ape'), {
    type: 'bar',
    data: {
      labels: APE_BUCKETS,
      datasets: [{ label: 'SKU-Store Pairs', data: APE_COUNTS,
        backgroundColor: [alpha(COLORS.green,0.75), alpha(COLORS.green,0.6), alpha(COLORS.blue,0.7),
                          alpha(COLORS.amber,0.7), alpha(COLORS.rose,0.6), alpha(COLORS.rose,0.8)],
        borderRadius: 5, borderSkipped: false }]
    },
    options: { ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { display: false } } }
  });

  // Demand Drivers Heatmap (as bar groups for clarity)
  CHARTS.dfDrivers = new Chart(document.getElementById('chart-df-drivers'), {
    type: 'bar',
    data: {
      labels: DEMAND_DRIVERS.features,
      datasets: DEMAND_DRIVERS.categories.map((cat, i) => ({
        label: cat,
        data: DEMAND_DRIVERS.influence[i],
        backgroundColor: alpha(catColors[i], 0.75),
        borderRadius: 3, borderSkipped: false
      }))
    },
    options: { ...CHART_OPTS,
      indexAxis: 'y',
      plugins: { ...CHART_OPTS.plugins,
        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } },
        tooltip: { ...CHART_OPTS.plugins.tooltip,
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${(ctx.raw*100).toFixed(0)}% influence` }
        }
      },
      scales: { x: { ...CHART_OPTS.scales.x, max: 1.0, ticks: { callback: v => (v*100)+'%' } }, y: { grid: { display: false } } }
    }
  });

  // Forecast Methods Doughnut
  CHARTS.dfMethods = new Chart(document.getElementById('chart-df-methods'), {
    type: 'doughnut',
    data: {
      labels: FORECAST_METHODS.labels,
      datasets: [{ data: FORECAST_METHODS.counts,
        backgroundColor: [alpha(COLORS.blue,0.8), alpha(COLORS.purple,0.8), alpha(COLORS.teal,0.8)],
        borderColor: [COLORS.blue, COLORS.purple, COLORS.teal], borderWidth: 2, hoverOffset: 8 }]
    },
    options: { ...NO_SCALE_OPTS, cutout: '55%',
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
    }
  });

  // Demand Detail Table
  const tbody = document.getElementById('body-demand-detail');
  if (tbody) {
    tbody.innerHTML = CATEGORY_SUMMARY.map(c => {
      const bias = ((c.forecast - c.actual) / c.actual * 100).toFixed(3);
      const biasClass = Math.abs(parseFloat(bias)) < 1 ? 'delta-pos' : 'delta-neutral';
      return `<tr>
        <td><strong>${c.category}</strong></td>
        <td class="mono">${fmt(c.actual)}</td>
        <td class="mono">${fmt(Math.round(c.forecast))}</td>
        <td class="${biasClass} mono">${bias > 0 ? '+' : ''}${bias}%</td>
        <td class="mono">${c.wape.toFixed(2)}%</td>
        <td class="mono">${c.turnover.toFixed(2)}×</td>
        <td class="mono">${fmtMoney(c.invCost)}</td>
        <td class="mono">${(c.stockout*100).toFixed(1)}%</td>
        <td><span class="badge badge-ok">✓ On Track</span></td>
      </tr>`;
    }).join('');
  }
}

// ─── INVENTORY & PROCUREMENT CHARTS ─────────────────────────────────
function initInventoryCharts() {
  const catLabels = INV_BY_CAT.map(c => c.cat);

  // Safety Stock & ROP
  CHARTS.invSafety = new Chart(document.getElementById('chart-inv-safety'), {
    type: 'bar',
    data: {
      labels: catLabels,
      datasets: [
        { label: 'Safety Stock (units)', data: INV_BY_CAT.map(c => c.ss), backgroundColor: alpha(COLORS.blue, 0.75), borderRadius: 5, borderSkipped: false },
        { label: 'Reorder Point (units)', data: INV_BY_CAT.map(c => c.rop), backgroundColor: alpha(COLORS.purple, 0.6), borderRadius: 5, borderSkipped: false }
      ]
    },
    options: { ...CHART_OPTS,
      plugins: { ...CHART_OPTS.plugins, legend: { position: 'top' } }
    }
  });

  // Inventory Cost by Supplier (pie)
  CHARTS.invSupCost = new Chart(document.getElementById('chart-inv-sup-cost'), {
    type: 'pie',
    data: {
      labels: SUPPLIERS.map(s => s.name),
      datasets: [{ data: SUPPLIERS.map(s => s.totalCost),
        backgroundColor: COLORS.sups.map(c => alpha(c, 0.8)),
        borderColor: COLORS.sups, borderWidth: 2, hoverOffset: 8 }]
    },
    options: { ...NO_SCALE_OPTS,
      plugins: { legend: { position: 'right', labels: { font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtMoney(ctx.raw)}` } }
      }
    }
  });

  // Days of Cover
  CHARTS.invDaysCover = new Chart(document.getElementById('chart-inv-dayscover'), {
    type: 'bar',
    data: {
      labels: catLabels,
      datasets: [{
        label: 'Days of Cover',
        data: INV_BY_CAT.map(c => c.dayscover),
        backgroundColor: INV_BY_CAT.map(c => c.dayscover < 12 ? alpha(COLORS.amber,0.8) : alpha(COLORS.green,0.75)),
        borderRadius: 5, borderSkipped: false
      }]
    },
    options: { ...CHART_OPTS,
      plugins: { ...CHART_OPTS.plugins, legend: { display: false },
        annotation: { annotations: { line1: {
          type: 'line', yMin: 14, yMax: 14, borderColor: COLORS.rose, borderWidth: 1.5,
          borderDash: [5,4], label: { content: 'Min. 14-day threshold', display: true,
            position: 'end', color: COLORS.rose, font: { size: 10 } }
        }}}
      }
    }
  });

  // Velocity Heatmap (bar chart per category)
  const velCats = CATEGORY_SUMMARY.map(c => c.category);
  // Approximate A/B/C distribution per category from DIM_PRODUCT.csv
  const velA = [2, 5, 3, 3, 4, 5]; // counts by category
  const velB = [5, 6, 5, 4, 6, 2];
  const velC = [4, 4, 2, 4, 2, 4];
  CHARTS.invHeatmap = new Chart(document.getElementById('chart-inv-heatmap'), {
    type: 'bar',
    data: {
      labels: velCats.map(c => c.split(' &')[0].split(' furnishings')[0]),
      datasets: [
        { label:'A – Fast', data: velA, backgroundColor: alpha(COLORS.green, 0.8), borderRadius: 4, borderSkipped: false },
        { label:'B – Medium', data: velB, backgroundColor: alpha(COLORS.blue, 0.7), borderRadius: 4, borderSkipped: false },
        { label:'C – Slow', data: velC, backgroundColor: alpha(COLORS.amber, 0.7), borderRadius: 4, borderSkipped: false }
      ]
    },
    options: { ...CHART_OPTS,
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' } } },
      plugins: { ...CHART_OPTS.plugins, legend: { position: 'top', labels: { font: { size: 11 } } } }
    }
  });

  // Procurement table
  const tbody = document.getElementById('body-procurement');
  if (tbody) {
    tbody.innerHTML = SUPPLIERS.map(s => {
      const riskScore = ((7 - s.lt) / 7 * 0.3 + (1 - s.otif) * 0.5 + (1 - s.fillRate) * 0.2);
      const riskLevel = riskScore > 0.15 ? 'HIGH' : riskScore > 0.08 ? 'MEDIUM' : 'LOW';
      const riskCls = riskLevel === 'HIGH' ? 'badge-high' : riskLevel === 'MEDIUM' ? 'badge-medium' : 'badge-low';
      return `<tr>
        <td><strong>${s.name}</strong><br><small class="text-muted">${s.id}</small></td>
        <td class="mono">${s.lt}d</td>
        <td class="mono">±${s.ltStd}d</td>
        <td class="mono ${s.otif >= 0.95 ? 'text-green' : 'text-amber'}">${(s.otif*100).toFixed(0)}%</td>
        <td class="mono ${s.fillRate >= 0.95 ? 'text-green' : 'text-amber'}">${(s.fillRate*100).toFixed(0)}%</td>
        <td class="mono">${s.moq}</td>
        <td class="mono">$${s.orderCost}</td>
        <td class="mono">$${s.transCost}</td>
        <td class="mono">${s.avgInv.toFixed(1)}</td>
        <td class="mono">${fmtMoney(s.totalCost)}</td>
        <td><span class="badge ${riskCls}">${riskLevel}</span></td>
      </tr>`;
    }).join('');
  }
}

// ─── LOGISTICS & SUPPLIER CHARTS ─────────────────────────────────────
function initLogisticsCharts() {
  const supNames = SUPPLIERS.map(s => s.name.split(' ')[0]);

  // OTIF Bar
  CHARTS.logOtif = new Chart(document.getElementById('chart-log-otif'), {
    type: 'bar',
    data: {
      labels: SUPPLIERS.map(s => s.name),
      datasets: [{
        label: 'OTIF %',
        data: SUPPLIERS.map(s => s.otif * 100),
        backgroundColor: SUPPLIERS.map(s => s.otif >= 0.95 ? alpha(COLORS.green, 0.75) : s.otif >= 0.90 ? alpha(COLORS.amber, 0.75) : alpha(COLORS.rose, 0.75)),
        borderRadius: 5, borderSkipped: false
      }]
    },
    options: { ...CHART_OPTS,
      indexAxis: 'y',
      scales: {
        x: { ...CHART_OPTS.scales.x, min: 80, max: 100, ticks: { callback: v => v + '%' } },
        y: { grid: { display: false } }
      },
      plugins: { ...CHART_OPTS.plugins, legend: { display: false },
        annotation: { annotations: { target: {
          type: 'line', xMin: 95, xMax: 95, borderColor: COLORS.rose, borderWidth: 1.5,
          borderDash: [5,4], label: { content: '95% Target', display: true, position: 'start', color: COLORS.rose, font: { size: 10 } }
        }}}
      }
    }
  });

  // Lead Time with error bars (simulated using custom datasets)
  CHARTS.logLt = new Chart(document.getElementById('chart-log-lt'), {
    type: 'bar',
    data: {
      labels: SUPPLIERS.map(s => s.name),
      datasets: [
        { label: 'Mean Lead Time (days)', data: SUPPLIERS.map(s => s.lt),
          backgroundColor: SUPPLIERS.map(s => s.lt <= 3 ? alpha(COLORS.green,0.75) : s.lt <= 5 ? alpha(COLORS.amber,0.75) : alpha(COLORS.rose,0.75)),
          borderRadius: 5, borderSkipped: false },
        { label: 'σ (variability)', data: SUPPLIERS.map(s => s.ltStd),
          backgroundColor: alpha(COLORS.slate, 0.4), borderRadius: 5, borderSkipped: false }
      ]
    },
    options: { ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { position: 'top' } } }
  });

  // Fill Rate vs Lead Time scatter
  CHARTS.logScatter = new Chart(document.getElementById('chart-log-scatter'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Suppliers',
        data: SUPPLIERS.map(s => ({ x: s.lt, y: s.fillRate * 100, r: 12, label: s.name.split(' ')[0] })),
        backgroundColor: COLORS.sups.map(c => alpha(c, 0.75)),
        borderColor: COLORS.sups, borderWidth: 2, pointRadius: 14, pointHoverRadius: 18
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: CHART_OPTS.animation,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => {
          const s = SUPPLIERS[ctx.dataIndex];
          return ` ${s.name}: LT=${s.lt}d · Fill=${(s.fillRate*100).toFixed(0)}%`;
        }
      }, ...CHART_OPTS.plugins.tooltip } },
      scales: {
        x: { ...CHART_OPTS.scales.x, title: { display: true, text: 'Lead Time (days)', color: COLORS.slate },
          min: 0, max: 10 },
        y: { ...CHART_OPTS.scales.y, title: { display: true, text: 'Fill Rate %', color: COLORS.slate },
          min: 85, max: 100, ticks: { callback: v => v + '%' } }
      }
    }
  });

  // Store bubble chart
  CHARTS.logStore = new Chart(document.getElementById('chart-log-store'), {
    type: 'bubble',
    data: {
      datasets: STORES.map((s, i) => ({
        label: `${s.city} (${s.id})`,
        data: [{ x: s.factor, y: s.sqft / 1000, r: Math.sqrt(s.sqft) / 18 }],
        backgroundColor: alpha(COLORS.cats[i % 6], 0.6),
        borderColor: COLORS.cats[i % 6], borderWidth: 2
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: CHART_OPTS.animation,
      plugins: { ...CHART_OPTS.plugins, legend: { position: 'right', labels: { font: { size: 10 }, boxWidth: 10 } },
        tooltip: { callbacks: {
          label: ctx => {
            const s = STORES[ctx.datasetIndex];
            return ` ${s.city}: Factor=${s.factor} · Sqft=${fmt(s.sqft)}`;
          }
        }}
      },
      scales: {
        x: { ...CHART_OPTS.scales.x, title: { display: true, text: 'Store Factor', color: COLORS.slate } },
        y: { ...CHART_OPTS.scales.y, title: { display: true, text: 'Store Size (K sq ft)', color: COLORS.slate } }
      }
    }
  });

  // Supplier scorecard table
  const tbody = document.getElementById('body-scorecard');
  if (tbody) {
    tbody.innerHTML = SUPPLIERS.map((s, i) => {
      const riskScore = Math.round(((1 - s.otif) * 0.5 + (1 - s.fillRate) * 0.3 + s.ltStd / 5 * 0.2) * 100);
      const tier = riskScore < 10 ? 'Platinum' : riskScore < 18 ? 'Gold' : riskScore < 25 ? 'Silver' : 'Bronze';
      const tierCls = tier === 'Platinum' ? 'badge-low' : tier === 'Gold' ? 'badge-gold' : tier === 'Silver' ? 'badge-silver' : 'badge-bronze';
      return `<tr>
        <td><strong>${s.name}</strong><br><small class="text-muted">${s.id}</small></td>
        <td class="mono">${s.lt}d</td>
        <td class="mono">±${s.ltStd}d</td>
        <td class="mono ${s.otif>=0.95?'text-green':'text-amber'}">${(s.otif*100).toFixed(0)}%</td>
        <td class="mono ${s.fillRate>=0.95?'text-green':'text-amber'}">${(s.fillRate*100).toFixed(0)}%</td>
        <td class="mono">${s.avgInv.toFixed(1)}</td>
        <td class="mono">${fmtMoney(s.totalCost)}</td>
        <td class="mono">${s.moq}</td>
        <td class="mono ${riskScore>18?'text-amber':riskScore>25?'text-rose':'text-green'}">${riskScore}/100</td>
        <td><span class="badge ${tierCls}">${tier}</span></td>
      </tr>`;
    }).join('');
  }

  // Stores table
  const stbody = document.getElementById('body-stores');
  if (stbody) {
    const totalFactor = STORES.reduce((a,s)=>a+s.factor,0);
    stbody.innerHTML = STORES.map(s => {
      const demandWeight = (s.factor / totalFactor * 100).toFixed(1);
      const perfClass = s.factor >= 1.0 ? 'text-green' : s.factor >= 0.9 ? 'text-amber' : 'delta-neg';
      return `<tr>
        <td><strong>${s.id}</strong></td>
        <td>${s.city}</td>
        <td>${s.state}</td>
        <td><span class="badge badge-medium">${s.format}</span></td>
        <td class="mono">${fmt(s.sqft)}</td>
        <td class="mono ${perfClass}">${s.factor}</td>
        <td class="mono">${demandWeight}%</td>
        <td>
          <div class="prog-bar-wrap" style="width:100px">
            <div class="prog-bar ${s.factor>=1?'prog-green':s.factor>=0.9?'prog-blue':'prog-amber'}" style="width:${s.factor*80}%"></div>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
}

// ─── RISK CHARTS ──────────────────────────────────────────────────────
function initRiskCharts() {
  // Stockout Risk by Category
  CHARTS.riskSo = new Chart(document.getElementById('chart-risk-so'), {
    type: 'bar',
    data: {
      labels: STOCKOUT_RISK_BY_CAT.map(c => c.cat),
      datasets: [{
        label: 'Stockout Probability %',
        data: STOCKOUT_RISK_BY_CAT.map(c => (c.risk * 100).toFixed(1)),
        backgroundColor: STOCKOUT_RISK_BY_CAT.map(c => c.risk > 0.15 ? alpha(COLORS.rose,0.8) : c.risk > 0.10 ? alpha(COLORS.amber,0.8) : alpha(COLORS.green,0.75)),
        borderRadius: 5, borderSkipped: false
      }]
    },
    options: { ...CHART_OPTS,
      plugins: { ...CHART_OPTS.plugins, legend: { display: false } },
      scales: { y: { ...CHART_OPTS.scales.y, ticks: { callback: v => v + '%' } } }
    }
  });

  // Demand Shock Sensitivity
  const shockLevels = ['-50%','-20%','-10%','Baseline','+10%','+20%','+50%','+100%'];
  const shockDOC = [22, 18, 16, 14.3, 12, 10, 7, 4]; // days of cover
  const shockCost = [-3.2, -1.8, -0.9, 0, 1.2, 2.4, 5.2, 9.8]; // additional cost $M

  CHARTS.riskShock = new Chart(document.getElementById('chart-risk-shock'), {
    type: 'bar',
    data: {
      labels: shockLevels,
      datasets: [
        { label: 'Days of Cover', data: shockDOC, backgroundColor: shockDOC.map(d => d < 10 ? alpha(COLORS.rose,0.8) : d < 14 ? alpha(COLORS.amber,0.75) : alpha(COLORS.green,0.75)), borderRadius: 5, borderSkipped: false, yAxisID: 'y' },
        { label: 'Add. Cost ($M)', data: shockCost, type: 'line', borderColor: COLORS.amber, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 4, yAxisID: 'y2', tension: 0.4 }
      ]
    },
    options: {
      ...CHART_OPTS,
      scales: {
        y: { ...CHART_OPTS.scales.y, title: { display: true, text: 'Days of Cover', color: COLORS.slate } },
        y2: { position: 'right', grid: { display: false }, ticks: { callback: v => (v>0?'+':'')+v+'M', color: COLORS.amber } }
      },
      plugins: { ...CHART_OPTS.plugins, legend: { position: 'top' } }
    }
  });

  // Supplier Concentration Risk (doughnut)
  CHARTS.riskConc = new Chart(document.getElementById('chart-risk-conc'), {
    type: 'doughnut',
    data: {
      labels: SUPPLIERS.map(s => `${s.name.split(' ')[0]} – At Risk`),
      datasets: [{ data: SUPPLIERS.map(s => s.totalCost),
        backgroundColor: COLORS.sups.map((c,i) => alpha(c, i===2 ? 0.95 : 0.65)),
        borderColor: COLORS.sups.map((c,i) => i===2 ? COLORS.rose : c), borderWidth: i => i===2 ? 3 : 2, hoverOffset: 8 }]
    },
    options: { ...NO_SCALE_OPTS, cutout: '55%',
      plugins: { legend: { position: 'bottom', labels: { font: { size: 10.5 } } },
        tooltip: { callbacks: { label: ctx => ` ${SUPPLIERS[ctx.dataIndex].name}: ${fmtMoney(ctx.raw)}` } }
      }
    }
  });

  // Monte Carlo
  CHARTS.riskMc = new Chart(document.getElementById('chart-risk-mc'), {
    type: 'line',
    data: {
      labels: Array.from({length: 91}, (_,i) => i % 10 === 0 ? `Day ${i}` : ''),
      datasets: [
        { label:'P90', data: [], borderColor: alpha(COLORS.rose,0.6), backgroundColor: alpha(COLORS.rose,0.05), fill: '+1', borderWidth: 1.5, pointRadius: 0, tension: 0.3 },
        { label:'P10', data: [], borderColor: alpha(COLORS.green,0.6), backgroundColor: alpha(COLORS.green,0.05), fill: false, borderWidth: 1.5, pointRadius: 0, tension: 0.3 },
        { label:'P50 (Median)', data: [], borderColor: COLORS.blue, backgroundColor: 'transparent', borderWidth: 2.5, pointRadius: 0, tension: 0.3 }
      ]
    },
    options: { ...CHART_OPTS,
      plugins: { ...CHART_OPTS.plugins, legend: { position: 'top' } }
    }
  });
}

// ─── EVALUATION CHARTS ────────────────────────────────────────────────
function initEvalCharts() {
  // WAPE by Category
  CHARTS.evWape = new Chart(document.getElementById('chart-ev-wape'), {
    type: 'bar',
    data: {
      labels: CAT_NAMES_SHORT,
      datasets: [{
        label: 'WAPE %',
        data: CAT_WAPES,
        backgroundColor: CAT_WAPES.map(w => w > 15 ? alpha(COLORS.rose,0.8) : w > 12 ? alpha(COLORS.amber,0.75) : alpha(COLORS.green,0.75)),
        borderRadius: 5, borderSkipped: false
      }]
    },
    options: { ...CHART_OPTS,
      scales: { y: { ...CHART_OPTS.scales.y, min: 0, ticks: { callback: v => v + '%' } } },
      plugins: { ...CHART_OPTS.plugins, legend: { display: false },
        annotation: { annotations: { t: {
          type:'line', yMin:15, yMax:15, borderColor: COLORS.rose, borderWidth:1.5,
          borderDash:[5,4], label:{ content:'15% Target Ceiling', display:true, position:'end', color:COLORS.rose, font:{size:10} }
        }}}
      }
    }
  });

  // Method Performance
  CHARTS.evMethods = new Chart(document.getElementById('chart-ev-methods'), {
    type: 'bar',
    data: {
      labels: FORECAST_METHODS.labels,
      datasets: [
        { label: 'WAPE %', data: FORECAST_METHODS.wapes, backgroundColor: [alpha(COLORS.blue,0.75), alpha(COLORS.purple,0.75), alpha(COLORS.teal,0.75)], borderRadius: 5, borderSkipped: false },
        { label: 'Usage (K pairs)', data: FORECAST_METHODS.counts.map(c => (c/1000).toFixed(1)), type: 'line', borderColor: COLORS.amber, borderWidth: 2, pointRadius: 5, yAxisID: 'y2', tension: 0.3 }
      ]
    },
    options: { ...CHART_OPTS,
      scales: {
        y: { ...CHART_OPTS.scales.y, title: { display: true, text: 'WAPE %', color: COLORS.slate } },
        y2: { position: 'right', grid: { display: false }, ticks: { callback: v => v + 'K', color: COLORS.amber } }
      },
      plugins: { ...CHART_OPTS.plugins, legend: { position: 'top' } }
    }
  });

  // Residual Plot
  CHARTS.evResidual = new Chart(document.getElementById('chart-ev-residual'), {
    type: 'bar',
    data: {
      labels: WEEKS,
      datasets: [
        { label: 'Forecast Error (units)', data: RESIDUALS.map(r => r.error),
          backgroundColor: RESIDUALS.map(r => r.error > 0 ? alpha(COLORS.blue, 0.7) : alpha(COLORS.rose, 0.7)),
          borderRadius: 3, borderSkipped: false }
      ]
    },
    options: { ...CHART_OPTS,
      plugins: { ...CHART_OPTS.plugins, legend: { display: false },
        annotation: { annotations: { zero: { type:'line', yMin:0, yMax:0, borderColor: COLORS.slate, borderWidth:1 } } }
      },
      scales: { y: { ...CHART_OPTS.scales.y, title: { display: true, text: 'Error (Forecast − Actual)', color: COLORS.slate } } }
    }
  });

  // DQ Table
  const tbody = document.getElementById('body-dq');
  if (tbody) {
    tbody.innerHTML = DQ_DATASETS.map(d => `<tr>
      <td><strong>${d.name}</strong></td>
      <td><span class="badge ${d.role.includes('Primary') ? 'badge-low' : d.role.includes('Transfer') ? 'badge-medium' : d.role.includes('Neg') ? 'badge-high' : 'badge-medium'}">${d.role}</span></td>
      <td class="mono">${d.rows}</td>
      <td class="mono ${d.completeness === 'N/A' ? 'text-muted' : ''}">${d.completeness}</td>
      <td class="mono ${d.outliers !== '0%' && d.outliers !== 'N/A' && d.outliers !== '0.0%' ? 'text-amber' : ''}">${d.outliers}</td>
      <td class="${d.status === 'warn' ? 'text-amber' : 'text-green'}">${d.drift}</td>
      <td><span class="badge ${d.status === 'ok' ? 'badge-ok' : 'badge-warn'}">${d.status === 'ok' ? '✓ Good' : '⚠ Review'}</span></td>
    </tr>`).join('');
  }

  // Drift panels
  const dpWrap = document.getElementById('driftPanels');
  if (dpWrap) {
    dpWrap.innerHTML = DRIFT_PANELS.map(d => {
      const stClass = d.status === 'ok' ? 'drift-ok' : d.status === 'warn' ? 'drift-warn' : 'drift-alert';
      const chgClass = d.change.startsWith('+') ? 'delta-neg' : d.change.startsWith('-') ? 'delta-pos' : 'delta-neutral';
      return `<div class="drift-panel">
        <div class="drift-panel-title">${d.title}</div>
        <div class="drift-panel-metric">${d.current}</div>
        <div class="drift-panel-change ${chgClass}">${d.change} vs prior week</div>
        <div class="drift-panel-change text-muted" style="font-size:10px">Threshold: ${d.threshold}</div>
        <span class="drift-status ${stClass}">${d.status === 'ok' ? '✓ Stable' : '⚠ Monitor'}</span>
      </div>`;
    }).join('');
  }
}

// ─── RECOMMENDATIONS CHART ────────────────────────────────────────────
function initRecChart() {
  // Cost vs Service level trade-off scatter
  const recData = RECOMMENDATIONS.map((r, i) => ({
    x: r.confidence * 100,
    y: r.totalCost,
    r: 10,
    label: r.action,
    idx: i
  }));

  CHARTS.recScatter = new Chart(document.getElementById('chart-rec-scatter'), {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'ORDER',
          data: recData.filter(d => d.label === 'ORDER').map(d => ({ x: d.x, y: d.y })),
          backgroundColor: alpha(COLORS.blue, 0.7), borderColor: COLORS.blue, borderWidth: 2, pointRadius: 14
        },
        {
          label: 'HOLD',
          data: recData.filter(d => d.label === 'HOLD').map(d => ({ x: d.x, y: d.y })),
          backgroundColor: alpha(COLORS.amber, 0.7), borderColor: COLORS.amber, borderWidth: 2, pointRadius: 14
        },
        {
          label: 'REDUCE',
          data: recData.filter(d => d.label === 'REDUCE').map(d => ({ x: d.x, y: d.y })),
          backgroundColor: alpha(COLORS.rose, 0.7), borderColor: COLORS.rose, borderWidth: 2, pointRadius: 14
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: CHART_OPTS.animation,
      plugins: { legend: { position: 'top' }, tooltip: { ...CHART_OPTS.plugins.tooltip,
        callbacks: {
          label: ctx => ` Confidence: ${ctx.parsed.x.toFixed(0)}% · Cost: ${fmtMoney(ctx.parsed.y)}`
        }
      }},
      scales: {
        x: { ...CHART_OPTS.scales.x, title: { display: true, text: 'AI Confidence %', color: COLORS.slate }, min: 75, max: 100 },
        y: { ...CHART_OPTS.scales.y, title: { display: true, text: 'Order Value ($)', color: COLORS.slate } }
      }
    }
  });
}
