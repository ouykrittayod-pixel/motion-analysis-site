import {
  OverlayHandles,
  cubicFrom,
  cubicRaw,
  lerpPoints,
  prepareDash,
  samplePath,
  setPathProgress,
  setTrailProgress,
} from "./overlay";
import { SportDef } from "../data/sports";

// GSAP + ScrollTrigger load globally from CDN <script> tags in index.html.
declare const gsap: any;
declare const ScrollTrigger: any;

gsap.registerPlugin(ScrollTrigger);

// Only fire scroll callbacks on real frames rather than on every scroll
// event, and don't re-measure everything when a mobile browser's toolbar
// slides away (that resize fires constantly and forces a full refresh).
ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true });

export const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Coarse pointer / small screen: shed the most expensive effects. */
export const isMobile =
  window.matchMedia("(max-width: 1000px)").matches ||
  window.matchMedia("(hover: none)").matches;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Maps p within [a,b] to 0..1. */
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/**
 * Wraps a DOM write so it only happens when the value actually changed by a
 * visible amount. During a slow scroll most of these values barely move, so
 * this removes the large majority of style writes per frame — the single
 * biggest win for scroll smoothness here.
 */
function guard(apply: (v: number) => void, eps = 0.005) {
  let last = NaN;
  return (v: number) => {
    if (!(Math.abs(v - last) >= eps)) return;
    last = v;
    apply(v);
  };
}

/** Dirty-checked opacity setter for a list of elements. */
function opacitySetters(els: ArrayLike<Element>) {
  const out: ((v: number) => void)[] = [];
  for (let i = 0; i < els.length; i++) {
    const style = (els[i] as HTMLElement).style;
    out.push(guard((v) => (style.opacity = v === 1 ? "1" : v.toFixed(3))));
  }
  return out;
}

export function initScrollProgress(barEl: HTMLElement) {
  gsap.to(barEl, {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: true },
  });
}

/**
 * Highlights the active nav entry. `tracked` is the subset that gets its own
 * ScrollTrigger; sport sections are excluded because they share one pinned
 * container and are reported by the sport controller instead. Returns an
 * activator so that controller can drive them.
 */
export function initSectionTracking(
  all: { id: string; index: string; labelEn: string }[],
  tracked: { id: string; index: string; labelEn: string }[],
  navLinks: NodeListOf<HTMLElement>,
  counterEl: HTMLElement,
  labelEl: HTMLElement
): (id: string) => void {
  const total = String(all.length).padStart(2, "0");
  const byId = new Map(all.map((s) => [s.id, s]));

  const setActive = (s: { id: string; index: string; labelEn: string }) => {
    navLinks.forEach((l) => l.classList.toggle("is-active", l.dataset.target === s.id));
    counterEl.textContent = `${s.index} / ${total}`;
    labelEl.textContent = s.labelEn;
  };

  tracked.forEach((s) => {
    const target = document.getElementById(s.id);
    if (!target) return;
    ScrollTrigger.create({
      trigger: target,
      start: "top center",
      end: "bottom center",
      onEnter: () => setActive(s),
      onEnterBack: () => setActive(s),
    });
  });

  return (id: string) => {
    const s = byId.get(id);
    if (s) setActive(s);
  };
}

export function initReveals(selector = "[data-reveal]") {
  const els = gsap.utils.toArray(selector) as HTMLElement[];
  if (reduceMotion) {
    gsap.set(els, { opacity: 1 });
    return;
  }
  gsap.set(els, { autoAlpha: 0, y: 26 });
  // One batched trigger for the whole set rather than ~25 separate
  // ScrollTrigger instances, each of which would be measured on refresh.
  ScrollTrigger.batch(els, {
    start: "top 84%",
    onEnter: (batch: HTMLElement[]) =>
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out", stagger: 0.06, overwrite: true }),
    onLeaveBack: (batch: HTMLElement[]) =>
      gsap.to(batch, { autoAlpha: 0, y: 26, duration: 0.3, overwrite: true }),
  });
}

