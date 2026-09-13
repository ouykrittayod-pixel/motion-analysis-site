import { BONES, JointName, Pose, SportDef } from "../data/sports";

const SVG_NS = "http://www.w3.org/2000/svg";

// The photos are all 1680x944 (16:9). The overlay SVG uses this viewBox with
// preserveAspectRatio="xMidYMid slice", which is the SVG equivalent of the
// image's object-fit: cover — so the overlay crops identically to the photo
// at every viewport size and the keypoints stay locked to the athlete.
export const VB_W = 1600;
export const VB_H = 900;

/** photo-space percent -> overlay viewBox units */
export function px(xPct: number): number {
  return (xPct / 100) * VB_W;
}
export function py(yPct: number): number {
  return (yPct / 100) * VB_H;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
}

function boneKey(a: JointName, b: JointName): string {
  return `${a}__${b}`;
}

export const TRAIL_SAMPLES = 96;

export interface OverlayHandles {
  svg: SVGSVGElement;
  bones: SVGLineElement[];
  joints: SVGCircleElement[];
  coordLabels: SVGTextElement[];
  angleArc: SVGPathElement;
  angleText: SVGTextElement;
  vector: SVGLineElement;
  vectorText: SVGTextElement;
  trajectory: SVGPathElement;
  trajectoryLen: number;
  trailDots: SVGCircleElement[];
  /** Flat [x0,y0,x1,y1,...] lookup along the trajectory, sampled once. */
  samples: Float64Array;
}

/** Samples a path into a flat coordinate table so scroll never touches SVG geometry. */
export function samplePath(path: SVGPathElement, len: number, n: number): Float64Array {
  const out = new Float64Array(n * 2);
  if (!path.getPointAtLength || !len) return out;
  for (let i = 0; i < n; i++) {
    const pt = path.getPointAtLength((i / (n - 1)) * len);
    out[i * 2] = pt.x;
    out[i * 2 + 1] = pt.y;
  }
  return out;
}

/** Cubic path string through 4 photo-space control points. */
export function cubicFrom(points: [number, number][]): string {
  const p = points.map(([x, y]) => [px(x), py(y)]);
  return `M ${p[0][0]},${p[0][1]} C ${p[1][0]},${p[1][1]} ${p[2][0]},${p[2][1]} ${p[3][0]},${p[3][1]}`;
}

/**
 * Builds the full biomechanics overlay for one sport photo. Nothing here
 * draws a human figure — the photograph is the athlete. This only adds the
 * analysis layer a biomechanics lab would superimpose: keypoints, skeleton
 * links, a joint-angle arc, a velocity vector, and the motion trajectory.
 */
