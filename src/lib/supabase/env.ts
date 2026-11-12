// A pasted env var can carry a trailing newline or a BOM. fetch headers trim it silently,
// but the Realtime websocket puts the key in the URL, so a stray byte breaks the handshake.
export function cleanEnv(v: string | undefined): string {
  return (v ?? '').replace(/^[﻿\s]+|[\s﻿]+$/g, '')
}
