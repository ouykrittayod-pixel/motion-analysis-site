export interface MathStep {
  id: string;
  labelEn: string;
  labelTh: string;
  latex: string;
  captionTh: string;
  visual: "point" | "distance" | "vector" | "acceleration" | "angle";
}

// Equations preserved from the source report:
// Application_of_Mathematics_in_Movement_Analysis_Systems_for_Sports_Science
export const MATH_STEPS: MathStep[] = [
  {
    id: "position",
    labelEn: "POSITION",
    labelTh: "ตำแหน่ง",
    latex: "P = (x, y)",
    captionTh: "กำหนดตำแหน่งของข้อต่อในร่างกายให้อยู่ในรูปแบบพิกัดสองมิติ",
    visual: "point",
  },
  {
    id: "distance",
    labelEn: "DISTANCE",
    labelTh: "ระยะห่างระหว่างจุด",
    latex: "d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}",
    captionTh: "คำนวณระยะห่างระหว่างข้อต่อสองจุด เช่น สะโพกกับข้อเท้า",
    visual: "distance",
  },
  {
    id: "velocity",
    labelEn: "VELOCITY",
    labelTh: "ความเร็ว",
    latex: "v = \\dfrac{\\Delta x}{\\Delta t}",
    captionTh: "อัตราการเปลี่ยนแปลงของตำแหน่งเมื่อเทียบกับเวลา",
    visual: "vector",
  },
  {
    id: "acceleration",
    labelEn: "ACCELERATION",
    labelTh: "ความเร่ง",
    latex: "a = \\dfrac{\\Delta v}{\\Delta t}",
    captionTh: "อัตราการเปลี่ยนแปลงของความเร็วต่อหน่วยเวลา",
    visual: "acceleration",
  },
  {
    id: "angle",
    labelEn: "JOINT ANGLE",
    labelTh: "มุมของข้อต่อ",
    latex: "\\theta = \\cos^{-1}\\!\\left(\\dfrac{\\vec{BA}\\cdot\\vec{BC}}{|\\vec{BA}||\\vec{BC}|}\\right)",
    captionTh: "คำนวณมุมระหว่างสามจุด เช่น มุมหัวเข่า มุมข้อศอก หรือมุมสะโพก",
    visual: "angle",
  },
];