export function initParallax() {
  if (reduceMotion || isMobile) return; // background drift is never worth a dropped frame
  const layers = gsap.utils.toArray("[data-parallax]") as HTMLElement[];
  if (!layers.length) return;
  // A single scrubbed timeline drives every background layer, so the
  // background costs one ScrollTrigger total instead of one per layer.
  const tl = gsap.timeline({
    scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: true },
  });
  layers.forEach((layer) => {
    tl.to(layer, { yPercent: -Number(layer.dataset.parallax || "0.1") * 100, ease: "none" }, 0);
  });
}


/* ============================================================
   THE SPORT EXPERIENCE — ONE pinned controller for all six sports
   ============================================================
   Previously each sport and each transition owned its own pinned
   ScrollTrigger: eleven pins in a row, each with a live scrub callback, all
   animating large images, blur, clip-path and SVG at once. Near a boundary
   several of them updated on the same frame, which is what fell apart after
   Swimming.

   Now a single ScrollTrigger pins one viewport and maps scroll progress
   onto a segment table (sport, transition, sport, ...). Exactly one segment
   is live per frame, so per-frame work no longer grows with the number of
   sports. Inactive layers are taken out of the compositor entirely.
============================================================ */

export interface SportLayer {
  root: HTMLElement;
  imageEl: HTMLElement;
  overlay: OverlayHandles;
  hudPanels: HTMLElement[];
  formulaCards: HTMLElement[];
  graphPaths: SVGPathElement[];
}

export interface SportExperienceRefs {
  container: HTMLElement;   // tall element that defines the scroll length
  viewport: HTMLElement;    // the 100vh element that gets pinned
  layers: SportLayer[];
  morphPath: SVGPathElement;
  trCopyEls: HTMLElement[]; // one caption block per transition
  particles: HTMLElement[];
  threadPath: SVGPathElement;
  threadLabel: HTMLElement;
  sports: SportDef[];
  onSportChange: (index: number) => void;
}

type Seg =
  | { kind: "sport"; i: number; start: number; end: number }
  | { kind: "trans"; i: number; start: number; end: number };

const SPORT_UNITS = 1;
const TRANS_UNITS = 0.6;

/** Per-layer cached setters, built once. */
function buildLayerSetters(L: SportLayer) {
  const graphLens = L.graphPaths.map((g) => prepareDash(g));
  return {
    graphLens,
    nJoints: L.overlay.joints.length,
    nCoords: L.overlay.coordLabels.length,
    nBones: L.overlay.bones.length,
    nHud: L.hudPanels.length,
    nFx: L.formulaCards.length,
    joint: opacitySetters(L.overlay.joints),
    jointR: L.overlay.joints.map((j) => guard((v) => j.setAttribute("r", v.toFixed(1)), 0.25)),
    coord: opacitySetters(L.overlay.coordLabels),
    bone: opacitySetters(L.overlay.bones),
    arc: opacitySetters([L.overlay.angleArc, L.overlay.angleText]),
    vec: opacitySetters([L.overlay.vector, L.overlay.vectorText]),
    hudA: opacitySetters(L.hudPanels),
    fxA: opacitySetters(L.formulaCards),
    hudY: L.hudPanels.map((el) => {
      const q = gsap.quickSetter(el, "y", "px");
      return guard((v: number) => q(v), 0.3);
    }),
    fxX: L.formulaCards.map((el) => {
      const q = gsap.quickSetter(el, "x", "px");
      return guard((v: number) => q(v), 0.3);
    }),
    imgScale: gsap.quickSetter(L.imageEl, "scale"),
    ovScale: gsap.quickSetter(L.overlay.svg, "scale"),
    layerAlpha: gsap.quickSetter(L.root, "opacity"),
    traj: guard((v: number) => setPathProgress(L.overlay.trajectory, L.overlay.trajectoryLen, v), 0.002),
    graph: L.graphPaths.map((g, i) => guard((v: number) => setPathProgress(g, graphLens[i], v), 0.003)),
  };
}

