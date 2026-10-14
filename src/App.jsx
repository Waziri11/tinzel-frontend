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

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'showcase' | 'tracking' | 'staff'
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);

  const handleFollowUpSuccess = () => {
    setFollowUpModalOpen(false);
    setCurrentView('tracking');
  };

  return (
    <ConfigProvider theme={tinzelAntdTheme}>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FAFAF9',
          backgroundImage: currentView === 'home' ? 'url(/brand/hero-editorial-bg.jpg)' : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Navigation Bar when not on home view */}
        {currentView !== 'home' && (
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

              {/* Right Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  Home
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
                    Follow Up Order
                  </Button>
                )}

                {currentView !== 'staff' && (
                  <Button
                    onClick={() => setCurrentView('staff')}
                    icon={<UserOutlined style={{ color: '#991B1B' }} />}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E7E5E4',
                      color: '#1C1917',
                      fontWeight: '600',
                      fontSize: '13px',
                    }}
                  >
                    Staff Login
                  </Button>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: currentView === 'home' ? '24px 20px' : '32px 20px' }}>
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

          {/* View 4: Staff Workstation */}
          {currentView === 'staff' && (
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
              <StaffWorkspace />
            </div>
          )}
        </main>

        {/* Magazine Order Follow Up Modal (Asks for Magazine Order Number) */}
        <OrderFollowUpModal
          open={followUpModalOpen}
          onCancel={() => setFollowUpModalOpen(false)}
          onSuccess={handleFollowUpSuccess}
        />

        {/* Subtle Editorial Footer (shown on inner staff/tracking views, removed from minimalist home) */}
        {currentView !== 'home' && (
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
            Tinzel Bespoke Magazine Studios • White, Red, and Gold Editorial Palette • Zero Gradients • Zero Emojis
          </footer>
        )}
      </div>
    </ConfigProvider>
  );
}
