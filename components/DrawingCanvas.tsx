import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface DrawingCanvasProps {
  onPointsGenerated: (points: THREE.Vector3[]) => void;
  isActive: boolean;
  onClose: () => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onPointsGenerated, isActive, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const pointsRef = useRef<{x: number, y: number}[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resize canvas to match window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ffff';
    }
  }, [isActive]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    pointsRef.current = []; // Reset points
    
    // Clear canvas
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
    }
    
    draw(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    pointsRef.current.push({ x, y });

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    
    // Convert 2D points to normalized 3D coordinates centered at 0
    if (pointsRef.current.length > 0) {
      const canvas = canvasRef.current;
      const width = canvas ? canvas.width : window.innerWidth;
      const height = canvas ? canvas.height : window.innerHeight;
      
      const newPoints = pointsRef.current.map(p => {
        // Normalize to -1 to 1 range
        const nx = (p.x / width) * 2 - 1;
        const ny = -(p.y / height) * 2 + 1; // Flip Y for 3D coords
        return new THREE.Vector3(nx, ny, 0);
      });
      
      // Resample to get more even distribution if needed, but for now raw is okay
      onPointsGenerated(newPoints);
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in">
      <div className="absolute top-8 text-center pointer-events-none">
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Draw Your Shape</h2>
        <p className="text-gray-300 text-sm">Draw a continuous line. Release to generate particles.</p>
      </div>
      
      <canvas
        ref={canvasRef}
        className="touch-none cursor-crosshair border border-cyan-500/30 rounded-lg bg-black/40"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      
      <button 
        onClick={onClose}
        className="absolute bottom-8 px-8 py-3 bg-red-500/20 border border-red-500 hover:bg-red-500/40 text-white rounded-full transition-all uppercase tracking-wider text-sm font-semibold"
      >
        Close / Cancel
      </button>
    </div>
  );
};

export default DrawingCanvas;
