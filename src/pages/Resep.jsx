import { useState } from 'react'
import {
  CAT_LABELS, findRecipe, ingredientLabel, getRecipeTotals, recipeMatchesPantangan,
  getAllRecipes, generateRecipeId, saveCustomRecipe, deleteCustomRecipe
} from '../data/recipes.js'
import { getProfile } from '../lib/profile.js'
import { getAllIngredients } from '../lib/nutrition.js'

const CATS = ['sarapan', 'snack', 'makan']

function RecipeGizi({ recipe }) {
  const t = getRecipeTotals(recipe)
  return (
    <>
      <div className="macrogrid">
        <div className="mcell"><div className="v">{t.kkal}</div><div className="l">kkal</div></div>
        <div className="mcell"><div className="v">{t.protein}g</div><div className="l">protein</div></div>
        <div className="mcell"><div className="v">{t.karbo}g</div><div className="l">karbo</div></div>
        <div className="mcell"><div className="v">{t.lemak}g</div><div className="l">lemak</div></div>
      </div>
      <div className="field-row no-gap"><span>Serat</span><span>{t.serat}g</span></div>
      <div className="field-row no-gap"><span>Estimasi harga bahan</span><span>Rp{t.harga.toLocaleString('id-ID')}</span></div>
      {recipe.micro && <p className="recipe-micro"><strong>Mikro:</strong> {recipe.micro}</p>}
    </>
  )
}

function emptyRecipeForm() {
  return {
    id: null,
    cat: 'sarapan',
    name: '',
    desc: '',
    porsi: 1,
    ingredients: [],
    catatan: [],
    steps: []
  }
}

function recipeToForm(recipe) {
  return {
    id: recipe.id,
    cat: recipe.cat,
    name: recipe.name,
    desc: recipe.desc || '',
    porsi: recipe.porsi || 1,
    ingredients: recipe.ingredients.map(i => ({ ...i })),
    catatan: [...(recipe.catatan || [])],
    steps: [...recipe.steps]
  }
}

// Builder resep custom - cuma buat NAMBAH resep baru (resep bawaan gak bisa
// diedit/dihapus dari sini, cuma bahannya lewat Profil > Database Bahan).
// Ingredients di resep itu buat SELURUH BATCH (`porsi`), sama kayak resep
// bawaan - getRecipeTotals() yang bagi ke angka per porsi otomatis.
function RecipeForm({ initial, onCancel, onSaved, onDeleted }) {
  const [form, setForm] = useState(initial)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const allIngredients = getAllIngredients()

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function updateIngredient(idx, field, value) {
    setForm(prev => {
      const ingredients = [...prev.ingredients]
      ingredients[idx] = { ...ingredients[idx], [field]: value }
      return { ...prev, ingredients }
    })
  }

  function addIngredientRow() {
    if (allIngredients.length === 0) return
    setForm(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredientId: allIngredients[0].id, qty: 1, unit: '', gram: 0 }]
    }))
  }

  function removeIngredientRow(idx) {
    setForm(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx) }))
  }

  function updateListItem(field, idx, value) {
    setForm(prev => {
      const list = [...prev[field]]
      list[idx] = value
      return { ...prev, [field]: list }
    })
  }

  function addListItem(field) {
    setForm(prev => ({ ...prev, [field]: [...prev[field], ''] }))
  }

  function removeListItem(field, idx) {
    setForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }))
  }

  function handleSave() {
    if (!form.name.trim() || form.ingredients.length === 0 || form.steps.filter(s => s.trim()).length === 0) return
    const id = form.id || generateRecipeId(form.name)
    saveCustomRecipe({
      id,
      cat: form.cat,
      name: form.name.trim(),
      desc: form.desc.trim(),
      porsi: form.porsi || 1,
      ingredients: form.ingredients,
      catatan: form.catatan.filter(c => c.trim()),
      steps: form.steps.filter(s => s.trim())
    })
    onSaved(id)
  }

  return (
    <div className="page">
      <div className="recipe-detail-head">
        <button onClick={onCancel}>←</button>
        <span className="rtitle">{form.id ? 'Edit Resep' : 'Tambah Resep'}</span>
      </div>

      <label className="field-row">
        Nama resep
        <input type="text" value={form.name} onChange={e => update('name', e.target.value)} />
      </label>
      <label className="field-row">
        Deskripsi singkat
        <input type="text" value={form.desc} onChange={e => update('desc', e.target.value)} />
      </label>
      <label className="field-row">
        Kategori
        <select value={form.cat} onChange={e => update('cat', e.target.value)}>
          {CATS.map(cat => <option key={cat} value={cat}>{CAT_LABELS[cat]}</option>)}
        </select>
      </label>
      <label className="field-row">
        Jumlah porsi per batch
        <input type="number" value={form.porsi} onChange={e => update('porsi', parseFloat(e.target.value) || 1)} />
      </label>
      <p className="disclaimer">
        Bahan di bawah itu buat SELURUH batch ({form.porsi} porsi), bukan per
        porsi - gizinya otomatis dibagi rata pas ditampilin.
      </p>

      <div className="cat-heading">Bahan</div>
      {form.ingredients.map((ing, idx) => (
        <div key={idx} style={{ marginBottom: 10 }}>
          <select value={ing.ingredientId} onChange={e => updateIngredient(idx, 'ingredientId', e.target.value)} style={{ width: '100%', marginBottom: 6 }}>
            {allIngredients.map(item => <option key={item.id} value={item.id}>{item.nama}</option>)}
          </select>
          <div className="ingredient-row-inputs">
            <input type="number" value={ing.qty} onChange={e => updateIngredient(idx, 'qty', parseFloat(e.target.value) || 0)} placeholder="Qty" />
            <input type="text" value={ing.unit} onChange={e => updateIngredient(idx, 'unit', e.target.value)} placeholder="Satuan (butir/sdm)" />
            <input type="number" value={ing.gram} onChange={e => updateIngredient(idx, 'gram', parseFloat(e.target.value) || 0)} placeholder="Gram" />
            <button className="btn-secondary" onClick={() => removeIngredientRow(idx)}>×</button>
          </div>
        </div>
      ))}
      <button className="btn-secondary" onClick={addIngredientRow} style={{ marginBottom: 16 }}>+ Tambah bahan</button>

      <div className="cat-heading">Cara masak</div>
      {form.steps.map((step, idx) => (
        <div className="ingredient-row-inputs" key={idx} style={{ marginBottom: 8 }}>
          <input type="text" value={step} onChange={e => updateListItem('steps', idx, e.target.value)} placeholder={`Langkah ${idx + 1}`} style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={() => removeListItem('steps', idx)}>×</button>
        </div>
      ))}
      <button className="btn-secondary" onClick={() => addListItem('steps')} style={{ marginBottom: 16 }}>+ Tambah langkah</button>

      <div className="cat-heading">Catatan (opsional)</div>
      {form.catatan.map((c, idx) => (
        <div className="ingredient-row-inputs" key={idx} style={{ marginBottom: 8 }}>
          <input type="text" value={c} onChange={e => updateListItem('catatan', idx, e.target.value)} style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={() => removeListItem('catatan', idx)}>×</button>
        </div>
      ))}
      <button className="btn-secondary" onClick={() => addListItem('catatan')} style={{ marginBottom: 16 }}>+ Tambah catatan</button>

      <div className="meal-card-actions" style={{ border: 'none', paddingTop: 0, marginTop: 0 }}>
        <button className="btn-primary" onClick={handleSave}>Simpan</button>
        {form.id && (
          confirmDelete
            ? <button className="btn-secondary" onClick={() => { deleteCustomRecipe(form.id); onDeleted() }}>Yakin hapus?</button>
            : <button className="btn-secondary" onClick={() => setConfirmDelete(true)}>Hapus</button>
        )}
      </div>
    </div>
  )
}

