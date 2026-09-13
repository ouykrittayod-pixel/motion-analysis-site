# MOTION BECOMES DATA

**ระบบวิเคราะห์การเคลื่อนไหวสำหรับสนับสนุนวิทยาศาสตร์การกีฬา**
*Motion Analysis System for Supporting Sports Science*

An interactive scrollytelling site on the mathematics behind sports motion
analysis — coordinates, distance, vectors, velocity, acceleration, and joint
angles — walked through five sports (running, badminton, basketball,
football, tennis) with a single SVG skeleton rig that morphs from pose to
pose as you scroll.

Krittayod Vipromha · 2610717302033
Faculty of Engineering, Computer Engineering and Artificial Intelligence
University of the Thai Chamber of Commerce · Academic Year 2026

---

## 1. Project overview

The site tells one continuous story: **human movement → observation →
computer vision → keypoints → coordinates → mathematics → kinematics →
motion analysis → sports insight → AI**. Twelve numbered sections carry that
story from a cinematic hero through five sport-specific breakdowns to a
closing "sports ecosystem" view, followed by a project-files archive holding
every source document supplied for this project.

All on-screen performance numbers (velocity, joint angles, jump height,
etc.) are marked **ILLUSTRATIVE DATA** — they demonstrate what the report's
equations *would* measure from real pose-tracking data. Nothing on the site
claims to be a real athlete's measurement, and no AI model is claimed to
have been trained; the AI section is explicitly framed as a **proposed
extension**, consistent with the source report.

## 2. Technologies

| Layer | Choice | Why |
|---|---|---|
| Build tool | **Vite** | fast dev server, zero-config static build, trivial GitHub Pages output |
| Language | **TypeScript** | typed data models for poses/equations/files, safer refactors |
| Animation | **GSAP + ScrollTrigger** (CDN), `pin: true` scenes | scrubbed timelines, pinned scenes, clip-path transitions |
| Athlete | **six supplied photographs** + SVG analysis overlay | the real athlete is the hero; graphics annotate, never replace |
| Math typesetting | **KaTeX** (CDN) | renders the report's actual equations |
| Type | Space Grotesk (display) + IBM Plex Sans Thai (body/Thai) + IBM Plex Mono (data/HUD) | Thai renders correctly; mono face reads as lab telemetry |

### The athlete layer: six real photographs

The athletes are the six supplied photographs — no drawn figure stands in
for them anywhere on the site. Each sport scene is a full-bleed `<img>`
with `object-fit: cover`, and the biomechanics graphics sit above it in an
SVG overlay.

**Registration.** All six photos are exactly 1680x944 (16:9). The overlay
SVG uses `viewBox="0 0 1600 900"` with `preserveAspectRatio="xMidYMid
slice"`, which is the SVG equivalent of `object-fit: cover` — so image and
overlay crop identically at every viewport size and the keypoints stay on
the athlete. Joint coordinates live in `src/data/sports.ts` as percentages
of the photo frame, estimated by eye from each image; nudge a number there
and the skeleton, angle arc, vector and trajectory all follow.

One rule matters if you edit the animation code: **any transform applied to
a scene photo must be applied to its overlay with the same value and
origin.** The cinematic push-in scales both together; scaling only the photo
would slide the keypoints off the body.

**Computed angles.** The θ shown on each arc is not hard-coded — it is
evaluated at runtime by `jointAngleDeg()` in `overlay.ts`, which implements
the report's own equation, θ = cos⁻¹((BA·BC)/(|BA||BC|)), on the stored
keypoints. The formula, the arc and the HUD readout therefore cannot drift
apart.

### Pinned scenes and trajectory-morph transitions

Each sport is a pinned scene (~2.2 screen-heights). One scrubbed timeline
runs the analysis in the order a lab would: keypoints land on the athlete →
skeleton links them → joint-angle arc and velocity vector annotate the
moving limb → the trajectory draws along that limb's path with a motion
trail → the formulas for that sport fade in → HUD readouts and the
x(t)/v(t)/a(t) graphs derived from the same trajectory appear. Scrolling up
reverses it.

