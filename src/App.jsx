import React, { Suspense, lazy, useState } from 'react';
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
                <button
                  type="button"
                  onClick={() => setCurrentView('home')}
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
                    onClick={() => { window.history.pushState({}, '', '/staff'); setCurrentView('staff'); }}
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
