import { AestheticPreset } from "./types";

// Premium iOS-style visual aesthetic presets for reference layout
export const AESTHETIC_PRESETS: AestheticPreset[] = [
  {
    id: "cupertino-glass",
    name: "Cupertino Glassmorphism",
    description: "Sleek iOS layout with frosted glass, high-contrast typography, and vibrant blur backdrops.",
    styleDirectives: "Utilize frosted glass containers (backdrop-blur-md, bg-white/70), subtle 1px borders, smooth spring animations, and Apple system typography (SF Pro)."
  },
  {
    id: "warm-slate",
    name: "Apple Warm Slate",
    description: "Elegant off-whites, neutral slate grays, and rich deep navy accents. Very high contrast.",
    styleDirectives: "Clean warm-white backgrounds (#f4f5f7), deep carbon/slate dark elements, micro shadows, and generous, rhythmic letter spacing."
  },
  {
    id: "brutalist-mono",
    name: "Brutalist Monospace",
    description: "High-impact developer theme. Flat shadows, heavy black borders, and Fira Code fonts.",
    styleDirectives: "High-contrast thick black borders (border-2 border-black), monospace typography, neon highlight accents, zero gradients, and card overlaps."
  },
  {
    id: "swiss-modern",
    name: "Swiss Modernist",
    description: "Grid-focused layout with bold display typography, crimson red cues, and extensive whitespace.",
    styleDirectives: "Strict typographic grids, ultra-bold headings with tight line height, crimson red visual anchor points, and zero decorative elements."
  },
  {
    id: "retro-terminal",
    name: "Amber Terminal",
    description: "Classic retro-futuristic dark mode with amber phosphor glow and terminal styling.",
    styleDirectives: "Deep pitch-black canvas, solid amber monospace characters (#ffb000), simulated CRT scanlines, and mechanical terminal cues."
  }
];

// Quick templates for prompt creation
export const STARTER_TEMPLATES = [
  { label: "📱 iOS Fitness Coach", prompt: "Create a personalized fitness planner for busy professionals." },
  { label: "💻 SaaS Landing Copy", prompt: "Write compelling landing page copy for an offline-first task manager." },
  { label: "🎨 SwiftUI Layout Guide", prompt: "Design a clean responsive feed view in SwiftUI using modern state flow." },
  { label: "📈 Personal Finance Tracker", prompt: "Build an interactive budget analyzer that auto-categorizes expenses." }
];
