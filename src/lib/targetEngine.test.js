import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calcMifflinTarget, getMacroTargets, recommendBooster } from './targetEngine.js'

// Angka dihitung tangan, bukan disalin dari output kode.
// Profil acuan: cowok, 70 kg, 170 cm, 25 tahun.
//   BMR = 10*70 + 6.25*170 - 5*25 + 5 = 1642.5
const profile = (over = {}) => ({ tinggiBadan: 170, umur: 25, gender: 'L', aktivitas: 'moderate', beratSekarang: 70, ...over })

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('calcMifflinTarget', () => {
  it('olahraga teratur: 1642.5 * 1.55 = 2545.875 -> 2546, target +300', () => {
    expect(calcMifflinTarget(profile())).toEqual({ tdee: 2546, target: 2846 })
  })
  it('jarang olahraga: 1642.5 * 1.2 = 1971', () => {
    expect(calcMifflinTarget(profile({ aktivitas: 'sedentary' }))).toEqual({ tdee: 1971, target: 2271 })
  })
  it('olahraga intens: 1642.5 * 1.725 = 2833.3125 -> 2833', () => {
    expect(calcMifflinTarget(profile({ aktivitas: 'aktif' }))).toEqual({ tdee: 2833, target: 3133 })
  })
  it('cewek: BMR 1476.5, * 1.55 = 2288.575 -> 2289', () => {
    expect(calcMifflinTarget(profile({ gender: 'P' }))).toEqual({ tdee: 2289, target: 2589 })
  })
  it('aktivitas yang tidak dikenal dihitung sebagai teratur', () => {
    expect(calcMifflinTarget(profile({ aktivitas: 'xyz' }))).toEqual({ tdee: 2546, target: 2846 })
  })
})

describe('getMacroTargets', () => {
  it('protein 2 g/kg, lemak 1 g/kg, karbo isi sisa kalori', () => {
    // karbo = (2846 - 140*4 - 70*9) / 4 = 1656 / 4 = 414
    expect(getMacroTargets(2846, 70)).toEqual({ protein: 140, fat: 70, karbo: 414 })
  })
  it('karbo tidak pernah negatif', () => {
    expect(getMacroTargets(1000, 70)).toEqual({ protein: 140, fat: 70, karbo: 0 })
  })
  it('membulatkan: 61.3 kg -> protein 123, lemak 61, karbo (2000 - 492 - 549) / 4 = 239.75 -> 240', () => {
    expect(getMacroTargets(2000, 61.3)).toEqual({ protein: 123, fat: 61, karbo: 240 })
  })
})

// Kalori booster (dari ingredients.json): b-pb 94, b-egg 85, b-oil 123, b-banana 127, b-rice 130, b-milk 153.
describe('recommendBooster', () => {
  it('tidak ada sisa kalori: tidak menyarankan apa pun', () => {
    expect(recommendBooster(0)).toBeNull()
    expect(recommendBooster(-5)).toBeNull()
  })
  it('memilih yang terbesar yang masih muat', () => {
    expect(recommendBooster(100).id).toBe('b-pb')
  })
  it('kalau tidak ada yang muat, menyarankan yang terkecil', () => {
    expect(recommendBooster(84).id).toBe('b-egg')
  })
  it('yang pas sama dengan sisa dianggap muat', () => {
    expect(recommendBooster(130).id).toBe('b-rice')
  })
  it('sisa besar: yang terbesar dari semuanya', () => {
    expect(recommendBooster(200).id).toBe('b-milk')
  })
})
