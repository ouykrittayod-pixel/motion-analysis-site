export interface ProjectFile {
  originalName: string;
  assetPath: string; // relative to /public
  type: "PDF" | "PNG" | "JPG";
  title: string;
  description: string;
  primary?: boolean;
}

export const PROJECT_FILES: ProjectFile[] = [
  {
    originalName: "Application_of_Mathematics_in_Movement_Analysis_Systems_for_Sports_Science.pdf",
    assetPath: "assets/project-files/research-report.pdf",
    type: "PDF",
    title: "The Research Report",
    description:
      "The main report: coordinates, distance, vectors, velocity, acceleration, joint angles, and the system architecture behind this website.",
    primary: true,
  },
  {
    originalName: "1_The_Performance_Dossier.pdf",
    assetPath: "assets/project-files/performance-dossier.pdf",
    type: "PDF",
    title: "The Performance Dossier",
    description:
      "Supplementary reference deck on the evolution of sports science, biomechanics, and equipment engineering.",
  },
  {
    originalName: "2_The_Digital_Athlete.pdf",
    assetPath: "assets/project-files/digital-athlete.pdf",
    type: "PDF",
    title: "The Digital Athlete",
    description:
      "Supplementary reference deck on motion capture, computer vision, and AI-driven performance analysis.",
  },
  {
    originalName: "Mermaid_Flow1.png",
    assetPath: "assets/project-files/concept-map.png",
    type: "PNG",
    title: "Concept Map — Sports Science",
    description:
      "A concept map of the disciplines, core branches, and applications that make up sports science.",
  },
  {
    originalName: "Mermaid_Flow2.png",
    assetPath: "assets/project-files/system-flow.png",
    type: "PNG",
    title: "System Flow — Motion Analysis Ecosystem",
    description:
      "The mathematical-model pipeline: from raw motion data through position, velocity, acceleration, and jerk, to sport-specific insight.",
  },
  {
    originalName: "desmos-graph1.png",
    assetPath: "assets/project-files/desmos-graph-1.png",
    type: "PNG",
    title: "Desmos Plot — Position Model",
    description: "A worked graph of a position function used while drafting the report's kinematics section.",
  },
  {
    originalName: "desmos-graph2.png",
    assetPath: "assets/project-files/desmos-graph-2.png",
    type: "PNG",
    title: "Desmos Plot — Trajectory Comparison",
    description:
      "Multiple trajectory curves plotted together, including an annotated anomaly used to illustrate motion-error detection.",
  },
  {
    originalName: "วิทยาศาสตร์การกีฬา1.jpg",
    assetPath: "assets/project-files/sports-science-ref-1.jpg",
    type: "JPG",
    title: "Reference Visual — Kinematics Dashboard",
    description:
      "A visual reference used for design direction: a running-motion dashboard showing kinematics, force, and gait analysis.",
  },
  {
    originalName: "วิทยาศาสตร์การกีฬา2.jpg",
    assetPath: "assets/project-files/sports-science-ref-2.jpg",
    type: "JPG",
    title: "Reference Visual — Biomechanical Analysis",
    description:
      "A visual reference used for design direction: a swimming-motion dashboard showing joint angles and force vectors.",
  },
];
