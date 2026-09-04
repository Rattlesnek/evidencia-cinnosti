import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { flushClientsForTest } from '@/stores/clientsStore';
import { flushLogsForTest } from '@/stores/logsStore';

window.addEventListener('beforeunload', () => {
  // ponytail: reuse test flush helpers (rovnaká debounce inštancia).
  void flushClientsForTest();
  void flushLogsForTest();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
