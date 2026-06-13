import React from "react";
import { Plus, Trash2, Clock, Layers, Music, MessageSquare, Video, AlignLeft } from "lucide-react";
import { TimelineTrack } from "../types";

interface TimelineEditorProps {
  tracks: TimelineTrack[];
  duration: number;
  playhead: number;
  setPlayhead: (time: number) => void;
  selectedTrackId: string | null;
  setSelectedTrackId: (id: string | null) => void;
  onRemoveTrack: (id: string) => void;
  onAddQuickClip: (type: "video" | "voiceover" | "music" | "text") => void;
  passcode: string;
  decryptedPrompts: { [trackId: string]: string };
}

export default function TimelineEditor({
  tracks,
  duration,
  playhead,
  setPlayhead,
  selectedTrackId,
  setSelectedTrackId,
  onRemoveTrack,
  onAddQuickClip,
  passcode,
  decryptedPrompts
}: TimelineEditorProps) {
  
  // Custom Timeline Ruler markers based on project duration
  const timelineMarkers = [];
  for (let i = 0; i <= duration; i++) {
    timelineMarkers.push(i);
  }

  // Handle ruler scrubbing click
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newPlayhead = Math.max(0, Math.min(duration, percentage * duration));
    setPlayhead(newPlayhead);
  };

  const trackCategories = [
    { type: "video" as const, label: "MOTION VIDEO LAYER", color: "bg-teal-500", border: "border-teal-400/30", text: "text-teal-400", icon: Video },
    { type: "voiceover" as const, label: "AI VOICEOVER", color: "bg-emerald-500", border: "border-emerald-400/30", text: "text-emerald-400", icon: MessageSquare },
    { type: "music" as const, label: "BACKGROUND SYNTH", color: "bg-fuchsia-500", border: "border-fuchsia-400/30", text: "text-fuchsia-400", icon: Music },
    { type: "text" as const, label: "CAPTIONS HUD", color: "bg-amber-500", border: "border-amber-400/30", text: "text-amber-400", icon: AlignLeft },
  ];

  return (
    <div className="bg-[#1E293B] rounded-2xl border border-slate-800 shadow-xl p-5 flex flex-col gap-4 overflow-hidden select-none font-sans">
      {/* Timeline Editor Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-display font-medium text-white tracking-wider">
              MULTI-TRACK TIMELINE EDITOR
            </h3>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">
              REAL-TIME CLOUD RENDERED SEQUENCER
            </p>
          </div>
        </div>

        {/* Quick add clips for speedy workflows on tablet */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider mr-2 hidden md:inline">
            Quick Insert Track:
          </span>
          {trackCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.type}
                onClick={() => onAddQuickClip(cat.type)}
                className={`py-1 px-3 rounded-lg text-[10px] font-semibold border ${cat.border} ${cat.text} bg-slate-900/60 hover:bg-slate-800 border-slate-800 active:scale-95 transition flex items-center gap-1.5`}
              >
                <Plus className="w-3 h-3" />
                <Icon className="w-3 h-3" />
                {cat.type === "music" ? "Synth" : cat.type === "voiceover" ? "Voice" : cat.type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Sequential Grid Container (Scrub Area + Tracks) */}
      <div className="flex flex-col relative bg-[#0F172A] rounded-xl border border-slate-800/80 p-2 overflow-x-auto min-w-0">
        
        {/* Timeline Ruler Header */}
        <div 
          onClick={handleRulerClick}
          className="h-8 border-b border-slate-800 relative flex items-end pb-1.5 cursor-ew-resize select-none"
          style={{ minWidth: "500px" }}
        >
          {timelineMarkers.map((marker) => {
            const leftPct = (marker / duration) * 100;
            return (
              <React.Fragment key={marker}>
                {/* Visual grid tick mark */}
                <div 
                  className="absolute bottom-0 h-2 w-[1px] bg-slate-700" 
                  style={{ left: `${leftPct}%` }}
                />
                {/* Numeric timestamp text */}
                <span 
                  className="absolute font-mono text-[9px] text-slate-400 select-none -translate-x-1/2 bottom-2"
                  style={{ left: `${leftPct}%` }}
                >
                  {marker}s
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {/* Dynamic Playhead Red Bar Overlay */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-red-600/80 z-20 pointer-events-none shadow"
          style={{ 
            left: `calc(130px + (${playhead / duration} * (100% - 130px - 16px)))`,
            transition: "left 50ms linear"
          }}
        >
          <div className="absolute -top-1 -left-1.5 w-4.5 h-4.5 bg-red-600 rounded-full border border-slate-950 flex items-center justify-center shadow">
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>

        {/* Sequential Tracks Stack */}
        <div className="flex flex-col gap-2 mt-2 w-full" style={{ minWidth: "500px" }}>
          {trackCategories.map((category) => {
            // Find clips matching this category
            const categoryClips = tracks.filter((t) => t.type === category.type);
            const LabelIcon = category.icon;

            return (
              <div key={category.type} className="flex h-12 w-full relative items-center">
                
                {/* Left side fixed category metadata block */}
                <div className="w-[120px] bg-slate-800 border border-slate-700 h-full rounded-lg flex items-center px-2.5 gap-2 z-10 shrink-0">
                  <LabelIcon className={`w-4 h-4 ${category.text}`} />
                  <span className="text-[9px] font-semibold tracking-wider text-slate-200 truncate">
                    {category.label}
                  </span>
                </div>

                {/* Right side track path for clips placement */}
                <div className="flex-1 h-full bg-slate-900/40 rounded-lg relative overflow-hidden border border-slate-800/70 mx-2 flex items-center">
                  
                  {/* Category Guideline rows */}
                  <div className="absolute inset-0 border-y border-slate-900/30 flex flex-col justify-between pointer-events-none">
                    <div className="h-[1px] w-full" />
                    <div className="h-[1px] w-full" />
                  </div>

                  {/* Render track elements */}
                  {categoryClips.map((clip) => {
                    const startPct = (clip.startTime / duration) * 100;
                    const widthPct = (clip.duration / duration) * 100;
                    const isSelected = selectedTrackId === clip.trackId;
                    
                    const clipTitle = clip.type === "video"
                      ? (decryptedPrompts[clip.trackId] || clip.prompt || "Video Clip Prompt")
                      : clip.type === "voiceover"
                      ? (decryptedPrompts[clip.trackId] || clip.script || "Voiceover audio script")
                      : clip.prompt || "Custom Synth Track";

                    return (
                      <div
                        key={clip.trackId}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrackId(isSelected ? null : clip.trackId);
                        }}
                        className={`absolute h-[85%] rounded-lg cursor-pointer px-2 flex items-center justify-between border select-none group transition-all duration-200 ${
                          isSelected
                            ? `bg-slate-800/95 ${category.border} border-2 ring-1 ring-slate-600 w-full`
                            : "bg-slate-855 bg-slate-850/80 border-slate-700 hover:border-slate-600/80 hover:bg-slate-800/85"
                        }`}
                        style={{
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                          zIndex: isSelected ? 15 : 10,
                        }}
                      >
                        {/* Clip details */}
                        <div className="flex items-center gap-1.5 overflow-hidden w-full pr-4">
                          <div className={`w-1.5 h-full rounded-full ${category.color} shrink-0`} />
                          <div className="flex flex-col truncate leading-tight select-none pointer-events-none">
                            <span className="text-[10px] font-semibold text-slate-100 truncate">
                              {clipTitle}
                            </span>
                            <span className="text-[8px] font-mono text-slate-400">
                              {clip.startTime.toFixed(1)}s - {(clip.startTime + clip.duration).toFixed(1)}s
                            </span>
                          </div>
                        </div>

                        {/* Hover elements & quick action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isSelected && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveTrack(clip.trackId);
                                setSelectedTrackId(null);
                              }}
                              className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-950/60"
                              title="Delete Segment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected clip controller HUD */}
      {selectedTrackId && (
        <div className="bg-[#0F172A] p-4 rounded-xl border border-indigo-500/20 shadow-md animate-in fade-in zoom-in duration-300 flex flex-col gap-3">
          {(() => {
            const activeClip = tracks.find((t) => t.trackId === selectedTrackId);
            if (!activeClip) return null;
            
            const titleLabel = decryptedPrompts[activeClip.trackId] || activeClip.prompt || activeClip.script || "Empty text prompt";

            return (
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 rounded">
                      Editing clip {activeClip.trackId.substring(0, 6)} ({activeClip.type})
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 italic">
                    "{titleLabel}"
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-sans text-slate-300 flex items-center gap-1 bg-slate-850 px-2 py-1 rounded border border-slate-700">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Start: {activeClip.startTime.toFixed(1)}s | Duration: {activeClip.duration.toFixed(1)}s
                  </span>
                  <button
                    onClick={() => {
                      onRemoveTrack(activeClip.trackId);
                      setSelectedTrackId(null);
                    }}
                    className="py-1 px-3 bg-[#EF4444]/15 text-rose-400 hover:bg-[#EF4444]/25 rounded-lg text-[10px] font-semibold border border-rose-500/20 transition flex items-center gap-1 select-none"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    Delete Segment
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
