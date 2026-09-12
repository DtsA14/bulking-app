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
— adaptive TDEE dari histori 14 hari + tren berat, fallback ke cold-start
Mifflin-St Jeor BMR + level aktivitas [3 mode] + surplus kalau histori belum
cukup, override manual opsional, rekomendasi booster otomatis di Hari Ini),
makro lengkap + mikronutrien harian di Hari Ini (agregat otomatis dari
`calcTotals()`, %AKG per mikro pake acuan Permenkes 28/2019 dewasa laki-laki
19-29 th, 6 mikro esensial default + toggle lihat semua, sort ascending by
%AKG), Profil nambah field umur/gender/level aktivitas.

Udah kekerjain (2026-09-11): refresh 14 dari 27 bahan langsung dari TKPI via
panganku.org (telur, tahu, tempe, nasi-matang, wortel, bayam, kacang-panjang,
pisang, susu-full-cream, yogurt, selai-kacang, minyak-wijen, madu,
bawang-putih) — macro/serat lebih akurat + 2 mikro baru (`natrium_mg`,
`tembaga_mg`, sengaja gak dikasih target %AKG). 4 bahan (ayam-fillet,
daging-sapi-has, kentang, keju-parut) SENGAJA di-skip karena entry TKPI-nya
beda potongan/bentuk dari definisi resep kita (lihat follow-up di bawah).

Udah kekerjain (2026-09-11, lanjutan): refresh 10 bahan lagi lewat **USDA
FoodData Central API** (bukan scrape lagi, API resmi) — `ayam-fillet`
(chicken breast skinless raw), `daging-sapi-has` (beef tenderloin raw),
`kentang` (potato baked flesh & skin - angka lama ternyata emang udah persis
USDA, cuma nambah mikro), `keju-parut` (cheddar cheese), `oat-instan`
(instant oats - zat besi TETEP pake angka lama, USDA-nya kefortifikasi
ekstrem/24.7mg per 100g gak representatif buat oat generik), `brokoli`,
`paprika`, `kecap-asin` (soy sauce tamari), `saus-tiram` (oyster sauce -
turun jauh dari 143→51 kkal, worth dicek), `granola`, `whey-protein`.
Keputusan sourcing baru: **USDA jadi default**, TKPI cuma fallback buat
bahan yang gak ada padanan internasional ATAU beda spesies/bentuk dari versi
Barat-nya.

Udah kekerjain (2026-09-11, cross-check): 14 bahan yang di-refresh dari TKPI
di-cross-check balik ke USDA. Hasilnya: `nasi-matang` di-**revert ke USDA**
(180→130 kkal - TKPI-nya ternyata kegedean, USDA cocok sama angka cooked
rice standar yang dikenal luas). `bayam` & `tahu` dikonfirmasi TETEP TKPI
(USDA "spinach"/"firm tofu" itu beda spesies/produk, bukan padanan yang
valid). `selai-kacang` & `minyak-wijen` dikonfirmasi konsisten di kedua
sumber (gak ada perubahan). `susu-full-cream` gagal di-cross-check (query
USDA "milk whole" nyasar ke hasil keju, belum di-retry).

## Follow-up — belum dikerjain
- **`susu-full-cream` belum sempet di-cross-check ke USDA** — query pertama
  ("milk whole") salah nangkep hasil keju (mozzarella/ricotta). Perlu query
  ulang lebih spesifik ("milk, whole, 3.25% milkfat") kalau mau divalidasi.
- **`roti-gandum` belum di-refresh** — kandidat USDA yang ketemu (pita bread,
  vienna whole wheat) protein/karbonya beda jauh dari roti tawar biasa,
  sengaja di-skip daripada maksa. Butuh query USDA yang lebih spesifik
  ("bread, whole wheat, sliced" atau merek tertentu).
- **`kecap-manis` masih estimasi lama** — gak ada di USDA (soy sauce generik
  beda komposisi) maupun ketemu di TKPI pas scrape kemarin. Kandidat buat
  dicari manual dari sumber lain (misal nutrition label produk ABC/Bango).

Udah kekerjain (2026-09-11): **Fix sync `beratSekarang` vs histori Progress**
— nambah `getCurrentWeight(profile)` di `lib/weight.js` (baca entry TERBARU
dari `weight-logs`, fallback ke `profile.beratSekarang` kalau histori kosong/
belum pernah dicatat). `calcMifflinTarget()` & pemanggilan `getMacroTargets()`
di `HariIni.jsx` sekarang lewat fungsi ini, jadi BMR/target protein-lemak
otomatis kepake berat TERBARU dari Progress, gak lagi basi kalau user lupa
update field Profil manual. Dites: catat 80kg baru di Progress → target
protein 122→160g, lemak 61→80g, target kkal 2735→3030, semuanya re-kalkulasi
otomatis tanpa nyentuh Profil sama sekali.

