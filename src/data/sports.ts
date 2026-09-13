// All numeric performance values in this file are ILLUSTRATIVE — they show
// what the mathematics in the report *would* measure from real pose-tracking
// data. They are not measurements taken from the athletes in the photographs.
//
// KEYPOINTS: every joint is stored as a percentage of the photo's own frame
// (x: 0-100 across, y: 0-100 down). All six photos are 1680x944 (16:9), so
// the overlay SVG uses viewBox "0 0 1600 900" with preserveAspectRatio
// "xMidYMid slice" to match the <img>'s object-fit: cover exactly. Joint
// coordinates were estimated by eye from each photograph, so they land on
// the athlete closely but not to the pixel — nudge any value here and the
// whole overlay (skeleton, angles, vectors, trajectory) follows.

export type JointName =
  | "head"
  | "shoulderL"
  | "shoulderR"
  | "elbowL"
  | "elbowR"
  | "wristL"
  | "wristR"
  | "hipL"
  | "hipR"
  | "kneeL"
  | "kneeR"
  | "ankleL"
  | "ankleR";

export type Pose = Record<JointName, [number, number]>;

export const BONES: [JointName, JointName][] = [
  ["head", "shoulderL"],
  ["head", "shoulderR"],
  ["shoulderL", "shoulderR"],
  ["shoulderL", "elbowL"],
  ["elbowL", "wristL"],
  ["shoulderR", "elbowR"],
  ["elbowR", "wristR"],
  ["shoulderL", "hipL"],
  ["shoulderR", "hipR"],
  ["hipL", "hipR"],
  ["hipL", "kneeL"],
  ["kneeL", "ankleL"],
  ["hipR", "kneeR"],
  ["kneeR", "ankleR"],
];

export const JOINT_LABELS: Record<JointName, string> = {
  head: "HEAD",
  shoulderL: "SHOULDER",
  shoulderR: "SHOULDER",
  elbowL: "ELBOW",
  elbowR: "ELBOW",
  wristL: "WRIST",
  wristR: "WRIST",
  hipL: "HIP",
  hipR: "HIP",
  kneeL: "KNEE",
  kneeR: "KNEE",
  ankleL: "ANKLE",
  ankleR: "ANKLE",
};

export interface SportStat {
  label: string;
  value: string;
}

export interface SportDef {
  id: string;
  index: string;
  nameEn: string;
  nameTh: string;
  image: string;
  /** Fill in if you have the photographer / agency credit for this image. */
  credit: string;
  focusTh: string;
  threadLabel: string;
  pose: Pose;
  /** Trajectory curve in the same 0-100 photo space, tracing the moving limb. */
  trajectory: [number, number][];
  /** The featured joint-angle arc: A, B (vertex), C. */
  angleJoints: [JointName, JointName, JointName];
  angleValue: string;
  /** Velocity vector drawn from this joint, as a [dx, dy] in photo-space %. */
  vectorFrom: JointName;
  vector: [number, number];
  stats: SportStat[];
  /** 4 control points (vw%, vh%) for this sport's leg of the page-wide Data Thread. */
  threadShape: [number, number][];
}

