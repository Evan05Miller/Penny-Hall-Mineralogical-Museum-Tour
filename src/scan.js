// Sweep poses from the room scan, converted to a Y-up floor plan.
// x runs the length of the gallery (entrance is near 0, the far end is near -9).
// z runs across the hall.

export const sweeps = [
  {
    id: "s0",
    quaternion: [0, 0, 0, 1],
    x: 0,
    z: 0,
  },
  {
    id: "s1",
    quaternion: [0.000666154, 0.00462967, 0.546986, 0.837129],
    x: -2.95054,
    z: -0.528973,
  },
  {
    id: "s2",
    quaternion: [-0.000417066, 0.00280686, 0.653451, 0.756964],
    x: -6.41833,
    z: -0.960667,
  },
  {
    id: "s3",
    quaternion: [-0.00143023, 0.0125143, 0.999617, 0.0246321],
    x: -8.53176,
    z: -0.917481,
  },
];

export function sweepYaw(quaternion) {
  const [qx, qy, qz, qw] = quaternion;
  return Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
}

// Added to every panorama so the photo lines up with the floor plan.
// Positive values rotate the room counterclockwise when seen from above.
export const SKY_YAW_OFFSET = 0;

// Floor-plan image is 768 by 621. These place world (0, 0) on the entrance sweep.
export const MAP = {
  width: 768,
  height: 621,
  scale: 50,
  originX: 670,
  originY: 492,
};

export const BOUNDS = {
  minX: -10.1,
  maxX: 1.7,
  minZ: -2.35,
  maxZ: 1.45,
};

export const EYE = 1.55;

export function worldToMap(x, z) {
  return [MAP.originX + MAP.scale * x, MAP.originY + MAP.scale * z];
}

export function mapToWorld(u, v) {
  return [(u - MAP.originX) / MAP.scale, (v - MAP.originY) / MAP.scale];
}
