import { SLOTS, BOOSTERS, findRecipe, findBooster, getRecipeTotals, getBoosterTotals } from '../data/recipes.js'
import { lastNDates, loadDaySchedule, isDemoScheduleDate, dateKey } from './schedule.js'
import { load } from './storage.js'
import { getProfile } from './profile.js'
import { getWeightTrend } from './weight.js'

const HISTORY_DAYS = 14
const MIN_TRACKED_DAYS = 10
const KKAL_PER_KG = 7700
const SURPLUS_KKAL = 300
const PROTEIN_G_PER_KG = 2.0 // lean bulk: 1.6-2.2 g/kg, pake titik atas biar aman
const FAT_G_PER_KG = 1.0 // lean bulk: 0.8-1.2 g/kg buat kesehatan hormonal

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

// Target kalori harian: default-nya baselineKkal manual dari Profil (cold start,
// belum ada histori). Begitu ada minimal ~10 dari 14 hari terakhir kepake +
// tren berat kebaca (minimal 2 minggu, sama kayak syarat di Progress.jsx),
// switch otomatis ke TDEE adaptif dari histori beneran - lebih akurat daripada
// formula BMR dan gak butuh input baru (umur/gender/activity level) di Profil.
// TDEE = rata-rata kalori masuk - (perubahan berat mingguan_kg * 7700 / 7),
// target = TDEE + surplus lean bulk standar (+300 kkal/hari).
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
    return { mode: 'baseline', tdee: null, target: profile.baselineKkal, daysTracked: dailyKkals.length }
  }

  const avgIntake = dailyKkals.reduce((a, b) => a + b, 0) / dailyKkals.length
  const tdee = Math.round(avgIntake - (deltaPerWeek * KKAL_PER_KG) / 7)
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
