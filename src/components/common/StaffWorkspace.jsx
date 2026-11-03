import { clearTransfers } from '../../services/fileTransfers';
import SoftFlutter, { ActionButton } from './SoftFlutter';
import TurnstileCheck from './TurnstileCheck';
import PasswordRecovery from './PasswordRecovery';
import { draftUploads } from '../../hooks/useDraftUploads';
import SecurityCenter from './SecurityCenter';
import InterfaceText from '../../i18n/InterfaceText';
import React, {
  Suspense,
  lazy,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { ConfigProvider, Drawer, Grid } from 'antd';
import {
  Layers,
  FileText,
  Users,
  LogOut,
  Lock,
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
import { navigate as navigateLocation } from '../../navigation/location';
import { useLanguage } from '../../i18n/LanguageContext';
import { EmptyState, Button } from './UI';
import { useAccountLanguage } from '../../hooks/useAccountLanguage';
import { useVisiblePolling } from '../../hooks/useVisiblePolling';
import { api } from '../../services/api';
import { tinzelAntdTheme } from '../../theme/antdTheme';
import PageSkeleton from './PageSkeleton';
import InitialPasswordSetup from './InitialPasswordSetup';
import LanguageSwitcher from './LanguageSwitcher';
import TinzelLogo from './TinzelLogo';
import StaffProfile from './StaffProfile';

const ConveyorBeltBoard = lazy(() => import('../manager/ConveyorBeltBoard'));
const DesignerQueue = lazy(() => import('../designer/DesignerQueue'));
const MagazineReviewPage = lazy(() => import('../manager/MagazineReviewPage'));
const DesignerOrderPage = lazy(() => import('../designer/DesignerOrderPage'));
const ReturnsPage = lazy(() => import('../designer/ReturnsPage'));
const NotificationsPage = lazy(() => import('./NotificationsPage'));
const FormBuilder = lazy(() => import('../admin/FormBuilder'));
const SystemPage = lazy(() => import('./SystemPage'));
const StaffWorkloadManager = lazy(
  () => import('../admin/StaffWorkloadManager'),
);

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
    id: 'system',
    label: 'System',
    path: '/staff/system',
    section: 'Operations',
    icon: Layers,
    roles: ['admin', 'manager'],
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
    roles: ['admin', 'manager'],
  },
];

