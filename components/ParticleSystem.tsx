import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleConfig, ParticleShape } from '../types';

const TRAIL_LENGTH = 3; // 1 Head + 2 Tail segments

// Helper to generate target positions based on shape
const calculateTargetPosition = (
  i: number, 
  count: number, 
  shape: ParticleShape, 
  spread: number
): THREE.Vector3 => {
  const vec = new THREE.Vector3();
  const normalizedIndex = i / count;

  switch (shape) {
    case ParticleShape.CUBE: {
      const side = Math.cbrt(count);
      const x = (i % side) - side / 2;
      const y = (Math.floor(i / side) % side) - side / 2;
      const z = (Math.floor(i / (side * side))) - side / 2;
      vec.set(x, y, z).normalize().multiplyScalar(spread * (Math.random() * 0.5 + 0.5)); 
      // Cube volume approximation
      const r = spread;
      vec.set(
        (Math.random() - 0.5) * 2 * r,
        (Math.random() - 0.5) * 2 * r,
        (Math.random() - 0.5) * 2 * r
      );
      break;
    }
    case ParticleShape.SPIRAL: {
      const angle = normalizedIndex * Math.PI * 20; // 10 turns
      const radius = normalizedIndex * spread;
      vec.set(
        Math.cos(angle) * radius,
        (normalizedIndex - 0.5) * spread * 2,
        Math.sin(angle) * radius
      );
      break;
    }
    case ParticleShape.RING: {
      const angle = normalizedIndex * Math.PI * 2;
      const radius = spread;
      // Add some thickness
      const thickness = (Math.random() - 0.5) * spread * 0.2;
      vec.set(
        Math.cos(angle) * (radius + thickness),
        (Math.random() - 0.5) * spread * 0.2, // Flat-ish
        Math.sin(angle) * (radius + thickness)
      );
      break;
    }
    case ParticleShape.TORUS: {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      const tubeRadius = spread * 0.3;
      const ringRadius = spread;
      vec.set(
        (ringRadius + tubeRadius * Math.cos(v)) * Math.cos(u),
        (ringRadius + tubeRadius * Math.cos(v)) * Math.sin(u),
        tubeRadius * Math.sin(v)
      );
      break;
    }
    case ParticleShape.PLANET: {
      // 80% particles in core, 20% in rings
      const isRing = Math.random() > 0.8;
      
      if (isRing) {
        // Saturn-like Ring
        const angle = Math.random() * Math.PI * 2;
        // Ring starts at 1.4x spread, goes to 2.2x spread
        const dist = spread * (1.4 + Math.random() * 0.8); 
        vec.set(
          Math.cos(angle) * dist,
          (Math.random() - 0.5) * spread * 0.1, // Very flat
          Math.sin(angle) * dist
        );
        // Tilt the ring
        vec.applyAxisAngle(new THREE.Vector3(1, 0, 1).normalize(), Math.PI / 6);
      } else {
        // Solid Core
        const theta = Math.random() * Math.PI * 2;
        const v = Math.random() * 2 - 1;
        const phi = Math.acos(v);
        const r = spread * Math.cbrt(Math.random()); // Uniform sphere volume
        vec.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
      }
      break;
    }
    case ParticleShape.SPHERE:
    default: {
      // Golden spiral sphere distribution for even spread
      const phi = Math.acos(1 - 2 * normalizedIndex);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      const r = spread * Math.cbrt(Math.random()); // Solid sphere
      
      vec.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      break;
    }
  }
  return vec;
};

