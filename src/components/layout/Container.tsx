// the shared wide landscape page frame. every room body uses this so width +
// side padding are consistent and align with the full-width nav/footer.
export default function Container({
  children,
  className,
  style,
  as: Tag = 'div',
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  as?: 'div' | 'section' | 'article' | 'header' | 'footer'
}) {
  return (
    <Tag
      className={className}
      style={{
        width: '100%',
        maxWidth: 'var(--page-max)',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: 'var(--page-px)',
        paddingRight: 'var(--page-px)',
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
