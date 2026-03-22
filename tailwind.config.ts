import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        shell: "hsl(var(--shell))",
        "shell-foreground": "hsl(var(--shell-foreground))"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(122, 133, 155, 0.14), 0 14px 28px rgba(0, 0, 0, 0.22)",
        soft: "0 12px 24px rgba(0, 0, 0, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.035)",
        float: "0 18px 36px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(124, 132, 148, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.035)",
        aura: "0 20px 42px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(124, 132, 148, 0.06) inset"
      },
      backgroundImage: {
        mesh:
          "radial-gradient(circle at 50% -10%, rgba(101, 118, 156, 0.12), transparent 30%), linear-gradient(180deg, rgba(8, 10, 14, 1), rgba(11, 14, 18, 1), rgba(14, 17, 22, 1))"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"]
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0px)" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 rgba(89, 158, 255, 0)" },
          "50%": { boxShadow: "0 0 56px rgba(89, 158, 255, 0.22)" }
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" }
        },
        halo: {
          "0%, 100%": { opacity: "0.7", transform: "scale(0.98)" },
          "50%": { opacity: "1", transform: "scale(1.02)" }
        },
        panelIn: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.992)" },
          "100%": { opacity: "1", transform: "translateY(0px) scale(1)" }
        }
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 8s linear infinite",
        rise: "rise 0.55s ease-out both",
        pulseGlow: "pulseGlow 4s ease-in-out infinite",
        drift: "drift 8s ease-in-out infinite",
        halo: "halo 5s ease-in-out infinite",
        panelIn: "panelIn 0.45s ease-out both"
      }
    }
  },
  plugins: [tailwindAnimate]
};

export default config;
