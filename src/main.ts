import { JOINT_LABELS, PRIMARY_SPORT, SPORTS, SportDef, TRANSITIONS } from "./data/sports";
import { MATH_STEPS } from "./data/mathematics";
import { PROJECT_FILES } from "./data/projectFiles";
import { buildOverlay, cubicFrom, setPathProgress } from "./animations/overlay";
import {
  animateConvergence,
  animatePipeline,
  createSportExperience,
  SportLayer,
  initJointTooltips,
  initParallax,
  initReveals,
  initScrollProgress,
  initSectionTracking,
  isMobile,
  reduceMotion,
} from "./animations/scrollAnimations";

declare const katex: { render: (tex: string, el: HTMLElement, opts?: Record<string, unknown>) => void };
declare const gsap: any;
declare const ScrollTrigger: any;

gsap.registerPlugin(ScrollTrigger);

const SVG_NS = "http://www.w3.org/2000/svg";

/** Each sport carries the formulas that its own analysis step demonstrates. */
const SPORT_FORMULAS: Record<string, { tex: string; note: string }[]> = {
  swimming: [
    { tex: "P = (x, y)", note: "ตำแหน่งข้อมือในแต่ละเฟรม" },
    { tex: "\\theta = \\cos^{-1}\\!\\left(\\frac{\\vec{BA}\\cdot\\vec{BC}}{|\\vec{BA}||\\vec{BC}|}\\right)", note: "มุมข้อศอกขณะดึงแขน" },
  ],
  running: [
    { tex: "d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}", note: "ระยะก้าวจากข้อเท้าหนึ่งไปอีกข้าง" },
    { tex: "v = \\frac{\\Delta x}{\\Delta t}", note: "ความเร็วของเท้าระหว่างเฟรม" },
  ],
  badminton: [
    { tex: "v = \\frac{\\Delta x}{\\Delta t}", note: "ความเร็วหัวแร็กเกต" },
    { tex: "\\theta = \\cos^{-1}\\!\\left(\\frac{\\vec{BA}\\cdot\\vec{BC}}{|\\vec{BA}||\\vec{BC}|}\\right)", note: "มุมข้อศอกขณะตบ" },
  ],
  basketball: [
    { tex: "a = \\frac{\\Delta v}{\\Delta t}", note: "ความเร่งของแขนขณะปล่อยลูก" },
    { tex: "P = (x, y)", note: "ตำแหน่งลูกบอลบนเส้นทางการเคลื่อนที่" },
  ],
  football: [
    { tex: "v = \\frac{\\Delta x}{\\Delta t}", note: "ความเร็วปลายเท้าขณะปะทะลูก" },
    { tex: "a = \\frac{\\Delta v}{\\Delta t}", note: "ความเร่งของขาช่วงเหวี่ยง" },
  ],
  tennis: [
    { tex: "\\theta = \\cos^{-1}\\!\\left(\\frac{\\vec{BA}\\cdot\\vec{BC}}{|\\vec{BA}||\\vec{BC}|}\\right)", note: "มุมข้อศอกขณะตีลูก" },
    { tex: "v = \\frac{\\Delta x}{\\Delta t}", note: "ความเร็วแร็กเกตผ่านจุดปะทะ" },
  ],
};

const SECTION_LIST = [
  { id: "q", index: "01", labelEn: "THE QUESTION" },
  { id: "cv", index: "02", labelEn: "COMPUTER VISION" },
  { id: "math", index: "03", labelEn: "MATHEMATICS" },
  { id: "pva", index: "04", labelEn: "KINEMATICS" },
  ...SPORTS.map((s) => ({ id: s.id, index: s.index, labelEn: s.nameEn })),
  { id: "pipelineSection", index: "11", labelEn: "ANALYSIS" },
  { id: "ai", index: "12", labelEn: "AI" },
  { id: "final", index: "13", labelEn: "FINAL" },
];

function renderTex(host: HTMLElement, tex: string) {
  try {
    katex.render(tex, host, { throwOnError: false, displayMode: false });
  } catch {
    host.textContent = tex;
  }
}

