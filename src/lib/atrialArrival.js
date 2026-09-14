// Qualitative propagation through connected muscle, never through a cavity.
// The broad Bachmann band is a preferential route, not the only connection.
export function atrialArrival(mask, preferential, width, seed) {
  const distances = new Float64Array(mask.length).fill(Infinity)
  const heap = []
  function push(index, distance) {
    let i = heap.length
    heap.push([index, distance])
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p][1] <= distance) break
      heap[i] = heap[p]; i = p
    }
    heap[i] = [index, distance]
  }
  distances[seed] = 0
  push(seed, 0)
  while (heap.length) {
    const [index, distance] = heap[0]
    const last = heap.pop()
    if (heap.length) {
      let i = 0
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1
        if (child + 1 < heap.length && heap[child + 1][1] < heap[child][1]) child++
        if (last[1] <= heap[child][1]) break
        heap[i] = heap[child]; i = child
      }
      heap[i] = last
    }
    if (distance !== distances[index]) continue
    const x = index % width
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || x + dx < 0 || x + dx >= width) continue
      const next = index + dy * width + dx
      if (next < 0 || next >= mask.length || !mask[next]) continue
      if (dx && dy && (!mask[index + dx] || !mask[index + dy * width])) continue
      const cost = Math.hypot(dx, dy) * (preferential[index] && preferential[next] ? .7 : 1)
      const candidate = distance + cost
      if (candidate < distances[next]) {
        distances[next] = candidate
        push(next, candidate)
      }
    }
  }
  return distances
}