interface ParticleSystemProps {
  config: ParticleConfig;
  interactionRef: React.MutableRefObject<{ 
    handSpreadMod: number; 
    handX: number;
    handY: number;
  }>;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ config, interactionRef }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport, mouse } = useThree();
  
  // Buffers
  const particles = useMemo(() => {
    // We allocate more buffer but logically use stride of TRAIL_LENGTH
    const maxParticles = 20000;
    const count = maxParticles; 
    const positions = new Float32Array(count * 3);
    const targetPositions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    // Initial random positions
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      
      // Initialize sizes based on trail position
      // Head (i % TRAIL_LENGTH === 0) is full size
      // Tail gets smaller
      const trailIndex = i % TRAIL_LENGTH;
      const sizeFactor = 1.0 - (trailIndex / TRAIL_LENGTH);
      sizes[i] = Math.max(0.1, sizeFactor); 
    }
    
    return { positions, targetPositions, sizes, count };
  }, []);

  // Update target positions when config shape/spread changes
  useEffect(() => {
    const { count, targetPositions } = particles;
    const activeCount = Math.min(config.particleCount, count);
    const headCount = Math.floor(activeCount / TRAIL_LENGTH);
    
    // Calculate targets ONLY for the heads
    for (let i = 0; i < headCount; i++) {
      const vec = calculateTargetPosition(i, headCount, config.shape, config.spread);
      const idx = i * TRAIL_LENGTH;
      
      // Store target for the head
      targetPositions[idx * 3] = vec.x;
      targetPositions[idx * 3 + 1] = vec.y;
      targetPositions[idx * 3 + 2] = vec.z;
    }
  }, [config.shape, config.spread, config.particleCount, particles]);

  // Animation Loop
  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const targetPositions = particles.targetPositions;
    const activeCount = Math.min(config.particleCount, particles.count);
    const headCount = Math.floor(activeCount / TRAIL_LENGTH);

    // Mouse in world space
    const mouseX = (mouse.x * viewport.width) / 2;
    const mouseY = (mouse.y * viewport.height) / 2;

    const lerpFactor = 0.05 * config.speed;
    const noiseAmt = config.noiseStrength * 0.05;
    
    const { handSpreadMod, handX, handY } = interactionRef.current;

    // We iterate by Heads
    for (let i = 0; i < headCount; i++) {
      const headIdx = i * TRAIL_LENGTH;
      
      const ix = headIdx * 3;
      const iy = headIdx * 3 + 1;
      const iz = headIdx * 3 + 2;

      // --- PHYSICS FOR HEAD ---
      let cx = positions[ix];
      let cy = positions[iy];
      let cz = positions[iz];

      // Target pos (Apply hand scale and drift)
      const driftX = handX * 3.0; 
      const driftY = handY * 2.0;

      const tx = targetPositions[ix] * handSpreadMod + driftX;
      const ty = targetPositions[iy] * handSpreadMod + driftY;
      const tz = targetPositions[iz] * handSpreadMod;

      // Move towards target
      cx += (tx - cx) * lerpFactor;
      cy += (ty - cy) * lerpFactor;
      cz += (tz - cz) * lerpFactor;

      // Noise
      cx += Math.sin(time * config.speed + cy) * noiseAmt;
      cy += Math.cos(time * config.speed + cx) * noiseAmt;
      cz += Math.sin(time * config.speed + cz) * noiseAmt;

      // Mouse Interaction
      const dx = cx - mouseX;
      const dy = cy - mouseY;
      const distSq = dx*dx + dy*dy; 
      if (distSq < config.interactionRadius * config.interactionRadius) {
        const dist = Math.sqrt(distSq);
        const force = (config.interactionRadius - dist) / config.interactionRadius;
        const angle = Math.atan2(dy, dx);
        cx += Math.cos(angle) * force * 0.5;
        cy += Math.sin(angle) * force * 0.5;
      }

      // Store previous head position for the first tail segment to grab next frame?
      // Actually, we do the trail update in reverse order *before* updating head?
      // No, we want the tail to be at the *previous* frame's positions.
      // So we update tails using CURRENT (old) positions, then update head.
      
      // Update Tails (Shift down the chain)
      // We iterate backwards from the last tail segment to the first
      for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
        const currentIdx = (headIdx + t) * 3;
        const prevIdx = (headIdx + t - 1) * 3;
        
        positions[currentIdx] = positions[prevIdx];
        positions[currentIdx + 1] = positions[prevIdx + 1];
        positions[currentIdx + 2] = positions[prevIdx + 2];
      }

      // Finally update Head to new position
      positions[ix] = cx;
      positions[iy] = cy;
      positions[iz] = cz;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // --- Rotation Logic ---
    const baseRotY = time * 0.1 * config.speed;
    const maxRot = THREE.MathUtils.degToRad(120);
    const handRotOffsetY = -handX * maxRot; 
    const handRotOffsetX = handY * maxRot;

    const targetY = baseRotY + handRotOffsetY;
    const targetX = handRotOffsetX;

    pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, targetY, 0.1);
    pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, targetX, 0.1);
    pointsRef.current.rotation.z = time * 0.02 * config.speed;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.count}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute 
          attach="attributes-size"
          count={particles.count}
          array={particles.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={config.pointSize}
        color={config.color}
        sizeAttenuation={true}
        transparent={true}
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default ParticleSystem;