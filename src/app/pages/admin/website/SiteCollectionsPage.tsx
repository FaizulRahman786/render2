import React from 'react';
import { GraduationCap, Wallet, Trophy, Award, Images, FileText, HelpCircle, Star, Check, X, UserCircle, BookOpen } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { SiteContentManager, type EntityConfig } from './SiteContentManager';

// ── Structured content collections for the public website ──────────────────
// Each export wires the generic manager to the admin siteContent API.

const admissionsConfig: EntityConfig = {
  key: 'admissions',
  title: 'Admissions',
  singular: 'Admission',
  description: 'Admission rounds appear on the public Admissions page. Publish to make live.',
  icon: GraduationCap,
  api: {
    list: (p) => api.admin.getAdmissions(p),
    create: (d) => api.admin.createAdmission(d),
    update: (id, d) => api.admin.updateAdmission(id, d),
    publish: (id) => api.admin.publishAdmission(id),
    unpublish: (id) => api.admin.unpublishAdmission(id),
    archive: (id) => api.admin.archiveAdmission(id),
  },
  fields: [
    { key: 'session', label: 'Session', type: 'text', required: true, placeholder: 'e.g. 2026–27', colSpan: 1 },
    { key: 'status', label: 'Admission status', type: 'select', options: [
      { value: 'upcoming', label: 'Upcoming' }, { value: 'open', label: 'Open' },
      { value: 'closing_soon', label: 'Closing soon' }, { value: 'closed', label: 'Closed' },
    ] },
    { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Class XI Science Admission 2026', colSpan: 2 },
    { key: 'subtitle', label: 'Subtitle', type: 'text', colSpan: 2 },
    { key: 'description', label: 'Description', type: 'textarea', rows: 3, colSpan: 2 },
    { key: 'openingDate', label: 'Opening date', type: 'date' },
    { key: 'closingDate', label: 'Closing date', type: 'date' },
    { key: 'eligibility', label: 'Eligibility', type: 'textarea', rows: 3, colSpan: 2 },
    { key: 'documents', label: 'Required documents', type: 'list', hint: 'One document per line', colSpan: 2 },
    { key: 'process', label: 'Admission process', type: 'list', hint: 'One step per line', colSpan: 2 },
    { key: 'programs', label: 'Programs offered', type: 'list', hint: 'One program per line', colSpan: 2 },
    { key: 'instructions', label: 'Instructions', type: 'textarea', rows: 3, colSpan: 2 },
    { key: 'contactPhone', label: 'Contact phone', type: 'text' },
    { key: 'contactEmail', label: 'Contact email', type: 'text' },
    { key: 'ctaLabel', label: 'Button label', type: 'text', placeholder: 'Apply for Admission' },
    { key: 'ctaUrl', label: 'Button link', type: 'text', hint: 'Absolute URL or /contact' },
    { key: 'featured', label: 'Featured round', type: 'checkbox', hint: 'Highlighted on the homepage' },
    { key: 'sortOrder', label: 'Sort order', type: 'number' },
  ],
  searchPlaceholder: 'Search by session or title...',
  listTitle: (r) => r.session ? `${r.session}${r.status ? ` — ${String(r.status).replace('_', ' ')}` : ''}` : 'Admission round',
  listSubtitle: (r) => r.title || r.subtitle || '',
  listMeta: (r) => [r.openingDate ? `Opens ${new Date(r.openingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : '', r.closingDate ? `Closes ${new Date(r.closingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''].filter(Boolean),
};

const feesConfig: EntityConfig = {
  key: 'fees',
  title: 'Fee structures',
  singular: 'Fee structure',
  description: 'Published fee structures appear on the public Fees page.',
  icon: Wallet,
  api: {
    list: (p) => api.admin.getFeeStructures(p),
    create: (d) => api.admin.createFeeStructure(d),
    update: (id, d) => api.admin.updateFeeStructure(id, d),
    publish: (id) => api.admin.publishFeeStructure(id),
    unpublish: (id) => api.admin.unpublishFeeStructure(id),
    archive: (id) => api.admin.archiveFeeStructure(id),
  },
  fields: [
    { key: 'session', label: 'Session', type: 'text', required: true, placeholder: 'e.g. 2026–27' },
    { key: 'classLevel', label: 'Class / program', type: 'text', required: true, placeholder: 'e.g. Class 9' },
    { key: 'admissionFee', label: 'Admission fee (₹)', type: 'number' },
    { key: 'tuitionFee', label: 'Tuition fee (₹)', type: 'number' },
    { key: 'monthlyFee', label: 'Monthly fee (₹)', type: 'number' },
    { key: 'examFee', label: 'Exam fee (₹)', type: 'number' },
    { key: 'transportFee', label: 'Transport fee (₹)', type: 'number' },
    { key: 'otherCharges', label: 'Other charges (₹)', type: 'number' },
    { key: 'totalFee', label: 'Total fee (₹)', type: 'number' },
    { key: 'discountInfo', label: 'Discounts / scholarships', type: 'textarea', rows: 2, colSpan: 2 },
    { key: 'paymentSchedule', label: 'Payment schedule', type: 'textarea', rows: 2, colSpan: 2 },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 2, colSpan: 2 },
  ],
  searchPlaceholder: 'Search by session or class...',
  listTitle: (r) => `${r.session} · ${r.classLevel}`,
  listSubtitle: (r) => r.notes || (r.totalFee ? `Total ₹${Number(r.totalFee).toLocaleString('en-IN')}` : ''),
  listMeta: (r) => [r.totalFee ? `Total ₹${Number(r.totalFee).toLocaleString('en-IN')}` : ''].filter(Boolean),
};

const achievementsConfig: EntityConfig = {
  key: 'achievements',
  title: 'Achievements',
  singular: 'Achievement',
  description: 'Student and institute achievements appear on the public Achievements page.',
  icon: Trophy,
  api: {
    list: (p) => api.admin.getAchievements(p),
    create: (d) => api.admin.createAchievement(d),
    update: (id, d) => api.admin.updateAchievement(id, d),
    publish: (id) => api.admin.publishAchievement(id),
    unpublish: (id) => api.admin.unpublishAchievement(id),
    archive: (id) => api.admin.archiveAchievement(id),
  },
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. State Topper — Class X Boards' },
    { key: 'description', label: 'Description', type: 'textarea', rows: 3, colSpan: 2 },
    { key: 'category', label: 'Category', type: 'select', options: [
      { value: 'academic', label: 'Academic' }, { value: 'olympiad', label: 'Olympiad' },
      { value: 'sports', label: 'Sports' }, { value: 'cultural', label: 'Cultural' }, { value: 'other', label: 'Other' },
    ] },
    { key: 'achievementDate', label: 'Date', type: 'date' },
    { key: 'studentName', label: 'Student name', type: 'text' },
    { key: 'level', label: 'Level', type: 'select', options: [
      { value: 'national', label: 'National' }, { value: 'state', label: 'State' },
      { value: 'district', label: 'District' }, { value: 'school', label: 'School' }, { value: 'international', label: 'International' },
    ] },
    { key: 'awardOrganization', label: 'Awarding body', type: 'text' },
    { key: 'imageUrl', label: 'Image URL', type: 'text', colSpan: 2, placeholder: 'https://... (optional)' },
    { key: 'featured', label: 'Featured', type: 'checkbox', hint: 'Shown on the homepage highlights' },
    { key: 'sortOrder', label: 'Sort order', type: 'number' },
  ],
  searchPlaceholder: 'Search achievements...',
  listMeta: (r) => [r.studentName, r.level, r.category, r.achievementDate ? new Date(r.achievementDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''].filter(Boolean),
};

const resultsConfig: EntityConfig = {
  key: 'results',
  title: 'Public results',
  singular: 'Result',
  description: 'Published results appear on the public Results page. Only share information students have consented to publicise.',
  icon: Award,
  api: {
    list: (p) => api.admin.getPublicResults(p),
    create: (d) => api.admin.createPublicResult(d),
    update: (id, d) => api.admin.updatePublicResult(id, d),
    publish: (id) => api.admin.publishPublicResult(id),
    unpublish: (id) => api.admin.unpublishPublicResult(id),
    archive: (id) => api.admin.archivePublicResult(id),
  },
  fields: [
    { key: 'studentName', label: 'Student name', type: 'text', required: true },
    { key: 'session', label: 'Session', type: 'text', placeholder: 'e.g. 2025–26' },
    { key: 'exam', label: 'Exam / board', type: 'text', placeholder: 'e.g. CBSE Class X' },
    { key: 'classLevel', label: 'Class', type: 'text', placeholder: 'e.g. Class 10' },
    { key: 'resultType', label: 'Type', type: 'select', options: [
      { value: 'top_performer', label: 'Top performer' }, { value: 'distinction', label: 'Distinction' },
      { value: 'scholarship', label: 'Scholarship' }, { value: 'other', label: 'Other' },
    ] },
    { key: 'rank', label: 'Rank', type: 'text', placeholder: 'e.g. 1st' },
    { key: 'percentage', label: 'Percentage', type: 'number' },
    { key: 'grade', label: 'Grade', type: 'text', placeholder: 'e.g. A+' },
    { key: 'displayDate', label: 'Display date', type: 'date' },
    { key: 'description', label: 'Description', type: 'textarea', rows: 2, colSpan: 2 },
    { key: 'featured', label: 'Featured', type: 'checkbox', hint: 'Highlighted on the homepage' },
    { key: 'sortOrder', label: 'Sort order', type: 'number' },
  ],
  searchPlaceholder: 'Search students, exams or classes...',
  listTitle: (r) => r.studentName || 'Student result',
  listSubtitle: (r) => r.exam || r.description || '',
  listMeta: (r) => [r.rank ? `Rank ${r.rank}` : '', r.percentage ? `${r.percentage}%` : '', r.grade, r.session].filter(Boolean),
};

const galleryConfig: EntityConfig = {
  key: 'gallery',
  title: 'Gallery',
  singular: 'Gallery item',
  description: 'Published photos appear in the public Gallery.',
  icon: Images,
  api: {
    list: (p) => api.admin.getGalleryItems(p),
    create: (d) => api.admin.createGalleryItem(d),
    update: (id, d) => api.admin.updateGalleryItem(id, d),
    publish: (id) => api.admin.publishGalleryItem(id),
    unpublish: (id) => api.admin.unpublishGalleryItem(id),
    archive: (id) => api.admin.archiveGalleryItem(id),
  },
  fields: [
    { key: 'imageUrl', label: 'Image URL', type: 'text', required: true, colSpan: 2, placeholder: 'https://... (use the Media Library)' },
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'caption', label: 'Caption', type: 'textarea', rows: 2, colSpan: 2 },
    { key: 'altText', label: 'Alt text', type: 'text', hint: 'Descriptive text for screen readers' },
    { key: 'category', label: 'Category', type: 'select', options: [
      { value: 'campus', label: 'Campus' }, { value: 'classroom', label: 'Classroom' },
      { value: 'events', label: 'Events' }, { value: 'sports', label: 'Sports' },
      { value: 'results', label: 'Results' }, { value: 'other', label: 'Other' },
    ] },
    { key: 'takenAt', label: 'Taken on', type: 'date' },
    { key: 'featured', label: 'Featured', type: 'checkbox' },
    { key: 'sortOrder', label: 'Sort order', type: 'number' },
  ],
  searchPlaceholder: 'Search gallery items...',
  listSubtitle: (r) => r.caption || r.title || '',
  listMeta: (r) => [r.category].filter(Boolean),
};

const blogConfig: EntityConfig = {
  key: 'blog',
  title: 'Blog posts',
  singular: 'Blog post',
  description: 'Published posts appear on the public Blog. Posts are saved as drafts until you publish them.',
  icon: FileText,
  api: {
    list: (p) => api.admin.getBlogPosts(p),
    create: (d) => api.admin.createBlogPost(d),
    update: (id, d) => api.admin.updateBlogPost(id, d),
    publish: (id) => api.admin.publishBlogPost(id),
    unpublish: (id) => api.admin.unpublishBlogPost(id),
    archive: (id) => api.admin.archiveBlogPost(id),
  },
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true, colSpan: 2 },
    { key: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2, colSpan: 2, hint: 'Short summary shown in cards' },
    { key: 'content', label: 'Content', type: 'textarea', rows: 10, colSpan: 2, hint: 'Plain text or HTML — rendered safely on the public site' },
    { key: 'category', label: 'Category', type: 'text', placeholder: 'e.g. Study tips' },
    { key: 'tags', label: 'Tags', type: 'list', hint: 'One tag per line' },
    { key: 'coverImage', label: 'Cover image URL', type: 'text', colSpan: 2 },
    { key: 'author', label: 'Author', type: 'text' },
    { key: 'featured', label: 'Featured', type: 'checkbox' },
    { key: 'publishAt', label: 'Schedule publish date', type: 'date' },
  ],
  searchPlaceholder: 'Search posts...',
  listMeta: (r) => [r.category, r.author, r.publishedAt ? `Published ${new Date(r.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''].filter(Boolean),
};

const faqsConfig: EntityConfig = {
  key: 'faqs',
  title: 'FAQs',
  singular: 'FAQ',
  description: 'Published FAQs appear on the public FAQs page.',
  icon: HelpCircle,
  api: {
    list: (p) => api.admin.getFaqs(p),
    create: (d) => api.admin.createFaq(d),
    update: (id, d) => api.admin.updateFaq(id, d),
    publish: (id) => api.admin.publishFaq(id),
    unpublish: (id) => api.admin.unpublishFaq(id),
    archive: (id) => api.admin.archiveFaq(id),
  },
  fields: [
    { key: 'category', label: 'Category', type: 'text', placeholder: 'e.g. Admissions' },
    { key: 'sortOrder', label: 'Sort order', type: 'number' },
    { key: 'question', label: 'Question', type: 'textarea', rows: 2, required: true, colSpan: 2 },
    { key: 'answer', label: 'Answer', type: 'textarea', rows: 4, required: true, colSpan: 2 },
  ],
  searchPlaceholder: 'Search FAQs...',
  listTitle: (r) => r.question,
  listSubtitle: (r) => r.answer,
  listMeta: (r) => [r.category].filter(Boolean),
};

const reviewsConfig: EntityConfig = {
  key: 'reviews',
  title: 'Reviews',
  singular: 'Review',
  description: 'Visitor reviews are moderated before they appear on the public site. Approve or reject pending reviews.',
  icon: Star,
  api: {
    list: (p) => api.admin.getReviews(p),
    create: (d) => api.admin.createReview(d),
    update: (id, d) => api.admin.updateReview(id, d),
    archive: (id) => api.admin.archiveReview(id),
  },
  statusField: 'status',
  statusOptions: [
    { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }, { value: 'archived', label: 'Archived' },
  ],
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'relationship', label: 'Relationship', type: 'select', options: [
      { value: 'student', label: 'Student' }, { value: 'parent', label: 'Parent' },
      { value: 'teacher', label: 'Teacher' }, { value: 'alumni', label: 'Alumni' }, { value: 'other', label: 'Other' },
    ] },
    { key: 'rating', label: 'Rating', type: 'select', options: [
      { value: '5', label: '5 ★' }, { value: '4', label: '4 ★' }, { value: '3', label: '3 ★' },
      { value: '2', label: '2 ★' }, { value: '1', label: '1 ★' },
    ], deserialize: (r) => String(r.rating), serialize: (v) => Number(v) },
    { key: 'review', label: 'Review', type: 'textarea', rows: 3, required: true, colSpan: 2 },
    { key: 'featured', label: 'Featured', type: 'checkbox', hint: 'Shown on the homepage' },
    { key: 'sortOrder', label: 'Sort order', type: 'number' },
  ],
  searchPlaceholder: 'Search reviews...',
  listTitle: (r) => r.name,
  listSubtitle: (r) => r.review,
  listMeta: (r) => [r.relationship, `${r.rating}★`, r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''].filter(Boolean),
  extraActions: (row, reload) =>
    row.status === 'pending'
      ? [
          {
            label: 'Approve', icon: Check, className: 'text-green-600 hover:text-green-700',
            onClick: () => api.admin.moderateReview(row.id, 'approved').then((res: any) => { toast.success(res?.message || 'Approved'); reload(); }).catch((e: any) => toast.error(e?.message || 'Failed')),
          },
          {
            label: 'Reject', icon: X, className: 'text-red-500 hover:text-red-600',
            onClick: () => api.admin.moderateReview(row.id, 'rejected').then((res: any) => { toast.success(res?.message || 'Rejected'); reload(); }).catch((e: any) => toast.error(e?.message || 'Failed')),
          },
        ]
      : [],
};

const facultyConfig: EntityConfig = {
  key: 'faculty',
  title: 'Faculty',
  singular: 'Faculty member',
  description: 'Public faculty profiles appear on the public Faculty page. Publish to make live.',
  icon: UserCircle,
  api: {
    list: (p) => api.admin.getFaculty(p),
    create: (d) => api.admin.createFaculty(d),
    update: (id, d) => api.admin.updateFaculty(id, d),
    publish: (id) => api.admin.publishFaculty(id),
    unpublish: (id) => api.admin.unpublishFaculty(id),
    archive: (id) => api.admin.archiveFaculty(id),
  },
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Dr. A. Sharma' },
    { key: 'designation', label: 'Designation', type: 'text', required: true, placeholder: 'e.g. Professor of Physics' },
    { key: 'department', label: 'Department', type: 'text', placeholder: 'e.g. Science' },
    { key: 'subject', label: 'Subject', type: 'text', placeholder: 'e.g. Physics' },
    { key: 'qualification', label: 'Qualification', type: 'text', placeholder: 'e.g. PhD, M.Sc' },
    { key: 'experience', label: 'Experience', type: 'text', placeholder: 'e.g. 15 years' },
    { key: 'specialization', label: 'Specialization', type: 'text', placeholder: 'e.g. Quantum Mechanics' },
    { key: 'bio', label: 'Bio', type: 'textarea', rows: 3, colSpan: 2 },
    { key: 'profileImage', label: 'Profile Image URL', type: 'text', colSpan: 2, placeholder: 'https://... (use Media Library)' },
    { key: 'featured', label: 'Featured', type: 'checkbox', hint: 'Shown on homepage' },
    { key: 'displayOrder', label: 'Display Order', type: 'number' },
  ],
  searchPlaceholder: 'Search faculty...',
  listTitle: (r) => r.name || 'Faculty Member',
  listSubtitle: (r) => r.designation || r.subject || '',
  listMeta: (r) => [r.department, r.designation, r.experience].filter(Boolean),
};

const coursesConfig: EntityConfig = {
  key: 'courses',
  title: 'Courses',
  singular: 'Course',
  description: 'Public course listings appear on the public Courses page. Publish to make live.',
  icon: BookOpen,
  api: {
    list: (p) => api.admin.getSiteCourses(p),
    create: (d) => api.admin.createSiteCourse(d),
    update: (id, d) => api.admin.updateSiteCourse(id, d),
    publish: (id) => api.admin.publishSiteCourse(id),
    unpublish: (id) => api.admin.unpublishSiteCourse(id),
    archive: (id) => api.admin.archiveSiteCourse(id),
  },
  fields: [
    { key: 'name', label: 'Course Name', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. JEE Advanced Preparation' },
    { key: 'shortDescription', label: 'Short Description', type: 'textarea', rows: 2, colSpan: 2 },
    { key: 'description', label: 'Full Description', type: 'textarea', rows: 4, colSpan: 2 },
    { key: 'duration', label: 'Duration', type: 'text', placeholder: 'e.g. 2 Years' },
    { key: 'eligibility', label: 'Eligibility', type: 'textarea', rows: 2, colSpan: 2 },
    { key: 'level', label: 'Level', type: 'select', options: [
      { value: 'foundation', label: 'Foundation (Class 8-10)' },
      { value: 'board', label: 'Board Exams (Class 10/12)' },
      { value: 'competitive', label: 'Competitive Exams (JEE/NEET)' },
      { value: 'other', label: 'Other' },
    ] },
    { key: 'subjects', label: 'Subjects', type: 'list', hint: 'One subject per line', colSpan: 2 },
    { key: 'highlights', label: 'Highlights', type: 'list', hint: 'One highlight per line', colSpan: 2 },
    { key: 'feeReference', label: 'Fee Reference', type: 'text', placeholder: 'e.g. ₹1,50,000' },
    { key: 'admissionAvailable', label: 'Admission Open', type: 'checkbox' },
    { key: 'imageUrl', label: 'Course Image URL', type: 'text', colSpan: 2, placeholder: 'https://... (use Media Library)' },
    { key: 'featured', label: 'Featured', type: 'checkbox', hint: 'Shown on homepage' },
    { key: 'displayOrder', label: 'Display Order', type: 'number' },
  ],
  searchPlaceholder: 'Search courses...',
  listTitle: (r) => r.name || 'Course',
  listSubtitle: (r) => r.shortDescription || r.level || '',
  listMeta: (r) => [r.level, r.duration, r.feeReference].filter(Boolean),
};

export const AdmissionsManagerPage: React.FC = () => <SiteContentManager config={admissionsConfig} />;
export const FeeStructuresManagerPage: React.FC = () => <SiteContentManager config={feesConfig} />;
export const AchievementsManagerPage: React.FC = () => <SiteContentManager config={achievementsConfig} />;
export const ResultsManagerPage: React.FC = () => <SiteContentManager config={resultsConfig} />;
export const GalleryManagerPage: React.FC = () => <SiteContentManager config={galleryConfig} />;
export const BlogManagerPage: React.FC = () => <SiteContentManager config={blogConfig} />;
export const FaqsManagerPage: React.FC = () => <SiteContentManager config={faqsConfig} />;
export const ReviewsManagerPage: React.FC = () => <SiteContentManager config={reviewsConfig} />;
export const FacultyManagerPage: React.FC = () => <SiteContentManager config={facultyConfig} />;
export const CoursesManagerPage: React.FC = () => <SiteContentManager config={coursesConfig} />;
