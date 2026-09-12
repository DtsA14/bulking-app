import { useState } from 'react'
import { SLOTS, findRecipe, findBooster } from '../data/recipes.js'
import {
  findIngredient, getIngredientPrice, getAllIngredients, isIngredientActive, setIngredientActive
} from '../lib/nutrition.js'
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

  const rows = Object.entries(ingredientGrams).map(([id, gram]) => {
    const item = findIngredient(id)
    const harga = getIngredientPrice(id) * (gram / 100)
    return {
      id,
      nama: item ? item.nama : id,
      gram: Math.round(gram),
      harga: Math.round(harga),
      active: item ? isIngredientActive(item) : true
    }
  })

  return { rows }
}

// Belanja itu 2 hal yang disambungin, bukan 1: "Perlu dibeli" = bahan dari
// jadwal 7 hari yang statusnya ARSIP di Inventory (belum dipunya) - itu
// shopping list beneran, cross-check jadwal vs status kepemilikan, bukan
// nampilin semua bahan kepake tanpa peduli udah punya atau belum. "Inventory"
// = list bahan aktif (yang dipunya), independen dari jadwal - bisa ditambah
// manual (baru beli sesuatu di luar jadwal) atau ditandain habis kapan aja.
export default function Belanja() {
  const [, forceRefresh] = useState(0)
  const [addIngredientId, setAddIngredientId] = useState('')
  const [tab, setTab] = useState('perlu') // 'perlu' | 'inventory'

  const { rows } = aggregateWeek()
  const neededRows = rows.filter(r => !r.active)
  const totalHarga = neededRows.reduce((sum, r) => sum + r.harga, 0)

  const allIngredients = getAllIngredients()
  const inventory = allIngredients.filter(isIngredientActive).sort((a, b) => a.nama.localeCompare(b.nama))
  const toAddOptions = allIngredients.filter(i => !isIngredientActive(i)).sort((a, b) => a.nama.localeCompare(b.nama))

  function markOwned(id) {
    setIngredientActive(id, true)
    forceRefresh(n => n + 1)
  }

  function markOut(id) {
    setIngredientActive(id, false)
    forceRefresh(n => n + 1)
  }

  function handleAdd() {
    if (!addIngredientId) return
    markOwned(addIngredientId)
    setAddIngredientId('')
  }

  return (
    <div className="page">
      <p className="intro">
        {tab === 'perlu'
          ? 'Bahan yang dipake di jadwal 7 hari terakhir tapi belum ada di Inventory.'
          : 'Bahan yang lu tandain "punya" - lepas dari jadwal, bisa ditambah/dihapus kapan aja.'}
      </p>

      {isDemoSeed && (
        <p className="empty-note" style={{ marginBottom: 10 }}>
          Ini termasuk contoh jadwal 3 hari (demo) biar gak kosong pas pertama buka. Bakal ilang
          otomatis dari agregat begitu minggu berjalan & tergantikan histori asli.
        </p>
      )}

      <div className="tabbar">
        <button className={tab === 'perlu' ? 'rtab active' : 'rtab'} onClick={() => setTab('perlu')}>
          Perlu dibeli{neededRows.length > 0 ? ` (${neededRows.length})` : ''}
        </button>
        <button className={tab === 'inventory' ? 'rtab active' : 'rtab'} onClick={() => setTab('inventory')}>
          Inventory ({inventory.length})
        </button>
      </div>

      {tab === 'perlu' ? (
        neededRows.length === 0 ? (
          <p className="empty-note" style={{ marginTop: 4 }}>
            {rows.length === 0
              ? 'Belum ada histori jadwal minggu ini. Isi menu di tab Hari Ini dulu.'
              : 'Semua bahan yang kepake minggu ini udah ada di Inventory - gak ada yang perlu dibeli.'}
          </p>
        ) : (
          <>
            <div className="summary-bar" style={{ marginTop: 8 }}>
              <div className="summary-item">
                <div className="summary-val">Rp{totalHarga.toLocaleString('id-ID')}</div>
                <div className="summary-lbl">estimasi belanja</div>
              </div>
            </div>
            {neededRows.map(r => (
              <div className="log-row" key={r.id}>
                <span>{r.nama}</span>
                <span className="recipe-row-right">
                  <span>{r.gram} g · Rp{r.harga.toLocaleString('id-ID')}</span>
                  <button className="btn-secondary" onClick={() => markOwned(r.id)}>Udah beli</button>
                </span>
              </div>
            ))}
            <p className="empty-note" style={{ marginTop: 12 }}>
              Estimasi harga dari database bahan (bisa diedit manual). Jumlah bahan dibulatin ke atas
              per batch resep, jadi ada kemungkinan sedikit lebih dari yang benar-benar kepake.
            </p>
          </>
        )
      ) : (
        <>
          {toAddOptions.length > 0 && (
            <div className="ingredient-row-inputs" style={{ marginBottom: 12, marginTop: 4 }}>
              <select value={addIngredientId} onChange={e => setAddIngredientId(e.target.value)} style={{ flex: 1 }}>
                <option value="">Cari bahan buat ditambah...</option>
                {toAddOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.nama}</option>)}
              </select>
              <button className="btn-primary" onClick={handleAdd}>+ Tambah</button>
            </div>
          )}
          {inventory.length === 0 ? (
            <p className="empty-note">Belum ada bahan di Inventory.</p>
          ) : (
            inventory.map(item => (
              <div className="log-row" key={item.id}>
                <span>{item.nama}</span>
                <button className="btn-secondary" onClick={() => markOut(item.id)}>Habis</button>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
