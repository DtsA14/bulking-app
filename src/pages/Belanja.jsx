import { SLOTS, findRecipe, findBooster } from '../data/recipes.js'
import { findIngredient, getIngredientPrice } from '../lib/nutrition.js'
import { last7Dates, loadDaySchedule, seedDemoScheduleIfNeeded } from '../lib/schedule.js'

// Jadwal contoh 3 hari kebelakang, dipake sekali doang buat ngisi Belanja pas fresh
// install (lihat seedDemoScheduleIfNeeded). Recipe id nya harus match yang ada di
// data/recipes.js.
const DEMO_PICKS = [
  { sarapan: 'sarapan-telur-kentang', snack1: 'snack-yogurt', siang: 'makan-beef', snack2: 'snack-roti-selai', malam: 'makan-ayam' },
  { sarapan: 'sarapan-telur-roti', snack1: 'snack-smoothie-normal', siang: 'makan-ayam', snack2: 'snack-yogurt', malam: 'makan-beef' },
  { sarapan: 'sarapan-telur-kentang', snack1: 'snack-roti-selai', siang: 'makan-beef', snack2: 'snack-smoothie-emergency', malam: 'makan-ayam' }
]

const isDemoSeed = seedDemoScheduleIfNeeded(SLOTS, DEMO_PICKS)

// Alurnya: hitung berapa kali tiap resep KEPILIH lintas 7 hari terakhir -> itu
// jadi jumlah porsi yang dibutuhin -> dibulatin ke atas per batch resep
// (recipe.porsi) -> baru dikaliin ke ingredient batch buat dapet total bahan mentah
// yang perlu dibeli. Harga dihitung dari total gram itu, bukan per resep terpisah,
// biar bahan yang sama dari resep berbeda kegabung jadi satu baris belanja.
// Booster ditambahin langsung per gram (bukan per batch, porsinya selalu 1x pakai),
// biar bahan yang dipake lewat booster (susu, telur, dll) ikut kehitung juga -
// soalnya booster juga ikut kehitung di total gizi Hari Ini.
function aggregateWeek() {
  const usageCount = {} // recipeId -> berapa kali kepilih minggu ini
  const ingredientGrams = {} // ingredientId -> total gram yang perlu dibeli

  last7Dates().forEach(date => {
    const daySchedule = loadDaySchedule(date, null)
    if (!daySchedule) return
    SLOTS.forEach(slot => {
      const entry = daySchedule[slot.id]
      if (!entry) return
      if (entry.recipeId) usageCount[entry.recipeId] = (usageCount[entry.recipeId] || 0) + 1
      entry.boosters?.forEach(b => {
        const booster = findBooster(b.boosterId)
        if (!booster) return
        booster.ingredients.forEach(ing => {
          ingredientGrams[ing.ingredientId] = (ingredientGrams[ing.ingredientId] || 0) + ing.gram
        })
      })
    })
  })

  Object.entries(usageCount).forEach(([recipeId, count]) => {
    const recipe = findRecipe(recipeId)
    if (!recipe) return
    const batches = Math.ceil(count / (recipe.porsi || 1))
    recipe.ingredients.forEach(ing => {
      ingredientGrams[ing.ingredientId] = (ingredientGrams[ing.ingredientId] || 0) + ing.gram * batches
    })
  })

  let totalHarga = 0
  const rows = Object.entries(ingredientGrams).map(([id, gram]) => {
    const item = findIngredient(id)
    const harga = getIngredientPrice(id) * (gram / 100)
    totalHarga += harga
    return { id, nama: item ? item.nama : id, gram: Math.round(gram), harga: Math.round(harga) }
  })

  return { rows, totalHarga: Math.round(totalHarga) }
}

export default function Belanja() {
  const { rows, totalHarga } = aggregateWeek()

  return (
    <div className="page">
      <p className="intro">Agregat dari jadwal 7 hari terakhir yang udah lu isi di tab Hari Ini.</p>

      {rows.length === 0 ? (
        <p className="empty-note">
          Belum ada histori jadwal minggu ini. Isi menu di tab Hari Ini dulu — begitu ada beberapa
          hari kepilih, Belanja bakal otomatis agregat bahan & estimasi harganya di sini.
        </p>
      ) : (
        <>
          {isDemoSeed && (
            <p className="empty-note" style={{ marginBottom: 10 }}>
              Ini termasuk contoh jadwal 3 hari (demo) biar gak kosong pas pertama buka. Bakal ilang
              otomatis dari agregat begitu minggu berjalan & tergantikan histori asli.
            </p>
          )}
          <div className="summary-bar">
            <div className="summary-item">
              <div className="summary-val">Rp{totalHarga.toLocaleString('id-ID')}</div>
              <div className="summary-lbl">estimasi total belanja minggu ini</div>
            </div>
          </div>

          <div className="cat-heading">Bahan yang perlu dibeli</div>
          {rows.map(r => (
            <div className="log-row" key={r.id}>
              <span>{r.nama}</span>
              <span>{r.gram} g · Rp{r.harga.toLocaleString('id-ID')}</span>
            </div>
          ))}

          <p className="empty-note" style={{ marginTop: 16 }}>
            Estimasi harga dari database bahan (bisa diedit manual). Jumlah bahan dibulatin ke atas
            per batch resep, jadi ada kemungkinan sedikit lebih dari yang benar-benar kepake.
          </p>
        </>
      )}
    </div>
  )
}
