#!/usr/bin/env node
// Generate public/data.json from real repo activity.
// Reads a LOCAL, gitignored .sbconfig.json (paths + curated fields + denylist).
// Pulls only SAFE signals (counts, versions+dates, health) — never raw commit
// bodies or PR titles. A denylist gate fails generation if any forbidden term
// (customer names / infra ids / SQL) would reach the public board.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CFG = process.env.SB_CONFIG || join(ROOT, '.sbconfig.json')

if (!existsSync(CFG)) {
  console.error(`No config at ${CFG}. Copy .sbconfig.example.json -> .sbconfig.json and fill it in.`)
  process.exit(1)
}
const cfg = JSON.parse(readFileSync(CFG, 'utf8'))
const DAY = 86400000
const now = Date.now()

const git = (cwd, args) => {
  try { return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }
  catch { return '' }
}
const gh = (args) => {
  try { return execSync(`gh ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }
  catch { return '' }
}
const num = (s) => { const n = parseInt(String(s).trim(), 10); return Number.isFinite(n) ? n : 0 }
const safeJson = (s) => { try { return JSON.parse(s) } catch { return null } }

const commits = (cwd, since, until) =>
  num(git(cwd, `rev-list --count --since="${since} days ago" ${until != null ? `--until="${until} days ago"` : ''} HEAD`))

const sparkWeeks = (cwd, weeks = 10) => {
  const arr = []
  for (let w = weeks; w >= 1; w--) arr.push(commits(cwd, w * 7, (w - 1) * 7))
  return arr
}

const lastCommitDays = (cwd) => {
  const ts = num(git(cwd, `log -1 --format=%ct`))
  return ts ? Math.round((now - ts * 1000) / DAY) : 999
}

const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

// version + shipped timeline (version + date ONLY — never the description text)
const versionInfo = (cwd) => {
  const vf = join(cwd, 'deployment', 'version.json')
  if (existsSync(vf)) {
    const j = safeJson(readFileSync(vf, 'utf8'))
    const vs = (j && j.versions) || []
    if (vs.length) {
      const v = (x) => 'v' + String(x).replace(/^v/, '')
      return {
        version: v(vs[vs.length - 1].version),
        shipped: vs.slice(-6).reverse().map(e => ({ version: v(e.version), date: fmtDate(e.date) })),
      }
    }
  }
  // fallback: git tags
  const tags = git(cwd, `tag --sort=-creatordate`).split('\n').filter(Boolean).slice(0, 6)
  if (tags.length) {
    return {
      version: tags[0],
      shipped: tags.map(t => ({ version: t, date: fmtDate(git(cwd, `log -1 --format=%ad --date=short ${t}`)) })),
    }
  }
  return { version: '—', shipped: [] }
}

const prData = (repo) => {
  const open = safeJson(gh(`api "repos/${repo}/pulls?state=open&per_page=30" --jq '[.[]|{number,created:.created_at}]'`)) || []
  const d = (ms) => new Date(now - ms).toISOString().slice(0, 10)
  const merged30 = num(gh(`api -X GET search/issues -f q="repo:${repo} is:pr is:merged merged:>=${d(30 * DAY)}" --jq .total_count`))
  const merged60 = num(gh(`api -X GET search/issues -f q="repo:${repo} is:pr is:merged merged:${d(60 * DAY)}..${d(30 * DAY)}" --jq .total_count`))
  const openIssues = num(gh(`api -X GET search/issues -f q="repo:${repo} is:issue is:open" --jq .total_count`))
  return {
    merged30, mergedDelta: merged30 - merged60, openIssues,
    inFlight: open.map(o => ({ number: o.number, ageDays: Math.max(0, Math.round((now - new Date(o.created).getTime()) / DAY)) })),
  }
}

const projects = []
const blockers = []

for (const p of cfg.projects) {
  const cwd = p.path
  const hasGit = cwd && existsSync(join(cwd, '.git'))
  const vi = hasGit ? versionInfo(cwd) : { version: '—', shipped: [] }
  const updatedDays = hasGit ? lastCommitDays(cwd) : 999
  const c30 = hasGit ? commits(cwd, 30) : 0
  const c60 = hasGit ? commits(cwd, 60, 30) : 0
  const pr = p.repo ? prData(p.repo) : { merged30: 0, mergedDelta: 0, openIssues: 0, inFlight: [] }
  const readme = hasGit && existsSync(join(cwd, 'README.md'))

  const rubric = [
    { label: 'README', pass: !!readme },
    { label: 'Active <14d', pass: updatedDays < 14 },
    { label: 'Next pinned', pass: !!p.next },
    { label: 'No blockers', pass: !p.blocker },
  ]
  const passes = rubric.filter(r => r.pass).length
  const health = passes === rubric.length ? 'gold' : passes >= rubric.length - 1 ? 'silver' : 'bronze'

  if (p.blocker) blockers.push({ project: p.name, text: p.blocker })

  projects.push({
    id: p.id, name: p.name, blurb: p.blurb, status: p.status,
    health, version: vi.version, updatedDays,
    next: p.next || '', nextSuggested: p.nextSuggested || '',
    momentum: {
      commits: c30, commitsDelta: c30 - c60,
      prs: pr.merged30, prsDelta: pr.mergedDelta,
      issues: pr.openIssues, issuesDelta: 0,
      spark: hasGit ? sparkWeeks(cwd) : [],
    },
    rubric,
    shipped: vi.shipped,
    inFlight: pr.inFlight,
    owners: p.owners || [],
    tags: p.tags || [],
    links: p.links || [],
    show: p.show || undefined,
    internal: !!p.internal,
  })
}

const data = {
  org: cfg.org,
  mission: cfg.mission,
  generatedAt: new Date(now).toISOString(),
  refreshedAgoHours: 0,
  blockers,
  projects,
}

// ---- sanitization gate ----
let json = JSON.stringify(data, null, 2)
const offenders = []
for (const t of (cfg.denylist || [])) {
  const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  if (re.test(json)) offenders.push(t)
}
for (const t of (cfg.denylistRaw || [])) {
  if (json.toLowerCase().includes(t.toLowerCase())) offenders.push(t)
}
if (offenders.length) {
  console.error('SANITIZATION FAILED — denylisted terms present in public data.json:', offenders)
  console.error('Fix the source (curated config or the field pulling this) before publishing.')
  process.exit(1)
}

writeFileSync(join(ROOT, 'public', 'data.json'), json + '\n')
console.log(`✓ wrote public/data.json — ${projects.length} projects, ${blockers.length} blocker(s), sanitization passed`)
for (const p of projects) {
  console.log(`  ${p.name.padEnd(20)} ${p.health.padEnd(6)} ${p.momentum.commits} commits/30d (Δ${p.momentum.commitsDelta}), ${p.momentum.prs} merged PR/30d, ${p.inFlight.length} open PR, ${p.momentum.issues} issues, ${p.version}, updated ${p.updatedDays}d`)
}
