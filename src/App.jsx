import React, { useState, useEffect } from 'react';
import {
  Layers,
  FileText,
  Search,
  Shield,
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import DynamicFormRenderer from './components/client/DynamicFormRenderer';
import ClientTrackingPortal from './components/client/ClientTrackingPortal';
import StaffWorkspace from './components/common/StaffWorkspace';
import { api } from './services/api';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [currentView, setCurrentView] = useState('public_form'); // 'public_form' | 'tracking' | 'staff' | 'diagnostics'
  const [activeFormSlug, setActiveFormSlug] = useState('wedding-magazine');
  const [availableForms, setAvailableForms] = useState([]);
  const [backendHealth, setBackendHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  useEffect(() => {
    checkHealth();
    loadPublicForms();
  }, []);

  const checkHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      const data = await res.json();
      setBackendHealth(data);
    } catch (err) {
      setBackendHealth({ status: 'offline', message: err.message, database: { status: 'offline' } });
    } finally {
      setLoadingHealth(false);
    }
  };

  const loadPublicForms = async () => {
    try {
      const data = await api.public.getForms();
      setAvailableForms(data.forms || []);
    } catch (e) {
      // Ignore initial load error if offline
    }
  };

  const isBackendOnline = backendHealth?.status === 'ok';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Universal Top Navigation Header */}
      <header
        style={{
          backgroundColor: 'var(--card-bg)',
          borderBottom: '1px solid var(--border-color)',
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
          {/* Logo / Brand */}
          <div
            onClick={() => setCurrentView('public_form')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <div
              style={{
                backgroundColor: 'var(--accent-primary)',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={22} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                Tinzel
              </span>
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-muted)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  marginLeft: '8px',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                }}
              >
                CONVEYOR BELT (STR-TNZ-US-001)
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setCurrentView('public_form')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: currentView === 'public_form' ? 'var(--accent-primary)' : 'transparent',
                color: currentView === 'public_form' ? '#ffffff' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
              }}
            >
              <FileText size={15} />
              Submit Magazine
            </button>

            <button
              onClick={() => setCurrentView('tracking')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: currentView === 'tracking' ? 'var(--accent-primary)' : 'transparent',
                color: currentView === 'tracking' ? '#ffffff' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
              }}
            >
              <Search size={15} />
              Client Track & Review (OTP)
            </button>

            <button
              onClick={() => setCurrentView('staff')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: currentView === 'staff' ? 'var(--accent-primary)' : 'transparent',
                color: currentView === 'staff' ? '#ffffff' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
              }}
            >
              <Shield size={15} />
              Staff Workstation
            </button>

            <button
              onClick={() => setCurrentView('diagnostics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: currentView === 'diagnostics' ? 'var(--bg-secondary)' : 'transparent',
                color: currentView === 'diagnostics' ? 'var(--text-main)' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: '500',
                border: `1px solid ${currentView === 'diagnostics' ? 'var(--border-color)' : 'transparent'}`,
              }}
            >
              <Server size={14} />
              Diagnostics
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '32px 20px' }}>
        {/* View 1: Public Submission Form */}
        {currentView === 'public_form' && (
          <div>
            {availableForms.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '24px',
                  maxWidth: '780px',
                  margin: '0 auto 24px auto',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  Select Event Type:
                </span>
                {availableForms.map((f) => (
                  <button
                    key={f.slug}
                    onClick={() => setActiveFormSlug(f.slug)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      backgroundColor: activeFormSlug === f.slug ? 'var(--accent-primary)' : 'var(--card-bg)',
                      color: activeFormSlug === f.slug ? '#ffffff' : 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    {f.title}
                  </button>
                ))}
              </div>
            )}

            <DynamicFormRenderer
              slug={activeFormSlug}
              onNavigateToTracking={() => setCurrentView('tracking')}
            />
          </div>
        )}

        {/* View 2: Client Tracking & Whole-Magazine Review Portal */}
        {currentView === 'tracking' && <ClientTrackingPortal />}

        {/* View 3: Staff Workspace (Manager / Designer / Admin) */}
        {currentView === 'staff' && <StaffWorkspace />}

        {/* View 4: Live Diagnostics */}
        {currentView === 'diagnostics' && (
          <div style={{ maxWidth: '840px', margin: '0 auto' }}>
            <div
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Platform Connectivity Diagnostics</h2>
                <button
                  onClick={checkHealth}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                >
                  <RefreshCw size={13} className={loadingHealth ? 'spin' : ''} />
                  Ping API
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Express API</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: '700' }}>
                    {isBackendOnline ? <CheckCircle2 size={16} color="#4ade80" /> : <XCircle size={16} color="#ef4444" />}
                    <span>{isBackendOnline ? 'Online (:5000)' : 'Offline'}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>MongoDB Database</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: '700' }}>
                    {backendHealth?.database?.status === 'connected' ? (
                      <CheckCircle2 size={16} color="#4ade80" />
                    ) : (
                      <Activity size={16} color="#fbbf24" />
                    )}
                    <span>{backendHealth?.database?.status || 'Unknown'}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Specification</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#60a5fa' }}>STR-TNZ-US-001 v1.0</div>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '8px' }}>
                  <strong>Conveyor Belt Gate Rules:</strong>
                </p>
                <ul style={{ paddingLeft: '20px' }}>
                  <li>Tracking ID (TNZ-YYYY-XXXX) is issued only upon Manager payment verification.</li>
                  <li>Draft versions are gated by Manager review before becoming visible in the Client portal.</li>
                  <li>Whole-magazine approval by Client is required before high-res print packages can be prepared.</li>
                  <li>Print dispatch is sent via WhatsApp to the Printing Person with file links & specs.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--card-bg)',
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        Tinzel Magazine Conveyor Belt • Stryxis STR-TNZ-US-001 • Solid Flat Color Palette • Zero Gradients • Zero Emojis
      </footer>
    </div>
  );
}
