// Phones play this in landscape. Android Chrome can lock it (fullscreen first); iPhone Safari cannot,
// so a portrait touch device gets a rotate screen instead.

export const ROTATE_LINE = 'Rotate your phone sideways'

export function needsRotate(touch: boolean, width: number, height: number): boolean {
  return touch && height > width
}

type FullscreenTarget = { requestFullscreen?: () => Promise<void> }
type ScreenLike = { orientation?: { lock?: (o: string) => Promise<void> } }

// Must run inside a user gesture (a tap). Never throws: false means "show the rotate screen instead".
export async function tryLandscape(el: FullscreenTarget, scr: ScreenLike): Promise<boolean> {
  try {
    const lock = scr.orientation?.lock
    if (!el.requestFullscreen || !lock) return false
    await el.requestFullscreen()
    await lock.call(scr.orientation, 'landscape')
    return true
  } catch {
    return false
  }
}
