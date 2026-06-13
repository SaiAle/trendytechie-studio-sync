import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Volume2, VolumeX, Minimize, Maximize, Film } from "lucide-react";
import { TimelineTrack } from "../types";

interface CanvasPreviewProps {
  tracks: TimelineTrack[];
  duration: number;
  playhead: number;
  setPlayhead: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  aspectRatio: "16:9" | "9:16" | "1:1";
  passcode: string;
  decryptedPrompts: { [trackId: string]: string };
}

export default function CanvasPreview({
  tracks,
  duration,
  playhead,
  setPlayhead,
  isPlaying,
  setIsPlaying,
  aspectRatio,
  passcode,
  decryptedPrompts
}: CanvasPreviewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef(playhead);

  // Sync ref to prevent stale closures in timing loop
  useEffect(() => {
    playheadRef.current = playhead;
  }, [playhead]);

  // Timed Playback loop
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) / 1000;
        let nextPlayhead = playheadRef.current + delta;
        if (nextPlayhead >= duration) {
          nextPlayhead = 0; // Loop or stop
          setIsPlaying(false);
        }
        setPlayhead(nextPlayhead);
      }
      lastTime = now;
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, duration, setIsPlaying, setPlayhead]);

  // Determine current active clips
  const activeClips = tracks.filter(
    (track) => playhead >= track.startTime && playhead <= track.startTime + track.duration
  );

  const activeVideoClip = activeClips.find((c) => c.type === "video");
  const activeVoiceoverClip = activeClips.find((c) => c.type === "voiceover");
  const activeCaptionClip = activeClips.find((c) => c.type === "text");

  // Get current prompt/script for active overlay (handling decrypted format)
  const videoPrompt = activeVideoClip
    ? decryptedPrompts[activeVideoClip.trackId] || activeVideoClip.prompt || "Cinematic Generative Video Clip"
    : null;

  const captionText = activeCaptionClip
    ? decryptedPrompts[activeCaptionClip.trackId] || activeCaptionClip.prompt || ""
    : null;

  // Render a beautiful generative simulation based on video prompt
  const getSimulatedThemeStyles = () => {
    if (!videoPrompt) return "bg-zinc-950";
    const promptLower = videoPrompt.toLowerCase();
    if (promptLower.includes("cyber") || promptLower.includes("neon") || promptLower.includes("digital")) {
      return "from-purple-950 via-zinc-950 to-blue-950";
    }
    if (promptLower.includes("fire") || promptLower.includes("sunset") || promptLower.includes("warm") || promptLower.includes("lava")) {
      return "from-amber-950 via-zinc-950 to-red-950";
    }
    if (promptLower.includes("ocean") || promptLower.includes("water") || promptLower.includes("cold") || promptLower.includes("ice")) {
      return "from-sky-950 via-zinc-950 to-teal-950";
    }
    if (promptLower.includes("forest") || promptLower.includes("jungle") || promptLower.includes("nature") || promptLower.includes("green")) {
      return "from-emerald-950 via-zinc-950 to-zinc-900";
    }
    if (promptLower.includes("space") || promptLower.includes("galaxy") || promptLower.includes("cosmic") || promptLower.includes("star")) {
      return "from-indigo-950 via-zinc-950 to-fuchsia-950e";
    }
    return "from-neutral-900 via-zinc-950 to-neutral-950";
  };

  // Simulated Pan/Orbit motion vectors based on visual timeline timing
  const getSimulatedMotionTransform = () => {
    if (!activeVideoClip) return {};
    const elapsed = playhead - activeVideoClip.startTime;
    const progress = elapsed / activeVideoClip.duration;
    
    // Zoom in, pan right, sway subtly
    const scale = 1 + progress * 0.15;
    const rotate = Math.sin(progress * Math.PI) * 1.5;
    const translateX = progress * 20 - 10;
    
    return {
      transform: `scale(${scale}) rotate(${rotate}deg) translateX(${translateX}px)`,
      transition: "transform 100ms linear"
    };
  };

  return (
    <div className="flex flex-col bg-[#1E293B] rounded-2xl border border-slate-800 shadow-xl overflow-hidden font-sans">
      {/* Upper Player Info Header */}
      <div className="px-5 py-3 bg-[#0F172A]/70 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200 font-display tracking-wider">
            GENERATIVE CANVAS PREVIEW
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-mono border border-slate-700">
            {aspectRatio} Format
          </span>
          {activeVideoClip?.sourceUrl && (
            <span className="text-[10px] bg-indigo-950/60 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded font-mono">
              I2V Active
            </span>
          )}
        </div>
      </div>

      {/* Main Screen Ratio Container */}
      <div className="flex-1 bg-[#020617] flex items-center justify-center p-6 min-h-[300px]">
        <div
          ref={containerRef}
          className={`relative rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-gradient-to-tr ${getSimulatedThemeStyles()} transition-colors duration-1000 flex items-center justify-center`}
          style={{
            aspectRatio: aspectRatio === "16:9" ? "16/9" : aspectRatio === "9:16" ? "9/16" : "1/1",
            width: "100%",
            maxWidth: aspectRatio === "9:16" ? "240px" : aspectRatio === "1:1" ? "380px" : "100%",
            maxHeight: "380px",
          }}
        >
          {/* Main Visual Simulator */}
          {activeVideoClip ? (
            <div className="absolute inset-0 w-full h-full flex flex-col justify-between p-4 overflow-hidden">
              {/* Dynamic Simulated Particle Layer */}
              <div 
                className="absolute inset-0 bg-cover bg-center brightness-[0.75]"
                style={{
                  backgroundImage: activeVideoClip.sourceUrl ? `url(${activeVideoClip.sourceUrl})` : "none",
                  ...getSimulatedMotionTransform()
                }}
              />
              
              {/* Dynamic Abstract CSS Procedural Graphics */}
              {!activeVideoClip.sourceUrl && (
                <div 
                  className="absolute inset-0 opacity-40 mix-blend-screen flex items-center justify-center pointer-events-none"
                  style={getSimulatedMotionTransform()}
                >
                  <div className="w-1/2 h-1/2 rounded-full filter blur-xl bg-indigo-500/30 animate-pulse" />
                  <div className="w-1/3 h-1/3 rounded-full filter blur-2xl bg-violet-500/20 absolute translate-x-12 translate-y-8 animate-bounce" />
                </div>
              )}

              {/* Status Header overlay */}
              <div className="relative z-10 flex items-start justify-between">
                <span className="bg-slate-900/90 backdrop-blur text-[9px] text-slate-300 font-mono px-2 py-0.5 rounded uppercase border border-slate-800">
                  Rendering clip {activeVideoClip.trackId.substring(0, 4)} ID
                </span>
                <span className="bg-[#4F46E5]/10 border border-[#4F46E5]/20 text-indigo-400 text-[9px] font-mono px-2 py-0.5 rounded tracking-widest animate-pulse font-bold">
                  ● ACTIVE
                </span>
              </div>

              {/* Central Audio visualization overlay */}
              {activeVoiceoverClip && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center items-center gap-1.5 pointer-events-none z-10">
                  {[1, 2, 3, 4, 1, 2, 3, 4, 1].map((val, idx) => (
                    <div
                      key={idx}
                      className="w-1 bg-indigo-400 rounded-full transition-all duration-100"
                      style={{
                        height: isPlaying ? `${15 + Math.random() * 40}px` : "6px",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Botton Caption Text HUD block */}
              {captionText && (
                <div className="absolute inset-x-4 bottom-4 z-20 flex justify-center">
                  <span className="bg-[#0F172A]/90 text-white font-sans px-4 py-1.5 rounded-lg border border-slate-800 text-center text-xs tracking-wide shadow-lg max-w-[90%] font-medium">
                    {captionText}
                  </span>
                </div>
              )}

              {/* Informational overlay detailing prompt parameters */}
              <div className="relative z-10 bg-slate-900/80 backdrop-blur-md p-2 rounded-lg border border-slate-800 mt-auto max-w-[85%] self-start flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-slate-200 tracking-wide">ACTIVE CLIP PROMPT</span>
                <p className="text-[9px] font-mono text-slate-400 truncate max-w-full">
                  {videoPrompt}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 shadow-inner">
                <Film className="w-5 h-5 text-indigo-400/80" />
              </div>
              <span className="text-xs font-semibold text-slate-300 font-sans tracking-wide">
                No Video Clip playing
              </span>
              <p className="text-[10px] text-slate-500 max-w-[200px] font-mono">
                Drag the playhead or insert a video segment on the timeline track below to play.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Control Console */}
      <div className="p-4 bg-[#0F172A] flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-800">
        {/* Timing Clock */}
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md border border-slate-700">
            {playhead.toFixed(2)}s
          </span>
          <span className="text-slate-600">/</span>
          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700">
            {duration.toFixed(2)}s
          </span>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-3 font-sans">
          <button
            onClick={() => setPlayhead(0)}
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800 rounded-lg hover:bg-slate-750 border border-slate-755 border-slate-700 transition"
            title="Reset"
          >
            <Square className="w-3.5 h-3.5 fill-slate-400 text-slate-400" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-6 py-2 rounded-xl font-sans font-medium text-xs flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition ${
              isPlaying
                ? "bg-rose-600 text-white hover:bg-rose-500"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-white" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                Play Timeline
              </>
            )}
          </button>
        </div>

        {/* Audio Muting */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 rounded-lg transition"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
          </button>
          <div className="w-16 bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isMuted ? "bg-slate-600 w-0" : "bg-indigo-500 w-3/4"}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
