import { getSupabaseAccessToken } from './supabase';

// In production, VITE_API_URL must be set in your Vercel/hosting environment.
// In development, Vite's proxy forwards /api → localhost:3001.
const defaultApiBase = import.meta.env.VITE_API_URL || '/api';

export const BASE_URL = defaultApiBase;

const DEFAULT_TIMEOUT = 60_000; // 60 seconds
const MAX_RETRIES = 3;

let authTokenCache: { token: string; expiresAt: number } | null = null;

export async function getAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (authTokenCache && authTokenCache.expiresAt > now + 60_000) {
    return authTokenCache.token;
  }
  const token = await getSupabaseAccessToken();
  if (token) {
    // Supabase tokens typically last 1 hour, cache for 50 minutes
    authTokenCache = { token, expiresAt: now + 50 * 60_000 };
  }
  return token;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(
  path: string,
  options: RequestInit & { timeout?: number; retries?: number } = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, retries = MAX_RETRIES, ...fetchOptions } = options;
  const maxRetries = retries;
  let delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}${path}`, {
        ...fetchOptions,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        // Retry only on transient server errors. 429 is deliberately NOT
        // retried: the server has already decided this client is making too
        // many requests, and retrying only deepens the penalty window.
        const isTransientStatus = res.status === 502 || res.status === 503 || res.status === 504;
        if (isTransientStatus && attempt < maxRetries) {
          console.warn(`[API] Transient status ${res.status} on ${path}. Retrying attempt ${attempt}...`);
          await sleep(delay);
          delay *= 2;
          continue;
        }
        const message = typeof data === 'string' ? data : (data.error || data.message || 'Request failed');
        throw new Error(message);
      }

      return (typeof data === 'string' ? { message: data } : data) as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      const isNetworkError = error instanceof TypeError || error.message?.includes('fetch') || error.message?.includes('NetworkError') || error.name === 'AbortError';
      if (isNetworkError && attempt < maxRetries) {
        console.warn(`[API] Network/timeout error on ${path}: ${error.message}. Retrying attempt ${attempt}...`);
        await sleep(delay + Math.random() * 500); // Add jitter
        delay *= 2;
        continue;
      }
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }
  throw new Error('Request failed after maximum retries');
}

export async function uploadFile(
  file: File,
  endpoint = '/upload',
  options: { timeout?: number; onProgress?: (progress: number) => void } = {}
): Promise<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string }> {
  const token = await getAuthToken();
  const form = new FormData();
  form.append('file', file);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error(typeof data === 'string' ? data : data.error || 'Upload failed');
    return data.data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Upload timeout after ${options.timeout || DEFAULT_TIMEOUT}ms`);
    }
    throw error;
  }
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  all?: boolean | string;
}

function buildQuery(params?: PaginationParams & Record<string, any>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const str = q.toString();
  return str ? `?${str}` : '';
}

