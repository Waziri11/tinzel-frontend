import BackgroundUploads from './components/designer/BackgroundUploads.jsx';
import SecurityVerification from './components/common/SecurityVerification.jsx';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ConfigProvider } from 'antd';
import { tinzelAntdTheme } from './theme/antdTheme.js';
import './index.css';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { ConfirmProvider } from './components/common/ConfirmDialog.jsx';
import { installNavigationGuard } from './navigation/location.js';

installNavigationGuard();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <ConfigProvider theme={tinzelAntdTheme}>
        <ConfirmProvider><App /><BackgroundUploads /><SecurityVerification /></ConfirmProvider>
      </ConfigProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
