import { BONES, JointName, Pose } from "../data/sports";

// GSAP is loaded globally via CDN <script> tags in index.html (see the
// comment there for why) rather than imported from the npm package.
declare const gsap: any;

const SVG_NS = "http://www.w3.org/2000/svg";

export interface AthleteHandles {
  svg: SVGSVGElement;
  bodyGroup: SVGGElement;
  overlayGroup: SVGGElement;
  limbLines: Record<string, SVGLineElement>; // pictogram layer, thick
  boneLines: Record<string, SVGLineElement>; // overlay layer, thin
  torso: SVGPolygonElement;
  headBody: SVGCircleElement;
  headOverlay: SVGCircleElement;
  joints: Record<JointName, SVGCircleElement>;
  jointLabels: Partial<Record<JointName, SVGTextElement>>;
}

function boneKey(a: JointName, b: JointName): string {
  return `${a}__${b}`;
}

const LIMB_BONES = BONES.filter(([a, b]) => a !== "head" && b !== "head");

function el<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
}

/**
 * Builds a two-layer athlete rig inside an empty <svg>:
 *  - bodyGroup:    a filled pictogram (rounded-capsule limbs + torso + head),
 *                  the "recognisable human athlete" layer.
 *  - overlayGroup: the thin technical layer (skeleton lines, keypoint
 *                  circles, per-joint coordinate labels) drawn on top.
 * Both layers share the exact same joint coordinates, so animating one set
 * of numbers moves the whole athlete — human silhouette and data overlay
 * transform together, which is what makes the pose morph read as one
 * continuous body rather than a swapped image.
 */
export function buildAthleteRig(svg: SVGSVGElement, pose: Pose, withLabels = false): AthleteHandles {
  svg.setAttribute("viewBox", "0 0 300 400");
  svg.innerHTML = "";

  const bodyGroup = el("g");
  bodyGroup.setAttribute("class", "athlete-body");
  const overlayGroup = el("g");
  overlayGroup.setAttribute("class", "athlete-overlay");

  const torso = el("polygon");
  torso.setAttribute("class", "athlete-torso");
  bodyGroup.appendChild(torso);

  const limbLines: Record<string, SVGLineElement> = {};
  LIMB_BONES.forEach(([a, b]) => {
    const line = el("line");
    line.setAttribute("class", "athlete-limb");
    limbLines[boneKey(a, b)] = line;
    bodyGroup.appendChild(line);
  });
  const headBody = el("circle");
  headBody.setAttribute("class", "athlete-head");
  bodyGroup.appendChild(headBody);

  const boneLines: Record<string, SVGLineElement> = {};
  BONES.forEach(([a, b]) => {
    const line = el("line");
    line.setAttribute("class", "bone");
    boneLines[boneKey(a, b)] = line;
    overlayGroup.appendChild(line);
  });
  const headOverlay = el("circle");
  headOverlay.setAttribute("class", "joint joint-head");
  headOverlay.setAttribute("r", "13");
  overlayGroup.appendChild(headOverlay);

  const joints = {} as Record<JointName, SVGCircleElement>;
  const jointLabels: Partial<Record<JointName, SVGTextElement>> = {};
  (Object.keys(pose) as JointName[]).forEach((name) => {
    if (name === "head") return;
    const c = el("circle");
    c.setAttribute("r", "5");
    c.setAttribute("class", "joint");
    c.dataset.joint = name;
    overlayGroup.appendChild(c);
    joints[name] = c;
    if (withLabels) {
      const t = el("text");
      t.setAttribute("class", "joint-coord-label mono");
      t.setAttribute("font-size", "8");
      overlayGroup.appendChild(t);
      jointLabels[name] = t;
    }
  });
  joints.head = headOverlay;

  svg.appendChild(bodyGroup);
  svg.appendChild(overlayGroup);

  const handles: AthleteHandles = {
    svg,
    bodyGroup,
    overlayGroup,
    limbLines,
    boneLines,
    torso,
    headBody,
    headOverlay,
    joints,
    jointLabels,
  };
  applyPoseImmediate(handles, pose);
  return handles;
}