/* ===================================================== HERO */
function initHero() {
  const img = document.getElementById("heroImage") as HTMLElement;
  const svg = document.getElementById("heroOverlay") as unknown as SVGSVGElement;
  const ov = buildOverlay(svg, PRIMARY_SPORT);

  // Photo first, then the analysis layer resolves on top of it.
  const start = [...ov.joints, ...ov.coordLabels, ...ov.bones, ov.angleArc, ov.angleText, ov.vector, ov.vectorText];
  gsap.set(start, { opacity: 0 });
  setPathProgress(ov.trajectory, ov.trajectoryLen, 0);

  if (reduceMotion) {
    gsap.set(start, { opacity: 1 });
    setPathProgress(ov.trajectory, ov.trajectoryLen, 1);
    return;
  }

  const tl = gsap.timeline({ delay: 0.25 });
  // The photo settles from a slight push-in. The overlay is scaled by the
  // same proxy value on every tick so it arrives perfectly registered.
  const zoom = { s: 1.14 };
  tl.to(
    zoom,
    {
      s: 1,
      duration: 1.4,
      ease: "power2.out",
      onUpdate: () => {
        img.style.transform = `scale(${zoom.s})`;
        ov.svg.style.transform = `scale(${zoom.s})`;
      },
    },
    0
  );
  tl.from(img, { autoAlpha: 0, duration: 1.2, ease: "power2.out" }, 0);
  tl.to(ov.joints, { opacity: 1, stagger: 0.045, duration: 0.3 }, "-=0.4");
  tl.to(ov.coordLabels, { opacity: 0.85, stagger: 0.03, duration: 0.25 }, "<0.15");
  tl.to(ov.bones, { opacity: 1, stagger: 0.035, duration: 0.3 }, "<0.2");
  tl.to([ov.angleArc, ov.angleText, ov.vector, ov.vectorText], { opacity: 1, duration: 0.5 }, "<0.3");
  tl.to(
    {},
    {
      duration: 0.9,
      onUpdate: function () {
        setPathProgress(ov.trajectory, ov.trajectoryLen, this.progress());
      },
    },
    "<"
  );
}

/* ===================================================== 01 / 02 explanatory scenes */
function initObserveSection() {
  const svg = document.getElementById("observeOverlay") as unknown as SVGSVGElement;
  const ov = buildOverlay(svg, PRIMARY_SPORT);
  const all = [...ov.joints, ...ov.coordLabels, ...ov.bones, ov.angleArc, ov.angleText, ov.vector, ov.vectorText];
  gsap.set(all, { opacity: 0 });
  setPathProgress(ov.trajectory, ov.trajectoryLen, 0);

  // The eye sees the athlete; the overlay is what measurement adds.
  ScrollTrigger.create({
    trigger: svg,
    start: "top 75%",
    end: "bottom 45%",
    scrub: true,
    onUpdate: (self: { progress: number }) => {
      const p = self.progress;
      ov.joints.forEach((j, i) => (j.style.opacity = String(Math.max(0, Math.min(1, p * ov.joints.length - i)))));
      ov.bones.forEach((b, i) => (b.style.opacity = String(Math.max(0, Math.min(1, (p - 0.3) * 2 * ov.bones.length - i)))));
    },
  });
}

function initCvSection() {
  const svg = document.getElementById("cvOverlay") as unknown as SVGSVGElement;
  const ov = buildOverlay(svg, PRIMARY_SPORT);
  gsap.set([...ov.joints, ...ov.coordLabels], { opacity: 0 });
  gsap.set(ov.bones, { opacity: 0 });
  gsap.set([ov.angleArc, ov.angleText, ov.vector, ov.vectorText], { opacity: 0 });
  setPathProgress(ov.trajectory, ov.trajectoryLen, 0);

  ov.joints.forEach((j, i) => {
    gsap.to([j, ov.coordLabels[i]], {
      opacity: 1,
      duration: 0.3,
      scrollTrigger: { trigger: svg, start: `top+=${i * 4}% 78%`, toggleActions: "play none none reverse" },
    });
  });
  gsap.to(ov.bones, {
    opacity: 1,
    stagger: 0.04,
    duration: 0.4,
    scrollTrigger: { trigger: svg, start: "top 45%", toggleActions: "play none none reverse" },
  });
}

