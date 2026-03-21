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
        shell: "hsl(var(--shell))",
        "shell-foreground": "hsl(var(--shell-foreground))"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(102, 168, 230, 0.12), 0 22px 60px rgba(0, 0, 0, 0.42), 0 0 34px rgba(87, 214, 255, 0.12)",
        soft: "0 18px 44px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        float: "0 28px 76px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(102, 168, 230, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        aura: "0 30px 82px rgba(0, 0, 0, 0.52), 0 0 0 1px rgba(102, 168, 230, 0.08) inset"
      },
      backgroundImage: {
        mesh:
          "radial-gradient(circle at 12% 14%, rgba(87, 214, 255, 0.14), transparent 24%), radial-gradient(circle at 88% 10%, rgba(255, 184, 82, 0.1), transparent 18%), radial-gradient(circle at 78% 80%, rgba(105, 120, 255, 0.1), transparent 22%), linear-gradient(160deg, rgba(4, 7, 13, 0.98), rgba(7, 12, 21, 1))"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"]
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
          "0%, 100%": { boxShadow: "0 0 0 rgba(87, 214, 255, 0)" },
          "50%": { boxShadow: "0 0 60px rgba(87, 214, 255, 0.22)" }
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" }
        },
        halo: {
          "0%, 100%": { opacity: "0.7", transform: "scale(0.98)" },
          "50%": { opacity: "1", transform: "scale(1.02)" }
        }
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 8s linear infinite",
        rise: "rise 0.55s ease-out both",
        pulseGlow: "pulseGlow 4s ease-in-out infinite",
        drift: "drift 8s ease-in-out infinite",
        halo: "halo 5s ease-in-out infinite"
      }
    }
  },
  plugins: [tailwindAnimate]
};

export default config;
