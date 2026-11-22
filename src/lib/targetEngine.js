import { SLOTS, BOOSTERS, findRecipe, findBooster, getRecipeTotals, getBoosterTotals } from '../data/recipes.js'
import { lastNDates, loadDaySchedule, isDemoScheduleDate, dateKey } from './schedule.js'
import { load } from './storage.js'
import { getProfile } from './profile.js'
import { getWeightTrend, getCurrentWeight } from './weight.js'

const HISTORY_DAYS = 14
const MIN_TRACKED_DAYS = 10
const KKAL_PER_KG = 7700
const SURPLUS_KKAL = 300
// Batas toleransi selisih TDEE adaptif vs Mifflin. Kalau lebih dari 25%,
// data historinya dianggap belum stabil (noise, hari kosong, tren berat
// kebaca aneh) - mending balik ke estimasi baseline daripada target ngawur.
const MAX_ADAPTIVE_DEVIATION = 0.25
const PROTEIN_G_PER_KG = 2.0 // lean bulk: 1.6-2.2 g/kg, pake titik atas biar aman
const FAT_G_PER_KG = 1.0 // lean bulk: 0.8-1.2 g/kg buat kesehatan hormonal

// 3 tingkat aktivitas (simplifikasi dari 5-tingkat akademis) - cukup buat
// estimasi cold-start, gak perlu presisi berlebihan buat angka yang bakal
// ke-replace otomatis begitu ada histori.
export const ACTIVITY_LEVELS = {
  sedentary: { label: 'Jarang olahraga', multiplier: 1.2 },
  moderate: { label: 'Olahraga teratur (3-5x/minggu)', multiplier: 1.55 },
  aktif: { label: 'Olahraga intens/tiap hari', multiplier: 1.725 }
}

// BMR (Mifflin-St Jeor) -> TDEE -> + surplus, dipake SEKALI di cold-start
// (belum ada histori kalori+berat yang cukup). Butuh umur & gender karena
// beda dari adaptive TDEE (yang gak butuh itu, tapi baru bisa jalan abis
// ada data 2 minggu). Ini cuma estimasi awal, ilang perannya begitu adaptive
// TDEE ambil alih.
export function calcMifflinTarget(profile) {
  const { tinggiBadan, umur, gender } = profile
  const beratSekarang = getCurrentWeight(profile)
  const bmr = 10 * beratSekarang + 6.25 * tinggiBadan - 5 * umur + (gender === 'P' ? -161 : 5)
  const multiplier = ACTIVITY_LEVELS[profile.aktivitas]?.multiplier || ACTIVITY_LEVELS.moderate.multiplier
  const tdee = Math.round(bmr * multiplier)
  return { tdee, target: tdee + SURPLUS_KKAL }
}

// Cek apakah TDEE adaptif masih "masuk akal" dibanding estimasi populasi
// (Mifflin). Selisih relatif <= 25% dianggap stabil; batasnya inklusif.
// Pure function - gak baca storage, gampang dites.
export function isAdaptiveStable(adaptiveTdee, mifflinTdee) {
  return Math.abs(adaptiveTdee - mifflinTdee) / mifflinTdee <= MAX_ADAPTIVE_DEVIATION
}

function dayKkal(daySchedule) {
  if (!daySchedule) return null
  let kkal = 0
  SLOTS.forEach(slot => {
    const entry = daySchedule[slot.id]
    if (!entry) return
    const recipe = findRecipe(entry.recipeId)
    if (recipe) kkal += getRecipeTotals(recipe).kkal
    entry.boosters?.forEach(b => {
      const booster = findBooster(b.boosterId)
      if (booster) kkal += getBoosterTotals(booster).kkal
    })
  })
  return kkal
}