export const api = {
  // File Upload
  uploadFile,
  uploadSubmissionFile: (file: File) => uploadFile(file, '/upload/submission'),
  uploadMediaLibrary: (file: File) => uploadFile(file, '/upload/media'),

  // Auth
  auth: {
    me: () => request<{ success: boolean; data: any }>('/auth/me'),
    logout: () => request<any>('/auth/logout', { method: 'POST' }),
    updateProfile: (data: { name?: string; phone?: string }) =>
      request<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Notifications
  notifications: {
    getAll: (params?: Record<string, any>) => request<any>(`/notifications${buildQuery(params)}`),
    getUnreadCount: () => request<any>('/notifications/unread-count'),
    markRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request<any>('/notifications/read-all', { method: 'PATCH' }),
    send: (data: any) => request<any>('/notifications/send', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Admin
  admin: {
    dashboard: () => request<any>('/admin/dashboard'),

    // Students (server-side paginated)
    getStudents: (params?: PaginationParams & { all?: string }) => request<any>(`/admin/students${buildQuery(params)}`),
    getAllStudents: () => request<any>('/admin/students/all'),
    createStudent: (data: any) => request<any>('/admin/students', { method: 'POST', body: JSON.stringify(data) }),
    updateStudent: (id: string, data: any) => request<any>(`/admin/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deactivateStudent: (id: string) => request<any>(`/admin/students/${id}`, { method: 'DELETE' }),
    restoreStudent: (id: string) => request<any>(`/admin/students/${id}/restore`, { method: 'POST' }),

    // Teachers (server-side paginated)
    getTeachers: (params?: PaginationParams & { all?: string }) => request<any>(`/admin/teachers${buildQuery(params)}`),
    getAllTeachers: () => request<any>('/admin/teachers/all'),
    createTeacher: (data: any) => request<any>('/admin/teachers', { method: 'POST', body: JSON.stringify(data) }),
    updateTeacher: (id: string, data: any) => request<any>(`/admin/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deactivateTeacher: (id: string) => request<any>(`/admin/teachers/${id}`, { method: 'DELETE' }),
    restoreTeacher: (id: string) => request<any>(`/admin/teachers/${id}/restore`, { method: 'POST' }),

    // Courses (server-side paginated)
    getCourses: (params?: PaginationParams & { all?: boolean }) => request<any>(`/admin/courses${buildQuery(params)}`),
    createCourse: (data: any) => request<any>('/admin/courses', { method: 'POST', body: JSON.stringify(data) }),
    updateCourse: (id: string, data: any) => request<any>(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCourse: (id: string) => request<any>(`/admin/courses/${id}`, { method: 'DELETE' }),

    // Subjects
    getSubjects: (courseId: string) => request<any>(`/admin/courses/${courseId}/subjects`),
    createSubject: (courseId: string, data: any) => request<any>(`/admin/courses/${courseId}/subjects`, { method: 'POST', body: JSON.stringify(data) }),
    updateSubject: (courseId: string, subId: string, data: any) => request<any>(`/admin/courses/${courseId}/subjects/${subId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSubject: (courseId: string, subId: string) => request<any>(`/admin/courses/${courseId}/subjects/${subId}`, { method: 'DELETE' }),

    // Chapters
    getChapters: (subjectId: string) => request<any>(`/admin/subjects/${subjectId}/chapters`),
    createChapter: (subjectId: string, data: any) => request<any>(`/admin/subjects/${subjectId}/chapters`, { method: 'POST', body: JSON.stringify(data) }),
    updateChapter: (subjectId: string, chapterId: string, data: any) => request<any>(`/admin/subjects/${subjectId}/chapters/${chapterId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteChapter: (subjectId: string, chapterId: string) => request<any>(`/admin/subjects/${subjectId}/chapters/${chapterId}`, { method: 'DELETE' }),

    // Batches (server-side paginated)
    getBatches: (params?: PaginationParams & { all?: boolean }) => request<any>(`/admin/batches${buildQuery(params)}`),
    createBatch: (data: any) => request<any>('/admin/batches', { method: 'POST', body: JSON.stringify(data) }),
    updateBatch: (id: string, data: any) => request<any>(`/admin/batches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteBatch: (id: string) => request<any>(`/admin/batches/${id}`, { method: 'DELETE' }),
    getBatchMembers: (id: string) => request<any>(`/admin/batches/${id}/members`),
    addBatchTeacher: (id: string, teacherId: string) => request<any>(`/admin/batches/${id}/teachers`, { method: 'POST', body: JSON.stringify({ teacherId }) }),
    removeBatchTeacher: (id: string, teacherId: string) => request<any>(`/admin/batches/${id}/teachers/${teacherId}`, { method: 'DELETE' }),
    addBatchStudent: (id: string, studentId: string) => request<any>(`/admin/batches/${id}/students`, { method: 'POST', body: JSON.stringify({ studentId }) }),
    removeBatchStudent: (id: string, studentId: string) => request<any>(`/admin/batches/${id}/students/${studentId}`, { method: 'DELETE' }),

    // Materials (server-side paginated)
    getMaterials: (params?: PaginationParams) => request<any>(`/admin/materials${buildQuery(params)}`),
    createMaterial: (data: any) => request<any>('/admin/materials', { method: 'POST', body: JSON.stringify(data) }),
    deleteMaterial: (id: string) => request<any>(`/admin/materials/${id}`, { method: 'DELETE' }),

    // Live Classes (server-side paginated)
    getLiveClasses: (params?: PaginationParams) => request<any>(`/admin/live-classes${buildQuery(params)}`),

    // Tests (server-side paginated)
    getTests: (params?: PaginationParams) => request<any>(`/admin/tests${buildQuery(params)}`),
    getTestResults: (testId: string) => request<any>(`/admin/tests/${testId}/results`),

    // Fees (server-side paginated)
    getFees: (params?: PaginationParams) => request<any>(`/admin/fees${buildQuery(params)}`),
    createFee: (data: any) => request<any>('/admin/fees', { method: 'POST', body: JSON.stringify(data) }),
    recordPayment: (feeId: string, data: any) => request<any>(`/admin/fees/${feeId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
    getFeeReceipt: (feeId: string) => request<any>(`/admin/fees/${feeId}/receipt`),

    // Settings
    getSettings: () => request<any>('/admin/settings'),
    saveSettings: (data: Record<string, string>) => request<any>('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),

    // Notifications broadcast
    broadcastNotification: (data: any) => request<any>('/admin/notifications/broadcast', { method: 'POST', body: JSON.stringify(data) }),

    // Audit Logs (server-side paginated)
    getAuditLogs: (params?: PaginationParams & { entity?: string; action?: string; from?: string; to?: string; all?: string }) => request<any>(`/admin/audit-logs${buildQuery(params)}`),

    // ── CMS (draft + publish lifecycle) ──
    getCms: () => request<any>('/admin/cms'),
    saveCmsDraft: (key: string, content: Record<string, any>) =>
      request<any>('/admin/cms', { method: 'PUT', body: JSON.stringify({ key, content }) }),
    publishCms: (key: string) =>
      request<any>('/admin/cms/publish', { method: 'POST', body: JSON.stringify({ key }) }),
    getCmsPreview: (section: string) => request<any>(`/admin/cms/preview?section=${encodeURIComponent(section)}`),
    getCmsVersions: (section: string) => request<any>(`/admin/cms/versions?section=${encodeURIComponent(section)}`),
    restoreCmsVersion: (id: string, key: string) =>
      request<any>(`/admin/cms/versions/${id}/restore`, { method: 'POST', body: JSON.stringify({ key }) }),

    // ── Notices ──
    getNotices: (params?: PaginationParams & { audience?: string }) => request<any>(`/admin/notices${buildQuery(params)}`),
    createNotice: (data: any) => request<any>('/admin/notices', { method: 'POST', body: JSON.stringify(data) }),
    updateNotice: (id: string, data: any) => request<any>(`/admin/notices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    archiveNotice: (id: string) => request<any>(`/admin/notices/${id}`, { method: 'DELETE' }),

    // ── Events ──
    getEvents: (params?: PaginationParams) => request<any>(`/admin/events${buildQuery(params)}`),
    createEvent: (data: any) => request<any>('/admin/events', { method: 'POST', body: JSON.stringify(data) }),
    updateEvent: (id: string, data: any) => request<any>(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    archiveEvent: (id: string) => request<any>(`/admin/events/${id}`, { method: 'DELETE' }),

    // ── Enquiries inbox ──
    getEnquiries: (params?: PaginationParams) => request<any>(`/admin/enquiries${buildQuery(params)}`),
    updateEnquiryStatus: (id: string, status: string) =>
      request<any>(`/admin/enquiries/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

    // ── Media library ──
    getMedia: (params?: PaginationParams & { type?: string }) => request<any>(`/admin/media${buildQuery(params)}`),
    updateMediaAlt: (id: string, altText: string) =>
      request<any>(`/admin/media/${id}`, { method: 'PUT', body: JSON.stringify({ altText }) }),
    deleteMedia: (id: string) => request<any>(`/admin/media/${id}`, { method: 'DELETE' }),

    // ── Global search + system health ──
    search: (q: string) => request<any>(`/admin/search?q=${encodeURIComponent(q)}`),
    system: () => request<any>('/admin/system'),

    // ── Public website CMS (structured content) ──
    cmsStats: () => request<any>('/admin/site/cms-stats'),

    getAdmissions: (p?: PaginationParams) => request<any>(`/admin/site/admissions${buildQuery(p)}`),
    createAdmission: (d: any) => request<any>('/admin/site/admissions', { method: 'POST', body: JSON.stringify(d) }),
    updateAdmission: (id: string, d: any) => request<any>(`/admin/site/admissions/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    publishAdmission: (id: string) => request<any>(`/admin/site/admissions/${id}/publish`, { method: 'POST' }),
    unpublishAdmission: (id: string) => request<any>(`/admin/site/admissions/${id}/unpublish`, { method: 'POST' }),
    archiveAdmission: (id: string) => request<any>(`/admin/site/admissions/${id}`, { method: 'DELETE' }),

    getFeeStructures: (p?: PaginationParams) => request<any>(`/admin/site/fee-structures${buildQuery(p)}`),
    createFeeStructure: (d: any) => request<any>('/admin/site/fee-structures', { method: 'POST', body: JSON.stringify(d) }),
    updateFeeStructure: (id: string, d: any) => request<any>(`/admin/site/fee-structures/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    publishFeeStructure: (id: string) => request<any>(`/admin/site/fee-structures/${id}/publish`, { method: 'POST' }),
    unpublishFeeStructure: (id: string) => request<any>(`/admin/site/fee-structures/${id}/unpublish`, { method: 'POST' }),
    archiveFeeStructure: (id: string) => request<any>(`/admin/site/fee-structures/${id}`, { method: 'DELETE' }),

    getAchievements: (p?: PaginationParams) => request<any>(`/admin/site/achievements${buildQuery(p)}`),
    createAchievement: (d: any) => request<any>('/admin/site/achievements', { method: 'POST', body: JSON.stringify(d) }),
    updateAchievement: (id: string, d: any) => request<any>(`/admin/site/achievements/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    publishAchievement: (id: string) => request<any>(`/admin/site/achievements/${id}/publish`, { method: 'POST' }),
    unpublishAchievement: (id: string) => request<any>(`/admin/site/achievements/${id}/unpublish`, { method: 'POST' }),
    archiveAchievement: (id: string) => request<any>(`/admin/site/achievements/${id}`, { method: 'DELETE' }),

    getPublicResults: (p?: PaginationParams) => request<any>(`/admin/site/public-results${buildQuery(p)}`),
    createPublicResult: (d: any) => request<any>('/admin/site/public-results', { method: 'POST', body: JSON.stringify(d) }),
    updatePublicResult: (id: string, d: any) => request<any>(`/admin/site/public-results/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    publishPublicResult: (id: string) => request<any>(`/admin/site/public-results/${id}/publish`, { method: 'POST' }),
    unpublishPublicResult: (id: string) => request<any>(`/admin/site/public-results/${id}/unpublish`, { method: 'POST' }),
    archivePublicResult: (id: string) => request<any>(`/admin/site/public-results/${id}`, { method: 'DELETE' }),

    getGalleryItems: (p?: PaginationParams) => request<any>(`/admin/site/gallery-items${buildQuery(p)}`),
    createGalleryItem: (d: any) => request<any>('/admin/site/gallery-items', { method: 'POST', body: JSON.stringify(d) }),
    updateGalleryItem: (id: string, d: any) => request<any>(`/admin/site/gallery-items/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    publishGalleryItem: (id: string) => request<any>(`/admin/site/gallery-items/${id}/publish`, { method: 'POST' }),
    unpublishGalleryItem: (id: string) => request<any>(`/admin/site/gallery-items/${id}/unpublish`, { method: 'POST' }),
    archiveGalleryItem: (id: string) => request<any>(`/admin/site/gallery-items/${id}`, { method: 'DELETE' }),

    getReviews: (p?: PaginationParams) => request<any>(`/admin/site/reviews${buildQuery(p)}`),
    createReview: (d: any) => request<any>('/admin/site/reviews', { method: 'POST', body: JSON.stringify(d) }),
    updateReview: (id: string, d: any) => request<any>(`/admin/site/reviews/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    moderateReview: (id: string, decision: 'approved' | 'rejected') =>
      request<any>(`/admin/site/reviews/${id}/moderate`, { method: 'PUT', body: JSON.stringify({ decision }) }),
    archiveReview: (id: string) => request<any>(`/admin/site/reviews/${id}`, { method: 'DELETE' }),

    getBlogPosts: (p?: PaginationParams) => request<any>(`/admin/site/blog-posts${buildQuery(p)}`),
    createBlogPost: (d: any) => request<any>('/admin/site/blog-posts', { method: 'POST', body: JSON.stringify(d) }),
    updateBlogPost: (id: string, d: any) => request<any>(`/admin/site/blog-posts/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    publishBlogPost: (id: string) => request<any>(`/admin/site/blog-posts/${id}/publish`, { method: 'POST' }),
    unpublishBlogPost: (id: string) => request<any>(`/admin/site/blog-posts/${id}/unpublish`, { method: 'POST' }),
    archiveBlogPost: (id: string) => request<any>(`/admin/site/blog-posts/${id}`, { method: 'DELETE' }),

    getFaqs: (p?: PaginationParams) => request<any>(`/admin/site/faqs${buildQuery(p)}`),
    createFaq: (d: any) => request<any>('/admin/site/faqs', { method: 'POST', body: JSON.stringify(d) }),
    updateFaq: (id: string, d: any) => request<any>(`/admin/site/faqs/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    publishFaq: (id: string) => request<any>(`/admin/site/faqs/${id}/publish`, { method: 'POST' }),
    unpublishFaq: (id: string) => request<any>(`/admin/site/faqs/${id}/unpublish`, { method: 'POST' }),
    archiveFaq: (id: string) => request<any>(`/admin/site/faqs/${id}`, { method: 'DELETE' }),

    // Public Faculty CMS
    getFaculty: (p?: PaginationParams) => request<any>(`/admin/site/faculty${buildQuery(p)}`),
    createFaculty: (d: any) => request<any>('/admin/site/faculty', { method: 'POST', body: JSON.stringify(d) }),
    updateFaculty: (id: string, d: any) => request<any>(`/admin/site/faculty/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    publishFaculty: (id: string) => request<any>(`/admin/site/faculty/${id}/publish`, { method: 'POST' }),
    unpublishFaculty: (id: string) => request<any>(`/admin/site/faculty/${id}/unpublish`, { method: 'POST' }),
    archiveFaculty: (id: string) => request<any>(`/admin/site/faculty/${id}`, { method: 'DELETE' }),

    // Public Courses CMS
    getSiteCourses: (p?: PaginationParams) => request<any>(`/admin/site/courses${buildQuery(p)}`),
    createSiteCourse: (d: any) => request<any>('/admin/site/courses', { method: 'POST', body: JSON.stringify(d) }),
    updateSiteCourse: (id: string, d: any) => request<any>(`/admin/site/courses/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    publishSiteCourse: (id: string) => request<any>(`/admin/site/courses/${id}/publish`, { method: 'POST' }),
    unpublishSiteCourse: (id: string) => request<any>(`/admin/site/courses/${id}/unpublish`, { method: 'POST' }),
    archiveSiteCourse: (id: string) => request<any>(`/admin/site/courses/${id}`, { method: 'DELETE' }),

    getSitePages: () => request<any>('/admin/site/site-pages'),
    saveSitePage: (slug: string, d: any) => request<any>(`/admin/site/site-pages/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(d) }),
    publishSitePage: (slug: string) => request<any>(`/admin/site/site-pages/${encodeURIComponent(slug)}/publish`, { method: 'POST' }),

    getHomepageSections: () => request<any>('/admin/site/homepage-sections'),
    updateHomepageSection: (key: string, d: any) => request<any>(`/admin/site/homepage-sections/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(d) }),

    getNavigation: () => request<any>('/admin/site/navigation'),
    createNavigationItem: (d: any) => request<any>('/admin/site/navigation', { method: 'POST', body: JSON.stringify(d) }),
    updateNavigationItem: (id: string, d: any) => request<any>(`/admin/site/navigation/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    deleteNavigationItem: (id: string) => request<any>(`/admin/site/navigation/${id}`, { method: 'DELETE' }),

    // ── Public website CMS (custom pages — sandboxed) ──
    getCustomPages: () => request<any>('/admin/site/custom-pages'),
    createCustomPage: (d: { name: string; slug?: string; pageType?: string; description?: string }) =>
      request<any>('/admin/site/custom-pages', { method: 'POST', body: JSON.stringify(d) }),
    getCustomPage: (id: string) => request<any>(`/admin/site/custom-pages/${id}`),
    updateCustomPage: (id: string, d: any) => request<any>(`/admin/site/custom-pages/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    saveCustomPageFile: (id: string, path: string, content: string) =>
      request<any>(`/admin/site/custom-pages/${id}/files/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'PUT', body: JSON.stringify({ content }) }),
    deleteCustomPageFile: (id: string, path: string) =>
      request<any>(`/admin/site/custom-pages/${id}/files/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' }),
    validateCustomPage: (id: string) => request<any>(`/admin/site/custom-pages/${id}/validate`, { method: 'POST' }),
    publishCustomPage: (id: string) => request<any>(`/admin/site/custom-pages/${id}/publish`, { method: 'POST' }),
    unpublishCustomPage: (id: string) => request<any>(`/admin/site/custom-pages/${id}/unpublish`, { method: 'POST' }),
    archiveCustomPage: (id: string) => request<any>(`/admin/site/custom-pages/${id}/archive`, { method: 'POST' }),
    duplicateCustomPage: (id: string) => request<any>(`/admin/site/custom-pages/${id}/duplicate`, { method: 'POST' }),
    getCustomPageVersions: (id: string) => request<any>(`/admin/site/custom-pages/${id}/versions`),
    restoreCustomPageVersion: (id: string, version: number) =>
      request<any>(`/admin/site/custom-pages/${id}/versions/${version}/restore`, { method: 'POST' }),
    getCustomPagePreviewToken: (id: string) => request<any>(`/admin/site/custom-pages/${id}/preview-token`),
  },

  // Teacher
  teacher: {
    dashboard: () => request<any>('/teacher/dashboard'),
    analytics: () => request<any>('/teacher/analytics'),
    getBatches: () => request<any>('/teacher/batches'),
    getMaterials: () => request<any>('/teacher/materials'),
    uploadMaterial: (data: any) => request<any>('/teacher/materials', { method: 'POST', body: JSON.stringify(data) }),
    getLiveClasses: () => request<any>('/teacher/live-classes'),
    createLiveClass: (data: any) => request<any>('/teacher/live-classes', { method: 'POST', body: JSON.stringify(data) }),
    updateLiveClass: (id: string, data: any) => request<any>(`/teacher/live-classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteLiveClass: (id: string) => request<any>(`/teacher/live-classes/${id}`, { method: 'DELETE' }),
    getTests: () => request<any>('/teacher/tests'),
    createTest: (data: any) => request<any>('/teacher/tests', { method: 'POST', body: JSON.stringify(data) }),
    updateTest: (id: string, data: any) => request<any>(`/teacher/tests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getTestQuestions: (testId: string) => request<any>(`/teacher/tests/${testId}/questions`),
    saveTestQuestions: (testId: string, questions: any[]) => request<any>(`/teacher/tests/${testId}/questions`, { method: 'POST', body: JSON.stringify({ questions }) }),
    getTestResults: (testId: string) => request<any>(`/teacher/tests/${testId}/results`),
    getTestSubmissions: (testId: string) => request<any>(`/teacher/tests/${testId}/submissions`),
    gradeTestSubmission: (testId: string, submissionId: string, data: any) =>
      request<any>(`/teacher/tests/${testId}/submissions/${submissionId}/grade`, { method: 'PATCH', body: JSON.stringify(data) }),
    getAssignments: () => request<any>('/teacher/assignments'),
    createAssignment: (data: any) => request<any>('/teacher/assignments', { method: 'POST', body: JSON.stringify(data) }),
    getAssignmentSubmissions: (assignmentId: string) => request<any>(`/teacher/assignments/${assignmentId}/submissions`),
    gradeSubmission: (assignmentId: string, submissionId: string, data: any) =>
      request<any>(`/teacher/assignments/${assignmentId}/submissions/${submissionId}/grade`, { method: 'PATCH', body: JSON.stringify(data) }),
    getDoubts: () => request<any>('/teacher/doubts'),
    replyDoubt: (doubtId: string, reply: string) => request<any>(`/teacher/doubts/${doubtId}/reply`, { method: 'POST', body: JSON.stringify({ reply }) }),
    getProfile: () => request<any>('/auth/me'),
    updateProfile: (data: { name?: string; phone?: string }) => request<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Student
  student: {
    dashboard: () => request<any>('/student/dashboard'),
    getCourses: () => request<any>('/student/courses'),
    getMaterials: () => request<any>('/student/materials'),
    getLiveClasses: () => request<any>('/student/live-classes'),
    getTests: () => request<any>('/student/tests'),
    getTestQuestions: (testId: string) => request<any>(`/student/tests/${testId}/questions`),
    submitTest: (testId: string, answers: any[]) => request<any>(`/student/tests/${testId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
    getResults: () => request<any>('/student/results'),
    getAssignments: () => request<any>('/student/assignments'),
    submitAssignment: (id: string, data: any) => request<any>(`/student/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),
    getDoubts: () => request<any>('/student/doubts'),
    postDoubt: (data: any) => request<any>('/student/doubts', { method: 'POST', body: JSON.stringify(data) }),
    getFees: () => request<any>('/student/fees'),
    getFeeReceipt: (feeId: string) => request<any>(`/student/fees/${feeId}/receipt`),
    getProfile: () => request<any>('/student/profile'),
    updateProfile: (data: any) => request<any>('/student/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },
};

// ── Public website client (unauthenticated) ────────────────────────────────
// The public site only ever reads published content; contact submissions are
// validated + rate-limited on the server.
async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}/public${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) },
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : data.error || 'Request failed');
  }
  return data as T;
}

export const publicSite = {
  status: () => publicRequest<{ success: boolean; data: any }>('/status'),
  home: () => publicRequest<{ success: boolean; data: any }>('/home'),
  config: () => publicRequest<{ success: boolean; data: any }>('/config'),
  courses: () => publicRequest<{ success: boolean; data: any }>('/courses'),
  faculty: () => publicRequest<{ success: boolean; data: any }>('/faculty'),
  notices: () => publicRequest<{ success: boolean; data: any }>('/notices'),
  events: () => publicRequest<{ success: boolean; data: any }>('/events'),
  eventBySlug: (slug: string) => publicRequest<{ success: boolean; data: any }>(`/events/${encodeURIComponent(slug)}`),
  admissions: () => publicRequest<{ success: boolean; data: any }>('/admissions'),
  fees: () => publicRequest<{ success: boolean; data: any }>('/fees'),
  achievements: (category?: string) => publicRequest<{ success: boolean; data: any }>(`/achievements${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  results: (exam?: string) => publicRequest<{ success: boolean; data: any }>(`/results${exam ? `?exam=${encodeURIComponent(exam)}` : ''}`),
  gallery: (category?: string) => publicRequest<{ success: boolean; data: any }>(`/gallery${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  reviews: (limit = 20) => publicRequest<{ success: boolean; data: any }>(`/reviews?limit=${limit}`),
  blog: (page = 1, limit = 9) => publicRequest<{ success: boolean; data: any }>(`/blog?page=${page}&limit=${limit}`),
  blogBySlug: (slug: string) => publicRequest<{ success: boolean; data: any }>(`/blog/${encodeURIComponent(slug)}`),
  faqs: () => publicRequest<{ success: boolean; data: any }>('/faqs'),
  pages: () => publicRequest<{ success: boolean; data: any }>('/pages'),
  pageBySlug: (slug: string) => publicRequest<{ success: boolean; data: any }>(`/pages/${encodeURIComponent(slug)}`),
  customPage: (slug: string, token?: string) =>
    publicRequest<{ success: boolean; data: any }>(`/custom/${encodeURIComponent(slug)}${token ? `?token=${encodeURIComponent(token)}` : ''}`),
  customFileUrl: (slug: string, path: string, draft?: boolean, token?: string) =>
    `${BASE_URL}/public/custom/${encodeURIComponent(slug)}/files/${path.split('/').map(encodeURIComponent).join('/')}${draft && token ? `?token=${encodeURIComponent(token)}` : ''}`,
  submitEnquiry: (data: { name: string; email: string; phone?: string; subject: string; message: string; sourcePage?: string }) =>
    publicRequest<{ success: boolean; message: string }>('/enquiries', { method: 'POST', body: JSON.stringify(data) }),
  submitReview: (data: { name: string; relationship?: string; rating: number; review: string; consent: boolean }) =>
    publicRequest<{ success: boolean; message: string }>('/reviews', { method: 'POST', body: JSON.stringify(data) }),
};