export function createSportExperience(refs: SportExperienceRefs) {
  const { container, viewport, layers, morphPath, trCopyEls, particles, threadPath, threadLabel, sports, onSportChange } =
    refs;
  const n = layers.length;

  // ---- segment table ----
  const segs: Seg[] = [];
  let units = 0;
  for (let i = 0; i < n; i++) {
    segs.push({ kind: "sport", i, start: units, end: units + SPORT_UNITS });
    units += SPORT_UNITS;
    if (i < n - 1) {
      segs.push({ kind: "trans", i, start: units, end: units + TRANS_UNITS });
      units += TRANS_UNITS;
    }
  }
  for (const sg of segs) {
    sg.start /= units;
    sg.end /= units;
  }
  // scroll length: ~120vh per unit -> about 1080vh for six sports
  container.style.height = `${Math.round(units * 120)}vh`;

  const S = layers.map(buildLayerSetters);

  // ---- one-time initial state ----
  layers.forEach((L, i) => {
    gsap.set([L.imageEl, L.overlay.svg], { scale: 1.06, force3D: true });
    gsap.set(L.root, { opacity: i === 0 ? 1 : 0 });
    gsap.set([...L.overlay.joints, ...L.overlay.coordLabels, ...L.overlay.bones], { opacity: 0 });
    gsap.set([L.overlay.angleArc, L.overlay.angleText, L.overlay.vector, L.overlay.vectorText], { opacity: 0 });
    gsap.set([...L.hudPanels, ...L.formulaCards], { opacity: 0 });
    setPathProgress(L.overlay.trajectory, L.overlay.trajectoryLen, 0);
    S[i].graphLens.forEach((len, gi) => setPathProgress(L.graphPaths[gi], len, 0));
    L.root.classList.toggle("is-live", i === 0);
  });
  gsap.set(trCopyEls, { opacity: 0 });
  if (particles.length) gsap.set(particles, { opacity: 0, x: 0, y: 0 });

  // Data-thread viewport-space shapes, re-measured only on refresh.
  let threadShapes: [number, number][][] = [];
  const measureThread = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    threadShapes = sports.map(
      (sp) => sp.threadShape.map(([x, y]) => [(x / 100) * w, (y / 100) * h]) as [number, number][]
    );
  };
  measureThread();
  ScrollTrigger.addEventListener("refreshInit", measureThread);

  // ---- live-layer bookkeeping: keep at most two layers in the compositor ----
  let liveA = -1;
  let liveB = -1;
  const setLive = (a: number, b: number) => {
    if (a === liveA && b === liveB) return;
    for (let i = 0; i < n; i++) {
      const shouldBeLive = i === a || i === b;
      if (layers[i].root.classList.contains("is-live") !== shouldBeLive) {
        layers[i].root.classList.toggle("is-live", shouldBeLive);
        if (!shouldBeLive) S[i].layerAlpha(0);
      }
    }
    liveA = a;
    liveB = b;
  };

  let activeSport = -1;
  let lastTrIdx = -1;
  let lastThreadRaw = -1;
  const setMorphD = guard(
    (v: number) => {
      const i = Math.min(n - 2, Math.floor(v));
      const t = v - i;
      morphPath.setAttribute("d", cubicFrom(lerpPoints(sports[i].trajectory, sports[i + 1].trajectory, t)));
    },
    0.005
  );
  const setThreadD = guard(
    (v: number) => {
      const i = Math.min(n - 2, Math.floor(v));
      const t = v - i;
      threadPath.setAttribute("d", cubicRaw(lerpPoints(threadShapes[i], threadShapes[i + 1], t)));
    },
    0.005
  );
  let lastThreadLabel = "";

  /** Runs one sport's analysis choreography at local progress p. */
  function drawSport(i: number, p: number, alpha: number) {
    const L = layers[i];
    const s = S[i];
    s.layerAlpha(alpha);
    const zoom = 1.06 + p * 0.1;
    s.imgScale(zoom);
    s.ovScale(zoom);

    const kp = seg(p, 0.0, 0.22);
    for (let k = 0; k < s.nJoints; k++) {
      const local = clamp01(kp * s.nJoints - k);
      s.joint[k](local);
      s.jointR[k](9 + (1 - local) * 10);
    }
    for (let k = 0; k < s.nCoords; k++) s.coord[k](clamp01(kp * s.nCoords - k) * 0.85);

    const bp = seg(p, 0.18, 0.4);
    for (let k = 0; k < s.nBones; k++) s.bone[k](clamp01(bp * s.nBones - k));

    const ap = seg(p, 0.34, 0.5);
    s.arc[0](ap);
    s.arc[1](ap);
    const vp = seg(p, 0.42, 0.56);
    s.vec[0](vp);
    s.vec[1](vp);

    const tp = seg(p, 0.5, 0.74);
    s.traj(tp);
    setTrailProgress(L.overlay, tp);

    const fp = seg(p, 0.58, 0.8);
    for (let k = 0; k < s.nFx; k++) {
      const local = clamp01(fp * s.nFx - k);
      s.fxA[k](local);
      s.fxX[k]((1 - local) * -12);
    }
    const hp = seg(p, 0.7, 1.0);
    for (let k = 0; k < s.nHud; k++) {
      const local = clamp01(hp * s.nHud - k);
      s.hudA[k](local);
      s.hudY[k](14 * (1 - local));
    }
    for (let k = 0; k < s.graph.length; k++) s.graph[k](clamp01(hp * s.graph.length - k * 0.7));
  }

  if (reduceMotion) {
    // No pin, no scrub: show the first sport fully resolved and let the
    // page scroll normally.
    container.style.height = "auto";
    layers.forEach((L, i) => {
      L.root.classList.toggle("is-live", i === 0);
      if (i === 0) drawSport(0, 1, 1);
    });
    return;
  }

  ScrollTrigger.create({
    trigger: container,
    start: "top top",
    end: "bottom bottom",
    pin: viewport,
    pinSpacing: false,
    anticipatePin: 1,
    invalidateOnRefresh: false,
    fastScrollEnd: true,
    onUpdate: (self: { progress: number }) => {
      const p = self.progress;

      // locate the active segment (small table, linear scan is cheapest)
      let sg = segs[segs.length - 1];
      for (let k = 0; k < segs.length; k++) {
        if (p <= segs[k].end) {
          sg = segs[k];
          break;
        }
      }
      const local = clamp01((p - sg.start) / (sg.end - sg.start));

      if (sg.kind === "sport") {
        setLive(sg.i, -1);
        drawSport(sg.i, local, 1);
        if (activeSport !== sg.i) {
          activeSport = sg.i;
          onSportChange(sg.i);
        }
        if (lastTrIdx !== -1) {
          gsap.set(trCopyEls, { opacity: 0 });
          if (particles.length) gsap.set(particles, { opacity: 0 });
          lastTrIdx = -1;
        }
        setMorphD(sg.i === 0 ? 0 : Math.min(n - 2, sg.i - 1) + 1);
      } else {
        const from = sg.i;
        const to = sg.i + 1;
        setLive(from, to);

        // Images cross on transform + opacity only — no clip-path, no
        // per-frame filter string. Blur is a CSS class toggled once at the
        // midpoint instead of being rebuilt every frame.
        S[from].layerAlpha(1 - local);
        S[from].imgScale(1.16 + local * 0.04);
        S[to].layerAlpha(local);
        S[to].imgScale(1.1 - local * 0.04);

        const midBlur = local > 0.18 && local < 0.82;
        if (layers[from].root.classList.contains("is-blurred") !== midBlur) {
          layers[from].root.classList.toggle("is-blurred", midBlur);
          layers[to].root.classList.toggle("is-blurred", midBlur);
        }

        setMorphD(from + local);

        if (lastTrIdx !== sg.i) {
          gsap.set(trCopyEls, { opacity: 0 });
          lastTrIdx = sg.i;
        }
        const cap = trCopyEls[sg.i];
        if (cap) gsap.set(cap, { opacity: Math.sin(clamp01(local) * Math.PI) });

        if (particles.length && sg.i === 0) {
          for (let k = 0; k < particles.length; k++) {
            const v = clamp01(local - (k / particles.length) * 0.4);
            gsap.set(particles[k], {
              opacity: Math.sin(v * Math.PI) * 0.85,
              x: v * (110 + k * 26),
              y: -v * (36 + (k % 5) * 16),
            });
          }
        }
      }

      // the Data Thread rides the same progress — no second global trigger
      const raw = p * (n - 1);
      if (Math.abs(raw - lastThreadRaw) >= 0.004) {
        lastThreadRaw = raw;
        setThreadD(raw);
        const idx = Math.round(raw);
        const label = `DATA THREAD — ${sports[Math.min(n - 1, idx)].threadLabel}`;
        if (label !== lastThreadLabel) {
          lastThreadLabel = label;
          threadLabel.textContent = label;
        }
      }
    },
    onToggle: (self: { isActive: boolean }) => {
      gsap.to([threadPath, threadLabel], { autoAlpha: self.isActive ? 1 : 0, duration: 0.4, overwrite: true });
    },
  });
}

