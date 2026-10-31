import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  Plus,
  Send,
  RefreshCw,
  X,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCw,
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

  // Twilio & Notifications State
  const [twilioDiagnostics, setTwilioDiagnostics] = useState(null);
  const [notifChannelFilter, setNotifChannelFilter] = useState('all');
  const [notifStatusFilter, setNotifStatusFilter] = useState('all');
  const [showTestNotifModal, setShowTestNotifModal] = useState(false);
  const [testNotifData, setTestNotifData] = useState({ to: '', channel: 'whatsapp', message: '' });
  const [testNotifSending, setTestNotifSending] = useState(false);
  const [resendingId, setResendingId] = useState(null);

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
      const [logsRes, notifsRes, diagRes] = await Promise.allSettled([
        api.admin.getAuditLogs(token),
        api.notifications.getHistory(token, { limit: 100 }),
        api.notifications.getDiagnostics(token),
      ]);
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value.logs || []);
      if (notifsRes.status === 'fulfilled') setSimulatedNotifs(notifsRes.value.notifications || []);
      if (diagRes.status === 'fulfilled') setTwilioDiagnostics(diagRes.value.diagnostics || null);
    } catch (err) {
      setError(err.message || 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleResendNotif = async (id, channel) => {
    try {
      setResendingId(id);
      await api.notifications.resend(token, id, channel);
      setNotice(`Notification re-sent successfully via ${channel.toUpperCase()}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to resend notification');
    } finally {
      setResendingId(null);
    }
  };

  const handleSendTestNotif = async (e) => {
    e.preventDefault();
    if (!testNotifData.to || !testNotifData.message) return;
    try {
      setTestNotifSending(true);
      await api.notifications.testSend(token, testNotifData);
      setNotice(`Test message dispatched to ${testNotifData.to}`);
      setShowTestNotifModal(false);
      setTestNotifData({ to: '', channel: 'whatsapp', message: '' });
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to send test notification');
    } finally {
      setTestNotifSending(false);
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
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
          <Users size={14} /> Users <span aria-label={`${staff.length} users`}>{staff.length}</span>
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
          <Send size={14} /> Messages <span aria-label={`${simulatedNotifs.length} messages`}>{simulatedNotifs.length}</span>
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
          <Activity size={14} /> Audit <span aria-label={`${auditLogs.length} audit entries`}>{auditLogs.length}</span>
        </button>
      </div>

      {/* Staff View */}
      {activeTab === 'staff' && (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '14px' }}>
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

          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input type="search" aria-label="Search users" placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220, flex: 1, padding: '8px 10px', border: '1px solid #D6D3D1', borderRadius: 6 }} />
            <select aria-label="Filter users by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #D6D3D1', borderRadius: 6 }}>
              <option value="all">All roles</option><option value="admin">Administrators</option><option value="manager">Managers</option><option value="designer">Designers</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>User</th>
                  <th style={{ padding: '10px 8px' }}>Role</th>
                  <th style={{ padding: '10px 8px' }}>Status</th>
                  <th style={{ padding: '10px 8px' }}>Workload</th>
                  <th style={{ padding: '10px 8px' }}>Auto-assign</th>
                  <th style={{ padding: '10px 8px' }}><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {staff.filter((s) => (roleFilter === 'all' || s.role === roleFilter) && [s.name, s.email, s.phone].some((value) => String(value || '').toLowerCase().includes(search.trim().toLowerCase()))).map((s) => {
                  const percent = s.maxActiveWorkload ? Math.min(100, (s.currentActiveWorkload / s.maxActiveWorkload) * 100) : 0;
                  return (
                    <tr key={s._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 8px', minWidth: 200 }}>
                        <strong style={{ display: 'block' }}>{s.name}</strong>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12 }}>{s.email}</span>
                        {s.phone && <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11 }}>{s.phone}</span>}
                      </td>
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
                      <td style={{ padding: '12px 8px', color: s.isActive ? '#166534' : '#991B1B' }}>{s.isActive ? 'Active' : 'Inactive'}</td>
                      <td style={{ padding: '12px 8px', width: '180px' }}>
                        {s.role === 'designer' ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                              <span>{s.currentActiveWorkload || 0} active</span>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <span className="visually-hidden">Maximum active orders for {s.name}</span>
                                / <input
                                  aria-label={`Maximum active orders for ${s.name}`}
                                  type="number"
                                  min={1}
                                  max={20}
                                  defaultValue={s.maxActiveWorkload || 5}
                                  onBlur={(e) => handleUpdateStaff(s._id, { maxActiveWorkload: Number(e.target.value) })}
                                  style={{ width: 42, padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 11 }}
                                />
                              </label>
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
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
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
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
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

      {/* Twilio & Multi-Channel Communications View */}
      {activeTab === 'notifs' && (
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          {/* Header & Diagnostics */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Communications & Twilio</h2>
              {twilioDiagnostics?.mode === 'twilio_live' ? (
                <span
                  style={{
                    backgroundColor: '#064e3b',
                    color: '#6ee7b7',
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle2 size={13} /> Twilio Live Connected ({twilioDiagnostics.accountName || 'Active'})
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: '#1e3a8a',
                    color: '#93c5fd',
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Clock size={13} /> Simulation / Sandbox Mode
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowTestNotifModal(true)}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <Send size={13} /> Send Test Message
              </button>
              <button
                type="button"
                onClick={loadData}
                title="Refresh messages"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                }}
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Channel:</span>
              {['all', 'whatsapp', 'sms', 'email'].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setNotifChannelFilter(ch)}
                  style={{
                    backgroundColor: notifChannelFilter === ch ? '#2563eb' : 'var(--bg-primary)',
                    color: notifChannelFilter === ch ? '#ffffff' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {ch}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Status:</span>
              {['all', 'delivered', 'sent', 'received', 'failed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setNotifStatusFilter(st)}
                  style={{
                    backgroundColor: notifStatusFilter === st ? '#374151' : 'var(--bg-primary)',
                    color: notifStatusFilter === st ? '#ffffff' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Messages List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(() => {
              const filtered = simulatedNotifs.filter((n) => {
                if (notifChannelFilter !== 'all' && (n.channel || '').toLowerCase() !== notifChannelFilter) return false;
                if (notifStatusFilter !== 'all' && (n.status || '').toLowerCase() !== notifStatusFilter) return false;
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0', textAlign: 'center' }}>
                    No messages matching current filters.
                  </div>
                );
              }

              return filtered.map((n) => {
                const isFailed = n.status === 'failed' || n.status === 'undelivered';
                const isDelivered = n.status === 'delivered';
                const isReceived = n.status === 'received' || n.direction === 'inbound';
                const recipient = n.recipient || n.to || '—';
                const channel = n.channel || 'whatsapp';
                const dateString = n.createdAt || n.timestamp;

                return (
                  <div
                    key={n._id || n.id}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: isFailed ? '1px solid #7f1d1d' : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Channel Badge */}
                        <span
                          style={{
                            backgroundColor: channel === 'whatsapp' ? '#064e3b' : channel === 'sms' ? '#1e3a8a' : '#581c87',
                            color: channel === 'whatsapp' ? '#6ee7b7' : channel === 'sms' ? '#93c5fd' : '#d8b4fe',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {channel}
                        </span>

                        {/* Status Badge */}
                        <span
                          style={{
                            backgroundColor: isDelivered ? '#064e3b' : isFailed ? '#7f1d1d' : isReceived ? '#374151' : '#1e3a8a',
                            color: isDelivered ? '#6ee7b7' : isFailed ? '#fca5a5' : isReceived ? '#e5e7eb' : '#93c5fd',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {n.status || 'sent'}
                        </span>

                        {/* Direction / Fallback indicators */}
                        {n.direction === 'inbound' && (
                          <span style={{ fontSize: '11px', backgroundColor: '#374151', color: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>
                            Inbound
                          </span>
                        )}

                        {n.fallbackFromChannel && (
                          <span style={{ fontSize: '11px', backgroundColor: '#78350f', color: '#fde68a', padding: '2px 6px', borderRadius: '4px' }}>
                            Fallback from {n.fallbackFromChannel}
                          </span>
                        )}

                        <span style={{ fontSize: '13px', fontWeight: '600' }}>
                          {n.direction === 'inbound' ? `From: ${recipient}` : `To: ${recipient}`}
                        </span>

                        {n.template && (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            • {n.template}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {dateString && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(dateString).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px', color: 'var(--text-main)', margin: '4px 0' }}>
                      {n.message}
                    </pre>

                    {n.mediaUrl && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#60a5fa' }}>
                        Media: <a href={n.mediaUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{n.mediaUrl}</a>
                      </div>
                    )}

                    {/* Twilio SID & Error display */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        {n.twilioSid && <span>SID: {n.twilioSid} • </span>}
                        <span>Mode: {n.mode || 'simulated'}</span>
                        {n.errorCode && <span style={{ color: '#f87171' }}> • Error Code: {n.errorCode}</span>}
                        {n.errorMessage && <div style={{ color: '#f87171', marginTop: '2px' }}>{n.errorMessage}</div>}
                      </div>

                      {/* Resend Action if failed */}
                      {isFailed && (n._id || n.id) && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            disabled={resendingId === (n._id || n.id)}
                            onClick={() => handleResendNotif(n._id || n.id, 'sms')}
                            style={{
                              backgroundColor: '#1e3a8a',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Resend SMS
                          </button>
                          <button
                            type="button"
                            disabled={resendingId === (n._id || n.id)}
                            onClick={() => handleResendNotif(n._id || n.id, 'whatsapp')}
                            style={{
                              backgroundColor: '#064e3b',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Resend WhatsApp
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
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
            padding: '20px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Audit log</h2>

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

      {showTestNotifModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div role="dialog" aria-modal="true" aria-label="Send test notification" style={{ backgroundColor: '#ffffff', color: '#1c1917', borderRadius: '8px', padding: '24px', width: 'min(100%, 460px)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Send Test Notification</h3>
              <button type="button" onClick={() => setShowTestNotifModal(false)} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSendTestNotif} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Recipient Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+255712345678 or 0712345678"
                  value={testNotifData.to}
                  onChange={(e) => setTestNotifData({ ...testNotifData, to: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Channel *
                </label>
                <select
                  value={testNotifData.channel}
                  onChange={(e) => setTestNotifData({ ...testNotifData, channel: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="whatsapp">WhatsApp (Twilio)</option>
                  <option value="sms">SMS (Twilio)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  Message Content *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Habari! Hili ni jaribio la ujumbe kutoka Tinzel platform."
                  value={testNotifData.message}
                  onChange={(e) => setTestNotifData({ ...testNotifData, message: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowTestNotifModal(false)}
                  style={{ backgroundColor: 'transparent', border: '1px solid #d1d5db', padding: '8px 14px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testNotifSending}
                  style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {testNotifSending ? 'Sending…' : 'Send Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