/* ===================================================== 03 MATHEMATICS */
function initMathSection() {
  const svg = document.getElementById("mathOverlay") as unknown as SVGSVGElement;
  const ov = buildOverlay(svg, PRIMARY_SPORT);
  const host = document.getElementById("mathSteps")!;

  // Each formula lights up exactly the overlay element it describes.
  const targets: Record<string, SVGElement[]> = {
    position: [ov.joints[0], ov.coordLabels[0], ov.joints[9], ov.coordLabels[9]],
    distance: [...ov.bones],
    velocity: [ov.vector, ov.vectorText],
    acceleration: [ov.vector, ov.vectorText],
    angle: [ov.angleArc, ov.angleText],
  };
  const everything = [
    ...ov.joints,
    ...ov.coordLabels,
    ...ov.bones,
    ov.angleArc,
    ov.angleText,
    ov.vector,
    ov.vectorText,
  ];
  gsap.set(everything, { opacity: 0.12 });
  setPathProgress(ov.trajectory, ov.trajectoryLen, 0);

  MATH_STEPS.forEach((step, i) => {
    const card = document.createElement("div");
    card.className = "math-card";
    card.innerHTML = `
      <div class="step-index mono">0${i + 1}</div>
      <div>
        <span class="step-label-en mono">${step.labelEn} · ${step.labelTh}</span>
        <div class="katex-slot" id="katex-${step.id}"></div>
        <p class="step-caption">${step.captionTh}</p>
      </div>`;
    host.appendChild(card);
    renderTex(card.querySelector<HTMLElement>(`#katex-${step.id}`)!, step.latex);

    const lit = targets[step.id] || [];
    ScrollTrigger.create({
      trigger: card,
      start: "top 70%",
      end: "bottom 40%",
      onToggle: (self: { isActive: boolean }) => {
        card.classList.toggle("is-active", self.isActive);
        gsap.to(lit, { opacity: self.isActive ? 1 : 0.12, duration: 0.4 });
        if (step.id === "velocity" || step.id === "acceleration") {
          gsap.to({}, {
            duration: 0.6,
            onUpdate: function () {
              setPathProgress(ov.trajectory, ov.trajectoryLen, self.isActive ? this.progress() : 0);
            },
          });
        }
      },
    });
  });
}

/* ===================================================== 04 KINEMATICS (interactive) */
const PVA_SAMPLES = [
  { t: 0.0, x: 0.0 },
  { t: 0.1, x: 0.15 },
  { t: 0.2, x: 0.35 },
  { t: 0.3, x: 0.6 },
  { t: 0.4, x: 0.9 },
];
function xAt(t: number): number {
  for (let i = 0; i < PVA_SAMPLES.length - 1; i++) {
    const a = PVA_SAMPLES[i];
    const b = PVA_SAMPLES[i + 1];
    if (t >= a.t && t <= b.t) return a.x + ((t - a.t) / (b.t - a.t)) * (b.x - a.x);
  }
  return PVA_SAMPLES[PVA_SAMPLES.length - 1].x;
}

