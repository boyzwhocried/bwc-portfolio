'use client'

import { useState } from 'react'
import { Project } from '@/types'
import ProjectCard from './ProjectCard'
import FadeIn from '@/components/ui/FadeIn'

interface ProjectGridProps {
  projects: Project[]
}

const FILTERS = ['all', 'active', 'archived'] as const
type Filter = typeof FILTERS[number]

export default function ProjectGrid({ projects }: ProjectGridProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = filter === 'all'
    ? projects
    : projects.filter((p) => (p.status ?? 'shipped') === filter)

  return (
    <div data-theme="mono" className="min-h-screen pt-14">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <FadeIn>
          <p className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
            projects
          </p>
          <p className="text-sm mb-10" style={{ color: 'var(--muted)' }}>
            things i built. some are live, some are learning, some are archived.
          </p>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="flex gap-1 mb-10">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="font-mono text-xs px-3 py-1 transition-all"
                style={{
                  border: '1px solid var(--border)',
                  color: filter === f ? 'var(--bg)' : 'var(--muted)',
                  background: filter === f ? 'var(--accent)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </FadeIn>

        {filtered.length === 0 ? (
          <p className="font-mono text-sm" style={{ color: 'var(--muted)' }}>nothing here.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {filtered.map((project, i) => (
              <FadeIn key={project.id} delay={0.04 * i} className="h-full">
                <ProjectCard project={project} />
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
