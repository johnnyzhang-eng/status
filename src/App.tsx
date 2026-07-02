import { useEffect, useMemo, useState } from 'react'
import type { BoardData, Project, Status } from './types'
import { cx, STATUS_META, HealthChip, StatusPill, Delta, Signal, Avatars, Tag } from './ui'

const FILTERS: { key: Status | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ontrack', label: 'On track' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'paused', label: 'Paused' },
]

const wants = (p: Project, key: string) => !p.show || p.show.includes(key)
const has = (v: unknown) => Array.isArray(v) ? v.length > 0 : v != null && v !== ''

function useTheme() {
  const [light, setLight] = useState(document.documentElement.classList.contains('light'))
  const toggle = () => {
    const root = document.documentElement
    const next = !light
    root.classList.toggle('light', next); root.classList.toggle('dark', !next)
    localStorage.setItem('sb-theme', next ? 'light' : 'dark'); setLight(next)
  }
  return { light, toggle }
}

function fmtRefreshed(iso: string, agoHours: number) {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  const ago = agoHours < 1 ? 'just now' : `${Math.round(agoHours)}h ago`
  return `${day} ${time} · ${ago}`
}

/* ── Masthead: freshness is the thesis ── */
function Masthead({ data, query, setQuery }: { data: BoardData; query: string; setQuery: (s: string) => void }) {
  const { light, toggle } = useTheme()
  const stale = data.refreshedAgoHours > 18
  const c = stale ? 'var(--stop)' : 'var(--ok)'
  const attention = data.projects.filter(p => p.status === 'blocked' || p.health === 'bronze').length
  return (
    <header className="mb-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Status Board</div>
          <h1 className="serif mt-1 font-semibold leading-none tracking-tight" style={{ color: 'var(--ink)', fontSize: 'clamp(30px,5vw,44px)' }}>
            {data.org} <span style={{ color: 'var(--brand)' }}>Portfolio</span>
          </h1>
          {data.mission && <p className="mt-2 text-[13.5px] max-w-xl" style={{ color: 'var(--muted)' }}>{data.mission}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
            className="mono w-32 rounded-lg px-3 py-1.5 text-[12px] outline-none focus:w-44 transition-all"
            style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
          <button onClick={toggle} title="Toggle theme" className="rounded-lg px-2.5 py-1.5 text-[13px]"
            style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
            {light ? '☾' : '☀'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="mono text-[11px] inline-flex items-center gap-2" style={{ color: c }}>
          <span className="beacon h-2 w-2 rounded-full" style={{ background: c, color: c }} />
          {stale ? 'stale' : 'synced'} {fmtRefreshed(data.generatedAt, data.refreshedAgoHours)}
        </span>
        <span className="mono text-[11px]" style={{ color: 'var(--faint)' }}>{data.projects.length} projects</span>
        {attention > 0 && (
          <span className="mono text-[11px]" style={{ color: 'var(--stop)' }}>{attention} need{attention === 1 ? 's' : ''} attention</span>
        )}
      </div>
    </header>
  )
}

/* ── Blocker: an ops alert, not a mood ── */
function BlockerStrip({ data }: { data: BoardData }) {
  if (!data.blockers?.length) return null
  return (
    <div className="mb-6 rounded-xl overflow-hidden spine paper" style={{ ['--accent' as any]: 'var(--stop)' }}>
      <div className="pl-5 pr-4 py-3">
        {data.blockers.map((b, i) => (
          <div key={i} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
            <span className="eyebrow" style={{ color: 'var(--stop)' }}>Blocker</span>
            <span className="font-semibold" style={{ color: 'var(--ink)' }}>{b.project}</span>
            <span style={{ color: 'var(--muted)' }}>{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Project card: an instrument gauge ── */
function ProjectCard({ p, i, onOpen }: { p: Project; i: number; onOpen: () => void }) {
  const accent = STATUS_META[p.status].color
  const m = p.momentum

  if (p.internal) {
    return (
      <div className="paper spine rise rounded-2xl p-5 pl-6" style={{ ['--accent' as any]: accent, animationDelay: `${i * 55}ms` }}>
        <div className="flex items-center justify-between"><StatusPill status={p.status} /></div>
        <h2 className="serif mt-2 text-[19px] font-semibold" style={{ color: 'var(--ink)' }}>{p.name}</h2>
        <p className="mono mt-3 text-[12px] flex items-center gap-1.5" style={{ color: 'var(--faint)' }}>🔒 internal — details hidden</p>
      </div>
    )
  }

  return (
    <button onClick={onOpen} className="paper spine lift rise rounded-2xl p-5 pl-6 text-left w-full block"
      style={{ ['--accent' as any]: accent, animationDelay: `${i * 55}ms` }}>
      <div className="flex items-center justify-between gap-2">
        <StatusPill status={p.status} />
        {wants(p, 'health') && p.health && <HealthChip health={p.health} />}
      </div>

      <h2 className="serif mt-2.5 text-[20px] font-semibold leading-tight" style={{ color: 'var(--ink)' }}>{p.name}</h2>
      {p.blurb && <p className="mt-1 text-[12.5px] leading-snug" style={{ color: 'var(--muted)' }}>{p.blurb}</p>}

      {wants(p, 'momentum') && m && (
        <div className="mt-4 flex items-end justify-between border-t pt-3" style={{ borderColor: 'var(--line-soft)' }}>
          <div>
            <div className="mono text-[12.5px]" style={{ color: 'var(--ink)' }}>{has(p.version) && p.version !== '—' ? p.version : '—'}</div>
            {p.updatedDays != null && <div className="mono text-[10.5px] mt-0.5" style={{ color: 'var(--faint)' }}>updated {p.updatedDays}d ago</div>}
          </div>
          <div className="text-right">
            <div className="flex justify-end"><Signal data={m.spark} color={accent} /></div>
            <div className="mono text-[10.5px] mt-0.5" style={{ color: 'var(--muted)' }}><Delta value={m.commitsDelta} /> · {m.commits} commits/30d</div>
          </div>
        </div>
      )}

      {wants(p, 'next') && p.next && (
        <div className="mt-4">
          <div className="eyebrow" style={{ color: accent }}>Next →</div>
          <div className="mt-1 text-[13.5px] leading-snug" style={{ color: 'var(--ink)' }}>{p.next}</div>
        </div>
      )}

      {((wants(p, 'owners') && has(p.owners)) || (wants(p, 'tags') && has(p.tags))) && (
        <div className="mt-4 flex items-center justify-between">
          {wants(p, 'owners') && has(p.owners) ? <Avatars owners={p.owners!} /> : <span />}
          {wants(p, 'tags') && has(p.tags) && (
            <div className="flex flex-wrap justify-end gap-2">{p.tags!.slice(0, 3).map(t => <Tag key={t}>#{t}</Tag>)}</div>
          )}
        </div>
      )}
    </button>
  )
}

/* ── Detail ── */
function Readout({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: 'var(--paper-2)', border: '1px solid var(--line-soft)' }}>
      <div className="eyebrow">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="mono text-[24px] font-semibold" style={{ color: 'var(--ink)' }}>{value}</span>
        <Delta value={delta} />
      </div>
    </div>
  )
}

function ProjectDetail({ p, onBack }: { p: Project; onBack: () => void }) {
  const accent = STATUS_META[p.status].color
  const m = p.momentum
  const showShipped = wants(p, 'shipped') && has(p.shipped)
  const showInflight = wants(p, 'inflight')
  return (
    <div className="rise" style={{ ['--accent' as any]: accent }}>
      <button onClick={onBack} className="mono mb-4 text-[12px]" style={{ color: 'var(--brand)' }}>← portfolio</button>

      <div className="paper spine rounded-2xl p-6 pl-7">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={p.status} />
          {p.health && <HealthChip health={p.health} />}
          {has(p.version) && p.version !== '—' && <span className="mono text-[12px]" style={{ color: 'var(--faint)' }}>{p.version}</span>}
          {(has(p.owners) || has(p.links)) && (
            <div className="ml-auto flex items-center gap-3">
              {has(p.owners) && <Avatars owners={p.owners!} size={28} />}
              {p.links?.map(l => <a key={l.label} href={l.url} className="mono text-[12px]" style={{ color: 'var(--brand)' }}>{l.label} ↗</a>)}
            </div>
          )}
        </div>
        <h1 className="serif mt-3 text-[30px] font-semibold leading-none tracking-tight" style={{ color: 'var(--ink)' }}>{p.name}</h1>
        {p.blurb && <p className="mt-2 text-[13.5px]" style={{ color: 'var(--muted)' }}>{p.blurb}</p>}
        {p.internal && <p className="mono mt-4 text-[13px]" style={{ color: 'var(--faint)' }}>🔒 internal project — details hidden.</p>}

        {!p.internal && wants(p, 'momentum') && m && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Readout label="Commits · 30d" value={m.commits} delta={m.commitsDelta} />
            <Readout label="Merged PRs · 30d" value={m.prs} delta={m.prsDelta} />
            <Readout label="Open issues" value={m.issues} delta={m.issuesDelta} />
            <div className="rounded-xl p-3.5 flex flex-col justify-between" style={{ background: 'var(--paper-2)', border: '1px solid var(--line-soft)' }}>
              <div className="eyebrow">Cadence</div>
              {m.spark.length > 1 ? <Signal data={m.spark} color={accent} w={120} /> : <span className="mono text-[12px]" style={{ color: 'var(--faint)' }}>—</span>}
            </div>
          </div>
        )}

        {!p.internal && has(p.rubric) && (
          <div className="mt-6">
            <div className="eyebrow mb-2">Health rubric</div>
            <div className="flex flex-wrap gap-2">
              {p.rubric!.map(c => (
                <span key={c.label} className="mono inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px]"
                  style={{ background: 'var(--paper-2)', border: '1px solid var(--line-soft)', color: c.pass ? 'var(--ink)' : 'var(--stop)' }}>
                  <span style={{ color: c.pass ? 'var(--ok)' : 'var(--stop)' }}>{c.pass ? '✓' : '✗'}</span> {c.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {!p.internal && (showShipped || showInflight || p.next) && (
          <div className="mt-7 grid gap-7 md:grid-cols-2">
            {showShipped && (
              <div>
                <div className="eyebrow mb-3">Just shipped</div>
                <ol className="relative">
                  {p.shipped!.map((s, i) => (
                    <li key={i} className="relative pl-5 pb-4">
                      <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                      {i < p.shipped!.length - 1 && <span className="absolute left-[2.5px] top-3 bottom-0 w-px" style={{ background: 'var(--line)' }} />}
                      <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{s.summary || <span className="mono">{s.version}</span>}</div>
                      <div className="mono text-[10.5px] mt-0.5" style={{ color: 'var(--faint)' }}>{s.summary && s.version !== '—' ? `${s.version} · ` : ''}{s.date}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div>
              {showInflight && (
                <>
                  <div className="eyebrow mb-3">In flight</div>
                  {!has(p.inFlight) && <div className="text-[12.5px]" style={{ color: 'var(--faint)' }}>Nothing open.</div>}
                  {p.inFlight?.slice(0, 8).map(pr => (
                    <div key={pr.number} className="mono mb-2 rounded-lg px-3 py-2 text-[12px] flex items-center justify-between" style={{ background: 'var(--paper-2)', border: '1px solid var(--line-soft)' }}>
                      <span style={{ color: 'var(--ink)' }}>{pr.title || `open PR #${pr.number}`}</span>
                      <span style={{ color: 'var(--faint)' }}>{pr.ageDays}d</span>
                    </div>
                  ))}
                  {(p.inFlight?.length || 0) > 8 && <div className="mono text-[11px]" style={{ color: 'var(--faint)' }}>+{p.inFlight!.length - 8} more</div>}
                </>
              )}
              {p.next && (
                <>
                  <div className="eyebrow mt-5 mb-2" style={{ color: accent }}>Next up</div>
                  <div className="rounded-lg p-3.5" style={{ background: `color-mix(in srgb, ${accent} 8%, var(--paper-2))`, border: `1px solid color-mix(in srgb, ${accent} 30%, var(--line))` }}>
                    <span className="text-[13.5px]" style={{ color: 'var(--ink)' }}>{p.next}</span>
                  </div>
                  {p.nextSuggested && <div className="mono mt-2 text-[11px]" style={{ color: 'var(--faint)' }}>suggested · {p.nextSuggested}</div>}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Shell ── */
export default function App() {
  const [data, setData] = useState<BoardData | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Status | 'all'>('all')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data.json`).then(r => r.json()).then(setData).catch(() => setErr('Could not load data.json'))
  }, [])

  const shown = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.projects.filter(p => {
      if (filter !== 'all' && p.status !== filter) return false
      if (!q) return true
      return (p.name + ' ' + (p.blurb || '') + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q)
    })
  }, [data, query, filter])

  const current = data?.projects.find(p => p.id === selected) || null

  return (
    <div className="mx-auto max-w-6xl px-5 py-9">
      {err && <div className="mono" style={{ color: 'var(--stop)' }}>{err}</div>}
      {!data && !err && <div className="mono" style={{ color: 'var(--muted)' }}>loading…</div>}

      {data && current && <ProjectDetail p={current} onBack={() => setSelected(null)} />}

      {data && !current && (
        <>
          <Masthead data={data} query={query} setQuery={setQuery} />
          <BlockerStrip data={data} />

          <div className="mb-5 flex flex-wrap items-center gap-2">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className="rounded-full px-3 py-1 text-[12px] font-medium"
                style={{
                  background: filter === f.key ? 'var(--brand)' : 'var(--paper)',
                  color: filter === f.key ? 'var(--paper)' : 'var(--muted)',
                  border: '1px solid ' + (filter === f.key ? 'var(--brand)' : 'var(--line)'),
                }}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p, i) => <ProjectCard key={p.id} p={p} i={i} onOpen={() => setSelected(p.id)} />)}
          </div>
          {shown.length === 0 && <div className="mono mt-8 text-center" style={{ color: 'var(--faint)' }}>no projects match.</div>}

          <footer className="mono mt-12 text-center text-[11px]" style={{ color: 'var(--faint)' }}>
            generated from repo activity · rebuilt on push + every 6h
          </footer>
        </>
      )}
    </div>
  )
}
