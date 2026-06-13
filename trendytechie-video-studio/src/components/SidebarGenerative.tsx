import React, { useState } from "react";
import { Sparkles, MessageSquare, Image, Film, Play, Loader2, Music, Mic, HelpCircle } from "lucide-react";

interface SidebarGenerativeProps {
  onAddVideoClip: (prompt: string, duration: number, motionPreset: string, imageUrl?: string) => void;
  onAddVoiceoverClip: (script: string, voiceName: string, startTime: number) => Promise<void>;
  timelineDuration: number;
  playhead: number;
  voiceoverLoading: boolean;
  setVoiceoverLoading: (loading: boolean) => void;
}

export default function SidebarGenerative({
  onAddVideoClip,
  onAddVoiceoverClip,
  timelineDuration,
  playhead,
  voiceoverLoading,
  setVoiceoverLoading
}: SidebarGenerativeProps) {
  const [activeTab, setActiveTab] = useState<"t2v" | "i2v" | "tts">("t2v");
  
  // Text-To-Video states
  const [t2vPrompt, setT2vPrompt] = useState("");
  const [t2vDuration, setT2vDuration] = useState(4);
  const [t2vMotion, setT2vMotion] = useState("Dramatic Orbit");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // Image-To-Video states
  const [i2vPrompt, setI2vPrompt] = useState("");
  const [i2vDuration, setI2vDuration] = useState(4);
  const [i2vBrushIntensity, setI2vBrushIntensity] = useState(65);
  const [selectedPresetImage, setSelectedPresetImage] = useState("");

  const sampleImages = [
    { name: "Cyberpunk Alley", url: "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=500&auto=format&fit=crop&q=80" },
    { name: "Cosmic Nebula", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=500&auto=format&fit=crop&q=80" },
    { name: "Serrated Mountains", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop&q=80" },
    { name: "Deep Jungle", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=500&auto=format&fit=crop&q=80" }
  ];

  // Script-To-Voiceover states
  const [ttsScript, setTtsScript] = useState("");
  const [ttsVoice, setTtsVoice] = useState("Zephyr");
  const [ttsStartTime, setTtsStartTime] = useState(0);

  const handleT2VSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!t2vPrompt.trim()) return;
    setIsGeneratingVideo(true);

    // Simulate AI rendering delays to look elite
    setTimeout(() => {
      onAddVideoClip(t2vPrompt, t2vDuration, t2vMotion);
      setT2vPrompt("");
      setIsGeneratingVideo(false);
    }, 1500);
  };

  const handleI2VSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPresetImage) return;
    setIsGeneratingVideo(true);

    setTimeout(() => {
      onAddVideoClip(
        i2vPrompt || `Dynamic animation of ${sampleImages.find(x => x.url === selectedPresetImage)?.name || "uploaded image"} with brushing`,
        i2vDuration,
        `Brush Motion: Speed ${i2vBrushIntensity}%`,
        selectedPresetImage
      );
      setI2vPrompt("");
      setIsGeneratingVideo(false);
    }, 1500);
  };

  const handleTTSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttsScript.trim()) return;
    setVoiceoverLoading(true);
    try {
      await onAddVoiceoverClip(ttsScript, ttsVoice, ttsStartTime);
      setTtsScript("");
    } catch (e) {
      console.error(e);
    } finally {
      setVoiceoverLoading(false);
    }
  };

  return (
    <div className="bg-[#1E293B] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full font-sans">
      {/* Upper Mode Selector Rails */}
      <div className="grid grid-cols-3 bg-[#0F172A] border-b border-slate-800 p-1 gap-1">
        <button
          onClick={() => setActiveTab("t2v")}
          className={`py-3 px-1 rounded-xl text-xs font-semibold font-display tracking-wider transition flex flex-col items-center gap-1.5 ${
            activeTab === "t2v"
              ? "bg-[#1E293B] text-indigo-400 border border-slate-700/60 shadow"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
          }`}
        >
          <Film className="w-4 h-4" />
          Text to Video
        </button>
        <button
          onClick={() => setActiveTab("i2v")}
          className={`py-3 px-1 rounded-xl text-xs font-semibold font-display tracking-wider transition flex flex-col items-center gap-1.5 ${
            activeTab === "i2v"
              ? "bg-[#1E293B] text-indigo-400 border border-slate-700/60 shadow"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
          }`}
        >
          <Image className="w-4 h-4" />
          Image to Video
        </button>
        <button
          onClick={() => setActiveTab("tts")}
          className={`py-3 px-1 rounded-xl text-xs font-semibold font-display tracking-wider transition flex flex-col items-center gap-1.5 ${
            activeTab === "tts"
              ? "bg-[#1E293B] text-indigo-400 border border-slate-700/60 shadow"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          AI Voiceover
        </button>
      </div>

      {/* Mode Body Form Scaffolds */}
      <div className="p-5 flex-1 overflow-y-auto">
        
        {/* TEXT-TO-VIDEO FORM */}
        {activeTab === "t2v" && (
          <form onSubmit={handleT2VSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs uppercase tracking-widest font-bold text-slate-300 block font-sans">
                TrendyTechie AI Engine
              </h4>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Visual Script Prompt
              </label>
              <textarea
                value={t2vPrompt}
                onChange={(e) => setT2vPrompt(e.target.value)}
                placeholder="orbital high-definition rendering of cinematic sunset hitting the mountain lake, synthwave lighting, highly cinematic, 8k resolution..."
                rows={4}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono focus:border-transparent resize-none leading-relaxed transition"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Duration (Secs)
                </label>
                <select
                  value={t2vDuration}
                  onChange={(e) => setT2vDuration(Number(e.target.value))}
                  className="bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                >
                  <option value={2}>2.0 Seconds</option>
                  <option value={4}>4.0 Seconds</option>
                  <option value={6}>6.0 Seconds</option>
                  <option value={8}>8.0 Seconds</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Camera Motion Mode
                </label>
                <select
                  value={t2vMotion}
                  onChange={(e) => setT2vMotion(e.target.value)}
                  className="bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                >
                  <option value="Dramatic Orbit">Dramatic Orbit</option>
                  <option value="Isometric dolly zoom">Isometric Dolly Zoom</option>
                  <option value="Pan Right">Slow Pan Right</option>
                  <option value="Pedestal Lift">Pedestal Vertical Lift</option>
                  <option value="Explosive Orbit Zoom">Explosive Orbit Zoom</option>
                </select>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isGeneratingVideo || !t2vPrompt.trim()}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-sans font-semibold text-xs py-2.5 rounded-xl transition shadow shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-95"
            >
              {isGeneratingVideo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Compiling Motion Vectors...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Compile Text-to-Video
                </>
              )}
            </button>
          </form>
        )}

        {/* IMAGE-TO-VIDEO FORM */}
        {activeTab === "i2v" && (
          <form onSubmit={handleI2VSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Image className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs uppercase tracking-widest font-bold text-slate-300 block font-sans">
                Seed Frame Animation
              </h4>
            </div>

            {/* Select prebuilt source image */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Choose Starting Seed Image
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {sampleImages.map((img) => (
                  <div
                    key={img.name}
                    onClick={() => setSelectedPresetImage(img.url)}
                    className={`relative rounded-lg overflow-hidden h-14 border cursor-pointer select-none transition ${
                      selectedPresetImage === img.url
                        ? "border-indigo-500 ring-2 ring-indigo-900/60"
                        : "border-slate-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5">
                      <p className="text-[8px] font-sans truncate text-slate-200 font-medium text-center">
                        {img.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Motion Brush prompt */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Guided Motion Description
              </label>
              <input
                type="text"
                value={i2vPrompt}
                onChange={(e) => setI2vPrompt(e.target.value)}
                placeholder="Generate swirling wind, glowing sparks drifting across alley..."
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Duration (Secs)
                </label>
                <select
                  value={i2vDuration}
                  onChange={(e) => setI2vDuration(Number(e.target.value))}
                  className="bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value={2}>2.0 Seconds</option>
                  <option value={4}>4.0 Seconds</option>
                  <option value={6}>6.0 Seconds</option>
                  <option value={8}>8.0 Seconds</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Brush Intensity</span>
                  <span className="font-mono text-indigo-400 font-semibold">{i2vBrushIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={i2vBrushIntensity}
                  onChange={(e) => setI2vBrushIntensity(Number(e.target.value))}
                  className="h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isGeneratingVideo || !selectedPresetImage}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-sans font-semibold text-xs py-2.5 rounded-xl transition shadow shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-40 select-none active:scale-95"
            >
              {isGeneratingVideo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating Keyframe Motion...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Compile Image-to-Video
                </>
              )}
            </button>
          </form>
        )}

        {/* AI SCRIPT TO SYNTHETIC AUDIO VOICE OVER FORM */}
        {activeTab === "tts" && (
          <form onSubmit={handleTTSSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Mic className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs uppercase tracking-widest font-bold text-slate-300 block font-sans">
                AI Voiceover Narrator
              </h4>
            </div>

            {/* Script Text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Voiceover Narrative Script
              </label>
              <textarea
                value={ttsScript}
                onChange={(e) => setTtsScript(e.target.value)}
                placeholder="In a cybernetic timeline of technological singularity, one editor governs the flow..."
                rows={4}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent font-mono resize-none leading-relaxed transition"
                required
              />
            </div>

            {/* Select prebuilt character voices */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Select Actor Voice
                </label>
                <select
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  className="bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none text-sans font-medium"
                >
                  <option value="Zephyr font-medium">Zephyr (Deep, steady)</option>
                  <option value="Kore font-medium">Kore (Warm, bright)</option>
                  <option value="Puck font-medium">Puck (Fast, narrative)</option>
                  <option value="Fenrir font-medium">Fenrir (Gothic, cinematic)</option>
                </select>
              </div>

              {/* Start Time slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Start At</span>
                  <span className="font-mono text-indigo-400 font-semibold">{ttsStartTime.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={timelineDuration}
                  step={0.5}
                  value={ttsStartTime}
                  onChange={(e) => setTtsStartTime(Number(e.target.value))}
                  className="h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={voiceoverLoading || !ttsScript.trim()}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-sans font-semibold text-xs py-2.5 rounded-xl transition shadow shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-40 select-none active:scale-95"
            >
              {voiceoverLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Synthesizing Synthetic Audio...
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  Synthesize Voiceover Track
                </>
              )}
            </button>
            <div className="p-3 bg-[#0F172A] rounded-lg border border-slate-800 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <p className="text-[9px] text-slate-400 font-sans leading-relaxed">
                Connects server-side securely to `gemini-2.5-flash` voice synthesizer to generate professional waveforms from narrative script notes.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
