import { FIGHTERS } from '../roster'
import { RING_FRAMES } from '../match'
import type { CpuLevel } from '../cpu'
import type { FighterDef, MoveDef, MoveKind } from '../types'

// Arcade mode "Rapat Terakhir" (The Last Meeting). Source of truth for copy: the writer's bible in
// the Personal OS vault (working/scratchpad/2026-11-11-bwc-arcade-writers-bible.md).
// SATIRE. Every character, office and event here is fictional and archetypal. Archetype names only,
// nothing asserts guilt, jokes land on processes (statements, labels, invoices, stamps, calls).
// Stages 3 and 4 echo live news: re-read them before any public post.

export type Bilingual = { id: string; en: string }

export type Line = { speaker: 'opponent' | 'hero'; text: Bilingual }

export type ArcadeStage = {
  slug: string
  name: Bilingual
  // Which overlay is drawn over the shared forest backdrop (new backdrops come later).
  overlay: string
  opponent: FighterDef
  cpu: CpuLevel
  boss?: boolean
  gimmick: string
  // true = planned as real sim code (not built in the skeleton: placeholders play as plain fights);
  // false = cosmetic only (overlay, props, captions).
  gimmickReal: boolean
  pre: Line[]
  defeat: Bilingual
}

export const ARCADE_TITLE: Bilingual = { id: 'Rapat Terakhir', en: 'The Last Meeting' }

export const DISCLAIMER: Bilingual = {
  id: 'Satire. Semua tokoh, kantor, dan peristiwa di sini fiksi dan hanya arketipe.',
  en: 'Satire. Every character, office and event here is fictional and archetypal.',
}

// Placeholder movesets: the two hero movesets with timing and damage nudged per opponent.
// Marks and armor stay hero-only until a stage gimmick earns them.
type Tweak = Partial<Record<MoveKind, Partial<MoveDef>>>

function variant(base: FighterDef, id: string, label: string, hp: number, walkSpeed: number, tweak: Tweak = {}): FighterDef {
  const moves = {} as Record<MoveKind, MoveDef>
  for (const k of Object.keys(base.moves) as MoveKind[]) {
    const { mark: _mark, armor: _armor, advance: _advance, ...plain } = base.moves[k]
    void _mark
    void _armor
    void _advance
    moves[k] = { ...plain, ...tweak[k] }
  }
  return { id, label, hp, walkSpeed, jumpVelocity: base.jumpVelocity, moves }
}

const AJUDAN = FIGHTERS['sang-ajudan']
const PENYADAP = FIGHTERS['si-penyadap']

