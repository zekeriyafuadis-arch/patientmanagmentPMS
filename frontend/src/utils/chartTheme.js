/**
 * Theme-aware Chart.js helpers — reads CSS variables set by themeManager.
 */

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function getChartPalette() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    || document.body.classList.contains('dark-mode');

  return {
    isDark,
    text: cssVar('--text-secondary', isDark ? '#cbd5e1' : '#64748b'),
    textMuted: cssVar('--text-muted', isDark ? '#94a3b8' : '#64748b'),
    grid: cssVar('--border-color', isDark ? '#334155' : '#e2e8f0'),
    primary: cssVar('--primary', '#0891b2'),
    primaryLight: cssVar('--primary-light', '#22d3ee'),
    accent: cssVar('--accent', '#14b8a6'),
    surface: cssVar('--surface', isDark ? '#1e293b' : '#ffffff'),
    gender: [
      'rgba(8, 145, 178, 0.85)',
      'rgba(20, 184, 166, 0.85)',
      'rgba(148, 163, 184, 0.65)'
    ],
    genderBorder: [
      'rgba(8, 145, 178, 1)',
      'rgba(20, 184, 166, 1)',
      'rgba(148, 163, 184, 1)'
    ]
  };
}

export function baseLegendOptions(palette) {
  return {
    position: 'bottom',
    labels: {
      color: palette.text,
      font: { size: 12, family: "'Plus Jakarta Sans', sans-serif" },
      padding: 16
    }
  };
}

export function baseScaleOptions(palette, { yStep = 1, yTitle = '', xTitle = '' } = {}) {
  const tick = { color: palette.textMuted, font: { size: 11 } };
  const grid = { color: palette.grid };
  return {
    y: {
      beginAtZero: true,
      ticks: { ...tick, stepSize: yStep },
      grid,
      title: yTitle ? { display: true, text: yTitle, color: palette.text } : undefined
    },
    x: {
      ticks: tick,
      grid: { display: false },
      title: xTitle ? { display: true, text: xTitle, color: palette.text } : undefined
    }
  };
}

export function destroyChart(chart) {
  if (chart) chart.destroy();
}
