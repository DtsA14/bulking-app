import { describe, it, expect, vi } from 'vitest'

// Angka dihitung tangan, bukan disalin dari output kode.
// Profil acuan: cowok, 70 kg (dari getCurrentWeight), 170 cm, 25 tahun, moderate.
//   BMR = 10*70 + 6.25*170 - 5*25 + 5 = 1642.5
//   Mifflin TDEE = 1642.5 * 1.55 = 2545.875 -> 2546, target 2546 + 300 = 2846
// Histori: 14 hari, tiap hari 0 kkal (jadwal kosong).
//   TDEE adaptif = 0 - (deltaPerWeek * 7700 / 7)

// Nilai yang dibaca mock getWeightTrend, biar tiap test bisa milih tren berat sendiri.
const state = { deltaPerWeek: null }

vi.mock('./schedule.js', () => ({
  lastNDates: () =>
    Array.from({ length: 14 }, (_, i) => `2025-01-${String(i + 1).padStart(2, '0')}`),
  last7Dates: () =>
    Array.from({ length: 7 }, (_, i) => `2025-01-${String(i + 1).padStart(2, '0')}`),
  dateKey: () => '2025-01-15',
  isDemoScheduleDate: () => false,
  loadDaySchedule: () => ({}),
  saveDaySchedule: () => {},
  seedDemoScheduleIfNeeded: () => false
}))

vi.mock('./storage.js', () => ({
  load: (key, fallback) => fallback,
  exists: () => false,
  save: () => {}
}))

vi.mock('./profile.js', () => ({
  DEFAULT_PROFILE: {},
  getProfile: () => ({
    tinggiBadan: 170,
    umur: 25,
    gender: 'L',
    aktivitas: 'moderate',
    baselineKkal: 0
  })
}))

vi.mock('./weight.js', () => ({
  getCurrentWeight: () => 70,
  getWeightTrend: () => ({ avgNow: 70, avgPrev: 70, deltaPerWeek: state.deltaPerWeek })
}))

async function loadEngine() {
  return import('./targetEngine.js')
}

// getCalorieTarget dihitung ulang dengan tren berat yang dipilih test ini.
async function targetFor(deltaPerWeek) {
  state.deltaPerWeek = deltaPerWeek
  const { getCalorieTarget } = await loadEngine()
  return getCalorieTarget()
}

// isAdaptiveStable belum ada di kode sekarang, jadi diambil lewat import dinamis:
// kalau belum diekspor, test gagal di expect(typeof ...) di bawah, bukan di import.
async function stabilityCheck() {
  const mod = await loadEngine()
  expect(typeof mod.isAdaptiveStable).toBe('function')
  return mod.isAdaptiveStable
}

describe('isAdaptiveStable', () => {
  it('rejects an adaptive TDEE 37.5% above Mifflin', async () => {
    const isAdaptiveStable = await stabilityCheck()
    // |3500 - 2546| / 2546 = 954 / 2546 = 0.3747
    expect(isAdaptiveStable(3500, 2546)).toBe(false)
  })

  it('accepts an adaptive TDEE 13.9% above Mifflin', async () => {
    const isAdaptiveStable = await stabilityCheck()
    // 354 / 2546 = 0.1390
    expect(isAdaptiveStable(2900, 2546)).toBe(true)
  })

  it('accepts an adaptive TDEE 24.98% above Mifflin', async () => {
    const isAdaptiveStable = await stabilityCheck()
    // 636 / 2546 = 0.24980, masih di bawah batas 0.25
    expect(isAdaptiveStable(3182, 2546)).toBe(true)
  })

  it('rejects an adaptive TDEE 25.02% above Mifflin', async () => {
    const isAdaptiveStable = await stabilityCheck()
    // 637 / 2546 = 0.250196, lewat batas 0.25
    expect(isAdaptiveStable(3183, 2546)).toBe(false)
  })

  it('accepts an adaptive TDEE 24.98% below Mifflin', async () => {
    const isAdaptiveStable = await stabilityCheck()
    // 636 / 2546 = 0.24980
    expect(isAdaptiveStable(1910, 2546)).toBe(true)
  })

  it('rejects an adaptive TDEE 25.02% below Mifflin', async () => {
    const isAdaptiveStable = await stabilityCheck()
    // 637 / 2546 = 0.250196
    expect(isAdaptiveStable(1909, 2546)).toBe(false)
  })

  it('rejects an adaptive TDEE 25.4% below Mifflin', async () => {
    const isAdaptiveStable = await stabilityCheck()
    // 646 / 2546 = 0.25373
    expect(isAdaptiveStable(1900, 2546)).toBe(false)
  })
})

describe('getCalorieTarget stability guard', () => {
  it('keeps the adaptive target when the adaptive TDEE is close to Mifflin', async () => {
    // 0 - (-2.5 * 7700 / 7) = 2750, target 2750 + 300 = 3050
    // selisih ke 2546 = 204 / 2546 = 8% -> stabil
    const result = await targetFor(-2.5)
    expect(result).toEqual({ mode: 'adaptive', tdee: 2750, target: 3050, daysTracked: 14 })
    expect('unstable' in result).toBe(false)
  })

  it('falls back to the baseline target when the adaptive TDEE is far from Mifflin', async () => {
    // 0 - (-3.5 * 7700 / 7) = 3850, target 4150
    // selisih ke 2546 = 1304 / 2546 = 51% -> tidak stabil, balik ke Mifflin
    const result = await targetFor(-3.5)
    expect(result).toEqual({
      mode: 'baseline',
      tdee: 2546,
      target: 2846,
      daysTracked: 14,
      unstable: true
    })
  })

  it('returns the baseline target without an unstable key when there is no weight trend', async () => {
    const result = await targetFor(null)
    expect(result).toEqual({ mode: 'baseline', tdee: 2546, target: 2846, daysTracked: 14 })
    expect('unstable' in result).toBe(false)
  })
})
