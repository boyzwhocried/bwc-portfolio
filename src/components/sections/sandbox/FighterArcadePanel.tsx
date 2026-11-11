'use client'

import { ARCADE_TITLE, DISCLAIMER } from '@/lib/sandbox/fighter/arcade/stages'
import { currentStage, runEnding, tickerFor, type ArcadeRun } from '@/lib/sandbox/fighter/arcade/run'
import { FIGHTERS, FIGHTER_IDS, type FighterId } from '@/lib/sandbox/fighter/roster'

const INK = '#1a1a1a'
const PAPER = '#ece7de'
const VERM = '#e84c28'

export type ArcadeView = 'pick' | ArcadeRun

const wrap: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, background: INK, color: PAPER, zIndex: 4, overflowY: 'auto',
}
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', margin: 0, textAlign: 'center', maxWidth: 460 }
const btn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', minHeight: 44, padding: '6px 16px', background: PAPER, color: INK, border: `2px solid ${PAPER}`, cursor: 'pointer',
}
const ghost: React.CSSProperties = { ...btn, background: INK, color: PAPER }

// Indonesian first, English as the subtitle underneath.
function Bi({ id, en, big, accent }: { id: string; en: string; big?: boolean; accent?: boolean }) {
  return (
    <div style={{ maxWidth: 460 }}>
      <p style={{ ...mono, fontSize: big ? 15 : 12, fontWeight: big ? 700 : 400, color: accent ? VERM : PAPER }}>{id}</p>
      <p style={{ ...mono, fontSize: 10, opacity: 0.75 }}>{en}</p>
    </div>
  )
}

export default function FighterArcadePanel({
  view,
  onPick,
  onFight,
  onContinue,
  onGiveUp,
  onExit,
}: {
  view: ArcadeView
  onPick: (hero: FighterId) => void
  onFight: () => void
  onContinue: () => void
  onGiveUp: () => void
  onExit: () => void
}) {
  if (view === 'pick') {
    return (
      <div style={wrap} role="dialog" aria-label="Arcade: choose your fighter">
        <Bi id={ARCADE_TITLE.id.toUpperCase()} en={ARCADE_TITLE.en} big accent />
        <p style={{ ...mono, fontSize: 11 }}>Pilih petarung / Choose your fighter</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {FIGHTER_IDS.map((id, i) => (
            <button key={id} onClick={() => onPick(id)} autoFocus={i === 0} style={btn}>
              {FIGHTERS[id].label.toUpperCase()}
            </button>
          ))}
        </div>
        <Bi id={DISCLAIMER.id} en={DISCLAIMER.en} />
        <button onClick={onExit} style={ghost}>KEMBALI / BACK</button>
      </div>
    )
  }

  const run = view
  const ending = runEnding(run)
  if (ending) {
    return (
      <div style={wrap} role="dialog" aria-label={run.status === 'won' ? 'Arcade ending: won' : 'Arcade ending: lost'}>
        {ending.lines.map((l) => (
          <Bi key={l.en} id={l.id} en={l.en} />
        ))}
        <Bi id={ending.caption.id} en={ending.caption.en} big accent />
        <p style={{ ...mono, fontSize: 11 }}>
          Amplop / Envelopes: {run.envelopes}/6
        </p>
        <button onClick={onExit} autoFocus style={btn}>JUDUL / TITLE</button>
        <Bi id={DISCLAIMER.id} en={DISCLAIMER.en} />
      </div>
    )
  }

  if (run.status === 'continue') {
    return (
      <div style={wrap} role="dialog" aria-label="Arcade: continue?">
        <Bi id="LANJUT?" en={'CONTINUE? ' + run.continuesLeft + ' left'} big accent />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onContinue} autoFocus style={btn}>LANJUT / CONTINUE</button>
          <button onClick={onGiveUp} style={ghost}>MENYERAH / GIVE UP</button>
        </div>
      </div>
    )
  }

  // status 'pre' (a 'fight' run shows no panel). Lights out: full ink between floors.
  const stage = currentStage(run)
  const ticker = tickerFor(run)
  return (
    <div style={wrap} role="dialog" aria-label={'Arcade stage ' + (run.stage + 1) + ': ' + stage.name.en}>
      <p style={{ ...mono, fontSize: 10, letterSpacing: '0.1em', opacity: 0.75 }}>LANTAI / FLOOR {run.stage + 1} OF 6 &middot; AMPLOP / ENVELOPES {run.envelopes}</p>
      <Bi id={stage.name.id.toUpperCase()} en={stage.name.en} big accent />
      <p style={{ ...mono, fontSize: 11, opacity: 0.8 }}>
        {FIGHTERS[run.hero].label} vs {stage.opponent.label}
      </p>
      {stage.pre.map((p) => (
        <div key={p.text.en} style={{ borderLeft: `2px solid ${p.speaker === 'opponent' ? VERM : PAPER}`, paddingLeft: 8 }}>
          <Bi id={p.text.id} en={p.text.en} />
        </div>
      ))}
      <button onClick={onFight} autoFocus style={btn}>LAWAN / FIGHT</button>
      <p style={{ ...mono, fontSize: 10, opacity: 0.6 }}>{ticker.id} / {ticker.en}</p>
    </div>
  )
}
