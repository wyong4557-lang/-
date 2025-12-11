import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleConfig, ParticleShape, HandState } from '../types';

// Custom shader for glowing particles
const vertexShader = `
  attribute float size;
  attribute vec3 targetPos;
  varying vec3 vColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uBaseSize;
  
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uBaseSize * uPixelRatio * (30.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  varying vec3 vColor;
  
  void main() {
    // Circular particle with soft edge
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    
    // Glow effect
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);
    
    gl_FragColor = vec4(uColor, glow);
  }
`;

interface ParticlesProps {
  config: ParticleConfig;
  shape: ParticleShape;
  handState: HandState;
  customPoints: THREE.Vector3[];
}

const PARTICLE_COUNT = 15000;

const Particles: React.FC<ParticlesProps> = ({ config, shape, handState, customPoints }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport, size: canvasSize } = useThree();
  
  // Buffers
  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const targets = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const velocities = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const initialPositions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  
  // Uniforms for shader
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uBaseSize: { value: config.size },
    uColor: { value: new THREE.Color(config.color) }
  }), []);

  // Initialize Random Background/Starting positions
  useEffect(() => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 10 - 5;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;
    }
    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  }, [initialPositions, positions]);

  // Update Target Shapes
  useEffect(() => {
    const diffusion = config.diffusion;
    const count = Math.floor(PARTICLE_COUNT * config.density);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let tx = 0, ty = 0, tz = 0;
      
      // If index is outside density range, send to deep space
      if (i > count) {
        tx = (Math.random() - 0.5) * 50;
        ty = (Math.random() - 0.5) * 50;
        tz = (Math.random() - 0.5) * 50;
      } else {
        switch (shape) {
          case ParticleShape.NEBULA:
            const r = Math.random() * 3 * diffusion;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            tx = r * Math.sin(phi) * Math.cos(theta);
            ty = r * Math.sin(phi) * Math.sin(theta);
            tz = r * Math.cos(phi);
            break;
            
          case ParticleShape.SPHERE:
             const u = Math.random();
             const v = Math.random();
             const thetaS = 2 * Math.PI * u;
             const phiS = Math.acos(2 * v - 1);
             const radius = 2.5 * diffusion;
             tx = radius * Math.sin(phiS) * Math.cos(thetaS);
             ty = radius * Math.sin(phiS) * Math.sin(thetaS);
             tz = radius * Math.cos(phiS);
            break;
            
          case ParticleShape.CUBE:
            const side = 4 * diffusion;
            tx = (Math.random() - 0.5) * side;
            ty = (Math.random() - 0.5) * side;
            tz = (Math.random() - 0.5) * side;
            break;
          
          case ParticleShape.RING:
             const rInner = 2 * diffusion;
             const rOuter = 3 * diffusion;
             const angle = Math.random() * Math.PI * 2;
             const rad = rInner + Math.random() * (rOuter - rInner);
             tx = Math.cos(angle) * rad;
             ty = Math.sin(angle) * rad;
             tz = (Math.random() - 0.5) * 0.5;
            break;

          case ParticleShape.CUSTOM:
            if (customPoints.length > 0) {
              const pt = customPoints[i % customPoints.length];
              // Add slight jitter
              tx = pt.x * 5 * diffusion + (Math.random() - 0.5) * 0.2;
              ty = pt.y * 5 * diffusion + (Math.random() - 0.5) * 0.2;
              tz = pt.z + (Math.random() - 0.5) * 0.5;
            } else {
              // Fallback if no drawing
              tx = (Math.random() - 0.5) * 5;
              ty = (Math.random() - 0.5) * 5;
              tz = 0;
            }
            break;
        }
      }
      
      targets[i * 3] = tx;
      targets[i * 3 + 1] = ty;
      targets[i * 3 + 2] = tz;
    }
  }, [shape, config.diffusion, config.density, customPoints, targets]);

  // Animation Loop
  useFrame((state) => {
    if (!pointsRef.current) return;

    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uBaseSize.value = config.size;
    uniforms.uColor.value.set(config.color);

    const posAttr = pointsRef.current.geometry.attributes.position;
    
    // Physics parameters
    const isExploding = handState.isDetected && handState.isPinched;
    const lerpFactor = isExploding ? 0.02 : 0.08; // Slower return, fast explosion handled by velocity
    const explosionForce = 0.5;
    const handX = handState.handPosition.x * viewport.width / 2; // Approximate mapping
    const handY = handState.handPosition.y * viewport.height / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      
      let px = positions[idx];
      let py = positions[idx + 1];
      let pz = positions[idx + 2];
      
      let tx = targets[idx];
      let ty = targets[idx + 1];
      let tz = targets[idx + 2];

      let vx = velocities[idx];
      let vy = velocities[idx + 1];
      let vz = velocities[idx + 2];

      if (isExploding) {
        // Explode outward from center or hand position
        const dx = px - (handState.isDetected ? -handX * 5 : 0); // Inverse X for mirror effect usually
        const dy = py - (handState.isDetected ? -handY * 5 : 0);
        const dz = pz - 0;
        
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.1;
        
        // Add velocity away from center
        vx += (dx / dist) * explosionForce * Math.random();
        vy += (dy / dist) * explosionForce * Math.random();
        vz += (dz / dist) * explosionForce * Math.random();
      } else {
        // Return to shape (Aggregation)
        // Dampen velocity
        vx *= 0.90;
        vy *= 0.90;
        vz *= 0.90;

        // Pull towards target
        px += (tx - px) * lerpFactor;
        py += (ty - py) * lerpFactor;
        pz += (tz - pz) * lerpFactor;
        
        // Add a little noise for "breathing" effect
        px += Math.sin(state.clock.elapsedTime + i) * 0.002;
        py += Math.cos(state.clock.elapsedTime + i) * 0.002;
      }

      // Apply velocity
      px += vx;
      py += vy;
      pz += vz;

      // Update arrays
      positions[idx] = px;
      positions[idx + 1] = py;
      positions[idx + 2] = pz;
      
      velocities[idx] = vx;
      velocities[idx + 1] = vy;
      velocities[idx + 2] = vz;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={PARTICLE_COUNT}
          array={new Float32Array(PARTICLE_COUNT).fill(1.0)} // Variable size could be added
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Background Stars for depth
const StarField = () => {
  const count = 2000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for(let i=0; i<count; i++) {
      pos[i*3] = (Math.random() - 0.5) * 100;
      pos[i*3+1] = (Math.random() - 0.5) * 100;
      pos[i*3+2] = (Math.random() - 0.5) * 50 - 20;
    }
    return pos;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.15} color="#555555" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

const ParticleScene: React.FC<ParticlesProps> = (props) => {
  return (
    <div className="w-full h-full absolute top-0 left-0 -z-10 bg-black">
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={60} />
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.5} />
        
        <Particles {...props} />
        <StarField />
        
        <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.5} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};

export default ParticleScene;