export function buildOverlay(svg: SVGSVGElement, sport: SportDef): OverlayHandles {
  svg.setAttribute("viewBox", `0 0 ${VB_W} ${VB_H}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  svg.innerHTML = "";

  const defs = el("defs");
  defs.innerHTML = `
    <marker id="vecArrow-${sport.id}" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="#e8a23c"/>
    </marker>`;
  svg.appendChild(defs);

  const gTraj = el("g");
  const gBones = el("g");
  const gJoints = el("g");
  const gAnnot = el("g");
  svg.append(gTraj, gBones, gJoints, gAnnot);

  // --- trajectory (the limb's motion path) ---
  const trajectory = el("path");
  trajectory.setAttribute("d", cubicFrom(sport.trajectory));
  trajectory.setAttribute("class", "ov-trajectory");
  gTraj.appendChild(trajectory);
  const trajectoryLen = trajectory.getTotalLength ? trajectory.getTotalLength() : 0;
  // stroke-dasharray is a static property of this path: set it once here so
  // the scroll callback only ever has to write strokeDashoffset.
  trajectory.style.strokeDasharray = `${trajectoryLen}`;
  trajectory.style.strokeDashoffset = `${trajectoryLen}`;
  // Pre-sample the curve into a flat lookup table. Without this the motion
  // trail calls getPointAtLength() nine times per scroll tick, which forces
  // SVG geometry work on the main thread on every frame.
  const samples = samplePath(trajectory, trajectoryLen, TRAIL_SAMPLES);

  // motion-trail dots riding the same path
  const trailDots: SVGCircleElement[] = [];
  for (let i = 0; i < 9; i++) {
    const d = el("circle");
    d.setAttribute("r", String(4 - i * 0.3));
    d.setAttribute("class", "ov-trail-dot");
    gTraj.appendChild(d);
    trailDots.push(d);
  }

  // --- skeleton links ---
  const bones: SVGLineElement[] = [];
  BONES.forEach(([a, b]) => {
    const line = el("line");
    line.setAttribute("x1", String(px(sport.pose[a][0])));
    line.setAttribute("y1", String(py(sport.pose[a][1])));
    line.setAttribute("x2", String(px(sport.pose[b][0])));
    line.setAttribute("y2", String(py(sport.pose[b][1])));
    line.setAttribute("class", "ov-bone");
    line.dataset.bone = boneKey(a, b);
    gBones.appendChild(line);
    bones.push(line);
  });

  // --- keypoints + coordinate labels ---
  const joints: SVGCircleElement[] = [];
  const coordLabels: SVGTextElement[] = [];
  (Object.keys(sport.pose) as JointName[]).forEach((name, i) => {
    const [x, y] = sport.pose[name];
    const c = el("circle");
    c.setAttribute("cx", String(px(x)));
    c.setAttribute("cy", String(py(y)));
    c.setAttribute("r", "9");
    c.setAttribute("class", "ov-joint");
    c.dataset.joint = name;
    gJoints.appendChild(c);
    joints.push(c);

    const t = el("text");
    t.setAttribute("x", String(px(x) + 14));
    t.setAttribute("y", String(py(y) - 12));
    t.setAttribute("class", "ov-coord mono");
    t.textContent = `P${i + 1} (${x.toFixed(0)}, ${y.toFixed(0)})`;
    gJoints.appendChild(t);
    coordLabels.push(t);
  });

  // --- joint angle arc (theta) ---
  const [ja, jb, jc] = sport.angleJoints;
  const angleArc = el("path");
  angleArc.setAttribute("class", "ov-angle");
  angleArc.setAttribute("d", arcBetween(sport.pose, ja, jb, jc));
  gAnnot.appendChild(angleArc);

  const angleText = el("text");
  angleText.setAttribute("class", "ov-angle-text mono");
  angleText.setAttribute("x", String(px(sport.pose[jb][0]) + 22));
  angleText.setAttribute("y", String(py(sport.pose[jb][1]) + 30));
  // θ is computed from the keypoints with the report's own equation rather
  // than hard-coded, so the number on screen is always the angle actually
  // drawn by the arc — the formula and the visual can never disagree.
  angleText.textContent = `θ = ${jointAngleDeg(sport.pose, ja, jb, jc).toFixed(0)}°`;
  gAnnot.appendChild(angleText);

  // --- velocity vector ---
  const [vx, vy] = sport.vector;
  const vFrom = sport.pose[sport.vectorFrom];
  const vector = el("line");
  vector.setAttribute("x1", String(px(vFrom[0])));
  vector.setAttribute("y1", String(py(vFrom[1])));
  vector.setAttribute("x2", String(px(vFrom[0] + vx)));
  vector.setAttribute("y2", String(py(vFrom[1] + vy)));
  vector.setAttribute("class", "ov-vector");
  vector.setAttribute("marker-end", `url(#vecArrow-${sport.id})`);
  gAnnot.appendChild(vector);

  const vectorText = el("text");
  vectorText.setAttribute("class", "ov-vector-text mono");
  vectorText.setAttribute("x", String(px(vFrom[0] + vx) + 10));
  vectorText.setAttribute("y", String(py(vFrom[1] + vy) - 6));
  vectorText.textContent = "v";
  gAnnot.appendChild(vectorText);

  return {
    svg,
    bones,
    joints,
    coordLabels,
    angleArc,
    angleText,
    vector,
    vectorText,
    trajectory,
    trajectoryLen,
    trailDots,
    samples,
  };
}

/**
 * θ = cos⁻¹( (BA · BC) / (|BA||BC|) ) — the joint-angle equation from the
 * report, evaluated on the stored keypoints. B is the joint vertex.
 * Aspect-corrected into viewBox units first, so the angle matches what the
 * viewer actually sees on the photograph.
 */
export function jointAngleDeg(pose: Pose, a: JointName, b: JointName, c: JointName): number {
  const P = (j: JointName) => [px(pose[j][0]), py(pose[j][1])];
  const [bx, by] = P(b);
  const [ax, ay] = P(a);
  const [cx, cy] = P(c);
  const BA = [ax - bx, ay - by];
  const BC = [cx - bx, cy - by];
  const dot = BA[0] * BC[0] + BA[1] * BC[1];
  const mag = Math.hypot(BA[0], BA[1]) * Math.hypot(BC[0], BC[1]);
  if (mag === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

/** Small arc at joint B, swept between the BA and BC directions. */
function arcBetween(pose: Pose, a: JointName, b: JointName, c: JointName): string {
  const B = [px(pose[b][0]), py(pose[b][1])];
  const A = [px(pose[a][0]), py(pose[a][1])];
  const C = [px(pose[c][0]), py(pose[c][1])];
  const r = 46;
  const ang = (p: number[]) => Math.atan2(p[1] - B[1], p[0] - B[0]);
  const a1 = ang(A);
  const a2 = ang(C);
  const p1 = [B[0] + r * Math.cos(a1), B[1] + r * Math.sin(a1)];
  const p2 = [B[0] + r * Math.cos(a2), B[1] + r * Math.sin(a2)];
  let delta = a2 - a1;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  const sweep = delta > 0 ? 1 : 0;
  return `M ${p1[0]},${p1[1]} A ${r} ${r} 0 0 ${sweep} ${p2[0]},${p2[1]}`;
}

/**
 * Reveals a path by stroke-dashoffset only. stroke-dasharray is set once at
 * build time (or by prepareDash below), because rewriting both properties
 * every tick makes the browser re-resolve the dash pattern each frame.
 */
export function setPathProgress(path: SVGPathElement, len: number, progress: number) {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  path.style.strokeDashoffset = `${len * (1 - p)}`;
}

/** One-time dash setup for paths not created by buildOverlay (graphs, trails). */
export function prepareDash(path: SVGPathElement): number {
  const len = path.getTotalLength ? path.getTotalLength() : 0;
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;
  return len;
}

/**
 * Positions the motion-trail dots from the pre-sampled table. No
 * getPointAtLength, no layout reads — just array indexing and two writes
 * per visible dot.
 */
export function setTrailProgress(h: OverlayHandles, progress: number) {
  const n = TRAIL_SAMPLES;
  if (!h.samples.length) return;
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  for (let i = 0; i < h.trailDots.length; i++) {
    const dot = h.trailDots[i];
    const offset = p - i * 0.045;
    if (offset <= 0) {
      if (dot.style.opacity !== "0") dot.style.opacity = "0";
      continue;
    }
    const idx = Math.min(n - 1, Math.round(Math.min(1, offset) * (n - 1)));
    dot.setAttribute("cx", String(h.samples[idx * 2]));
    dot.setAttribute("cy", String(h.samples[idx * 2 + 1]));
    dot.style.opacity = String(Math.max(0, 0.85 - i * 0.09));
  }
}

/** Linear interpolation between two equal-length control-point sets. */
export function lerpPoints(
  a: [number, number][],
  b: [number, number][],
  t: number
): [number, number][] {
  return a.map(([x1, y1], i) => {
    const [x2, y2] = b[i];
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t] as [number, number];
  });
}

/** Cubic path in raw pixel space (used by the fixed, page-wide Data Thread). */
export function cubicRaw(points: [number, number][]): string {
  return `M ${points[0][0]},${points[0][1]} C ${points[1][0]},${points[1][1]} ${points[2][0]},${points[2][1]} ${points[3][0]},${points[3][1]}`;
}
