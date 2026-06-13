import React, { useEffect, useState } from "react";
import { 
  Sparkles, Film, Mic, Music, Download, Share2, Users, Check, 
  Loader2, Lock, Unlock, Settings, HelpCircle, LogOut, RefreshCw, Layers,
  AlertTriangle, ExternalLink
} from "lucide-react";
import { Project, TimelineTrack, ActiveUser } from "./types";
import { 
  auth, db, signInWithGoogle, logOut, handleFirestoreError, OperationType 
} from "./lib/firebase";
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  onSnapshot, deleteDoc, query, where, getDocFromServer 
} from "firebase/firestore";
import { encryptText, decryptText } from "./lib/encryption";

// Sub-components
import CanvasPreview from "./components/CanvasPreview";
import TimelineEditor from "./components/TimelineEditor";
import SidebarGenerative from "./components/SidebarGenerative";
import CollaboratorsPanel from "./components/CollaboratorsPanel";
import GitHubSyncPanel from "./components/GitHubSyncPanel";

export default function App() {
  // Authentication & Session state
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Projects list state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [activeTracks, setActiveTracks] = useState<TimelineTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // E2EE credentials
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [passcode, setPasscode] = useState("TrendyTechie-Personal-Secret-Key-2026");
  const [decryptedPrompts, setDecryptedPrompts] = useState<{ [trackId: string]: string }>({});

  // Timeline player state
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Collaboration State
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([
    { userId: "sandbox_me", displayName: "You", email: "saikumar131631@gmail.com", role: "owner", online: true },
    { userId: "mock_collab_1", displayName: "Alice Workspace", email: "alice@lightricks.com", role: "editor", online: true },
    { userId: "mock_collab_2", displayName: "Bob Supervisor", email: "bob@lightricks.com", role: "viewer", online: false }
  ]);

  // Loading indicator states
  const [isSyncing, setIsSyncing] = useState(false);
  const [voiceoverLoading, setVoiceoverLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const [renderedVideoFormat, setRenderedVideoFormat] = useState<string | null>(null);

  // Test connection to Firestore on initial boot (Mandatory validation constraint)
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
        setFirebaseConnected(true);
        console.log("Firebase Connection verified successfully.");
      } catch (error: any) {
        setFirebaseConnected(false);
        console.warn("Firestore running in partitioned/offline mode:", error.message || error);
      }
    }
    testConnection();
  }, []);

  // Sync authentication states
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsSandboxMode(false);
        // Load user's real profile or default
        const currentEmail = currentUser.email || "saikumar131631@gmail.com";
        setActiveUsers([
          { userId: currentUser.uid, displayName: currentUser.displayName || "Author", email: currentEmail, role: "owner", online: true },
          { userId: "mock_collab_1", displayName: "Alice Workspace", email: "alice@lightricks.com", role: "editor", online: true },
          { userId: "mock_collab_2", displayName: "Bob Supervisor", email: "bob@lightricks.com", role: "viewer", online: false }
        ]);
      } else {
        setUser(null);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Project definitions syncing (Firestore + Offline Fallback)
  useEffect(() => {
    if (isSandboxMode) {
      loadSandboxData();
      return;
    }
    if (!user) return;

    setIsSyncing(true);
    const projQuery = query(
      collection(db, "projects"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(projQuery, (snapshot) => {
      const projs: Project[] = [];
      snapshot.forEach((doc) => {
        projs.push(doc.data() as Project);
      });

      setProjects(projs);
      if (projs.length > 0) {
        // If no active project, select first
        if (!currentProject) {
          setCurrentProject(projs[0]);
        }
      } else {
        // Create initial project if empty
        createInitialProject();
      }
      setIsSyncing(false);
    }, (error) => {
      // Graceful Firestore Error handling
      handleFirestoreError(error, OperationType.LIST, "projects");
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [user, isSandboxMode]);

  // Tracks subcollection syncing of active project
  useEffect(() => {
    if (!currentProject) return;

    if (isSandboxMode) {
      saveSandboxTracks();
      return;
    }

    setIsSyncing(true);
    const tracksPath = `projects/${currentProject.projectId}/tracks`;
    const tracksQuery = collection(db, tracksPath);

    const unsubscribe = onSnapshot(tracksQuery, (snapshot) => {
      const tracks: TimelineTrack[] = [];
      snapshot.forEach((doc) => {
        tracks.push(doc.data() as TimelineTrack);
      });
      // Sort tracks chronologically
      tracks.sort((a, b) => a.startTime - b.startTime);
      setActiveTracks(tracks);
      setIsSyncing(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, tracksPath);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [currentProject, isSandboxMode]);

  // Handle local cryptographic decryption anytime tracks or passcode changes (E2EE execution)
  useEffect(() => {
    const decryptAll = async () => {
      const decrypted: { [trackId: string]: string } = {};
      for (const track of activeTracks) {
        const textToDecrypt = track.prompt || track.script || "";
        if (textToDecrypt.startsWith("E2EE::")) {
          const dec = await decryptText(textToDecrypt, passcode);
          decrypted[track.trackId] = dec;
        } else {
          decrypted[track.trackId] = textToDecrypt;
        }
      }
      setDecryptedPrompts(decrypted);
    };
    decryptAll();
  }, [activeTracks, passcode]);

  // Fallback sandbox generator
  const loadSandboxData = () => {
    const localProjects = localStorage.getItem("LTX_SANDBOX_PROJECTS");
    if (localProjects) {
      const parsed = JSON.parse(localProjects);
      setProjects(parsed);
      setCurrentProject(parsed[0]);
    } else {
      const initialProj: Project = {
        projectId: "sandbox_project_101",
        name: "Neon Metropolis - Cinematic Shot",
        description: "A custom personal-built cinematic timeline rendering futuristic video motion vibes.",
        aspectRatio: "16:9",
        duration: 8,
        ownerId: "sandbox_me",
        collaboratorIds: ["mock_collab_1"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        encrypted: true
      };
      setProjects([initialProj]);
      setCurrentProject(initialProj);
      localStorage.setItem("LTX_SANDBOX_PROJECTS", JSON.stringify([initialProj]));
    }

    const localTracks = localStorage.getItem("LTX_SANDBOX_TRACKS_sandbox_project_101");
    if (localTracks) {
      setActiveTracks(JSON.parse(localTracks));
    } else {
      const initialTracks: TimelineTrack[] = [
        {
          trackId: "sandbox_v1",
          projectId: "sandbox_project_101",
          type: "video",
          startTime: 0,
          duration: 4,
          prompt: "cinematic orbital shot of sunset hitting the cyber-metropolis towering alleys, glowing holographic symbols",
          createdAt: new Date().toISOString()
        },
        {
          trackId: "sandbox_v2",
          projectId: "sandbox_project_101",
          type: "video",
          startTime: 4,
          duration: 4,
          prompt: "close up shot of cyberpunk terminal flashing neon blue diagnostic commands, slow camera dolly in",
          createdAt: new Date().toISOString()
        },
        {
          trackId: "sandbox_a1",
          projectId: "sandbox_project_101",
          type: "text",
          startTime: 0,
          duration: 4,
          prompt: "THE INGRESS BEGINGS...",
          createdAt: new Date().toISOString()
        },
        {
          trackId: "sandbox_a2",
          projectId: "sandbox_project_101",
          type: "text",
          startTime: 4,
          duration: 4,
          prompt: "DOWNLOADING COMPILATION KEYWORDS",
          createdAt: new Date().toISOString()
        }
      ];
      setActiveTracks(initialTracks);
      localStorage.setItem("LTX_SANDBOX_TRACKS_sandbox_project_101", JSON.stringify(initialTracks));
    }
  };

  const saveSandboxTracks = () => {
    if (!currentProject) return;
    localStorage.setItem(`LTX_SANDBOX_TRACKS_${currentProject.projectId}`, JSON.stringify(activeTracks));
  };

  const createInitialProject = async () => {
    if (!user) return;
    const initialProj: Project = {
      projectId: `proj_${Date.now()}`,
      name: "TrendyTechie Debut Project",
      description: "Collaborative interactive timeline editor containing generative tracks.",
      aspectRatio: "16:9",
      duration: 10,
      ownerId: user.uid,
      collaboratorIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      encrypted: true
    };
    try {
      await setDoc(doc(db, "projects", initialProj.projectId), initialProj);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${initialProj.projectId}`);
    }
  };

  // Switch/Create Project Actions
  const handleAddNewProject = async () => {
    const newName = prompt("Enter video project name:");
    if (!newName) return;

    const newProj: Project = {
      projectId: `proj_${Date.now()}`,
      name: newName,
      description: "A secure, collaborative media creation project.",
      aspectRatio: "16:9",
      duration: 12,
      ownerId: user?.uid || "sandbox_me",
      collaboratorIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      encrypted: isEncrypted
    };

    if (isSandboxMode) {
      const updated = [...projects, newProj];
      setProjects(updated);
      setCurrentProject(newProj);
      setActiveTracks([]);
      localStorage.setItem("LTX_SANDBOX_PROJECTS", JSON.stringify(updated));
    } else {
      try {
        await setDoc(doc(db, "projects", newProj.projectId), newProj);
        setCurrentProject(newProj);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `projects/${newProj.projectId}`);
      }
    }
  };

  // Add tracks (Video, voiceover, caption, etc.)
  const handleAddVideoClip = async (promptText: string, duration: number, motionPreset: string, imageUrl?: string) => {
    if (!currentProject) return;

    // Check where to place the item (preferably at the playhead)
    let startTime = playhead;
    if (startTime + duration > currentProject.duration) {
      startTime = Math.max(0, currentProject.duration - duration);
    }

    const securePrompt = isEncrypted 
      ? await encryptText(promptText, passcode)
      : promptText;

    const newTrack: TimelineTrack = {
      trackId: `track_${Date.now()}_video`,
      projectId: currentProject.projectId,
      type: "video",
      startTime,
      duration,
      prompt: securePrompt,
      sourceUrl: imageUrl || "",
      createdAt: new Date().toISOString()
    };

    if (isSandboxMode) {
      const updated = [...activeTracks, newTrack];
      setActiveTracks(updated);
      setSelectedTrackId(newTrack.trackId);
      localStorage.setItem(`LTX_SANDBOX_TRACKS_${currentProject.projectId}`, JSON.stringify(updated));
    } else {
      try {
        const path = `projects/${currentProject.projectId}/tracks/${newTrack.trackId}`;
        await setDoc(doc(db, path), newTrack);
        setSelectedTrackId(newTrack.trackId);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `tracks/${newTrack.trackId}`);
      }
    }
  };

  // Add Voiceover generated via backend TTS endpoint
  const handleAddVoiceoverClip = async (scriptText: string, voiceName: string, startTime: number) => {
    if (!currentProject) return;

    // Calculate synthetic audio duration dynamically (approx 13 chars per second)
    const textSeconds = Math.max(2, Math.ceil(scriptText.length / 13));
    const duration = Math.min(textSeconds, currentProject.duration - startTime);

    if (duration <= 0) {
      alert("Timeline limits exceeded. Modify starting time slider or shorten script.");
      return;
    }

    // Call our server backend TTS proxy
    setVoiceoverLoading(true);
    try {
      const res = await fetch("/api/voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: scriptText, voiceName })
      });
      const data = await res.json();
      
      let finalAudioUrl = "";
      if (data.audio) {
        // Decode raw base64 model output from gemini tts
        const binary = atob(data.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "audio/wav" });
        finalAudioUrl = URL.createObjectURL(blob);
      }

      // Encrypt script if security mode is active
      const secureScript = isEncrypted
        ? await encryptText(scriptText, passcode)
        : scriptText;

      const newTrack: TimelineTrack = {
        trackId: `track_${Date.now()}_vo`,
        projectId: currentProject.projectId,
        type: "voiceover",
        startTime,
        duration,
        prompt: secureScript,
        sourceUrl: finalAudioUrl || "MOCK_VO_WAV",
        voiceName,
        script: secureScript,
        createdAt: new Date().toISOString()
      };

      if (isSandboxMode) {
        const updated = [...activeTracks, newTrack];
        setActiveTracks(updated);
        setSelectedTrackId(newTrack.trackId);
        localStorage.setItem(`LTX_SANDBOX_TRACKS_${currentProject.projectId}`, JSON.stringify(updated));
      } else {
        const path = `projects/${currentProject.projectId}/tracks/${newTrack.trackId}`;
        await setDoc(doc(db, path), newTrack);
        setSelectedTrackId(newTrack.trackId);
      }
    } catch (e) {
      console.error(e);
      alert("Voiceover compilation failed.");
    } finally {
      setVoiceoverLoading(false);
    }
  };

  // Add caption tracks or background loop tracks quickly
  const handleAddQuickClip = async (type: "video" | "voiceover" | "music" | "text") => {
    if (!currentProject) return;
    
    let label = "Procedural music track";
    let len = 4;
    
    if (type === "text") {
      label = "Caption: Enter dialogue here";
      len = 2;
    } else if (type === "video") {
      label = "Macro zoom cinematography of crystal elements reacting, neon volumetric lighting";
      len = 4;
    } else if (type === "voiceover") {
      label = "Narration sequence";
      len = 3;
    }

    let startTime = playhead;
    if (startTime + len > currentProject.duration) {
      startTime = Math.max(0, currentProject.duration - len);
    }

    const secureLabel = isEncrypted 
      ? await encryptText(label, passcode)
      : label;

    const newTrack: TimelineTrack = {
      trackId: `track_${Date.now()}_quick_${type}`,
      projectId: currentProject.projectId,
      type,
      startTime,
      duration: len,
      prompt: secureLabel,
      script: type === "voiceover" ? secureLabel : undefined,
      createdAt: new Date().toISOString()
    };

    if (isSandboxMode) {
      const updated = [...activeTracks, newTrack];
      setActiveTracks(updated);
      setSelectedTrackId(newTrack.trackId);
      localStorage.setItem(`LTX_SANDBOX_TRACKS_${currentProject.projectId}`, JSON.stringify(updated));
    } else {
      try {
        const path = `projects/${currentProject.projectId}/tracks/${newTrack.trackId}`;
        await setDoc(doc(db, path), newTrack);
        setSelectedTrackId(newTrack.trackId);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `tracks/${newTrack.trackId}`);
      }
    }
  };

  // Remove Tracks clip
  const handleRemoveTrack = async (trackId: string) => {
    if (!currentProject) return;
    
    if (isSandboxMode) {
      const updated = activeTracks.filter((t) => t.trackId !== trackId);
      setActiveTracks(updated);
      localStorage.setItem(`LTX_SANDBOX_TRACKS_${currentProject.projectId}`, JSON.stringify(updated));
    } else {
      try {
        const trackPath = `projects/${currentProject.projectId}/tracks/${trackId}`;
        await deleteDoc(doc(db, trackPath));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tracks/${trackId}`);
      }
    }
  };

  // Add collaborators team permissions
  const handleAddCollaborator = async (email: string) => {
    if (!currentProject) return;
    // Add mock collaborator representation (in sandbox or live)
    const newUser: ActiveUser = {
      userId: `user_collab_${Date.now()}`,
      displayName: email.split("@")[0],
      email,
      role: "editor",
      online: true
    };
    setActiveUsers([...activeUsers, newUser]);
    
    // Update collaborator IDs list in project (Firestore sync)
    if (!isSandboxMode && user) {
      try {
        const currentCollabs = currentProject.collaboratorIds || [];
        const updatedIds = [...currentCollabs, newUser.userId];
        await updateDoc(doc(db, "projects", currentProject.projectId), {
          collaboratorIds: updatedIds,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `projects/${currentProject.projectId}`);
      }
    }
  };

  // Trigger automated reports for project analytics (conforming to LLM-grounding requests)
  const handleGenerateReport = async () => {
    if (!currentProject) return;
    setReportLoading(true);
    try {
      const res = await fetch("/api/generate-project-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: currentProject.name,
          tracksCount: activeTracks.length,
          duration: currentProject.duration,
          teamSize: activeUsers.length,
          updatesCount: activeTracks.length + 3,
          encryptStatus: isEncrypted
        })
      });
      const data = await res.json();
      setReportContent(data.report || "No data returned.");
    } catch (e) {
      console.error(e);
      alert("Failed compiling report.");
    } finally {
      setReportLoading(false);
    }
  };

  // Toggle Aspect Ratio layout format (16:9 for YouTube, 9:16 for Tik Tok/Reels)
  const handleAspectRatioChange = async (ratio: "16:9" | "9:16" | "1:1") => {
    if (!currentProject) return;
    const updated = { ...currentProject, aspectRatio: ratio };
    setCurrentProject(updated);

    if (isSandboxMode) {
      const updatedList = projects.map(p => p.projectId === currentProject.projectId ? updated : p);
      setProjects(updatedList);
      localStorage.setItem("LTX_SANDBOX_PROJECTS", JSON.stringify(updatedList));
    } else {
      try {
        await updateDoc(doc(db, "projects", currentProject.projectId), {
          aspectRatio: ratio,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `projects/${currentProject.projectId}`);
      }
    }
  };

  // Toggle duration of overall project timeline
  const handleDurationChange = async (durationSecs: number) => {
    if (!currentProject) return;
    const updated = { ...currentProject, duration: durationSecs };
    setCurrentProject(updated);

    if (isSandboxMode) {
      const updatedList = projects.map(p => p.projectId === currentProject.projectId ? updated : p);
      setProjects(updatedList);
      localStorage.setItem("LTX_SANDBOX_PROJECTS", JSON.stringify(updatedList));
    } else {
      try {
        await updateDoc(doc(db, "projects", currentProject.projectId), {
          duration: durationSecs,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `projects/${currentProject.projectId}`);
      }
    }
  };

  // Export & Social Media format render trigger
  const handleTriggerExport = (format: string) => {
    setRenderedVideoFormat(format);
    setRenderProgress(0);

    // Simulate progress counting up to render 100% video
    const interval = setInterval(() => {
      setRenderProgress((prev) => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30 antialiased selection:text-indigo-200">
      
      {/* Upper Navigation Header Bar */}
      <nav className="border-b border-slate-800 bg-[#1E293B] px-5 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-display font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
              Trendy<span className="text-indigo-400">Techie</span>
              <span className="text-[9px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase font-bold font-mono">
                Studio
              </span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">
              PERSONAL COLLABORATIVE SEQUENCE WORKSPACE
            </span>
          </div>
        </div>

        {/* Sync telemetry, system status indicators */}
        <div className="flex items-center gap-4">
          
          {/* Active project selector */}
          {currentProject && (
            <div className="hidden md:flex items-center gap-2 bg-[#0F172A] border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
              <span className="text-slate-500 hover:text-slate-400">Active Project:</span>
              <span className="text-slate-200 truncate max-w-[150px] font-mono">{currentProject.name}</span>
              <button 
                onClick={handleAddNewProject}
                className="text-indigo-400 hover:text-indigo-300 ml-1.5 transition font-bold"
                title="Create new project"
              >
                + New
              </button>
            </div>
          )}

          {/* User Sign In controls */}
          {authChecked && (
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2.5 bg-[#0F172A] border border-slate-800 px-3 py-1 bg-opacity-40 rounded-xl">
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-xs font-semibold text-slate-300">{user.displayName || "Author"}</span>
                    <span className="text-[8px] text-indigo-400 font-mono tracking-wider mt-0.5">SECURE_SYNC</span>
                  </div>
                  <button
                    onClick={() => logOut()}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : isSandboxMode ? (
                <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-xl">
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-xs font-semibold text-amber-400">Sandbox Mode</span>
                    <span className="text-[8px] text-slate-500 font-mono tracking-wider mt-0.5">LOCAL_ONLY</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsSandboxMode(false);
                      setAuthError(null);
                      signInWithGoogle().catch((err: any) => {
                        console.error("Auth helper catch:", err);
                        setAuthError(err.message || String(err));
                        setIsSandboxMode(true);
                      });
                    }}
                    className="text-[9px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded transition uppercase border border-indigo-500/20"
                  >
                    Connect
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsSandboxMode(true);
                      setAuthError(null);
                    }}
                    className="text-xs font-sans text-slate-300 hover:text-white px-3 py-1 bg-[#1E293B] hover:bg-slate-800 rounded-xl border border-slate-700 transition"
                  >
                    Sandbox Try
                  </button>
                  <button
                    onClick={() => {
                      setAuthError(null);
                      signInWithGoogle().catch((err: any) => {
                        console.error("Auth helper catch:", err);
                        setAuthError(err.message || String(err));
                        setIsSandboxMode(true);
                      });
                    }}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold font-sans px-4.5 py-1.5 rounded-xl shadow-lg shadow-indigo-600/20 border border-indigo-400/20 transition flex items-center gap-1.5"
                  >
                    Google Sync
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Workspace Frame */}
      {currentProject ? (
        <div className="flex-1 flex flex-col xl:grid xl:grid-cols-12 gap-6 p-5 md:p-8 max-w-[1600px] mx-auto w-full">
          
          {/* Main Visual workstation (Col: 1-8) */}
          <main className="xl:col-span-8 flex flex-col gap-6">
            
            {/* Project Quick Meta Settings panel (tablet readable) */}
            <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
                  const n = prompt("Rename Project Title:", currentProject.name);
                  if (n) {
                    const u = { ...currentProject, name: n };
                    setCurrentProject(u);
                    if (isSandboxMode) {
                      const l = projects.map(p => p.projectId === currentProject.projectId ? u : p);
                      setProjects(l);
                      localStorage.setItem("LTX_SANDBOX_PROJECTS", JSON.stringify(l));
                    } else {
                      updateDoc(doc(db, "projects", currentProject.projectId), { name: n });
                    }
                  }
                }}>
                  <h1 className="text-base font-display font-medium text-white tracking-wide">
                    {currentProject.name}
                  </h1>
                  <span className="text-[10px] text-slate-400 italic decoration-dotted underline">Rename</span>
                </div>
                <p className="text-xs text-slate-400 font-sans mt-0.5 max-w-[500px]">
                  {currentProject.description}
                </p>
              </div>

              {/* Layout controls */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Duration */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block font-sans">
                    Limit Duration
                  </span>
                  <select
                    value={currentProject.duration}
                    onChange={(e) => handleDurationChange(Number(e.target.value))}
                    className="bg-[#0F172A] border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={4}>4 Seconds</option>
                    <option value={8}>8 Seconds</option>
                    <option value={12}>12 Seconds</option>
                    <option value={16}>16 Seconds</option>
                    <option value={20}>20 Seconds</option>
                  </select>
                </div>

                {/* Aspect ratio selector */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block font-sans">
                    Aspect Ratio
                  </span>
                  <div className="flex bg-[#0F172A] rounded-lg p-0.5 border border-slate-700">
                    {(["16:9", "9:16", "1:1"] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => handleAspectRatioChange(ratio)}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded transition uppercase font-bold ${
                          currentProject.aspectRatio === ratio
                            ? "bg-slate-800 text-indigo-455 text-indigo-400 shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Live Player with Canvas visual feedback */}
            <CanvasPreview
              tracks={activeTracks}
              duration={currentProject.duration}
              playhead={playhead}
              setPlayhead={setPlayhead}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              aspectRatio={currentProject.aspectRatio}
              passcode={passcode}
              decryptedPrompts={decryptedPrompts}
            />

            {/* Dynamic Interactive Sequencer Timeline */}
            <TimelineEditor
              tracks={activeTracks}
              duration={currentProject.duration}
              playhead={playhead}
              setPlayhead={setPlayhead}
              selectedTrackId={selectedTrackId}
              setSelectedTrackId={setSelectedTrackId}
              onRemoveTrack={handleRemoveTrack}
              onAddQuickClip={handleAddQuickClip}
              passcode={passcode}
              decryptedPrompts={decryptedPrompts}
            />

            {/* Quick social export action row */}
            <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-slate-400 block font-sans">
                  Social Export Suite
                </h4>
                <p className="text-[10px] text-slate-400 font-mono tracking-wide mt-0.5">
                  OPTIMIZE COMPILATION FOR SOCIAL MEDIA CHANNELS
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleTriggerExport("TikTok Reels (9:16)")}
                  className="py-1.5 px-3.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-indigo-400 hover:border-indigo-500 text-[10px] font-semibold rounded-lg transition"
                >
                  Export TikTok (9:16)
                </button>
                <button
                  onClick={() => handleTriggerExport("YouTube HD (16:9)")}
                  className="py-1.5 px-3.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-indigo-400 hover:border-indigo-500 text-[10px] font-semibold rounded-lg transition"
                >
                  Export YouTube (16:9)
                </button>
                <button
                  onClick={() => handleTriggerExport("Instagram Grid (1:1)")}
                  className="py-1.5 px-3.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-indigo-400 hover:border-indigo-500 text-[10px] font-semibold rounded-lg transition"
                >
                  Export Instagram (1:1)
                </button>
              </div>
            </div>
          </main>

          {/* Side Generation & Settings Control Dashboard (Col: 9-12) */}
          <aside className="xl:col-span-4 flex flex-col gap-6">
            
            {/* Generative triggers sidebar */}
            <SidebarGenerative
              onAddVideoClip={handleAddVideoClip}
              onAddVoiceoverClip={handleAddVoiceoverClip}
              timelineDuration={currentProject.duration}
              playhead={playhead}
              voiceoverLoading={voiceoverLoading}
              setVoiceoverLoading={setVoiceoverLoading}
            />

            {/* Collaborative Session, permissions and report telemetry triggers */}
            <CollaboratorsPanel
              project={currentProject}
              activeUsers={activeUsers}
              onAddCollaborator={handleAddCollaborator}
              isEncrypted={isEncrypted}
              setIsEncrypted={setIsEncrypted}
              passcode={passcode}
              setPasscode={setPasscode}
              onGenerateReport={handleGenerateReport}
              reportContent={reportContent}
              reportLoading={reportLoading}
              closeReportModal={() => setReportContent(null)}
              userEmail={user?.email || "saikumar131631@gmail.com"}
            />

            {/* GitHub Exporter Sync & Sandbox publication Panel */}
            <GitHubSyncPanel
              project={currentProject}
              tracks={activeTracks}
            />
          </aside>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
          <h2 className="text-sm font-semibold text-slate-300">Loading TrendyTechie Video Studio</h2>
          <p className="text-[11px] text-slate-500 font-mono mt-1">
            Establishing Web3 cryptographic sync, validating project schemas...
          </p>
        </div>
      )}

      {/* Render export compiling progress modal */}
      {renderProgress !== null && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 selection:bg-indigo-500/30">
          <div className="bg-[#1E293B] border border-slate-750 rounded-2xl max-w-sm w-full p-6 flex flex-col text-center shadow-2xl relative overflow-hidden">
            
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 animate-pulse" />
            
            <Film className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <span className="text-sm font-bold text-slate-200">
              Rendering Video Assembly
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider mt-1 block uppercase">
              Target Profile: {renderedVideoFormat}
            </span>

            {/* Progress indicators */}
            <div className="w-full bg-[#0F172A] p-1.5 rounded-lg border border-slate-800 mt-4 flex items-center justify-between">
              <div className="bg-[#1E293B] rounded h-2.5 flex-1 mr-3 overflow-hidden border border-slate-750">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {renderProgress}%
              </span>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed mt-3 italic font-sans font-medium">
              {renderProgress < 40 
                ? "Aligning audio waveforms and camera pitch vectors..." 
                : renderProgress < 80 
                ? "Compiling client-side AES decryption blocks..." 
                : renderProgress < 100 
                ? "Rendering subtitle overlays & exporting video layers..." 
                : "TrendyTechie Video Render Success!"
              }
            </p>

            {/* Download/Action button */}
            {renderProgress === 100 && (
              <div className="mt-5 flex flex-col gap-2">
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent("MOCK_TRENDY_TECHIE_VIDEO_MEDIA_RENDERED")}`}
                  download={`${currentProject.name.replace(/\s+/g, "_")}_${renderedVideoFormat?.split(" ")[0]}.mp4`}
                  onClick={() => setRenderProgress(null)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition shadow shadow-indigo-500/10 flex items-center justify-center gap-1.5 select-none hover:scale-[1.02] active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Exported Clip
                </a>
                <button
                  onClick={() => setRenderProgress(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-sans font-semibold py-1.5 rounded-lg border border-slate-800 progress transition"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modern Google Authentication Help Overlay */}
      {authError && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 selection:bg-rose-500/30 font-sans">
          <div className="bg-[#1E293B] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 flex flex-col shadow-2xl relative overflow-hidden text-slate-200">
            
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-rose-600 animate-pulse" />
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Auth Window Blocked
              </span>
              <button 
                onClick={() => setAuthError(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono px-2 py-1 bg-slate-900 hover:bg-slate-850 rounded-lg transition"
              >
                ✕ Close
              </button>
            </div>

            <div className="mt-4 text-center">
              <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-100">
                Google Login Interrupted
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-2 text-left bg-slate-900/60 p-3 rounded-lg border border-slate-850 font-mono">
                {authError.includes("popup-closed-by-user") 
                  ? "The login popup window was closed before completing authorization. If you are using Google AI Studio inside a nested, cross-origin iframe preview, cross-site communication constraints or standard popup blocker tools will prevent the connection from returning safely." 
                  : `Firebase Auth encountered an error: ${authError}`}
              </p>
            </div>

            <div className="space-y-3.5 mt-5">
              <div className="bg-indigo-500/10 border border-indigo-500/25 p-3.5 rounded-xl">
                <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 mb-1.5">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-[10px] text-white">1</span>
                  Solution A: Run in dedicated tab (Highly Recommended)
                </h4>
                <p className="text-[10px] text-slate-450 leading-relaxed font-sans font-medium mb-3">
                  Opening the workspace in its own independent tab isolates the security context, allowing standard sign-ins to prompt, authorize, and save safely.
                </p>
                <button
                  onClick={() => {
                    const previewUrl = window.location.href;
                    window.open(previewUrl, "_blank");
                    setAuthError(null);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-[0.98]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Launch Workspace in New Tab
                </button>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-800 text-[10px] text-slate-400">2</span>
                    Solution B: Try Local Sandbox
                  </h4>
                  <p className="text-[9px] text-slate-500 leading-normal font-sans mt-0.5">
                    Work offline immediately without any sign-in blockages using local storage.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsSandboxMode(true);
                    setAuthError(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-750 transition"
                >
                  Offline Sandbox
                </button>
              </div>

              <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                <span>Popup blocker active? Check your search/address bar to allowlist.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
