// Each display sits on a case marked on the floor plan.
// Change `title` to rename that display. Order is 1–18:
// 1–10 run east to west along the south wall, then 11–18 run
// west to east along the north side. Reload the page after saving.

const spots = [
  { title: "", x: 1.12, z: 1.09, sweep: 0 },
  { title: "", x: 0.67, z: 2.31, sweep: 0 },
  { title: "", x: -0.76, z: 1.60, sweep: 0 },
  { title: "", x: -1.98, z: 1.17, sweep: 1 },
  { title: "", x: -3.06, z: 1.11, sweep: 1 },
  { title: "", x: -4.31, z: 1.10, sweep: 1 },
  { title: "", x: -5.48, z: 0.89, sweep: 2 },
  { title: "", x: -6.60, z: 0.90, sweep: 2 },
  { title: "", x: -8.02, z: 1.12, sweep: 3 },
  { title: "", x: -9.62, z: 1.16, sweep: 3 },
  { title: "", x: -9.53, z: -3.67, sweep: 3 },
  { title: "", x: -9.46, z: -0.37, sweep: 3 },
  { title: "", x: -9.39, z: -1.74, sweep: 3 },
  { title: "", x: -4.26, z: -2.45, sweep: 1 },
  { title: "", x: -2.49, z: -2.81, sweep: 1 },
  { title: "", x: -1.10, z: -2.55, sweep: 1 },
  { title: "", x: -0.05, z: -1.31, sweep: 0 },
  { title: "", x: 1.12, z: -0.24, sweep: 0 },
];

const colors = ["#b79ad4", "#4eae84", "#e09a45", "#e0c06a", "#6aa4d4", "#f0e8dc"];

export const displays = spots.map((spot, index) => ({
  id: `case-${index + 1}`,
  title: spot.title,
  caption: "A case in the Penny Hall gallery.",
  sweep: spot.sweep,
  position: [spot.x, 1.28, spot.z],
  color: colors[index % colors.length],
}));

export const INTERACT_DISTANCE = 3.4;
