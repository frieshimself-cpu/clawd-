# clawd.fun

A pump.fun-style launchpad where every coin is **Claude × something**.

Type anything — cats, pizza, the moon — and clawd.fun pairs it with Claude: it drafts a name, a ticker,
a Claude-flavored pitch and procedural coin art, then launches it on a bonding curve.

**This is a simulation.** No wallet, no chain, no real money. You start with ◎25 of play SOL
(the faucet gives more), and everything is saved in your browser's localStorage.

## Features

- **Pair with Claude**: quick-pair bar and presets; auto-drafted name, ticker, pitch and coin art (or upload your own image)
- **Bonding curve**: pump.fun-style constant product with virtual reserves (30 SOL / 1.073B tokens, 1% fee);
  a coin graduates once its 793.1M curve tokens sell (~85 SOL raised, ~$62K market cap)
- **Coin pages** (`#/coin/<id>`): candlestick chart with volume and crosshair (15s to 15m), buy/sell with live quotes
  and price impact, position and PnL, bonding-curve progress, top holders, trades and a reply thread
- **Board**: trending / new / market cap / about to graduate / graduated / your coins, King of the Hill, search (`/` to focus)
- **Portfolio**: balance, holdings value, unrealized PnL, positions and coins you launched
- **Live market**: simulated traders and launches, with a live activity feed in the header
- Dark and light themes, responsive down to phone width

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffrieshimself-cpu%2Fclawd-&project-name=clawd-fun&repository-name=clawd-fun)

It's a plain static site: no build step, no environment variables. Either:

- **Dashboard:** vercel.com → *Add New… → Project* → import this repo. Leave the framework preset on
  **Other**, and leave the build command and output directory empty. Click *Deploy*.
- **CLI:**
  ```sh
  npm i -g vercel
  vercel          # preview deploy
  vercel --prod   # production deploy
  ```

`vercel.json` turns on clean URLs, adds basic security headers, and makes sure browsers pick up new
`app.js` / `style.css` right after each deploy.

## Run locally

Static files only — open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

---

Unofficial fan project. Not affiliated with or endorsed by Anthropic.
