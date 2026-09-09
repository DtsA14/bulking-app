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
  const totals = { kkal: 0, protein: 0, karbo: 0, lemak: 0, serat: 0, harga: 0 }

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
  })

  return totals // dibiarin mentah (belum dibulatin) - pembagian per porsi & pembulatan
                // final dilakuin di getRecipeTotals(), bukan di sini
}

export function findIngredient(id) {
  return BY_ID[id]
}
