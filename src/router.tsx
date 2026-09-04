import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import Clients from '@/pages/Clients';
import Logs from '@/pages/Logs';
import History from '@/pages/History';
import Settings from '@/pages/Settings';

export const router = createBrowserRouter([
  { path: '/', element: <Layout />, children: [
    { index: true, element: <Navigate to="/logs" replace /> },
    { path: 'clients',  element: <Clients /> },
    { path: 'logs',     element: <Logs /> },
    { path: 'history',  element: <History /> },
    { path: 'settings', element: <Settings /> },
  ]},
]);