function applyPoseImmediate(h: AthleteHandles, pose: Pose) {
  (Object.keys(pose) as JointName[]).forEach((name) => {
    const [x, y] = pose[name];
    if (name === "head") {
      h.headBody.setAttribute("cx", String(x));
      h.headBody.setAttribute("cy", String(y));
      h.headBody.setAttribute("r", "17");
      h.headOverlay.setAttribute("cx", String(x));
      h.headOverlay.setAttribute("cy", String(y));
    } else {
      h.joints[name].setAttribute("cx", String(x));
      h.joints[name].setAttribute("cy", String(y));
    }
    const label = h.jointLabels[name];
    if (label) {
      label.setAttribute("x", String(x + 8));
      label.setAttribute("y", String(y - 8));
      label.textContent = `(${Math.round(x)}, ${Math.round(y)})`;
    }
  });
  BONES.forEach(([a, b]) => {
    const [x1, y1] = pose[a];
    const [x2, y2] = pose[b];
    const bone = h.boneLines[boneKey(a, b)];
    bone.setAttribute("x1", String(x1));
    bone.setAttribute("y1", String(y1));
    bone.setAttribute("x2", String(x2));
    bone.setAttribute("y2", String(y2));
    const limb = h.limbLines[boneKey(a, b)];
    if (limb) {
      limb.setAttribute("x1", String(x1));
      limb.setAttribute("y1", String(y1));
      limb.setAttribute("x2", String(x2));
      limb.setAttribute("y2", String(y2));
    }
  });
  h.torso.setAttribute(
    "points",
    `${pose.shoulderL.join(",")} ${pose.shoulderR.join(",")} ${pose.hipR.join(",")} ${pose.hipL.join(",")}`
  );
}

/**
 * Morphs an athlete rig from `fromPose` to `targetPose` by tweening a plain
 * coordinate proxy per joint and re-drawing torso/limbs/bones/joints/labels
 * on every tick. Returns a paused GSAP timeline (0..1) meant to be scrubbed
 * against scroll progress — both the pictogram body and the technical
 * overlay redraw from the same numbers, so they always move as one figure.
 */
export function morphAthleteTo(h: AthleteHandles, fromPose: Pose, targetPose: Pose): any {
  const tl = gsap.timeline({ paused: true });
  const proxies: Record<JointName, { x: number; y: number }> = {} as any;
  (Object.keys(targetPose) as JointName[]).forEach((name) => {
    proxies[name] = { x: fromPose[name][0], y: fromPose[name][1] };
  });

  const frame = () => {
    const asPose = {} as Pose;
    (Object.keys(proxies) as JointName[]).forEach((name) => {
      asPose[name] = [proxies[name].x, proxies[name].y];
    });
    applyPoseImmediate(h, asPose);
  };

  (Object.keys(targetPose) as JointName[]).forEach((name) => {
    const [tx, ty] = targetPose[name];
    tl.to(proxies[name], { x: tx, y: ty, duration: 1, ease: "none", onUpdate: frame }, 0);
  });

  return tl;
}

/** Sets the body-layer / overlay-layer opacity split (0 = pure overlay, 1 = pure body). */
export function setLayerMix(h: AthleteHandles, bodyOpacity: number) {
  h.bodyGroup.style.opacity = String(Math.max(0, Math.min(1, bodyOpacity)));
  h.overlayGroup.style.opacity = String(Math.max(0, Math.min(1, 1 - bodyOpacity * 0.65)));
}

/** Draws an SVG path with a stroke-dashoffset reveal, driven by scroll progress. */
export function prepareTrajectoryDraw(path: SVGPathElement) {
  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length}`;
  return length;
}

export function setTrajectoryProgress(path: SVGPathElement, length: number, progress: number) {
  path.style.strokeDashoffset = `${length * (1 - Math.max(0, Math.min(1, progress)))}`;
}

/** Cubic-bezier "M x0,y0 C x1,y1 x2,y2 x3,y3" string, lerped between two 4-point shapes. */
export function lerpCubicPath(a: [number, number][], b: [number, number][], t: number): string {
  const pts = a.map((p, i) => {
    const [x1, y1] = p;
    const [x2, y2] = b[i];
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t] as [number, number];
  });
  return `M ${pts[0][0]},${pts[0][1]} C ${pts[1][0]},${pts[1][1]} ${pts[2][0]},${pts[2][1]} ${pts[3][0]},${pts[3][1]}`;
}