function initPvaSection() {
  const svg = document.getElementById("pvaOverlay") as unknown as SVGSVGElement;
  const ov = buildOverlay(svg, PRIMARY_SPORT);
  gsap.set([...ov.coordLabels], { opacity: 0.5 });

  const slider = document.getElementById("pvaSlider") as HTMLInputElement;
  const xOut = document.getElementById("pvaX")!;
  const vOut = document.getElementById("pvaV")!;
  const aOut = document.getElementById("pvaA")!;
  const graph = document.getElementById("pvaGraph") as unknown as SVGSVGElement;
  const maxT = PVA_SAMPLES[PVA_SAMPLES.length - 1].t;
  const dt = 0.001;

  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * maxT;
    pts.push(`${10 + (i / 100) * 380},${150 - xAt(t) * 140}`);
  }
  graph.innerHTML = `
    <polyline points="${pts.join(" ")}" fill="none" stroke="#2c6d78" stroke-width="2"/>
    <line id="pvaMarker" x1="10" y1="0" x2="10" y2="160" stroke="#e8a23c" stroke-width="1" stroke-dasharray="3 3"/>
    <circle id="pvaDot" cx="10" cy="150" r="4" fill="#56d9e8"/>`;
  const marker = graph.querySelector<SVGLineElement>("#pvaMarker")!;
  const dot = graph.querySelector<SVGCircleElement>("#pvaDot")!;
  const img = document.getElementById("pvaImage") as HTMLElement;

  function update() {
    const pct = Number(slider.value) / 100;
    const t = pct * maxT;
    const x = xAt(t);
    const v = (xAt(Math.min(maxT, t + dt)) - xAt(Math.max(0, t - dt))) / (2 * dt);
    const vPrev = (xAt(Math.min(maxT, t + dt - 0.01)) - xAt(Math.max(0, t - dt - 0.01))) / (2 * dt);
    const a = (v - vPrev) / 0.01;
    xOut.textContent = `${x.toFixed(2)} m`;
    vOut.textContent = `${v.toFixed(2)} m/s`;
    aOut.textContent = `${Number.isFinite(a) ? a.toFixed(2) : "0.00"} m/s²`;
    const gx = 10 + pct * 380;
    marker.setAttribute("x1", String(gx));
    marker.setAttribute("x2", String(gx));
    dot.setAttribute("cx", String(gx));
    dot.setAttribute("cy", String(150 - x * 140));
    // the athlete and its overlay travel together along the measured path
    const shift = x * 40;
    img.style.transform = `translateX(${shift}px)`;
    ov.svg.style.transform = `translateX(${shift}px)`;
    setPathProgress(ov.trajectory, ov.trajectoryLen, pct);
  }
  slider.addEventListener("input", update);
  update();
}

/* ===================================================== SPORT EXPERIENCE
   One pinned viewport holds all six sport layers stacked on top of each
   other. Only the active layer (plus the incoming one mid-transition)
   is composited; the rest are display:none via the .is-live class. */

function sportLayerHTML(sport: SportDef): string {
  const stats = sport.stats
    .map((st) => `<div class="hud-panel"><span class="hud-label mono">${st.label}</span><span class="hud-value mono">${st.value}</span></div>`)
    .join("");
  const formulas = (SPORT_FORMULAS[sport.id] || [])
    .map((f, i) => `<div class="scene-formula" data-fx="${sport.id}-${i}"><div class="fx-slot"></div><span class="fx-note">${f.note}</span></div>`)
    .join("");
  return `
  <div class="sport-layer" id="layer-${sport.id}" data-sport="${sport.id}">
    <div class="scene-media">
      <img class="scene-img" id="img-${sport.id}" src="${sport.image}" alt="${sport.nameEn} athlete in motion" decoding="async" />
      <div class="scene-scrim"></div>
      <svg class="scene-overlay" id="ov-${sport.id}" aria-hidden="true"></svg>
    </div>
    <div class="scene-ui">
      <header class="scene-head">
        <span class="kicker mono">${sport.index} — ${sport.nameEn}</span>
        <h2 class="display-l">${sport.nameEn}<span class="scene-th">${sport.nameTh}</span></h2>
        <p class="scene-focus">${sport.focusTh}</p>
        <span class="tag-illustrative mono">ILLUSTRATIVE DATA · SIMULATION</span>
      </header>
      <div class="scene-formulas">${formulas}</div>
      <div class="scene-graphs">
        <span class="graphs-label mono">DERIVED FROM TRAJECTORY</span>
        <svg class="mini-graph" viewBox="0 0 260 150" aria-hidden="true">
          <line x1="18" y1="130" x2="250" y2="130" class="axis"/>
          <line x1="18" y1="8" x2="18" y2="130" class="axis"/>
          <path class="g-pos" d="M 18,120 C 70,110 130,80 250,26" fill="none"/>
          <path class="g-vel" d="M 18,126 C 80,96 150,74 250,62" fill="none"/>
          <path class="g-acc" d="M 18,112 C 90,104 150,112 250,98" fill="none"/>
          <text x="256" y="30" class="mono g-lab" text-anchor="end">x(t)</text>
          <text x="256" y="66" class="mono g-lab" text-anchor="end">v(t)</text>
          <text x="256" y="102" class="mono g-lab" text-anchor="end">a(t)</text>
        </svg>
      </div>
      <div class="scene-hud">${stats}</div>
      ${sport.credit ? `<span class="scene-credit mono">${sport.credit}</span>` : ""}
    </div>
  </div>`;
}

