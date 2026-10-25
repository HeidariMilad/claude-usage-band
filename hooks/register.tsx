import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Usage } from '../types'

const usage = atom({ plugin: 'usage-band', key: 'usage' } as const, null)

const LABELS: Record<string, string> = {
  five_hour: 'Session',
  seven_day: 'Weekly',
  spend_limit: 'Spend',
}

const clamp = (percent: number) => Math.min(100, Math.max(0, percent))

const tint = (percent: number) => (percent >= 90 ? '#d9534f' : percent >= 75 ? '#e0a030' : '#3b82f6')

// A pill like the desktop's own Context meter; the translucent track reads on light and dark.
const pill = (percent: number) => {
  const fill = Math.max(10, (clamp(percent) / 100) * 48)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="10" viewBox="0 0 48 10"><rect width="48" height="10" rx="5" fill="#8884" /><rect width="${fill}" height="10" rx="5" fill="${tint(percent)}" /></svg>`
}

const until = (iso: string | undefined, now: number) => {
  if (!iso) return undefined
  const mins = Math.max(0, Math.round((Date.parse(iso) - now) / 60000))
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  return `resets in ${d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`}`
}

const thousands = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const { context, rateLimits, cost } = await $.session.usage()
    await update($, usage, () => ({ context, rateLimits, cost }))

    return next(e)
  })

  // Pushed after each turn and whenever a limit window moves a whole point.
  on('session.measure', async ($, e, next) => {
    const latest: Usage = { context: e.context, rateLimits: e.rateLimits, cost: e.cost }
    await update($, usage, () => latest)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const u = await read($, usage)
    if (e.props.hasSurvey || !u) return next(e)
    // Other mods (ponytail) share this slot: keep theirs and add ours below.
    // next(e) rejects only when nothing answers beneath (the test harness): the band still draws.
    const others = await next(e).catch(() => undefined)

    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const Svg = 'Svg' in ui ? ui.Svg : undefined
    const now = await $.clock.now()

    // `detail` is the caption under the label; the terminal has no Svg, so it gets the number alone.
    const meter = (label: string, percent: number, detail?: string) => (
      <Box flexDirection="column">
        <Box flexDirection="row" alignItems="center" gap="sm">
          <Text>{label}</Text>
          <Text dimColor tabular>{Math.round(percent)}%</Text>
          {Svg && <Svg source={pill(percent)} alt={`${label} ${Math.round(percent)}%`} width={48} height={10} />}
        </Box>
        {detail && <Text size="caption" dimColor>{detail}</Text>}
      </Box>
    )

    const ctx = u.context

    return (
      <Box flexDirection="column" gap="sm">
        {others}
        <Box flexDirection="row" flexWrap="wrap" columnGap="lg" rowGap="sm" borderStyle="round" borderColor="subtle" paddingX="md" paddingY="sm">
          {u.rateLimits.map(w => meter(LABELS[w.kind] ?? w.kind, w.percentUsed, until(w.resetsAt, now)))}
          {ctx.percent !== undefined &&
            meter('Context', ctx.percent, ctx.tokens === undefined ? undefined : `${thousands(ctx.tokens)} of ${thousands(ctx.window)}`)}
          {u.cost && (
            <Box flexDirection="column">
              <Box flexDirection="row" gap="sm">
                <Text>Cost</Text>
                <Text dimColor tabular>${u.cost.usd.toFixed(2)}</Text>
              </Box>
              <Text size="caption" dimColor>this session</Text>
            </Box>
          )}
        </Box>
      </Box>
    )
  })
}
