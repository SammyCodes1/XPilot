import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // -------------------------------------------------------------------
      // XPilot Design System — "Agentic Modern" token palette
      // -------------------------------------------------------------------

      colors: {
        // Base canvas — warm cream, lightly textured feel
        cream: {
          DEFAULT: "#F7F1E6",
          50: "#FDFBF7",
          100: "#FBF7EF",
          200: "#F7F1E6",
          300: "#F0E8D8",
          400: "#E8DCC5",
          500: "#DDCEB0",
        },

        // Surface — slightly lighter off-white for cards and panels
        "cream-surface": {
          DEFAULT: "#FDFAF3",
          50: "#FEFDFB",
          100: "#FDFAF3",
          200: "#FAF4E7",
          300: "#F5EBD5",
        },

        // Primary accent — burnt, confident orange
        ember: {
          DEFAULT: "#FF6B2C",
          50: "#FFF3ED",
          100: "#FFE6D8",
          200: "#FFC9A8",
          300: "#FFA472",
          400: "#FF7F44",
          500: "#FF6B2C",
          600: "#E55510",
          700: "#B8400A",
          800: "#8A2F06",
          900: "#5C1E03",
        },

        // Primary text — deep charcoal, never pure black
        ink: {
          DEFAULT: "#1F1B16",
          50: "#F5F3F1",
          100: "#E8E4DF",
          200: "#CEC7BE",
          300: "#AFA599",
          400: "#8C8175",
          500: "#6B6157",
          600: "#4D453D",
          700: "#332D27",
          800: "#1F1B16",
          900: "#14110E",
        },

        // Semantic: buy / positive — warm green (olive-toned, not harsh)
        success: {
          DEFAULT: "#3B8258",
          50: "#EDF6F0",
          100: "#D4EBDC",
          200: "#A5D7B7",
          300: "#72BF8F",
          400: "#4DA671",
          500: "#3B8258",
          600: "#2E6846",
          700: "#224E34",
          800: "#173523",
          900: "#0D1F13",
        },

        // Semantic: sell / negative — muted terracotta, not jarring bright red
        danger: {
          DEFAULT: "#C45642",
          50: "#FAF0ED",
          100: "#F3DDD6",
          200: "#E7B8AB",
          300: "#D98D7A",
          400: "#CC6B54",
          500: "#C45642",
          600: "#9E4232",
          700: "#7A3124",
          800: "#562118",
          900: "#33120D",
        },

        // Semantic: neutral / hold — warm gray
        neutral: {
          DEFAULT: "#AFA599",
          50: "#F5F3F1",
          100: "#E8E4DF",
          200: "#CEC7BE",
          300: "#AFA599",
          400: "#8C8175",
          500: "#6B6157",
        },

        // Border — warm, subtle
        border: {
          DEFAULT: "#E7DFCF",
          light: "#F0EBDD",
          medium: "#DDD3C0",
        },
      },

      // -------------------------------------------------------------------
      // Typography
      // -------------------------------------------------------------------

      fontFamily: {
        sans: [
          "Inter",
          "Geist",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "Cascadia Code",
          "Consolas",
          "monospace",
        ],
      },

      fontSize: {
        // Size-scale tuned for confident data display
        "2xs": ["0.6875rem", { lineHeight: "1rem" }], // 11px — legal/caption
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
        sm: ["0.8125rem", { lineHeight: "1.25rem" }], // 13px — body-small
        base: ["0.9375rem", { lineHeight: "1.6rem" }], // 15px — body
        lg: ["1.0625rem", { lineHeight: "1.65rem" }], // 17px
        xl: ["1.25rem", { lineHeight: "1.5rem" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "1.4rem" }], // 24px
        "3xl": ["1.875rem", { lineHeight: "1.3rem" }], // 30px
        "4xl": ["2.5rem", { lineHeight: "1.2rem" }], // 40px — hero numbers
        "5xl": ["3.25rem", { lineHeight: "1.1rem" }], // 52px — big hero
      },

      letterSpacing: {
        tightest: "-0.03em",
        tighter: "-0.02em",
        tight: "-0.01em",
        normal: "0",
        wide: "0.02em",
        wider: "0.05em",
        mono: "0.04em", // Slight tracking for mono text
      },

      // -------------------------------------------------------------------
      // Spacing — generous whitespace system
      // -------------------------------------------------------------------

      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
      },

      // -------------------------------------------------------------------
      // Border radius — confident, not bubbly
      // -------------------------------------------------------------------

      borderRadius: {
        sm: "0.375rem", // 6px
        DEFAULT: "0.5rem", // 8px
        md: "0.625rem", // 10px
        lg: "0.75rem", // 12px — cards
        xl: "1rem", // 16px
        full: "9999px",
      },

      // -------------------------------------------------------------------
      // Shadows — minimal, warm, used sparingly
      // -------------------------------------------------------------------

      boxShadow: {
        none: "none",
        xs: "0 1px 2px rgba(31, 27, 22, 0.04)",
        sm: "0 1px 3px rgba(31, 27, 22, 0.05), 0 1px 2px rgba(31, 27, 22, 0.04)",
        md: "0 4px 12px rgba(31, 27, 22, 0.06), 0 1px 3px rgba(31, 27, 22, 0.04)",
        lg: "0 8px 24px rgba(31, 27, 22, 0.08), 0 2px 6px rgba(31, 27, 22, 0.04)",
        // Only used for modals / elevated states
      },

      // -------------------------------------------------------------------
      // Animation
      // -------------------------------------------------------------------

      animation: {
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "progress-bar": "progressBar 1.5s ease-in-out infinite",
      },

      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        progressBar: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
