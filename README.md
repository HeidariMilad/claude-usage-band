# usage-band

A Claude Code mod that keeps your plan usage in view: a card in the band above the prompt with your
5-hour session limit, weekly limit, context window fill and session cost. Each meter has a small pill
bar (blue, amber from 75%, red from 90%) and shows when its window resets. It updates after every
reply and whenever a limit moves by a point. Works in the Claude desktop app and the terminal.

Limit windows appear on Pro and Max plans; with an API key you see context and cost only.

## Install

At the prompt of a terminal session:

```
/plugin install usage-band --marketplace HeidariMilad/claude-usage-band
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

From a shell:

```bash
claude plugin install usage-band --marketplace HeidariMilad/claude-usage-band
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with
`HeidariMilad/claude-usage-band`, then Add plugin.

## Develop

```bash
claude plugin validate .
claude plugin test .
```

## License

MIT
