import React from 'react';
import PlansPage from './pages/plans/PlansPage.jsx';
import ModelsPage from './pages/models/ModelsPage.jsx';
import ChangelogPage from './pages/changelog/ChangelogPage.jsx';
import FaqPage from './pages/faq/FaqPage.jsx';
import ContactPage from './pages/contact/ContactPage.jsx';
import StatusPage from './pages/status/StatusPage.jsx';
import CopyrightPage from './pages/copyright/copyrightPage.tsx';
import LegalPage from './pages/legal/layout.jsx';
import Home from './pages/home/homePage.jsx';

export const publicPageRoutes = [
  { path: '', element: <Home />},
  { path: '/privacy', element: <LegalPage type="privacy" />},
  { path: '/terms', element: <LegalPage type="terms" />},
  { path: '/plans', element: <PlansPage /> },
  { path: '/models', element: <ModelsPage /> },
  { path: '/changelog', element: <ChangelogPage /> },
  { path: '/faq', element: <FaqPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/status', element: <StatusPage /> },
  { path: '/copyright', element: <CopyrightPage />},
];
