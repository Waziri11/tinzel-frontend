import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { ConfigProvider, Drawer, Grid } from 'antd';
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
  RotateCcw,
  ClipboardList,
  Printer,
  Bell,
} from 'lucide-react';
import { api } from '../../services/api';
import { tinzelAntdTheme } from '../../theme/antdTheme';
import BrandLoading from './BrandLoading';
import TinzelLogo from './TinzelLogo';

const ConveyorBeltBoard = lazy(() => import('../manager/ConveyorBeltBoard'));
const DesignerQueue = lazy(() => import('../designer/DesignerQueue'));
const DesignerOrderPage = lazy(() => import('../designer/DesignerOrderPage'));
const ReturnsPage = lazy(() => import('../designer/ReturnsPage'));
const NotificationsPage = lazy(() => import('./NotificationsPage'));
const FormBuilder = lazy(() => import('../admin/FormBuilder'));
const StaffWorkloadManager = lazy(() => import('../admin/StaffWorkloadManager'));

// RBAC Navigation Configuration
const NAVIGATION_ITEMS = [
  {
    id: 'pre_design',
    label: 'Pre-Design',
    path: '/staff/pre-design',
    section: 'Kanban Phases',
    icon: ClipboardList,
    roles: ['admin', 'manager'],
  },
  {
    id: 'design_phase',
    label: 'Design Phase',
    path: '/staff/design-phase',
    section: 'Kanban Phases',
    icon: Palette,
    roles: ['admin', 'manager'],
  },
  {
    id: 'post_design',
    label: 'Post-Design Phase',
    path: '/staff/post-design',
    section: 'Kanban Phases',
    icon: Printer,
    roles: ['admin', 'manager'],
  },
  {
    id: 'designer_queue',
    label: 'Design Orders',
    path: '/staff/design',
    section: 'Editorial',
    icon: Layers,
    roles: ['admin', 'designer'],
  },
  {
    id: 'returns',
    label: 'Returns',
    path: '/staff/returns',
    section: 'Operations',
    icon: RotateCcw,
    roles: ['admin', 'manager', 'designer'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/staff/notifications',
    section: 'Operations',
    icon: Bell,
    roles: ['admin', 'manager', 'designer'],
  },
  {
    id: 'form_builder',
    label: 'Forms',
    path: '/staff/forms',
    section: 'Administration',
    icon: FileText,
    roles: ['admin'],
  },
  {
    id: 'staff_roster',
    label: 'Users',
    path: '/staff/users',
    section: 'Administration',
    icon: Users,
    roles: ['admin'],
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Active page state
  const readRoute = () => {
    const pathname = window.location.pathname;
    const orderMatch = pathname.match(/^\/staff\/design\/orders\/([^/]+)/);
    if (orderMatch) return { page: 'designer_order', orderId: decodeURIComponent(orderMatch[1]) };
    if (pathname.startsWith('/staff/pre-design')) return { page: 'pre_design', orderId: null };
    if (pathname.startsWith('/staff/design-phase')) return { page: 'design_phase', orderId: null };
    if (pathname.startsWith('/staff/post-design')) return { page: 'post_design', orderId: null };
    if (pathname.startsWith('/staff/returns')) return { page: 'returns', orderId: null };
    if (pathname.startsWith('/staff/notifications')) return { page: 'notifications', orderId: null };
    if (pathname.startsWith('/staff/forms')) return { page: 'form_builder', orderId: null };
    if (pathname.startsWith('/staff/users')) return { page: 'staff_roster', orderId: null };
    if (pathname.startsWith('/staff/design')) return { page: 'designer_queue', orderId: null };
    return { page: 'pre_design', orderId: null };
  };
  const initialRoute = readRoute();
  const [activePage, setActivePage] = useState(initialRoute.page);
  const [routeOrderId, setRouteOrderId] = useState(initialRoute.orderId);
  const navigateStaff = (path, page, orderId = null) => {
    window.history.pushState({}, '', path); setActivePage(page); setRouteOrderId(orderId); setMenuOpen(false);
  };
  useEffect(() => { const pop = () => { const route = readRoute(); setActivePage(route.page); setRouteOrderId(route.orderId); }; window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop); }, []);

  const refreshUnreadCount = useCallback(async (authToken = token) => {
    if (!authToken) return;
    try {
      const data = await api.notifications.getHistory(authToken, { limit: 100 });
      if (typeof data.unreadCount === 'number') {
        setUnreadNotifications(data.unreadCount);
      } else {
        setUnreadNotifications((data.notifications || []).filter((n) => !n.isRead).length);
      }
    } catch {
      // Ignore background badge refresh errors
    }
  }, [token]);

  useEffect(() => {
    const onUnauthorized = (event) => {
      setToken('');
      setCurrentUser(null);
      localStorage.removeItem('tinzel_staff_token');
      setError(event?.detail?.message || 'Your session has expired or is invalid. Please sign in again.');
    };
    window.addEventListener('tinzel:staff:unauthorized', onUnauthorized);
    return () => window.removeEventListener('tinzel:staff:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (token) {
      loadProfile(token);
      refreshUnreadCount(token);
    }
  }, [token, refreshUnreadCount]);

  const loadProfile = async (authToken) => {
    setLoading(true);setError(null);
    try {
      const data = await api.staffAuth.getMe(authToken);
      setCurrentUser(data.user);

      // Default page based on RBAC role and current URL
      const route = readRoute();
      if (window.location.pathname !== '/staff' && window.location.pathname !== '/staff/') {
        setActivePage(route.page);
        setRouteOrderId(route.orderId);
      } else if (data.user.role === 'designer') {
        setActivePage('designer_queue');
      } else {
        setActivePage('pre_design');
      }
    } catch (err) {
      setCurrentUser(null);
      if ([401, 403].includes(err.status)) {
        setToken('');
        localStorage.removeItem('tinzel_staff_token');
      } else {
        setError('Unable to reconnect to your workspace. Please check your backend connection or sign in again.');
      }
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
      refreshUnreadCount(data.token);

      const route = readRoute();
      if (window.location.pathname !== '/staff' && window.location.pathname !== '/staff/') {
        setActivePage(route.page);
        setRouteOrderId(route.orderId);
      } else if (data.user.role === 'designer') {
        setActivePage('designer_queue');
      } else {
        setActivePage('pre_design');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const currentToken = token;
    setToken('');
    setCurrentUser(null);
    localStorage.removeItem('tinzel_staff_token');
    if (currentToken) {
      try {
        await api.staffAuth.logout(currentToken);
      } catch {
        // Safe silent fail if network error or server already invalidated token
      }
    }
  };

  // Filter allowed navigation items based on the user's role (Strict RBAC)
  const allowedMenuItems = currentUser
    ? NAVIGATION_ITEMS.filter((item) => item.roles.includes(currentUser.role))
    : [];

  // Enforce that active page is always permitted by RBAC
  const orderPageAllowed = activePage === 'designer_order' && ['designer', 'manager', 'admin'].includes(currentUser?.role);
  const effectiveActivePage = orderPageAllowed ? activePage : allowedMenuItems.some((item) => item.id === activePage)
    ? activePage
    : allowedMenuItems[0]?.id || 'pre_design';

  // -------------------------------------------------------------
  // Unauthenticated: High-End Minimalist Login Screen
  // -------------------------------------------------------------
  if (token && !currentUser) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAFAF9',
          padding: '24px',
          textAlign: 'center',
        }}
        aria-busy={loading}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '10px',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <TinzelLogo variant="mark" height={40} />
          <h2
            style={{
              fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: '22px',
              fontWeight: '600',
              color: '#1C1917',
              margin: 0,
            }}
          >
            Staff Workspace
          </h2>
          <p role="status" style={{ fontSize: '14px', color: '#57534E', margin: 0, lineHeight: 1.5 }}>
            {error || 'Reconnecting to your workspace…'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px' }}>
            {error && (
              <button
                type="button"
                disabled={loading}
                onClick={() => loadProfile(token)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid #C5A059',
                  backgroundColor: '#C5A059',
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Reconnecting…' : 'Retry connection'}
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '9px 16px',
                borderRadius: '6px',
                border: '1px solid #E7E5E4',
                backgroundColor: '#FFFFFF',
                color: '#57534E',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Sign out / Sign in with another account
            </button>
            {onExitToHome && (
              <button
                type="button"
                onClick={onExitToHome}
                style={{
                  width: '100%',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: '1px solid #E7E5E4',
                  backgroundColor: '#FAFAF9',
                  color: '#78716C',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Return to client homepage
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

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

            {currentUser.role === 'designer' && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#A8A29E' }}>
                <strong style={{ color: '#1C1917' }}>{currentUser.currentActiveWorkload || 0}</strong> / {currentUser.maxActiveWorkload || 5} active
              </div>
            )}
          </div>

          {/* Navigation Menu by RBAC */}
          <div style={{ padding: '16px 12px 10px 12px' }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {allowedMenuItems.map((item, idx) => {
                const IconComponent = item.icon;
                const isActive =
                  effectiveActivePage === item.id ||
                  (effectiveActivePage === 'designer_order' && item.id === 'designer_queue');
                const prevSection = idx > 0 ? allowedMenuItems[idx - 1].section : null;
                const showSectionHeader = item.section && item.section !== prevSection;

                return (
                  <React.Fragment key={item.id}>
                    {showSectionHeader && (
                      <div
                        style={{
                          padding: idx === 0 ? '0 14px 4px 14px' : '12px 14px 4px 14px',
                          fontSize: '10px',
                          fontWeight: '800',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#A8A29E',
                        }}
                      >
                        {item.section}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => navigateStaff(item.path || '/staff', item.id)}
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
                        <div style={{ fontSize: '13px', fontWeight: isActive ? '700' : '600' }}>{item.label}</div>
                      </div>
                      {item.id === 'notifications' && unreadNotifications > 0 && (
                        <span
                          style={{
                            minWidth: '20px',
                            padding: '2px 6px',
                            borderRadius: '999px',
                            backgroundColor: '#C5A059',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: '800',
                            textAlign: 'center',
                          }}
                        >
                          {unreadNotifications}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
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
              Client site
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
            Sign out
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
              {effectiveActivePage === 'designer_order' ? 'Design order' : NAVIGATION_ITEMS.find((item) => item.id === effectiveActivePage)?.label || 'Workstation'}
            </h2>
          </div>

          <div className="staff-header-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
              onClick={() => navigateStaff('/staff/notifications', 'notifications')}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E7E5E4',
                backgroundColor: effectiveActivePage === 'notifications' ? '#FAF5EA' : '#FFFFFF',
                color: '#1C1917',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Bell size={15} color="#8A6825" />
              <span>Notifications</span>
              {unreadNotifications > 0 && (
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: '999px',
                    backgroundColor: '#C5A059',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 800,
                  }}
                >
                  {unreadNotifications}
                </span>
              )}
            </button>
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
              <strong style={{ color: '#1C1917' }}>{currentUser.name}</strong> · {currentUser.role}
            </span>
          </div>
        </header>

        {/* Viewport Dynamic Page Render based on RBAC */}
        <ConfigProvider theme={tinzelAntdTheme}>
          <div className="staff-content" style={{ padding: '28px 32px', flex: 1 }}>
            <Suspense fallback={<BrandLoading label="Loading workspace..." />}>
              {['pre_design', 'design_phase', 'post_design'].includes(effectiveActivePage) &&
                (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                  <ConveyorBeltBoard
                    key={effectiveActivePage}
                    token={token}
                    phase={effectiveActivePage}
                    staffUser={currentUser}
                    compact={!screens.lg}
                    onNavigateToReturns={() => navigateStaff('/staff/returns', 'returns')}
                  />
                )}

              {effectiveActivePage === 'form_builder' && currentUser.role === 'admin' && (
                <FormBuilder token={token} />
              )}

              {effectiveActivePage === 'designer_queue' && (
                <DesignerQueue token={token} staffUser={currentUser} onOpenOrder={(id) => navigateStaff(`/staff/design/orders/${id}`, 'designer_order', id)} />
              )}

              {effectiveActivePage === 'designer_order' && routeOrderId && (
                <DesignerOrderPage token={token} staffUser={currentUser} orderId={routeOrderId} onBack={() => currentUser.role === 'manager' ? navigateStaff('/staff/returns', 'returns') : navigateStaff('/staff/design', 'designer_queue')} />
              )}

              {effectiveActivePage === 'returns' && (
                <ReturnsPage token={token} staffUser={currentUser} onOpenOrder={(id) => navigateStaff(`/staff/design/orders/${id}`, 'designer_order', id)} />
              )}

              {effectiveActivePage === 'notifications' && (
                <NotificationsPage
                  token={token}
                  staffUser={currentUser}
                  onOpenOrder={(id) => navigateStaff(`/staff/design/orders/${id}`, 'designer_order', id)}
                  onUnreadCountChange={setUnreadNotifications}
                />
              )}

              {effectiveActivePage === 'staff_roster' && currentUser.role === 'admin' && (
                <StaffWorkloadManager token={token} />
              )}
            </Suspense>
          </div>
        </ConfigProvider>
      </main>
    </div>
  );
}
