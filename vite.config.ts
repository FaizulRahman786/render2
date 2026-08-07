import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000,
      },
    },
  },

  build: {
    // Code splitting configuration to reduce main bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-radix': [
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select',
            '@radix-ui/react-tabs', '@radix-ui/react-tooltip', '@radix-ui/react-avatar',
            '@radix-ui/react-label', '@radix-ui/react-slot', '@radix-ui/react-separator',
            '@radix-ui/react-switch', '@radix-ui/react-checkbox', '@radix-ui/react-radio-group',
            '@radix-ui/react-popover', '@radix-ui/react-hover-card', '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area', '@radix-ui/react-collapsible', '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-alert-dialog', '@radix-ui/react-context-menu', '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu', '@radix-ui/react-accordion',
            '@radix-ui/react-slider', '@radix-ui/react-toggle', '@radix-ui/react-toggle-group',
            'cmdk', 'vaul',
          ],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-charts': ['recharts', 'embla-carousel-react'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority', 'date-fns', 'lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-other': ['motion', 'sonner', 'input-otp', 'react-resizable-panels', 'react-dnd', 'react-dnd-html5-backend', 'canvas-confetti', 'react-popper', '@popperjs/core'],
        },
      },
    },
    // Increase chunk size warning limit since we're intentionally splitting
    chunkSizeWarningLimit: 600,
  },
})