export function animatePipeline(container: HTMLElement) {
  const nodes = container.querySelectorAll<HTMLElement>(".pipeline-node");
  const pulse = container.querySelector<SVGCircleElement>(".pipeline-pulse");
  const path = container.querySelector<SVGPathElement>(".pipeline-line");
  if (!path || !pulse) return;
  const len = prepareDash(path);
  // Pre-sample the pulse track so the scroll callback never calls
  // getPointAtLength, and fold the node reveals into the same timeline
  // instead of giving each node its own ScrollTrigger.
  const track = samplePath(path, len, 128);

  const setPulse = guard((v: number) => {
    const idx = Math.min(127, Math.max(0, Math.round(v * 127)));
    pulse.setAttribute("cx", track[idx * 2].toFixed(1));
    pulse.setAttribute("cy", track[idx * 2 + 1].toFixed(1));
  }, 0.004);

  const tl = gsap.timeline({
    scrollTrigger: { trigger: container, start: "top 70%", end: "bottom 60%", scrub: true },
  });
  tl.to(path, { strokeDashoffset: 0, ease: "none", duration: 1 }, 0);
  tl.to({ v: 0 }, { v: 1, duration: 1, ease: "none", onUpdate: function () { setPulse(this.targets()[0].v); } }, 0);
  gsap.set(nodes, { autoAlpha: 0.25, scale: 0.92 });
  tl.to(nodes, { autoAlpha: 1, scale: 1, ease: "none", duration: 0.5, stagger: 0.05 }, 0);
}

