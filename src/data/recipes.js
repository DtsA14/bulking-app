import { calcTotals, findIngredient } from '../lib/nutrition.js'
import { load, save } from '../lib/storage.js'

// qty & unit itu buat ditampilkan ke user (natural: "2 butir", "4 sdm").
// gram itu berat aktual (atau ml buat cairan) buat kalkulasi gizi/harga nanti,
// dihitung sekali di sini pas nulis resep, bukan di-derive on-the-fly.
export function ingredientLabel(ing) {
  const item = findIngredient(ing.ingredientId)
  const nama = item ? item.nama : ing.ingredientId
  return `${ing.qty} ${ing.unit} ${nama}`
}

export function ingredientGram(ing) {
  return ing.gram
}

// Pantangan di Profil itu teks bebas (misal "Ikan" atau "Ikan, Kacang"), dicocokin
// ke nama/kategori tiap ingredient di resep - biar resep yang ngandung bahan
// terlarang otomatis kesaring dari pilihan, bukan cuma metadata doang.
export function recipeMatchesPantangan(recipe, pantangan) {
  const keywords = (pantangan || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  if (keywords.length === 0) return false

  return recipe.ingredients.some(ing => {
    const item = findIngredient(ing.ingredientId)
    if (!item) return false
    const haystack = `${item.nama} ${item.kategori || ''}`.toLowerCase()
    return keywords.some(k => haystack.includes(k))
  })
}

// Cache per recipe/booster id, biar dipanggil berkali-kali (summary + tiap slot + picker)
// dalam satu render gak ngulang kalkulasi calcTotals dari nol tiap kali. Di-invalidate
// manual lewat clearTotalsCache() tiap kali harga bahan (price-overrides) diubah di Profil,
// soalnya harga ikut kehitung di totals dan gak boleh nyangkut angka lama.
const recipeTotalsCache = new Map()
const boosterTotalsCache = new Map()

export function clearTotalsCache() {
  recipeTotalsCache.clear()
  boosterTotalsCache.clear()
}

// Dibulatin 1 desimal (bukan integer) karena banyak mikro jumlahnya kecil per
// porsi (misal vitamin B12 ~0.3mcg) - kalau dibulatin ke integer kayak makro,
// keitung 0 semua.
function roundMikro(mikro, divisor) {
  const result = {}
  Object.entries(mikro).forEach(([key, val]) => {
    result[key] = Math.round((val / divisor) * 10) / 10
  })
  return result
}

// Total gizi & estimasi harga SELALU dihitung dari ingredients, gak pernah disimpan
// statis di objek resep - biar gak ada 2 sumber angka yang bisa beda pas salah satu diupdate.
// Ingredients di tiap resep itu buat SELURUH BATCH (misal 4 porsi), jadi hasilnya
// dibagi recipe.porsi dulu biar yang ditampilin ke user itu angka PER PORSI.
export function getRecipeTotals(recipe) {
  const cached = recipeTotalsCache.get(recipe.id)
  if (cached) return cached

  const batch = calcTotals(recipe.ingredients)
  const porsi = recipe.porsi || 1
  const result = {
    kkal: Math.round(batch.kkal / porsi),
    protein: Math.round(batch.protein / porsi),
    karbo: Math.round(batch.karbo / porsi),
    lemak: Math.round(batch.lemak / porsi),
    serat: Math.round(batch.serat / porsi),
    harga: Math.round(batch.harga / porsi),
    mikro: roundMikro(batch.mikro, porsi)
  }
  recipeTotalsCache.set(recipe.id, result)
  return result
}

export const RECIPES = [
  {
    id: 'sarapan-telur-roti',
    cat: 'sarapan',
    name: 'Telur + Roti + Pisang',
    desc: 'Sarapan cepat, gak perlu masak ribet.',
    porsi: 1,
    ingredients: [
      { ingredientId: 'telur', qty: 2, unit: 'butir', gram: 110 },
      { ingredientId: 'roti-gandum', qty: 2, unit: 'lembar', gram: 60 },
      { ingredientId: 'pisang', qty: 1, unit: 'buah', gram: 118 }
    ],
    catatan: [],
    steps: ['Goreng atau rebus telur sesuai selera.', 'Panggang roti kalau suka.', 'Makan bareng pisang.']
  },
  {
    id: 'sarapan-telur-kentang',
    cat: 'sarapan',
    name: 'Telur & Kentang Panggang',
    desc: 'Telur, kentang dadu panggang, bayam, keju parut. (4 porsi)',
    porsi: 4,
    micro: 'Kolin & vitamin B12 (telur), kalium & vitamin C (kentang), folat (bayam)',
    ingredients: [
      { ingredientId: 'telur', qty: 8, unit: 'butir', gram: 440 },
      { ingredientId: 'kentang', qty: 4, unit: 'buah', gram: 600 },
      { ingredientId: 'bayam', qty: 2, unit: 'cup', gram: 60 },
      { ingredientId: 'keju-parut', qty: 0.5, unit: 'cup', gram: 56 },
      { ingredientId: 'minyak-wijen', qty: 2, unit: 'sdm', gram: 28 }
    ],
    catatan: ['Garam & lada secukupnya'],
    steps: ['Panaskan oven 200°C. Lumuri kentang dengan minyak, garam, lada.', 'Panggang kentang ±25 menit sampai empuk & kecoklatan.', 'Kocok telur, tumis sebentar dengan bayam sampai layu.', 'Campur telur orak-arik dengan kentang panggang, taburi keju.', 'Bagi ke 4 wadah, simpan di kulkas atau makan langsung.']
  },
  {
    id: 'snack-smoothie-normal',
    cat: 'snack',
    name: 'Smoothie — Mode Normal',
    desc: 'Calorie bridge pas napsu makan normal.',
    porsi: 1,
    ingredients: [
      { ingredientId: 'pisang', qty: 1, unit: 'buah', gram: 118 },
      { ingredientId: 'susu-full-cream', qty: 250, unit: 'ml', gram: 250 },
      { ingredientId: 'selai-kacang', qty: 2, unit: 'sdm', gram: 32 },
      { ingredientId: 'whey-protein', qty: 1, unit: 'scoop', gram: 30 },
      { ingredientId: 'oat-instan', qty: 3, unit: 'sdm', gram: 24 },
      { ingredientId: 'madu', qty: 1, unit: 'sdm', gram: 21 }
    ],
    catatan: ['Es batu secukupnya'],
    steps: ['Potong pisang jadi beberapa bagian.', 'Masukkan semua bahan ke blender.', 'Blend 30-60 detik sampai halus.', 'Tuang ke gelas, minum selagi dingin.']
  },
  {
    id: 'snack-smoothie-emergency',
    cat: 'snack',
    name: 'Smoothie — Mode Emergency',
    desc: 'Pas bener-bener gak napsu sama sekali.',
    porsi: 1,
    ingredients: [
      { ingredientId: 'pisang', qty: 1, unit: 'buah', gram: 118 },
      { ingredientId: 'susu-full-cream', qty: 250, unit: 'ml', gram: 250 },
      { ingredientId: 'selai-kacang', qty: 2, unit: 'sdm', gram: 32 },
      { ingredientId: 'madu', qty: 1, unit: 'sdm', gram: 21 }
    ],
    catatan: ['Es batu secukupnya'],
    steps: ['Potong pisang.', 'Masukkan semua bahan ke blender.', 'Blend sampai halus.', 'Minum selagi dingin.']
  },
  {
    id: 'snack-yogurt',
    cat: 'snack',
    name: 'Yogurt + Granola',
    desc: 'Snack cepat tanpa masak.',
    porsi: 1,
    ingredients: [
      { ingredientId: 'yogurt', qty: 1, unit: 'cup', gram: 245 },
      { ingredientId: 'granola', qty: 3, unit: 'sdm', gram: 24 }
    ],
    catatan: [],
    steps: ['Campur yogurt dengan granola di mangkuk.', 'Makan langsung.']
  },
  {
    id: 'snack-roti-selai',
    cat: 'snack',
    name: 'Roti + Selai Kacang',
    desc: 'Alternatif snack sore.',
    porsi: 1,
    ingredients: [
      { ingredientId: 'roti-gandum', qty: 2, unit: 'lembar', gram: 60 },
      { ingredientId: 'selai-kacang', qty: 2, unit: 'sdm', gram: 32 }
    ],
    catatan: [],
    steps: ['Oles selai kacang ke roti.', 'Makan langsung.']
  },
  {
    id: 'makan-ayam',
    cat: 'makan',
    name: 'Ayam Teriyaki Rice Bowl',
    desc: 'Ayam fillet, nasi, brokoli, wortel, kecap manis & asin. (4 porsi)',
    porsi: 4,
    micro: 'Zat besi & vitamin B6 (ayam), vitamin C (brokoli), vitamin A (wortel)',
    ingredients: [
      { ingredientId: 'ayam-fillet', qty: 600, unit: 'g', gram: 600 },
      { ingredientId: 'nasi-matang', qty: 4, unit: 'cup', gram: 800 },
      { ingredientId: 'brokoli', qty: 2, unit: 'cup', gram: 180 },
      { ingredientId: 'wortel', qty: 2, unit: 'buah', gram: 120 },
      { ingredientId: 'kecap-manis', qty: 4, unit: 'sdm', gram: 60 },
      { ingredientId: 'kecap-asin', qty: 2, unit: 'sdm', gram: 30 },
      { ingredientId: 'bawang-putih', qty: 2, unit: 'siung', gram: 6 },
      { ingredientId: 'minyak-wijen', qty: 2, unit: 'sdm', gram: 28 }
    ],
    catatan: [],
    steps: ['Potong ayam jadi potongan sedang, sisihkan.', 'Panaskan minyak, tumis bawang putih sampai harum (±1 menit).', 'Masukkan ayam, masak sampai matang & berubah warna (±8 menit).', 'Tambahkan kecap manis & kecap asin, aduk rata (±3 menit).', 'Di wajan terpisah, tumis wortel & brokoli sampai empuk tapi renyah (±5 menit).', 'Bagi nasi ke 4 wadah, taruh ayam dan sayur di atasnya secara merata.']
  },
  {
    id: 'makan-beef',
    cat: 'makan',
    name: 'Beef & Tahu Stir Fry',
    desc: 'Daging sapi has, tahu, paprika, kacang panjang, saus tiram. (4 porsi)',
    porsi: 4,
    micro: 'Zat besi tinggi & zinc (daging sapi), kalsium (tahu), vitamin K (kacang panjang)',
    ingredients: [
      { ingredientId: 'daging-sapi-has', qty: 500, unit: 'g', gram: 500 },
      { ingredientId: 'tahu', qty: 2, unit: 'blok', gram: 200 },
      { ingredientId: 'paprika', qty: 1, unit: 'buah', gram: 120 },
      { ingredientId: 'kacang-panjang', qty: 200, unit: 'g', gram: 200 },
      { ingredientId: 'saus-tiram', qty: 3, unit: 'sdm', gram: 45 },
      { ingredientId: 'bawang-putih', qty: 2, unit: 'siung', gram: 6 },
      { ingredientId: 'minyak-wijen', qty: 2, unit: 'sdm', gram: 28 },
      { ingredientId: 'nasi-matang', qty: 4, unit: 'cup', gram: 800 }
    ],
    catatan: [],
    steps: ['Goreng tahu sebentar sampai kecoklatan, sisihkan.', 'Panaskan minyak, tumis bawang putih sampai harum.', 'Masukkan daging sapi, masak cepat api besar (±4 menit).', 'Tambahkan paprika & kacang panjang, tumis ±3 menit.', 'Masukkan tahu goreng & saus tiram, aduk rata ±2 menit.', 'Bagi ke 4 wadah bersama nasi.']
  }
]

// Booster pake engine nutrisi yang sama kayak resep (calcTotals), bukan angka
// kkal hardcode terpisah - biar protein/karbo/lemak-nya juga ikut kehitung
// konsisten, bukan cuma kalori doang.
export const BOOSTERS = [
  { id: 'b-pb', name: '+1 sdm selai kacang', ingredients: [{ ingredientId: 'selai-kacang', gram: 16 }] },
  { id: 'b-oil', name: '+1 sdm minyak', ingredients: [{ ingredientId: 'minyak-wijen', gram: 14 }] },
  { id: 'b-banana', name: '+1 pisang', ingredients: [{ ingredientId: 'pisang', gram: 118 }] },
  { id: 'b-milk', name: '+250ml susu full cream', ingredients: [{ ingredientId: 'susu-full-cream', gram: 250 }] },
  { id: 'b-rice', name: '+1 porsi kecil nasi', ingredients: [{ ingredientId: 'nasi-matang', gram: 100 }] },
  { id: 'b-egg', name: '+1 butir telur', ingredients: [{ ingredientId: 'telur', gram: 55 }] }
]

export function getBoosterTotals(booster) {
  const cached = boosterTotalsCache.get(booster.id)
  if (cached) return cached

  const t = calcTotals(booster.ingredients)
  const result = {
    kkal: Math.round(t.kkal),
    protein: Math.round(t.protein),
    karbo: Math.round(t.karbo),
    lemak: Math.round(t.lemak),
    serat: Math.round(t.serat),
    harga: Math.round(t.harga),
    mikro: roundMikro(t.mikro, 1)
  }
  boosterTotalsCache.set(booster.id, result)
  return result
}

export const SLOTS = [
  { id: 'sarapan', time: '07.00', name: 'Sarapan', cat: 'sarapan' },
  { id: 'snack1', time: '10.00', name: 'Snack Pagi', cat: 'snack' },
  { id: 'siang', time: '13.00', name: 'Makan Siang', cat: 'makan' },
  { id: 'snack2', time: '16.00', name: 'Snack Sore', cat: 'snack' },
  { id: 'malam', time: '19.30', name: 'Makan Malam', cat: 'makan' }
]

export const CAT_LABELS = { sarapan: 'Sarapan', snack: 'Snack', makan: 'Makan' }

// Resep custom disimpen terpisah dari RECIPES bawaan (yang hardcoded), sama
// pola kayak custom-ingredients di nutrition.js. Resep bawaan gak bisa
// diedit/dihapus lewat UI (cuma bahan-nya yang bisa lewat Database Bahan) -
// custom recipe builder ini murni buat NAMBAH resep baru.
function getCustomRecipes() {
  return load('custom-recipes', [])
}

// Dipake di mana-mana yang sebelumnya baca RECIPES langsung buat listing/filter
// (Hari Ini, Resep) - biar resep custom otomatis muncul bareng yang bawaan.
export function getAllRecipes() {
  return [...RECIPES, ...getCustomRecipes().map(r => ({ ...r, isCustom: true }))]
}

export function findRecipe(id) {
  return getAllRecipes().find(r => r.id === id)
}

function slugifyRecipeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function generateRecipeId(name) {
  const base = slugifyRecipeName(name) || 'resep'
  const existingIds = getAllRecipes().map(r => r.id)
  if (!existingIds.includes(base)) return base
  let n = 2
  while (existingIds.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export function saveCustomRecipe(recipe) {
  const customs = getCustomRecipes()
  const idx = customs.findIndex(r => r.id === recipe.id)
  if (idx >= 0) customs[idx] = recipe
  else customs.push(recipe)
  save('custom-recipes', customs)
  clearTotalsCache()
}

export function deleteCustomRecipe(id) {
  save('custom-recipes', getCustomRecipes().filter(r => r.id !== id))
  clearTotalsCache()
}

export function findBooster(id) {
  return BOOSTERS.find(b => b.id === id)
}

export const DEFAULT_SCHEDULE = {
  sarapan: { recipeId: 'sarapan-telur-roti', boosters: [] },
  snack1: { recipeId: 'snack-smoothie-normal', boosters: [] },
  siang: { recipeId: 'makan-ayam', boosters: [] },
  snack2: { recipeId: 'snack-yogurt', boosters: [] },
  malam: { recipeId: 'makan-beef', boosters: [] }
}
