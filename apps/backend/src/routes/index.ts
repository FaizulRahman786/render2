import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import cmsRoutes from './cms.js';
import siteContentRoutes from './siteContent.js';
import publicRoutes from './public.js';
import teacherRoutes from './teacher.js';
import studentRoutes from './student.js';
import uploadRoutes from './upload.js';
import notificationRoutes from './notifications.js';
import { isDbConnected } from '../config/database.js';
import { config } from '../config/env.js';

const router: ExpressRouter = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

/**
 * GET /api/status
 * Returns real-time service health for diagnosis.
 * Intentionally does NOT expose secrets — only boolean flags and enum values.
 */
router.get('/status', (req, res) => {
  const dbUrl = process.env.DATABASE_URL || '';
  const hasPlaceholderPassword =
    dbUrl.includes('[YOUR-DATABASE-PASSWORD]') ||
    dbUrl.includes('[password]') ||
    dbUrl.includes(':password@') ||
    dbUrl === '';

  res.json({
    timestamp: new Date().toISOString(),
    database: {
      connected: isDbConnected,
      provider: dbUrl.includes('supabase') ? 'supabase' : dbUrl.includes('neon') ? 'neon' : 'other',
      hasPlaceholderPassword,
    },
    auth: {
      provider: config.authProvider,
      supabaseConfigured: Boolean(config.supabaseUrl && config.supabaseAnonKey),
      mockEnabled: config.enableAuthMock,
    },
    environment: config.nodeEnv,
  });
});

// Offline Mock Fallback Middleware for student, teacher, and admin routes
// ONLY used when database is NOT connected and ENABLE_AUTH_MOCK=true
const offlineMockMiddleware = (req: any, res: any, next: any) => {
  console.log('[OFFLINE MOCK] Path:', req.path, 'BaseURL:', req.baseUrl, 'DB Connected:', isDbConnected);
  if (isDbConnected) {
    next();
    return;
  }

  if (!config.enableAuthMock) {
    res.status(503).json({
      success: false,
      error: 'Database connection is offline. Please try again later.',
    });
    return;
  }

  const path = req.path;
  const method = req.method;

  // Student Mock responses
  if (req.baseUrl.startsWith('/api/student')) {
    if (path === '/dashboard') {
      return res.json({
        success: true,
        data: {
          recentResults: [],
          upcomingClasses: [],
          recentMaterials: [],
          feeStatus: { finalAmount: "5000", paid: "0", outstanding: 5000, dueDate: new Date(Date.now() + 86400000 * 7).toISOString() },
          pendingAssignments: [],
          openDoubtsCount: 0,
          availableTestsCount: 0,
          attendancePct: null,
          attendanceSessions: 0,
          myBatchCount: 0,
        }
      });
    }
    if (path === '/profile') {
      const email = req.user?.email || 'student@demo.com';
      const isTestCompleteFlow = email === 'student@demo.com';

      return res.json({
        success: true,
        data: {
          id: req.user?.id || 'mock-user-id-student',
          name: req.user?.name || 'Student User',
          email,
          phone: isTestCompleteFlow ? '' : '9876543210',
          profile: {
            id: 'mock-student-profile-uuid',
            userId: req.user?.id || 'mock-user-id-student',
            parentName: isTestCompleteFlow ? '' : 'Parent Name',
            parentPhone: isTestCompleteFlow ? '' : '9876543211',
            address: isTestCompleteFlow ? '' : 'Mock Address',
            class: isTestCompleteFlow ? '' : 'Grade 10',
            board: isTestCompleteFlow ? '' : 'CBSE',
          }
        }
      });
    }
    if (path === '/notifications') {
      return res.json({ success: true, data: [] });
    }
    if (method === 'GET') {
      return res.json({ success: true, data: [] });
    }
    return res.json({ success: true, message: 'Action succeeded in offline mock mode' });
  }

  // Teacher Mock responses
  if (req.baseUrl.startsWith('/api/teacher')) {
    if (path === '/dashboard') {
      return res.json({
        success: true,
        data: {
          myBatches: 3,
          materialsUploaded: 5,
          testsCreated: 2,
          pendingDoubts: 0,
          upcomingClasses: []
        }
      });
    }
    if (path === '/profile') {
      return res.json({
        success: true,
        data: {
          id: 'mock-teacher-profile-id',
          userId: req.user?.id || 'mock-user-id-teacher',
          qualification: 'PhD in Computer Science',
          experience: '10 years',
          name: req.user?.name || 'Demo Teacher',
          email: req.user?.email || 'teacher@demo.com',
          phone: req.user?.phone || '9876543211'
        }
      });
    }
    if (method === 'GET') {
      return res.json({ success: true, data: [] });
    }
    return res.json({ success: true, message: 'Action succeeded in offline mock mode' });
  }

  // Admin Mock responses
  if (req.baseUrl.startsWith('/api/admin')) {
    if (path === '/dashboard') {
      return res.json({
        success: true,
        data: {
          totalStudents: 150,
          totalTeachers: 12,
          totalCourses: 6,
          totalBatches: 10,
          totalTests: 24,
          pendingFees: 25000,
          upcomingClasses: 4,
          pendingDoubts: 3
        }
      });
    }
    if (path === '/site/notifications' && method === 'GET') {
      return res.json({ success: true, data: [] });
    }
    if (method === 'GET') {
      return res.json({ success: true, data: [] });
    }
    if (path === '/site/notifications' && method === 'POST') {
      return res.json({ success: true, message: 'Notification sent in offline mock mode' });
    }
    return res.json({ success: true, message: 'Action succeeded in offline mock mode' });
  }

  next();
};

router.use('/auth', authRoutes);
router.use('/admin', offlineMockMiddleware, adminRoutes, cmsRoutes);
// Public-site CMS (admissions, fees, achievements, results, gallery, reviews,
// blog, faqs, navigation, homepage sections, custom pages). Requires admin.
router.use('/admin/site', offlineMockMiddleware, siteContentRoutes);
router.use('/teacher', offlineMockMiddleware, teacherRoutes);
router.use('/student', offlineMockMiddleware, studentRoutes);
router.use('/upload', uploadRoutes);
router.use('/notifications', notificationRoutes);
// Public website API — read-only for visitors except the validated, rate-limited
// contact form. Serves real DB content (courses, faculty, published notices and
// events, CMS live sections). Never exposes drafts or private audience content.
router.use('/public', publicRoutes);

export default router;
