# clawd.fun

A pump.fun-style launchpad where every coin is **Claude × something**.

Type anything — cats, pizza, the moon — and clawd.fun pairs it with Claude: it drafts a name, a ticker,
a Claude-flavored pitch and procedural coin art, then launches it on a bonding curve.

**This is a simulation.** No wallet, no chain, no real money. You start with ◎25 of play SOL
(the faucet gives more), and everything is saved in your browser's localStorage.

## Features

- **Pair with Claude** — quick-pair bar, preset chips, and a "ask Claude for another take" re-roll for names/tickers/pitches
- **Bonding curve** — pump.fun-style constant product with virtual reserves (30 SOL / 1.073B tokens, 1% fee);
  a coin graduates once its 793.1M curve tokens sell (~◎85, ~$69k market cap)
- **Trading** — buy/sell with quotes, price impact, and your bags under "my bags"
- **Live market** — simulated traders, new launches, a scrolling activity ticker, and King of the Hill
- **Coin pages** — market-cap chart, trade history, and a reply thread
- Light and dark mode, works on mobile

## Run it

Static files only — open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

---

Unofficial fan project. Not affiliated with or endorsed by Anthropic.
