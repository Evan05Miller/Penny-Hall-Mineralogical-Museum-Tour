// Each display sits on a case marked on the floor plan.
// position is [x, height, z]. The card is aimed from the nearest scan stop.
//
// To use your own photo, save it as public/displays/<id>.jpg
// (png, jpeg, and webp work too) and reload.

const spots = [
  { x: 1.12, z: 1.09, sweep: 0 },
  { x: 0.67, z: 2.31, sweep: 0 },
  { x: -0.76, z: 1.60, sweep: 0 },
  { x: -1.98, z: 1.17, sweep: 1 },
  { x: -3.06, z: 1.11, sweep: 1 },
  { x: -4.31, z: 1.10, sweep: 1 },
  { x: -5.48, z: 0.89, sweep: 2 },
  { x: -6.60, z: 0.90, sweep: 2 },
  { x: -8.02, z: 1.12, sweep: 3 },
  { x: -9.62, z: 1.16, sweep: 3 },
  { x: -9.53, z: -3.67, sweep: 3 },
  { x: -9.46, z: -0.37, sweep: 3 },
  { x: -9.39, z: -1.74, sweep: 3 },
  { x: -4.26, z: -2.45, sweep: 1 },
  { x: -2.49, z: -2.81, sweep: 1 },
  { x: -1.10, z: -2.55, sweep: 1 },
  { x: -0.05, z: -1.31, sweep: 0 },
  { x: 1.12, z: -0.24, sweep: 0 },
];

const colors = ["#b79ad4", "#4eae84", "#e09a45", "#e0c06a", "#6aa4d4", "#f0e8dc"];

export const displays = spots.map((spot, index) => ({
  id: `case-${index + 1}`,
  title: `Display ${index + 1}`,
  caption: "A case in the Penny Hall gallery.",
  sweep: spot.sweep,
  position: [spot.x, 1.28, spot.z],
  color: colors[index % colors.length],
}));

export const INTERACT_DISTANCE = 3.4;
