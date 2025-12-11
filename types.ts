export enum ParticleShape {
  NEBULA = 'NEBULA',
  SPHERE = 'SPHERE',
  CUBE = 'CUBE',
  RING = 'RING',
  CUSTOM = 'CUSTOM'
}

export interface ParticleConfig {
  density: number; // 0.1 to 1.0 multiplier
  diffusion: number; // Spread factor
  color: string;
  size: number;
}

export interface HandState {
  isDetected: boolean;
  isPinched: boolean; // True if thumb and index are close
  handPosition: { x: number; y: number; z: number }; // Normalized -1 to 1
  pinchDistance: number;
}