export default function Resep() {
  const [openRecipeId, setOpenRecipeId] = useState(null)
  const [recipeTab, setRecipeTab] = useState('masak')
  const [formState, setFormState] = useState(null) // null = gak lagi nambah/edit

  const openRecipe = openRecipeId ? findRecipe(openRecipeId) : null

  if (formState) {
    return (
      <RecipeForm
        initial={formState}
        onCancel={() => setFormState(null)}
        onSaved={(id) => { setFormState(null); setOpenRecipeId(id); setRecipeTab('masak') }}
        onDeleted={() => { setFormState(null); setOpenRecipeId(null) }}
      />
    )
  }

  if (openRecipe) {
    return (
      <div className="page">
        <div className="recipe-detail-head">
          <button onClick={() => setOpenRecipeId(null)}>←</button>
          <span className="rtitle">{openRecipe.name}</span>
          {openRecipe.isCustom && (
            <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setFormState(recipeToForm(openRecipe))}>Edit</button>
          )}
        </div>
        <div className="tabbar">
          <button className={recipeTab === 'masak' ? 'rtab active' : 'rtab'} onClick={() => setRecipeTab('masak')}>Masak</button>
          <button className={recipeTab === 'gizi' ? 'rtab active' : 'rtab'} onClick={() => setRecipeTab('gizi')}>Gizi</button>
        </div>

        {recipeTab === 'masak' ? (
          <>
            <h4>Bahan</h4>
            <ul>
              {openRecipe.ingredients.map((ing, idx) => <li key={idx}>{ingredientLabel(ing)}</li>)}
              {openRecipe.catatan?.map((c, idx) => <li key={'c' + idx} style={{ fontStyle: 'italic' }}>{c}</li>)}
            </ul>
            <h4>Cara masak</h4>
            <ol>{openRecipe.steps.map((s, idx) => <li key={idx}>{s}</li>)}</ol>
          </>
        ) : (
          <RecipeGizi recipe={openRecipe} />
        )}
      </div>
    )
  }

  const pantangan = getProfile().pantangan
  const allRecipes = getAllRecipes()

  return (
    <div className="page">
      <button className="btn-primary" onClick={() => setFormState(emptyRecipeForm())} style={{ marginBottom: 16 }}>+ Tambah Resep</button>
      {CATS.map(cat => (
        <div key={cat}>
          <div className="cat-heading">{CAT_LABELS[cat]}</div>
          {allRecipes.filter(r => r.cat === cat && !recipeMatchesPantangan(r, pantangan)).map(r => (
            <div className="recipe-row" key={r.id} onClick={() => { setOpenRecipeId(r.id); setRecipeTab('masak') }}>
              <span>{r.name}{r.isCustom && <span className="mikro-low"> · custom</span>}</span>
              <span className="recipe-row-right">
                <span className="recipe-meta">{getRecipeTotals(r).kkal} kkal</span>
                <span className="recipe-row-chevron">›</span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
