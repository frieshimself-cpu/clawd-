/* clawd.fun — a play-money, pump.fun-style launchpad where every coin is "Claude × something".
 * Everything is simulated in the browser. No wallets, no chain, no real money. */
(() => {
  "use strict";

  // ---------- bonding curve (pump.fun-style constant product with virtual reserves) ----------
  const SOL_USD = 150;
  const TOTAL_SUPPLY = 1_000_000_000;
  const V_SOL0 = 30;
  const V_TOK0 = 1_073_000_000;
  const CURVE_TOKENS = 793_100_000; // tokens sold before graduation
  const FEE = 0.01;
  const START_BALANCE = 25;
  const STORE_KEY = "clawd.fun/v1";

  const price = (c) => c.vSol / c.vTok; // SOL per token
  const mcapUsd = (c) => price(c) * TOTAL_SUPPLY * SOL_USD;
  const progress = (c) => Math.min(1, c.sold / CURVE_TOKENS);

  function quoteBuy(c, sol) {
    let net = sol * (1 - FEE);
    const k = c.vSol * c.vTok;
    let out = c.vTok - k / (c.vSol + net);
    const left = CURVE_TOKENS - c.sold;
    if (out > left) {
      out = left;
      net = k / (c.vTok - out) - c.vSol;
      sol = net / (1 - FEE);
    }
    return { out: Math.max(0, out), net, sol };
  }
  function quoteSell(c, amt) {
    amt = Math.min(amt, c.sold);
    const k = c.vSol * c.vTok;
    const gross = c.vSol - k / (c.vTok + amt);
    return { amt, gross, sol: gross * (1 - FEE) };
  }

  // ---------- pairing flavor ----------
  const PRESETS = [
    ["Cats", "🐈"], ["Pizza", "🍕"], ["The Moon", "🌕"], ["Frogs", "🐸"], ["Coffee", "☕"],
    ["Crabs", "🦀"], ["Haiku", "🌸"], ["Dogs", "🐕"], ["Tea", "🍵"], ["Rockets", "🚀"],
    ["Penguins", "🐧"], ["Bananas", "🍌"], ["Robots", "🤖"], ["Ducks", "🦆"], ["Ramen", "🍜"],
    ["Wizards", "🧙"], ["Tacos", "🌮"], ["Sharks", "🦈"], ["Books", "📚"], ["Mushrooms", "🍄"],
  ];
  const EMOJI_WORDS = {
    cat: "🐈", kitten: "🐈", dog: "🐕", pup: "🐶", frog: "🐸", pepe: "🐸", moon: "🌕", sun: "☀️", pizza: "🍕",
    coffee: "☕", tea: "🍵", crab: "🦀", lobster: "🦞", haiku: "🌸", poem: "📜", rocket: "🚀", mars: "🔴",
    penguin: "🐧", banana: "🍌", robot: "🤖", duck: "🦆", ramen: "🍜", noodle: "🍜", wizard: "🧙", taco: "🌮",
    shark: "🦈", book: "📚", mushroom: "🍄", fire: "🔥", ghost: "👻", alien: "👽", dragon: "🐉", horse: "🐴",
    whale: "🐋", fish: "🐟", bee: "🐝", honey: "🍯", beer: "🍺", wine: "🍷", cake: "🍰", cookie: "🍪",
    burger: "🍔", fries: "🍟", sushi: "🍣", donut: "🍩", music: "🎵", guitar: "🎸", game: "🎮", chess: "♟️",
    code: "💻", computer: "💻", brain: "🧠", money: "💸", gold: "🥇", diamond: "💎", heart: "❤️", love: "💘",
    star: "⭐", rainbow: "🌈", ocean: "🌊", tree: "🌳", flower: "🌸", cactus: "🌵", snow: "❄️", monkey: "🐒",
    ape: "🦍", bear: "🐻", bull: "🐂", pig: "🐷", cow: "🐄", chicken: "🐔", egg: "🥚", bread: "🍞", cheese: "🧀",
    avocado: "🥑", apple: "🍎", owl: "🦉", octopus: "🐙", snail: "🐌", turtle: "🐢", unicorn: "🦄", sloth: "🦥",
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
  ];
  const REPLIES = [
    "I'd be happy to help you ape into this! 🙂",
    "You're absolutely right — this is going to graduate.",
    "Let me think step by step… 1) buy 2) hold 3) ✳",
    "I apologize for the confusion, I sold the bottom.",
    "dev is based, pitch passed the vibe check",
    "chart looks like a well-tuned learning rate",
    "certified helpful, harmless and bullish",
    "context window full of this ticker",
    "I've reviewed the tokenomics and have a few concerns (bought anyway)",
    "who else pairing this with their morning coffee",
    "king of the hill incoming ✳✳✳",
    "gm from the artifact panel",
    "this is the one. extended thinking says so.",
    "ngl the pairing is kinda perfect",
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

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const cap = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase());
  const uid = () => Math.random().toString(36).slice(2, 10);
  const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const wallet = () => {
    let s = "";
    for (let i = 0; i < 8; i++) s += B58[Math.floor(Math.random() * B58.length)];
    return s.slice(0, 4) + "…" + s.slice(4);
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  function emojiFor(pair) {
    const hit = PRESETS.find(([n]) => n.toLowerCase() === pair.trim().toLowerCase());
    if (hit) return hit[1];
    for (const w of pair.toLowerCase().split(/[^a-z]+/)) {
      if (!w) continue;
      const stem = w.replace(/(es|s)$/, "");
      if (EMOJI_WORDS[w]) return EMOJI_WORDS[w];
      if (EMOJI_WORDS[stem]) return EMOJI_WORDS[stem];
    }
    return pick(["✨", "🌀", "🪐", "🎲", "🧩", "🫧", "🔮", "🪄"]);
  }
  function tickerFor(pair) {
    const w = pair.toUpperCase().replace(/^THE\s+/, "").replace(/[^A-Z0-9]/g, "") || "THING";
    return pick(TICKER_STYLES)(w).slice(0, 10);
  }
  function hueFor(str) {
    let h = 0;
    for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % 360;
  }
  function draftFor(pair) {
    const p = cap(pair.trim());
    return { pair: p, name: pick(NAME_STYLES)(p), ticker: tickerFor(p), emoji: emojiFor(p), desc: pick(PITCHES)(p) };
  }

  // Procedural coin art: a warm gradient with a Claude-ish spark, plus the paired emoji on top.
  function artSVG(c) {
    const h = c.hue;
    const rays = 6 + (hueFor(c.id) % 6);
    const rot = hueFor(c.ticker) % 60;
    let spark = "";
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * 360 + rot;
      const len = 30 + ((hueFor(c.id + i) % 12));
      spark += `<rect x="47" y="${50 - len}" width="6" height="${len}" rx="3" transform="rotate(${a} 50 50)"/>`;
    }
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <defs><linearGradient id="g${c.id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${(h + 15) % 360} 70% 62%)"/>
        <stop offset="1" stop-color="hsl(18 62% 55%)"/></linearGradient></defs>
      <rect width="100" height="100" fill="url(#g${c.id})"/>
      <g fill="rgba(255,248,238,.38)">${spark}</g></svg>`;
  }
  const artHTML = (c, size = "") => `<div class="coin-art ${size}">${artSVG(c)}<span class="emo">${esc(c.emoji)}</span></div>`;

  // ---------- formatting ----------
  const fmtUsd = (n) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}k` : `$${n.toFixed(0)}`;
  const fmtTok = (n) => n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : n.toFixed(0);
  const fmtSol = (n) => n.toFixed(n < 1 ? 3 : 2);
  const ago = (t) => {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return `${Math.floor(s)}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  // ---------- state ----------
  let state = load() || seed();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && Array.isArray(s.coins) ? s : null;
    } catch { return null; }
  }
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
    }, 400);
  }

  function newCoin(d, creator, createdAt = Date.now()) {
    const id = uid();
    return {
      id, pair: d.pair, name: d.name, ticker: d.ticker.toUpperCase(), emoji: d.emoji || "✨",
      desc: d.desc, hue: hueFor(d.pair + id), creator, createdAt,
      vSol: V_SOL0, vTok: V_TOK0, sold: 0, volume: 0, graduated: false,
      history: [{ t: createdAt, p: V_SOL0 / V_TOK0 }], trades: [], replies: [], lastTrade: createdAt,
    };
  }

  function seed() {
    const s = { balance: START_BALANCE, bags: {}, coins: [], feed: [] };
    const now = Date.now();
    const picks = [...PRESETS].sort(() => Math.random() - 0.5).slice(0, 12);
    for (const [pair] of picks) {
      const d = draftFor(pair);
      const born = now - rand(5, 180) * 60_000;
      const c = newCoin(d, wallet(), born);
      // replay some history so the board isn't flat
      const n = Math.floor(rand(8, 40));
      const heat = Math.random();
      for (let i = 0; i < n; i++) {
        const t = born + ((now - born) * (i + 1)) / (n + 1);
        if (Math.random() < 0.62 + heat * 0.15 || c.sold < 1e6) trade(c, "buy", rand(0.1, 3 + heat * 5), wallet(), t, true);
        else trade(c, "sell", c.sold * rand(0.02, 0.15), wallet(), t, true);
      }
      for (let i = 0; i < Math.floor(rand(1, 5)); i++) c.replies.push({ who: wallet(), text: pick(REPLIES), t: born + rand(0, now - born) });
      c.replies.sort((a, b) => a.t - b.t);
      s.coins.push(c);
    }
    return s;
  }

  // Executes a trade on the curve. who === "you" moves the player's balance/bags.
  function trade(c, side, amount, who, t = Date.now(), silent = false) {
    if (c.graduated) return null;
    let res;
    if (side === "buy") {
      const q = quoteBuy(c, amount);
      if (q.out <= 0) return null;
      c.vSol += q.net; c.vTok -= q.out; c.sold += q.out; c.volume += q.sol;
      res = { side, sol: q.sol, tok: q.out };
    } else {
      const q = quoteSell(c, amount);
      if (q.amt <= 0) return null;
      c.vSol -= q.gross; c.vTok += q.amt; c.sold -= q.amt; c.volume += q.gross;
      res = { side, sol: q.sol, tok: q.amt };
    }
    c.history.push({ t, p: price(c) });
    if (c.history.length > 400) c.history.splice(1, c.history.length - 400);
    c.trades.unshift({ who, side, sol: res.sol, tok: res.tok, t });
    if (c.trades.length > 60) c.trades.length = 60;
    c.lastTrade = t;
    if (c.sold >= CURVE_TOKENS - 1) {
      c.graduated = true;
      c.graduatedAt = t;
      if (!silent) pushFeed({ kind: "grad", coin: c.id, t });
    }
    if (!silent) pushFeed({ kind: side, coin: c.id, who, sol: res.sol, t });
    return res;
  }

  function pushFeed(e) {
    if (!state) return;
    state.feed.unshift(e);
    if (state.feed.length > 30) state.feed.length = 30;
  }

  // ---------- DOM ----------
  const $ = (s) => document.querySelector(s);
  const grid = $("#grid");
  let sortMode = "trending";
  let query = "";
  let openCoinId = null;
  let tradeSide = "buy";

  function coinById(id) { return state.coins.find((c) => c.id === id); }

  function change(c, windowMs = 30 * 60_000) {
    const since = Date.now() - windowMs;
    const past = c.history.find((h) => h.t >= since) || c.history[0];
    return (price(c) / past.p - 1) * 100;
  }

  function sorted() {
    let list = state.coins.slice();
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((c) => (c.name + " " + c.ticker + " " + c.pair).toLowerCase().includes(q));
    }
    switch (sortMode) {
      case "new": return list.sort((a, b) => b.createdAt - a.createdAt);
      case "mcap": return list.sort((a, b) => mcapUsd(b) - mcapUsd(a));
      case "graduated": return list.filter((c) => c.graduated).sort((a, b) => (b.graduatedAt || 0) - (a.graduatedAt || 0));
      case "mine": return list.filter((c) => (state.bags[c.id] || 0) > 1).sort((a, b) => (state.bags[b.id] * price(b)) - (state.bags[a.id] * price(a)));
      default: return list.filter((c) => !c.graduated).sort((a, b) => b.lastTrade - a.lastTrade);
    }
  }

  function cardHTML(c) {
    const pct = progress(c) * 100;
    const bag = state.bags[c.id] || 0;
    return `<article class="card" data-id="${c.id}" tabindex="0">
      ${artHTML(c)}
      <div class="card-body">
        <div class="card-top"><h3>${esc(c.name)}</h3><span class="tk">$${esc(c.ticker)}</span></div>
        <p class="desc">${esc(c.desc)}</p>
        <div class="meta"><span class="mc">mc ${fmtUsd(mcapUsd(c))}</span>
          ${c.graduated ? `<span class="grad-badge">graduated</span>` : `<span class="by">${pct.toFixed(0)}% · ${ago(c.createdAt)}</span>`}</div>
        <div class="bar"><span style="width:${pct.toFixed(1)}%"></span></div>
        ${bag > 1 ? `<div class="meta" style="margin-top:6px"><span class="by">you hold ${fmtTok(bag)}</span><span class="by">◎ ${fmtSol(bag * price(c))}</span></div>` : ""}
      </div></article>`;
  }

  function renderGrid(flashId) {
    const list = sorted();
    grid.innerHTML = list.map(cardHTML).join("");
    $("#emptyMsg").hidden = list.length > 0;
    if (flashId) {
      const el = grid.querySelector(`[data-id="${flashId}"]`);
      if (el) el.classList.add("flash");
    }
  }

  function renderKoth() {
    const live = state.coins.filter((c) => !c.graduated);
    const k = live.sort((a, b) => mcapUsd(b) - mcapUsd(a))[0];
    const el = $("#koth");
    if (!k) { el.innerHTML = ""; return; }
    el.innerHTML = `<div class="koth-card" data-id="${k.id}" tabindex="0">
      ${artHTML(k, "big")}
      <div style="flex:1;min-width:0">
        <div class="koth-label">👑 king of the hill</div>
        <h3>${esc(k.name)} <span class="tk">$${esc(k.ticker)}</span></h3>
        <div class="meta"><span class="mc">mc ${fmtUsd(mcapUsd(k))}</span><span class="by">${(progress(k) * 100).toFixed(1)}% to graduation</span></div>
        <div class="bar"><span style="width:${(progress(k) * 100).toFixed(1)}%"></span></div>
      </div></div>`;
  }

  function renderWallet() {
    $("#walletBal").textContent = `◎ ${state.balance.toFixed(2)}`;
  }

  function renderTicker() {
    const items = state.feed.slice(0, 14).map((e) => {
      const c = coinById(e.coin);
      if (!c) return "";
      const t = `${esc(c.emoji)} <b>$${esc(c.ticker)}</b>`;
      if (e.kind === "new") return `<span class="tick"><span class="new">✳ launched</span> ${t}</span>`;
      if (e.kind === "grad") return `<span class="tick"><span class="new">🎓 graduated</span> ${t}</span>`;
      const cls = e.kind === "buy" ? "buy" : "sell";
      return `<span class="tick">${esc(e.who)} <span class="${cls}">${e.kind === "buy" ? "bought" : "sold"} ◎${fmtSol(e.sol)}</span> of ${t}</span>`;
    });
    $("#tickerTrack").innerHTML = items.join("") || `<span class="tick">waiting for the first trade…</span>`;
  }

  function renderAll(flashId) {
    renderWallet();
    renderKoth();
    renderGrid(flashId);
    renderTicker();
    if (openCoinId) renderCoin(false);
  }

  // ---------- toast ----------
  let toastTimer = 0;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------- create flow ----------
  const createDlg = $("#createDlg");
  const cf = {
    pair: $("#cPair"), name: $("#cName"), ticker: $("#cTicker"), emoji: $("#cEmoji"), desc: $("#cDesc"), dev: $("#cDevBuy"),
  };

  function fillDraft(pair) {
    const d = draftFor(pair || "something");
    cf.pair.value = pair ? d.pair : "";
    cf.name.value = d.name;
    cf.ticker.value = d.ticker;
    cf.emoji.value = d.emoji;
    cf.desc.value = d.desc;
    updatePreview();
  }
  function updatePreview() {
    const c = {
      id: "preview", hue: hueFor(cf.pair.value || "x"), emoji: cf.emoji.value || "✨", ticker: cf.ticker.value || "X",
    };
    $("#cpArt").outerHTML = `<div class="coin-art big" id="cpArt">${artSVG(c)}<span class="emo">${esc(c.emoji)}</span></div>`;
    $("#cpName").textContent = cf.name.value || `Claude × ${cf.pair.value || "?"}`;
    $("#cpTicker").textContent = "$" + (cf.ticker.value || "????").toUpperCase();
  }
  function openCreate(pair = "") {
    fillDraft(pair);
    cf.dev.value = "0";
    createDlg.showModal();
    (pair ? cf.name : cf.pair).focus();
  }

  let pairDebounce = 0;
  cf.pair.addEventListener("input", () => {
    clearTimeout(pairDebounce);
    pairDebounce = setTimeout(() => {
      const p = cf.pair.value.trim();
      if (!p) return updatePreview();
      const d = draftFor(p);
      cf.name.value = d.name; cf.ticker.value = d.ticker; cf.emoji.value = d.emoji; cf.desc.value = d.desc;
      updatePreview();
    }, 250);
  });
  [cf.name, cf.ticker, cf.emoji].forEach((el) => el.addEventListener("input", updatePreview));
  $("#rerollBtn").addEventListener("click", () => fillDraft(cf.pair.value.trim() || pick(PRESETS)[0]));

  $("#createForm").addEventListener("submit", (e) => {
    const submitter = e.submitter;
    if (!submitter || submitter.value !== "launch") return; // close button
    e.preventDefault();
    const pair = cap(cf.pair.value.trim());
    if (!pair) { cf.pair.focus(); toast("Claude × … what? Pick something to pair."); return; }
    const ticker = cf.ticker.value.trim().replace(/[^a-z0-9]/gi, "").toUpperCase() || tickerFor(pair);
    const d = {
      pair, name: cf.name.value.trim() || `Claude × ${pair}`, ticker,
      emoji: cf.emoji.value.trim() || emojiFor(pair), desc: cf.desc.value.trim() || pick(PITCHES)(pair),
    };
    const dev = Math.max(0, parseFloat(cf.dev.value) || 0);
    if (dev > state.balance) { toast(`Dev buy is more than your ◎${state.balance.toFixed(2)}.`); return; }
    const c = newCoin(d, "you");
    state.coins.unshift(c);
    pushFeed({ kind: "new", coin: c.id, t: Date.now() });
    if (dev > 0) youTrade(c, "buy", dev, true);
    createDlg.close();
    save();
    sortMode = "new"; setTabs();
    renderAll(c.id);
    toast(`$${c.ticker} is live ✳`);
    openCoin(c.id);
  });

  $("#quickPair").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("#quickInput").value.trim();
    openCreate(v);
    $("#quickInput").value = "";
  });
  $("#presetChips").innerHTML = PRESETS.slice(0, 12).map(([n, e]) => `<button class="chip" data-pair="${esc(n)}">${e} ${esc(n)}</button>`).join("");
  $("#presetChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pair]");
    if (b) openCreate(b.dataset.pair);
  });

  // ---------- trading as the player ----------
  function youTrade(c, side, amount, quiet = false) {
    if (c.graduated) { toast("This one graduated — trading moved off the curve."); return false; }
    if (side === "buy") {
      if (amount <= 0) return false;
      if (amount > state.balance + 1e-9) { toast("Not enough play SOL. Try the faucet."); return false; }
      const r = trade(c, "buy", amount, "you");
      if (!r) return false;
      state.balance -= r.sol;
      state.bags[c.id] = (state.bags[c.id] || 0) + r.tok;
      if (!quiet) toast(`Bought ${fmtTok(r.tok)} $${c.ticker} for ◎${fmtSol(r.sol)}`);
      if (c.graduated) toast(`$${c.ticker} graduated! 🎓 You pushed it over.`);
    } else {
      const have = state.bags[c.id] || 0;
      amount = Math.min(amount, have);
      if (amount <= 0) { toast("You don't hold any of this yet."); return false; }
      const r = trade(c, "sell", amount, "you");
      if (!r) return false;
      state.balance += r.sol;
      state.bags[c.id] = have - r.tok;
      if (state.bags[c.id] < 1) delete state.bags[c.id];
      if (!quiet) toast(`Sold ${fmtTok(r.tok)} $${c.ticker} for ◎${fmtSol(r.sol)}`);
    }
    save();
    return true;
  }

  // ---------- coin detail ----------
  const coinDlg = $("#coinDlg");
  function openCoin(id) {
    openCoinId = id;
    tradeSide = "buy";
    renderCoin(true);
    if (!coinDlg.open) coinDlg.showModal();
  }
  coinDlg.addEventListener("close", () => { openCoinId = null; });
  coinDlg.addEventListener("click", (e) => { if (e.target === coinDlg) coinDlg.close(); });
  createDlg.addEventListener("click", (e) => { if (e.target === createDlg) createDlg.close(); });

  function renderCoin(full) {
    const c = coinById(openCoinId);
    if (!c) return;
    const view = $("#coinView");
    const ch = change(c);
    const bag = state.bags[c.id] || 0;
    const statsHTML = `
      <span>mc <b>${fmtUsd(mcapUsd(c))}</b></span>
      <span>30m <b class="chg ${ch >= 0 ? "up" : "down"}">${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%</b></span>
      <span>vol <b>◎${fmtSol(c.volume)}</b></span>
      <span>curve <b>${(progress(c) * 100).toFixed(1)}%</b></span>
      <span>by <b>${esc(c.creator)}</b> · ${ago(c.createdAt)} ago</span>`;

    if (!full) {
      // light refresh: keep inputs/focus intact
      const st = view.querySelector(".cv-stats"); if (st) st.innerHTML = statsHTML;
      const bar = view.querySelector(".cv-bar > span"); if (bar) bar.style.width = (progress(c) * 100).toFixed(1) + "%";
      const tl = view.querySelector(".trades"); if (tl) tl.innerHTML = tradesHTML(c);
      const rl = view.querySelector(".replies"); if (rl && rl.childElementCount !== c.replies.length) rl.innerHTML = repliesHTML(c);
      const h = view.querySelector(".holding"); if (h) h.innerHTML = holdingHTML(c, bag);
      updateEstimate();
      drawChart(c);
      if (c.graduated && !view.querySelector(".trade .grad-note")) renderCoin(true);
      return;
    }

    view.innerHTML = `
      <div class="cv-head">
        ${artHTML(c, "huge")}
        <div style="min-width:0">
          <h2>${esc(c.name)} <span class="tk">$${esc(c.ticker)}</span></h2>
          <div class="muted">Claude × ${esc(c.pair)} — ${esc(c.desc)}</div>
          <div class="cv-stats">${statsHTML}</div>
        </div>
        <button class="x" id="cvClose" aria-label="Close">×</button>
      </div>
      <div class="cv-grid">
        <div class="panel">
          <h4>market cap (USD @ ◎1 = $${SOL_USD})</h4>
          <div class="chart-wrap"><canvas id="chart"></canvas></div>
          <div class="bar cv-bar" style="margin-top:12px"><span style="width:${(progress(c) * 100).toFixed(1)}%"></span></div>
          <p class="fine" style="margin-top:6px">${c.graduated
            ? "🎓 Bonding curve complete. This pairing graduated."
            : `Graduates when all ${fmtTok(CURVE_TOKENS)} curve tokens are sold (~◎${(V_SOL0 * V_TOK0 / (V_TOK0 - CURVE_TOKENS) - V_SOL0).toFixed(0)} in).`}</p>
        </div>
        <div class="panel trade">
          ${c.graduated ? `<p class="grad-note">🎓 <b>$${esc(c.ticker)}</b> graduated. The curve is closed — frame it and move on to the next pairing.</p>` : `
          <div class="seg">
            <button class="buy ${tradeSide === "buy" ? "on" : ""}" data-side="buy">buy</button>
            <button class="sell ${tradeSide === "sell" ? "on" : ""}" data-side="sell">sell</button>
          </div>
          <input id="amt" type="number" min="0" step="any" placeholder="${tradeSide === "buy" ? "amount in ◎" : "amount of $" + esc(c.ticker)}" />
          <div class="quick">${tradeSide === "buy"
            ? [0.1, 0.5, 1, 5].map((v) => `<button data-q="${v}">◎${v}</button>`).join("") + `<button data-q="max">max</button>`
            : [25, 50, 75, 100].map((v) => `<button data-p="${v}">${v}%</button>`).join("")}</div>
          <div class="est" id="est"></div>
          <button class="btn wide go ${tradeSide}" id="goBtn">${tradeSide === "buy" ? "buy" : "sell"} $${esc(c.ticker)}</button>`}
          <div class="holding">${holdingHTML(c, bag)}</div>
        </div>
      </div>
      <div class="lists">
        <div class="panel"><h4>trades</h4><ul class="trades">${tradesHTML(c)}</ul></div>
        <div class="panel"><h4>thread</h4><ul class="replies">${repliesHTML(c)}</ul>
          <form class="reply-form" id="replyForm"><input id="replyIn" maxlength="140" placeholder="say something helpful" /><button class="btn primary small">post</button></form>
        </div>
      </div>`;

    $("#cvClose").onclick = () => coinDlg.close();
    view.querySelectorAll(".seg button").forEach((b) => b.onclick = () => { tradeSide = b.dataset.side; renderCoin(true); });
    const amt = $("#amt");
    if (amt) {
      amt.oninput = updateEstimate;
      view.querySelectorAll(".quick [data-q]").forEach((b) => b.onclick = () => {
        amt.value = b.dataset.q === "max" ? Math.max(0, state.balance - 0.001).toFixed(3) : b.dataset.q;
        updateEstimate();
      });
      view.querySelectorAll(".quick [data-p]").forEach((b) => b.onclick = () => {
        const have = state.bags[c.id] || 0;
        amt.value = Math.floor(have * (+b.dataset.p) / 100);
        updateEstimate();
      });
      $("#goBtn").onclick = () => {
        const v = parseFloat(amt.value);
        if (!(v > 0)) { amt.focus(); return; }
        if (youTrade(c, tradeSide, v)) { amt.value = ""; renderAll(c.id); }
      };
      amt.onkeydown = (e) => { if (e.key === "Enter") $("#goBtn").click(); };
    }
    $("#replyForm").onsubmit = (e) => {
      e.preventDefault();
      const v = $("#replyIn").value.trim();
      if (!v) return;
      c.replies.push({ who: "you", text: v, t: Date.now() });
      $("#replyIn").value = "";
      save();
      view.querySelector(".replies").innerHTML = repliesHTML(c);
      // Someone always replies.
      setTimeout(() => {
        c.replies.push({ who: wallet(), text: pick(REPLIES), t: Date.now() });
        save();
        if (openCoinId === c.id) view.querySelector(".replies").innerHTML = repliesHTML(c);
      }, rand(1200, 3500));
    };
    updateEstimate();
    requestAnimationFrame(() => drawChart(c));
  }

  function holdingHTML(c, bag) {
    return `you: ◎${state.balance.toFixed(3)} · ${fmtTok(bag)} $${esc(c.ticker)}${bag > 1 ? ` (≈ ◎${fmtSol(quoteSell(c, bag).sol)})` : ""}`;
  }
  function tradesHTML(c) {
    if (!c.trades.length) return `<li class="muted" style="display:block">no trades yet — be first</li>`;
    return c.trades.slice(0, 40).map((t) => `<li>
      <span>${esc(t.who)}</span><span class="${t.side === "buy" ? "b" : "s"}">${t.side}</span>
      <span>◎${fmtSol(t.sol)} · ${fmtTok(t.tok)}</span><span class="muted">${ago(t.t)}</span></li>`).join("");
  }
  function repliesHTML(c) {
    if (!c.replies.length) return `<li class="muted">quiet in here…</li>`;
    return c.replies.slice(-30).reverse().map((r) => `<li><div class="who">${esc(r.who)} · ${ago(r.t)} ago</div>${esc(r.text)}</li>`).join("");
  }

  function updateEstimate() {
    const c = coinById(openCoinId);
    const est = $("#est"), amt = $("#amt");
    if (!c || !est || !amt) return;
    const v = parseFloat(amt.value);
    if (!(v > 0)) { est.textContent = ""; return; }
    if (tradeSide === "buy") {
      const q = quoteBuy(c, v);
      const after = { vSol: c.vSol + q.net, vTok: c.vTok - q.out };
      const impact = (after.vSol / after.vTok / price(c) - 1) * 100;
      est.textContent = `≈ ${fmtTok(q.out)} $${c.ticker} · impact +${impact.toFixed(2)}%${q.sol < v - 1e-9 ? ` · capped at ◎${fmtSol(q.sol)} (curve full)` : ""}`;
    } else {
      const q = quoteSell(c, Math.min(v, state.bags[c.id] || 0));
      est.textContent = `≈ ◎${fmtSol(q.sol)} after 1% fee`;
    }
  }

  function drawChart(c) {
    const cv = document.getElementById("chart");
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext("2d");
    g.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--accent").trim();
    const line = css.getPropertyValue("--line").trim();
    const ink2 = css.getPropertyValue("--ink-2").trim();
    const pts = c.history.map((p) => ({ t: p.t, v: p.p * TOTAL_SUPPLY * SOL_USD }));
    if (pts.length === 1) pts.push({ t: Date.now(), v: pts[0].v });
    const t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, t0 + 1);
    let lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v));
    const pad = (hi - lo) * 0.12 || hi * 0.05;
    lo = Math.max(0, lo - pad); hi += pad;
    const L = 52, R = 8, T = 8, B = 20;
    const x = (t) => L + ((t - t0) / (t1 - t0)) * (w - L - R);
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (h - T - B);

    g.clearRect(0, 0, w, h);
    g.font = "11px JetBrains Mono, monospace";
    g.fillStyle = ink2; g.strokeStyle = line; g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const v = lo + ((hi - lo) * i) / 4, yy = y(v);
      g.beginPath(); g.moveTo(L, yy); g.lineTo(w - R, yy); g.stroke();
      g.fillText(fmtUsd(v), 4, yy + 4);
    }
    g.fillText(ago(t0) + " ago", L, h - 4);
    const nowLbl = "now"; g.fillText(nowLbl, w - R - g.measureText(nowLbl).width, h - 4);

    // area + stepped line (price only changes on trades)
    g.beginPath();
    g.moveTo(x(pts[0].t), y(pts[0].v));
    for (let i = 1; i < pts.length; i++) { g.lineTo(x(pts[i].t), y(pts[i - 1].v)); g.lineTo(x(pts[i].t), y(pts[i].v)); }
    g.lineTo(w - R, y(pts[pts.length - 1].v));
    g.strokeStyle = accent; g.lineWidth = 2; g.stroke();
    g.lineTo(w - R, h - B); g.lineTo(x(pts[0].t), h - B); g.closePath();
    const grad = g.createLinearGradient(0, T, 0, h - B);
    grad.addColorStop(0, accent + "55"); grad.addColorStop(1, accent + "00");
    g.fillStyle = grad; g.fill();
  }

  // ---------- simulated market ----------
  function botTick() {
    const live = state.coins.filter((c) => !c.graduated);
    if (live.length) {
      // favor recent + hot coins
      const weights = live.map((c) => 1 + 3 * progress(c) + (Date.now() - c.lastTrade < 20_000 ? 2 : 0) + (Date.now() - c.createdAt < 600_000 ? 2 : 0));
      let r = Math.random() * weights.reduce((a, b) => a + b, 0), c = live[0];
      for (let i = 0; i < live.length; i++) { r -= weights[i]; if (r <= 0) { c = live[i]; break; } }
      const buyBias = 0.58 + (c.creator === "you" ? 0.06 : 0);
      if (Math.random() < buyBias || c.sold < 5e6) trade(c, "buy", Math.random() < 0.1 ? rand(3, 9) : rand(0.05, 2.2), wallet());
      else trade(c, "sell", c.sold * rand(0.01, 0.12), wallet());
      if (Math.random() < 0.06) c.replies.push({ who: wallet(), text: pick(REPLIES), t: Date.now() });
    }
    // occasionally a stranger launches a new pairing
    if (Math.random() < 0.025 && state.coins.length < 80) {
      const c = newCoin(draftFor(pick(PRESETS)[0]), wallet());
      state.coins.push(c);
      pushFeed({ kind: "new", coin: c.id, t: Date.now() });
    }
    save();
    renderAll();
    setTimeout(botTick, rand(900, 2600));
  }

  // ---------- wiring ----------
  function setTabs() {
    document.querySelectorAll("#sortTabs button").forEach((b) => b.classList.toggle("active", b.dataset.sort === sortMode));
  }
  $("#sortTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-sort]");
    if (!b) return;
    sortMode = b.dataset.sort; setTabs(); renderGrid();
  });
  $("#search").addEventListener("input", (e) => { query = e.target.value.trim(); renderGrid(); });
  const openFrom = (e) => {
    const el = e.target.closest("[data-id]");
    if (el) openCoin(el.dataset.id);
  };
  grid.addEventListener("click", openFrom);
  $("#koth").addEventListener("click", openFrom);
  [grid, $("#koth")].forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter") openFrom(e); }));
  $("#faucetBtn").addEventListener("click", () => {
    state.balance += 10; save(); renderWallet();
    if (openCoinId) renderCoin(false);
    toast("+◎10 play SOL. Claude says: please trade responsibly.");
  });
  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("Wipe all coins, bags and balance and start over?")) return;
    state = seed(); save(); renderAll(); toast("Fresh start ✳");
  });
  window.addEventListener("resize", () => { if (openCoinId) drawChart(coinById(openCoinId)); });

  renderAll();
  setTimeout(botTick, 1200);
})();