export default function StaffWorkspace({ onExitToHome }) {
  const { lang } = useLanguage();
  const [captchaToken,setCaptchaToken]=useState(''),[captchaReset,setCaptchaReset]=useState(0),[recovering,setRecovering]=useState(false);
  const ui = (en, sw) => (lang === 'sw' ? sw : en);
  const labels = {
    'Pre-Design': 'Kabla ya usanifu',
    'Design Phase': 'Usanifu',
    'Post-Design Phase': 'Baada ya usanifu',
    'Design Orders': 'Oda za usanifu',
    Returns: 'Marekebisho',
    Notifications: 'Taarifa',
    Forms: 'Fomu',
    Users: 'Watumiaji',
    System: 'Mfumo',
    'Kanban Phases': 'Hatua za oda',
    Editorial: 'Uhariri',
    Operations: 'Uendeshaji',
    Administration: 'Utawala',
  };
  const label = (text) => (lang === 'sw' ? labels[text] || text : text);
  const screens = Grid.useBreakpoint();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  // Explicit sign-in entry must not restore a session or initiate verification.
  const [token, setToken] = useState(() =>
    /^\/staff\/login\/?$/.test(window.location.pathname) ? '' : 'cookie',
  );
  const loginInFlight = useRef(false);
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    if (currentUser) draftUploads.setOwner(currentUser._id || currentUser.id);
  }, [currentUser?._id, currentUser?.id]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  useAccountLanguage(
    'staff',
    token,
    currentUser?.id || currentUser?._id,
    currentUser?.preferredLanguage,
    setError,
  );

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Active page state
  const readRoute = () => {
    const pathname = window.location.pathname;
    const reviewMatch = pathname.match(/^\/staff\/review\/([^/]+)\/versions\/([1-9]\d*)$/);
    if(reviewMatch)return {page:'magazine_review',orderId:decodeURIComponent(reviewMatch[1]),version:Number(reviewMatch[2])};
    const orderMatch = pathname.match(/^\/staff\/design\/orders\/([^/]+)/);
    if (orderMatch)
      return {
        page: 'designer_order',
        orderId: decodeURIComponent(orderMatch[1]),
      };
    if (pathname.startsWith('/staff/pre-design'))
      return { page: 'pre_design', orderId: null };
    if (pathname.startsWith('/staff/design-phase'))
      return { page: 'design_phase', orderId: null };
    if (pathname.startsWith('/staff/post-design'))
      return { page: 'post_design', orderId: null };
    if (pathname.startsWith('/staff/returns'))
      return { page: 'returns', orderId: null };
    if (pathname.startsWith('/staff/notifications'))
      return { page: 'notifications', orderId: null };
    if (pathname.startsWith('/staff/forms'))
      return { page: 'form_builder', orderId: null };
    if (pathname.startsWith('/staff/system'))
      return { page: 'system', orderId: null };
    if (pathname.startsWith('/staff/users'))
      return { page: 'staff_roster', orderId: null };
    if (pathname.startsWith('/staff/design'))
      return { page: 'designer_queue', orderId: null };
    return {
      page:
        pathname === '/staff' || pathname === '/staff/'
          ? 'pre_design'
          : 'missing',
      orderId: null,
    };
  };
  const initialRoute = readRoute();
  const [activePage, setActivePage] = useState(initialRoute.page);
  const staffLocation = useRef(window.location.href);
  const [reviewVersion,setReviewVersion]=useState(initialRoute.version);
  const [routeOrderId, setRouteOrderId] = useState(initialRoute.orderId);
  const navigateStaff = (path, page, orderId = null) => {
    if (!navigateLocation(path)) return;
    setActivePage(page);
    setRouteOrderId(orderId);
    setMenuOpen(false);
  };
  useEffect(() => {
    const pop = (event) => {
      // Ask the active editor before changing routes on native Back/Forward.
      // Programmatic navigation already performs this check in navigateLocation.
      if (event.isTrusted && !window.dispatchEvent(new Event('tinzel:before-navigate', {cancelable:true}))) {
        window.history.pushState({}, '', staffLocation.current);
        return;
      }
      staffLocation.current = window.location.href;
      const route = readRoute();
      setActivePage(route.page);
      setRouteOrderId(route.orderId);
      setReviewVersion(route.version);
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  const refreshUnreadCount = useCallback(
    async (authToken = token) => {
      if (!authToken) return;
      try {
        const data = await api.notifications.getHistory(authToken, {
          limit: 100,
        });
        if (typeof data.unreadCount === 'number') {
          setUnreadNotifications(data.unreadCount);
        } else {
          setUnreadNotifications(
            (data.notifications || []).filter((n) => !n.isRead).length,
          );
        }
      } catch {
        // Ignore background badge refresh errors
      }
    },
    [token],
  );

  useVisiblePolling(
    () => refreshUnreadCount(token),
    Boolean(token && currentUser && !currentUser.mustChangePassword),
  );

  useEffect(() => {
    const onUnauthorized = (event) => {
      draftUploads.reset();
      setToken('');
      setCurrentUser(null);
      localStorage.removeItem('tinzel_staff_token');
      setError(
        event?.detail?.message ||
          'Your session has expired or is invalid. Please sign in again.',
      );
    };
    window.addEventListener('tinzel:staff:unauthorized', onUnauthorized);
    return () =>
      window.removeEventListener('tinzel:staff:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (token) {
      loadProfile(token);
    }
  }, [token, refreshUnreadCount]);

  const restoreStaffRoute = (user) => {
    const pathname = window.location.pathname;
    const isEntry = /^\/staff(?:\/login)?\/?$/.test(pathname);
    // A saved/shared manager landing URL must not strand a designer at sign-in.
    const isDesignerLanding = user.role === 'designer' &&
      /^\/staff\/pre-design\/?$/.test(pathname);
    if (isEntry || isDesignerLanding) {
      const home = NAVIGATION_ITEMS.find((item) => item.roles.includes(user.role));
      if (home) navigateLocation(home.path, { replace: true });
    }
    const route = readRoute();
    setActivePage(route.page);
    setRouteOrderId(route.orderId);
    setReviewVersion(route.version);
  };

  const loadProfile = async (authToken) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.staffAuth.getMe(authToken);
      setCurrentUser(data.user);
      if (!data.user.mustChangePassword) refreshUnreadCount(authToken);

      restoreStaffRoute(data.user);
    } catch (err) {
      setCurrentUser(null);
      if ([401, 403].includes(err.status)) {
        setToken('');
        localStorage.removeItem('tinzel_staff_token');
      } else {
        setError(
          'Unable to reconnect to your workspace. Please check your backend connection or sign in again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };


  const handleLogin = async (loginEmail, loginPass) => {
    if (loginInFlight.current) return;
    loginInFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await api.staffAuth.login(loginEmail, loginPass, captchaToken);
      setToken(data.token);
      localStorage.removeItem('tinzel_staff_token');
      setCurrentUser(data.user);
      setPassword('');
      if (!data.user.mustChangePassword) refreshUnreadCount(data.token);

      restoreStaffRoute(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setCaptchaToken('');setCaptchaReset(x=>x+1);
      loginInFlight.current = false;
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    clearTransfers();
    draftUploads.reset();
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
  const orderPageAllowed =
    (activePage === 'designer_order' &&
    ['designer', 'manager', 'admin'].includes(currentUser?.role)) ||
    (activePage === 'magazine_review' && ['manager', 'admin'].includes(currentUser?.role));
  const effectiveActivePage =
    activePage === 'missing'
      ? 'missing'
      : orderPageAllowed ||
          allowedMenuItems.some((item) => item.id === activePage)
        ? activePage
        : 'denied';

  // -------------------------------------------------------------
  if (token && currentUser?.mustChangePassword)
    return (
      <InitialPasswordSetup
        token={token}
        user={currentUser}
        onLogout={handleLogout}
        onComplete={(data) => {
          setCurrentUser(data.user);
          setToken(data.token);
          localStorage.removeItem('tinzel_staff_token');
          const route = readRoute();
          const allowed =
            route.page === 'designer_order' ||
            NAVIGATION_ITEMS.some(
              (item) =>
                item.id === route.page && item.roles.includes(data.user.role),
            );
          if (!allowed)
            navigateStaff(
              data.user.role === 'designer'
                ? '/staff/design'
                : '/staff/pre-design',
              data.user.role === 'designer' ? 'designer_queue' : 'pre_design',
            );
          refreshUnreadCount(data.token);
        }}
      />
    );

  // Unauthenticated: High-End Minimalist Login Screen
  // -------------------------------------------------------------
  if (token && !currentUser && !error) {
    return (
      <div className="ui-page">
        <PageSkeleton
          variant={
            ['pre_design', 'design_phase', 'post_design'].includes(activePage)
              ? 'dashboard'
              : ['designer_order', 'magazine_review'].includes(activePage)
                ? 'detail'
                : 'table'
          }
        />
      </div>
    );
  }

  if (token && !currentUser) {
    return (
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
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
            border: '1px solid var(--border-color)',
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
              fontFamily:
                'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: '22px',
              fontWeight: '600',
              color: 'var(--text-main)',
              margin: 0,
            }}
          >
            <InterfaceText>Staff Workspace</InterfaceText>
          </h2>
          <p
            role="status"
            style={{
              fontSize: '14px',
              color: '#57534E',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {error || 'Reconnecting to your workspace…'}
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '100%',
              marginTop: '8px',
            }}
          >
            {error && (
              <ActionButton loading={loading}
                type="button"
                disabled={loading}
                onClick={() => loadProfile(token)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--accent-primary)',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Reconnecting…' : 'Retry connection'}
              </ActionButton>
            )}
            <ActionButton
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '9px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#FFFFFF',
                color: '#57534E',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <InterfaceText>
                Sign out / Sign in with another account
              </InterfaceText>
            </ActionButton>
            {onExitToHome && (
              <button
                type="button"
                onClick={onExitToHome}
                style={{
                  width: '100%',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <InterfaceText>Return to client homepage</InterfaceText>
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (!token || !currentUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div style={{ maxWidth: '440px', width: '100%' }}>
          {onExitToHome && (
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={onExitToHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '6px 0',
                }}
              >
                <ArrowLeft size={16} />
                {ui('Back', 'Rudi')}
              </button>
            </div>
          )}

          <div
            className="staff-sign-in-card"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '28px 24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ marginBottom: '12px' }}>
                <TinzelLogo variant="full" height={42} />
              </div>
              <h1
                style={{
                  fontFamily:
                    'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
                  fontStyle: 'normal',
                  fontSize: '28px',
                  fontWeight: '600',
                  color: 'var(--text-main)',
                  marginBottom: '6px',
                }}
              >
                {ui('Sign in', 'Ingia')}
              </h1>
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

            {recovering && <PasswordRecovery initialEmail={email} onClose={()=>setRecovering(false)} />}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin(email, password);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <label
                  htmlFor="staff-email"
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
                  {ui('Work Email Address', 'Barua pepe ya kazi')}
                </label>
                <input
                  type="email"
                  required
                  id="staff-email"
                  autoComplete="username"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid #D6D3D1',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="staff-password"
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
                  {ui('Password', 'Nenosiri')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    id="staff-password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 56px 10px 14px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid #D6D3D1',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    className="staff-password-toggle"
                    aria-label={
                      showPassword
                        ? ui('Hide password', 'Ficha nenosiri')
                        : ui('Show password', 'Onyesha nenosiri')
                    }
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <TurnstileCheck action="login" onToken={setCaptchaToken} resetKey={captchaReset} />
              <ActionButton
                type="submit"
                disabled={loading || !captchaToken}
                style={{
                  backgroundColor: 'var(--accent-primary)',
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
                {loading && <SoftFlutter size={16} />}
                {ui('Sign in', 'Ingia')}
              </ActionButton>
            </form>
            <button type="button" className="verification-link" disabled={loading} onClick={()=>{setPassword('');setRecovering(true);}}>{ui('Forgot password?', 'Umesahau nenosiri?')}</button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Authenticated: Unified Full-Height Sidebar Dashboard Layout
  // -------------------------------------------------------------
  const navigation = (
    <aside
      className="staff-sidebar"
      style={{
        width: '232px',
        minWidth: '232px',
        height: '100vh',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid var(--border-color)',
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

        {/* Navigation Menu by RBAC */}
        <div style={{ padding: '16px 12px 10px 12px' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {allowedMenuItems.map((item, idx) => {
              const IconComponent = item.icon;
              const isActive =
                effectiveActivePage === item.id ||
                (effectiveActivePage === 'designer_order' &&
                  item.id === 'designer_queue') ||
                (effectiveActivePage === 'magazine_review' && item.id === 'design_phase');
              const prevSection =
                idx > 0 ? allowedMenuItems[idx - 1].section : null;
              const showSectionHeader =
                item.section && item.section !== prevSection;

              return (
                <React.Fragment key={item.id}>
                  {showSectionHeader && (
                    <div
                      style={{
                        padding:
                          idx === 0 ? '0 14px 4px 14px' : '12px 14px 4px 14px',
                        fontSize: '10px',
                        fontWeight: '800',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {label(item.section)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      navigateStaff(item.path || '/staff', item.id)
                    }
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
                      borderLeft: isActive
                        ? '3px solid var(--accent-primary)'
                        : '3px solid transparent',
                      color: isActive ? 'var(--text-main)' : '#57534E',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <IconComponent
                        size={18}
                        color={
                          isActive
                            ? 'var(--accent-primary)'
                            : 'var(--text-muted)'
                        }
                      />
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: isActive ? '700' : '600',
                        }}
                      >
                        {label(item.label)}
                      </div>
                    </div>
                    {item.id === 'notifications' && unreadNotifications > 0 && (
                      <span
                        style={{
                          minWidth: '20px',
                          padding: '2px 6px',
                          borderRadius: '999px',
                          backgroundColor: 'var(--accent-primary)',
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

      <div
        style={{
          padding: '16px 14px',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <StaffProfile
          user={currentUser}
          token={token}
          onLogout={handleLogout}
          onCloseSidebar={() => setMenuOpen(false)}
          onUpdate={(data) => {
            setCurrentUser((user) => ({ ...user, ...data.user }));
            if (data.token) {
              setToken(data.token);
              localStorage.removeItem('tinzel_staff_token');
            }
          }}
        />
      </div>
    </aside>
  );
  return (
    <div
      className="staff-workspace"
      style={{
        display: 'flex',
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {screens.lg ? (
        navigation
      ) : (
        <Drawer
          title={ui('Your workspace', 'Ofisi yako')}
          placement="left"
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          afterOpenChange={(open) => {
            if (
              !open &&
              ![...document.querySelectorAll('.ant-modal-wrap')].some(
                (el) => el.getClientRects().length,
              )
            )
              menuButton.current?.focus({ preventScroll: true });
          }}
          size="min(90vw, 340px)"
          styles={{ body: { padding: 0 } }}
        >
          {navigation}
        </Drawer>
      )}
      {/* ============================================================ */}
      {/* 2. Main Content Viewport                                     */}
      {/* ============================================================ */}
      <section
        className="staff-main"
        style={{
          flex: 1,
          height: '100vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        {/* Viewport Top Header */}
        <header
          className="staff-header"
          style={{
            height: '64px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--border-color)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {!screens.lg && (
            <button
              ref={menuButton}
              type="button"
              className="staff-menu-toggle"
              aria-label={ui('Open workspace menu', 'Fungua menyu ya ofisi')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
          )}
          <div>
            <h2
              style={{
                fontFamily:
                  'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
                fontStyle: 'italic',
                fontSize: '24px',
                fontWeight: '600',
                color: 'var(--text-main)',
                margin: 0,
                lineHeight: '1.2',
              }}
            >
              {effectiveActivePage === 'magazine_review' ? ui('Magazine review','Ukaguzi wa jarida') : effectiveActivePage === 'designer_order'
                ? 'Design order'
                : label(
                    NAVIGATION_ITEMS.find(
                      (item) => item.id === effectiveActivePage,
                    )?.label || ui('Workstation', 'Ofisi'),
                  )}
            </h2>
          </div>

          <div
            className="staff-header-profile"
            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <LanguageSwitcher />
            <button
              type="button"
              aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
              onClick={() =>
                navigateStaff('/staff/notifications', 'notifications')
              }
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor:
                  effectiveActivePage === 'notifications'
                    ? '#FAF5EA'
                    : '#FFFFFF',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Bell size={15} color="#8A6825" />
              <span className="staff-notification-label">
                {ui('Notifications', 'Taarifa')}
              </span>
              <span aria-label="Unread notifications">
                {unreadNotifications > 0 ? unreadNotifications : null}
              </span>
            </button>
          </div>
        </header>

        {/* Viewport Dynamic Page Render based on RBAC */}
        <ConfigProvider theme={tinzelAntdTheme}>
          <SecurityCenter user={currentUser} /><div className="staff-content" style={{ padding: '32px', flex: 1 }}>
            <Suspense
              fallback={
                <PageSkeleton
                  variant={
                    ['pre_design', 'design_phase', 'post_design'].includes(
                      effectiveActivePage,
                    )
                      ? 'dashboard'
                      : ['designer_order', 'magazine_review'].includes(effectiveActivePage)
                        ? 'detail'
                        : 'table'
                  }
                />
              }
            >
              {['missing', 'denied'].includes(effectiveActivePage) && (
                <EmptyState
                  title={
                    effectiveActivePage === 'denied'
                      ? ui('Access unavailable', 'Huna ruhusa')
                      : ui('Page not found', 'Ukurasa haupatikani')
                  }
                  description={ui(
                    'Choose an available page from your workspace menu.',
                    'Chagua ukurasa unaoruhusiwa kwenye menyu.',
                  )}
                >
                  <Button
                    onClick={() =>
                      navigateStaff(
                        allowedMenuItems[0].path,
                        allowedMenuItems[0].id,
                      )
                    }
                  >
                    {ui('Open workspace', 'Fungua ofisi')}
                  </Button>
                </EmptyState>
              )}
              {['pre_design', 'design_phase', 'post_design'].includes(
                effectiveActivePage,
              ) &&
                (currentUser.role === 'admin' ||
                  currentUser.role === 'manager') && (
                  <ConveyorBeltBoard
                    key={effectiveActivePage}
                    token={token}
                    phase={effectiveActivePage}
                    staffUser={currentUser}
                    compact={!screens.lg}
                    onNavigateToReturns={() =>
                      navigateStaff('/staff/returns', 'returns')
                    }
                  />
                )}

              {effectiveActivePage === 'form_builder' &&
                currentUser.role === 'admin' && <FormBuilder token={token} />}

              {effectiveActivePage === 'designer_queue' && (
                <DesignerQueue
                  token={token}
                  staffUser={currentUser}
                  onOpenOrder={(id) =>
                    navigateStaff(
                      `/staff/design/orders/${id}`,
                      'designer_order',
                      id,
                    )
                  }
                />
              )}

              {effectiveActivePage === 'magazine_review' && routeOrderId && <MagazineReviewPage key={`${routeOrderId}:${reviewVersion}`} token={token} orderId={routeOrderId} version={reviewVersion}/>}

              {effectiveActivePage === 'designer_order' && routeOrderId && (
                <DesignerOrderPage
                  key={routeOrderId}
                  token={token}
                  staffUser={currentUser}
                  orderId={routeOrderId}
                  onBack={() =>
                    currentUser.role === 'manager'
                      ? navigateStaff('/staff/returns', 'returns')
                      : navigateStaff('/staff/design', 'designer_queue')
                  }
                />
              )}

              {effectiveActivePage === 'returns' && (
                <ReturnsPage
                  token={token}
                  staffUser={currentUser}
                  onOpenOrder={(id) =>
                    navigateStaff(
                      `/staff/design/orders/${id}`,
                      'designer_order',
                      id,
                    )
                  }
                />
              )}

              {effectiveActivePage === 'notifications' && (
                <NotificationsPage
                  token={token}
                  staffUser={currentUser}
                  onOpenOrder={(id) =>
                    navigateStaff(
                      `/staff/design/orders/${id}`,
                      'designer_order',
                      id,
                    )
                  }
                  onUnreadCountChange={setUnreadNotifications}
                />
              )}

              {effectiveActivePage === 'system' && (
                <SystemPage token={token} user={currentUser} />
              )}
              {effectiveActivePage === 'staff_roster' &&
                ['admin', 'manager'].includes(currentUser.role) && (
                  <StaffWorkloadManager token={token} role={currentUser.role} />
                )}
            </Suspense>
          </div>
        </ConfigProvider>
      </section>
    </div>
  );
}
