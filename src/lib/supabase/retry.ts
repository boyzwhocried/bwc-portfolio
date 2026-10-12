// Build-time Supabase reads (generateStaticParams, static pages) used to fail the
// whole deploy on one DB blip, or silently bake a 404 when the error was swallowed.
// Retry transient failures with a short backoff; a genuine not-found (PGRST116)
// is returned immediately.
type QueryResult<T> = { data: T | null; error: { message: string; code?: string } | null }

export async function retryQuery<T>(
  run: () => PromiseLike<QueryResult<T>>,
  { tries = 4, baseMs = 750 }: { tries?: number; baseMs?: number } = {},
): Promise<QueryResult<T>> {
  let last: QueryResult<T> = { data: null, error: { message: 'no attempt made' } }
  for (let i = 0; i < tries; i++) {
    try {
      last = await run()
      if (!last.error || last.error.code === 'PGRST116') return last
    } catch (e) {
      last = { data: null, error: { message: e instanceof Error ? e.message : String(e) } }
    }
    if (i < tries - 1) await new Promise((r) => setTimeout(r, baseMs * 2 ** i))
  }
  return last
}
