/* clawd.fun — a play-money, pump.fun-style launchpad where every coin is "Claude × something".
 * Everything is simulated in the browser: no wallets, no chain, no real money. */
(() => {
  "use strict";

  // ======================================================================
  // Bonding curve — pump.fun-style constant product with virtual reserves
  // ======================================================================
  const SOL_USD = 150;
  const TOTAL_SUPPLY = 1_000_000_000;
  const V_SOL0 = 30;
  const V_TOK0 = 1_073_000_000;
  const CURVE_TOKENS = 793_100_000; // tokens sold on the curve before graduation
  const FEE = 0.01;
  const START_BALANCE = 25;
  const FAUCET = 10;
  const MAX_COINS = 60;
  const STORE_KEY = "clawd.fun/v2";

  const GRAD_SOL = (V_SOL0 * V_TOK0) / (V_TOK0 - CURVE_TOKENS) - V_SOL0; // ≈ 85 SOL raised at graduation
  const price = (c) => c.vSol / c.vTok; // SOL per token
  const mcapSol = (c) => price(c) * TOTAL_SUPPLY;
  const mcapUsd = (c) => mcapSol(c) * SOL_USD;
  const progress = (c) => Math.min(1, c.sold / CURVE_TOKENS);
  const GRAD_MCAP_USD = ((V_SOL0 + GRAD_SOL) / (V_TOK0 - CURVE_TOKENS)) * TOTAL_SUPPLY * SOL_USD;

  function quoteBuy(c, sol) {
    let net = sol * (1 - FEE);
    const k = c.vSol * c.vTok;
    let out = c.vTok - k / (c.vSol + net);
    const left = CURVE_TOKENS - c.sold;
    let capped = false;
    if (out > left) {
      out = left;
      net = k / (c.vTok - out) - c.vSol;
      sol = net / (1 - FEE);
      capped = true;
    }
    const newPrice = (c.vSol + net) / (c.vTok - out);
    return { out: Math.max(0, out), net, sol, fee: sol - net, capped, impact: newPrice / price(c) - 1 };
  }
  function quoteSell(c, amt) {
    amt = Math.max(0, Math.min(amt, c.sold));
    const k = c.vSol * c.vTok;
    const gross = c.vSol - k / (c.vTok + amt);
    const newPrice = (c.vSol - gross) / (c.vTok + amt);
    return { amt, gross, sol: gross * (1 - FEE), fee: gross * FEE, impact: newPrice / price(c) - 1 };
  }

  // ======================================================================
  // Pairing flavor
  // ======================================================================
  const PRESETS = [
    ["Cats", "🐈"], ["Pizza", "🍕"], ["The Moon", "🌕"], ["Frogs", "🐸"], ["Coffee", "☕"],
    ["Crabs", "🦀"], ["Haiku", "🌸"], ["Dogs", "🐕"], ["Tea", "🍵"], ["Rockets", "🚀"],
    ["Penguins", "🐧"], ["Bananas", "🍌"], ["Robots", "🤖"], ["Ducks", "🦆"], ["Ramen", "🍜"],
    ["Wizards", "🧙"], ["Tacos", "🌮"], ["Sharks", "🦈"], ["Books", "📚"], ["Mushrooms", "🍄"],
    ["Octopus", "🐙"], ["Sloths", "🦥"], ["Donuts", "🍩"], ["Owls", "🦉"],
  ];
  const EMOJI_WORDS = {
    cat: "🐈", kitten: "🐈", dog: "🐕", pup: "🐶", puppy: "🐶", frog: "🐸", pepe: "🐸", moon: "🌕", sun: "☀️", pizza: "🍕",
    coffee: "☕", tea: "🍵", crab: "🦀", lobster: "🦞", haiku: "🌸", poem: "📜", rocket: "🚀", mars: "🔴",
    penguin: "🐧", banana: "🍌", robot: "🤖", duck: "🦆", ramen: "🍜", noodle: "🍜", wizard: "🧙", taco: "🌮",
    shark: "🦈", book: "📚", mushroom: "🍄", fire: "🔥", ghost: "👻", alien: "👽", dragon: "🐉", horse: "🐴",
    whale: "🐋", fish: "🐟", bee: "🐝", honey: "🍯", beer: "🍺", wine: "🍷", cake: "🍰", cookie: "🍪",
    burger: "🍔", fries: "🍟", sushi: "🍣", donut: "🍩", music: "🎵", guitar: "🎸", game: "🎮", chess: "♟️",
    code: "💻", computer: "💻", brain: "🧠", money: "💸", gold: "🥇", diamond: "💎", heart: "❤️", love: "💘",
    star: "⭐", rainbow: "🌈", ocean: "🌊", tree: "🌳", flower: "🌸", cactus: "🌵", snow: "❄️", monkey: "🐒",
    ape: "🦍", bear: "🐻", bull: "🐂", pig: "🐷", cow: "🐄", chicken: "🐔", egg: "🥚", bread: "🍞", cheese: "🧀",
    avocado: "🥑", apple: "🍎", owl: "🦉", octopus: "🐙", snail: "🐌", turtle: "🐢", unicorn: "🦄", sloth: "🦥",
    fox: "🦊", lion: "🦁", tiger: "🐯", panda: "🐼", koala: "🐨", rabbit: "🐇", bunny: "🐰", mouse: "🐭",
    hamster: "🐹", wolf: "🐺", butterfly: "🦋", dino: "🦖", dinosaur: "🦖", croissant: "🥐", pancake: "🥞",
    icecream: "🍦", popcorn: "🍿", volcano: "🌋", planet: "🪐", space: "🌌", ninja: "🥷", pirate: "🏴‍☠️",
    king: "👑", queen: "👑", cowboy: "🤠", skull: "💀", clown: "🤡", trophy: "🏆", soccer: "⚽", basketball: "🏀",
  };
  const PITCHES = [
    (p) => `${p}, but it asks a clarifying question first.`,
    (p) => `Claude read the entire ${p} whitepaper and left thoughtful, constructive comments.`,
    (p) => `What if ${p} had a million-token context window?`,
    (p) => `Claude was asked to write a haiku about ${p}. The haiku is now a coin.`,
    (p) => `Helpful, harmless, honest ${p}.`,
    (p) => `${p} with extended thinking turned on. It's been thinking for a while.`,
    (p) => `"I'd be happy to help you with ${p}!" — the entire roadmap.`,
    (p) => `Constitutionally aligned ${p}. Refuses to rug.`,
    (p) => `Claude wrote the tests for ${p}. They all pass. Suspicious.`,
    (p) => `${p} that apologizes for the confusion and tries again.`,
    (p) => `Pair-programmed ${p}. Claude drove, you vibed.`,
    (p) => `Great question! ${p} is a nuanced topic with several considerations.`,
    (p) => `${p}, refactored into smaller, well-named functions.`,
    (p) => `Claude built an artifact about ${p}. You can click on it.`,
  ];
  const REPLIES = [
    "I'd be happy to help you ape into this 🙂",
    "You're absolutely right — this graduates today.",
    "Let me think step by step… 1) buy 2) hold 3) ✳",
    "I apologize for the confusion, I sold the bottom.",
    "dev is based, pitch passed the vibe check",
    "chart looks like a well-tuned learning rate",
    "certified helpful, harmless and bullish",
    "my entire context window is this ticker",
    "reviewed the tokenomics, have a few concerns. bought anyway",
    "who else pairing this with their morning coffee",
    "king of the hill incoming ✳✳✳",
    "gm from the artifact panel",
    "extended thinking says this is the one",
    "ngl the pairing is kind of perfect",
    "curve is filling fast, don't fade this",
    "the thread is more wholesome than most",
  ];
  const TICKER_STYLES = [
    (w) => "CLAWD" + w.slice(0, 4),
    (w) => w.slice(0, 6) + "AI",
    (w) => "C" + w.slice(0, 7),
    (w) => w.slice(0, 5) + "CLD",
    (w) => "CLAUDE" + w.slice(0, 3),
  ];
  const NAME_STYLES = [
    (p) => `Claude × ${p}`,
    (p) => `Clawd ${p}`,
    (p) => `${p} Claude`,
    (p) => `Claude's ${p}`,
    (p) => `Sonnet of ${p}`,
    (p) => `Opus ${p}`,
    (p) => `Haiku ${p}`,
  ];

  // ======================================================================
  // Helpers
  // ======================================================================
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const cap = (s) => s.replace(/(^|\s)\S/g, (m) => m.toUpperCase());
  const uid = () => Math.random().toString(36).slice(2, 10);
  const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const b58 = (n) => { let s = ""; for (let i = 0; i < n; i++) s += B58[Math.floor(Math.random() * B58.length)]; return s; };
  const newWallet = () => { const s = b58(8); return s.slice(0, 4) + "…" + s.slice(4); };
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const hash = (str) => { let h = 2166136261; for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const who = (w) => (w === "you" ? "You" : w);

  const fmtUsd = (n) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };
  const fmtTok = (n) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toFixed(0);
  };
  const fmtSol = (n) => (Math.abs(n) >= 100 ? n.toFixed(1) : Math.abs(n) >= 1 ? n.toFixed(2) : n.toFixed(3));
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  // Tiny prices as 0.0₆412 (the subscript counts the zeros), like most DEX UIs.
  const fmtPrice = (n) => {
    if (n >= 0.01) return `$${n.toFixed(4)}`;
    const s = n.toExponential(2); // e.g. 4.12e-7
    const [m, e] = s.split("e");
    const zeros = -parseInt(e, 10) - 1;
    const digits = m.replace(".", "");
    return `$0.0${String(zeros).split("").map((d) => SUB[d]).join("")}${digits}`;
  };
  const fmtPct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(Math.abs(n) >= 100 ? 0 : 1)}%`;
  const ago = (t) => {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return `${Math.floor(s)}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };
  const setText = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
  const setHTML = (el, v) => { if (el && el._html !== v) { el.innerHTML = v; el._html = v; } };

  function emojiFor(pair) {
    const hit = PRESETS.find(([n]) => n.toLowerCase() === pair.trim().toLowerCase());
    if (hit) return hit[1];
    for (const w of pair.toLowerCase().split(/[^a-z]+/)) {
      if (!w) continue;
      const stem = w.replace(/(es|s)$/, "");
      if (EMOJI_WORDS[w]) return EMOJI_WORDS[w];
      if (EMOJI_WORDS[stem]) return EMOJI_WORDS[stem];
      if (EMOJI_WORDS[w.replace(/s$/, "")]) return EMOJI_WORDS[w.replace(/s$/, "")];
    }
    return pick(["✨", "🌀", "🪐", "🎲", "🧩", "🫧", "🔮", "🪄"]);
  }
  function tickerFor(pair) {
    const w = pair.toUpperCase().replace(/^THE\s+/, "").replace(/[^A-Z0-9]/g, "") || "THING";
    return pick(TICKER_STYLES)(w).slice(0, 10);
  }
  function draftFor(pair) {
    const p = cap(pair.trim());
    return { pair: p, name: pick(NAME_STYLES)(p), ticker: tickerFor(p), emoji: emojiFor(p), desc: pick(PITCHES)(p) };
  }

  // Procedural coin art: a warm gradient with a Claude-ish spark, plus the paired emoji.
  function artSVG(c) {
    const h = c.hue;
    const seed = hash(c.id);
    const rays = 6 + (seed % 6);
    const rot = hash(c.ticker) % 60;
    let spark = "";
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * 360 + rot;
      const len = 30 + (hash(c.id + i) % 12);
      spark += `<rect x="47" y="${50 - len}" width="6" height="${len}" rx="3" transform="rotate(${a} 50 50)"/>`;
    }
    const gid = "g" + c.id.replace(/[^a-z0-9]/gi, "");
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${(h + 15) % 360} 68% 60%)"/><stop offset="1" stop-color="hsl(${(h + 330) % 360} 55% 42%)"/></linearGradient></defs>
      <rect width="100" height="100" fill="url(#${gid})"/><g fill="rgba(255,248,238,.3)">${spark}</g></svg>`;
  }
  const artHTML = (c, size = "") => c.image
    ? `<div class="coin-art ${size}"><img src="${esc(c.image)}" alt="" loading="lazy"></div>`
    : `<div class="coin-art ${size}">${artSVG(c)}<span class="emo">${esc(c.emoji)}</span></div>`;
  const avatar = (w, size) => {
    const h = hash(w) % 360;
    const sz = size ? `width:${size}px;height:${size}px;display:inline-block;vertical-align:-2px;` : "";
    return `<span class="avatar" style="${sz}background:linear-gradient(135deg,hsl(${h} 70% 60%),hsl(${(h + 70) % 360} 65% 42%))"></span>`;
  };
  const ICON = {
    chat: `<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
    back: `<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>`,
    crown: `<svg viewBox="0 0 24 24"><path d="M3 7l4 4 5-6 5 6 4-4-2 11H5z"/></svg>`,
    plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
    cap: `<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/></svg>`,
  };

  // ======================================================================
  // State
  // ======================================================================
  let state = load() || seed();
  let dirty = false;

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !Array.isArray(s.coins) || typeof s.balance !== "number") return null;
      s.cost ||= {}; s.feed ||= [];
      return s;
    } catch { return null; }
  }
  let saveTimer = 0;
  function save() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 500);
  }
  function flush() {
    if (!dirty) return;
    dirty = false;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* quota or storage blocked — keep running in memory */ }
  }
  window.addEventListener("pagehide", flush);

  function newCoin(d, creator, createdAt = Date.now()) {
    const id = uid();
    return {
      id, addr: b58(38) + "cLaude", pair: d.pair, name: d.name, ticker: d.ticker.toUpperCase(),
      emoji: d.emoji || "✨", image: d.image || null, desc: d.desc, hue: hash(d.pair + id) % 360, creator, createdAt,
      vSol: V_SOL0, vTok: V_TOK0, sold: 0, volume: 0, graduated: false, graduatedAt: null,
      history: [{ t: createdAt, p: V_SOL0 / V_TOK0, v: 0 }], trades: [], replies: [], holders: {}, lastTrade: createdAt,
    };
  }

  function seed() {
    const s = { balance: START_BALANCE, cost: {}, coins: [], feed: [] };
    const now = Date.now();
    const picks = [...PRESETS].sort(() => Math.random() - 0.5).slice(0, 14);
    picks.forEach(([pair], idx) => {
      const c = newCoin(draftFor(pair), newWallet(), now - rand(8, 360) * 60_000);
      const span = now - c.createdAt;
      const heat = idx === 0 ? 1.4 : Math.random(); // the first coin runs hot and graduates
      const n = Math.floor(rand(20, 70) * (0.6 + heat));
      trade(c, "buy", rand(0.3, 2), c.creator, c.createdAt + 1000, true); // dev buy
      for (let i = 0; i < n; i++) {
        const t = c.createdAt + (span * (i + 1)) / (n + 1);
        if (Math.random() < 0.6 + heat * 0.12) trade(c, "buy", rand(0.05, 1.5 + heat * 4), newWallet(), t, true);
        else botSell(c, t, true);
        if (c.graduated) break;
      }
      const nr = Math.floor(rand(1, 7));
      for (let i = 0; i < nr; i++) c.replies.push({ who: newWallet(), text: pick(REPLIES), t: c.createdAt + rand(0, span) });
      c.replies.sort((a, b) => a.t - b.t);
      s.coins.push(c);
    });
    return s;
  }

  // Executes a trade on the curve. `w` is the trader's wallet label ("you" is the player).
  function trade(c, side, amount, w, t = Date.now(), silent = false) {
    if (c.graduated) return null;
    let res;
    if (side === "buy") {
      const q = quoteBuy(c, amount);
      if (q.out <= 0.5) return null;
      c.vSol += q.net; c.vTok -= q.out; c.sold += q.out; c.volume += q.sol;
      c.holders[w] = (c.holders[w] || 0) + q.out;
      res = { side, sol: q.sol, tok: q.out };
    } else {
      const have = c.holders[w] || 0;
      const q = quoteSell(c, Math.min(amount, have));
      if (q.amt <= 0.5) return null;
      c.vSol -= q.gross; c.vTok += q.amt; c.sold -= q.amt; c.volume += q.gross;
      c.holders[w] = have - q.amt;
      if (c.holders[w] < 1) delete c.holders[w];
      res = { side, sol: q.sol, tok: q.amt };
    }
    c.history.push({ t, p: price(c), v: res.sol });
    if (c.history.length > 500) c.history.splice(1, c.history.length - 500);
    c.trades.unshift({ id: uid(), who: w, side, sol: res.sol, tok: res.tok, t, mc: mcapUsd(c) });
    if (c.trades.length > 60) c.trades.length = 60;
    c.lastTrade = t;
    if (c.sold >= CURVE_TOKENS - 1) {
      c.graduated = true;
      c.graduatedAt = t;
      if (!silent) pushFeed({ kind: "grad", coin: c.id, t });
    }
    if (!silent) pushFeed({ kind: side, coin: c.id, who: w, sol: res.sol, t });
    return res;
  }
  function botSell(c, t, silent) {
    const sellers = Object.keys(c.holders).filter((w) => w !== "you" && c.holders[w] > 1);
    if (!sellers.length) return null;
    const w = pick(sellers);
    const frac = Math.random() < 0.3 ? 1 : rand(0.2, 0.8);
    return trade(c, "sell", c.holders[w] * frac, w, t, silent);
  }
  function pushFeed(e) {
    e.id = uid();
    state.feed.unshift(e);
    if (state.feed.length > 30) state.feed.length = 30;
  }
  const coinById = (id) => state.coins.find((c) => c.id === id);
  const bag = (c) => c.holders.you || 0;

  function change(c, windowMs) {
    const since = Date.now() - windowMs;
    let past = c.history[0];
    for (let i = c.history.length - 1; i >= 0; i--) { if (c.history[i].t <= since) { past = c.history[i]; break; } }
    return (price(c) / past.p - 1) * 100;
  }
  function recentVolume(c, ms) {
    const since = Date.now() - ms;
    let v = 0;
    for (let i = c.history.length - 1; i >= 0 && c.history[i].t >= since; i--) v += c.history[i].v || 0;
    return v;
  }

  // ======================================================================
  // Player actions
  // ======================================================================
  function youBuy(c, sol, quiet = false) {
    if (c.graduated) return toast("This coin has graduated — the curve is closed.", "err"), false;
    if (!(sol > 0)) return false;
    if (sol > state.balance + 1e-9) return toast("Insufficient balance. Click your balance to top up.", "err"), false;
    const r = trade(c, "buy", sol, "you");
    if (!r) return toast("Nothing left to buy on this curve.", "err"), false;
    state.balance = Math.max(0, state.balance - r.sol);
    state.cost[c.id] = (state.cost[c.id] || 0) + r.sol;
    if (!quiet) toast(`Bought ${fmtTok(r.tok)} $${c.ticker} for ${fmtSol(r.sol)} SOL`, "ok");
    if (c.graduated) toast(`$${c.ticker} graduated — you completed the curve 🎓`, "info");
    save();
    return true;
  }
  function youSell(c, tokens) {
    if (c.graduated) return toast("This coin has graduated — the curve is closed.", "err"), false;
    const have = bag(c);
    tokens = Math.min(tokens, have);
    if (!(tokens > 0)) return toast(`You don't hold any $${c.ticker}.`, "err"), false;
    const frac = tokens / have;
    const r = trade(c, "sell", tokens, "you");
    if (!r) return false;
    state.balance += r.sol;
    state.cost[c.id] = (state.cost[c.id] || 0) * (1 - frac);
    if (!bag(c)) delete state.cost[c.id];
    toast(`Sold ${fmtTok(r.tok)} $${c.ticker} for ${fmtSol(r.sol)} SOL`, "ok");
    save();
    return true;
  }
  function positionValue(c) {
    const b = bag(c);
    if (!b) return 0;
    return c.graduated ? b * price(c) : quoteSell(c, b).sol;
  }

  // ======================================================================
  // Toasts
  // ======================================================================
  function toast(msg, kind = "info") {
    const box = $("#toasts");
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.innerHTML = `<span class="ic">${kind === "ok" ? "✓" : kind === "err" ? "!" : "✳"}</span><span></span>`;
    el.lastChild.textContent = msg;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 220); }, 3200);
  }

  // ======================================================================
  // Keyed list sync — updates DOM nodes in place so clicks are never lost
  // ======================================================================
  function syncList(container, items, key, create, update, reorder) {
    const existing = new Map();
    for (const el of container.children) if (el.dataset.key) existing.set(el.dataset.key, el);
    const keep = new Set();
    const els = items.map((it) => {
      const k = key(it);
      keep.add(k);
      let el = existing.get(k);
      if (!el) { el = create(it); el.dataset.key = k; }
      update(el, it);
      return el;
    });
    for (const [k, el] of existing) if (!keep.has(k)) el.remove();
    if (reorder) {
      els.forEach((el, i) => { if (container.children[i] !== el) container.insertBefore(el, container.children[i] || null); });
    } else {
      for (const el of els) if (!el.parentNode) container.appendChild(el);
    }
  }

  // ======================================================================
  // Header: stats + live feed
  // ======================================================================
  let lastFeedId = null;
  function updateHeader() {
    setText($("#walletBal"), state.balance.toFixed(2));
    const grads = state.coins.filter((c) => c.graduated).length;
    const vol = state.coins.reduce((a, c) => a + c.volume, 0);
    setHTML($("#stats"), `<span>Coins<b>${state.coins.length}</b></span><span>Volume<b>${fmtUsd(vol * SOL_USD)}</b></span>
      <span>Graduated<b>${grads}</b></span><span>SOL<b>$${SOL_USD}</b></span>`);

    const feed = $("#feed");
    const fresh = [];
    for (const e of state.feed) { if (e.id === lastFeedId) break; fresh.push(e); }
    if (!fresh.length) return;
    const firstRender = lastFeedId === null;
    lastFeedId = state.feed[0].id;
    for (const e of fresh.slice(0, 10).reverse()) {
      const c = coinById(e.coin);
      if (!c) continue;
      const el = document.createElement("a");
      el.href = `#/coin/${c.id}`;
      el.className = `feed-item ${e.kind}`;
      if (firstRender) el.style.animation = "none";
      const tk = `<b>$${esc(c.ticker)}</b>`;
      el.innerHTML = artHTML(c) + (
        e.kind === "new" ? `<span>${esc(who(c.creator))} launched ${tk}</span>` :
        e.kind === "grad" ? `<span>${tk} graduated 🎓</span>` :
        `<span>${esc(who(e.who))} <span class="${e.kind === "buy" ? "up" : "down"}">${e.kind === "buy" ? "bought" : "sold"} ${fmtSol(e.sol)} SOL</span> of ${tk}</span>`);
      feed.prepend(el);
    }
    while (feed.children.length > 12) feed.lastChild.remove();
  }

  // ======================================================================
  // Router
  // ======================================================================
  const app = $("#app");
  let view = null;
  function route() {
    const h = location.hash.replace(/^#/, "") || "/";
    const parts = h.split("/").filter(Boolean);
    let next;
    if (parts[0] === "coin" && parts[1]) next = CoinView(parts[1]);
    else if (parts[0] === "portfolio") next = PortfolioView();
    else if (parts[0] === "how") next = HowView();
    else next = BoardView();
    view?.unmount?.();
    view = next;
    app.innerHTML = "";
    view.mount();
    $$(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.nav === view.nav));
    if (!view.keepScroll) window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  // ======================================================================
  // Board view
  // ======================================================================
  let boardFilter = "trending";
  let query = "";
  const FILTERS = [
    ["trending", "Trending"], ["new", "New"], ["mcap", "Market cap"], ["near", "About to graduate"],
    ["graduated", "Graduated"], ["mine", "Your coins"],
  ];

  function boardList() {
    let list = state.coins.slice();
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((c) => `${c.name} ${c.ticker} ${c.pair} ${c.desc}`.toLowerCase().includes(q));
    }
    const now = Date.now();
    switch (boardFilter) {
      case "new": return list.sort((a, b) => b.createdAt - a.createdAt);
      case "mcap": return list.sort((a, b) => mcapUsd(b) - mcapUsd(a));
      case "near": return list.filter((c) => !c.graduated && progress(c) >= 0.4).sort((a, b) => progress(b) - progress(a));
      case "graduated": return list.filter((c) => c.graduated).sort((a, b) => b.graduatedAt - a.graduatedAt);
      case "mine": return list.filter((c) => c.creator === "you" || bag(c) > 0).sort((a, b) => b.createdAt - a.createdAt);
      default: {
        const score = (c) => recentVolume(c, 15 * 60_000) + (now - c.createdAt < 20 * 60_000 ? 3 : 0) + progress(c) * 2;
        return list.filter((c) => !c.graduated).sort((a, b) => score(b) - score(a));
      }
    }
  }

  function createCard(c) {
    const a = document.createElement("a");
    a.className = "card";
    a.href = `#/coin/${c.id}`;
    a.innerHTML = `${artHTML(c)}
      <div class="card-body">
        <div class="card-by">${avatar(c.creator, 14)}<span class="addr">${esc(who(c.creator))}</span><span>·</span><span data-f="age"></span><span data-f="badges"></span></div>
        <div class="card-title">${esc(c.name)} <span class="tk">$${esc(c.ticker)}</span></div>
        <div class="card-desc">${esc(c.desc)}</div>
        <div class="card-foot">
          <span class="card-mc"><span class="l">MC</span><span data-f="mc"></span></span>
          <span class="card-chg" data-f="chg"></span>
          <span class="card-replies">${ICON.chat}<span data-f="rep"></span></span>
        </div>
        <div class="progress"><span data-f="prog"></span></div>
      </div>`;
    return a;
  }
  function updateCard(el, c) {
    const mc = mcapUsd(c);
    setText($('[data-f="mc"]', el), fmtUsd(mc));
    const ch = change(c, 3600_000);
    const chEl = $('[data-f="chg"]', el);
    setText(chEl, fmtPct(ch));
    chEl.className = `card-chg ${ch >= 0 ? "up" : "down"}`;
    setText($('[data-f="age"]', el), ago(c.createdAt));
    setText($('[data-f="rep"]', el), String(c.replies.length));
    const prog = $('[data-f="prog"]', el);
    const w = `${(progress(c) * 100).toFixed(1)}%`;
    if (prog.style.width !== w) prog.style.width = w;
    prog.parentElement.classList.toggle("done", c.graduated);
    const badges = (c.graduated ? `<span class="badge grad">${ICON.cap} Graduated</span>` : "") + (bag(c) > 0 ? `<span class="badge you">Holding</span>` : "");
    setHTML($('[data-f="badges"]', el), badges);
    if (el._mc !== undefined && Math.abs(mc - el._mc) > 1) {
      el.classList.remove("tick-up", "tick-down");
      void el.offsetWidth;
      el.classList.add(mc > el._mc ? "tick-up" : "tick-down");
    }
    el._mc = mc;
  }

  function kothHTML(k) {
    return `<div class="koth-label">${ICON.crown} King of the hill</div>
      <div class="koth-top">${artHTML(k, "lg")}
        <div style="min-width:0">
          <h2>${esc(k.name)}</h2>
          <div class="muted mono">$${esc(k.ticker)} · by ${esc(who(k.creator))}</div>
          <div class="muted" style="margin-top:6px;font-size:13px">${esc(k.desc)}</div>
        </div>
      </div>
      <div class="koth-stats">
        <div class="kstat"><div class="l">Market cap</div><div class="v" data-k="mc"></div></div>
        <div class="kstat"><div class="l">1h change</div><div class="v" data-k="chg"></div></div>
        <div class="kstat"><div class="l">Holders</div><div class="v" data-k="h"></div></div>
      </div>
      <div>
        <div class="trade-row" style="margin-bottom:6px"><span>Bonding curve</span><b data-k="pct"></b></div>
        <div class="progress"><span data-k="prog"></span></div>
      </div>`;
  }

  function BoardView() {
    let grid, kothEl, lastReorder = 0, hovering = false;
    const v = {
      nav: "board",
      mount() {
        app.innerHTML = `
          <section class="hero">
            <div class="hero-main">
              <span class="eyebrow"><span class="pulse"></span>Live · play money</span>
              <h1>Pair anything with <span class="accent">Claude</span>.<br>Launch it in seconds.</h1>
              <p class="lead">Name a thing. We pair it with Claude, write the pitch, and put it on a bonding curve.
                Fill the curve to ${fmtUsd(GRAD_MCAP_USD)} market cap and it graduates.</p>
              <form class="pair-form" id="pairForm" autocomplete="off">
                <span class="prefix">Claude ×</span>
                <input id="pairInput" maxlength="24" placeholder="cats, pizza, the moon…" aria-label="Thing to pair with Claude" />
                <button class="btn btn-primary" type="submit">Pair it</button>
              </form>
              <div class="chips">${PRESETS.slice(0, 10).map(([n, e]) => `<button class="chip" data-pair="${esc(n)}">${e} ${esc(n)}</button>`).join("")}</div>
            </div>
            <a class="koth" id="koth"></a>
          </section>
          <section>
            <div class="board-head">
              <h2>Coins <span class="live" id="liveBadge"><i></i><span>Live</span></span></h2>
              <div class="seg" role="tablist" id="filters">${FILTERS.map(([k, l]) => `<button role="tab" data-f="${k}" class="${k === boardFilter ? "active" : ""}">${l}</button>`).join("")}</div>
            </div>
            <div class="grid" id="grid"></div>
            <div id="boardEmpty"></div>
          </section>`;
        grid = $("#grid");
        kothEl = $("#koth");
        $("#pairForm").addEventListener("submit", (e) => { e.preventDefault(); openCreate($("#pairInput").value.trim()); $("#pairInput").value = ""; });
        $(".chips").addEventListener("click", (e) => { const b = e.target.closest("[data-pair]"); if (b) openCreate(b.dataset.pair); });
        $("#filters").addEventListener("click", (e) => {
          const b = e.target.closest("[data-f]");
          if (!b) return;
          boardFilter = b.dataset.f;
          $$("#filters button").forEach((x) => x.classList.toggle("active", x === b));
          v.update(true);
        });
        // Freeze ordering while the pointer is over the grid so cards never move under the cursor.
        grid.addEventListener("pointerenter", () => { hovering = true; setLive(); });
        grid.addEventListener("pointerleave", () => { hovering = false; setLive(); });
        v.update(true);
      },
      update(force = false) {
        const now = Date.now();
        const reorder = force || (!hovering && now - lastReorder > 4000);
        if (reorder) lastReorder = now;
        const list = boardList().slice(0, 48);
        syncList(grid, list, (c) => c.id, createCard, updateCard, reorder);
        const empty = $("#boardEmpty");
        if (!list.length) {
          setHTML(empty, boardFilter === "mine" && !query
            ? `<div class="empty"><h3>No coins yet</h3><p>Launch a pairing or buy one from the board.</p><button class="btn btn-primary" data-launch>${ICON.plus} Launch coin</button></div>`
            : `<div class="empty"><h3>Nothing matches</h3><p>${query ? `No coins match “${esc(query)}”.` : "Nothing in this view yet."}</p></div>`);
        } else setHTML(empty, "");

        const k = state.coins.filter((c) => !c.graduated).sort((a, b) => mcapUsd(b) - mcapUsd(a))[0];
        if (!k) { kothEl.style.display = "none"; return; }
        kothEl.style.display = "";
        if (kothEl.dataset.id !== k.id) { kothEl.dataset.id = k.id; kothEl.href = `#/coin/${k.id}`; kothEl.innerHTML = kothHTML(k); }
        setText($('[data-k="mc"]', kothEl), fmtUsd(mcapUsd(k)));
        const ch = change(k, 3600_000);
        const chEl = $('[data-k="chg"]', kothEl);
        setText(chEl, fmtPct(ch)); chEl.className = `v ${ch >= 0 ? "up" : "down"}`;
        setText($('[data-k="h"]', kothEl), String(Object.keys(k.holders).length));
        setText($('[data-k="pct"]', kothEl), `${(progress(k) * 100).toFixed(1)}%`);
        $('[data-k="prog"]', kothEl).style.width = `${(progress(k) * 100).toFixed(1)}%`;
      },
    };
    function setLive() {
      const b = $("#liveBadge");
      if (!b) return;
      b.classList.toggle("paused", hovering);
      setText(b.lastChild, hovering ? "Paused" : "Live");
      b.title = hovering ? "Ordering is paused while you browse" : "";
    }
    return v;
  }

  // ======================================================================
  // Coin view
  // ======================================================================
  let chartTf = 60;
  const TFS = [[15, "15s"], [60, "1m"], [300, "5m"], [900, "15m"]];

  function CoinView(id) {
    const c = coinById(id);
    let side = "buy";
    let tab = "trades";
    let hoverX = null;
    let lastTradeId = null;
    let wasGraduated = c?.graduated;
    let threadN = -1;
    const v = {
      nav: "board",
      coinId: id,
      mount() {
        if (!c) {
          app.innerHTML = `<div class="empty" style="margin-top:40px"><h3>Coin not found</h3><p>It may have been cleared when the simulation was reset.</p><a class="btn btn-primary" href="#/">Back to board</a></div>`;
          return;
        }
        document.title = `${c.name} ($${c.ticker}) — clawd.fun`;
        app.innerHTML = `
          <nav class="crumbs"><a href="#/">${ICON.back}</a><a href="#/">Board</a><span>/</span><span>${esc(c.name)}</span></nav>
          <div class="coin-layout">
            <div class="coin-main">
              <section class="panel">
                <div class="coin-header">
                  ${artHTML(c, "lg")}
                  <div style="min-width:0">
                    <h1>${esc(c.name)} <span class="tk">$${esc(c.ticker)}</span> <span id="gradBadge"></span></h1>
                    <div class="coin-meta">
                      <span>Claude × ${esc(c.pair)}</span>
                      <span>by <b class="mono">${esc(who(c.creator))}</b></span>
                      <span id="age"></span>
                      <button class="addr-btn" id="copyAddr" title="Copy (simulated) token address">${esc(c.addr.slice(0, 4))}…${esc(c.addr.slice(-6))} ${ICON.copy}</button>
                    </div>
                    <p class="muted" style="margin:8px 0 0">${esc(c.desc)}</p>
                  </div>
                </div>
                <div class="coin-kpis">
                  <div class="kpi"><div class="l">Market cap</div><div class="v" id="kMc"></div></div>
                  <div class="kpi"><div class="l">Price</div><div class="v" id="kPrice"></div></div>
                  <div class="kpi"><div class="l">Volume</div><div class="v" id="kVol"></div></div>
                  <div class="kpi"><div class="l">1h change</div><div class="v" id="kChg"></div></div>
                </div>
              </section>

              <section class="panel chart-panel">
                <div class="panel-head">
                  <div class="tf" id="tf">${TFS.map(([s, l]) => `<button data-tf="${s}" class="${s === chartTf ? "active" : ""}">${l}</button>`).join("")}</div>
                  <div class="ohlc" id="ohlc"></div>
                </div>
                <div class="chart-box"><canvas id="chart" aria-label="Market cap chart"></canvas></div>
              </section>

              <section class="panel">
                <div class="tabs" role="tablist" id="coinTabs">
                  <button data-tab="trades" class="active">Trades</button>
                  <button data-tab="thread">Thread <span class="count" id="repCount"></span></button>
                </div>
                <div id="tabBody"></div>
              </section>
            </div>

            <aside class="coin-side">
              <section class="panel" id="tradePanel"></section>
              <section class="panel curve" id="curvePanel"></section>
              <section class="panel">
                <div class="panel-head"><h3>Top holders</h3><span class="dim" id="holderCount"></span></div>
                <ul class="holders" id="holders"></ul>
              </section>
            </aside>
          </div>`;

        $("#copyAddr").onclick = async () => {
          try { await navigator.clipboard.writeText(c.addr); toast("Address copied (it's simulated)", "ok"); }
          catch { toast(c.addr, "info"); }
        };
        $("#tf").onclick = (e) => {
          const b = e.target.closest("[data-tf]");
          if (!b) return;
          chartTf = +b.dataset.tf;
          $$("#tf button").forEach((x) => x.classList.toggle("active", x === b));
          drawChart();
        };
        $("#coinTabs").onclick = (e) => {
          const b = e.target.closest("[data-tab]");
          if (!b) return;
          tab = b.dataset.tab;
          $$("#coinTabs button").forEach((x) => x.classList.toggle("active", x === b));
          renderTab();
        };
        const cv = $("#chart");
        cv.addEventListener("pointermove", (e) => { hoverX = e.offsetX; drawChart(); });
        cv.addEventListener("pointerleave", () => { hoverX = null; drawChart(); });
        this._resize = () => drawChart();
        window.addEventListener("resize", this._resize);

        renderTrade();
        renderTab();
        v.update();
      },
      unmount() {
        document.title = "clawd.fun — pair anything with Claude";
        if (this._resize) window.removeEventListener("resize", this._resize);
      },
      update() {
        if (!c) return;
        setText($("#kMc"), fmtUsd(mcapUsd(c)));
        setText($("#kPrice"), fmtPrice(price(c) * SOL_USD));
        setText($("#kVol"), `${fmtSol(c.volume)} SOL`);
        const ch = change(c, 3600_000);
        const kc = $("#kChg"); setText(kc, fmtPct(ch)); kc.className = `v ${ch >= 0 ? "up" : "down"}`;
        setText($("#age"), ago(c.createdAt));
        setHTML($("#gradBadge"), c.graduated ? `<span class="badge grad">${ICON.cap} Graduated</span>` : "");
        setText($("#repCount"), String(c.replies.length));
        if (c.graduated !== wasGraduated) { wasGraduated = c.graduated; renderTrade(); }
        updateTrade();
        renderCurve();
        renderHolders();
        if (tab === "trades") updateTrades(); else if (threadN !== c.replies.length) renderThread();
        drawChart();
      },
    };

    // ---------- trade panel ----------
    function renderTrade() {
      const p = $("#tradePanel");
      if (c.graduated) {
        p.innerHTML = `<div class="trade"><div class="grad-note">${ICON.cap}<div><b>$${esc(c.ticker)} graduated.</b><br>
          <span class="muted">The bonding curve is complete, so trading here is closed. Holdings keep their final value.</span></div></div></div>
          <div class="pos" id="pos"></div>`;
        updateTrade();
        return;
      }
      p.innerHTML = `<div class="trade">
          <div class="bs"><button class="buy ${side === "buy" ? "on" : ""}" data-side="buy">Buy</button><button class="sell ${side === "sell" ? "on" : ""}" data-side="sell">Sell</button></div>
          <div class="trade-row"><span>Balance</span><b id="balLine"></b></div>
          <div class="amount">
            <input id="amt" type="number" min="0" step="any" inputmode="decimal" placeholder="0.00" aria-label="Amount" />
            <span class="unit">${side === "buy" ? `<span class="sol-dot"></span>SOL` : `$${esc(c.ticker)}`}</span>
          </div>
          <div class="quick">${side === "buy"
            ? [0.1, 0.5, 1, 5].map((x) => `<button data-q="${x}">${x}</button>`).join("") + `<button data-q="max">Max</button>`
            : [10, 25, 50, 75, 100].map((x) => `<button data-p="${x}">${x}%</button>`).join("")}</div>
          <div class="quote" id="quote"></div>
          <button class="btn btn-lg btn-block ${side === "buy" ? "btn-buy" : "btn-sell"}" id="goBtn">${side === "buy" ? "Buy" : "Sell"} $${esc(c.ticker)}</button>
        </div>
        <div class="pos" id="pos"></div>`;
      $$(".bs button", p).forEach((b) => b.onclick = () => { side = b.dataset.side; renderTrade(); $("#amt").focus(); });
      const amt = $("#amt");
      amt.oninput = updateTrade;
      amt.onkeydown = (e) => { if (e.key === "Enter") $("#goBtn").click(); };
      $$(".quick [data-q]", p).forEach((b) => b.onclick = () => {
        amt.value = b.dataset.q === "max" ? Math.max(0, Math.floor((state.balance - 0.0005) * 1000) / 1000) : b.dataset.q;
        updateTrade();
      });
      $$(".quick [data-p]", p).forEach((b) => b.onclick = () => {
        amt.value = Math.floor((bag(c) * +b.dataset.p) / 100);
        updateTrade();
      });
      $("#goBtn").onclick = () => {
        const x = parseFloat(amt.value);
        if (!(x > 0)) { amt.focus(); return; }
        const ok = side === "buy" ? youBuy(c, x) : youSell(c, x);
        if (ok) { amt.value = ""; tick(); }
      };
      updateTrade();
    }
    function updateTrade() {
      const b = bag(c);
      const pos = $("#pos");
      if (pos) {
        const val = positionValue(c);
        const cost = state.cost[c.id] || 0;
        const pnl = val - cost;
        setHTML(pos, `<div><div class="l">You hold</div><div class="v">${fmtTok(b)}</div></div>
          <div><div class="l">Value</div><div class="v">${fmtSol(val)} SOL</div></div>
          <div><div class="l">Cost</div><div class="v">${fmtSol(cost)} SOL</div></div>
          <div><div class="l">PnL</div><div class="v ${b ? (pnl >= 0 ? "up" : "down") : ""}">${b ? `${pnl >= 0 ? "+" : ""}${fmtSol(pnl)} SOL` : "—"}</div></div>`);
      }
      const amt = $("#amt");
      if (!amt) return;
      setText($("#balLine"), side === "buy" ? `${state.balance.toFixed(3)} SOL` : `${fmtTok(b)} $${c.ticker}`);
      const x = parseFloat(amt.value);
      const q = $("#quote");
      const go = $("#goBtn");
      let err = "";
      if (!(x > 0)) {
        setHTML(q, `<div><span>You receive</span><span>—</span></div><div><span>Price impact</span><span>—</span></div><div><span>Fee (1%)</span><span>—</span></div>`);
      } else if (side === "buy") {
        const r = quoteBuy(c, x);
        if (x > state.balance + 1e-9) err = "Insufficient SOL";
        setHTML(q, `<div><span>You receive</span><span>${fmtTok(r.out)} $${esc(c.ticker)}</span></div>
          <div><span>Price impact</span><span class="${r.impact > 0.05 ? "down" : ""}">${fmtPct(r.impact * 100)}</span></div>
          <div><span>Fee (1%)</span><span>${fmtSol(r.fee)} SOL</span></div>
          ${r.capped ? `<div><span>Curve cap</span><span>fills at ${fmtSol(r.sol)} SOL</span></div>` : ""}`);
      } else {
        const r = quoteSell(c, Math.min(x, b));
        if (x > b + 0.5) err = `Insufficient $${c.ticker}`;
        setHTML(q, `<div><span>You receive</span><span>${fmtSol(r.sol)} SOL</span></div>
          <div><span>Price impact</span><span class="${r.impact < -0.05 ? "down" : ""}">${fmtPct(r.impact * 100)}</span></div>
          <div><span>Fee (1%)</span><span>${fmtSol(r.fee)} SOL</span></div>`);
      }
      go.disabled = !!err || !(x > 0);
      setText(go, err || `${side === "buy" ? "Buy" : "Sell"} $${c.ticker}`);
    }

    // ---------- curve + holders ----------
    function renderCurve() {
      const raised = c.vSol - V_SOL0;
      setHTML($("#curvePanel"), `
        <div class="curve-top"><span class="muted">Bonding curve progress</span><b>${(progress(c) * 100).toFixed(1)}%</b></div>
        <div class="progress ${c.graduated ? "done" : ""}"><span style="width:${(progress(c) * 100).toFixed(2)}%"></span></div>
        <p>${c.graduated
          ? `Graduated ${ago(c.graduatedAt)} with ${fmtSol(raised)} SOL raised.`
          : `${fmtTok(Math.max(0, CURVE_TOKENS - c.sold))} tokens left on the curve. ${fmtSol(raised)} of ~${GRAD_SOL.toFixed(0)} SOL raised — graduates at ${fmtUsd(GRAD_MCAP_USD)} market cap.`}</p>`);
    }
    function renderHolders() {
      const hs = Object.entries(c.holders).sort((a, b) => b[1] - a[1]);
      setText($("#holderCount"), `${hs.length} holders`);
      const rows = [["Bonding curve", TOTAL_SUPPLY - c.sold, "curve"], ...hs.slice(0, 9).map(([w, a]) => [w, a, w === c.creator ? "dev" : w === "you" ? "you" : ""])];
      setHTML($("#holders"), rows.map(([w, a, tag], i) => {
        const pct = (a / TOTAL_SUPPLY) * 100;
        return `<li><span class="n">${i + 1}.</span><span>${esc(who(w))}</span>${tag && tag !== "curve" ? `<span class="tag">${tag}</span>` : ""}
          <span class="pct">${pct.toFixed(2)}%</span><span class="bar"><span style="width:${Math.min(100, pct)}%"></span></span></li>`;
      }).join(""));
    }

    // ---------- tabs ----------
    function renderTab() {
      const body = $("#tabBody");
      lastTradeId = null;
      if (tab === "trades") {
        body.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Account</th><th>Type</th><th class="r">SOL</th><th class="r">$${esc(c.ticker)}</th><th class="r">MC</th><th class="r">Time</th></tr></thead><tbody id="tradeRows"></tbody></table></div>`;
        updateTrades(true);
      } else {
        body.innerHTML = `<form class="reply-form" id="replyForm"><input id="replyIn" maxlength="160" placeholder="Add a reply…" autocomplete="off" /><button class="btn btn-primary">Post</button></form><ul class="thread" id="thread"></ul>`;
        $("#replyForm").onsubmit = (e) => {
          e.preventDefault();
          const txt = $("#replyIn").value.trim();
          if (!txt) return;
          c.replies.push({ who: "you", text: txt, t: Date.now() });
          $("#replyIn").value = "";
          save();
          renderThread();
          setTimeout(() => { c.replies.push({ who: newWallet(), text: pick(REPLIES), t: Date.now() }); save(); }, rand(1500, 4000));
        };
        renderThread();
      }
    }
    function updateTrades(initial = false) {
      const tb = $("#tradeRows");
      if (!tb) return;
      if (!c.trades.length) { setHTML(tb, `<tr><td colspan="6" class="dim" style="text-align:center;padding:24px">No trades yet — be the first.</td></tr>`); return; }
      const top = c.trades[0].id;
      if (top !== lastTradeId) {
        const prev = lastTradeId;
        let isNew = !initial && prev !== null;
        tb.innerHTML = c.trades.slice(0, 40).map((t) => {
          if (t.id === prev) isNew = false;
          return `<tr class="${isNew ? "new-row" : ""}"><td>${avatar(t.who, 14)} <span class="${t.who === "you" ? "you-tag" : ""}">${esc(who(t.who))}</span></td>
            <td><span class="side-tag ${t.side}">${t.side === "buy" ? "Buy" : "Sell"}</span></td>
            <td class="r">${fmtSol(t.sol)}</td><td class="r">${fmtTok(t.tok)}</td><td class="r">${fmtUsd(t.mc || 0)}</td><td class="r dim" data-t="${t.t}">${ago(t.t)}</td></tr>`;
        }).join("");
        tb._html = null;
        lastTradeId = top;
      } else {
        $$("[data-t]", tb).forEach((td) => setText(td, ago(+td.dataset.t)));
      }
    }
    function renderThread() {
      const ul = $("#thread");
      if (!ul) return;
      threadN = c.replies.length;
      ul.innerHTML = c.replies.length
        ? c.replies.slice().reverse().slice(0, 50).map((r) => `<li>${avatar(r.who)}<div><div><span class="who ${r.who === "you" ? "you-tag" : ""}">${esc(who(r.who))}</span><span class="when">${ago(r.t)}</span></div><div class="txt">${esc(r.text)}</div></div></li>`).join("")
        : `<li class="dim">No replies yet. Start the thread.</li>`;
    }

    // ---------- candlestick chart ----------
    function candles(tf, max) {
      const ms = tf * 1000;
      const h = c.history;
      const end = c.graduated ? c.graduatedAt : Date.now();
      const startBucket = Math.floor(h[0].t / ms);
      const endBucket = Math.floor(end / ms);
      const firstBucket = Math.max(startBucket, endBucket - max + 1);
      const out = [];
      let i = 0;
      let close = h[0].p;
      while (i < h.length && Math.floor(h[i].t / ms) < firstBucket) { close = h[i].p; i++; }
      for (let b = firstBucket; b <= endBucket; b++) {
        const cd = { t: b * ms, o: close, h: close, l: close, c: close, v: 0 };
        while (i < h.length && Math.floor(h[i].t / ms) === b) {
          const p = h[i].p;
          cd.h = Math.max(cd.h, p); cd.l = Math.min(cd.l, p); cd.c = p; cd.v += h[i].v || 0;
          i++;
        }
        close = cd.c;
        out.push(cd);
      }
      return out;
    }
    function drawChart() {
      const cv = $("#chart");
      if (!cv || !c) return;
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const g = cv.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const css = getComputedStyle(document.documentElement);
      const col = (n) => css.getPropertyValue(n).trim();
      const UP = col("--up"), DOWN = col("--down"), GRID = col("--border"), TXT = col("--text-3"), ACC = col("--accent"), SURF = col("--surface-3"), TEXT = col("--text");

      const R = 64, L = 8, T = 10, B = 24;
      const volH = Math.round((h - T - B) * 0.18);
      const plotH = h - T - B - volH - 6;
      const slot = 9;
      const max = Math.max(10, Math.floor((w - L - R) / slot));
      const cs = candles(chartTf, max);
      const scale = TOTAL_SUPPLY * SOL_USD; // price(SOL) → market cap (USD)
      let lo = Infinity, hi = -Infinity, vmax = 0;
      for (const k of cs) { lo = Math.min(lo, k.l); hi = Math.max(hi, k.h); vmax = Math.max(vmax, k.v); }
      if (hi - lo < hi * 0.02) { const mid = (hi + lo) / 2; hi = mid * 1.02; lo = mid * 0.98; }
      const pad = (hi - lo) * 0.1; hi += pad; lo = Math.max(0, lo - pad);
      const y = (p) => T + (1 - (p - lo) / (hi - lo)) * plotH;
      const x0 = w - R - cs.length * slot; // right-align candles
      const cx = (i) => x0 + i * slot + slot / 2;

      g.font = `11px ${css.getPropertyValue("--mono")}`;
      g.textBaseline = "middle";
      g.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const p = lo + ((hi - lo) * i) / 4;
        const yy = Math.round(y(p)) + 0.5;
        g.strokeStyle = GRID; g.beginPath(); g.moveTo(L, yy); g.lineTo(w - R, yy); g.stroke();
        g.fillStyle = TXT; g.fillText(fmtUsd(p * scale), w - R + 8, yy);
      }
      // time labels
      g.textBaseline = "alphabetic";
      const every = Math.max(1, Math.ceil(90 / slot));
      for (let i = cs.length - 1; i >= 0; i -= every) {
        const d = new Date(cs[i].t);
        const lbl = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}${chartTf < 60 ? ":" + String(d.getSeconds()).padStart(2, "0") : ""}`;
        const tw = g.measureText(lbl).width;
        if (cx(i) - tw / 2 < L) break;
        g.fillStyle = TXT; g.fillText(lbl, cx(i) - tw / 2, h - 6);
      }
      // candles + volume
      const volTop = T + plotH + 6;
      cs.forEach((k, i) => {
        const up = k.c >= k.o;
        const color = up ? UP : DOWN;
        const xx = Math.round(cx(i)) + 0.5;
        g.strokeStyle = color; g.fillStyle = color;
        g.beginPath(); g.moveTo(xx, y(k.h)); g.lineTo(xx, y(k.l)); g.stroke();
        const top = y(Math.max(k.o, k.c)), bot = y(Math.min(k.o, k.c));
        g.fillRect(Math.round(cx(i) - 3), Math.round(top), 6, Math.max(1, Math.round(bot - top)));
        if (vmax > 0 && k.v > 0) {
          const vh = (k.v / vmax) * volH;
          g.globalAlpha = 0.35;
          g.fillRect(Math.round(cx(i) - 3), volTop + volH - vh, 6, vh);
          g.globalAlpha = 1;
        }
      });
      // last price line + tag
      const last = cs[cs.length - 1];
      const ly = Math.round(y(last.c)) + 0.5;
      g.setLineDash([3, 3]); g.strokeStyle = ACC; g.beginPath(); g.moveTo(L, ly); g.lineTo(w - R, ly); g.stroke(); g.setLineDash([]);
      g.fillStyle = ACC; g.fillRect(w - R + 2, ly - 9, R - 4, 18);
      g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText(fmtUsd(last.c * scale), w - R + 8, ly);

      // crosshair
      let shown = last;
      if (hoverX !== null && hoverX >= x0 && hoverX <= w - R) {
        const i = Math.min(cs.length - 1, Math.max(0, Math.floor((hoverX - x0) / slot)));
        shown = cs[i];
        const xx = Math.round(cx(i)) + 0.5;
        g.strokeStyle = TXT; g.setLineDash([2, 3]);
        g.beginPath(); g.moveTo(xx, T); g.lineTo(xx, h - B); g.stroke(); g.setLineDash([]);
        g.fillStyle = SURF; g.fillRect(w - R + 2, y(shown.c) - 9, R - 4, 18);
        g.fillStyle = TEXT; g.fillText(fmtUsd(shown.c * scale), w - R + 8, y(shown.c));
      }
      const chg = shown.o ? (shown.c / shown.o - 1) * 100 : 0;
      setHTML($("#ohlc"), `<span>O <b>${fmtUsd(shown.o * scale)}</b></span><span>H <b>${fmtUsd(shown.h * scale)}</b></span>
        <span>L <b>${fmtUsd(shown.l * scale)}</b></span><span>C <b class="${chg >= 0 ? "up" : "down"}">${fmtUsd(shown.c * scale)}</b></span>
        <span>Vol <b>${fmtSol(shown.v)}</b></span>`);
    }

    return v;
  }

  // ======================================================================
  // Portfolio view
  // ======================================================================
  function PortfolioView() {
    return {
      nav: "portfolio",
      mount() {
        app.innerHTML = `
          <div class="page-head"><div><h1>Portfolio</h1><p class="muted" style="margin:4px 0 0">Your play-money positions and launches.</p></div>
            <button class="btn btn-ghost" id="pfFaucet">Top up +${FAUCET} SOL</button></div>
          <div class="summary">
            <div class="panel"><div class="l">SOL balance</div><div class="v" id="sBal"></div></div>
            <div class="panel"><div class="l">Holdings value</div><div class="v" id="sVal"></div></div>
            <div class="panel"><div class="l">Unrealized PnL</div><div class="v" id="sPnl"></div></div>
            <div class="panel"><div class="l">Coins launched</div><div class="v" id="sLaunched"></div></div>
          </div>
          <section class="panel" style="margin-bottom:16px">
            <div class="panel-head"><h3>Positions</h3></div>
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Coin</th><th class="r">Amount</th><th class="r">Value</th><th class="r">Cost</th><th class="r">PnL</th><th class="r">Curve</th></tr></thead><tbody id="posRows"></tbody></table></div>
            <div id="posEmpty"></div>
          </section>
          <section class="panel">
            <div class="panel-head"><h3>Launched by you</h3></div>
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Coin</th><th class="r">Market cap</th><th class="r">Holders</th><th class="r">Volume</th><th class="r">Curve</th><th class="r">Created</th></tr></thead><tbody id="myRows"></tbody></table></div>
            <div id="myEmpty"></div>
          </section>`;
        $("#pfFaucet").onclick = faucet;
        const nav = (e) => { const tr = e.target.closest("tr[data-key]"); if (tr) location.hash = `#/coin/${tr.dataset.key}`; };
        $("#posRows").addEventListener("click", nav);
        $("#myRows").addEventListener("click", nav);
        this.update();
      },
      update() {
        const held = state.coins.filter((c) => bag(c) > 0);
        const mine = state.coins.filter((c) => c.creator === "you");
        let val = 0, cost = 0;
        for (const c of held) { val += positionValue(c); cost += state.cost[c.id] || 0; }
        setText($("#sBal"), `${state.balance.toFixed(3)}`);
        setText($("#sVal"), `${fmtSol(val)} SOL`);
        const pnl = val - cost;
        const sp = $("#sPnl"); setText(sp, `${pnl >= 0 ? "+" : ""}${fmtSol(pnl)} SOL`); sp.className = `v ${held.length ? (pnl >= 0 ? "up" : "down") : ""}`;
        setText($("#sLaunched"), String(mine.length));
        const coinCell = (c) => `<div class="coin-cell">${artHTML(c, "sm")}<div><b>${esc(c.name)}</b><div class="dim">$${esc(c.ticker)}</div></div></div>`;
        const row = (cells) => (c) => { const tr = document.createElement("tr"); tr.className = "link"; tr.innerHTML = cells(c); return tr; };
        syncList($("#posRows"), held.sort((a, b) => positionValue(b) - positionValue(a)), (c) => c.id,
          row((c) => `<td>${coinCell(c)}</td><td class="r" data-f="a"></td><td class="r" data-f="v"></td><td class="r" data-f="c"></td><td class="r" data-f="p"></td><td class="r" data-f="g"></td>`),
          (tr, c) => {
            const v = positionValue(c), k = state.cost[c.id] || 0, p = v - k;
            setText($('[data-f="a"]', tr), fmtTok(bag(c)));
            setText($('[data-f="v"]', tr), `${fmtSol(v)} SOL`);
            setText($('[data-f="c"]', tr), `${fmtSol(k)} SOL`);
            const pe = $('[data-f="p"]', tr); setText(pe, `${p >= 0 ? "+" : ""}${fmtSol(p)} (${fmtPct(k ? (p / k) * 100 : 0)})`); pe.className = `r ${p >= 0 ? "up" : "down"}`;
            setText($('[data-f="g"]', tr), c.graduated ? "Graduated" : `${(progress(c) * 100).toFixed(0)}%`);
          }, true);
        setHTML($("#posEmpty"), held.length ? "" : `<div class="dim" style="padding:28px;text-align:center">No positions yet. <a href="#/" class="up">Browse the board →</a></div>`);
        syncList($("#myRows"), mine.sort((a, b) => b.createdAt - a.createdAt), (c) => c.id,
          row((c) => `<td>${coinCell(c)}</td><td class="r" data-f="m"></td><td class="r" data-f="h"></td><td class="r" data-f="v"></td><td class="r" data-f="g"></td><td class="r dim" data-f="t"></td>`),
          (tr, c) => {
            setText($('[data-f="m"]', tr), fmtUsd(mcapUsd(c)));
            setText($('[data-f="h"]', tr), String(Object.keys(c.holders).length));
            setText($('[data-f="v"]', tr), `${fmtSol(c.volume)} SOL`);
            setText($('[data-f="g"]', tr), c.graduated ? "Graduated" : `${(progress(c) * 100).toFixed(0)}%`);
            setText($('[data-f="t"]', tr), ago(c.createdAt));
          }, true);
        setHTML($("#myEmpty"), mine.length ? "" : `<div class="dim" style="padding:28px;text-align:center">You haven't launched anything yet. <button class="btn btn-primary btn-sm" data-launch style="margin-left:8px">Launch a coin</button></div>`);
      },
    };
  }

  // ======================================================================
  // How it works
  // ======================================================================
  function HowView() {
    return {
      nav: "how",
      mount() {
        app.innerHTML = `<article class="how">
          <h1>How clawd.fun works</h1>
          <p class="muted">Every coin here is a pairing: <b>Claude ×</b> something. Everything runs in your browser with play money.</p>
          <div class="steps">
            <div class="panel step"><div class="num">1</div><h3>Pair it</h3><p>Type anything. We draft a Claude-flavored name, ticker, pitch and art. Edit any of it or upload your own image.</p></div>
            <div class="panel step"><div class="num">2</div><h3>Launch</h3><p>Launching is free. 1B tokens are minted and 793.1M go on a bonding curve. You can make the first buy yourself.</p></div>
            <div class="panel step"><div class="num">3</div><h3>Trade</h3><p>Price is set by the curve: every buy pushes it up, every sell pushes it down. A 1% fee applies to each trade.</p></div>
            <div class="panel step"><div class="num">4</div><h3>Graduate</h3><p>When the curve sells out (~${GRAD_SOL.toFixed(0)} SOL raised, ${fmtUsd(GRAD_MCAP_USD)} market cap), the coin graduates and the curve closes.</p></div>
          </div>
          <div class="panel faq">
            <details open><summary>What's the pricing formula?</summary>
              <p>A constant-product curve with virtual reserves, the same shape pump.fun uses. It starts at ${V_SOL0} virtual SOL and ${fmtTok(V_TOK0)} virtual tokens:</p>
              <div class="formula">tokens_out = vTok − (vSol · vTok) / (vSol + sol_in × 0.99)</div>
              <p>Starting market cap is ${fmtUsd(V_SOL0 / V_TOK0 * TOTAL_SUPPLY * SOL_USD)} at a fixed SOL price of $${SOL_USD}.</p></details>
            <details><summary>Is any of this real?</summary><p>No. There is no wallet, blockchain or real money. You start with ${START_BALANCE} play SOL, and the other traders are simulated. Your coins, trades and balance are saved in this browser only.</p></details>
            <details><summary>How do I get more SOL?</summary><p>Click your balance in the top bar (or “Top up” on the Portfolio page) for +${FAUCET} play SOL.</p></details>
            <details><summary>Is this made by Anthropic?</summary><p>No. clawd.fun is an unofficial fan project and isn't affiliated with or endorsed by Anthropic.</p></details>
          </div>
          <p style="margin-top:20px"><button class="btn btn-primary" data-launch>${ICON.plus} Launch a coin</button></p>
        </article>`;
      },
      update() {},
    };
  }

  // ======================================================================
  // Launch dialog
  // ======================================================================
  const createDlg = $("#createDlg");
  const cf = { pair: $("#cPair"), name: $("#cName"), ticker: $("#cTicker"), emoji: $("#cEmoji"), desc: $("#cDesc"), dev: $("#cDevBuy") };
  let cImage = null;
  let previewId = uid();

  function applyDraft(d) {
    cf.name.value = d.name; cf.ticker.value = d.ticker; cf.emoji.value = d.emoji; cf.desc.value = d.desc;
    updatePreview();
  }
  function updatePreview() {
    const c = { id: previewId, hue: hash(cf.pair.value || "x") % 360, emoji: cf.emoji.value || "✨", ticker: cf.ticker.value || "X", image: cImage };
    $("#cpArt").outerHTML = artHTML(c, "xl").replace('class="coin-art xl"', 'class="coin-art xl" id="cpArt"');
    validateDev();
  }
  function validateDev() {
    const d = parseFloat(cf.dev.value) || 0;
    const hint = $("#devHint");
    if (d > state.balance) { hint.textContent = `You only have ${state.balance.toFixed(2)} SOL.`; hint.className = "hint err"; return false; }
    if (d > 0) {
      const q = quoteBuy({ vSol: V_SOL0, vTok: V_TOK0, sold: 0 }, d);
      hint.textContent = `You'll receive ≈ ${fmtTok(q.out)} tokens (${((q.out / TOTAL_SUPPLY) * 100).toFixed(2)}% of supply).`;
    } else hint.textContent = "Be the first buyer of your own coin.";
    hint.className = "hint";
    return true;
  }
  function openCreate(pair = "") {
    cImage = null;
    previewId = uid();
    cf.pair.value = pair ? cap(pair) : "";
    cf.dev.value = "0";
    applyDraft(draftFor(pair || pick(PRESETS)[0]));
    if (!pair) { cf.name.value = ""; cf.ticker.value = ""; cf.desc.value = ""; updatePreview(); }
    if (!createDlg.open) createDlg.showModal();
    (pair ? cf.name : cf.pair).focus();
  }

  let pairDebounce = 0;
  cf.pair.addEventListener("input", () => {
    clearTimeout(pairDebounce);
    pairDebounce = setTimeout(() => { const p = cf.pair.value.trim(); if (p) applyDraft(draftFor(p)); else updatePreview(); }, 250);
  });
  [cf.name, cf.ticker, cf.emoji].forEach((el) => el.addEventListener("input", updatePreview));
  cf.ticker.addEventListener("input", () => { const v = cf.ticker.value.replace(/[^a-z0-9]/gi, "").toUpperCase(); if (v !== cf.ticker.value) cf.ticker.value = v; });
  cf.dev.addEventListener("input", validateDev);
  $("#rerollBtn").addEventListener("click", () => { const p = cf.pair.value.trim() || pick(PRESETS)[0]; if (!cf.pair.value.trim()) cf.pair.value = p; applyDraft(draftFor(p)); });

  // image upload → downscaled square JPEG data URL (keeps localStorage small)
  const drop = $("#imgDrop");
  const fileIn = $("#cImage");
  drop.addEventListener("click", () => fileIn.click());
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileIn.click(); } });
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("drag"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("drag"); if (e.dataTransfer.files[0]) readImage(e.dataTransfer.files[0]); });
  fileIn.addEventListener("change", () => { if (fileIn.files[0]) readImage(fileIn.files[0]); fileIn.value = ""; });
  function readImage(file) {
    if (!file.type.startsWith("image/")) return toast("That file isn't an image.", "err");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const S = 192;
      const cv = document.createElement("canvas");
      cv.width = cv.height = S;
      const g = cv.getContext("2d");
      const m = Math.min(img.width, img.height);
      g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
      cImage = cv.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      updatePreview();
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("Couldn't read that image.", "err"); };
    img.src = url;
  }

  createDlg.addEventListener("click", (e) => { if (e.target === createDlg || e.target.closest("[data-close]")) createDlg.close(); });
  $("#createForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const pair = cap(cf.pair.value.trim());
    if (!pair) { cf.pair.focus(); toast("Claude × … what? Enter something to pair.", "err"); return; }
    if (!validateDev()) { cf.dev.focus(); return; }
    const d = {
      pair,
      name: cf.name.value.trim() || `Claude × ${pair}`,
      ticker: cf.ticker.value.trim().replace(/[^a-z0-9]/gi, "").toUpperCase() || tickerFor(pair),
      emoji: cf.emoji.value.trim() || emojiFor(pair),
      desc: cf.desc.value.trim() || pick(PITCHES)(pair),
      image: cImage,
    };
    const c = newCoin(d, "you");
    state.coins.unshift(c);
    pushFeed({ kind: "new", coin: c.id, t: Date.now() });
    const dev = parseFloat(cf.dev.value) || 0;
    if (dev > 0) youBuy(c, dev, true);
    prune();
    save();
    createDlg.close();
    toast(`$${c.ticker} is live ✳`, "ok");
    location.hash = `#/coin/${c.id}`;
  });

  // ======================================================================
  // Simulated market
  // ======================================================================
  function prune() {
    if (state.coins.length <= MAX_COINS) return;
    // drop the stalest coins nobody (including you) cares about
    const removable = state.coins
      .filter((c) => c.creator !== "you" && !bag(c) && c.id !== view?.coinId)
      .sort((a, b) => a.lastTrade - b.lastTrade);
    const drop = new Set(removable.slice(0, state.coins.length - MAX_COINS).map((c) => c.id));
    state.coins = state.coins.filter((c) => !drop.has(c.id));
    state.feed = state.feed.filter((e) => !drop.has(e.coin));
  }

  function botStep() {
    const now = Date.now();
    const live = state.coins.filter((c) => !c.graduated);
    if (live.length) {
      const weights = live.map((c) =>
        1 + 4 * progress(c) + (now - c.lastTrade < 20_000 ? 2 : 0) + (now - c.createdAt < 10 * 60_000 ? 3 : 0) + (c.creator === "you" ? 1.5 : 0));
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      let c = live[0];
      for (let i = 0; i < live.length; i++) { r -= weights[i]; if (r <= 0) { c = live[i]; break; } }
      const buyBias = 0.57 + (c.creator === "you" ? 0.05 : 0) - progress(c) * 0.06;
      if (Math.random() < buyBias || c.sold < 5e6) {
        const w = Math.random() < 0.3 ? pick(Object.keys(c.holders).filter((x) => x !== "you")) || newWallet() : newWallet();
        trade(c, "buy", Math.random() < 0.08 ? rand(3, 8) : rand(0.05, 2), w);
      } else botSell(c);
      if (Math.random() < 0.05) c.replies.push({ who: newWallet(), text: pick(REPLIES), t: now });
    }
    if (Math.random() < 0.02) {
      const c = newCoin(draftFor(pick(PRESETS)[0]), newWallet());
      trade(c, "buy", rand(0.2, 1.5), c.creator, now, true);
      state.coins.push(c);
      pushFeed({ kind: "new", coin: c.id, t: now });
      prune();
    }
    save();
  }

  function tick() {
    updateHeader();
    view?.update?.();
  }
  function loop() {
    if (!document.hidden) { botStep(); tick(); }
    setTimeout(loop, rand(700, 1700));
  }

  // ======================================================================
  // Global wiring
  // ======================================================================
  function faucet() {
    state.balance += FAUCET;
    save();
    tick();
    toast(`+${FAUCET} play SOL added to your balance`, "ok");
  }
  $("#walletPill").addEventListener("click", faucet);
  $("#launchTop").addEventListener("click", () => openCreate(""));
  document.addEventListener("click", (e) => { if (e.target.closest("[data-launch]")) openCreate(""); });

  const search = $("#search");
  search.addEventListener("input", () => {
    query = search.value.trim();
    if (view?.nav !== "board" || location.hash.startsWith("#/coin")) location.hash = "#/";
    else view.update(true);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !createDlg.open) { e.preventDefault(); search.focus(); }
    if (e.key === "Escape" && document.activeElement === search) { search.value = ""; query = ""; search.blur(); view?.update?.(true); }
  });

  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("Reset the simulation? This clears every coin, your balance and your positions.")) return;
    state = seed();
    lastFeedId = null;
    $("#feed").innerHTML = "";
    save(); flush();
    location.hash = "#/";
    route();
    tick();
    toast("Simulation reset", "info");
  });

  route();
  updateHeader();
  setTimeout(loop, 800);
})();
