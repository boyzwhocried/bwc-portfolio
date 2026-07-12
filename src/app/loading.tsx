import Square from '@/components/ui/Square'

const frame: React.CSSProperties = {
  maxWidth: 'var(--page-max)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 'var(--page-px)',
  paddingRight: 'var(--page-px)',
}

export default function Loading() {
  return (
    <section
      style={{
        ...frame,
        minHeight: 'calc(100vh - 18rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        paddingTop: '4rem',
        paddingBottom: '4rem',
      }}
    >
      <Square size={16} randomTilt />
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        loading
      </p>
    </section>
  )
}
