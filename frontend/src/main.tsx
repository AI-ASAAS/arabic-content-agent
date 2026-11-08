import './asaas-ui/styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Ambient, ToastProvider } from './asaas-ui';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Ambient />
      <App />
    </ToastProvider>
  </StrictMode>,
);
