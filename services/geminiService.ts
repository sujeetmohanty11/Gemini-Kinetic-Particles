import { GoogleGenAI, Type } from "@google/genai";
import { ParticleConfig, ParticleShape } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateConfigFromPrompt = async (
  prompt: string,
  currentConfig: ParticleConfig
): Promise<Partial<ParticleConfig>> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a JSON configuration for a 3D particle system based on this description: "${prompt}".
      
      Here is the current configuration context (only change what is necessary based on the prompt):
      ${JSON.stringify(currentConfig)}
      
      Interpret abstract concepts creatively. E.g., "Fire" might be orange, high speed, high noise, sphere shape. "Matrix" might be green, cube shape, ordered.
      `,
      config: {
        systemInstruction: "You are a creative coder expert in WebGL and Three.js visual effects.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            color: { type: Type.STRING, description: "Hex color code e.g. #ff0000" },
            particleCount: { type: Type.NUMBER, description: "Number of particles (1000-20000)" },
            speed: { type: Type.NUMBER, description: "Animation speed factor (0.1 - 5.0)" },
            spread: { type: Type.NUMBER, description: "Spatial spread factor (0.5 - 5.0)" },
            noiseStrength: { type: Type.NUMBER, description: "Randomness/turbulence (0.0 - 2.0)" },
            pointSize: { type: Type.NUMBER, description: "Size of individual points (0.01 - 0.2)" },
            shape: { 
              type: Type.STRING, 
              enum: ["SPHERE", "CUBE", "SPIRAL", "RING", "TORUS", "PLANET"],
              description: "The base geometric shape of the cloud"
            },
            interactionRadius: { type: Type.NUMBER, description: "Mouse interaction radius (0.5 - 5.0)" }
          },
          required: ["color", "shape", "speed"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Map string enum back to TypeScript Enum if needed, though direct string match works due to JSON schema
      return data as Partial<ParticleConfig>;
    }
    return {};
  } catch (error) {
    console.error("Failed to generate config:", error);
    throw error;
  }
};