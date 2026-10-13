import React, { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  Users,
  LogOut,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import ConveyorBeltBoard from '../manager/ConveyorBeltBoard';
import DesignerQueue from '../designer/DesignerQueue';
import FormBuilder from '../admin/FormBuilder';
import StaffWorkloadManager from '../admin/StaffWorkloadManager';

export default function StaffWorkspace() {
  const [token, setToken] = useState(localStorage.getItem('tinzel_staff_token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('manager_board'); // 'manager_board' | 'designer_queue' | 'form_builder' | 'workloads'

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
      // Set initial tab based on role
      if (data.user.role === 'designer') {
        setActiveTab('designer_queue');
      } else if (data.user.role === 'manager') {
        setActiveTab('manager_board');
      } else {
        setActiveTab('manager_board');
      }
    } catch (err) {
      setToken('');
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
      if (data.user.role === 'designer') {
        setActiveTab('designer_queue');
      } else {
        setActiveTab('manager_board');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    localStorage.removeItem('tinzel_staff_token');
  };

  // If not logged in, render staff login with convenient pre-filled test buttons
  if (!token || !currentUser) {
    return (
      <div style={{ maxWidth: '440px', margin: '40px auto' }}>
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '32px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#1e3a8a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <Shield size={24} color="#93c5fd" />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>Staff Sign In</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Access Manager, Designer, or Admin workstations.
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#450a0a',
                border: '1px solid var(--accent-danger)',
                borderRadius: '6px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#fca5a5',
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
            style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="manager@tinzel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
              Sign In to Workstation
            </button>
          </form>

          {/* Quick Demo Sign-In Buttons */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '18px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>
              ONE-CLICK DEMO TEST LOGINS:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleLogin('manager@tinzel.com', 'tinzel123')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span><strong>Production Manager</strong> (Kanban Oversight)</span>
                <span style={{ fontSize: '11px', color: '#60a5fa' }}>manager@tinzel.com</span>
              </button>

              <button
                type="button"
                onClick={() => handleLogin('designer1@tinzel.com', 'tinzel123')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span><strong>Designer (Zawadi M.)</strong> (Draft Uploader)</span>
                <span style={{ fontSize: '11px', color: '#4ade80' }}>designer1@tinzel.com</span>
              </button>

              <button
                type="button"
                onClick={() => handleLogin('admin@tinzel.com', 'tinzel123')}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span><strong>System Admin</strong> (Form Builder & Roster)</span>
                <span style={{ fontSize: '11px', color: '#c084fc' }}>admin@tinzel.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Workspace Sub-Navbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px 20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700' }}>{currentUser.name}</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor:
                  currentUser.role === 'admin'
                    ? '#581c87'
                    : currentUser.role === 'manager'
                    ? '#1e3a8a'
                    : '#14532d',
                color:
                  currentUser.role === 'admin'
                    ? '#d8b4fe'
                    : currentUser.role === 'manager'
                    ? '#93c5fd'
                    : '#86efac',
              }}
            >
              {currentUser.role}
            </span>
          </div>

          {/* Role Navigation Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
              <button
                onClick={() => setActiveTab('manager_board')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  backgroundColor: activeTab === 'manager_board' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'manager_board' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: 'none',
                }}
              >
                Manager Conveyor Board
              </button>
            )}

            {(currentUser.role === 'designer' || currentUser.role === 'admin' || currentUser.role === 'manager') && (
              <button
                onClick={() => setActiveTab('designer_queue')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  backgroundColor: activeTab === 'designer_queue' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'designer_queue' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: 'none',
                }}
              >
                Designer Workspace
              </button>
            )}

            {currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('form_builder')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    backgroundColor: activeTab === 'form_builder' ? 'var(--accent-primary)' : 'transparent',
                    color: activeTab === 'form_builder' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: 'none',
                  }}
                >
                  Form Builder
                </button>
                <button
                  onClick={() => setActiveTab('workloads')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    backgroundColor: activeTab === 'workloads' ? 'var(--accent-primary)' : 'transparent',
                    color: activeTab === 'workloads' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: 'none',
                  }}
                >
                  Staff Roster & Logs
                </button>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
          }}
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'manager_board' && <ConveyorBeltBoard token={token} staffUser={currentUser} />}
      {activeTab === 'designer_queue' && <DesignerQueue token={token} staffUser={currentUser} />}
      {activeTab === 'form_builder' && <FormBuilder token={token} />}
      {activeTab === 'workloads' && <StaffWorkloadManager token={token} />}
    </div>
  );
}