Between sports sits a pinned transition scene that is explicitly *not* a
crossfade: the outgoing photo pushes in, blurs and desaturates under a
closing clip-path wipe, while the trajectory curve that belonged to the
outgoing limb morphs by coordinate interpolation into the incoming sport's
trajectory shape, and the incoming photo is revealed by a wipe opening
along that same line. The swimming → running hand-off additionally drifts
water particles along the curve.

### The Data Thread

One fixed, full-viewport path (`initDataThread`) interpolated between each
sport's four-point `threadShape`. Same point count throughout, so it is a
true coordinate morph rather than a crossfade — one continuous line whose
label re-states its meaning per sport: arm → foot → racket → ball → foot →
racket trajectory.

### A deliberate architecture note: TypeScript modules, not React components

The brief's preferred stack listed React. This project uses **plain
TypeScript modules with the same responsibilities components would have**
(`Hero`, `Skeleton`, `SportSection`, `AnalysisPipeline`, etc., as functions
in `src/main.ts` and `src/animations/`) instead of JSX components, for one
concrete reason: **the entire site is one continuous GSAP ScrollTrigger
timeline manipulating raw SVG attributes every frame** (joint coordinates,
stroke-dashoffset, pipeline pulse position). That kind of imperative,
per-frame DOM mutation fights React's re-render model — you'd spend more
code fighting `useEffect`/refs to keep GSAP and React from stepping on each
other than you'd spend on the animation itself. Vanilla TS + GSAP driving
the DOM directly is the standard, well-trodden pattern for scrollytelling
sites of this kind (in the spirit of what The Pudding or NYT interactive
graphics ship). The folder layout below still mirrors the requested
component/data/animation separation so the codebase reads the same way.

GSAP and KaTeX are loaded from a CDN rather than as npm packages, so
`npm install` only needs `vite` and `typescript` — the animation engine
itself has zero build-time dependency. If the CDN is unreachable, a small
inline fallback in `index.html` no-ops GSAP so the page still renders
(static content, project files) instead of crashing blank.

## 3. Installation

```bash
npm install
```

## 4. Development

```bash
npm run dev
```

Opens a local dev server (default `http://localhost:5173`) with hot reload.

## 5. Build

```bash
npm run build
```

Type-checks with `tsc -b` then outputs a static site to `dist/`.

> **Note on verification.** This was built in an environment with no npm
> registry and no browser binary, so `vite build` and a live render could
> not be run here. What *was* verified:
>
> - `tsc --noEmit` — clean, zero errors.
> - The overlay geometry was executed directly: all six trajectory paths
>   produce valid cubic path strings, all control points sit inside the
>   frame, all 13 keypoints per sport are in frame, every pose→pose morph
>   stays finite, and every displayed θ matches the arc actually drawn.
> - Scene/transition element ids, the transition chain, and every asset
>   path were cross-checked against the files on disk.
>
> Not verified: real scroll behaviour. Pin lengths (`end: "+=220%"` for
> sport scenes, `"+=190%"` for transitions) and the keypoint percentages
> are judgement calls that need eyes on a screen. Expect to nudge those
> two things; the structure underneath them is sound.

## 6. Preview a production build locally

```bash
npm run preview
```

## 7. GitHub Pages deployment

`vite.config.ts` sets `base` to `/motion-analysis-system/` — change this (or
override at build time) to match your actual repository name:

```bash
VITE_BASE=/your-repo-name/ npm run build
```

