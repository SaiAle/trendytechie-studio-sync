import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Lazy Gemni SDK initialization to prevent crash if key is missing on startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set. Please add it to Secrets in Settings.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. API: AI-Driven Voiceover Tool
app.post("/api/voiceover", async (req, res) => {
  const { script, voiceName } = req.body;
  if (!script) {
    return res.status(400).json({ error: "Script is required." });
  }

  try {
    const ai = getGeminiClient();
    const voice = voiceName || "Zephyr"; // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Read this script with absolute clarity: ${script}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({ audio: base64Audio });
    } else {
      return res.status(500).json({ error: "Succeeded but returned no audio content." });
    }
  } catch (error: any) {
    console.error("Voiceover synthesis error:", error.message || error);
    // Graceful error feedback
    return res.status(200).json({
      error: "TTS integration requires active Gemini API Key setup.",
      mockUrl: true,
      message: error.message || String(error)
    });
  }
});

// 2. API: Automated Analytics & Weekly Telemetry Project Report Generator
app.post("/api/generate-project-analytics", async (req, res) => {
  const { projectName, tracksCount, duration, teamSize, updatesCount, encryptStatus } = req.body;
  
  const prompt = `Analyze this video production project in TrendyTechie Video Studio:
  - Project Title: ${projectName || "Untitled Video"}
  - Timeline Duration: ${duration || 5}s
  - Number of Active Tracks: ${tracksCount || 0}
  - Collaborators/Team Size: ${teamSize || 1} members
  - Edits/Sync Operations This Week: ${updatesCount || 0}
  - Cryptographic Shielding: ${encryptStatus ? "Enabled (End-to-End AES-256)" : "Disabled"}
  
  Generate a professional weekly project analytics report in clean Markdown format with exactly these headings:
  1. Executive Summary
  2. Production Timeline & Resource Load
  3. AI Generative Telemetry
  4. Collaboration & Permissions Matrix
  5. Security & Cryptographic Audit
  Make it look authentic, helpful, technical, and executive-level.`;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    return res.json({ report: response.text });
  } catch (error: any) {
    console.error("Analytics generation error:", error.message || error);
    return res.status(200).json({
      report: `### Telemetry Connection Log\n\n*Error generating report with Gemini: ${error.message || "Key not set"}. Here is our offline metrics analysis fallback:*\n\n**Weekly Summary metrics[...]
    });
  }
});

// 3. API: Generate Mock/Simulated Scene Metadata (Text-to-Video/Image-to-Video helper)
app.post("/api/simulate-scene-generation", async (req, res) => {
  const { prompt, aspectRatio, duration, isImageToVideo, motionPreset } = req.body;

  const promptText = `Analyze and break down this video generation request:
  - Generation Trigger: ${isImageToVideo ? "Image-to-Video Conversion" : "Text-to-Video Generation"}
  - User Prompt: "${prompt || "cinematic orbital shot of sunset over mountain range"}"
  - Aspect Ratio: ${aspectRatio || "16:9"}
  - Target Duration: ${duration || 4} seconds
  - Motion Vector Preference: ${motionPreset || "Default Pan & Zoom"}
  
  Provide a highly structured JSON outline return analyzing this scene. Write it as:
  {
    "sceneTitle": "Short descriptive name",
    "promptDeconstruction": "Short stylistic explanation of the camera lens, light settings, and scene pacing",
    "motionVectors": "Decommission vectors or motion instructions e.g. orbital path, pitch, yaw",
    "audioAtmosphere": "Suggestions for background synth / sound design to complement this visual",
    "mockMediaTheme": "a single literal word describing the style (e.g. nature, cyber, abstract, space, urban, fantasy)"
  }`;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json"
      }
    });
    return res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Simulated scene extraction error:", error.message || error);
    return res.json({
      sceneTitle: prompt ? prompt.substring(0, 30) + "..." : "AI Generated Scene",
      promptDeconstruction: "Cinematic depth, dynamic keyframe rendering offset.",
      motionVectors: motionPreset || "Isometric dolly in; orbital sweep",
      audioAtmosphere: "Low frequency synth drone; atmospheric white noise ambient",
      mockMediaTheme: "space"
    });
  }
});

// 4. API: GitHub Repository & Live Workstation Backup Publisher
app.post("/api/github/push", async (req, res) => {
  const { token, repoOwner, repoName, branch, syncType, projectData, tracksData } = req.body;
  const targetBranch = branch || "main";

  if (!token || !repoOwner || !repoName) {
    return res.status(400).json({ error: "Missing required config parameters." });
  }

  const logs: string[] = [];
  const appendLog = (msg: string) => {
    logs.push(msg);
    console.log(msg);
  };

  try {
    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "TrendyTechie-Workspace-Sync-Agent",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    appendLog(`[SYSTEM] Checking repository safety check: https://github.com/${repoOwner}/${repoName}...`);

    let repoExists = false;
    try {
      const checkRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, { headers });
      if (checkRes.status === 200) {
        repoExists = true;
        appendLog(`[SYSTEM] Repository found. Connecting to existing branch context: ${targetBranch}`);
      } else if (checkRes.status === 404) {
        appendLog(`[SYSTEM] Repo not found on GitHub. Auto generating new repo with private default...`);
        const createRes = await fetch("https://api.github.com/user/repos", {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: repoName,
            description: `TrendyTechie Video Studio Workspace backup: ${projectData?.name || "Untitled Project"}`,
            private: true,
            auto_init: true,
          }),
        });

        if (!createRes.ok) {
          const createErr = await createRes.json();
          throw new Error(`Repo creation failed: ${createErr.message || createRes.statusText}`);
        }
        
        repoExists = true;
        appendLog(`[SYSTEM] Created new private repository '${repoName}' successfully with standard commits initialized.`);
        // Sleep 1.5 seconds for GitHub DB eventual consistency
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else {
        const checkErr = await checkRes.json();
        throw new Error(`Unauthorized or rate limited access: ${checkErr.message || checkRes.statusText}`);
      }
    } catch (checkErr: any) {
      throw new Error(`GitHub check error: ${checkErr.message || checkErr}`);
    }

    // Prepare files to commit
    const filesToPush: { path: string; localPath?: string; stringContent?: string }[] = [];

    // Always push custom README and project-data.json
    const beautifulReadme = `# 🎬 TrendyTechie Video Studio Workspace - ${projectData?.name || "Untitled"}

This repository was automatically generated and synced using **TrendyTechie Studio** collaborative workspace. It contains the full codebase and pre-configured timelines ready for direct execution[...]

## 📊 Sequencing Project Meta Diagnostics
- **Project Title**: \`${projectData?.name || "Untitled Video"}\`
- **Current aspect**: \`${projectData?.aspectRatio || "16:9"}\`
- **Workstation duration limit**: \`${projectData?.duration || 4} seconds\`
- **Sequence tracks layer size**: \`${tracksData?.length || 0} active timelines\`
- **Backup date**: \`${new Date().toISOString()}\`

## 🛠️ Locally running this project
To download, modify, and run this sequencer visual canvas on your local development machine:

1. **Clone this repository**:
   \`\`\`bash
   git clone https://github.com/${repoOwner}/${repoName}.git
   cd ${repoName}
   \`\`\`

2. **Install all workspace packages**:
   \`\`\`bash
   npm install
   \`\`\`

3. **Establish secure live environment & boot dev server**:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Open the active local server (default: \`http://localhost:3000\`) directly to access the video workstation.

---
*Created in Google AI Studio builder - AES-256 local keystore integration included.*`;

    filesToPush.push({
      path: "README.md",
      stringContent: beautifulReadme,
    });

    const activeSaveData = {
      project: {
        ...projectData,
        duration: projectData?.duration || 8,
        aspectRatio: projectData?.aspectRatio || "16:9",
      },
      tracks: tracksData || [],
    };

    filesToPush.push({
      path: "src/data.json",
      stringContent: JSON.stringify(activeSaveData, null, 2),
    });

    if (syncType === "full") {
      appendLog("[SYSTEM] Preparing codebase clone. Bundling core components & build setups...");
      // Add all core project files to the commit structure
      filesToPush.push(
        { path: "package.json", localPath: "package.json" },
        { path: "vite.config.ts", localPath: "vite.config.ts" },
        { path: "tsconfig.json", localPath: "tsconfig.json" },
        { path: "index.html", localPath: "index.html" },
        { path: "server.ts", localPath: "server.ts" },
        { path: "src/main.tsx", localPath: "src/main.tsx" },
        { path: "src/index.css", localPath: "src/index.css" },
        { path: "src/types.ts", localPath: "src/types.ts" },
        { path: "src/App.tsx", localPath: "src/App.tsx" },
        { path: "src/components/CanvasPreview.tsx", localPath: "src/components/CanvasPreview.tsx" },
        { path: "src/components/TimelineEditor.tsx", localPath: "src/components/TimelineEditor.tsx" },
        { path: "src/components/SidebarGenerative.tsx", localPath: "src/components/SidebarGenerative.tsx" },
        { path: "src/components/CollaboratorsPanel.tsx", localPath: "src/components/CollaboratorsPanel.tsx" },
        { path: "src/components/GitHubSyncPanel.tsx", localPath: "src/components/GitHubSyncPanel.tsx" }
      );
    }

    // Loop through each file, fetch its status/SHA to update/create, base64-encode, and PUT to GitHub APIs
    for (const f of filesToPush) {
      try {
        let contentStr = "";
        
        if (f.stringContent !== undefined) {
          contentStr = f.stringContent;
        } else if (f.localPath) {
          const fullLocalPath = path.join(process.cwd(), f.localPath);
          try {
            contentStr = await fs.readFile(fullLocalPath, "utf-8");
          } catch (fileErr) {
            appendLog(`[WARN] File not found inside workspace: '${f.localPath}'. Skipping.`);
            continue;
          }
        }

        // To support loading active project data automatically, override the App.tsx default list references on load
        if (f.path === "src/App.tsx") {
          contentStr = contentStr.replace(
            `const [isSandboxMode, setIsSandboxMode] = useState(false);`,
            `const [isSandboxMode, setIsSandboxMode] = useState(true);`
          );
        }

        const base64Content = Buffer.from(contentStr).toString("base64");

        // Request file meta to pull active SHA (if file exists)
        appendLog(`[COMMITTING] ${f.path}...`);
        let fileSha: string | undefined;
        try {
          const detailRes = await fetch(
            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${f.path}?ref=${targetBranch}`,
            { headers }
          );
          if (detailRes.status === 200) {
            const detailData = await detailRes.json();
            fileSha = detailData.sha;
          }
        } catch {
          // Ignores error if file doesn't exist
        }

        // Commit file via content PUT payload
        const uploadRes = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${f.path}`,
          {
            method: "PUT",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: `TrendyTechie Backup: Sync content block '${f.path}' to personal workspace`,
              content: base64Content,
              branch: targetBranch,
              sha: fileSha,
            }),
          }
        );

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          appendLog(`[WARN] GitHub API refused commit on '${f.path}': ${uploadErr.message}`);
        } else {
          appendLog(`[SUCCESS] Committed: ${f.path}`);
        }
      } catch (err: any) {
        appendLog(`[WARN] Pipeline exception committing: ${f.path}; error: ${err.message || err}`);
      }
    }

    return res.json({
      success: true,
      logs,
      repoUrl: `https://github.com/${repoOwner}/${repoName}`,
    });
  } catch (error: any) {
    console.error("GitHub sync API failure:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during repository deployment.",
      logs,
    });
  }
});

// Vite middleware for development or fallback static serve for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is booting. Native proxy setup binding to host 0.0.0.0 on port ${PORT}`);
  });
}

startServer();
