import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'usage-band',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 8, bodyColumns: 80, scroll: { offset: 0, bodyRows: 8 }, view: {} },
} as const

test('the band shows limit windows and context fill', async ($, on) => {
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000 }, rateLimits: [] },
  }))
  on('clock.now', () => ({ value: Date.parse('2026-10-25T13:47:00Z') }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure({
    context: { window: 200000, tokens: 62000, percent: 31 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 42 }, { kind: 'seven_day', percentUsed: 12, resetsAt: '2026-10-28T14:00:00.000Z' }],
    cost: { usd: 1.5 },
    changed: ['context', 'rateLimits', 'cost'],
  })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    for (const text of ['Session', 'Weekly', '42%', '12%', 'Context', '31%', '62k of 200k', '$1.50']) {
      expect((await ui.find({ type: 'Text', text }))?.text).toBe(text)
    }
    // Wednesday in UTC and in every zone within ±10h of it.
    expect((await ui.find({ type: 'Text', text: /^resets / }))?.text).toMatch(/^resets Wed /)
    await ui.unmount()
  }
})
