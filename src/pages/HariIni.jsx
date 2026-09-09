import { useState, useEffect } from 'react'
import { RECIPES, BOOSTERS, SLOTS, DEFAULT_SCHEDULE, findRecipe, findBooster, getRecipeTotals, getBoosterTotals, recipeMatchesPantangan } from '../data/recipes.js'
import { dateKey, loadDaySchedule, saveDaySchedule } from '../lib/schedule.js'
import { getProfile } from '../lib/profile.js'

const today = dateKey()

export default function HariIni() {
  const [schedule, setSchedule] = useState(() => loadDaySchedule(today, DEFAULT_SCHEDULE))
  const [openPicker, setOpenPicker] = useState(null) // { slotId, type: 'menu' | 'booster' }
  const pantangan = getProfile().pantangan

  useEffect(() => {
    saveDaySchedule(today, schedule)
  }, [schedule])

  const totals = SLOTS.reduce(
    (acc, slot) => {
      const s = schedule[slot.id]
      const r = findRecipe(s.recipeId)
      if (r) {
        const t = getRecipeTotals(r)
        acc.kkal += t.kkal
        acc.protein += t.protein
      }
      s.boosters.forEach(b => {
        const booster = findBooster(b.boosterId)
        if (booster) {
          const bt = getBoosterTotals(booster)
          acc.kkal += bt.kkal
          acc.protein += bt.protein
        }
      })
      return acc
    },
    { kkal: 0, protein: 0 }
  )

  function pickRecipe(slotId, recipeId) {
    setSchedule(prev => ({ ...prev, [slotId]: { ...prev[slotId], recipeId } }))
    setOpenPicker(null)
  }

  function addBooster(slotId, boosterId) {
    setSchedule(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        boosters: [...prev[slotId].boosters, { boosterId, uid: crypto.randomUUID() }]
      }
    }))
    setOpenPicker(null)
  }

  function removeBooster(slotId, uid) {
    setSchedule(prev => ({
      ...prev,
      [slotId]: { ...prev[slotId], boosters: prev[slotId].boosters.filter(b => b.uid !== uid) }
    }))
  }

  return (
    <div className="page">
      <div className="summary-bar">
        <div className="summary-item">
          <div className="summary-val">{totals.kkal}</div>
          <div className="summary-lbl">total kkal hari ini</div>
        </div>
        <div className="summary-item">
          <div className="summary-val">{totals.protein}g</div>
          <div className="summary-lbl">total protein</div>
        </div>
      </div>

      {SLOTS.map(slot => {
        const s = schedule[slot.id]
        const r = findRecipe(s.recipeId)
        const isMenuOpen = openPicker?.slotId === slot.id && openPicker?.type === 'menu'
        const isBoosterOpen = openPicker?.slotId === slot.id && openPicker?.type === 'booster'

        return (
          <div className="slot" key={slot.id}>
            <div className="slot-head">
              <span className="slot-time">{slot.time}</span>
              <span className="slot-name">{slot.name}</span>
            </div>

            {r ? (
              <div className="selected-card">
                <div>
                  <div className="sc-name">{r.name}</div>
                  <div className="sc-macro">{getRecipeTotals(r).kkal} kkal · {getRecipeTotals(r).protein}g protein</div>
                </div>
                <button onClick={() => setOpenPicker({ slotId: slot.id, type: 'menu' })}>Ganti</button>
              </div>
            ) : (
              <div className="selected-card empty">Belum pilih menu</div>
            )}

            {s.boosters.length > 0 && (
              <div className="booster-chips">
                {s.boosters.map(b => {
                  const booster = findBooster(b.boosterId)
                  return (
                    <span className="chip" key={b.uid}>
                      {booster.name} (+{getBoosterTotals(booster).kkal})
                      <button onClick={() => removeBooster(slot.id, b.uid)}>×</button>
                    </span>
                  )
                })}
              </div>
            )}

            <div className="slot-actions">
              <button onClick={() => setOpenPicker(isMenuOpen ? null : { slotId: slot.id, type: 'menu' })}>+ Menu</button>
              <button onClick={() => setOpenPicker(isBoosterOpen ? null : { slotId: slot.id, type: 'booster' })}>+ Booster</button>
            </div>

            {isMenuOpen && (
              <div className="picker">
                {RECIPES.filter(rc => rc.cat === slot.cat && !recipeMatchesPantangan(rc, pantangan)).map(rc => (
                  <div className="picker-opt" key={rc.id} onClick={() => pickRecipe(slot.id, rc.id)}>
                    <span>{rc.name}</span>
                    <span className="picker-macro">{getRecipeTotals(rc).kkal} kkal</span>
                  </div>
                ))}
              </div>
            )}

            {isBoosterOpen && (
              <div className="picker">
                {BOOSTERS.map(b => (
                  <div className="picker-opt" key={b.id} onClick={() => addBooster(slot.id, b.id)}>
                    <span>{b.name}</span>
                    <span className="picker-macro">+{getBoosterTotals(b).kkal} kkal</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
