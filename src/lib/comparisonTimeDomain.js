// Fit complete cycles after phase 0 alignment. Use every panel so selecting
// another tissue does not change the time scale of existing comparisons.
export function comparisonTimeDomain(cycleMs, panels) {
  let start = 0
  let end = cycleMs
  for (const panel of panels) {
    if (!panel.referenceData || !panel.referenceCycleMs) continue
    const offset = panel.referenceOffsetMs ?? 0
    start = Math.min(start, offset)
    end = Math.max(end, offset + panel.referenceCycleMs)
  }
  return [start, end]
}