export const SPORTS: SportDef[] = [
  {
    id: "swimming",
    index: "05",
    nameEn: "SWIMMING",
    nameTh: "ว่ายน้ำ",
    image: "assets/project-files/SWIMMING.jpg",
    credit: "",
    focusTh: "การหมุนไหล่ · มุมข้อศอก · เส้นทางการดึงแขน · แรงต้านของน้ำ",
    threadLabel: "ARM TRAJECTORY",
    pose: {
      head: [56, 42],
      shoulderL: [45, 40],
      shoulderR: [50, 50],
      elbowL: [28, 29],
      elbowR: [66, 57],
      wristL: [13, 45],
      wristR: [86, 69],
      hipL: [25, 47],
      hipR: [27, 53],
      kneeL: [14, 50],
      kneeR: [15, 56],
      ankleL: [4, 53],
      ankleR: [5, 59],
    },
    trajectory: [
      [13, 45],
      [28, 27],
      [48, 33],
      [62, 52],
    ],
    angleJoints: ["shoulderL", "elbowL", "wristL"],
    angleValue: "129°",
    vectorFrom: "wristL",
    vector: [14, -10],
    stats: [
      { label: "STROKE RATE", value: "62 /min" },
      { label: "ELBOW ANGLE", value: "129°" },
      { label: "ARM VELOCITY", value: "2.2 m/s" },
      { label: "STROKE LENGTH", value: "2.35 m" },
    ],
    threadShape: [
      [4, 55],
      [26, 30],
      [58, 48],
      [96, 62],
    ],
  },
  {
    id: "running",
    index: "06",
    nameEn: "RUNNING",
    nameTh: "การวิ่ง",
    image: "assets/project-files/RUNNING.jpg",
    credit: "",
    focusTh: "ระยะก้าว · ความเร็ว · ความเร่ง · มุมหัวเข่า · เส้นทางการเคลื่อนที่ของเท้า",
    threadLabel: "FOOT TRAJECTORY",
    pose: {
      head: [77, 13],
      shoulderL: [70, 23],
      shoulderR: [73, 22],
      elbowL: [58, 25],
      elbowR: [79, 30],
      wristL: [54, 26],
      wristR: [83, 25],
      hipL: [62, 47],
      hipR: [64, 46],
      kneeL: [52, 62],
      kneeR: [73, 58],
      ankleL: [42, 82],
      ankleR: [71, 75],
    },
    trajectory: [
      [42, 82],
      [54, 70],
      [65, 66],
      [71, 75],
    ],
    angleJoints: ["hipR", "kneeR", "ankleR"],
    angleValue: "115°",
    vectorFrom: "kneeR",
    vector: [12, -6],
    stats: [
      { label: "VELOCITY", value: "6.8 m/s" },
      { label: "STRIDE LENGTH", value: "2.1 m" },
      { label: "KNEE ANGLE", value: "115°" },
      { label: "ACCELERATION", value: "1.4 m/s²" },
    ],
    threadShape: [
      [4, 78],
      [30, 84],
      [62, 60],
      [96, 52],
    ],
  },
  {
    id: "badminton",
    index: "07",
    nameEn: "BADMINTON",
    nameTh: "แบดมินตัน",
    image: "assets/project-files/BADMINTON.jpg",
    credit: "",
    focusTh: "ไหล่ · ข้อศอก · ข้อมือ · เส้นทางแร็กเกต · ความเร็วเชิงมุม",
    threadLabel: "RACKET TRAJECTORY",
    pose: {
      head: [38, 27],
      shoulderL: [32, 37],
      shoulderR: [45, 35],
      elbowL: [28, 36],
      elbowR: [54, 29],
      wristL: [26, 33],
      wristR: [64, 26],
      hipL: [37, 57],
      hipR: [44, 56],
      kneeL: [36, 70],
      kneeR: [45, 72],
      ankleL: [32, 84],
      ankleR: [48, 85],
    },
    trajectory: [
      [26, 33],
      [30, 14],
      [42, 4],
      [55, 3],
    ],
    angleJoints: ["shoulderL", "elbowL", "wristL"],
    angleValue: "148°",
    vectorFrom: "wristL",
    vector: [6, -18],
    stats: [
      { label: "RACKET SPEED", value: "31 m/s" },
      { label: "ELBOW ANGLE", value: "148°" },
      { label: "SHOULDER ROTATION", value: "94°" },
      { label: "REACTION TIME", value: "0.18 s" },
    ],
    threadShape: [
      [4, 60],
      [24, 14],
      [60, 8],
      [96, 34],
    ],
  },
  {
    id: "basketball",
    index: "08",
    nameEn: "BASKETBALL",
    nameTh: "บาสเกตบอล",
    image: "assets/project-files/BASKETBALL.jpg",
    credit: "",
    focusTh: "เส้นทางการกระโดด · มุมหัวเข่า · มุมข้อศอก · ความเร็วของลูกบอล",
    threadLabel: "BALL TRAJECTORY",
    pose: {
      head: [44, 24],
      shoulderL: [42, 27],
      shoulderR: [47, 32],
      elbowL: [36, 20],
      elbowR: [52, 45],
      wristL: [30, 13],
      wristR: [56, 55],
      hipL: [41, 50],
      hipR: [44, 52],
      kneeL: [34, 60],
      kneeR: [38, 68],
      ankleL: [42, 66],
      ankleR: [31, 78],
    },
    trajectory: [
      [30, 13],
      [44, 5],
      [58, 8],
      [66, 22],
    ],
    angleJoints: ["hipL", "kneeL", "ankleL"],
    angleValue: "62°",
    vectorFrom: "wristL",
    vector: [13, -7],
    stats: [
      { label: "JUMP HEIGHT", value: "0.52 m" },
      { label: "RELEASE ANGLE", value: "51°" },
      { label: "KNEE ANGLE", value: "62°" },
      { label: "BALL VELOCITY", value: "7.9 m/s" },
    ],
    threadShape: [
      [4, 72],
      [32, 16],
      [64, 12],
      [96, 50],
    ],
  },
  {
    id: "football",
    index: "09",
    nameEn: "FOOTBALL",
    nameTh: "ฟุตบอล",
    image: "assets/project-files/FOOTBALL.jpg",
    credit: "",
    focusTh: "มุมสะโพก · มุมหัวเข่า · ความเร็วของเท้า · ความเร่งของขา",
    threadLabel: "FOOT / BALL TRAJECTORY",
    pose: {
      head: [50, 13],
      shoulderL: [46, 25],
      shoulderR: [57, 26],
      elbowL: [35, 30],
      elbowR: [63, 45],
      wristL: [28, 30],
      wristR: [68, 57],
      hipL: [51, 52],
      hipR: [54, 53],
      kneeL: [50, 68],
      kneeR: [62, 65],
      ankleL: [52, 85],
      ankleR: [71, 72],
    },
    trajectory: [
      [71, 72],
      [68, 82],
      [64, 88],
      [56, 90],
    ],
    angleJoints: ["hipR", "kneeR", "ankleR"],
    angleValue: "163°",
    vectorFrom: "ankleR",
    vector: [-12, 12],
    stats: [
      { label: "FOOT VELOCITY", value: "24 m/s" },
      { label: "HIP ANGLE", value: "77°" },
      { label: "KNEE ANGLE", value: "163°" },
      { label: "LEG ACCELERATION", value: "18 m/s²" },
    ],
    threadShape: [
      [4, 58],
      [30, 84],
      [66, 80],
      [96, 28],
    ],
  },
  {
    id: "tennis",
    index: "10",
    nameEn: "TENNIS",
    nameTh: "เทนนิส",
    image: "assets/project-files/TENNIS.jpg",
    credit: "",
    focusTh: "การหมุนลำตัว · ไหล่ · ข้อศอก · ข้อมือ · เส้นทางแร็กเกต",
    threadLabel: "RACKET TRAJECTORY",
    pose: {
      head: [47, 12],
      shoulderL: [51, 24],
      shoulderR: [58, 21],
      elbowL: [40, 30],
      elbowR: [67, 15],
      wristL: [33, 35],
      wristR: [76, 10],
      hipL: [60, 44],
      hipR: [63, 46],
      kneeL: [60, 62],
      kneeR: [73, 57],
      ankleL: [57, 88],
      ankleR: [85, 52],
    },
    trajectory: [
      [18, 48],
      [22, 33],
      [33, 27],
      [45, 30],
    ],
    angleJoints: ["shoulderL", "elbowL", "wristL"],
    angleValue: "175°",
    vectorFrom: "wristL",
    vector: [-14, -6],
    stats: [
      { label: "RACKET SPEED", value: "38 m/s" },
      { label: "TRUNK ROTATION", value: "61°" },
      { label: "ELBOW ANGLE", value: "175°" },
      { label: "WRIST SPEED", value: "12 m/s" },
    ],
    threadShape: [
      [4, 50],
      [26, 22],
      [66, 20],
      [96, 44],
    ],
  },
];

