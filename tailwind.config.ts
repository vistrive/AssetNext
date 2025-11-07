import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // Legacy shadcn/ui colors
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Custom futuristic dark theme colors
        surface: {
          DEFAULT: "var(--bg-surface)",
          light: "var(--bg-surface-light)",
          lighter: "var(--bg-surface-lighter)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        brand: {
          primary: "var(--color-primary)",
          "primary-light": "var(--color-primary-light)",
          "primary-dark": "var(--color-primary-dark)",
          accent: "var(--color-accent)",
          "accent-light": "var(--color-accent-light)",
        },
        status: {
          success: "var(--color-success)",
          warning: "var(--color-warning)",
          danger: "var(--color-danger)",
          info: "var(--color-info)",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-surface': 'var(--gradient-surface)',
        'gradient-card': 'var(--gradient-card)',
        'gradient-glow': 'var(--gradient-glow)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-success': 'var(--gradient-success)',
        'gradient-warning': 'var(--gradient-warning)',
        'gradient-danger': 'var(--gradient-danger)',
      },
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'glow-strong': 'var(--shadow-glow-strong)',
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'inner-glow': 'var(--shadow-inner)',
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        display: ["Poppins", "var(--font-sans)"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(59, 130, 246, 0.5)" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            opacity: "1",
            boxShadow: "0 0 15px rgba(59, 130, 246, 0.4)"
          },
          "50%": { 
            opacity: "0.8",
            boxShadow: "0 0 25px rgba(59, 130, 246, 0.6)"
          },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "gradient-halo": {
          "0%, 100%": { 
            opacity: "0.3",
            transform: "scale(1)"
          },
          "50%": { 
            opacity: "0.5",
            transform: "scale(1.05)"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-up": "slide-up 0.5s ease-out",
        "slide-down": "slide-down 0.5s ease-out",
        "glow": "glow 2s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 3s linear infinite",
        "gradient-halo": "gradient-halo 8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
