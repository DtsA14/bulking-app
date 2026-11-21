import { describe, it, expect } from 'vitest'
import { getWeightTrend } from './weight.js'

const TODAY = '2026-11-21'
const log = (date, weight) => ({ date, weight })

// Window now: 2026-11-15 .. 2026-11-21 (0-6 days before today)
// Window prev: 2026-11-08 .. 2026-11-14 (7-13 days before today)
describe('getWeightTrend minimum logs per window', () => {
  it('keeps the delta per week when both windows have exactly 3 logs', () => {
    const logs = [
      log('2026-11-21', 71), log('2026-11-20', 71), log('2026-11-19', 71),
      log('2026-11-14', 68), log('2026-11-13', 68), log('2026-11-12', 68)
    ]
    const t = getWeightTrend(logs, TODAY)
    expect(t.avgNow).toBeCloseTo(71)
    expect(t.avgPrev).toBeCloseTo(68)
    expect(t.deltaPerWeek).toBeCloseTo(3)
  })

  it('has no delta per week with only 2 logs in the current window', () => {
    const logs = [
      log('2026-11-21', 71), log('2026-11-20', 72),
      log('2026-11-14', 68), log('2026-11-13', 68), log('2026-11-12', 68)
    ]
    const t = getWeightTrend(logs, TODAY)
    expect(t.avgNow).toBeCloseTo(71.5)
    expect(t.avgPrev).toBeCloseTo(68)
    expect(t.deltaPerWeek).toBeNull()
  })

  it('has no delta per week with only 2 logs in the previous window', () => {
    const logs = [
      log('2026-11-21', 71), log('2026-11-20', 71), log('2026-11-19', 71),
      log('2026-11-14', 68), log('2026-11-13', 69)
    ]
    const t = getWeightTrend(logs, TODAY)
    expect(t.avgNow).toBeCloseTo(71)
    expect(t.avgPrev).toBeCloseTo(68.5)
    expect(t.deltaPerWeek).toBeNull()
  })

  it('has no delta per week with a single log in each window', () => {
    const logs = [log('2026-11-21', 71), log('2026-11-14', 68)]
    const t = getWeightTrend(logs, TODAY)
    expect(t.avgNow).toBeCloseTo(71)
    expect(t.avgPrev).toBeCloseTo(68)
    expect(t.deltaPerWeek).toBeNull()
  })

  it('averages 2 logs in the current window instead of returning null', () => {
    const logs = [log('2026-11-21', 71), log('2026-11-20', 72)]
    const t = getWeightTrend(logs, TODAY)
    expect(t.avgNow).toBeCloseTo(71.5)
  })

  it('ignores a log dated after today when averaging the current window', () => {
    const logs = [
      log('2026-11-22', 90),
      log('2026-11-21', 71), log('2026-11-20', 71), log('2026-11-19', 71),
      log('2026-11-14', 68), log('2026-11-13', 68), log('2026-11-12', 68)
    ]
    const t = getWeightTrend(logs, TODAY)
    expect(t.avgNow).toBeCloseTo(71)
    expect(t.deltaPerWeek).toBeCloseTo(3)
  })
})
