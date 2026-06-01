import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminPage from './admin/AdminPage.tsx';
import './index.css';

const isAdminRoute =
  window.location.pathname.endsWith('/admin') ||
  window.location.hash === '#/admin' ||
  new URLSearchParams(window.location.search).has('admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute ? <AdminPage /> : <App />}
  </StrictMode>
);