// Target kalori harian, 3 mode:
// - 'manual': user isi field "Baseline kalori harian" sendiri (override paksa,
//   dipake apa adanya, gak dihitung ulang)
// - 'baseline': cold start TANPA override - dihitung dari BMR Mifflin-St Jeor
//   (butuh umur/gender/tinggi/berat/aktivitas dari Profil) + surplus
// - 'adaptive': begitu ada minimal ~10 dari 14 hari terakhir kepake + tren
//   berat kebaca (minimal 2 minggu, sama kayak syarat di Progress.jsx), switch
//   otomatis ke TDEE adaptif dari histori beneran - lebih akurat dari formula
//   manapun karena berbasis data asli, bukan estimasi populasi.
//   TDEE = rata-rata kalori masuk - (perubahan berat mingguan_kg * 7700 / 7),
//   target = TDEE + surplus lean bulk standar (+300 kkal/hari).
export function getCalorieTarget() {
  const profile = getProfile()
  const today = dateKey()

  const dailyKkals = lastNDates(HISTORY_DAYS)
    .filter(date => date !== today && !isDemoScheduleDate(date))
    .map(date => dayKkal(loadDaySchedule(date, null)))
    .filter(k => k !== null)

  const weightLogs = load('weight-logs', []) // bukan DEMO_LOGS - data demo gak boleh masuk kalkulasi asli
  const { deltaPerWeek } = getWeightTrend(weightLogs, today)

  const hasEnoughData = dailyKkals.length >= MIN_TRACKED_DAYS && deltaPerWeek !== null
  if (!hasEnoughData) {
    if (profile.baselineKkal > 0) {
      return { mode: 'manual', tdee: null, target: profile.baselineKkal, daysTracked: dailyKkals.length }
    }
    const { tdee, target } = calcMifflinTarget(profile)
    return { mode: 'baseline', tdee, target, daysTracked: dailyKkals.length }
  }

  const avgIntake = dailyKkals.reduce((a, b) => a + b, 0) / dailyKkals.length
  const tdee = Math.round(avgIntake - (deltaPerWeek * KKAL_PER_KG) / 7)

  // Guard: kalau TDEE adaptif kejauhan dari estimasi Mifflin, data historinya
  // belum bisa dipercaya - balik ke baseline, tapi tandai unstable biar UI
  // (kalau mau) bisa kasih tau user kenapa.
  const mifflin = calcMifflinTarget(profile)
  if (!isAdaptiveStable(tdee, mifflin.tdee)) {
    return {
      mode: 'baseline',
      tdee: mifflin.tdee,
      target: mifflin.target,
      daysTracked: dailyKkals.length,
      unstable: true
    }
  }

  return { mode: 'adaptive', tdee, target: tdee + SURPLUS_KKAL, daysTracked: dailyKkals.length }
}

// Target protein & fat dihitung dari BERAT BADAN (g/kg), bukan persentase dari
// kalori - soalnya kebutuhan protein/fat itu nempel ke massa tubuh, bukan ke
// total kalori (beda sama app tracking makanan kebanyakan yang pake % tetap).
// Karbo ngisi SISA kalori setelah protein & fat dialokasikan, biar tetep nyambung
// ke target kalori yang udah dihitung getCalorieTarget().
export function getMacroTargets(targetKkal, beratKg) {
  const protein = Math.round(beratKg * PROTEIN_G_PER_KG)
  const fat = Math.round(beratKg * FAT_G_PER_KG)
  const karbo = Math.max(0, Math.round((targetKkal - protein * 4 - fat * 9) / 4))
  return { protein, fat, karbo }
}

// Saranin 1 booster yang paling ngedeketin sisa target tanpa ngelewatin -
// kalau semua kebesaran, tetep saranin yang paling kecil (mending sedikit
// kelewat daripada gak disaranin apa-apa).
export function recommendBooster(remainingKkal) {
  if (remainingKkal <= 0) return null

  const candidates = BOOSTERS.map(b => ({ booster: b, kkal: getBoosterTotals(b).kkal }))
  const fitting = candidates.filter(c => c.kkal <= remainingKkal)
  const pick = fitting.length
    ? fitting.reduce((best, c) => (c.kkal > best.kkal ? c : best))
    : candidates.reduce((smallest, c) => (c.kkal < smallest.kkal ? c : smallest))
  return pick.booster
}
