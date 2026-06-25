// Renders a JSON-LD payload as a <script type="application/ld+json">. Server
// component; the object comes from src/lib/jsonld.ts.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
