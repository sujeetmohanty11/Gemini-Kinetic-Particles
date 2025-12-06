import React, { useState, Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import ParticleSystem from './components/ParticleSystem';
import Controls from './components/Controls';
import HandControl from './components/HandControl';
import { DEFAULT_CONFIG, ParticleConfig } from './types';
import { Menu, X } from 'lucide-react';

// Component to handle the initial smooth zoom-in animation
const IntroCamera = () => {
  const { camera } = useThree();
  const finished = useRef(false);

  useFrame((state, delta) => {
    if (finished.current) return;

    // Smoothly interpolate camera position from initial far point to target z=6
    // We use a threshold to stop the animation so the user has full control afterwards
    if (camera.position.z > 6.1) {
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 6, delta * 1.5);
    } else {
      finished.current = true;
    }
  });
  return null;
};

const App: React.FC = () => {
  const [config, setConfig] = useState<ParticleConfig>(DEFAULT_CONFIG);
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [isHandControlActive, setIsHandControlActive] = useState(false);
  
  // Mutable ref to share high-frequency hand data without re-renders
  const interactionRef = useRef({ handSpreadMod: 1.0 });

  const handleHandUpdate = (scaleFactor: number) => {
    interactionRef.current.handSpreadMod = scaleFactor;
  };

  const toggleHandControl = () => {
    setIsHandControlActive(!isHandControlActive);
    // Reset scale when turning off
    if (isHandControlActive) {
      interactionRef.current.handSpreadMod = 1.0;
    }
  };

  return (
    <div className="relative w-full h-full bg-[#050505]">
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 20], fov: 60 }} // Start far away for intro
          dpr={[1, 2]} // Support high-dpi screens
          gl={{ antialias: false, alpha: false }} // Performance optimizations
        >
          <color attach="background" args={['#050505']} />
          <IntroCamera />
          <Suspense fallback={null}>
            <ParticleSystem config={config} interactionRef={interactionRef} />
          </Suspense>
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableDamping={true}
            dampingFactor={0.05}
            minDistance={2} 
            maxDistance={40} 
            autoRotate={false}
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {/* Control Panel Toggle (Mobile friendly) */}
      <button 
        onClick={() => setIsControlsOpen(!isControlsOpen)}
        className="absolute top-4 right-4 z-50 p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors md:hidden"
      >
        {isControlsOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* UI Overlay */}
      <div className={`absolute top-0 right-0 h-full w-full md:w-auto z-40 transition-transform duration-300 ease-in-out transform ${
        isControlsOpen ? 'translate-x-0' : 'translate-x-full'
      } pointer-events-none`}> 
        <div className="pointer-events-auto h-full">
           <Controls 
             config={config} 
             onChange={setConfig} 
             onToggleHandControl={toggleHandControl}
             isHandControlActive={isHandControlActive}
           />
        </div>
      </div>

      {/* Hand Control Component */}
      <HandControl 
        enabled={isHandControlActive}
        onUpdate={handleHandUpdate}
      />

      {/* Intro / Instruction Overlay */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none max-w-sm">
        <h1 className="text-3xl font-black text-white tracking-tighter mb-2 drop-shadow-lg">
          KINETIC<span className="text-cyan-400">AI</span>
        </h1>
        <p className="text-sm text-gray-400 font-light leading-relaxed">
          Interactive particle simulation powered by Gemini. <br />
          <span className="text-white/80">Right-click to pan. Drag to rotate. Scroll to zoom.</span>
        </p>
      </div>
    </div>
  );
};

export default App;