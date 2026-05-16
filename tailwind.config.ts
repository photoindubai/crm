import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        tertiary: "hsl(var(--tertiary))",
        surface: "hsl(var(--surface))",
        "surface-container": "hsl(var(--surface-container))",
        "surface-container-low": "hsl(var(--surface-container-low))",
        outline: "hsl(var(--outline))",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(30, 41, 59, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
