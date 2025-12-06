import React, { useState } from 'react';
import { ParticleConfig, ParticleShape } from '../types';
import { Sparkles, Activity, Maximize, Wind, Layers, Send, Loader2, MousePointer2, Hand } from 'lucide-react';
import { generateConfigFromPrompt } from '../services/geminiService';

interface ControlsProps {
  config: ParticleConfig;
  onChange: (newConfig: ParticleConfig) => void;
  onToggleHandControl: () => void;
  isHandControlActive: boolean;
}

const Controls: React.FC<ControlsProps> = ({ config, onChange, onToggleHandControl, isHandControlActive }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeminiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      const newParams = await generateConfigFromPrompt(prompt, config);
      onChange({ ...config, ...newParams });
      setPrompt('');
    } catch (err) {
      setError("Failed to generate configuration. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChange = <K extends keyof ParticleConfig>(key: K, value: ParticleConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-96 bg-black/40 backdrop-blur-md border-l border-white/10 p-6 flex flex-col gap-6 overflow-y-auto text-sm transition-transform duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-cyan-400" />
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          Gemini Particles
        </h1>
      </div>

      {/* AI Input Section */}
      <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3 font-semibold">AI Generation</h2>
        <form onSubmit={handleGeminiSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. 'Golden explosion' or 'Slow blue matrix'"
              className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
            <button 
              type="submit" 
              disabled={isGenerating || !prompt}
              className="absolute right-2 top-2 p-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-md text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <p className="text-xs text-gray-500">
            Powered by Gemini 2.5 Flash. Describe any effect, color, or behavior.
          </p>
        </form>
      </div>

      {/* Hand Control Toggle */}
      <div className={`p-4 rounded-xl border transition-all ${isHandControlActive ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-white/5 border-white/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hand className={`w-5 h-5 ${isHandControlActive ? 'text-cyan-400' : 'text-gray-400'}`} />
            <div>
              <h3 className="font-semibold text-gray-200">Hand Gestures</h3>
              <p className="text-xs text-gray-500">Control size with palm</p>
            </div>
          </div>
          <button 
            onClick={onToggleHandControl}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isHandControlActive ? 'bg-cyan-600' : 'bg-gray-700'}`}
          >
             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isHandControlActive ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Manual Controls */}
      <div className="space-y-6">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-semibold border-b border-white/10 pb-2">Manual Controls</h2>
        
        {/* Shape & Color */}
        <div className="space-y-4">
          <div className="space-y-2">
             <label className="flex items-center gap-2 text-gray-300">
               <Layers className="w-4 h-4" /> Shape
             </label>
             <div className="grid grid-cols-3 gap-2">
               {Object.values(ParticleShape).map((shape) => (
                 <button
                  key={shape}
                  onClick={() => handleChange('shape', shape)}
                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    config.shape === shape 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' 
                      : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                  }`}
                 >
                   {shape}
                 </button>
               ))}
             </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-gray-300">
              <span className="w-4 h-4 rounded-full border border-white/20" style={{background: config.color}}></span> 
              Color
            </label>
            <input 
              type="color" 
              value={config.color}
              onChange={(e) => handleChange('color', e.target.value)}
              className="w-full h-8 bg-transparent cursor-pointer rounded overflow-hidden"
            />
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-5">
          <ControlSlider 
            label="Speed" 
            icon={<Activity className="w-4 h-4" />}
            value={config.speed} 
            min={0} max={5} step={0.1}
            onChange={(v) => handleChange('speed', v)}
          />
          <ControlSlider 
            label="Particle Count" 
            icon={<Sparkles className="w-4 h-4" />}
            value={config.particleCount} 
            min={100} max={20000} step={100}
            onChange={(v) => handleChange('particleCount', v)}
          />
          <ControlSlider 
            label="Spread" 
            icon={<Maximize className="w-4 h-4" />}
            value={config.spread} 
            min={0.2} max={5} step={0.1}
            onChange={(v) => handleChange('spread', v)}
          />
          <ControlSlider 
            label="Noise / Turbulence" 
            icon={<Wind className="w-4 h-4" />}
            value={config.noiseStrength} 
            min={0} max={2} step={0.1}
            onChange={(v) => handleChange('noiseStrength', v)}
          />
           <ControlSlider 
            label="Interaction Radius" 
            icon={<MousePointer2 className="w-4 h-4" />}
            value={config.interactionRadius} 
            min={0.1} max={5} step={0.1}
            onChange={(v) => handleChange('interactionRadius', v)}
          />
          <ControlSlider 
            label="Point Size" 
            icon={<div className="w-4 h-4 rounded-full border border-current" />}
            value={config.pointSize} 
            min={0.01} max={0.3} step={0.01}
            onChange={(v) => handleChange('pointSize', v)}
          />
        </div>
      </div>
    </div>
  );
};

const ControlSlider = ({ label, icon, value, min, max, step, onChange }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs">
      <label className="flex items-center gap-2 text-gray-300">
        {icon} {label}
      </label>
      <span className="text-cyan-400 font-mono">{value.toFixed(2)}</span>
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer hover:bg-white/20 accent-cyan-400"
    />
  </div>
);

export default Controls;