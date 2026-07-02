import type { Status, Health, Member } from './types'

export const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  ontrack:  { label: 'On track', color: 'var(--green)' },
  blocked:  { label: 'Blocked',  color: 'var(--red)' },
  paused:   { label: 'Paused',   color: 'var(--amber)' },
  shipped:  { label: 'Shipped',  color: 'var(--blue)' },
  planning: { label: 'Planning', color: 'var(--purple)' },
}

const HEALTH_META: Record<Health, { label: string; cls: string; icon: string }> = {
  gold:   { label: 'Gold',   cls: 'chip-gold',   icon: '★' },
  silver: { label: 'Silver', cls: 'chip-silver', icon: '★' },
  bronze: { label: 'Bronze', cls: 'chip-bronze', icon: '★' },
}

export function HealthChip({ health }: { health: Health }) {
  const m = HEALTH_META[health]
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide', m.cls)}>
      {m.icon} {m.label}
    </span>
  )
}

export function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color: m.color, background: `color-mix(in srgb, ${m.color} 15%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  )
}

export function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="text-[11px]" style={{ color: 'var(--faint)' }}>–</span>
  const up = value > 0
  return (
    <span className="text-[11px] font-semibold" style={{ color: up ? 'var(--green)' : 'var(--red)' }}>
      {up ? '▲' : '▼'} {Math.abs(value)}
    </span>
  )
}

export function Sparkline({ data, color = 'var(--muted)' }: { data: number[]; color?: string }) {
  const w = 88, h = 26, p = 2
  if (!data.length) return null
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => {
    const x = p + (i / (data.length - 1)) * (w - 2 * p)
    const y = h - p - ((v - min) / span) * (h - 2 * p)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
          className="rounded-full border-2 flex items-center justify-center text-[10px] font-bold overflow-hidden"
          style={{
            width: size, height: size,
            marginLeft: i === 0 ? 0 : -8,
            borderColor: 'var(--panel)',
            background: 'var(--panel2)',
            color: 'var(--muted)',
            zIndex: owners.length - i,
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
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[11px]"
      style={{ background: 'var(--panel2)', color: 'var(--muted)' }}
    >
      #{children}
    </span>
  )
}
