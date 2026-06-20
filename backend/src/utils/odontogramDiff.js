function normalizeCondition(c) {
  if (c === 'caries') return 'decay';
  return c || 'healthy';
}

function diffCharts(previous = {}, current = {}) {
  const allTeeth = new Set([
    ...Object.keys(previous || {}),
    ...Object.keys(current || {})
  ]);

  const changes = [];
  allTeeth.forEach((tooth) => {
    const prev = previous[tooth] || { condition: 'healthy' };
    const curr = current[tooth] || { condition: 'healthy' };
    const prevCond = normalizeCondition(prev.condition);
    const currCond = normalizeCondition(curr.condition);
    const prevSurfaces = (prev.surfaces || []).slice().sort().join('');
    const currSurfaces = (curr.surfaces || []).slice().sort().join('');

    if (prevCond === currCond && prevSurfaces === currSurfaces && (prev.notes || '') === (curr.notes || '')) {
      return;
    }

    if (prevCond === 'healthy' && currCond === 'healthy' && !prevSurfaces && !currSurfaces) {
      return;
    }

    changes.push({
      tooth,
      from: { condition: prevCond, surfaces: prev.surfaces || [], notes: prev.notes || '' },
      to: { condition: currCond, surfaces: curr.surfaces || [], notes: curr.notes || '' },
      type: classifyChange(prevCond, currCond)
    });
  });

  changes.sort((a, b) => Number(a.tooth) - Number(b.tooth));
  return changes;
}

function classifyChange(from, to) {
  if (from === to) return 'updated';
  if (from === 'healthy' && to !== 'healthy') return 'new_issue';
  if (from !== 'healthy' && to === 'healthy') return 'resolved';
  return 'condition_change';
}

function summarizeDiff(changes) {
  const summary = { new_issue: 0, condition_change: 0, resolved: 0, updated: 0 };
  changes.forEach((c) => {
    summary[c.type] = (summary[c.type] || 0) + 1;
  });
  return summary;
}

module.exports = { diffCharts, summarizeDiff, normalizeCondition };
