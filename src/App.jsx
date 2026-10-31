import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Home, Search, User } from 'lucide-react';
import LandingHero from './components/landing/LandingHero';
import TinzelLogo from './components/common/TinzelLogo';
import BrandLoading from './components/common/BrandLoading';
import LanguageSelect from './components/landing/LanguageSelect';
import LanguageSwitcher from './components/common/LanguageSwitcher';
import { useLanguage } from './i18n/LanguageContext';

const OrderFollowUpModal = lazy(() => import('./components/landing/OrderFollowUpModal'));
const MagazineShowcase = lazy(() => import('./components/client/MagazineShowcase'));
const ClientTrackingPortal = lazy(() => import('./components/client/ClientTrackingPortal'));
const StaffWorkspace = lazy(() => import('./components/common/StaffWorkspace'));

export default function App() {
  const { lang, t } = useLanguage();
  const getInitialView = () => {
    const p = window.location.pathname;
    if (p.startsWith('/staff')) return 'staff';
    if (p.startsWith('/track')) return 'tracking';
    if (p.startsWith('/catalogue') || p.startsWith('/showcase')) return 'showcase';
    return 'home';
  };
  const [currentView, setCurrentView] = useState(getInitialView); // 'home' | 'showcase' | 'tracking' | 'staff'
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);

  const navigateView = (view, explicitPath = null) => {
    const path = explicitPath || (
      view === 'staff' ? '/staff' :
      view === 'tracking' ? '/track' :
      view === 'showcase' ? '/catalogue' :
      '/'
    );
    if (window.location.pathname !== path) {
      window.history.pushState({ view }, '', path);
    }
    setCurrentView(view);
  };

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p.startsWith('/staff')) setCurrentView('staff');
      else if (p.startsWith('/track')) setCurrentView('tracking');
      else if (p.startsWith('/catalogue') || p.startsWith('/showcase')) setCurrentView('showcase');
      else setCurrentView('home');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleFollowUpSuccess = () => {
    setFollowUpModalOpen(false);
    navigateView('tracking', '/track');
  };

  // First page: visitors must pick a language (English or Swahili) before anything else.
  if (!lang) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF9', padding: '24px 20px' }}>
        <LanguageSelect />
      </div>
    );
  }

  return (
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
            padding: '0 16px',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              minHeight: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '8px 0',
            }}
          >
            <button
              type="button"
              onClick={() => navigateView('home', '/')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
              aria-label="Tinzel Home"
            >
              <TinzelLogo variant="full" height={36} />
            </button>

            {/* Right Action Buttons (hidden on editorial catalogue showcase for pure minimalism) */}
            {currentView !== 'showcase' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <LanguageSwitcher />
                <button
                  type="button"
                  onClick={() => navigateView('home', '/')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #E7E5E4',
                    backgroundColor: '#FFFFFF',
                    color: '#1C1917',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <Home size={14} />
                  {t('nav.home')}
                </button>

                {currentView !== 'tracking' && (
                  <button
                    type="button"
                    onClick={() => setFollowUpModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #B45309',
                      backgroundColor: '#FFFFFF',
                      color: '#B45309',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <Search size={14} style={{ color: '#B45309' }} />
                    {t('nav.followUp')}
                  </button>
                )}

                {currentView !== 'staff' && (
                  <button
                    type="button"
                    onClick={() => navigateView('staff', '/staff')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #E7E5E4',
                      backgroundColor: '#FFFFFF',
                      color: '#1C1917',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <User size={14} style={{ color: '#991B1B' }} />
                    {t('nav.staffLogin')}
                  </button>
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
        <Suspense fallback={<BrandLoading label="Loading Tinzel..." />}>
          {/* View 1: Home (Editorial Landing Hero with 2 Big Options) */}
          {currentView === 'home' && (
            <LandingHero
              onSelectNewOrder={() => navigateView('showcase', '/catalogue')}
              onOpenFollowUp={() => setFollowUpModalOpen(true)}
              onOpenLogin={() => navigateView('staff', '/staff')}
            />
          )}

          {/* View 2: New Magazine Order Showcase */}
          {currentView === 'showcase' && (
            <MagazineShowcase
              onBackToHome={() => navigateView('home', '/')}
              onNavigateToTracking={() => navigateView('tracking', '/track')}
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
        </Suspense>
      </main>

      {/* Magazine Order Follow Up Modal (Asks for Magazine Order Number) */}
      {followUpModalOpen && (
        <Suspense fallback={null}>
          <OrderFollowUpModal
            open={followUpModalOpen}
            onCancel={() => setFollowUpModalOpen(false)}
            onSuccess={handleFollowUpSuccess}
          />
        </Suspense>
      )}

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
  );
}
