import React from 'react';
import { useSearchParams } from 'react-router';
import { PublicLayout } from './PublicLayout';
import { HomePage } from './HomePage';
import { CoursesPage } from './CoursesPage';
import { FacultyPage } from './FacultyPage';
import { NoticesPage } from './NoticesPage';
import { EventsPage } from './EventsPage';
import { ContactPage } from './ContactPage';

const PAGES: Record<string, React.FC> = {
  home: HomePage,
  courses: CoursesPage,
  faculty: FacultyPage,
  notices: NoticesPage,
  events: EventsPage,
  contact: ContactPage,
};

/**
 * Renders a REAL public page for the admin Site Preview iframe.
 * ?page=home            → live content
 * ?page=home&draft=1    → CMS draft content for that section
 */
export const PreviewPage: React.FC = () => {
  const [params] = useSearchParams();
  const page = params.get('page') || 'home';
  const Page = PAGES[page] || HomePage;

  return (
    <PublicLayout>
      <Page />
    </PublicLayout>
  );
};