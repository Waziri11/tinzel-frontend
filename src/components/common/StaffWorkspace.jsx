import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Grid } from 'antd';
import {
  Layers,
  FileText,
  Users,
  LogOut,
  Lock,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Palette,
  Menu,
} from 'lucide-react';
import { api } from '../../services/api';
import ConveyorBeltBoard from '../manager/ConveyorBeltBoard';
import DesignerQueue from '../designer/DesignerQueue';
import FormBuilder from '../admin/FormBuilder';
import StaffWorkloadManager from '../admin/StaffWorkloadManager';
import TinzelLogo from './TinzelLogo';

// RBAC Navigation Configuration
const NAVIGATION_ITEMS = [
  {
    id: 'conveyor',
    label: 'Production Conveyor',
    subtitle: 'Manager Decisions & Production Flow',
    icon: Layers,
    roles: ['admin', 'manager'],
    badge: 'Pipeline',
  },
  {
    id: 'form_builder',
    label: 'Magazine Form Builder',
    subtitle: 'Editions, Fields & Covers',
    icon: FileText,
    roles: ['admin'],
    badge: 'Templates',
  },
  {
    id: 'designer_queue',
    label: 'Designer Workspace',
    subtitle: 'Draft Proofs & Revisions',
    icon: Palette,
    roles: ['admin', 'designer'],
    badge: null,
  },
  {
    id: 'staff_roster',
    label: 'User Management',
    subtitle: 'Internal Accounts & Access',
    icon: Users,
    roles: ['admin'],
    badge: 'Admin Only',
  },
];

