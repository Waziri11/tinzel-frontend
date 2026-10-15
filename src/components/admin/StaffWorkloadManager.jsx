import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Activity,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  RefreshCw,
  X,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api';

export default function StaffWorkloadManager({ token }) {
  const [staff, setStaff] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [simulatedNotifs, setSimulatedNotifs] = useState([]);
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'logs' | 'notifs'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModal, setUserModal] = useState(null); // 'view' | 'edit' | 'delete'
  const [userForm, setUserForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // New staff modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('designer');
  const [newMaxWorkload, setNewMaxWorkload] = useState(5);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const staffRes = await api.admin.getStaff(token);
      setStaff(staffRes.staff || []);
      const [logsRes, configRes] = await Promise.allSettled([api.admin.getAuditLogs(token), api.admin.getConfig(token)]);
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value.logs || []);
      if (configRes.status === 'fulfilled') setSimulatedNotifs(configRes.value.simulatedNotifications || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStaff = async (id, updates) => {
    try {
      await api.admin.updateStaff(token, id, updates);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await api.admin.createStaff(token, {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        phone: newPhone,
        maxActiveWorkload: Number(newMaxWorkload),
      });
      setShowAddStaffModal(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setNotice('User account created.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const openUser = async (user, mode) => {
    setError(null);
    try {
      const response = await api.admin.getStaffUser(token, user._id);
      setSelectedUser(response.user);
      setUserForm({
        name: response.user.name,
        email: response.user.email,
        phone: response.user.phone || '',
        role: response.user.role,
        isActive: response.user.isActive,
        isEligibleForAssignment: response.user.isEligibleForAssignment !== false,
        maxActiveWorkload: response.user.maxActiveWorkload || 5,
        password: '',
      });
      setUserModal(mode);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...userForm, maxActiveWorkload: Number(userForm.maxActiveWorkload) };
      if (!payload.password) delete payload.password;
      await api.admin.updateStaff(token, selectedUser._id, payload);
      setUserModal(null);
      setNotice('User account updated.');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.admin.deleteStaff(token, selectedUser._id);
      setUserModal(null);
      setNotice('User account deleted. Its order and audit history was preserved.');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {notice && <div role="status" style={{ padding: '10px 14px', background: '#ECFDF5', color: '#166534', borderRadius: 6, marginBottom: 14 }}>{notice}</div>}
      {error && !userModal && <div role="alert" style={{ padding: '10px 14px', background: '#FEF2F2', color: '#991B1B', borderRadius: 6, marginBottom: 14 }}>{error}</div>}
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: activeTab === 'staff' ? 'var(--accent-primary)' : 'var(--card-bg)',
            color: activeTab === 'staff' ? '#ffffff' : '#1C1917',
            border: '1px solid var(--border-color)',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Users size={14} /> Internal Users ({staff.length})
        </button>

        <button
          onClick={() => setActiveTab('notifs')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: activeTab === 'notifs' ? 'var(--accent-primary)' : 'var(--card-bg)',
            color: activeTab === 'notifs' ? '#ffffff' : '#1C1917',
            border: '1px solid var(--border-color)',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Send size={14} /> WhatsApp / Twilio Simulator Logs ({simulatedNotifs.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: activeTab === 'logs' ? 'var(--accent-primary)' : 'var(--card-bg)',
            color: activeTab === 'logs' ? '#ffffff' : '#1C1917',
            border: '1px solid var(--border-color)',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Activity size={14} /> System Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Staff View */}
      {activeTab === 'staff' && (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700' }}>User Management</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Create, view, edit, and delete administrator, manager, and designer accounts.
              </p>
            </div>
            <button
              onClick={() => setShowAddStaffModal(true)}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={14} /> Add User
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input type="search" aria-label="Search users" placeholder="Search name, email, or phone" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220, flex: 1, padding: '8px 10px', border: '1px solid #D6D3D1', borderRadius: 6 }} />
            <select aria-label="Filter users by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #D6D3D1', borderRadius: 6 }}>
              <option value="all">All roles</option><option value="admin">Administrators</option><option value="manager">Managers</option><option value="designer">Designers</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Name</th>
                  <th style={{ padding: '10px 8px' }}>Email</th>
                  <th style={{ padding: '10px 8px' }}>Role</th>
                  <th style={{ padding: '10px 8px' }}>Phone</th>
                  <th style={{ padding: '10px 8px' }}>Account</th>
                  <th style={{ padding: '10px 8px' }}>Workload Meter</th>
                  <th style={{ padding: '10px 8px' }}>Max Capacity</th>
                  <th style={{ padding: '10px 8px' }}>Auto-Assign Status</th>
                  <th style={{ padding: '10px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.filter((s) => (roleFilter === 'all' || s.role === roleFilter) && [s.name, s.email, s.phone].some((value) => String(value || '').toLowerCase().includes(search.trim().toLowerCase()))).map((s) => {
                  const percent = s.maxActiveWorkload ? Math.min(100, (s.currentActiveWorkload / s.maxActiveWorkload) * 100) : 0;
                  return (
                    <tr key={s._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 8px', fontWeight: '600' }}>{s.name}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{s.email}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            backgroundColor:
                              s.role === 'admin' ? '#581c87' : s.role === 'manager' ? '#1e3a8a' : '#14532d',
                            color:
                              s.role === 'admin' ? '#d8b4fe' : s.role === 'manager' ? '#93c5fd' : '#86efac',
                          }}
                        >
                          {s.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>{s.phone || '—'}</td>
                      <td style={{ padding: '12px 8px', color: s.isActive ? '#166534' : '#991B1B' }}>{s.isActive ? 'Active' : 'Inactive'}</td>
                      <td style={{ padding: '12px 8px', width: '200px' }}>
                        {s.role === 'designer' ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                              <span>{s.currentActiveWorkload || 0} active</span>
                              <span>max {s.maxActiveWorkload || 5}</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${percent}%`,
                                  height: '100%',
                                  backgroundColor: percent >= 100 ? '#ef4444' : percent >= 60 ? '#f59e0b' : '#10b981',
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>N/A (Oversight Role)</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {s.role === 'designer' ? (
                          <input
                            type="number"
                            min={1}
                            max={20}
                            defaultValue={s.maxActiveWorkload || 5}
                            onBlur={(e) => handleUpdateStaff(s._id, { maxActiveWorkload: Number(e.target.value) })}
                            style={{
                              width: '60px',
                              padding: '4px 6px',
                              backgroundColor: 'var(--input-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              color: 'var(--text-main)',
                              fontSize: '12px',
                            }}
                          />
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {s.role === 'designer' ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={s.isEligibleForAssignment !== false}
                              onChange={(e) => handleUpdateStaff(s._id, { isEligibleForAssignment: e.target.checked })}
                            />
                            {s.isEligibleForAssignment !== false ? 'Eligible' : 'Paused'}
                          </label>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>
                        <button type="button" title="View user" aria-label={`View ${s.name}`} onClick={() => openUser(s, 'view')} style={{ padding: 6, marginRight: 4 }}><Eye size={15} /></button>
                        <button type="button" title="Edit user" aria-label={`Edit ${s.name}`} onClick={() => openUser(s, 'edit')} style={{ padding: 6, marginRight: 4 }}><Pencil size={15} /></button>
                        <button type="button" title="Delete user" aria-label={`Delete ${s.name}`} onClick={() => openUser(s, 'delete')} style={{ padding: 6, color: '#991B1B' }}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WhatsApp / Notification Simulator View */}
      {activeTab === 'notifs' && (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700' }}>WhatsApp & Twilio Dispatched Messages</h2>
            <button
              onClick={loadData}
              style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', padding: '4px' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {simulatedNotifs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                No notifications logged yet. Trigger milestones (payment verification, draft release, print dispatch) to test.
              </div>
            ) : (
              simulatedNotifs.map((n) => (
                <div
                  key={n.id}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          backgroundColor: '#064e3b',
                          color: '#6ee7b7',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {n.channel} • {n.template}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>To: {n.to}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px', color: '#cbd5e1' }}>
                    {n.message}
                  </pre>
                  {n.mediaUrl && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#60a5fa' }}>
                      Media: <a href={n.mediaUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{n.mediaUrl}</a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Audit Logs View */}
      {activeTab === 'logs' && (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Conveyor Belt Audit Trail</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {auditLogs.map((log) => (
              <div
                key={log._id}
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <div>
                  <strong style={{ color: '#60a5fa' }}>[{log.action}]</strong> by{' '}
                  <strong>{log.actor?.name || log.actor?.type}</strong>
                  {log.details && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                      {JSON.stringify(log.details)}
                    </span>
                  )}
                </div>
                <span style={{ color: 'var(--text-muted)' }}>
                  {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '24px',
              width: '420px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Add Internal User</h3>
              <button onClick={() => { setShowAddStaffModal(false); setError(null); }} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {error && <div role="alert" style={{ padding: 10, background: '#FEF2F2', color: '#991B1B', borderRadius: 6, marginBottom: 12 }}>{error}</div>}
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Phone</label>
                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} style={{ width: '100%', padding: '8px 10px', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '13px' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Role *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                >
                  <option value="designer">Designer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', padding: '6px 12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {userModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div role="dialog" aria-modal="true" aria-label={`${userModal} user`} style={{ background: '#FFFFFF', color: '#1C1917', borderRadius: 8, padding: 24, width: 'min(100%, 460px)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{userModal === 'view' ? 'User Details' : userModal === 'edit' ? 'Edit User' : 'Delete User'}</h3>
              <button type="button" onClick={() => { setUserModal(null); setError(null); }} aria-label="Close"><X size={18} /></button>
            </div>
            {error && <div role="alert" style={{ padding: 10, background: '#FEF2F2', color: '#991B1B', borderRadius: 6, marginBottom: 12 }}>{error}</div>}
            {userModal === 'view' && <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, fontSize: 14 }}>
              {[
                ['Name', selectedUser.name], ['Email', selectedUser.email], ['Phone', selectedUser.phone || '—'],
                ['Role', selectedUser.role], ['Status', selectedUser.isActive ? 'Active' : 'Inactive'],
                ...(selectedUser.role === 'designer' ? [['Active orders', selectedUser.currentActiveWorkload || 0], ['Capacity', selectedUser.maxActiveWorkload], ['Auto assignment', selectedUser.isEligibleForAssignment ? 'Eligible' : 'Paused']] : []),
                ['Created', new Date(selectedUser.createdAt).toLocaleString()],
              ].map(([key, value]) => <React.Fragment key={key}><strong>{key}</strong><span>{value}</span></React.Fragment>)}
            </div>}
            {userModal === 'delete' && <>
              <p>Delete <strong>{selectedUser.name}</strong> ({selectedUser.email})? Their access ends immediately. Existing order and audit history remains available.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setUserModal(null)}>Cancel</button>
                <button type="button" disabled={saving} onClick={deleteUser} style={{ background: '#991B1B', color: '#FFFFFF', border: 0, borderRadius: 6, padding: '8px 12px' }}>{saving ? 'Deleting…' : 'Delete User'}</button>
              </div>
            </>}
            {userModal === 'edit' && <form onSubmit={saveUser} style={{ display: 'grid', gap: 12 }}>
              <label>Full name *<input required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} style={{ display: 'block', width: '100%', padding: 8 }} /></label>
              <label>Email *<input type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} style={{ display: 'block', width: '100%', padding: 8 }} /></label>
              <label>Phone<input type="tel" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} style={{ display: 'block', width: '100%', padding: 8 }} /></label>
              <label>Role *<select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} style={{ display: 'block', width: '100%', padding: 8 }}><option value="admin">Administrator</option><option value="manager">Manager</option><option value="designer">Designer</option></select></label>
              <label>New password (leave blank to keep current)<input type="password" minLength={8} autoComplete="new-password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} style={{ display: 'block', width: '100%', padding: 8 }} /></label>
              <label><input type="checkbox" checked={userForm.isActive} onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })} /> Active account</label>
              {userForm.role === 'designer' && <>
                <label>Maximum active orders<input type="number" min="1" max="20" required value={userForm.maxActiveWorkload} onChange={(e) => setUserForm({ ...userForm, maxActiveWorkload: e.target.value })} style={{ display: 'block', width: '100%', padding: 8 }} /></label>
                <label><input type="checkbox" checked={userForm.isEligibleForAssignment} onChange={(e) => setUserForm({ ...userForm, isEligibleForAssignment: e.target.checked })} /> Eligible for automatic assignment</label>
              </>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" onClick={() => setUserModal(null)}>Cancel</button><button type="submit" disabled={saving} style={{ background: '#1C1917', color: '#FFFFFF', border: 0, borderRadius: 6, padding: '8px 12px' }}>{saving ? 'Saving…' : 'Save Changes'}</button></div>
            </form>}
          </div>
        </div>
      )}
    </div>
  );
}