function initSportExperience() {
  const container = document.getElementById("sportsRoot")!;

  // anchors let the nav menu jump into the middle of the pinned range
  const units = SPORTS.length + (SPORTS.length - 1) * 0.6;
  let acc = 0;
  const anchors = SPORTS.map((sp, i) => {
    const top = (acc / units) * 100;
    acc += 1 + (i < SPORTS.length - 1 ? 0.6 : 0);
    return `<span class="sport-anchor" id="${sp.id}" style="top:${top}%"></span>`;
  }).join("");

  const caps = TRANSITIONS.map(
    (t, i) => `<div class="tr-copy" data-tr="${i}">
        <div class="tr-line1">${t.line1}</div>
        <div class="tr-line2 mono">${t.line2}</div>
      </div>`
  ).join("");

  // particles capped at 10 and animated with transform + opacity only
  const particles = Array.from({ length: 10 })
    .map((_, i) => `<span style="left:${10 + i * 7}%;top:${36 + ((i * 9) % 24)}%"></span>`)
    .join("");

  container.innerHTML = `
    ${anchors}
    <div class="sport-viewport" id="sportViewport">
      ${SPORTS.map(sportLayerHTML).join("")}
      <svg class="tr-overlay" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path class="tr-morph" id="trMorph" />
      </svg>
      <div class="tr-particles" id="trParticles">${particles}</div>
      <div class="tr-copy-stack">${caps}</div>
    </div>`;

  SPORTS.forEach((sport) => {
    (SPORT_FORMULAS[sport.id] || []).forEach((f, i) => {
      const slot = container.querySelector<HTMLElement>(`[data-fx="${sport.id}-${i}"] .fx-slot`);
      if (slot) renderTex(slot, f.tex);
    });
  });

  const layers: SportLayer[] = SPORTS.map((sport) => {
    const root = document.getElementById(`layer-${sport.id}`)!;
    return {
      root,
      imageEl: document.getElementById(`img-${sport.id}`) as HTMLElement,
      overlay: buildOverlay(document.getElementById(`ov-${sport.id}`) as unknown as SVGSVGElement, sport),
      hudPanels: Array.from(root.querySelectorAll<HTMLElement>(".hud-panel")),
      formulaCards: Array.from(root.querySelectorAll<HTMLElement>(".scene-formula")),
      graphPaths: Array.from(root.querySelectorAll<SVGPathElement>(".g-pos, .g-vel, .g-acc")),
    };
  });

  createSportExperience({
    container,
    viewport: document.getElementById("sportViewport")!,
    layers,
    morphPath: document.getElementById("trMorph") as unknown as SVGPathElement,
    trCopyEls: Array.from(container.querySelectorAll<HTMLElement>(".tr-copy")),
    particles: isMobile ? [] : Array.from(container.querySelectorAll<HTMLElement>("#trParticles span")),
    threadPath: document.getElementById("dataThreadPath") as unknown as SVGPathElement,
    threadLabel: document.getElementById("dataThreadLabel")!,
    sports: SPORTS,
    onSportChange: (i) => {
      setActiveSection(SPORTS[i].id);
      // decode the next photo well before its transition begins
      const next = SPORTS[i + 1];
      if (next && !preloaded.has(next.image)) {
        preloaded.add(next.image);
        const im = new Image();
        im.decoding = "async";
        im.src = next.image;
      }
    },
  });
}

const preloaded = new Set<string>();

/* ===================================================== PIPELINE */
const PIPELINE_STAGES = [
  "VIDEO",
  "POSE DETECTION",
  "KEYPOINTS",
  "COORDINATES",
  "GEOMETRY",
  "KINEMATICS",
  "MOTION ANALYSIS",
  "SPORTS INSIGHT",
];
function initPipeline() {
  document.getElementById("pipelineNodes")!.innerHTML = PIPELINE_STAGES.map(
    (s) => `<div class="pipeline-node mono">${s}</div>`
  ).join("");
  const diagram = document.getElementById("pipelineDiagram") as unknown as SVGSVGElement;
  const step = 1200 / (PIPELINE_STAGES.length - 1);
  let d = "M 0 90";
  for (let i = 1; i < PIPELINE_STAGES.length; i++) d += ` L ${step * i} 90`;
  diagram.innerHTML = `<path class="pipeline-line" d="${d}"/><circle class="pipeline-pulse" cx="0" cy="90" r="6"/>`;
  animatePipeline(document.getElementById("pipelineSection")!);
}

