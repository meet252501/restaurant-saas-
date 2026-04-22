import { Platform } from 'react-native';

/**
 * Local AI Service Bridge
 * Uses @react-native-ai/mlc to run optimized LLMs on-device.
 * 
 * Recommended Model: Qwen-2-1.5B (Fast and light for mid-range Android)
 */

type ModelStatus = 'not_downloaded' | 'downloading' | 'ready' | 'error';

interface AIResponse {
  text: string;
  source: 'local' | 'cloud' | 'error';
}

class LocalAIService {
  private static instance: LocalAIService;
  private isInitialized = false;
  private status: ModelStatus = 'not_downloaded';
  private progress = 0;

  private constructor() {}

  public static getInstance(): LocalAIService {
    if (!LocalAIService.instance) {
      LocalAIService.instance = new LocalAIService();
    }
    return LocalAIService.instance;
  }

  /**
   * Check if a local model exists and is ready
   */
  async checkModelReady(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    // In production, this would use a native file check via @react-native-ai/mlc
    // For now, we simulate Based on a LocalStorage flag
    return this.status === 'ready';
  }

  /**
   * Mock Download function for POC
   * In a real app, this calls the native downloader
   */
  async downloadModel(onProgress: (p: number) => void): Promise<boolean> {
    this.status = 'downloading';
    for (let i = 0; i <= 100; i += 5) {
      this.progress = i;
      onProgress(i);
      await new Promise(r => setTimeout(r, 200)); // Simulate slow download
    }
    this.status = 'ready';
    return true;
  }

  /**
   * Main Inference Function
   */
  async generateResponse(prompt: string, context: string = ''): Promise<AIResponse> {
    if (this.status !== 'ready') {
      return { text: "Local model not ready. Please download first.", source: 'error' };
    }

    try {
      console.log("[LocalAI] Generating response for:", prompt);
      
      // In a real build, we'd call the MLC engine here:
      // const engine = await MLCLLM.getEngine('qwen-1.5b');
      // const response = await engine.chat(prompt);
      
      // Simulation for the POC
      const simulatedResponses: Record<string, string> = {
        'default': "Based on the local Qwen-1.5B model, I suggest improving your weekend service speed. Typical peak hours for 'Green Apple' are 7-9 PM.",
        'hello': "Hi! I am your offline TableBook assistant. How can I help with your restaurant today?",
        'revenue': "Your revenue is looking stable. I recommend a 10% discount on slow Tuesday afternoons to boost foot traffic."
      };

      const key = Object.keys(simulatedResponses).find(k => prompt.toLowerCase().includes(k)) || 'default';
      
      return { 
        text: simulatedResponses[key], 
        source: 'local' 
      };
    } catch (e) {
      console.error("[LocalAI] Error:", e);
      return { text: "Inference failed. Check device RAM.", source: 'error' };
    }
  }

  getStatus() { return this.status; }
  getProgress() { return this.progress; }
}

export const localAI = LocalAIService.getInstance();
