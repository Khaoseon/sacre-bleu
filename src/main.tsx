import React from 'react';
import ReactDOM from 'react-dom/client';
import Root from './Root';
import { AppUpdateHost } from './AppUpdates';
import './style.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
    <AppUpdateHost />
  </React.StrictMode>,
);
