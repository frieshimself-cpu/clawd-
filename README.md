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
