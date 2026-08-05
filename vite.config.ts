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
            '@radix-ui/react-navigation-menu', '@radix-ui/react-accordion', '@radix-ui/react-avatar',
            '@radix-ui/react-slider', '@radix-ui/react-toggle', '@radix-ui/react-toggle-group',
          ],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-charts': ['recharts', 'embla-carousel-react'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority', 'date-fns', 'lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-other': ['motion', 'sonner', 'cmdk', 'vaul', 'input-otp', 'react-resizable-panels', 'react-dnd', 'react-dnd-html5-backend', 'canvas-confetti', 'react-popper', '@popperjs/core'],

          // Portal chunks - loaded on demand
          'portal-admin': [
            './src/app/pages/admin/AdminDashboard.tsx',
            './src/app/pages/admin/StudentsPage.tsx',
            './src/app/pages/admin/TeachersPage.tsx',
            './src/app/pages/admin/CoursesPage.tsx',
            './src/app/pages/admin/BatchesPage.tsx',
            './src/app/pages/admin/AdminMaterialsPage.tsx',
            './src/app/pages/admin/AdminTestsPage.tsx',
            './src/app/pages/admin/FeesPage.tsx',
            './src/app/pages/admin/SettingsPage.tsx',
            './src/app/pages/admin/NotificationBroadcastPage.tsx',
            './src/app/pages/admin/AuditLogsPage.tsx',
            './src/app/pages/admin/AdminLiveClassesPage.tsx',
            './src/app/pages/admin/SystemHealthPage.tsx',
          ],
          'portal-teacher': [
            './src/app/pages/teacher/TeacherDashboard.tsx',
            './src/app/pages/teacher/MyBatchesPage.tsx',
            './src/app/pages/teacher/TeacherMaterialsPage.tsx',
            './src/app/pages/teacher/LiveClassesPage.tsx',
            './src/app/pages/teacher/TeacherTestsPage.tsx',
            './src/app/pages/teacher/AssignmentsPage.tsx',
            './src/app/pages/teacher/DoubtsPage.tsx',
            './src/app/pages/teacher/AnalyticsPage.tsx',
            './src/app/pages/teacher/StudentProgressPage.tsx',
            './src/app/pages/teacher/AttendancePage.tsx',
            './src/app/pages/teacher/TeacherProfilePage.tsx',
          ],
          'portal-student': [
            './src/app/pages/student/StudentDashboard.tsx',
            './src/app/pages/student/CoursesPage.tsx',
            './src/app/pages/student/MaterialsPage.tsx',
            './src/app/pages/student/StudentLiveClassesPage.tsx',
            './src/app/pages/student/StudentTestsPage.tsx',
            './src/app/pages/student/ResultsPage.tsx',
            './src/app/pages/student/StudentAssignmentsPage.tsx',
            './src/app/pages/student/StudentDoubtsPage.tsx',
            './src/app/pages/student/StudentFeesPage.tsx',
            './src/app/pages/student/NotificationsPage.tsx',
            './src/app/pages/student/ProfilePage.tsx',
          ],

          // Website CMS chunks
          'cms-website': [
            './src/app/pages/admin/website/WebsiteOverviewPage.tsx',
            './src/app/pages/admin/website/CmsEditorPage.tsx',
            './src/app/pages/admin/website/SitePreviewPage.tsx',
            './src/app/pages/admin/website/NoticesManagerPage.tsx',
            './src/app/pages/admin/website/EventsManagerPage.tsx',
            './src/app/pages/admin/website/EnquiriesPage.tsx',
            './src/app/pages/admin/website/MediaLibraryPage.tsx',
            './src/app/pages/admin/website/HomepageSectionsPage.tsx',
            './src/app/pages/admin/website/NavigationManagerPage.tsx',
            './src/app/pages/admin/website/SiteSettingsPage.tsx',
            './src/app/pages/admin/website/SitePagesPage.tsx',
            './src/app/pages/admin/website/CustomPagesPage.tsx',
            './src/app/pages/admin/website/CustomPageEditorPage.tsx',
          ],
          'cms-collections': [
            './src/app/pages/admin/website/SiteCollectionsPage.tsx',
          ],

          // Public website chunks
          'public-pages': [
            './src/app/pages/public/HomePage.tsx',
            './src/app/pages/public/CoursesPage.tsx',
            './src/app/pages/public/FacultyPage.tsx',
            './src/app/pages/public/EventsPage.tsx',
            './src/app/pages/public/EventDetailPage.tsx',
            './src/app/pages/public/AdmissionsPage.tsx',
            './src/app/pages/public/FeesPage.tsx',
            './src/app/pages/public/AchievementsPage.tsx',
            './src/app/pages/public/ResultsPage.tsx',
            './src/app/pages/public/GalleryPage.tsx',
            './src/app/pages/public/ReviewsPage.tsx',
            './src/app/pages/public/BlogPage.tsx',
            './src/app/pages/public/BlogPostPage.tsx',
            './src/app/pages/public/FaqsPage.tsx',
            './src/app/pages/public/StoryPage.tsx',
            './src/app/pages/public/ContactPage.tsx',
            './src/app/pages/public/NoticesPage.tsx',
            './src/app/pages/public/CustomPageView.tsx',
          ],
        },
      },
    },
    // Increase chunk size warning limit since we're intentionally splitting
    chunkSizeWarningLimit: 600,
  },
})