Then publish `dist/` to the `gh-pages` branch, e.g. with the
[`gh-pages`](https://www.npmjs.com/package/gh-pages) package:

```bash
npm install -D gh-pages
npx gh-pages -d dist
```

or via a GitHub Actions workflow that runs `npm ci && npm run build` and
deploys the `dist/` folder with `actions/deploy-pages`.

## 8. Project structure

```
├── index.html                 all 12 sections' static markup + CDN tags
├── vite.config.ts             GitHub Pages base-path config
├── src/
│   ├── main.ts                boots every section (build + wire GSAP)
│   ├── data/
│   │   ├── sports.ts           per-photo keypoints, trajectories, HUD stats
│   │   ├── mathematics.ts      the report's five equations + captions
│   │   └── projectFiles.ts     the file-card content for /files
│   ├── animations/
│   │   ├── overlay.ts          biomechanics overlay builder + angle/path math
│   │   └── scrollAnimations.ts pinned scenes, transitions, Data Thread, nav
│   └── styles/
│       └── main.css            design tokens + every component's styles
└── public/
    └── assets/project-files/   supplied PDFs/PNGs + the six athlete photos
```

## 9. Sport sequence and athlete images

The scroll sequence is:

**SWIMMING → RUNNING → BADMINTON → BASKETBALL → FOOTBALL → TENNIS**

| Scene | Image file | Data Thread means |
|---|---|---|
| Swimming | `SWIMMING.jpg` | arm trajectory |
| Running | `RUNNING.jpg` | foot trajectory |
| Badminton | `BADMINTON.jpg` | racket trajectory |
| Basketball | `BASKETBALL.jpg` | ball trajectory |
| Football | `FOOTBALL.jpg` | foot / ball trajectory |
| Tennis | `TENNIS.jpg` | racket trajectory |

`RUNNING.jpg` is reused as the athlete for the hero and for the four
explanatory sections (the question, computer vision, mathematics,
kinematics) so the same body carries the argument before the sport
sequence begins.

### Image rights — read before publishing

These six photographs appear to be professional sports photography of
identifiable athletes. Using them in a coursework submission is one thing;
publishing them on a public GitHub Pages site is another, and neither
copyright in the photograph nor the athletes' publicity rights are cleared
by this repository.

Before you publish:

1. Check your university's policy on third-party images in student work.
2. Fill in the `credit` field for each sport in `src/data/sports.ts` — it is
   already wired up and renders in the corner of that sport's scene.
3. If you cannot establish the source, consider swapping in properly
   licensed images (Unsplash, Pexels, Wikimedia Commons with attribution).
   Only the `image` path and the `pose` percentages in `sports.ts` need to
   change; every other part of the system follows automatically.

A visible note to this effect also appears at the bottom of the Project
Archive section on the site itself — remove it once rights are settled.

## 10. Project files / research materials

Every file supplied with this project is copied into
`public/assets/project-files/` and served from the site's **Project Files**
section with its original filename shown on the card:

| Card | Original filename | Type |
|---|---|---|
| The Research Report (primary) | `Application_of_Mathematics_in_Movement_Analysis_Systems_for_Sports_Science.pdf` | PDF |
| The Performance Dossier | `1_The_Performance_Dossier.pdf` | PDF |
| The Digital Athlete | `2_The_Digital_Athlete.pdf` | PDF |
| Concept Map — Sports Science | `Mermaid_Flow1.png` | PNG |
| System Flow — Motion Analysis Ecosystem | `Mermaid_Flow2.png` | PNG |
| Desmos Plot — Position Model | `desmos-graph1.png` | PNG |
| Desmos Plot — Trajectory Comparison | `desmos-graph2.png` | PNG |
| Reference Visual — Kinematics Dashboard | `วิทยาศาสตร์การกีฬา1.jpg` | JPG |
| Reference Visual — Biomechanical Analysis | `วิทยาศาสตร์การกีฬา2.jpg` | JPG |

The two dossier PDFs are large (~15–16 MB each); GitHub's per-file limit is
100 MB so they will push fine, but if you'd rather keep the repository
light, consider Git LFS for the `public/assets/project-files/*.pdf` files.

## 11. Scroll performance

The scroll engine was tuned in a dedicated pass. What changed:

**Latency.** Every scroll-driven trigger now uses `scrub: true` instead of
`scrub: 0.6-0.7`. The numeric form adds that many seconds of catch-up
easing, which is exactly the "animation chasing the scrollbar" feeling.
With `true` the timeline position is the scroll position.

**Per-frame work.** The old callbacks called `getTotalLength()` on three
graph paths and `getPointAtLength()` nine times for the motion trail *on
every tick, in every scene*. All of it is now measured once at build time:
path lengths are cached, and each trajectory is pre-sampled into a flat
`Float64Array` the trail indexes into. `stroke-dasharray` is set once; only
`stroke-dashoffset` changes during scroll.

**Write volume.** Style writes go through a dirty-check that skips the
write when the value hasn't moved visibly, and transforms use
`gsap.quickSetter` rather than rebuilt CSS strings. Simulating a full scrub
of one sport scene at 600 ticks:

| | before | after |
|---|---|---|
| DOM writes | 49,936 | 6,955 (−86%) |
| SVG geometry calls | 4,268 | 0 (−100%) |
| avg writes / tick | 83.2 | 11.6 |

**Trigger count.** ~25 individual reveal triggers became one
`ScrollTrigger.batch`; the parallax layers share one timeline; the pipeline
node reveals folded into the pipeline timeline. `ScrollTrigger.config({
limitCallbacks: true, ignoreMobileResize: true })` stops callbacks firing
more than once per frame and stops mobile toolbar show/hide forcing a full
refresh.

**Refresh.** The old code called `ScrollTrigger.refresh()` on `load` *and*
on a blind 600 ms timeout. Now it refreshes once, when the photographs have
actually finished decoding.

**Filters and images.** Transition blur capped at 6px (was 14px) and
disabled entirely on mobile along with the particle layer and backdrop
blurs. `will-change` is scoped to the handful of layers that genuinely
animate rather than applied broadly. The hero photo is preloaded at high
priority; the rest stay lazy, and each sport preloads only the *next*
sport's photo just before its transition.

### Architecture: one pinned controller

An earlier version gave every sport *and* every transition its own pinned
ScrollTrigger — eleven pins in a row, each with a live scrub callback, all
animating large images, blur, clip-path and SVG. It held up through the
hero and then degraded badly from the Swimming scene onward, because near
every boundary two pinned scenes updated on the same frame while all six
sports' overlays stayed in the render tree.

That is now replaced by a single controller. `#sportsRoot` is one tall
element (1080vh) containing one pinned 100vh viewport; the six sport layers
are stacked inside it, and scroll progress is mapped onto a segment table:

| progress | segment |
|---|---|
| 0.000 – 0.111 | Swimming |
| 0.111 – 0.178 | Swimming → Running |
| 0.178 – 0.289 | Running |
| 0.289 – 0.356 | Running → Badminton |
| 0.356 – 0.467 | Badminton |
| 0.467 – 0.533 | Badminton → Basketball |
| 0.533 – 0.644 | Basketball |
| 0.644 – 0.711 | Basketball → Football |
| 0.711 – 0.822 | Football |
| 0.822 – 0.889 | Football → Tennis |
| 0.889 – 1.000 | Tennis |

Exactly one segment is live per frame, and inactive layers are
`display: none` — out of layout, paint and compositing entirely. Per-frame
cost no longer grows with the number of sports.

| | before | after |
|---|---|---|
| pinned ScrollTriggers | 11 | 1 (−91%) |
| total ScrollTrigger instances | 52 | 13 (−75%) |
| `<img>` elements in the document | 16 | 6 (−63%) |
| overlay SVG nodes rendered | 324 | 108 (−67%) |
| scenes updating per frame | 2 | 1 |

Other changes in the same pass:

- **clip-path removed** from the transition entirely. Images now cross on
  `transform` + `opacity` only (out: scale 1.16→1.20, fade out; in: scale
  1.10→1.06, fade in).
- **Blur is a CSS class**, toggled once at the midpoint of a hand-off and
  capped at 5px, instead of a `style.filter` string rebuilt every frame.
- **Particles** cut to 10, transform/opacity only, and disabled on mobile.
- **Data Thread** folded into the same controller rather than owning a
  second competing global ScrollTrigger.
- **Nav tracking** for sports is driven by the controller (the sport
  sections no longer exist as independently scrolling elements); 1px
  anchors inside the container keep the menu's jump links working.
- **Preloading**: Running and Swimming are `<link rel="preload">`ed in the
  head; each sport pulls in the next one's photo as it becomes active, so
  no large JPEG decodes at the moment a transition starts.

## 12. Accessibility & performance notes

- Respects `prefers-reduced-motion` (text/card reveals skip straight to
  visible; scroll-scrubbed skeleton morphs remain, since they are a direct
  response to the user's own scrolling rather than autoplay).
- All interactive controls (nav menu, time slider) are keyboard-reachable.
- Every SVG rig is built from ~13 circles + 14 lines — cheap to redraw every
  frame, no large particle systems, no heavy blur filters.
- Mobile: sections stack to a single column, the hero skeleton moves inline
  above the headline, and the file grid drops to one/two columns.