## Eksperimen AI recipe/meal-plan generator (2026-09-11) — belum dibangun,
## cuma dry-run manual buat validasi konsep
Nyoba manual (bukan API call beneran) generate jadwal makan 5x/hari yang
ngejar target kalori+makro+6 mikro esensial, pake cuma database bahan yang
ada (`getAllIngredients()` + `calcTotals()`, gak nambah data baru). Hasil:
kkal/protein/lemak/karbo bisa didekatin (90-134% dari target, protein/lemak
malah gampang ke-over duluan), 5 dari 6 mikro gampang ke-over jauh (zat besi
sampe 327%), TAPI **vitamin D mentok di ~57% AKG apapun kombinasinya** —
sumbernya di database cuma telur & susu, dan nambahin lebih banyak dari
keduanya keburu ngelewatin target protein/lemak sebelum vitD-nya nutup. Ini
keterbatasan DATA, bukan keterbatasan pendekatannya.

Kesimpulan buat kalau nanti beneran dibangun (lihat item #8 di atas):
- **Wajib pake verify-loop**, bukan sekali generate langsung dipercaya: AI
  susun komposisi dari bahan yang ADA di database (`ingredientId`, bukan
  nulis bebas) → app hitung ulang pake `calcTotals()` (ground truth) → kalau
  meleset jauh, feed gap-nya balik ke AI buat direvisi (1-2 iterasi). Tanpa
  loop ini, hasil kemungkinan lebih kasar dari yang di-generate manual di
  eksperimen ini.
- Kalau mau ngejar vitamin D beneran, perlu nambah bahan baru ke database
  (misal "susu UHT fortifikasi vit D" atau pisahin "kuning telur" dari
  "telur utuh" - keduanya ada datanya di USDA) - atau terima gap-nya sambil
  kasih disclaimer "kejar dari sinar matahari" (yang emang saran gizi yang
  valid, vitamin D emang bukan terutama dari makanan).
- **Update (2026-09-12) - suplemen itu jalan UTAMA, bukan fallback.** Awalnya
  digambar sebagai "whole food dulu, suplemen cuma buat nutup sisa gap yang
  gak kekejar" - itu KELIRU. User emang sengaja mau andelin suplemen/
  multivitamin buat nutup gap mikro (termasuk vitamin D di atas) karena males
  masak/makan whole food demi 1-2 mikro doang - konsisten sama alasan awal
  app ini didesain "zero decision-making" (males/skip makan). Suplemen udah
  otomatis kesupport tanpa ubah skema apa-apa (tinggal entry baru di database
  bahan, kategori `suplemen` udah ada dari whey-protein, basis `per_serving`
  yang udah dibangun 2026-09-11 pas banget buat "1 tablet"). Kalau nanti
  generator ini digarap, prompt-nya jangan diarahin "prioritasin whole food,
  suplemen darurat aja" - treat semua bahan (termasuk suplemen) setara dari
  awal.

Udah kekerjain (2026-09-12): **Nambah tracking Omega-3, dipisah ALA vs
EPA+DHA** di `MIKRO_LABELS` (`lib/nutrition.js`) - `ala_mg` (AKG 1600mg,
Permenkes 28/2019 dewasa laki-laki 19-29th) dan `epa_dha_mg` (sengaja GAK ada
`akg`, belum ada acuan resmi Indonesia buat dewasa umum, rekomendasi
internasional WHO/AHA ~250-500mg masih bervariasi). Dipisah karena tubuh cuma
convert ALA->EPA/DHA ~5-10%, nyampur jadi 1 angka nyesatin. Latar belakang:
kelanjutan eksperimen AI generator di atas - user gak makan ikan (pantangan
Profil), jadi omega-3 (terutama EPA+DHA) & vitamin D itu 2 gap struktural
yang gak kekejar dari whole food, plus iodium & selenium (gak ke-track sama
sekali - dicatet sebagai gap terpisah, belum ditambahin). Dites: bikin bahan
custom "per_serving" isi `epa_dha_mg`/`ala_mg`, tampil bener di "Lihat semua
mikronutrien" - EPA+DHA raw value tanpa %, ALA dengan %AKG.

Udah kekerjain (2026-09-12, lanjutan): **Nambah 2 suplemen + 4 superfood ke
`ingredients.json` beneran** (bukan cuma exercise manual) - `vitamin-d3-1000iu`
(25mcg vitD per serving), `omega-3-fish-oil-1000mg` (300mg EPA+DHA per
serving), `chia-seed` (ALA 18.800mg/100g - riset via USDA/triagemethod,
dipilih SPESIFIK buat nutup gap ALA yang 0%), `kale` (vitamin A 241mcg &
vitamin K 390mcg/100g, lebih lengkap dari wortel), `almond` (vitamin E
25.6mg/100g, nutup gap yang kemarin cuma 36%), `alpukat` (kalium 485mg &
kolin 14.2mg/100g). Rerun eksperimen generate pake bahan-bahan ini nunjukin
gap vitamin D, ALA, vitamin A, & vitamin E semuanya bisa ketutup gampang
tanpa distorsi macro yang parah - keempatnya dipilih presisi buat gap yang
udah diidentifikasi, bukan sekadar nambah database secara acak.

**Catatan porsi**: chia-seed (dan spirulina kalau nanti ditambah) itu
biasanya dikonsumsi jauh di bawah 100g/hari (chia ~15-30g/hari) - pas dipake
di Resep builder, satuan gram HARUS disesuaikan ke porsi realistis, jangan
default 100g penuh.

## Gap tracking mikro lain yang diketahui - belum ditambahin
- **Iodium & Selenium** - dua-duanya gak ada key di `MIKRO_LABELS` sama
  sekali. Relevan spesifik karena user pantang ikan (sumber utama iodium),
  tapi practically kemungkinan udah aman dari garam beryodium/sumber lain -
  belum prioritas ditambahin kecuali kepake buat eksperimen AI generator
  lagi.
- Butuh infra baru yang belum ada di app ini: serverless function buat proxy
  API key (gak bisa di-embed client-side, sama constraint-nya kayak USDA key
  kemarin) - beda dari fitur-fitur sebelumnya yang murni frontend+localStorage.
- **Diputuskan (2026-09-11): DITUNDA.** Bukan prioritas karena app-nya udah
  didesain "zero decision-making" dan resep kurasi manual udah nutup masalah
  utama (males/skip makan) - fitur ini lebih cocok jadi mode eksplorasi
  opsional pas udah rajin masak, bukan kerjaan mendesak.

## Design critique (dari sesi lain, 2026-09-10) — udah dikerjain (2026-09-10)
App-nya functionally kuat tapi sebelumnya visualnya masih "data mentah dalam
kartu beige" - semua kartu/tombol pake bobot & warna yang sama. Fix:

- **Button hierarchy** — `.btn-primary` (filled, dipake buat "Tambah" di nudge
  booster & "Catat" di Progress) vs `.btn-secondary` (ghost, buat Ganti/+ Menu/
  + Booster/toggle) di `styles.css`
- **Color-coding by purpose** — `.nudge-box` (aksen amber) buat rekomendasi
  booster actionable, beda dari `.suggestion-box`/tan buat data pasif
- **Tap affordance Resep** — chevron `›` + hover state di `recipe-row`
- **Struktur section Profil** — dibagi jadi `.section-card` terpisah (Data
  diri / Target kalori / Pantangan / Harga bahan), bukan 1 form panjang flat
- Nesting "+ Menu"/"+ Booster" jadi footer row DI DALAM `.meal-card` yang sama
  kayak "Ganti" (bukan floating terpisah)
- Kontras label "target X" di macro grid dinaikin lewat span `.target` terpisah
- Disclaimer panjang (metodologi target, caveat mikro) pake kelas `.disclaimer`
  non-italic, bukan `.empty-note` italic

Udah kekerjain (2026-09-11): **Database Bahan manual** di Profil - tambah
bahan baru, edit bahan bawaan (disimpen sebagai override di
`ingredient-overrides`, bisa direset), hapus bahan custom. `nutrition.js`
sekarang baca index gabungan (bundled + override + custom) tiap kalkulasi,
jadi Resep/Belanja/Hari Ini otomatis ke-update.

Udah kekerjain (2026-09-11): **Custom recipe builder** di tab Resep - tombol
"+ Tambah Resep", form nama/kategori/porsi/bahan (pilih dari Database Bahan
+ qty/satuan/gram)/langkah/catatan. Resep custom otomatis muncul di listing
Resep & menu picker Hari Ini bareng resep bawaan (`getAllRecipes()` di
`recipes.js`). Resep bawaan gak bisa diedit/dihapus dari sini (cuma yang
custom) - kalau mau ubah resep bawaan, technically bisa clone jadi resep
baru manual buat sekarang.

Udah kekerjain (2026-09-11): **Satuan dasar "per 1 serving"** di Database
Bahan (`Profil.jsx`) - opsi ke-3 selain per 100g/per 100ml, buat bahan yang
gak masuk akal ditimbang per gram (produk kemasan, satuan butir/sdm dst).
`calcTotals()` di `nutrition.js` otomatis kali faktor jumlah serving (bukan
dibagi 100) buat bahan jenis ini. Recipe builder (`Resep.jsx`) ngedetek
otomatis lewat `isPerServing()` - placeholder kolom terakhir berubah jadi
"Jml serving" pas bahan yang dipilih pake basis ini.

## Lainnya (dari diskusi awal, belum dieksekusi)
- **Reminder/notifikasi jam makan** — relevan karena masalah utama user emang
  sering skip makan
- **Migrasi ke backend** (Supabase, kayak kemungkinan besar KYW) — kalau butuh
  akses dari HP + laptop sekaligus, bukan cuma localStorage
