import ingredientsData from '../data/ingredients.json'
import { load, save } from './storage.js'

const BUNDLED_BY_ID = Object.fromEntries(ingredientsData.ingredients.map(item => [item.id, item]))

// Bahan bisa ditambah/diedit manual lewat Profil (tab "Database Bahan").
// 2 storage terpisah: `ingredient-overrides` buat bahan BUNDLED yang diedit
// (cuma nyimpen field yang beda dari default, biar bisa di-reset), dan
// `custom-ingredients` buat bahan BARU yang user tambahin sendiri (objek
// lengkap, gak ada "default" buat di-reset ke). Index gak di-cache di module
// level (beda dari getRecipeTotals/getBoosterTotals) karena harus selalu
// baca localStorage terbaru - datanya bisa berubah kapan aja lewat UI edit.
function getIngredientOverrides() {
  return load('ingredient-overrides', {})
}

function getCustomIngredients() {
  return load('custom-ingredients', [])
}

function buildIngredientIndex() {
  const index = { ...BUNDLED_BY_ID }
  const overrides = getIngredientOverrides()
  Object.entries(overrides).forEach(([id, patch]) => {
    if (index[id]) index[id] = { ...index[id], ...patch }
  })
  getCustomIngredients().forEach(ing => {
    index[ing.id] = ing
  })
  return index
}

// Dipake UI "Database Bahan" buat nampilin semua bahan (bundled + custom),
// diurut alfabet. `isBundled` nentuin apakah bahan ini bisa di-reset ke
// default (true) atau cuma bisa dihapus (false, bahan custom).
export function getAllIngredients() {
  const index = buildIngredientIndex()
  return Object.values(index)
    .map(item => ({ ...item, isBundled: !!BUNDLED_BY_ID[item.id] }))
    .sort((a, b) => a.nama.localeCompare(b.nama))
}

