import React, { useState } from 'react';
import { ConfigProvider, Button } from 'antd';
import {
  BookOutlined,
  UserOutlined,
  HomeOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { tinzelAntdTheme } from './theme/antdTheme';
import LandingHero from './components/landing/LandingHero';
import OrderFollowUpModal from './components/landing/OrderFollowUpModal';
import MagazineShowcase from './components/client/MagazineShowcase';
import ClientTrackingPortal from './components/client/ClientTrackingPortal';
import StaffWorkspace from './components/common/StaffWorkspace';
import TinzelLogo from './components/common/TinzelLogo';
import LanguageSelect from './components/landing/LanguageSelect';
import LanguageSwitcher from './components/common/LanguageSwitcher';
import { useLanguage } from './i18n/LanguageContext';

export default function App() {
  const { lang, t } = useLanguage();
  const initialView = window.location.pathname.startsWith('/staff') ? 'staff' : window.location.pathname.startsWith('/track') ? 'tracking' : 'home';
  const [currentView, setCurrentView] = useState(initialView); // 'home' | 'showcase' | 'tracking' | 'staff'
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const navigateView = (view, path) => { window.history.pushState({}, '', path); setCurrentView(view); };

  const handleFollowUpSuccess = () => {
    setFollowUpModalOpen(false);
    navigateView('tracking', '/track');
  };

  // First page: visitors must pick a language (English or Swahili) before anything else.
  if (!lang) {
    return (
      <ConfigProvider theme={tinzelAntdTheme}>
        <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF9', padding: '24px 20px' }}>
          <LanguageSelect />
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={tinzelAntdTheme}>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FAFAF9',
        }}
      >
        {/* Navigation Bar when not on home or staff workspace view */}
        {currentView !== 'home' && currentView !== 'staff' && (
          <header
            style={{
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #E7E5E4',
              padding: '0 24px',
              position: 'sticky',
              top: 0,
              zIndex: 50,
            }}
          >
            <div
              style={{
                maxWidth: '1280px',
                margin: '0 auto',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                onClick={() => setCurrentView('home')}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              >
                <TinzelLogo variant="full" height={36} />
              </div>

              {/* Right Action Buttons (hidden on editorial catalogue showcase for pure minimalism) */}
              {currentView !== 'showcase' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LanguageSwitcher />
                  <Button
                    onClick={() => setCurrentView('home')}
                    icon={<HomeOutlined />}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E7E5E4',
                      color: '#1C1917',
                      fontWeight: '600',
                      fontSize: '13px',
                    }}
                  >
                    {t('nav.home')}
                  </Button>

                  {currentView !== 'tracking' && (
                    <Button
                      onClick={() => setFollowUpModalOpen(true)}
                      icon={<SearchOutlined style={{ color: '#B45309' }} />}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#B45309',
                        color: '#B45309',
                        fontWeight: '600',
                        fontSize: '13px',
                      }}
                    >
                      {t('nav.followUp')}
                    </Button>
                  )}

                  {currentView !== 'staff' && (
                    <Button
                      onClick={() => { window.history.pushState({}, '', '/staff'); setCurrentView('staff'); }}
                      icon={<UserOutlined style={{ color: '#991B1B' }} />}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E7E5E4',
                        color: '#1C1917',
                        fontWeight: '600',
                        fontSize: '13px',
                      }}
                    >
                      {t('nav.staffLogin')}
                    </Button>
                  )}
                </div>
              )}
              {currentView === 'showcase' && <LanguageSwitcher />}
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            padding: currentView === 'staff' ? 0 : currentView === 'home' ? '24px 20px' : '32px 20px',
          }}
        >
          {/* View 1: Home (Editorial Landing Hero with 2 Big Options) */}
          {currentView === 'home' && (
            <LandingHero
              onSelectNewOrder={() => setCurrentView('showcase')}
              onOpenFollowUp={() => setFollowUpModalOpen(true)}
              onOpenLogin={() => setCurrentView('staff')}
            />
          )}

          {/* View 2: New Magazine Order Showcase */}
          {currentView === 'showcase' && (
            <MagazineShowcase
              onBackToHome={() => setCurrentView('home')}
              onNavigateToTracking={() => setCurrentView('tracking')}
            />
          )}

          {/* View 3: Client Tracking & Proof Review Portal */}
          {currentView === 'tracking' && (
            <div style={{ maxWidth: '960px', margin: '0 auto' }}>
              <ClientTrackingPortal />
            </div>
          )}

          {/* View 4: Staff Workstation with Sidebar Navigation and RBAC */}
          {currentView === 'staff' && (
            <StaffWorkspace onExitToHome={() => navigateView('home', '/')} />
          )}
        </main>

        {/* Magazine Order Follow Up Modal (Asks for Magazine Order Number) */}
        <OrderFollowUpModal
          open={followUpModalOpen}
          onCancel={() => setFollowUpModalOpen(false)}
          onSuccess={handleFollowUpSuccess}
        />

        {/* Subtle Editorial Footer (shown on inner tracking views, removed from minimalist home and staff dashboard) */}
        {currentView !== 'home' && currentView !== 'staff' && (
          <footer
            style={{
              borderTop: '1px solid #E7E5E4',
              backgroundColor: '#FFFFFF',
              padding: '16px 24px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#78716C',
            }}
          >
            {t('footer.text')}
          </footer>
        )}
      </div>
    </ConfigProvider>
  );
}
