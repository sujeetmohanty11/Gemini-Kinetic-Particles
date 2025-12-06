export enum ParticleShape {
  SPHERE = 'SPHERE',
  CUBE = 'CUBE',
  SPIRAL = 'SPIRAL',
  RING = 'RING',
  TORUS = 'TORUS'
}

export interface ParticleConfig {
  particleCount: number;
  color: string;
  shape: ParticleShape;
  speed: number;
  spread: number;
  noiseStrength: number;
  interactionRadius: number;
  pointSize: number;
}

export const DEFAULT_CONFIG: ParticleConfig = {
  particleCount: 8000,
  color: '#00ffff',
  shape: ParticleShape.SPHERE,
  speed: 1.0,
  spread: 1.5,
  noiseStrength: 0.2,
  interactionRadius: 2.0,
  pointSize: 0.05
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