export const STAGES: readonly ArcadeStage[] = [
  {
    slug: 'hutan-kabut',
    name: { id: 'Hutan Kabut', en: 'Haze Forest' },
    overlay: 'haze',
    opponent: variant(PENYADAP, 'sang-juru-bicara', 'Sang Juru Bicara', 850, 560, { special: { startup: 18, recovery: 30 } }),
    cpu: 'easy',
    gimmick: 'The haze never thins while he talks. Press release projectile blocks the view; "Kami Mendengar" stance absorbs one hit.',
    gimmickReal: false,
    pre: [
      { speaker: 'opponent', text: { id: 'Situasi terkendali. Mohon jangan lihat langit.', en: 'The situation is under control. Please do not look at the sky.' } },
      { speaker: 'hero', text: { id: 'Kami tidak bisa. Itu masalahnya.', en: "We can't. That is the problem." } },
    ],
    defeat: { id: 'Ini bukan bencana. Ini cuaca yang panjang.', en: 'This is not a disaster. It is a long weather.' },
  },
  {
    slug: 'jalan-raya-tuntutan',
    name: { id: 'Jalan Raya Tuntutan', en: 'Demand Avenue' },
    overlay: 'banners',
    opponent: variant(AJUDAN, 'si-pelabel', 'Si Pelabel', 900, 640, { kick: { damage: 70 }, special: { damage: 70 } }),
    cpu: 'easy',
    gimmick: 'Decides who you are before you arrive. Price-tag stickers DIBAYAR and ASING stick for 3 seconds; shield row only multiplies.',
    gimmickReal: false,
    pre: [
      { speaker: 'opponent', text: { id: 'Siapa yang bayar kalian ke sini?', en: 'Who paid you to come here?' } },
      { speaker: 'hero', text: { id: 'Tidak ada. Makanya aku naik bus.', en: 'Nobody. Which is also why I took the bus.' } },
    ],
    defeat: { id: 'Oke. Tidak ada yang bayar. Itu malah lebih buruk.', en: 'Fine. Nobody paid you. That is somehow worse.' },
  },
  {
    slug: 'dapur-rapat',
    name: { id: 'Dapur Rapat', en: 'The Meeting Kitchen' },
    overlay: 'kitchen',
    opponent: variant(AJUDAN, 'sang-katering', 'Sang Katering', 950, 576, { punch: { startup: 6 }, special: { damage: 80, startup: 12 } }),
    cpu: 'normal',
    gimmick: 'Every box is billed three times; the invoice on the wall ticks up whether he hits you or not. Tray frisbee returns to him.',
    gimmickReal: false,
    pre: [
      { speaker: 'opponent', text: { id: 'Dua ribu kotak untuk rapat sembilan orang. Standar.', en: 'Two thousand boxes for a meeting of nine. Standard.' } },
      { speaker: 'hero', text: { id: 'Siapa yang makan seribu sembilan ratus sembilan puluh satu sisanya?', en: 'Who eats the other one thousand nine hundred ninety one?' } },
    ],
    defeat: { id: 'Tanpa komentar. Tagihan menyusul.', en: 'No comment. Invoice to follow.' },
  },
  {
    slug: 'loket-antrean',
    name: { id: 'Loket Antrean', en: 'The Queue Counter' },
    overlay: 'queue',
    opponent: { ...variant(PENYADAP, 'sang-pengganti', 'Sang Pengganti', 1000, 704, { punch: { damage: 45 }, kick: { startup: 7 } }), revive: 1 },
    cpu: 'normal',
    gimmick: 'Stempel Ulang: first KO is stamped REDO and he stands back up at 1 HP; the second KO is final. Do not use the words VOID or INVALID on screen: the news moved (see the 2026-11-12 sensitivity note).',
    gimmickReal: true, // built: def.revive
    pre: [
      { speaker: 'opponent', text: { id: 'Aku sudah antre bertahun-tahun.', en: 'I have been next in line for years.' } },
      { speaker: 'hero', text: { id: 'Lalu siapa yang duduk di loket?', en: 'Then who is sitting at the window?' } },
    ],
    defeat: { id: 'Hasil dicatat. Silakan ambil nomor baru.', en: 'Result noted. Please take a new number.' },
  },
  {
    slug: 'ruang-kurs',
    name: { id: 'Ruang Kurs', en: 'The Exchange Room' },
    overlay: 'exchange',
    opponent: { ...variant(AJUDAN, 'sang-penempatan', 'Sang Penempatan', 1000, 672, { punch: { damage: 40 }, kick: { damage: 75 }, special: { damage: 70 } }), reshuffle: RING_FRAMES },
    cpu: 'normal',
    gimmick: 'The desk phone rings every 20 seconds: he is swapped for an identical replacement, or the chairs rotate. Penugasan armor breaks only to low attacks.',
    gimmickReal: true, // phone swap built (def.reshuffle); Penugasan low-attack armor still planned
    pre: [
      { speaker: 'opponent', text: { id: 'Aku ditugaskan di sini. Aku tidak tahu kantor ini ngapain.', en: 'I was assigned here. I do not know what this office does.' } },
      { speaker: 'hero', text: { id: 'Kantornya juga tidak tahu.', en: 'Neither does the office.' } },
    ],
    defeat: { id: 'Tunggu. Teleponku berdering. Mungkin aku bukan lawanmu lagi.', en: 'Hold on. My phone is ringing. I may not be your opponent anymore.' },
  },
  {
    slug: 'gerbang-kubah',
    name: { id: 'Gerbang Kubah', en: 'The Dome Gate' },
    overlay: 'dome',
    opponent: { ...variant(PENYADAP, 'panitia-tetap', 'Panitia Tetap', 1150, 640, { punch: { damage: 40 }, kick: { damage: 75 }, special: { damage: 70, armor: true } }), boss: true },
    cpu: 'normal',
    boss: true,
    gimmick: 'Three phases: Pernyataan, Rombak (hit the chair in office), Tinjau Abadi (a revive that only a hit under a live ticker headline ends).',
    gimmickReal: true, // built: boss.ts (armored statement, phase 2 reshuffle, phase 3 headline finisher); chair-in-office targeting still planned
    pre: [
      { speaker: 'opponent', text: { id: 'Keberatan Anda sudah diterima, dicatat, dan diserahkan ke kelompok kerja.', en: 'Your concerns have been received, recorded and assigned to a working group.' } },
      { speaker: 'hero', text: { id: 'Siapa anggota kelompok kerjanya?', en: 'Who is in the working group?' } },
      { speaker: 'opponent', text: { id: 'Anda. Mulai kemarin.', en: 'You are. Starting yesterday.' } },
    ],
    defeat: { id: 'Sidang ditutup. Panitia baru akan dibentuk untuk menyelidiki panitia ini.', en: 'This session is adjourned. A new committee will be formed to investigate this committee.' },
  },
]

