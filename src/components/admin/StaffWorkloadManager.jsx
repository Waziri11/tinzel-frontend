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
} from 'lucide-react';
import { api } from '../../services/api';

export default function StaffWorkloadManager({ token }) {
  const [staff, setStaff] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [simulatedNotifs, setSimulatedNotifs] = useState([]);
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'logs' | 'notifs'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New staff modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('tinzel123');
  const [newRole, setNewRole] = useState('designer');
  const [newMaxWorkload, setNewMaxWorkload] = useState(5);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, logsRes, configRes] = await Promise.all([
        api.admin.getStaff(token),
        api.admin.getAuditLogs(token),
        api.admin.getConfig(token),
      ]);
      setStaff(staffRes.staff || []);
      setAuditLogs(logsRes.logs || []);
      setSimulatedNotifs(configRes.simulatedNotifications || []);
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
      alert(err.message);
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
        maxActiveWorkload: Number(newMaxWorkload),
      });
      setShowAddStaffModal(false);
      setNewName('');
      setNewEmail('');
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: activeTab === 'staff' ? 'var(--accent-primary)' : 'var(--card-bg)',
            color: '#ffffff',
            border: '1px solid var(--border-color)',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Users size={14} /> Staff Workloads & Access ({staff.length})
        </button>

        <button
          onClick={() => setActiveTab('notifs')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: activeTab === 'notifs' ? 'var(--accent-primary)' : 'var(--card-bg)',
            color: '#ffffff',
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
            color: '#ffffff',
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
              <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Production Staff & Designer Workloads</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Paid orders are automatically assigned to eligible designers with lowest active workload.
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
              <Plus size={14} /> Add Staff Account
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Name</th>
                  <th style={{ padding: '10px 8px' }}>Email</th>
                  <th style={{ padding: '10px 8px' }}>Role</th>
                  <th style={{ padding: '10px 8px' }}>Workload Meter</th>
                  <th style={{ padding: '10px 8px' }}>Max Capacity</th>
                  <th style={{ padding: '10px 8px' }}>Auto-Assign Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => {
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
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Add Staff Account</h3>
              <button onClick={() => setShowAddStaffModal(false)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

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
    </div>
  );
}
