import { load, save, exists } from './storage.js'

// Jadwal disimpen PER TANGGAL (bukan satu snapshot "hari ini" doang), biar
// Belanja bisa agregat lintas hari. Format key: "schedule:2026-09-09".
// PENTING: pake komponen tanggal LOKAL, bukan toISOString() yang UTC -
// soalnya toISOString() bakal geser ke tanggal kemarin pas jam 00.00-06.59 WIB.
export function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function loadDaySchedule(date, fallback) {
  return load('schedule:' + date, fallback)
}

export function saveDaySchedule(date, schedule) {
  save('schedule:' + date, schedule)
}

// n tanggal terakhir termasuk hari ini, urutan terbaru dulu
export function lastNDates(n) {
  const dates = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(dateKey(d))
  }
  return dates
}

// 7 tanggal terakhir termasuk hari ini, urutan terbaru dulu
export function last7Dates() {
  return lastNDates(7)
}

// Isi 3 hari kemarin dengan jadwal contoh, sekali doang (dikunci lewat flag
// 'demo-seed-done'), biar tab Belanja gak kosong melompong pas fresh install -
// alih-alih nunggu user isi beberapa hari beneran dulu. Gak pernah nimpa
// tanggal yang udah ada datanya (asli maupun demo sebelumnya). Karena tanggalnya
// relatif ke "kemarin" terus geser tiap hari, dalam ~seminggu data contoh ini
// otomatis kegeser keluar dari jendela last7Dates() tanpa perlu dibersihin manual.
export function seedDemoScheduleIfNeeded(slots, demoPicks) {
  if (exists('demo-seed-done')) return false
  save('demo-seed-done', true)

  const seededDates = []
  demoPicks.forEach((picks, idx) => {
    const d = new Date()
    d.setDate(d.getDate() - (idx + 1))
    const date = dateKey(d)
    if (exists('schedule:' + date)) return

    const schedule = {}
    slots.forEach(slot => {
      schedule[slot.id] = { recipeId: picks[slot.id], boosters: [] }
    })
    saveDaySchedule(date, schedule)
    seededDates.push(date)
  })
  save('demo-schedule-dates', seededDates)
  return true
}

// Dipake sama lib/targetEngine.js buat nyaring hari demo dari histori kalori -
// jadwal palsu itu gak boleh ikut ngitung TDEE adaptif, soalnya bukan konsumsi asli.
export function isDemoScheduleDate(date) {
  return load('demo-schedule-dates', []).includes(date)
}
