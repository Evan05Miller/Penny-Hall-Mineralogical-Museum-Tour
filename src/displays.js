// Each case is aimed from the scan stop where it sits in the middle of the photo.
// yaw/pitch match the in-tour camera: yaw 0 looks toward -z, positive yaw turns toward -x.
//
// To use your own photo, save it as public/displays/<id>.jpg
// (png, jpeg, and webp work too) and reload.

import { EYE, sweeps } from "./scan.js";

function aim(sweepIndex, yaw, pitch, distance) {
  const sweep = sweeps[sweepIndex];
  const cp = Math.cos(pitch);
  return [
    sweep.x + -Math.sin(yaw) * cp * distance,
    EYE + Math.sin(pitch) * distance,
    sweep.z + -Math.cos(yaw) * cp * distance,
  ];
}

const stand = 1.25;

export const displays = [
  {
    id: "case-1",
    title: "Wall Case",
    caption: "Small specimens in the wall case by the entrance.",
    sweep: 0,
    yaw: 0,
    pitch: -0.12,
    position: aim(0, 0, -0.12, stand),
    color: "#b79ad4",
  },
  {
    id: "case-2",
    title: "Mineral Cabinet",
    caption: "The cabinet of larger mineral specimens beside the entrance.",
    sweep: 0,
    yaw: Math.PI,
    pitch: -0.12,
    position: aim(0, Math.PI, -0.12, stand),
    color: "#4eae84",
  },
  {
    id: "case-3",
    title: "Basic Specimens",
    caption: "The long case of basic specimens.",
    sweep: 0,
    yaw: -Math.PI / 2,
    pitch: -0.12,
    position: aim(0, -Math.PI / 2, -0.12, stand),
    color: "#e09a45",
  },
  {
    id: "case-4",
    title: "Irénée du Pont Collection",
    caption: "The wall cases under the Irénée du Pont Collection sign.",
    sweep: 1,
    yaw: 0,
    pitch: -0.08,
    position: aim(1, 0, -0.08, stand),
    color: "#e0c06a",
  },
  {
    id: "case-5",
    title: "Gallery Case",
    caption: "The center cabinet along the main run of cases.",
    sweep: 2,
    yaw: Math.PI,
    pitch: -0.12,
    position: aim(2, Math.PI, -0.12, stand),
    color: "#6aa4d4",
  },
  {
    id: "case-6",
    title: "Crystal Case",
    caption: "The case of colorful crystals beside the large amethyst.",
    sweep: 3,
    yaw: Math.PI,
    pitch: -0.12,
    position: aim(3, Math.PI, -0.12, stand),
    color: "#f0e8dc",
  },
];

export const INTERACT_DISTANCE = 2.1;
