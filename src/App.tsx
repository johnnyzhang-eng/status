import { useEffect, useMemo, useState } from 'react'
import type { BoardData, Project, Status } from './types'
import { cx, STATUS_META, HealthChip, StatusPill, Delta, Sparkline, Avatars, Tag } from './ui'

const FILTERS: { key: Status | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ontrack', label: 'On track' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'paused', label: 'Paused' },
]

/** section visibility: honoured only if the project defines `show`; else show-if-data */
const wants = (p: Project, key: string) => !p.show || p.show.includes(key)
const has = (v: unknown) => Array.isArray(v) ? v.length > 0 : v != null && v !== ''

function useTheme() {
  const [light, setLight] = useState(document.documentElement.classList.contains('light'))
  const toggle = () => {
    const root = document.documentElement
    const next = !light
    root.classList.toggle('light', next)
    root.classList.toggle('dark', !next)
    localStorage.setItem('sb-theme', next ? 'light' : 'dark')
    setLight(next)
  }
  return { light, toggle }
}

function fmtRefreshed(iso: string, agoHours: number) {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  const ago = agoHours < 1 ? 'just now' : `${Math.round(agoHours)}h ago`
  return `${day} ${time} UTC · ${ago}`
}

/* ── Header ── */
function Header({ data, query, setQuery }: { data: BoardData; query: string; setQuery: (s: string) => void }) {
  const { light, toggle } = useTheme()
  const stale = data.refreshedAgoHours > 18
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-[16px] font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>
          <span style={{ color: 'var(--blue)' }}>◆</span> {data.org} · Project Portfolio
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="w-44 rounded-lg px-3 py-1.5 text-[13px] outline-none focus:w-56 transition-all"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
          <button
            onClick={toggle}
            title="Toggle theme"
            className="rounded-lg px-2.5 py-1.5 text-[13px]"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--muted)' }}
          >
            {light ? '☾' : '☀'}
          </button>
        </div>
      </div>
      {data.mission && <p className="mt-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>{data.mission}</p>}
      <div className="mt-1 flex items-center gap-2 text-[12px]" style={{ color: 'var(--faint)' }}>
        <span>{data.projects.length} projects</span>
        <span>·</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
          style={{
            color: stale ? 'var(--red)' : 'var(--green)',
            background: `color-mix(in srgb, ${stale ? 'var(--red)' : 'var(--green)'} 13%, transparent)`,
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: stale ? 'var(--red)' : 'var(--green)' }} />
          {stale ? 'stale' : 'refreshed'} {fmtRefreshed(data.generatedAt, data.refreshedAgoHours)}
        </span>
      </div>
    </header>
  )
}

/* ── Blocker strip ── */
function BlockerStrip({ data }: { data: BoardData }) {
  if (!data.blockers?.length) return null
  return (
    <div
      className="mb-5 rounded-xl px-4 py-2.5 text-[13px] flex flex-wrap items-center gap-x-2 gap-y-1"
      style={{ background: 'color-mix(in srgb, var(--red) 10%, var(--panel))', border: '1px solid color-mix(in srgb, var(--red) 38%, var(--line))' }}
    >
      <span className="font-bold" style={{ color: 'var(--red)' }}>⚠ {data.blockers.length} blocker{data.blockers.length > 1 ? 's' : ''}</span>
      {data.blockers.map((b, i) => (
        <span key={i} style={{ color: 'var(--ink)' }}>
          <span className="font-semibold">{b.project}:</span> {b.text}
        </span>
      ))}
    </div>
  )
}

