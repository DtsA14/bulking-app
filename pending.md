# Pending / Next Steps

Hal-hal yang udah dibahas tapi sengaja BELUM dikerjain — biar scope tiap iterasi
tetep jelas. Urutan bukan prioritas, tinggal diambil kapan relevan.

## #8 — Generate resep dari bahan (arah kebalikan dari Belanja)
Alur: user masukin bahan yang ada di rumah → sistem/AI nyari atau bikinin resep
baru dari situ, termasuk cooking direction yang belum pernah ada di database.

Baru kepake pas udah mulai rajin masak & eksplor menu — BUKAN buat alur harian,
karena keseluruhan desain app ini fokusnya "zero decision-making" (masalah awal:
males/skip makan). Nambah step "mikirin bahan apa yang ada" nambah friksi, bukan
ngurangin.

Kalau dikerjain nanti:
- Resep kurasi manual tetep jadi default/fallback
- Fitur ini jadi mode opsional terpisah, bukan jalur utama
- Bisa reuse pattern AI chat layer yang udah ada di Know Your Worth (Anthropic API
  via serverless proxy) — prompt: "resep pake bahan X,Y,Z, protein tinggi, no ikan"
- Gizi tetep dihitung dari `ingredients-db.json` (akurat), AI cuma nentuin
  kombinasi & cara masak

## Dari audit eksternal (2026-09) — belum dikerjain
1 poin dari audit yang sengaja ditahan (bukan kelewat):

- **Schema ingredient belum future-proof** — `per_100g`/`per_100ml`/`harga_per_100`
  udah oke buat sekarang, tapi kalau nanti ada custom recipe atau price tracking,
  bakal butuh metadata tambahan: raw vs cooked, edible portion, package size, brand.
  Database sekarang nyampur ayam mentah, nasi matang, kentang panggang dalam satu
  asumsi "siap pakai" — belum masalah di skala sekarang, tapi rawan jadi sumber
  error kalau database membesar
- **Breakdown gizi granular** (dari referensi app tracking makanan lain, 2026-09) —
  `lemak_g` sekarang cuma total, belum dipecah saturated/trans/mono/poly-unsaturated;
  `karbo_g` juga belum dipecah sugar vs fiber (serat udah ada terpisah, tapi sugar
  belum). Butuh re-sourcing data per bahan dari USDA/TKPI, bukan cuma nambah field
  kosong. Baru krusial kalau mau nilai kualitas lemak/gula, bukan cuma kuantitas

Udah kekerjain (2026-09-09): pantangan filter resep, `getRecipeTotals()`/
`getBoosterTotals()` caching (invalidate manual lewat `clearTotalsCache()` pas
harga bahan diedit), error handling storage (toast lewat custom event
`bulking-app:storage-error`), PWA setup (manifest + service worker via
`vite-plugin-pwa`), demo-seed histori Belanja (3 hari kebelakang, sekali doang
lewat flag `demo-seed-done`), Profile jadi Target Engine (`lib/targetEngine.js`
— adaptive TDEE dari histori 14 hari + tren berat, fallback ke `baselineKkal`
manual pas data belum cukup, rekomendasi booster otomatis di Hari Ini), makro
lengkap + mikronutrien harian di Hari Ini (agregat otomatis dari `calcTotals()`,
termasuk %AKG per mikro pake acuan Permenkes 28/2019 dewasa laki-laki 19-29 th).

## Lainnya (dari diskusi awal, belum dieksekusi)
- **Custom recipe builder** — user nambah resep sendiri, bukan cuma yang di-hardcode
- **Reminder/notifikasi jam makan** — relevan karena masalah utama user emang
  sering skip makan
- **Migrasi ke backend** (Supabase, kayak kemungkinan besar KYW) — kalau butuh
  akses dari HP + laptop sekaligus, bukan cuma localStorage
