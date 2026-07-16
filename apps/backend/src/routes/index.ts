import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
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
const offlineMockMiddleware = (req: any, res: any, next: any) => {
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

  console.log(`[Offline API Mock] Intercepted ${method} ${req.baseUrl}${path}`);

  // Student Mock responses
  if (req.baseUrl.startsWith('/api/student')) {
    if (path === '/dashboard') {
      return res.json({
        success: true,
        data: {
          recentResults: [],
          upcomingClasses: [],
          recentMaterials: [],
          myFees: { finalAmount: "5000", dueDate: new Date(Date.now() + 86400000 * 7).toISOString() },
          upcomingAssignments: [],
          openDoubts: 0,
          availableTests: 0,
          attendanceSummary: { total: 10, present: 9, late: 1 }
        }
      });
    }
    if (path === '/profile') {
      const email = req.user?.email || 'student@demo.com';
      // For student@demo.com, we want to start with an incomplete profile to test the onboarding/complete-profile flow.
      const isTestCompleteFlow = email === 'student@demo.com';

      return res.json({
        success: true,
        data: {
          id: req.user?.id || 'mock-user-id-student',
          name: req.user?.name || 'Demo Student',
          email,
          phone: isTestCompleteFlow ? '' : '9876543210',
          profile: {
            id: 'mock-student-profile-uuid',
            userId: req.user?.id || 'mock-user-id-student',
            parentName: isTestCompleteFlow ? '' : 'Jane Doe',
            parentPhone: isTestCompleteFlow ? '' : '9876543211',
            address: isTestCompleteFlow ? '' : '123 Mock Street',
            class: isTestCompleteFlow ? '' : 'Grade 10',
            board: isTestCompleteFlow ? '' : 'CBSE',
          }
        }
      });
    }
    // Return empty success array for lists/gets, success true for posts
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
    if (method === 'GET') {
      return res.json({ success: true, data: [] });
    }
    return res.json({ success: true, message: 'Action succeeded in offline mock mode' });
  }

  next();
};

router.use('/auth', authRoutes);
router.use('/admin', offlineMockMiddleware, adminRoutes);
router.use('/teacher', offlineMockMiddleware, teacherRoutes);
router.use('/student', offlineMockMiddleware, studentRoutes);
router.use('/upload', uploadRoutes);
router.use('/notifications', notificationRoutes);

export default router;