/* ── Project card ── */
function ProjectCard({ p, onOpen }: { p: Project; onOpen: () => void }) {
  const accent = STATUS_META[p.status].color

  if (p.internal) {
    return (
      <div className="accentbar panel relative w-full rounded-2xl p-5" style={{ ['--accent' as any]: accent }}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>{p.name}</h2>
          <StatusPill status={p.status} />
        </div>
        <p className="mt-3 text-[12.5px] flex items-center gap-1.5" style={{ color: 'var(--faint)' }}>🔒 Internal — details hidden</p>
      </div>
    )
  }

  const m = p.momentum
  return (
    <button onClick={onOpen} className="accentbar lift panel relative w-full rounded-2xl p-5 text-left" style={{ ['--accent' as any]: accent }}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>{p.name}</h2>
        <StatusPill status={p.status} />
      </div>
      {p.blurb && <p className="mt-1 text-[12.5px] leading-snug" style={{ color: 'var(--muted)' }}>{p.blurb}</p>}

      {(wants(p, 'health') && p.health) || (wants(p, 'momentum') && m) ? (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {wants(p, 'health') && p.health && <HealthChip health={p.health} />}
            {wants(p, 'momentum') && m && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--muted)' }}>
                <Delta value={m.commitsDelta} /> commits
              </span>
            )}
          </div>
          {wants(p, 'momentum') && m && m.spark.length > 0 && <Sparkline data={m.spark} color={accent} />}
        </div>
      ) : null}

      {(has(p.version) || p.updatedDays != null) && (
        <div className="mt-1.5 text-[11px]" style={{ color: 'var(--faint)' }}>
          {has(p.version) && p.version !== '—' ? `${p.version} · ` : ''}
          {p.updatedDays != null ? `updated ${p.updatedDays}d ago` : ''}
        </div>
      )}

      {wants(p, 'next') && p.next && (
        <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--panel2)', border: '1px solid var(--line-soft)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>Next</div>
          <div className="mt-0.5 text-[13px] leading-snug" style={{ color: 'var(--ink)' }}>{p.next}</div>
        </div>
      )}

      {((wants(p, 'owners') && has(p.owners)) || (wants(p, 'tags') && has(p.tags))) && (
        <div className="mt-3 flex items-center justify-between">
          {wants(p, 'owners') && has(p.owners) ? <Avatars owners={p.owners!} /> : <span />}
          {wants(p, 'tags') && has(p.tags) && (
            <div className="flex flex-wrap justify-end gap-1">{p.tags!.slice(0, 3).map(t => <Tag key={t}>{t}</Tag>)}</div>
          )}
        </div>
      )}
    </button>
  )
}