export const TICKER_LINES: readonly Bilingual[] = [
  { id: 'Peringatan kabut: mohon bernapas dengan tertib.', en: 'Haze advisory: please breathe in an orderly fashion.' },
  { id: 'Rupiah telah dirombak. Mohon perbarui dompet Anda.', en: 'The rupiah has been reshuffled. Please update your wallet.' },
  { id: 'Berita terkini: panitia dibentuk untuk menilai pembentukan panitia sebelumnya.', en: "Breaking: committee formed to evaluate the previous committee's formation." },
  { id: 'Pengunjuk rasa diminta membawa struk bukti tidak dibayar.', en: 'Protesters advised to show receipts proving they were not paid.' },
  { id: 'Kementerian baru dibuka: Kementerian Pembukaan Kementerian Baru.', en: 'New ministry opened. Ministry for Opening New Ministries.' },
  { id: 'Tiket Anda berlaku. Status dapat berubah tanpa pemberitahuan.', en: 'Your ticket is valid. Status may change without notice.' },
  { id: 'Jumlah kotak makan rapat hari ini: ya.', en: "Lunch box count for today's meeting: yes." },
  { id: 'Memuat lantai berikutnya. Mohon tunggu, ada telepon berlangsung.', en: 'Loading next floor. Please hold, a phone call is in progress.' },
]

export type Ending = { lines: Bilingual[]; caption: Bilingual }

export const WIN_ENDING: Ending = {
  lines: [
    { id: 'Gerbang terbuka. Di baliknya: gerbang lain, sedikit lebih besar, dengan kubah lebih kecil.', en: 'The gate opens. Behind it: another gate, slightly larger, with a smaller dome.' },
    { id: 'Seorang petugas menyerahkan amplop baru: rombakmu sendiri, dibatalkan, berlaku kemarin.', en: 'A clerk hands you a new envelope: your own reshuffle, cancelled, effective yesterday.' },
    { id: 'Papan kurs di lobi naik satu angka lagi. Tidak ada yang menoleh.', en: 'The exchange board in the lobby rolls up one more digit. Nobody looks.' },
  ],
  caption: { id: 'Selamat. Anda telah memulihkan normal.', en: 'Congratulations. You have restored normal.' },
}

export const LOSE_ENDING: Ending = {
  lines: [
    { id: 'Kamu terbangun di aula keberangkatan bandara. Semua penerbangan tertulis BOARDING.', en: 'You wake in an airport departure hall. Every flight reads BOARDING.' },
    { id: 'Ponselmu bergetar: "Kabur aja dulu?"', en: 'Your phone buzzes: "Kabur aja dulu?" (Just flee for now?)' },
    { id: 'Kabut sudah sampai terminal dan mengantre dengan sopan.', en: 'The haze has reached the terminal and is waiting politely in line.' },
  ],
  caption: { id: 'LANJUT? Negeri ini masih ditahan di telepon.', en: 'CONTINUE? The country is still on hold.' },
}
