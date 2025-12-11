import React, { useState, useEffect, useRef } from 'react';
import ParticleScene from './components/ParticleScene';
import UI from './components/UI';
import DrawingCanvas from './components/DrawingCanvas';
import { createHandLandmarker, detectHands } from './services/mediaPipeService';
import { ParticleConfig, ParticleShape, HandState } from './types';
import * as THREE from 'three';

const App: React.FC = () => {
  // --- State ---
  const [config, setConfig] = useState<ParticleConfig>({
    density: 0.8,
    diffusion: 1.0,
    color: '#00ffff',
    size: 5.0
  });
  
  const [shape, setShape] = useState<ParticleShape>(ParticleShape.NEBULA);
  const [isDrawing, setIsDrawing] = useState(false);
  const [customPoints, setCustomPoints] = useState<THREE.Vector3[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const [handState, setHandState] = useState<HandState>({
    isDetected: false,
    isPinched: false,
    handPosition: { x: 0, y: 0, z: 0 },
    pinchDistance: 1.0
  });

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(document.createElement("video"));
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);

  // --- MediaPipe Setup ---
  useEffect(() => {
    const initCamera = async () => {
      try {
        const constraints = {
          video: {
            width: 640,
            height: 480,
            facingMode: 'user'
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = videoRef.current;
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true; // Important for mobile

        await new Promise<void>((resolve) => {
          video.onloadeddata = () => {
            video.play();
            resolve();
          };
        });
        
        // Initialize Landmarker
        await createHandLandmarker();
        
        // Start Loop
        animate();
      } catch (err) {
        console.error("Camera/MediaPipe Error:", err);
        setCameraError("Camera access denied or unsupported.");
      }
    };

    initCamera();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Animation Loop for Computer Vision ---
  const animate = () => {
    const video = videoRef.current;
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const result = detectHands(video, performance.now());
      
      if (result && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        
        // 1. Thumb Tip (Index 4) vs Index Tip (Index 8) Distance
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const distance = Math.sqrt(
          Math.pow(thumbTip.x - indexTip.x, 2) +
          Math.pow(thumbTip.y - indexTip.y, 2) +
          Math.pow(thumbTip.z - indexTip.z, 2)
        );
        
        // 2. Hand Centroid (Average of wrist 0 and middle finger mcp 9)
        const wrist = landmarks[0];
        const middle = landmarks[9];
        const centerX = (wrist.x + middle.x) / 2;
        const centerY = (wrist.y + middle.y) / 2;
        
        // Mirror X for intuitive interaction
        const mirroredX = (centerX - 0.5) * -2; // -1 to 1
        const normalizedY = (centerY - 0.5) * -2; // -1 to 1

        const isPinched = distance < 0.08; // Threshold for pinch

        setHandState({
          isDetected: true,
          isPinched,
          handPosition: { x: mirroredX, y: normalizedY, z: 0 },
          pinchDistance: distance
        });
      } else {
        setHandState(prev => ({ ...prev, isDetected: false, isPinched: false }));
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  // --- Drawing Handler ---
  const handlePointsGenerated = (points: THREE.Vector3[]) => {
    setCustomPoints(points);
    setShape(ParticleShape.CUSTOM);
    setIsDrawing(false);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      {/* 3D Scene */}
      <ParticleScene 
        config={config} 
        shape={shape} 
        handState={handState}
        customPoints={customPoints}
      />
      
      {/* UI Overlay */}
      <UI 
        config={config}
        setConfig={setConfig}
        shape={shape}
        setShape={setShape}
        handState={handState}
        onEnterDrawMode={() => setIsDrawing(true)}
        cameraError={cameraError}
      />

      {/* Drawing Overlay */}
      <DrawingCanvas 
        isActive={isDrawing}
        onPointsGenerated={handlePointsGenerated}
        onClose={() => setIsDrawing(false)}
      />

      {/* Hidden Video Element for MediaPipe */}
      {/* We keep it in DOM but hidden/small so MediaPipe can read it */}
      <div className="absolute top-0 left-0 opacity-0 pointer-events-none -z-50">
        <video ref={videoRef} className="w-64 h-48" playsInline muted></video>
      </div>
    </div>
  );
};

export default App;