/* ── Detail ── */
function Stat({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: 'var(--panel2)', border: '1px solid var(--line-soft)' }}>
      <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-[22px] font-bold" style={{ color: 'var(--ink)' }}>{value}</span>
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
    <div style={{ ['--accent' as any]: accent }}>
      <button onClick={onBack} className="mb-4 text-[13px]" style={{ color: 'var(--blue)' }}>← Portfolio</button>

      <div className="panel accentbar relative rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>{p.name}</h1>
          <StatusPill status={p.status} />
          {p.health && <HealthChip health={p.health} />}
          {has(p.version) && p.version !== '—' && <span className="text-[12px]" style={{ color: 'var(--faint)' }}>{p.version}</span>}
          {(has(p.owners) || has(p.links)) && (
            <div className="ml-auto flex items-center gap-3">
              {has(p.owners) && <Avatars owners={p.owners!} size={28} />}
              {p.links?.map(l => <a key={l.label} href={l.url} className="text-[12px]" style={{ color: 'var(--blue)' }}>{l.label} ↗</a>)}
            </div>
          )}
        </div>
        {p.blurb && <p className="mt-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>{p.blurb}</p>}
        {p.internal && <p className="mt-4 text-[13px]" style={{ color: 'var(--faint)' }}>🔒 Internal project — details hidden.</p>}

        {!p.internal && wants(p, 'momentum') && m && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Commits (30d)" value={m.commits} delta={m.commitsDelta} />
            <Stat label="Merged PRs (30d)" value={m.prs} delta={m.prsDelta} />
            <Stat label="Open issues" value={m.issues} delta={m.issuesDelta} />
            <div className="rounded-xl p-3.5 flex flex-col justify-between" style={{ background: 'var(--panel2)', border: '1px solid var(--line-soft)' }}>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Cadence</div>
              {m.spark.length > 0 ? <Sparkline data={m.spark} color={accent} /> : <span className="text-[12px]" style={{ color: 'var(--faint)' }}>—</span>}
            </div>
          </div>
        )}

        {!p.internal && has(p.rubric) && (
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--faint)' }}>Health rubric</div>
            <div className="flex flex-wrap gap-2">
              {p.rubric!.map(c => (
                <span key={c.label} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px]"
                  style={{ background: 'var(--panel2)', border: '1px solid var(--line-soft)', color: c.pass ? 'var(--ink)' : 'var(--red)' }}>
                  <span style={{ color: c.pass ? 'var(--green)' : 'var(--red)' }}>{c.pass ? '✓' : '✗'}</span> {c.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {!p.internal && (showShipped || showInflight || p.next) && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {showShipped && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--faint)' }}>Just shipped</div>
                <ol className="relative">
                  {p.shipped!.map((s, i) => (
                    <li key={i} className="relative pl-5 pb-4">
                      <span className="absolute left-0 top-1 h-2 w-2 rounded-full" style={{ background: accent }} />
                      {i < p.shipped!.length - 1 && <span className="absolute left-[3px] top-3 bottom-0 w-px" style={{ background: 'var(--line)' }} />}
                      <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{s.summary || s.version}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--faint)' }}>
                        {s.summary && s.version !== '—' ? `${s.version} · ` : ''}{s.date}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div>
              {showInflight && (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--faint)' }}>In flight</div>
                  {!has(p.inFlight) && <div className="text-[12.5px]" style={{ color: 'var(--faint)' }}>Nothing open.</div>}
                  {p.inFlight?.slice(0, 8).map(pr => (
                    <div key={pr.number} className="mb-2 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: 'var(--panel2)', border: '1px solid var(--line-soft)' }}>
                      <span style={{ color: 'var(--ink)' }}>{pr.title || `Open PR #${pr.number}`}</span>
                      <span className="ml-1" style={{ color: 'var(--faint)' }}>{pr.title ? `#${pr.number} · ` : ''}{pr.ageDays}d</span>
                    </div>
                  ))}
                  {(p.inFlight?.length || 0) > 8 && <div className="text-[12px]" style={{ color: 'var(--faint)' }}>+{p.inFlight!.length - 8} more</div>}
                </>
              )}

              {p.next && (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-wider mt-5 mb-2" style={{ color: 'var(--faint)' }}>Next up</div>
                  <div className="rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--accent) 9%, var(--panel2))', border: '1px solid color-mix(in srgb, var(--accent) 32%, var(--line))' }}>
                    <span style={{ color: 'var(--ink)', fontSize: 13 }}>→ {p.next}</span>
                  </div>
                  {p.nextSuggested && <div className="mt-2 text-[12px] dim-note italic">suggested: {p.nextSuggested}</div>}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── App shell ── */
export default function App() {
  const [data, setData] = useState<BoardData | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Status | 'all'>('all')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data.json`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setErr('Could not load data.json'))
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
    <div className="mx-auto max-w-6xl px-5 py-8">
      {err && <div style={{ color: 'var(--red)' }}>{err}</div>}
      {!data && !err && <div style={{ color: 'var(--muted)' }}>Loading…</div>}

      {data && current && <ProjectDetail p={current} onBack={() => setSelected(null)} />}

      {data && !current && (
        <>
          <Header data={data} query={query} setQuery={setQuery} />
          <BlockerStrip data={data} />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cx('rounded-full px-3 py-1 text-[12.5px] font-medium')}
                style={{
                  background: filter === f.key ? 'var(--ink)' : 'var(--panel)',
                  color: filter === f.key ? 'var(--bg2)' : 'var(--muted)',
                  border: '1px solid var(--line)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(p => <ProjectCard key={p.id} p={p} onOpen={() => setSelected(p.id)} />)}
          </div>
          {shown.length === 0 && <div className="mt-8 text-center" style={{ color: 'var(--faint)' }}>No projects match.</div>}

          <footer className="mt-10 text-center text-[12px]" style={{ color: 'var(--faint)' }}>
            Auto-generated from repo activity · rebuilt on every push and every 6h.
          </footer>
        </>
      )}
    </div>
  )
}