export interface TransitionDef {
  fromId: string;
  toId: string;
  line1: string;
  line2: string;
  /** true = spawn drifting particles (used for the swimmer's water spray). */
  particles?: boolean;
}

export const TRANSITIONS: TransitionDef[] = [
  {
    fromId: "swimming",
    toId: "running",
    line1: "WATER BECOMES TRACK.",
    line2: "ARM TRAJECTORY → FOOT TRAJECTORY",
    particles: true,
  },
  {
    fromId: "running",
    toId: "badminton",
    line1: "SAME MATHEMATICS.",
    line2: "DIFFERENT MOVEMENT.",
  },
  {
    fromId: "badminton",
    toId: "basketball",
    line1: "POSITION. ANGLE. VELOCITY.",
    line2: "THE VARIABLES CHANGE. THE MATHEMATICS REMAINS.",
  },
  {
    fromId: "basketball",
    toId: "football",
    line1: "FROM JUMP",
    line2: "TO KICK.",
  },
  {
    fromId: "football",
    toId: "tennis",
    line1: "ONE KINEMATIC CHAIN.",
    line2: "FOOT → HIP → TORSO → SHOULDER → RACKET",
  },
];

/** The photo used as the athlete for the non-sport explanatory sections. */
export const PRIMARY_SPORT = SPORTS[1]; // RUNNING