/** Final scene: the six trajectories converge, then dissolve into the closing words. */
export function animateConvergence(container: HTMLElement, paths: SVGPathElement[]) {
  const lens = paths.map((p) => prepareDash(p));
  const setDraw = paths.map((p, i) => guard((v: number) => setPathProgress(p, lens[i], v), 0.003));
  const setScale = paths.map((p) => gsap.quickSetter(p, "scale"));
  const setAlpha = paths.map((p) => {
    const st = p.style;
    return guard((v: number) => (st.opacity = v.toFixed(3)), 0.006);
  });
  gsap.set(paths, { transformOrigin: "50% 50%", force3D: true });

  ScrollTrigger.create({
    trigger: container,
    start: "top 75%",
    end: "bottom 40%",
    scrub: true,
    onUpdate: (self: { progress: number }) => {
      const prog = self.progress;
      const drawP = seg(prog, 0, 0.55);
      const converge = seg(prog, 0.55, 1);
      const n = paths.length;
      for (let i = 0; i < n; i++) {
        setDraw[i](clamp01(drawP * n - i * 0.6));
        setScale[i](1 - converge * 0.75);
        setAlpha[i](1 - converge * 0.85);
      }
    },
  });
}

export function initJointTooltips(tooltipEl: HTMLElement, labels: Record<string, string>) {
  document.addEventListener("mouseover", (e) => {
    const t = e.target as SVGElement;
    if (!t.classList || !t.classList.contains("ov-joint")) return;
    const name = (t as unknown as HTMLElement).dataset.joint;
    if (!name) return;
    tooltipEl.textContent = labels[name] || name;
    tooltipEl.classList.add("is-visible");
    t.classList.add("is-hot");
  });
  document.addEventListener("mousemove", (e) => {
    if (!tooltipEl.classList.contains("is-visible")) return;
    tooltipEl.style.left = `${e.clientX + 14}px`;
    tooltipEl.style.top = `${e.clientY + 14}px`;
  });
  document.addEventListener(
    "mouseout",
    (e) => {
      const t = e.target as SVGElement;
      if (!t.classList || !t.classList.contains("ov-joint")) return;
      tooltipEl.classList.remove("is-visible");
      t.classList.remove("is-hot");
    },
    true
  );
}
