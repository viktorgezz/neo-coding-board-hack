import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/auth/useAuth';
import { router } from '@/router/index';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

createRoot(root).render(
  <StrictMode>
    {/*
      AuthProvider wraps RouterProvider so every component in the router tree
      (including AppLayout and route guards) can call useAuth().
      The provider's module-level refs survive React StrictMode double-invokes.
    */}
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