export default function StaffWorkspace({ onExitToHome }) {
  const screens = Grid.useBreakpoint();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  const [token, setToken] = useState(localStorage.getItem('tinzel_staff_token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Active page state
  const [activePage, setActivePage] = useState('conveyor');

  useEffect(() => {
    if (token) {
      loadProfile(token);
    }
  }, [token]);

  const loadProfile = async (authToken) => {
    setLoading(true);
    try {
      const data = await api.staffAuth.getMe(authToken);
      setCurrentUser(data.user);

      // Default page based on RBAC role
      if (data.user.role === 'designer') {
        setActivePage('designer_queue');
      } else if (data.user.role === 'manager') {
        setActivePage('conveyor');
      } else {
        setActivePage('conveyor');
      }
    } catch (err) {
      setToken('');
      setCurrentUser(null);
      localStorage.removeItem('tinzel_staff_token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (loginEmail, loginPass) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.staffAuth.login(loginEmail, loginPass);
      setToken(data.token);
      localStorage.setItem('tinzel_staff_token', data.token);
      setCurrentUser(data.user);
      setPassword('');

      if (data.user.role === 'designer') {
        setActivePage('designer_queue');
      } else {
        setActivePage('conveyor');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    localStorage.removeItem('tinzel_staff_token');
  };

  // Filter allowed navigation items based on the user's role (Strict RBAC)
  const allowedMenuItems = currentUser
    ? NAVIGATION_ITEMS.filter((item) => item.roles.includes(currentUser.role))
    : [];

  // Enforce that active page is always permitted by RBAC
  const effectiveActivePage = allowedMenuItems.some((item) => item.id === activePage)
    ? activePage
    : allowedMenuItems[0]?.id || 'conveyor';

  // -------------------------------------------------------------
  // Unauthenticated: High-End Minimalist Login Screen
  // -------------------------------------------------------------
  if (!token || !currentUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#FAFAF9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div style={{ maxWidth: '440px', width: '100%' }}>
          {/* Back to Client Store Link */}
          {onExitToHome && (
            <div style={{ marginBottom: '20px' }}>
              <button
                type="button"
                onClick={onExitToHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#78716C',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '6px 0',
                }}
              >
                <ArrowLeft size={16} />
                Return to Client Catalogue
              </button>
            </div>
          )}

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E7E5E4',
              borderRadius: '12px',
              padding: '36px 32px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ marginBottom: '16px' }}>
                <TinzelLogo variant="full" height={42} />
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
                  fontStyle: 'italic',
                  fontSize: '28px',
                  fontWeight: '600',
                  color: '#1C1917',
                  marginBottom: '6px',
                }}
              >
                Staff Workstation Sign In
              </h1>
              <p style={{ fontSize: '13px', color: '#78716C', margin: 0 }}>
                Secure access for Production Managers, Editorial Designers, and Administrators.
              </p>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  color: '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin(email, password);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: '#44403C',
                    marginBottom: '6px',
                  }}
                >
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: '#FAFAF9',
                    border: '1px solid #D6D3D1',
                    borderRadius: '6px',
                    color: '#1C1917',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: '#44403C',
                    marginBottom: '6px',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      backgroundColor: '#FAFAF9',
                      border: '1px solid #D6D3D1',
                      borderRadius: '6px',
                      color: '#1C1917',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#78716C',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: '#C5A059',
                  color: '#FFFFFF',
                  padding: '11px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease',
                  marginTop: '4px',
                }}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
                Sign In to Workstation
              </button>
            </form>

          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Authenticated: Unified Full-Height Sidebar Dashboard Layout
  // -------------------------------------------------------------
  const navigation = (
      <aside className="staff-sidebar"
        style={{
          width: '280px',
          minWidth: '280px',
          height: '100vh',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E7E5E4',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 40,
        }}
      >
        {/* Top: Logo & Staff Profile */}
        <div>
          {/* Brand Header */}
          <div
            style={{
              padding: '24px 20px 20px 20px',
              borderBottom: '1px solid #F5F5F4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <TinzelLogo variant="full" height={36} />
            <span
              style={{
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#C5A059',
                backgroundColor: '#FAF5EA',
                padding: '3px 7px',
                borderRadius: '4px',
                border: '1px solid rgba(197, 160, 89, 0.3)',
              }}
            >
              Staff OS
            </span>
          </div>

          {/* User Profile Card */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#FAFAF9',
              borderBottom: '1px solid #E7E5E4',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1C1917', lineHeight: '1.2' }}>
                {currentUser.name}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor:
                    currentUser.role === 'admin'
                      ? '#1C1917'
                      : currentUser.role === 'manager'
                      ? '#C5A059'
                      : '#E7E5E4',
                  color:
                    currentUser.role === 'admin'
                      ? '#C5A059'
                      : currentUser.role === 'manager'
                      ? '#FFFFFF'
                      : '#1C1917',
                  letterSpacing: '0.6px',
                }}
              >
                {currentUser.role}
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#78716C', wordBreak: 'break-all' }}>
              {currentUser.email}
            </div>

            {currentUser.role === 'designer' && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#A8A29E' }}>
                Active Workload: <strong style={{ color: '#1C1917' }}>{currentUser.currentActiveWorkload || 0}</strong> /{' '}
                {currentUser.maxActiveWorkload || 5} Orders
              </div>
            )}
          </div>

          {/* Navigation Menu by RBAC */}
          <div style={{ padding: '20px 12px 10px 12px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#A8A29E',
                padding: '0 10px 10px 10px',
              }}
            >
              Navigation Menu
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {allowedMenuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = effectiveActivePage === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setActivePage(item.id); setMenuOpen(false); }}
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isActive ? '#FAF5EA' : 'transparent',
                      borderLeft: isActive ? '3px solid #C5A059' : '3px solid transparent',
                      color: isActive ? '#1C1917' : '#57534E',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <IconComponent size={18} color={isActive ? '#C5A059' : '#78716C'} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: isActive ? '700' : '600' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '11px', color: '#A8A29E' }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    {item.badge && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: isActive ? '#C5A059' : '#F5F5F4',
                          color: isActive ? '#FFFFFF' : '#78716C',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Sidebar: Return & Sign Out */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid #E7E5E4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {onExitToHome && (
            <button
              type="button"
              onClick={onExitToHome}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #E7E5E4',
                borderRadius: '6px',
                color: '#57534E',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              Return to Client Site
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '9px 12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              color: '#991B1B',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>
  );
  return (
    <div className="staff-workspace" style={{ display: 'flex', height: '100dvh', width: '100%', overflow: 'hidden', backgroundColor: '#FAFAF9' }}>
      {screens.lg ? navigation : (
        <Drawer title="Your workspace" placement="left" open={menuOpen} onClose={() => setMenuOpen(false)}
          afterOpenChange={(open) => { if (!open) menuButton.current?.focus({ preventScroll: true }); }}
          size="min(90vw, 340px)" styles={{ body: { padding: 0 } }}>
          {navigation}
        </Drawer>
      )}
      {/* ============================================================ */}
      {/* 2. Main Content Viewport                                     */}
      {/* ============================================================ */}
      <main className="staff-main"
        style={{
          flex: 1,
          height: '100vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FAFAF9',
        }}
      >
        {/* Viewport Top Header */}
        <header className="staff-header"
          style={{
            height: '64px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E7E5E4',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {!screens.lg && <button ref={menuButton} type="button" className="staff-menu-toggle" aria-label="Open workspace menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={22} /></button>}
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
                fontStyle: 'italic',
                fontSize: '24px',
                fontWeight: '600',
                color: '#1C1917',
                margin: 0,
                lineHeight: '1.2',
              }}
            >
              {NAVIGATION_ITEMS.find((item) => item.id === effectiveActivePage)?.label || 'Workstation'}
            </h2>
            <span style={{ fontSize: '11px', color: '#78716C' }}>
              {NAVIGATION_ITEMS.find((item) => item.id === effectiveActivePage)?.subtitle}
            </span>
          </div>

          <div className="staff-header-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontSize: '12px',
                color: '#78716C',
                padding: '4px 10px',
                backgroundColor: '#FAFAF9',
                border: '1px solid #E7E5E4',
                borderRadius: '6px',
              }}
            >
              Logged in as <strong style={{ color: '#1C1917' }}>{currentUser.name}</strong> ({currentUser.role})
            </span>
          </div>
        </header>

        {/* Viewport Dynamic Page Render based on RBAC */}
        <div className="staff-content" style={{ padding: '28px 32px', flex: 1 }}>
          {effectiveActivePage === 'conveyor' && (currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <ConveyorBeltBoard token={token} staffUser={currentUser} compact={!screens.lg} />
          )}

          {effectiveActivePage === 'form_builder' && currentUser.role === 'admin' && (
            <FormBuilder token={token} />
          )}

          {effectiveActivePage === 'designer_queue' && (
            <DesignerQueue token={token} staffUser={currentUser} />
          )}

          {effectiveActivePage === 'staff_roster' && currentUser.role === 'admin' && (
            <StaffWorkloadManager token={token} />
          )}
        </div>
      </main>
    </div>
  );
}