function slugify(nama) {
  return nama
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// Bikin id unik dari nama - dipake pas nambah bahan baru. Kalau slug dasarnya
// udah kepake (bundled ATAU custom), tambahin angka di belakang (-2, -3, dst).
export function generateIngredientId(nama) {
  const base = slugify(nama) || 'bahan'
  const index = buildIngredientIndex()
  if (!index[base]) return base
  let n = 2
  while (index[`${base}-${n}`]) n++
  return `${base}-${n}`
}

// Simpen bahan baru ATAU edit bahan existing. Bahan BUNDLED disimpen sebagai
// override (parsial, gampang di-reset); bahan custom disimpen penuh. `active`
// SENGAJA cuma ditulis kalau eksplisit dikirim (bukan undefined) - kalau
// enggak, dipertahankan dari state sebelumnya. Tanpa ini, tiap kali user edit
// gizi/harga bahan yang lagi diarsipin (lewat form biasa, bukan tombol
// arsip), status arsipnya bakal ke-reset balik jadi aktif tanpa sengaja.
export function saveIngredient(ingredient) {
  if (BUNDLED_BY_ID[ingredient.id]) {
    const overrides = getIngredientOverrides()
    const prevActive = overrides[ingredient.id]?.active
    overrides[ingredient.id] = {
      nama: ingredient.nama,
      kategori: ingredient.kategori,
      per_100g: ingredient.per_100g,
      per_100ml: ingredient.per_100ml,
      per_serving: ingredient.per_serving,
      mikro: ingredient.mikro,
      harga_per_100: ingredient.harga_per_100,
      active: ingredient.active !== undefined ? ingredient.active : prevActive
    }
    save('ingredient-overrides', overrides)
  } else {
    const customs = getCustomIngredients()
    const idx = customs.findIndex(i => i.id === ingredient.id)
    const prevActive = idx >= 0 ? customs[idx].active : undefined
    const toSave = { ...ingredient, active: ingredient.active !== undefined ? ingredient.active : prevActive }
    if (idx >= 0) customs[idx] = toSave
    else customs.push(toSave)
    save('custom-ingredients', customs)
  }
}

// Bahan dianggap aktif kecuali eksplisit diarsipin (`active: false`) -
// biar semua bahan lama (belum pernah disentuh field ini) default aktif
// tanpa perlu migrasi data.
export function isIngredientActive(item) {
  return item?.active !== false
}

// Balikin bahan BUNDLED ke data asli (buang override-nya). Gak berlaku buat
// bahan custom - itu pake deleteCustomIngredient().
export function resetIngredientOverride(id) {
  const overrides = getIngredientOverrides()
  delete overrides[id]
  save('ingredient-overrides', overrides)
}

export function deleteCustomIngredient(id) {
  save('custom-ingredients', getCustomIngredients().filter(i => i.id !== id))
}

// Harga bisa di-override manual sama user lewat tab Profil (disimpen di localStorage,
// key 'price-overrides'). Ini satu-satunya tempat yang resolve harga final -
// baik calcTotals maupun Belanja harus lewat sini, bukan baca item.harga_per_100 langsung.
export function getIngredientPrice(id) {
  const overrides = load('price-overrides', {})
  if (overrides[id] !== undefined) return overrides[id]
  const item = buildIngredientIndex()[id]
  return item ? item.harga_per_100 || 0 : 0
}

// Satu fungsi ini yang dipake bareng-bareng sama tab Resep (Gizi) dan tab Belanja
// (estimasi harga) - biar gak ada 2 logic kalkulasi yang bisa ketinggalan sinkron.
// ingredients: array of {ingredientId, gram}. Buat bahan `per_serving` (satuan
// dasarnya bukan gram/ml, misal "1 butir"/"1 sdm"/"1 bungkus"), field `gram`
// dipake sebagai JUMLAH SERVING (boleh pecahan, misal 1.5), bukan berat -
// nilai gizinya di database emang udah didefinisiin per 1 serving, jadi
// faktor kalinya langsung jumlah serving itu sendiri (bukan dibagi 100).
export function calcTotals(ingredients) {
  const totals = {
    kkal: 0, protein: 0, karbo: 0, lemak: 0, serat: 0, harga: 0,
    // Breakdown opsional - kebanyakan bahan lama belum punya data ini (undefined,
    // dianggap 0), jadi totalnya bisa aja lebih kecil dari `karbo`/`lemak` total
    // kalau belum semua bahan di resep punya breakdown-nya. Gula & pati SENGAJA
    // gak dipisah jadi field tersendiri - pati = karbo - serat - gula, tinggal
    // diitung pas ditampilin, gak perlu disimpen dobel.
    gula: 0, lemakJenuh: 0, lemakTrans: 0, lemakMono: 0, lemakPoly: 0,
    mikro: {}
  }
  const index = buildIngredientIndex()

  ingredients.forEach(ing => {
    const item = index[ing.ingredientId]
    if (!item) return // bahan gak dikenal, skip diam-diam daripada crash

    const per100 = item.per_100g || item.per_100ml || item.per_serving || {}
    const factor = item.per_serving ? ing.gram : ing.gram / 100

    totals.kkal += (per100.kkal || 0) * factor
    totals.protein += (per100.protein_g || 0) * factor
    totals.karbo += (per100.karbo_g || 0) * factor
    totals.lemak += (per100.lemak_g || 0) * factor
    totals.serat += (per100.serat_g || 0) * factor
    totals.gula += (per100.gula_g || 0) * factor
    totals.lemakJenuh += (per100.lemak_jenuh_g || 0) * factor
    totals.lemakTrans += (per100.lemak_trans_g || 0) * factor
    totals.lemakMono += (per100.lemak_mono_g || 0) * factor
    totals.lemakPoly += (per100.lemak_poly_g || 0) * factor
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
  return buildIngredientIndex()[id]
}

// Dipake UI (recipe builder & database bahan) buat nentuin apakah bahan ini
// pake basis "1 serving" (bukan gram/ml) - misal bumbu satuan/produk kemasan
// yang gak masuk akal ditimbang per gram sama user sehari-hari.
export function isPerServing(item) {
  return !!item?.per_serving
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
  tembaga_mg: { label: 'Tembaga', unit: 'mg' },
  // Omega-3 dipisah ALA (nabati - chia/kenari/flaxseed) vs EPA+DHA (hewani -
  // ikan/suplemen fish oil) karena beda sumber & beda efikasi biologis (badan
  // cuma convert ALA->EPA/DHA ~5-10%, jadi nyampur keduanya jadi 1 angka
  // nyesatin). ALA pake AKG resmi Permenkes 28/2019 (1.6g dewasa laki-laki
  // 19-29th, sama kayak angka "Total Omega-3" yang ada di tabelnya). EPA+DHA
  // sengaja GAK dikasih `akg` - belum ada acuan resmi Indonesia yang jelas
  // buat orang dewasa umum (beda dari ibu hamil/menyusui yang udah ada),
  // rekomendasi internasional (WHO/AHA ~250-500mg) juga masih bervariasi -
  // mending ditampilin apa adanya drpd nebak angka target.
  ala_mg: { label: 'Omega-3 (ALA)', unit: 'mg', akg: 1600 },
  epa_dha_mg: { label: 'Omega-3 (EPA+DHA)', unit: 'mg' },
  // Iodium & Selenium - relevan spesifik karena pantang ikan (sumber utama
  // keduanya). AKG dicross-check ke 2 sumber independen (selenium sempet
  // ketemu angka salah 4.0mcg di 1 sumber, ternyata yang bener 30mcg).
  iodium_mcg: { label: 'Iodium', unit: 'mcg', akg: 150 },
  selenium_mcg: { label: 'Selenium', unit: 'mcg', akg: 30 },
  // B1/B2/B3 - kerja bareng buat metabolisme energi, relevan buat konteks
  // latihan intensitas tinggi meski jarang defisiensi di diet umum.
  vitamin_b1_mg: { label: 'Vitamin B1 (Tiamin)', unit: 'mg', akg: 1.2 },
  vitamin_b2_mg: { label: 'Vitamin B2 (Riboflavin)', unit: 'mg', akg: 1.3 },
  vitamin_b3_mg: { label: 'Vitamin B3 (Niasin)', unit: 'mg', akg: 16 }
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
