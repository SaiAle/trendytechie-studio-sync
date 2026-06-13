export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  createdAt: string;
}

export interface Project {
  projectId: string;
  name: string;
  description: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  duration: number; // in seconds
  ownerId: string;
  collaboratorIds: string[];
  createdAt: string;
  updatedAt: string;
  encrypted: boolean; // whether end-to-end encryption is active
}

export interface TimelineTrack {
  trackId: string;
  projectId: string;
  type: "video" | "voiceover" | "music" | "text";
  startTime: number; // in seconds
  duration: number; // in seconds
  prompt?: string;
  sourceUrl?: string;
  voiceName?: string;
  script?: string;
  createdAt: string;
}

export interface ActiveUser {
  userId: string;
  displayName: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  online: boolean;
}
