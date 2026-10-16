/* VHarness-SRSI project page — interactive figures.
   Data: window.SRSI_DATA (static/data/data.js). */
(function () {
  "use strict";
  const DATA = window.SRSI_DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const C = {
    blue: "var(--blue)", orange: "var(--orange)", purple: "var(--purple)", gold: "var(--gold)",
    green: "var(--green)", red: "var(--red)", muted: "var(--muted)", line: "var(--line)", ink: "var(--ink)",
  };

  /* ---------------------------------------------------------------- utilities */
  const tip = $("#tooltip");
  function showTip(html, ev) {
    tip.innerHTML = html;
    tip.style.opacity = 1;
    moveTip(ev);
  }
  function moveTip(ev) {
    const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = ev.clientY - h - pad;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }
  function hideTip() { tip.style.opacity = 0; }
  const chips = (arr, n = 8) =>
    `<div class="chips">${arr.slice(0, n).map((c) => `<span class="chip">${c}</span>`).join("")}${arr.length > n ? `<span class="chip">+${arr.length - n}</span>` : ""}</div>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // Run a callback the first time an element scrolls into view.
  function onVisible(el, cb, threshold = 0.3) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) return cb();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { io.disconnect(); cb(); } });
    }, { threshold });
    io.observe(el);
  }

  function axes(g, x, y, W, H, { xLabel, yLabel, xTicks = 6, yTicks = 6, yFmt = (d) => d } = {}) {
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(yTicks).tickSize(-W).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x).ticks(xTicks).tickSizeOuter(0));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(yTicks).tickFormat(yFmt).tickSizeOuter(0));
    if (xLabel) g.append("text").attr("class", "axis-label").attr("x", W / 2).attr("y", H + 40).attr("text-anchor", "middle").text(xLabel);
    if (yLabel) g.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("x", -H / 2).attr("y", -42).attr("text-anchor", "middle").text(yLabel);
  }

  /* ---------------------------------------------------------------- theme */
  (function theme() {
    const root = document.documentElement;
    try { const t = localStorage.getItem("srsi-theme"); if (t) root.dataset.theme = t; } catch (e) { /* storage blocked */ }
    $("#themeBtn").addEventListener("click", () => {
      const dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem("srsi-theme", root.dataset.theme); } catch (e) { /* ignore */ }
    });
  })();

  /* ---------------------------------------------------------------- nav */
  (function nav() {
    const navEl = $("#nav");
    const links = $$(".nav li a");
    const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    const onScroll = () => {
      navEl.classList.toggle("scrolled", window.scrollY > 10);
      let cur = null;
      sections.forEach((s) => { if (s.getBoundingClientRect().top < 120) cur = s.id; });
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + cur));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    $$('a[aria-disabled="true"]').forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));
  })();

  /* ---------------------------------------------------------------- reveal + counters */
  (function reveal() {
    const els = $$(".reveal");
    if (!("IntersectionObserver" in window) || reduceMotion) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    els.forEach((e) => io.observe(e));
  })();

  (function counters() {
    $$("[data-count]").forEach((el) => {
      const target = +el.dataset.count, dec = +(el.dataset.dec || 0);
      const pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
      const fmt = (v) => pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US")) + suf;
      if (reduceMotion) { el.textContent = fmt(target); return; }
      const t0 = performance.now(), dur = 1600;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * e);
        if (p < 1) requestAnimationFrame(step);
      };
      setTimeout(() => requestAnimationFrame(step), 350);
    });
  })();

  /* ---------------------------------------------------------------- failure modes */
  (function modes() {
    const tabs = $$(".mode-tab"), terms = $$(".eq-term"), defs = $$(".eq-def"), defBox = $("#eqDefs");
    const modeToDef = { overfit: "fit", dilution: "noise", trap: "inflation" };
    function showDef(key) {
      defs.forEach((d) => d.classList.toggle("active", d.dataset.def === key));
      terms.forEach((t) => t.classList.toggle("sel", t.dataset.def === key));
      const cur = terms.find((t) => t.dataset.def === key);
      defBox.classList.toggle("good", !!cur && cur.classList.contains("good"));
      defBox.classList.toggle("bad", !!cur && cur.hasAttribute("data-mode"));
    }
    function select(id, defKey) {
      tabs.forEach((t) => t.classList.toggle("active", t.dataset.target === id));
      $$(".mode-panel").forEach((p) => p.classList.toggle("active", p.id === "mode-" + id));
      terms.forEach((t) => t.classList.toggle("hl", !!t.dataset.mode && t.dataset.mode.split(" ").includes(id)));
      showDef(defKey || modeToDef[id]);
    }
    tabs.forEach((t) => t.addEventListener("click", () => select(t.dataset.target)));
    terms.forEach((t) => {
      t.addEventListener("click", () => {
        if (t.dataset.mode) select(t.dataset.mode.split(" ")[0], t.dataset.def);
        else { terms.forEach((x) => x.classList.remove("hl")); showDef(t.dataset.def); }
      });
      t.addEventListener("mouseenter", () => {
        const ids = (t.dataset.mode || "").split(" ");
        tabs.forEach((b) => b.style.borderColor = ids.includes(b.dataset.target) ? "var(--red)" : "");
      });
      t.addEventListener("mouseleave", () => tabs.forEach((b) => (b.style.borderColor = "")));
    });
    select("overfit");
  })();

  /* ---------------------------------------------------------------- hero background:
     every real best-so-far curve, redrawn slowly as glowing traces */
  (function hero() {
    const cv = $("#heroCanvas");
    if (!cv || !DATA) return;
    const ctx = cv.getContext("2d");
    const curves = [];
    DATA.curves.forEach((r) => curves.push({ pts: r.points.map((p) => p.best), color: r.method === "SRSI" ? [127, 178, 255] : [240, 154, 82] }));
    // BRSI retrieval run (per-iteration best).
    let b = DATA.brsi_retrieval.seed.val;
    const br = [b];
    DATA.brsi_retrieval.candidates.forEach((c) => { b = Math.max(b, c.val); br.push(b); });
    curves.push({ pts: br, color: [240, 197, 110] });
    // Raw candidate scatter of SRSI seed 1 (the noisy evidence).
    const scatter = DATA.curves.filter((r) => r.method === "SRSI").flatMap((r, i) =>
      r.points.map((p) => ({ x: p.k / r.points.length, v: p.val, i })));

    let W, H, dpr;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener("resize", size);
    const yv = (v) => H * 0.92 - ((v - 58) / (79 - 58)) * H * 0.8;

    function draw(p) {
      ctx.clearRect(0, 0, W, H);
      // noisy candidate dots
      scatter.forEach((s) => {
        if (s.x > p) return;
        ctx.fillStyle = `rgba(160,180,220,${0.18})`;
        ctx.beginPath(); ctx.arc(s.x * W, yv(s.v), 1.6, 0, 7); ctx.fill();
      });
      curves.forEach((c, ci) => {
        const n = c.pts.length, lim = Math.floor(p * (n - 1));
        ctx.beginPath();
        for (let i = 0; i <= lim; i++) {
          const x = (i / (n - 1)) * W, y = yv(c.pts[i]);
          if (i === 0) ctx.moveTo(x, y);
          else { ctx.lineTo(x, yv(c.pts[i - 1])); ctx.lineTo(x, y); } // step
        }
        ctx.strokeStyle = `rgba(${c.color.join(",")},${ci === curves.length - 1 ? 0.75 : 0.5})`;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = `rgba(${c.color.join(",")},0.8)`;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (lim >= 0 && p < 1) {
          const x = (lim / (n - 1)) * W, y = yv(c.pts[lim]);
          ctx.fillStyle = `rgba(${c.color.join(",")},0.95)`;
          ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill();
        }
      });
    }
    if (reduceMotion) { draw(1); return; }
    let t0 = null;
    const DUR = 9000, HOLD = 3500;
    function loop(t) {
      if (t0 === null) t0 = t;
      const e = (t - t0) % (DUR + HOLD);
      draw(Math.min(1, e / DUR));
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  /* ---------------------------------------------------------------- Fig. 1(a): BRSI retrieval evolution */
  (function brsiEvolution() {
    const svg = d3.select("#evoChart");
    if (svg.empty()) return;
    const D = DATA.brsi_retrieval;
    const M = { t: 16, r: 20, b: 50, l: 54 }, W = 760 - M.l - M.r, H = 380 - M.t - M.b;
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const x = d3.scaleLinear().domain([0, 50]).range([0, W]);
    const y = d3.scaleLinear().domain([62, 76]).range([H, 0]);
    axes(g, x, y, W, H, { xLabel: "iteration", yLabel: "validation accuracy (%)", xTicks: 10, yTicks: 7 });

    // Candidate records with running champion.
    const milestones = new Set(D.milestones);
    let best = D.seed.val, bestName = D.seed.name, bestComps = ["clip-retrieval", "top-k"];
    const cands = D.candidates.map((c) => {
      const isNew = c.val > best || (c.val === best && milestones.has(c.name));
      if (isNew) { best = c.val; bestName = c.name; bestComps = c.components; }
      return { ...c, isNew, best, bestName, bestComps };
    });
    const byIt = d3.rollups(cands, (v) => ({ min: d3.min(v, (d) => d.val), max: d3.max(v, (d) => d.val), best: v[v.length - 1].best }), (d) => d.it)
      .map(([it, o]) => ({ it, ...o }));
    const bestLine = [{ it: 0, best: D.seed.val }, ...byIt];

    const clipId = "evoClip";
    svg.append("defs").append("clipPath").attr("id", clipId).append("rect").attr("x", -6).attr("y", -20).attr("height", H + 40).attr("width", 0);
    const clipRect = svg.select(`#${clipId} rect`);

    g.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(D.seed.val)).attr("y2", y(D.seed.val))
      .attr("stroke-dasharray", "3 4").style("stroke", C.muted);
    g.append("text").attr("x", W - 4).attr("y", y(D.seed.val) + 16).attr("text-anchor", "end")
      .style("fill", C.muted).style("font-size", "12px").text(`clip_topk seed ${D.seed.val}`);

    const layer = g.append("g").attr("clip-path", `url(#${clipId})`);
    layer.append("path").datum(byIt)
      .attr("d", d3.area().x((d) => x(d.it)).y0((d) => y(d.min)).y1((d) => y(d.max)).curve(d3.curveMonotoneX))
      .style("fill", C.orange).style("opacity", 0.14);
    layer.append("path").datum(bestLine)
      .attr("d", d3.line().x((d) => x(d.it)).y((d) => y(d.best)).curve(d3.curveStepAfter))
      .style("fill", "none").style("stroke", C.orange).attr("stroke-width", 2.6);

    const dots = g.append("g").selectAll("circle").data(cands).join("circle")
      .attr("cx", (d) => x(d.it) + (Math.random() - 0.5) * 4).attr("cy", (d) => y(d.val))
      .attr("r", 0)
      .style("fill", (d) => (d.isNew ? C.orange : "var(--surface)"))
      .style("stroke", (d) => (d.isNew ? C.orange : C.muted))
      .attr("stroke-width", 1.2)
      .style("cursor", "pointer")
      .on("mouseenter", (ev, d) => showTip(`<b>${esc(d.name)}</b> · iter ${d.it}<br>val ${d.val}%${d.frames ? ` · ${d.frames} frames` : ""}${d.isNew ? "<br><span style='color:#f3c872'>★ new champion</span>" : ""}${chips(d.components)}`, ev))
      .on("mousemove", moveTip).on("mouseleave", hideTip);

    const starPath = d3.symbol().type(d3.symbolStar).size(210)();
    const msData = cands.filter((c) => milestones.has(c.name));
    const stars = g.append("g").selectAll("g").data(msData).join("g")
      .attr("transform", (d) => `translate(${x(d.it)},${y(d.val)})`).style("opacity", 0);
    stars.append("path").attr("d", starPath).style("fill", C.red).style("stroke", "var(--surface)").attr("stroke-width", 1.2);
    stars.append("text").attr("x", (d) => (d.it > 40 ? -10 : 10)).attr("y", (d) => (d.it > 40 ? -14 : 22))
      .attr("text-anchor", (d) => (d.it > 40 ? "end" : "start"))
      .attr("class", "halo").style("fill", C.red).style("font", "600 12.5px var(--f-mono)").text((d) => `${d.name} ${d.val}%`);

    const cursor = g.append("line").attr("y1", 0).attr("y2", H).style("stroke", C.ink).style("opacity", 0.15);

    // Side panel.
    const nameEl = $("#champName"), accEl = $("#champAcc"), deltaEl = $("#champDelta"), chipsEl = $("#champChips"),
      logEl = $("#evoLog"), champEl = $("#evoChamp"), slider = $("#evoSlider"), iterEl = $("#evoIter");
    let lastChamp = null;
    function panel(t) {
      const seen = cands.filter((c) => c.it <= t);
      const cur = seen.length ? seen[seen.length - 1] : null;
      const name = cur ? cur.bestName : D.seed.name;
      const val = cur ? cur.best : D.seed.val;
      if (name !== lastChamp) {
        nameEl.textContent = name;
        accEl.textContent = val.toFixed(1);
        deltaEl.textContent = cur ? `+${(val - D.seed.val).toFixed(1)} pts over seed` : "seed harness";
        chipsEl.innerHTML = chips(cur ? cur.bestComps : ["clip-retrieval", "top-k"], 10).replace(/^<div class="chips">|<\/div>$/g, "");
        if (lastChamp !== null) { champEl.classList.remove("flash"); void champEl.offsetWidth; champEl.classList.add("flash"); }
        lastChamp = name;
      }
      const news = seen.filter((c) => c.isNew);
      logEl.innerHTML = news.slice().reverse().map((c) => `<li>it ${String(c.it).padStart(2, " ")} · <b>${esc(c.name)}</b> ${c.val}%</li>`).join("") ||
        "<li>waiting for the first improvement…</li>";
    }

    function render(t) {
      clipRect.attr("width", x(t) + 6);
      cursor.attr("x1", x(t)).attr("x2", x(t)).style("opacity", t > 0 && t < 50 ? 0.15 : 0);
      dots.attr("r", (d) => (d.it <= t ? (d.isNew ? 4.2 : 3) : 0));
      stars.style("opacity", (d) => (d.it <= t ? 1 : 0));
      panel(t);
      slider.value = Math.floor(t);
      iterEl.textContent = `${Math.floor(t)} / 50`;
    }

    // Playback.
    let t = 0, playing = false, raf = null, last = null, speed = 1;
    const playBtn = $("#evoPlay");
    function frame(ts) {
      if (last === null) last = ts;
      t = Math.min(50, t + ((ts - last) / 1000) * 3.2 * speed);
      last = ts;
      render(t);
      if (t >= 50) return stop();
      raf = requestAnimationFrame(frame);
    }
    function play() { if (t >= 50) t = 0; playing = true; last = null; playBtn.textContent = "❚❚ Pause"; raf = requestAnimationFrame(frame); }
    function stop() { playing = false; cancelAnimationFrame(raf); playBtn.textContent = t >= 50 ? "▶ Replay" : "▶ Play"; }
    playBtn.addEventListener("click", () => (playing ? stop() : play()));
    $("#evoReset").addEventListener("click", () => { stop(); t = 0; render(0); playBtn.textContent = "▶ Play"; });
    $("#evoSpeed").addEventListener("click", (e) => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; e.currentTarget.textContent = speed + "×"; });
    slider.addEventListener("input", () => { stop(); t = +slider.value; render(t); });
    render(0);
    onVisible($("#evoCard"), () => { if (reduceMotion) { t = 50; render(50); } else play(); }, 0.45);
  })();

  /* ---------------------------------------------------------------- Fig. 1(b): held-out vs frames */
  (function aks() {
    const svg = d3.select("#aksChart");
    if (svg.empty()) return;
    const rows = DATA.brsi_retrieval.heldout.filter((d) => !/base champ/.test(d.system));
    const M = { t: 20, r: 20, b: 50, l: 54 }, W = 520 - M.l - M.r, H = 330 - M.t - M.b;
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const x = d3.scaleLinear().domain([10, 70]).range([0, W]);
    const y = d3.scaleLinear().domain([60, 70]).range([H, 0]);
    axes(g, x, y, W, H, { xLabel: "average frames per question", yLabel: "held-out accuracy (%)", yTicks: 5 });
    const color = (d) => (d.group === "human AKS" ? C.gold : d.group.startsWith("meta") ? C.orange : C.muted);
    const label = (d) => d.system.replace(" (human)", "").replace("a01 champ (medium_augspread)", "BRSI · medium_augspread");
    const pts = g.selectAll("g.pt").data(rows).join("g").attr("class", "pt")
      .attr("transform", (d) => `translate(${x(d.frames)},${y(60)})`).style("opacity", 0);
    pts.append("path").attr("d", (d) => d3.symbol().type(d.group === "human AKS" ? d3.symbolTriangle : d.group === "baseline" ? d3.symbolSquare : d3.symbolCircle).size(d.group.startsWith("meta") ? 190 : 110)())
      .style("fill", color);
    pts.append("text")
      .attr("x", (d) => (d.frames > 55 || d.group.startsWith("meta") ? -12 : 10))
      .attr("y", (d) => (/clip64/.test(d.system) ? 18 : /blip64/.test(d.system) ? -12 : 4))
      .attr("text-anchor", (d) => (d.frames > 55 || d.group.startsWith("meta") ? "end" : "start"))
      .style("fill", color).style("font", (d) => (d.group.startsWith("meta") ? "600 12.5px var(--f-body)" : "12px var(--f-body)"))
      .text((d) => `${label(d)} ${d.test}%`);
    pts.on("mouseenter", (ev, d) => showTip(`<b>${esc(label(d))}</b><br>held-out ${d.test}% · val ${d.val}%<br>${d.frames} frames / question`, ev))
      .on("mousemove", moveTip).on("mouseleave", hideTip);
    // Arrow from AKS-64 to the evolved harness: same accuracy, fewer frames.
    const meta = rows.find((d) => d.group.startsWith("meta"));
    const arrow = g.append("path").attr("d", `M${x(60)},${y(68.4) - 22} C${x(52)},${y(68.4) - 40} ${x(45)},${y(68.4) - 36} ${x(meta.frames) + 10},${y(68.4) - 10}`)
      .style("fill", "none").style("stroke", C.orange).attr("stroke-width", 1.4).attr("stroke-dasharray", "4 3").style("opacity", 0);
    const note = g.append("text").attr("x", x(49)).attr("y", y(68.4) - 42).attr("text-anchor", "middle")
      .style("fill", C.orange).style("font", "600 12.5px var(--f-body)").style("opacity", 0).text("−38.7% frames");
    onVisible(svg.node(), () => {
      pts.transition().delay((d, i) => i * 140).duration(reduceMotion ? 0 : 800).ease(d3.easeBackOut)
        .attr("transform", (d) => `translate(${x(d.frames)},${y(d.test)})`).style("opacity", 1);
      arrow.transition().delay(1300).duration(600).style("opacity", 0.9);
      note.transition().delay(1300).duration(600).style("opacity", 1);
    });

    // Milestone timeline.
    const cands = DATA.brsi_retrieval.candidates;
    $("#milestones").innerHTML = DATA.brsi_retrieval.milestones.map((n) => {
      const c = cands.find((d) => d.name === n);
      return `<div class="ms"><div class="star">★</div><b>${esc(n)}</b><div class="v">${c.val}%</div><div class="i">iteration ${c.it}</div></div>`;
    }).join("");
  })();

  /* ---------------------------------------------------------------- method stepper */
  const stepHooks = {};
  (function stepper() {
    const steps = $$(".step"), bodies = $$(".step-body");
    function go(i) {
      steps.forEach((s) => s.classList.toggle("active", s.dataset.step === String(i)));
      bodies.forEach((b) => b.classList.toggle("active", b.dataset.step === String(i)));
      if (stepHooks[i]) stepHooks[i]();
    }
    steps.forEach((s) => s.addEventListener("click", () => go(+s.dataset.step)));
  })();

  // Stage I: composition of warm-up rounds (3 free + removal + intensity).
  (function warmViz() {
    const svg = d3.select("#warmViz");
    const rounds = 10, per = [
      { k: "free", c: C.purple, l: "free proposal" }, { k: "free", c: C.purple }, { k: "free", c: C.purple },
      { k: "rm", c: C.red, l: "removal (drop one family)" }, { k: "int", c: C.gold, l: "intensity change" },
    ];
    const g = svg.append("g").attr("transform", "translate(70,14)");
    const cw = 50, ch = 20;
    for (let s = 0; s < 5; s++) {
      g.append("text").attr("x", -10).attr("y", s * (ch + 6) + 14).attr("text-anchor", "end")
        .style("fill", C.muted).style("font", "11px var(--f-mono)").text(s < 3 ? "free" : s === 3 ? "remove" : "intensity");
    }
    const cells = [];
    for (let r = 0; r < rounds; r++) for (let s = 0; s < 5; s++) cells.push({ r, s, ...per[s] });
    const rects = g.selectAll("g.c").data(cells).join("g").attr("class", "c")
      .attr("transform", (d) => `translate(${d.r * (cw + 6)},${d.s * (ch + 6)})`);
    rects.append("rect").attr("width", cw).attr("height", ch).attr("rx", 5)
      .style("fill", (d) => d.c).style("opacity", 0);
    g.append("text").attr("x", 0).attr("y", 5 * (ch + 6) + 12).style("fill", C.muted).style("font", "11px var(--f-body)")
      .text("warm-up rounds →   ·   each mechanism gets many controlled contrasts before any direction is closed");
    function run() {
      rects.selectAll("rect").style("opacity", 0).transition().delay((d) => d.r * 160 + d.s * 30).duration(300).style("opacity", (d) => (d.s < 3 ? 0.35 : 0.9));
    }
    stepHooks[1] = run;
  })();

  // Stage II: probe–race on real branch data.
  (function raceViz() {
    const svg = d3.select("#raceViz");
    const M = { t: 14, r: 16, b: 34, l: 160 }, W = 640 - M.l - M.r, H = 330 - M.t - M.b;
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    let seed = 1;
    function draw() {
      g.selectAll("*").remove();
      const S = DATA.stages.find((s) => s.seed === seed);
      const br = S.branches.slice().sort((a, b) => b.vals.length - a.vals.length || d3.max(b.vals) - d3.max(a.vals));
      const lo = Math.min(60, d3.min(br, (b) => d3.min(b.vals)));
      const x = d3.scaleLinear().domain([Math.max(58, Math.floor(lo)), 76]).range([0, W]).clamp(true);
      const y = d3.scaleBand().domain(br.map((b) => b.axis)).range([0, H]).padding(0.3);
      g.append("g").attr("class", "grid").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x).ticks(8).tickSize(-H).tickFormat(""));
      g.append("g").attr("class", "axis").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x).ticks(8).tickSizeOuter(0));
      g.append("text").attr("class", "axis-label").attr("x", W / 2).attr("y", H + 30).attr("text-anchor", "middle").text("validation accuracy (%)");
      g.selectAll("text.ax").data(br).join("text").attr("class", "ax").attr("x", -10).attr("y", (d) => y(d.axis) + y.bandwidth() / 2 + 2)
        .attr("text-anchor", "end").style("font", "12px var(--f-mono)").style("fill", (d) => (d.raced ? C.ink : C.muted)).text((d) => d.axis);
      g.selectAll("text.tag").data(br).join("text").attr("class", "tag").attr("x", -10).attr("y", (d) => y(d.axis) + y.bandwidth() / 2 + 18)
        .attr("text-anchor", "end").style("font", "600 10.5px var(--f-mono)").style("fill", (d) => (d.raced ? C.gold : C.muted))
        .style("opacity", 0).text((d) => (d.raced ? "RACED · 15" : "probe only · 3"));
      g.append("line").attr("x1", x(S.h0.val)).attr("x2", x(S.h0.val)).attr("y1", -4).attr("y2", H)
        .style("stroke", C.purple).attr("stroke-width", 1.6).attr("stroke-dasharray", "5 4");
      g.append("text").attr("x", x(S.h0.val) - 6).attr("y", 6).attr("text-anchor", "end").attr("class", "halo").style("fill", C.purple).style("font", "600 11px var(--f-mono)")
        .text(`H₀ ${S.h0.name} ${S.h0.val}%`);
      const pts = br.flatMap((b) => b.vals.map((v, i) => ({ axis: b.axis, v, i, name: b.names[i], raced: b.raced })));
      const dots = g.selectAll("circle.p").data(pts).join("circle").attr("class", "p")
        .attr("cx", (d) => x(d.v)).attr("cy", (d) => y(d.axis) + y.bandwidth() / 2 + ((d.i % 3) - 1) * 5)
        .attr("r", 0).style("fill", (d) => (d.i < 3 ? C.gold : "color-mix(in srgb, var(--gold) 55%, transparent)"))
        .style("stroke", (d) => (d.v > S.h0.val ? C.green : "none")).attr("stroke-width", 2)
        .on("mouseenter", (ev, d) => showTip(`<b>${esc(d.name)}</b><br>${d.axis} · ${d.i < 3 ? "probe" : "race"} #${d.i + 1}<br>val ${d.v}% (${d.v >= S.h0.val ? "+" : ""}${(d.v - S.h0.val).toFixed(2)} vs H₀)`, ev))
        .on("mousemove", moveTip).on("mouseleave", hideTip);
      const bestMark = g.selectAll("path.b").data(br).join("path").attr("class", "b")
        .attr("d", d3.symbol().type(d3.symbolDiamond).size(90)())
        .attr("transform", (d) => `translate(${x(d3.max(d.vals))},${y(d.axis) + y.bandwidth() / 2 - 12})`)
        .style("fill", (d) => (d.raced ? C.gold : C.muted)).style("opacity", 0);
      const dly = reduceMotion ? () => 0 : (d) => (d.i < 3 ? d.i * 220 + br.findIndex((b) => b.axis === d.axis) * 60 : 900 + (d.i - 3) * 110);
      dots.transition().delay(dly).duration(reduceMotion ? 0 : 350).attr("r", 4.5);
      g.selectAll("text.tag").transition().delay(reduceMotion ? 0 : 800).duration(400).style("opacity", 1);
      bestMark.transition().delay(reduceMotion ? 0 : 2400).duration(400).style("opacity", 1);
    }
    $$('.seed-switch[data-target="race"] button').forEach((b) => b.addEventListener("click", () => {
      $$('.seed-switch[data-target="race"] button').forEach((x) => x.classList.toggle("on", x === b));
      seed = +b.dataset.seed; draw();
    }));
    $("#raceReplay").addEventListener("click", draw);
    stepHooks[2] = draw;
  })();

  // Stage III: factorial lattice on real cells.
  (function latticeViz() {
    const svg = d3.select("#latticeViz");
    let seed = 1;
    const W = 640, H = 360;
    function draw() {
      svg.selectAll("*").remove();
      const S = DATA.stages.find((s) => s.seed === seed);
      const axesNames = S.cells.filter((c) => c.axes.length === 1).map((c) => c.axes[0]);
      const letter = (a) => "ABC"[axesNames.indexOf(a)];
      const cellColor = [C.blue, C.purple, C.gold];
      const nodes = [{ key: "", axes: [], val: S.h0.val, name: "H₀ · " + S.h0.name }].concat(
        S.cells.map((c) => ({ key: c.axes.map(letter).sort().join(""), axes: c.axes, val: c.val, name: c.name })));
      const levels = [[""], ["A", "B", "C"], ["AB", "AC", "BC"], ["ABC"]];
      const pos = {};
      levels.forEach((lv, li) => lv.forEach((k, i) => { pos[k] = { x: W / 2 + (i - (lv.length - 1) / 2) * 190, y: 34 + li * 84 }; }));
      const diverge = d3.scaleDiverging([-3, 0, 3], (t) => d3.interpolateRdYlGn(t));
      const edges = [];
      nodes.forEach((a) => nodes.forEach((b) => {
        if (b.key.length === a.key.length + 1 && a.key.split("").every((c) => b.key.includes(c))) edges.push([a.key, b.key]);
      }));
      svg.append("g").selectAll("line").data(edges).join("line")
        .attr("x1", (d) => pos[d[0]].x).attr("y1", (d) => pos[d[0]].y).attr("x2", (d) => pos[d[1]].x).attr("y2", (d) => pos[d[1]].y)
        .style("stroke", C.green).style("opacity", 0).attr("stroke-width", 1.3)
        .transition().delay((d) => d[1].length * 280).duration(400).style("opacity", 0.35);
      const ng = svg.append("g").selectAll("g").data(nodes).join("g")
        .attr("transform", (d) => `translate(${pos[d.key].x},${pos[d.key].y})`).style("opacity", 0);
      ng.append("rect").attr("x", -78).attr("y", -24).attr("width", 156).attr("height", 48).attr("rx", 9).style("fill", "var(--bg)");
      ng.append("rect").attr("x", -78).attr("y", -24).attr("width", 156).attr("height", 48).attr("rx", 9)
        .style("fill", (d) => (d.key === "" ? "var(--surface)" : diverge(d.val - S.h0.val)))
        .style("fill-opacity", (d) => (d.key === "" ? 1 : 0.28))
        .style("stroke", (d) => (d.key === "" ? C.purple : C.green)).attr("stroke-width", 1.4);
      ng.append("text").attr("y", -5).attr("text-anchor", "middle").style("font", "600 12.5px var(--f-mono)").style("fill", C.ink)
        .text((d) => (d.key === "" ? "H₀" : "H₀ + " + d.key));
      ng.append("text").attr("y", 13).attr("text-anchor", "middle").style("font", "12px var(--f-mono)").style("fill", C.ink)
        .text((d) => `${d.val.toFixed(2)}%${d.key ? `  (${d.val - S.h0.val >= 0 ? "+" : ""}${(d.val - S.h0.val).toFixed(2)})` : ""}`);
      ng.each(function (d) {
        if (!d.key) return;
        const sel = d3.select(this);
        "ABC".split("").forEach((L, i) => sel.append("circle").attr("cx", 60 + (i - 1) * 0).attr("cx", 52 + i * 9).attr("cy", -12).attr("r", 3.2)
          .style("fill", d.key.includes(L) ? cellColor[i] : "none").style("stroke", cellColor[i]));
      });
      ng.on("mouseenter", (ev, d) => showTip(`<b>${esc(d.name)}</b><br>${d.axes.length ? d.axes.join(" + ") : "shared backbone"}<br>val ${d.val}%`, ev))
        .on("mousemove", moveTip).on("mouseleave", hideTip);
      ng.transition().delay((d) => (reduceMotion ? 0 : d.key.length * 280)).duration(400).style("opacity", 1);
      // Axis legend + outcome.
      const lg = svg.append("g").attr("transform", `translate(12,${H - 14})`);
      axesNames.forEach((a, i) => {
        lg.append("circle").attr("cx", i * 170 + 5).attr("cy", -4).attr("r", 4).style("fill", cellColor[i]);
        lg.append("text").attr("x", i * 170 + 14).attr("y", 0).style("font", "11.5px var(--f-mono)").style("fill", C.ink).text(`${"ABC"[i]} = ${a}`);
      });
      const note = svg.append("text").attr("x", 8).attr("y", 18).style("font", "600 12px var(--f-body)").style("fill", C.green).style("opacity", 0);
      note.append("tspan").attr("x", 8).text(`joint refinement`);
      note.append("tspan").attr("x", 8).attr("dy", 16).text(`(${S.refine.length} cand.) → H★ ${S.final}%`);
      note.transition().delay(reduceMotion ? 0 : 1300).duration(500).style("opacity", 1);
    }
    $$('.seed-switch[data-target="lattice"] button').forEach((b) => b.addEventListener("click", () => {
      $$('.seed-switch[data-target="lattice"] button').forEach((x) => x.classList.toggle("on", x === b));
      seed = +b.dataset.seed; draw();
    }));
    stepHooks[3] = draw;
  })();

  /* ---------------------------------------------------------------- strategy gallery */
  (function gallery() {
    const grid = $("#stratGrid");
    if (!grid) return;
    const roleColor = { "Warm-up champion": C.purple, "Branch champion": C.gold, "Final harness": C.green };
    const filt = { seed: "1", role: "all" };
    function render() {
      const items = DATA.strategies.filter((s) => (filt.seed === "all" || String(s.seed) === filt.seed) && (filt.role === "all" || s.role === filt.role));
      grid.innerHTML = items.map((s, i) => `
        <article class="card strat" style="--c:${roleColor[s.role]}; animation-delay:${i * 40}ms">
          <div class="top"><span class="role">${s.role}</span><span class="seed">seed ${s.seed}</span></div>
          <div class="nm">${esc(s.name)}</div>
          <div class="axis">${s.phase === "branch" ? `axis: <code>${esc(s.axis)}</code>` : s.phase === "warm" ? "becomes backbone H₀" : "after composition + joint refinement"}${s.parent ? ` · parent <code>${esc(s.parent)}</code>` : ""}</div>
          <div class="nums">
            <div><b>${s.val != null ? s.val.toFixed(1) : "–"}</b><span>val %</span></div>
            <div><b>${s.test != null ? s.test.toFixed(1) : "–"}</b><span>held-out %</span></div>
            <div><b>${s.frames != null ? Math.round(s.frames) : "–"}</b><span>frames / q</span></div>
          </div>
          ${chips(s.components, 9)}
          ${s.hypothesis ? `<div class="hyp clamped"><span class="q">Proposer's hypothesis</span><p>${esc(s.hypothesis)}</p></div><button class="more">Read more</button>` : ""}
        </article>`).join("");
      $$(".more", grid).forEach((b) => b.addEventListener("click", () => {
        const h = b.previousElementSibling;
        h.classList.toggle("clamped");
        b.textContent = h.classList.contains("clamped") ? "Read more" : "Show less";
      }));
    }
    $$("#stratFilters .ctl").forEach((b) => b.addEventListener("click", () => {
      filt[b.dataset.f] = b.dataset.v;
      $$(`#stratFilters .ctl[data-f="${b.dataset.f}"]`).forEach((x) => x.classList.toggle("on", x === b));
      render();
    }));
    render();
  })();

  /* ---------------------------------------------------------------- per-benchmark bars */
  (function bars() {
    const svg = d3.select("#barChart");
    if (svg.empty()) return;
    const B = [
      { b: "Video-MME", fixed: { test: 63.40, val: 66.21, n: "clip_topk" }, brsi: { val: 72.2, test: 66.5, sd: 1.2 }, srsi: { val: 75.0, test: 70.1, sd: 1.0 } },
      { b: "LongVideoBench", fixed: { test: 62.07, val: 62.33, n: "clip_topk" }, brsi: { val: 70.2, test: 66.6, sd: 1.0 }, srsi: { val: 71.1, test: 67.3, sd: 1.0 } },
      { b: "OVO-Bench", fixed: { test: 55.36, val: 51.33, n: "reflect_loop" }, brsi: { val: 72.9, test: 67.2, sd: 1.7 }, srsi: { val: 73.8, test: 72.5, sd: 3.1 } },
      { b: "MomentSeeker (mIoU)", fixed: { test: 17.98, val: 16.58, n: "clip_topk" }, brsi: { val: 23.8, test: 19.0, sd: 1.8 }, srsi: { val: 25.3, test: 23.0, sd: 0.7 } },
    ];
    const keys = [
      { k: "fixed", c: "#9aa3b5", l: "Best fixed" }, { k: "brsi", c: C.orange, l: "BRSI" }, { k: "srsi", c: C.blue, l: "SRSI" },
    ];
    const M = { t: 24, r: 10, b: 36, l: 10 }, W = 900 - M.l - M.r, H = 340 - M.t - M.b;
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const x0 = d3.scaleBand().domain(B.map((d) => d.b)).range([0, W]).paddingInner(0.18).paddingOuter(0.04);
    const x1 = d3.scaleBand().domain(keys.map((k) => k.k)).range([0, x0.bandwidth()]).padding(0.14);
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${H})`).call(d3.axisBottom(x0).tickSizeOuter(0))
      .selectAll("text").style("font", "600 13px var(--f-body)").style("fill", C.ink);
    // Each benchmark gets its own y-scale, so MomentSeeker (mIoU) stays readable.
    const panels = g.selectAll("g.bm").data(B).join("g").attr("class", "bm").attr("transform", (d) => `translate(${x0(d.b)},0)`);
    let mode = "test";
    function draw(first) {
      panels.each(function (d) {
        const p = d3.select(this);
        const vals = keys.map((k) => ({ ...k, v: mode === "test" ? d[k.k].test : d[k.k].val - d[k.k].test, sd: mode === "test" ? d[k.k].sd : null, n: d[k.k].n }))
          .filter((v) => !(mode === "gap" && v.k === "fixed"));
        const lo = mode === "test" ? Math.floor(d3.min(vals, (v) => v.v) * 0.85) : 0;
        const hi = mode === "test" ? d3.max(vals, (v) => v.v + (v.sd || 0)) * 1.04 : 6.5;
        const y = d3.scaleLinear().domain([lo, hi]).range([H, 0]);
        const rects = p.selectAll("rect.bar").data(vals, (v) => v.k);
        rects.exit().transition().duration(300).attr("y", H).attr("height", 0).remove();
        const ent = rects.enter().append("rect").attr("class", "bar").attr("x", (v) => x1(v.k)).attr("width", x1.bandwidth())
          .attr("y", H).attr("height", 0).attr("rx", 4).style("fill", (v) => v.c);
        ent.merge(rects).on("mouseenter", (ev, v) => showTip(`<b>${d.b}</b><br>${v.l}${v.n ? ` (${v.n})` : ""}: ${v.v.toFixed(2)}${mode === "gap" ? " pt gap" : ""}`, ev))
          .on("mousemove", moveTip).on("mouseleave", hideTip)
          .transition().delay((v, i) => (first ? 250 + i * 120 : 0)).duration(900).ease(d3.easeCubicOut)
          .attr("y", (v) => y(v.v)).attr("height", (v) => H - y(v.v));
        const lbl = p.selectAll("text.lbl").data(vals, (v) => v.k);
        lbl.exit().remove();
        lbl.enter().append("text").attr("class", "lbl").attr("text-anchor", "middle").attr("x", (v) => x1(v.k) + x1.bandwidth() / 2)
          .attr("y", H).style("font", "600 12px var(--f-mono)").style("fill", (v) => v.c)
          .merge(lbl).transition().delay((v, i) => (first ? 250 + i * 120 : 0)).duration(900)
          .attr("y", (v) => y(v.v + (v.sd || 0)) - 6).tween("text", function (v) {
            const i = d3.interpolateNumber(+this.textContent || 0, v.v);
            return (t) => { this.textContent = i(t).toFixed(1); };
          });
        const err = p.selectAll("line.err").data(vals.filter((v) => v.sd), (v) => v.k);
        err.exit().remove();
        err.enter().append("line").attr("class", "err").style("stroke", C.ink).style("opacity", 0.5)
          .attr("x1", (v) => x1(v.k) + x1.bandwidth() / 2).attr("x2", (v) => x1(v.k) + x1.bandwidth() / 2).attr("y1", H).attr("y2", H)
          .merge(err).transition().delay((v, i) => (first ? 400 + i * 120 : 0)).duration(900)
          .attr("y1", (v) => y(v.v - v.sd)).attr("y2", (v) => y(v.v + v.sd));
        const delta = mode === "test" ? d.srsi.test - d.brsi.test : (d.srsi.val - d.srsi.test) - (d.brsi.val - d.brsi.test);
        const dl = p.selectAll("text.delta").data([delta]);
        dl.enter().append("text").attr("class", "delta").attr("x", x0.bandwidth() / 2).attr("y", -8).attr("text-anchor", "middle")
          .style("font", "600 12.5px var(--f-mono)").merge(dl)
          .style("fill", (v) => ((mode === "test" ? v > 0 : v < 0) ? C.green : C.muted))
          .text((v) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} ${mode === "test" ? "vs BRSI" : "gap vs BRSI"}`);
      });
    }
    $$("#results [data-bm]").forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.bm;
      $$("#results [data-bm]").forEach((x) => x.classList.toggle("on", x === b));
      draw(false);
    }));
    onVisible(svg.node(), () => draw(true));
  })();

  /* ---------------------------------------------------------------- horizontal bars (ablations) */
  $$(".hbars").forEach((box) => {
    const lo = +box.dataset.min, hi = +box.dataset.max, ref = box.dataset.ref ? +box.dataset.ref : null;
    const pct = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
    $$(".ref", box).forEach((r) => { r.style.left = pct(ref) + "%"; });
    onVisible(box, () => $$(".fill", box).forEach((f) => { f.style.width = pct(+f.dataset.v) + "%"; }));
  });

  /* ---------------------------------------------------------------- lightbox + copy */
  (function lightbox() {
    const lb = $("#lightbox"), img = $("img", lb);
    $$(".figure img").forEach((i) => i.addEventListener("click", () => { img.src = i.src; img.alt = i.alt; lb.classList.add("open"); }));
    lb.addEventListener("click", () => lb.classList.remove("open"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") lb.classList.remove("open"); });
  })();
  $("#copyBib").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    const done = () => { btn.textContent = "Copied!"; setTimeout(() => (btn.textContent = "Copy"), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText($("#bibText").textContent).then(done, () => {});
  });
})();
