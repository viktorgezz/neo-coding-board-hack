import { StrictMode } from 'react';
import '@/styles/theme.css';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/useAuth';
import { router } from '@/router/index';

const queryClient = new QueryClient();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
