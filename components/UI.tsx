import React from 'react';
import { ParticleConfig, ParticleShape, HandState } from '../types';

interface UIProps {
  config: ParticleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ParticleConfig>>;
  shape: ParticleShape;
  setShape: (s: ParticleShape) => void;
  handState: HandState;
  onEnterDrawMode: () => void;
  cameraError: string | null;
}

const UI: React.FC<UIProps> = ({ 
  config, setConfig, shape, setShape, handState, onEnterDrawMode, cameraError 
}) => {
  
  const shapes = [
    { id: ParticleShape.NEBULA, label: 'Nebula' },
    { id: ParticleShape.SPHERE, label: 'Sphere' },
    { id: ParticleShape.CUBE, label: 'Tesseract' },
    { id: ParticleShape.RING, label: 'Saturn' },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
      {/* Header / Status */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tighter drop-shadow-md">
            GESTURE<span className="text-cyan-400">FLOW</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">MediaPipe x Three.js</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {cameraError ? (
            <div className="px-3 py-1 bg-red-900/80 border border-red-500 text-red-200 text-xs rounded-full">
              {cameraError}
            </div>
          ) : (
            <div className={`px-3 py-1 border text-xs rounded-full flex items-center gap-2 transition-colors duration-300 ${
              handState.isDetected 
                ? 'bg-green-900/80 border-green-500 text-green-200' 
                : 'bg-yellow-900/80 border-yellow-500 text-yellow-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${handState.isDetected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
              {handState.isDetected ? (handState.isPinched ? 'PINCH DETECTED (EXPLODE)' : 'HAND DETECTED (AGGREGATE)') : 'SEARCHING FOR HAND...'}
            </div>
          )}
        </div>
      </div>

      {/* Main Controls - Responsive Layout */}
      <div className="pointer-events-auto bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 w-full sm:w-80 sm:self-end flex flex-col gap-5 shadow-2xl transition-all">
        
        {/* Shape Selectors */}
        <div className="grid grid-cols-2 gap-2">
            {shapes.map((s) => (
              <button
                key={s.id}
                onClick={() => setShape(s.id)}
                className={`py-2 px-3 text-sm rounded-lg border transition-all duration-200 ${
                  shape === s.id 
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                {s.label}
              </button>
            ))}
             <button
                onClick={onEnterDrawMode}
                className={`col-span-2 py-2 px-3 text-sm rounded-lg border transition-all duration-200 ${
                  shape === ParticleShape.CUSTOM
                    ? 'bg-purple-500/20 border-purple-400 text-purple-100 shadow-[0_0_15px_rgba(192,132,252,0.3)]' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                ✐ Draw Custom Shape
              </button>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wide">
              <span>Density</span>
              <span>{Math.round(config.density * 100)}%</span>
            </div>
            <input 
              type="range" min="0.1" max="1.0" step="0.01"
              value={config.density}
              onChange={(e) => setConfig({...config, density: parseFloat(e.target.value)})}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wide">
              <span>Diffusion</span>
              <span>{config.diffusion.toFixed(1)}x</span>
            </div>
            <input 
              type="range" min="0.5" max="3.0" step="0.1"
              value={config.diffusion}
              onChange={(e) => setConfig({...config, diffusion: parseFloat(e.target.value)})}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
          
           <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wide">
              <span>Particle Size</span>
              <span>{config.size.toFixed(1)}</span>
            </div>
            <input 
              type="range" min="2" max="15" step="0.5"
              value={config.size}
              onChange={(e) => setConfig({...config, size: parseFloat(e.target.value)})}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Color Picker */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-sm text-gray-300">Particle Color</span>
          <div className="flex items-center gap-2">
             <input 
                type="color" 
                value={config.color}
                onChange={(e) => setConfig({...config, color: e.target.value})}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
             />
             <span className="text-xs font-mono text-gray-500">{config.color}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UI;
