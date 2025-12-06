export enum ParticleShape {
  SPHERE = 'SPHERE',
  CUBE = 'CUBE',
  SPIRAL = 'SPIRAL',
  RING = 'RING',
  TORUS = 'TORUS',
  PLANET = 'PLANET'
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
  particleCount: 12000,
  color: '#FFD700', // Gold
  shape: ParticleShape.PLANET,
  speed: 0.5,
  spread: 1.5,
  noiseStrength: 0.1,
  interactionRadius: 2.0,
  pointSize: 0.05
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}