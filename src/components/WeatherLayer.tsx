"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const RAIN_COUNT = 4000;
const RAIN_WINDOW = 1200; // Rain box size around camera
const RAIN_HEIGHT = 800; // Rain height range
const FALL_SPEED = 300; // px per second
const WIND_X = 20;

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _scale = new THREE.Vector3(0.15, 6.0, 0.15); // Long thin raindrops

export default function WeatherLayer({ active = true }: { active?: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Initial random positions
  const { positions, speeds } = useMemo(() => {
    const pos = new Float32Array(RAIN_COUNT * 3);
    const spd = new Float32Array(RAIN_COUNT);
    for (let i = 0; i < RAIN_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * RAIN_WINDOW;
      pos[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
      pos[i * 3 + 2] = (Math.random() - 0.5) * RAIN_WINDOW;
      spd[i] = FALL_SPEED * (0.8 + Math.random() * 0.4);
    }
    return { positions: pos, speeds: spd };
  }, []);

  useFrame(({ camera }, delta) => {
    if (!meshRef.current || !active) return;

    const dt = Math.min(delta, 0.1);
    const mesh = meshRef.current;
    const camX = camera.position.x;
    const camZ = camera.position.z;

    for (let i = 0; i < RAIN_COUNT; i++) {
      // Update Y position (falling)
      positions[i * 3 + 1] -= speeds[i] * dt;

      // Horizontal drift
      positions[i * 3] += WIND_X * dt;

      // Wrap around camera window (Horizontal)
      let worldX = positions[i * 3];
      let worldZ = positions[i * 3 + 2];

      // Ensure raindrop is relative to camera but wraps
      const relX =
        ((((worldX - camX + RAIN_WINDOW / 2) % RAIN_WINDOW) + RAIN_WINDOW) % RAIN_WINDOW) -
        RAIN_WINDOW / 2;
      const relZ =
        ((((worldZ - camZ + RAIN_WINDOW / 2) % RAIN_WINDOW) + RAIN_WINDOW) % RAIN_WINDOW) -
        RAIN_WINDOW / 2;

      positions[i * 3] = camX + relX;
      positions[i * 3 + 2] = camZ + relZ;

      // Reset to top if it hits the ground or goes too low
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = RAIN_HEIGHT;
      }

      _position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      _matrix.setPosition(_position);
      _matrix.scale(_scale);
      mesh.setMatrixAt(i, _matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[null as any, null as any, RAIN_COUNT]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#88ccff"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