/* ===================================================== FINAL CONVERGENCE */
function initFinal() {
  const svg = document.getElementById("finalTrails") as unknown as SVGSVGElement;
  svg.setAttribute("viewBox", "0 0 1600 900");
  svg.innerHTML = "";
  const paths: SVGPathElement[] = [];
  SPORTS.forEach((sport, i) => {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", cubicFrom(sport.trajectory));
    p.setAttribute("class", "final-trail");
    p.style.setProperty("--i", String(i));
    p.style.transformOrigin = "800px 450px";
    svg.appendChild(p);
    paths.push(p);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("class", "final-trail-label mono");
    label.setAttribute("x", String((sport.trajectory[0][0] / 100) * 1600));
    label.setAttribute("y", String((sport.trajectory[0][1] / 100) * 900 - 14));
    label.textContent = sport.nameEn;
    svg.appendChild(label);
  });
  animateConvergence(document.getElementById("final")!, paths);
}

/* ===================================================== PROJECT ARCHIVE */
function initFiles() {
  document.getElementById("filesGrid")!.innerHTML = PROJECT_FILES.map(
    (f) => `
    <div class="file-card${f.primary ? " is-primary" : ""}" data-reveal>
      <span class="file-type mono">${f.type}</span>
      <h4>${f.title}</h4>
      <span class="file-original mono">${f.originalName}</span>
      <p>${f.description}</p>
      <div class="file-actions">
        <a class="btn view" href="${f.assetPath}" target="_blank" rel="noopener">VIEW</a>
        <a class="btn download" href="${f.assetPath}" download="${f.originalName}">DOWNLOAD</a>
      </div>
    </div>`
  ).join("");
}

let setActiveSection: (id: string) => void = () => {};

/* ===================================================== NAV */
function initNav() {
  const menu = document.getElementById("navMenu")!;
  menu.innerHTML = SECTION_LIST.map(
    (s) => `<a href="#${s.id}" data-target="${s.id}" role="menuitem"><span class="n mono">${s.index}</span><span>${s.labelEn}</span></a>`
  ).join("");
  const toggle = document.getElementById("navToggle")!;
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target as Node) && e.target !== toggle) {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menu.classList.remove("is-open")));

  initScrollProgress(document.getElementById("progressFill")!);
  // Sport sections live inside one pinned container, so they can't be
  // tracked by their own triggers — the controller reports them instead.
  const sportIds = new Set(SPORTS.map((s) => s.id));
  setActiveSection = initSectionTracking(
    SECTION_LIST,
    SECTION_LIST.filter((s) => !sportIds.has(s.id)),
    menu.querySelectorAll<HTMLElement>("a"),
    document.getElementById("navCounter")!,
    document.getElementById("navLabel")!
  );
}

/* ===================================================== BOOT */
window.addEventListener("DOMContentLoaded", () => {
  initHero();
  initObserveSection();
  initCvSection();
  initMathSection();
  initPvaSection();
  initNav();
  initSportExperience();
  initPipeline();
  initFinal();
  initFiles();
  initReveals();
  initParallax();
  initJointTooltips(document.getElementById("jointTooltip")!, JOINT_LABELS);
  // Pinned scenes depend on page height, which is only final once the
  // photographs have decoded. Refresh once, when they actually finish —
  // not on a guessed timeout, and never repeatedly during scrolling.
  const photos = Array.from(document.images).filter((i) => !i.complete);
  if (!photos.length) {
    ScrollTrigger.refresh();
  } else {
    let pending = photos.length;
    const done = () => {
      if (--pending <= 0) ScrollTrigger.refresh();
    };
    photos.forEach((img) => {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  }
});
