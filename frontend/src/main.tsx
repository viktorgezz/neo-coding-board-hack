import { StrictMode } from 'react';
import '@/styles/theme.css';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/useAuth';
import { router } from '@/router/index';

// Быстрый костыль для деплоя: перенаправляем все относительные API-запросы напрямую на нужные порты
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  if (typeof resource === 'string') {
    if (resource.startsWith('/api/')) {
      resource = 'http://111.88.127.208:8080' + resource;
    } else if (resource.startsWith('/analytics-api/')) {
      resource = 'http://111.88.127.208:8000' + resource;
    } else if (resource.startsWith('/tasks-api/')) {
      resource = 'http://111.88.127.208:8001' + resource;
    }
  }
  return originalFetch(resource, config);
};

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
