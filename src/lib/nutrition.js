import ingredientsData from '../data/ingredients.json'
import { load } from './storage.js'

const BY_ID = Object.fromEntries(ingredientsData.ingredients.map(item => [item.id, item]))

// Harga bisa di-override manual sama user lewat tab Profil (disimpen di localStorage,
// key 'price-overrides'). Ini satu-satunya tempat yang resolve harga final -
// baik calcTotals maupun Belanja harus lewat sini, bukan baca item.harga_per_100 langsung.
export function getIngredientPrice(id) {
  const overrides = load('price-overrides', {})
  if (overrides[id] !== undefined) return overrides[id]
  const item = BY_ID[id]
  return item ? item.harga_per_100 || 0 : 0
}

// Satu fungsi ini yang dipake bareng-bareng sama tab Resep (Gizi) dan tab Belanja
// (estimasi harga) - biar gak ada 2 logic kalkulasi yang bisa ketinggalan sinkron.
// ingredients: array of {ingredientId, gram}
export function calcTotals(ingredients) {
  const totals = { kkal: 0, protein: 0, karbo: 0, lemak: 0, serat: 0, harga: 0, mikro: {} }

  ingredients.forEach(ing => {
    const item = BY_ID[ing.ingredientId]
    if (!item) return // bahan gak dikenal, skip diam-diam daripada crash

    const per100 = item.per_100g || item.per_100ml || {}
    const factor = ing.gram / 100

    totals.kkal += (per100.kkal || 0) * factor
    totals.protein += (per100.protein_g || 0) * factor
    totals.karbo += (per100.karbo_g || 0) * factor
    totals.lemak += (per100.lemak_g || 0) * factor
    totals.serat += (per100.serat_g || 0) * factor
    totals.harga += getIngredientPrice(ing.ingredientId) * factor

    // Mikro beda-beda field per bahan (gak semua punya data yang sama), jadi
    // di-agregasi generik lewat Object.entries - bukan di-hardcode kayak makro,
    // biar bahan baru otomatis ke-hitung mikronya tanpa ubah kode ini.
    if (item.mikro) {
      Object.entries(item.mikro).forEach(([key, val]) => {
        totals.mikro[key] = (totals.mikro[key] || 0) + val * factor
      })
    }
  })

  return totals // dibiarin mentah (belum dibulatin) - pembagian per porsi & pembulatan
                // final dilakuin di getRecipeTotals(), bukan di sini
}

export function findIngredient(id) {
  return BY_ID[id]
}

// Label & satuan buat tiap key mikro di ingredients.json - dipake buat nampilin
// mikro ke user (key mentahnya kayak "vitamin_b12_mcg", gak human-friendly).
// `akg` = referensi Angka Kecukupan Gizi (Permenkes No.28/2019) buat dewasa
// laki-laki 19-29 tahun - satu-satunya acuan yang dipake karena Profil belum
// punya field umur/gender. Dipake buat ngitung %AKG, BUKAN target medis presisi.
export const MIKRO_LABELS = {
  zat_besi_mg: { label: 'Zat besi', unit: 'mg', akg: 9 },
  vitamin_b6_mg: { label: 'Vitamin B6', unit: 'mg', akg: 1.3 },
  zinc_mg: { label: 'Zinc', unit: 'mg', akg: 11 },
  vitamin_b12_mcg: { label: 'Vitamin B12', unit: 'mcg', akg: 4.0 },
  kolin_mg: { label: 'Kolin', unit: 'mg', akg: 550 },
  vitamin_d_mcg: { label: 'Vitamin D', unit: 'mcg', akg: 15 },
  kalsium_mg: { label: 'Kalsium', unit: 'mg', akg: 1000 },
  kalium_mg: { label: 'Kalium', unit: 'mg', akg: 4700 },
  vitamin_c_mg: { label: 'Vitamin C', unit: 'mg', akg: 90 },
  magnesium_mg: { label: 'Magnesium', unit: 'mg', akg: 360 },
  vitamin_a_mcg: { label: 'Vitamin A', unit: 'mcg', akg: 650 },
  folat_mcg: { label: 'Folat', unit: 'mcg', akg: 400 },
  vitamin_k_mcg: { label: 'Vitamin K', unit: 'mcg', akg: 65 },
  vitamin_e_mg: { label: 'Vitamin E', unit: 'mg', akg: 15 },
  // Natrium sengaja GAK dikasih `akg` - masalah kesehatan publiknya itu
  // KELEBIHAN, bukan kekurangan, jadi framing "%AKG tercapai" salah arah buat
  // nutrien ini (lebih tinggi ≠ lebih baik). Ditampilin apa adanya aja.
  natrium_mg: { label: 'Natrium', unit: 'mg' },
  // Tembaga: AKG resmi belum diverifikasi dari sumber terpercaya, mending
  // gak nampilin %AKG yang bisa jadi salah daripada nebak angkanya.
  tembaga_mg: { label: 'Tembaga', unit: 'mg' }
}

// 6 mikro yang ditampilin default (gak collapse) di Hari Ini - hasil riset:
// zat besi/zinc/kalsium/kalium overlap kuat di kriteria umum (WHO/DGA, paling
// sering defisiensi) MAUPUN atlet; vitamin D & magnesium ditambahin spesifik
// buat konteks bulking (testosteron, recovery otot). Sisanya (B6, B12, kolin,
// vitamin C/A/K/E, folat) tetep dihitung & ada datanya, cuma disembunyiin di
// balik toggle "lihat semua" biar gak numpuk di layar tiap hari.
export const ESSENTIAL_MIKRO_KEYS = [
  'zat_besi_mg',
  'zinc_mg',
  'kalsium_mg',
  'kalium_mg',
  'vitamin_d_mcg',
  'magnesium_mg'
]

export function mikroLabel(key) {
  return MIKRO_LABELS[key]?.label || key
}

export function mikroUnit(key) {
  return MIKRO_LABELS[key]?.unit || ''
}

// null kalau belum ada acuan AKG buat key ini - jangan ditampilin sebagai 0%
// yang bisa disalahartikan "kurang total", padahal cuma gak ada datanya.
export function mikroPercentAkg(key, value) {
  const akg = MIKRO_LABELS[key]?.akg
  return akg ? Math.round((value / akg) * 100) : null
}

// Selisih absolut dari AKG (bukan cuma persen) - biar user langsung liat
// "kurang berapa gram/mg" tanpa perlu ngitung sendiri dari %.
export function mikroDeltaFromAkg(key, value) {
  const akg = MIKRO_LABELS[key]?.akg
  return akg ? Math.round((value - akg) * 10) / 10 : null
}
