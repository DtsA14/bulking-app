import { useState } from 'react'
import { RECIPES, CAT_LABELS, findRecipe, ingredientLabel, getRecipeTotals, recipeMatchesPantangan } from '../data/recipes.js'
import { getProfile } from '../lib/profile.js'

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

export default function Resep() {
  const [openRecipeId, setOpenRecipeId] = useState(null)
  const [recipeTab, setRecipeTab] = useState('masak')

  const openRecipe = openRecipeId ? findRecipe(openRecipeId) : null

  if (openRecipe) {
    return (
      <div className="page">
        <div className="recipe-detail-head">
          <button onClick={() => setOpenRecipeId(null)}>←</button>
          <span className="rtitle">{openRecipe.name}</span>
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

  return (
    <div className="page">
      {CATS.map(cat => (
        <div key={cat}>
          <div className="cat-heading">{CAT_LABELS[cat]}</div>
          {RECIPES.filter(r => r.cat === cat && !recipeMatchesPantangan(r, pantangan)).map(r => (
            <div className="recipe-row" key={r.id} onClick={() => { setOpenRecipeId(r.id); setRecipeTab('masak') }}>
              <span>{r.name}</span>
              <span className="recipe-meta">{getRecipeTotals(r).kkal} kkal</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
