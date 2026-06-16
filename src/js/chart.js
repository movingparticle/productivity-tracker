import Chart from 'chart.js/auto';
import { t as tr } from './i18n';

let chartInstance = null;
let weekBarChartInstance = null;
let historialChartInstance = null;

/**
 * Render or update the "Time vs Points" line chart
 * @param {HTMLCanvasElement} canvasElement 
 * @param {Array} todayLog Array of today's activities 
 * @param {Array} users Array of room users 
 */
export function updateTimeChart(canvasElement, todayLog, users) {
  if (!canvasElement) return;

  try {
    const ctx = canvasElement.getContext('2d');
    
    // Sort logs by time/id to show correct chronological progression
    const sortedLogs = [...todayLog].sort((a, b) => a.id - b.id);
    
    // Get all unique times in today's log
    const allTimes = [...new Set(sortedLogs.map(l => l.time))];
    if (allTimes.length === 0) {
      allTimes.push("--:--");
    }

    // Create datasets for each user
    const datasets = users.map(u => {
      let cumulativeSum = 0;
      const data = allTimes.map(t => {
        // Find logs matching user and time
        const matchingLogs = sortedLogs.filter(l => l.who === u.id && l.time === t);
        matchingLogs.forEach(l => {
          cumulativeSum += Number(l.pts) || 0;
        });
        return cumulativeSum;
      });

      // Elegant glowing gradient fill matching user colors
      return {
        label: u.name,
        data: data,
        borderColor: u.color,
        backgroundColor: u.color + '12', // 7% opacity
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: u.color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 3
      };
    });

    // Destroy old instance if exists
    if (chartInstance) {
      chartInstance.destroy();
    }

    const isDark = document.documentElement.dataset.theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b'; // Slate gray labels
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.05)'; // Grey grids
    const legendColor = isDark ? '#f1f5f9' : '#1e293b'; // Slate dark/light legend text

    // Create new chart instance
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allTimes,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              font: {
                family: "'Inter', sans-serif",
                size: 10
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              font: {
                family: "'Inter', sans-serif",
                size: 10
              },
              precision: 0
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: legendColor,
              font: {
                family: "'Outfit', sans-serif",
                weight: 'bold',
                size: 11
              },
              padding: 15,
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: '#1e293b', // Dark tooltip for contrast
            titleColor: '#3b82f6',
            titleFont: {
              family: "'Outfit', sans-serif",
              weight: 'bold'
            },
            bodyColor: '#f8fafc',
            bodyFont: {
              family: "'Inter', sans-serif"
            },
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: true
          }
        }
      }
    });
  } catch (err) {
    console.error("Error drawing Time vs Points chart:", err);
  }
}

/**
 * Render or update the weekly bar chart (pts per day, one dataset per user).
 * @param {HTMLCanvasElement} canvas
 * @param {Array} users  Array of room users
 * @param {Function} getDailyTotals  (userId) => [{label, pts}]
 */
export function updateWeekBarChart(canvas, users, getDailyTotals) {
  if (!canvas) return;
  try {
    if (weekBarChartInstance) {
      weekBarChartInstance.destroy();
      weekBarChartInstance = null;
    }

    // Gather all day labels across all users
    const labelSet = new Set();
    users.forEach(u => getDailyTotals(u.id).forEach(d => labelSet.add(d.label)));
    const labels = [...labelSet];
    if (labels.length === 0) labels.push(tr('report.weekly.no.data'));

    const datasets = users.map(u => {
      const daily = getDailyTotals(u.id);
      const byLabel = new Map(daily.map(d => [d.label, d.pts]));
      return {
        label: u.name,
        data: labels.map(l => byLabel.get(l) || 0),
        backgroundColor: u.color + 'cc',
        borderColor: u.color,
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      };
    });

    const isDark = document.documentElement.dataset.theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.05)';
    const legendColor = isDark ? '#f1f5f9' : '#1e293b';

    weekBarChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 10 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 10 }, precision: 0 }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: legendColor,
              font: { family: "'Outfit', sans-serif", weight: 'bold', size: 11 },
              padding: 12,
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#3b82f6',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8
          }
        }
      }
    });
  } catch (err) {
    console.error("Error drawing weekly bar chart:", err);
  }
}

/**
 * Line chart showing historical daily points per user.
 * Same visual style as the "Hoy" chart.
 * @param {HTMLCanvasElement} canvas
 * @param {Array} users
 * @param {Array} history  [{date, points:{uid:pts}}]  — store.history
 * @param {Object} todayPoints  {uid: pts}  — today's totals
 * @param {string} todayLabel  — label for today
 */
export function updateHistorialChart(canvas, users, history, todayPoints, todayLabel) {
  if (!canvas) return;
  try {
    if (historialChartInstance) {
      historialChartInstance.destroy();
      historialChartInstance = null;
    }

    // Build ordered list of {label, points:{uid:pts}}
    const days = [...history.map(h => ({ label: h.date, points: h.points || {} }))];
    // Append today if it has data
    const todayTotal = Object.values(todayPoints).reduce((s, v) => s + v, 0);
    if (todayTotal > 0) days.push({ label: todayLabel, points: todayPoints });

    if (days.length === 0) {
      // Nothing to show — just clear
      return;
    }

    const labels = days.map(d => d.label);

    const datasets = users.map(u => {
      const data = days.map(d => Number((d.points || {})[u.id]) || 0);
      return {
        label: u.name,
        data,
        borderColor: u.color,
        backgroundColor: u.color + '12',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: u.color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        borderWidth: 3
      };
    });

    const isDark = document.documentElement.dataset.theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.05)';
    const legendColor = isDark ? '#f1f5f9' : '#1e293b';

    historialChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 10 }, maxRotation: 45 }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 10 }, precision: 0 }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: legendColor,
              font: { family: "'Outfit', sans-serif", weight: 'bold', size: 11 },
              padding: 15,
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#3b82f6',
            titleFont: { family: "'Outfit', sans-serif", weight: 'bold' },
            bodyColor: '#f8fafc',
            bodyFont: { family: "'Inter', sans-serif" },
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: true
          }
        }
      }
    });
  } catch (err) {
    console.error("Error drawing historial chart:", err);
  }
}
