import { describe, it, expect } from 'vitest'
import { getWeightTrend } from './weight.js'

const TODAY = '2026-11-21'
const log = (date, weight) => ({ date, weight })

describe('getWeightTrend', () => {
  it('is the difference of the two 7-day averages', () => {
    const logs = [
      log('2026-11-21', 71), log('2026-11-20', 72), log('2026-11-18', 70), // last 7 days: avg 71
      log('2026-11-14', 69), log('2026-11-12', 68), log('2026-11-09', 67)  // 7-13 days ago: avg 68
    ]
    const t = getWeightTrend(logs, TODAY)
    expect(t.avgNow).toBeCloseTo(71)
    expect(t.avgPrev).toBeCloseTo(68)
    expect(t.deltaPerWeek).toBeCloseTo(3)
  })

  it('has no trend without logs in the previous week', () => {
    const logs = [log('2026-11-21', 71), log('2026-11-20', 72), log('2026-11-19', 70)]
    const t = getWeightTrend(logs, TODAY)
    expect(t.avgNow).toBeCloseTo(71)
    expect(t.avgPrev).toBeNull()
    expect(t.deltaPerWeek).toBeNull()
  })

  it('ignores logs dated after today and older than 14 days', () => {
    const logs = [
      log('2026-11-22', 90), log('2026-11-01', 50),
      log('2026-11-21', 71), log('2026-11-20', 71), log('2026-11-19', 71),
      log('2026-11-14', 70), log('2026-11-13', 70), log('2026-11-12', 70)
    ]
    const t = getWeightTrend(logs, TODAY)
    expect(t.avgNow).toBeCloseTo(71)
    expect(t.avgPrev).toBeCloseTo(70)
    expect(t.deltaPerWeek).toBeCloseTo(1)
  })
})
