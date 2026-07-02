import type { Status, Health, Member } from './types'

export const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  ontrack:  { label: 'On track', color: 'var(--ok)' },
  blocked:  { label: 'Blocked',  color: 'var(--stop)' },
  paused:   { label: 'Paused',   color: 'var(--warn)' },
  shipped:  { label: 'Shipped',  color: 'var(--ship)' },
  planning: { label: 'Planning', color: 'var(--plan)' },
}

const HEALTH_CLS: Record<Health, string> = { gold: 'medal-gold', silver: 'medal-silver', bronze: 'medal-bronze' }

export function HealthChip({ health }: { health: Health }) {
  return <span className={cx('medal', HEALTH_CLS[health])}>{health.toUpperCase()}</span>
}

export function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color: m.color, background: `color-mix(in srgb, ${m.color} 13%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  )
}

export function Delta({ value }: { value: number }) {
  if (!value) return <span className="mono text-[11px]" style={{ color: 'var(--faint)' }}>·</span>
  const up = value > 0
  return (
    <span className="mono text-[11px] font-semibold" style={{ color: up ? 'var(--ok)' : 'var(--stop)' }}>
      {up ? '▲' : '▼'}{Math.abs(value)}
    </span>
  )
}

/** filled "signal" — commit cadence as an instrument trace */
export function Signal({ data, color = 'var(--muted)', w = 104, h = 30 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (!data || data.length < 2) return null
  const p = 2
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const x = (i: number) => p + (i / (data.length - 1)) * (w - 2 * p)
  const y = (v: number) => h - p - ((v - min) / span) * (h - 2 * p)
  const line = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `M ${x(0).toFixed(1)},${(h - p).toFixed(1)} L ${line.replace(/ /g, ' L ')} L ${x(data.length - 1).toFixed(1)},${(h - p).toFixed(1)} Z`
  const gid = 'g' + Math.round(x(1))
  return (
    <svg width={w} height={h} className="block">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function Avatars({ owners, size = 26 }: { owners: Member[]; size?: number }) {
  return (
    <div className="flex items-center">
      {owners.map((o, i) => (
        <div
          key={o.name}
          title={o.name}
          className="rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden mono"
          style={{
            width: size, height: size, marginLeft: i === 0 ? 0 : -8,
            border: '2px solid var(--paper)', background: 'var(--paper-2)', color: 'var(--muted)', zIndex: owners.length - i,
          }}
        >
          {o.handle
            ? <img src={`https://github.com/${o.handle}.png?size=64`} alt={o.name} className="h-full w-full object-cover" />
            : initials(o.name)}
        </div>
      ))}
    </div>
  )
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="mono text-[11px]" style={{ color: 'var(--faint)' }}>{children}</span>
}
