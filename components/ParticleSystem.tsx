import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleConfig, ParticleShape } from '../types';

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
  interactionRef: React.MutableRefObject<{ handSpreadMod: number }>;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ config, interactionRef }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport, mouse } = useThree();
  
  // Buffers
  const particles = useMemo(() => {
    const count = 20000; // Max buffer size
    const positions = new Float32Array(count * 3);
    const targetPositions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    // Initial random positions
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      sizes[i] = Math.random();
    }
    
    return { positions, targetPositions, sizes, count };
  }, []);

  // Update target positions when config shape/spread changes
  useEffect(() => {
    const { count, targetPositions } = particles;
    const activeCount = Math.min(config.particleCount, count);
    
    for (let i = 0; i < activeCount; i++) {
      const vec = calculateTargetPosition(i, activeCount, config.shape, config.spread);
      targetPositions[i * 3] = vec.x;
      targetPositions[i * 3 + 1] = vec.y;
      targetPositions[i * 3 + 2] = vec.z;
    }
  }, [config.shape, config.spread, config.particleCount, particles]);

  // Animation Loop
  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const targetPositions = particles.targetPositions;
    const activeCount = Math.min(config.particleCount, particles.count);
    
    // Mouse in world space (approximate at z=0 for interaction)
    const mouseX = (mouse.x * viewport.width) / 2;
    const mouseY = (mouse.y * viewport.height) / 2;

    const lerpFactor = 0.05 * config.speed; // Smooth transition speed
    const noiseAmt = config.noiseStrength * 0.02;
    
    // Hand interaction scale
    const handScale = interactionRef.current.handSpreadMod;

    for (let i = 0; i < activeCount; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      // Current pos
      let cx = positions[ix];
      let cy = positions[iy];
      let cz = positions[iz];

      // Target pos (Apply hand scale here)
      const tx = targetPositions[ix] * handScale;
      const ty = targetPositions[iy] * handScale;
      const tz = targetPositions[iz] * handScale;

      // 1. Move towards target shape
      cx += (tx - cx) * lerpFactor;
      cy += (ty - cy) * lerpFactor;
      cz += (tz - cz) * lerpFactor;

      // 2. Add Noise / Motion
      cx += Math.sin(time * config.speed + cy) * noiseAmt;
      cy += Math.cos(time * config.speed + cx) * noiseAmt;
      cz += Math.sin(time * config.speed + cz) * noiseAmt;

      // 3. Mouse Interaction (Repulsion)
      const dx = cx - mouseX;
      const dy = cy - mouseY;
      const distSq = dx*dx + dy*dy; 
      
      if (distSq < config.interactionRadius * config.interactionRadius) {
        const dist = Math.sqrt(distSq);
        const force = (config.interactionRadius - dist) / config.interactionRadius;
        const angle = Math.atan2(dy, dx);
        
        const pushStrength = 0.5; 
        cx += Math.cos(angle) * force * pushStrength;
        cy += Math.sin(angle) * force * pushStrength;
      }

      positions[ix] = cx;
      positions[iy] = cy;
      positions[iz] = cz;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Rotate entire system slowly
    pointsRef.current.rotation.y = time * 0.05 * config.speed;
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