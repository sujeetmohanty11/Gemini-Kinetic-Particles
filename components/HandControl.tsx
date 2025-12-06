import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Camera, Loader2, Hand } from 'lucide-react';

interface HandControlProps {
  onUpdate: (scaleFactor: number) => void;
  enabled: boolean;
}

const HandControl: React.FC<HandControlProps> = ({ onUpdate, enabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const lastScaleRef = useRef<number>(1.0);

  useEffect(() => {
    if (!enabled) return;

    let isActive = true;

    const setupMediaPipe = async () => {
      try {
        setIsLoading(true);
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        if (!isActive) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        if (!isActive) return;
        landmarkerRef.current = landmarker;

        // Setup Camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240, facingMode: "user" } 
        });
        
        if (!isActive) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            setIsCameraReady(true);
            setIsLoading(false);
            predict();
          };
        }
      } catch (error) {
        console.error("Error initializing hand tracking:", error);
        setIsLoading(false);
      }
    };

    setupMediaPipe();

    return () => {
      isActive = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      landmarkerRef.current?.close();
    };
  }, [enabled]);

  const predict = () => {
    if (!landmarkerRef.current || !videoRef.current || !videoRef.current.videoWidth) return;

    const nowInMs = Date.now();
    const result = landmarkerRef.current.detectForVideo(videoRef.current, nowInMs);

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      
      // Calculate Openness
      // Wrist: 0
      // Middle Finger MCP: 9
      // Tips: 4, 8, 12, 16, 20
      
      // Reference distance: Wrist to Middle Finger MCP (Hand Size)
      const wrist = landmarks[0];
      const middleMCP = landmarks[9];
      const handSize = Math.sqrt(
        Math.pow(middleMCP.x - wrist.x, 2) + 
        Math.pow(middleMCP.y - wrist.y, 2) + 
        Math.pow(middleMCP.z - wrist.z, 2)
      );

      // Average Tip distance from wrist
      const tips = [4, 8, 12, 16, 20];
      let totalTipDist = 0;
      tips.forEach(idx => {
        const tip = landmarks[idx];
        totalTipDist += Math.sqrt(
          Math.pow(tip.x - wrist.x, 2) + 
          Math.pow(tip.y - wrist.y, 2) + 
          Math.pow(tip.z - wrist.z, 2)
        );
      });
      const avgTipDist = totalTipDist / 5;

      // Ratio: Open hand ~ 2.0+, Fist ~ 0.8-1.0
      const ratio = avgTipDist / (handSize || 1);
      
      // Map ratio to scale factor
      // Fist (1.0) -> 0.4x scale
      // Open (2.5) -> 1.8x scale
      const targetScale = Math.max(0.3, Math.min(2.0, (ratio - 0.8) * 0.9 + 0.3));

      // Smooth interpolation
      lastScaleRef.current += (targetScale - lastScaleRef.current) * 0.1;
      
      onUpdate(lastScaleRef.current);
    } else {
      // Return to default if no hand detected
       lastScaleRef.current += (1.0 - lastScaleRef.current) * 0.05;
       onUpdate(lastScaleRef.current);
    }

    requestRef.current = requestAnimationFrame(predict);
  };

  if (!enabled) return null;

  return (
    <div className="absolute bottom-4 left-4 z-50 flex flex-col items-start pointer-events-none">
      <div className="relative overflow-hidden rounded-lg border border-white/20 bg-black/50 backdrop-blur-sm shadow-xl pointer-events-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            <span className="ml-2 text-xs text-gray-300">Loading Vision...</span>
          </div>
        )}
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          muted
          className={`w-48 h-36 object-cover transform -scale-x-100 transition-opacity duration-500 ${isCameraReady ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute bottom-2 left-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-[10px] text-white/80 font-mono uppercase">Live Input</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-white/60 bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
        <span className="font-semibold text-cyan-400">Gesture:</span> Open Palm (Expand) / Fist (Shrink)
      </div>
    </div>
  );
};

export default HandControl;