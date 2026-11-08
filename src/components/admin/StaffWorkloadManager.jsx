import PhoneInput from '../common/PhoneInput';
import SoftFlutter, { ActionButton } from '../common/SoftFlutter';
import PageSkeleton from '../common/PageSkeleton';
import StatePanel, { StateError } from '../common/StatePanel';
import { useConfirm } from '../common/ConfirmDialog';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import './administration.css';
import { useLanguage } from '../../i18n/LanguageContext';
import StaffOnboardingStatus, {
  onboardingLabel,
} from './StaffOnboardingStatus';
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

export default function StaffWorkloadManager({
  token,
  role = 'admin',
  initialTab = 'staff',
  systemOnly = false,
}) {
  const tx = useInterfaceText();
  const confirm = useConfirm();
  const managerOnly = role === 'manager';
  const staffApi = api.staffManagement(role);

  const { lang } = useLanguage();
  const ui = (en, sw) => (lang === 'sw' ? sw : en);
  const [checking, setChecking] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState(null);
  const [staff, setStaff] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [simulatedNotifs, setSimulatedNotifs] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab); // 'staff' | 'logs' | 'notifs'
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [sectionErrors, setSectionErrors] = useState({});
  const [sectionBusy, setSectionBusy] = useState({});
  const [rowStates, setRowStates] = useState({});
  const [openingUser, setOpeningUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModal, setUserModal] = useState(null); // 'view' | 'edit' | 'delete'
  const [userForm, setUserForm] = useState({});
  const [userBaseline, setUserBaseline] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Twilio & Notifications State
  const [twilioDiagnostics, setTwilioDiagnostics] = useState(null);
  const [notifChannelFilter, setNotifChannelFilter] = useState('all');
  const [notifStatusFilter, setNotifStatusFilter] = useState('all');
  const [showTestNotifModal, setShowTestNotifModal] = useState(false);
  const [testNotifData, setTestNotifData] = useState({
    to: '',
    channel: 'whatsapp',
    message: '',
  });
  const [testNotifSending, setTestNotifSending] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  // New staff modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLanguage, setNewLanguage] = useState(lang || 'sw');
  const [creating, setCreating] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('designer');
  const [newMaxWorkload, setNewMaxWorkload] = useState(5);

  const closeDialogs = async () => {
    if (saving || creating || testNotifSending) return;
    const dirty = (userModal === 'edit' && JSON.stringify(userForm) !== userBaseline) || (showAddStaffModal && Boolean(newName || newEmail || newPhone)) || (showTestNotifModal && Boolean(testNotifData.to || testNotifData.message));
    if (dirty && !await confirm({ title: ui('Discard these changes?', 'Ondoa mabadiliko haya?'), description: ui('This form has changes that have not been saved or sent.', 'Fomu hii ina mabadiliko ambayo hayajahifadhiwa au kutumwa.'), confirmLabel: ui('Discard changes', 'Ondoa mabadiliko'), cancelLabel: ui('Keep editing', 'Endelea kuhariri'), danger: true })) return;
    setShowAddStaffModal(false); setUserModal(null); setShowTestNotifModal(false); setError(null);
  };
  useDialogFocus(Boolean(showAddStaffModal || userModal || showTestNotifModal), closeDialogs);
  useEffect(() => { loadData(); }, [token]);

  const loadData = async (only) => {
    const keys = typeof only === 'string' ? [only] : [...(!systemOnly ? ['staff'] : []), ...(!managerOnly ? ['logs', 'notifs'] : [])];
    setLoading(true);
    await Promise.all(keys.map(async key => {
      setSectionBusy(current => ({ ...current, [key]: true }));
      setSectionErrors(current => ({ ...current, [key]: null }));
      try {
        if (key === 'staff') setStaff((await staffApi.getStaff(token)).staff || []);
        if (key === 'logs') setAuditLogs((await api.admin.getAuditLogs(token)).logs || []);
        if (key === 'notifs') setSimulatedNotifs((await api.notifications.getHistory(token, { limit: 100 })).notifications || []);
      } catch (err) { setSectionErrors(current => ({ ...current, [key]: err })); }
      finally { setSectionBusy(current => ({ ...current, [key]: false })); }
    }));
    setLoading(false); setHasLoaded(true);
  };

  const handleResendNotif = async (id, channel) => {
    try {
      setResendingId(id);
      await api.notifications.resend(token, id, channel);
      setNotice(
        ui('Retry processed. Check the recorded channel outcome.', 'Jaribio limeshughulikiwa. Angalia matokeo ya njia ya ujumbe.'),
      );
      await loadData();
    } catch (err) {
      setError(err);
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
      setNotice(ui('Test request processed. Check the delivery outcome.', 'Ombi la majaribio limeshughulikiwa. Angalia matokeo ya uwasilishaji.'));
      setShowTestNotifModal(false);
      setTestNotifData({ to: '', channel: 'whatsapp', message: '' });
      await loadData();
    } catch (err) {
      setError(err);
    } finally {
      setTestNotifSending(false);
    }
  };

  const handleUpdateStaff = async (id, updates) => {
    if (rowStates[id]?.busy) return;
    if ('maxActiveWorkload' in updates && (!Number.isInteger(updates.maxActiveWorkload) || updates.maxActiveWorkload < 1 || updates.maxActiveWorkload > 20)) { setRowStates(current => ({ ...current, [id]: { validation: true } })); return; }
    setRowStates(current => ({ ...current, [id]: { busy: true } }));
    try {
      await staffApi.updateStaff(token, id, updates);
      setStaff(current => current.map(item => item._id === id ? { ...item, ...updates } : item));
      setRowStates(current => ({ ...current, [id]: { saved: true } }));
    } catch (err) {
      setRowStates(current => ({ ...current, [id]: { error: err, updates } }));
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      await staffApi.createStaff(token, {
        name: newName,
        email: newEmail,
        preferredLanguage: newLanguage,
        role: newRole,
        phone: newPhone,
        maxActiveWorkload: Number(newMaxWorkload),
      });
      setShowAddStaffModal(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');

      setNotice(
        ui('User account created. Initial credentials are queued for SMS and email. Open the user details to check delivery.', 'Akaunti imeundwa. Taarifa za kuingia zinasubiri kutumwa kwa SMS na barua pepe. Fungua maelezo ya mtumiaji kuangalia uwasilishaji.'),
      );
      await loadData();
    } catch (err) {
      setError(
        err.code === 'STAFF_CREDENTIAL_CONFIG_REQUIRED'
          ? 'Staff credential delivery is not configured. Configure the credential encryption key before creating users.'
          : err.message,
      );
    } finally {
      setCreating(false);
    }
  };

  const openUser = async (user, mode) => {
    setError(null); setOpeningUser(user._id);
    try {
      const response = await staffApi.getStaffUser(token, user._id);
      setSelectedUser(response.user);
      const nextForm = {
        name: response.user.name,
        email: response.user.email,
        phone: response.user.phone || '',
        role: response.user.role,
        isActive: response.user.isActive,
        isEligibleForAssignment:
          response.user.isEligibleForAssignment !== false,
        maxActiveWorkload: response.user.maxActiveWorkload ?? 5,
        preferredLanguage: response.user.preferredLanguage || 'sw',
      };
      setUserForm(nextForm); setUserBaseline(JSON.stringify(nextForm));
      setUserModal(mode);
    } catch (err) {
      setError(err);
    } finally { setOpeningUser(null); }
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...userForm,
        maxActiveWorkload: Number(userForm.maxActiveWorkload),
      };

      await staffApi.updateStaff(token, selectedUser._id, payload);
      setUserModal(null);
      setNotice(ui('User account updated.', 'Akaunti imesasishwa.'));
      await loadData();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    setSaving(true);
    setError(null);
    try {
      await staffApi.deleteStaff(token, selectedUser._id);
      setUserModal(null);
      setNotice(
        ui('User account deleted. Its order and audit history was preserved.', 'Akaunti imefutwa. Historia yake ya oda na ukaguzi imehifadhiwa.'),
      );
      await loadData();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const visibleStaff = staff.filter(s => (roleFilter === 'all' || s.role === roleFilter) && [s.name, s.email, s.phone].some(value => String(value || '').toLowerCase().includes(search.trim().toLowerCase())));
  if (loading && !hasLoaded) return <PageSkeleton variant="table" />;

  return (
    <div className="team-admin">
      {notice && <StatePanel compact kind="success" title={notice} />}
      {error && !userModal && <StateError compact error={error} />}
      {sectionErrors[activeTab] && <StateError compact error={sectionErrors[activeTab]} title={ui('This section could not be refreshed', 'Sehemu hii haikuweza kusasishwa')} onRetry={() => loadData(activeTab)} />}
      {sectionErrors[activeTab] && (activeTab === 'staff' ? staff.length : activeTab === 'logs' ? auditLogs.length : simulatedNotifs.length) > 0 && <StatePanel compact kind="warning" title={ui('Showing previously loaded records', 'Inaonyesha rekodi zilizopakiwa awali')} />}
      {sectionBusy[activeTab] && <StatePanel compact kind="loading" title={ui('Refreshing this section…', 'Inasasisha sehemu hii…')} />}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        {!systemOnly && (
          <button
            onClick={() => setActiveTab('staff')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor:
                activeTab === 'staff'
                  ? 'var(--accent-primary)'
                  : 'var(--card-bg)',
              color: activeTab === 'staff' ? '#ffffff' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Users size={14} />
            <InterfaceText>Users</InterfaceText>
            <span aria-label={sectionErrors.staff ? ui("Staff count unavailable", "Idadi ya wafanyakazi haipatikani") : `${staff.length} users`}>{sectionErrors.staff && !staff.length ? "—" : staff.length}</span>
          </button>
        )}

        {!managerOnly && systemOnly && (
          <button
            onClick={() => setActiveTab('notifs')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor:
                activeTab === 'notifs'
                  ? 'var(--accent-primary)'
                  : 'var(--card-bg)',
              color: activeTab === 'notifs' ? '#ffffff' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Send size={14} />
            <InterfaceText>Messages</InterfaceText>
            <span aria-label={`${simulatedNotifs.length} messages`}>
              {simulatedNotifs.length}
            </span>
          </button>
        )}

        {!managerOnly && systemOnly && (
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor:
                activeTab === 'logs'
                  ? 'var(--accent-primary)'
                  : 'var(--card-bg)',
              color: activeTab === 'logs' ? '#ffffff' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Activity size={14} />
            <InterfaceText>Audit</InterfaceText>
            <span aria-label={`${auditLogs.length} audit entries`}>
              {auditLogs.length}
            </span>
          </button>
        )}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginBottom: '14px',
            }}
          >
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
              <Plus size={14} />
              <InterfaceText>Add User</InterfaceText>
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <input
              type="search"
              aria-label={tx('Search users')}
              placeholder={tx('Search users')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                minWidth: 220,
                flex: 1,
                padding: '8px 10px',
                border: '1px solid #D6D3D1',
                borderRadius: 6,
              }}
            />
            <select
              aria-label={tx('Filter users by role')}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: '8px 10px',
                border: '1px solid #D6D3D1',
                borderRadius: 6,
              }}
            >
              <option value="all">
                <InterfaceText>All roles</InterfaceText>
              </option>
              {!managerOnly && (
                <option value="admin">
                  <InterfaceText>Administrators</InterfaceText>
                </option>
              )}
              {!managerOnly && (
                <option value="manager">
                  <InterfaceText>Managers</InterfaceText>
                </option>
              )}
              <option value="designer">
                <InterfaceText>Designers</InterfaceText>
              </option>
            </select>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-label={tx('Users')}
            style={{ overflowX: 'auto' }}
          >
            <table className="staff-users-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    textAlign: 'left',
                    color: 'var(--text-muted)',
                  }}
                >
                  <th style={{ padding: '10px 8px' }}>
                    <InterfaceText>User</InterfaceText>
                  </th>
                  <th style={{ padding: '10px 8px' }}>
                    <InterfaceText>Role</InterfaceText>
                  </th>
                  <th style={{ padding: '10px 8px' }}>
                    <InterfaceText>Status</InterfaceText>
                  </th>
                  <th style={{ padding: '10px 8px' }}>
                    <InterfaceText>Workload</InterfaceText>
                  </th>
                  <th style={{ padding: '10px 8px' }}>
                    <InterfaceText>Auto-assign</InterfaceText>
                  </th>
                  <th style={{ padding: '10px 8px' }}>
                    <span className="visually-hidden">
                      <InterfaceText>Actions</InterfaceText>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!visibleStaff.length && !sectionErrors.staff && !sectionBusy.staff && <tr><td colSpan={6}><StatePanel compact kind="empty" title={staff.length ? ui('No staff match these filters', 'Hakuna wafanyakazi wanaolingana na vichujio') : ui('No staff members yet', 'Hakuna wafanyakazi bado')} description={staff.length ? ui('Clear the search or role filter to see your team.', 'Ondoa utafutaji au kichujio cha jukumu kuona timu yako.') : ui('Add a staff member to start assigning work.', 'Ongeza mfanyakazi kuanza kugawa kazi.')}><button className="ui-button" onClick={() => { if (staff.length) { setSearch(''); setRoleFilter('all'); } else setShowAddStaffModal(true); }}>{staff.length ? ui('Clear filters', 'Ondoa vichujio') : ui('Add user', 'Ongeza mtumiaji')}</button></StatePanel></td></tr>}
                {visibleStaff
                  .map((s) => {
                    const percent = s.maxActiveWorkload
                      ? Math.min(
                          100,
                          (s.currentActiveWorkload / s.maxActiveWorkload) * 100,
                        )
                      : 0;
                    return (
                      <tr
                        key={s._id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                        }}
                      >
                        <td data-label={tx('User')} style={{ padding: '12px 8px', minWidth: 200 }}>
                          <strong style={{ display: 'block' }}>{s.name}</strong>
                          {rowStates[s._id]?.busy && <span role="status">{ui('Saving…', 'Inahifadhi…')}</span>}
                          {rowStates[s._id]?.saved && <span role="status">{ui('Saved', 'Imehifadhiwa')}</span>}
                          {rowStates[s._id]?.validation && <StatePanel compact kind="warning" title={ui("Enter a capacity from 1 to 20", "Weka uwezo kati ya 1 na 20")} />}
                          {rowStates[s._id]?.error && <StateError compact error={rowStates[s._id].error} onRetry={() => handleUpdateStaff(s._id, rowStates[s._id].updates)} />}
                          <span
                            style={{
                              display: 'block',
                              color: 'var(--text-muted)',
                              fontSize: 12,
                            }}
                          >
                            {s.email}
                          </span>
                          {s.phone && (
                            <span
                              style={{
                                display: 'block',
                                color: 'var(--text-muted)',
                                fontSize: 11,
                              }}
                            >
                              {s.phone}
                            </span>
                          )}
                        </td>
                        <td data-label={tx('Role')} style={{ padding: '12px 8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              backgroundColor:
                                s.role === 'admin'
                                  ? '#581c87'
                                  : s.role === 'manager'
                                    ? '#1e3a8a'
                                    : '#14532d',
                              color:
                                s.role === 'admin'
                                  ? '#d8b4fe'
                                  : s.role === 'manager'
                                    ? '#93c5fd'
                                    : '#86efac',
                            }}
                          >
                            {s.role}
                          </span>
                        </td>
                        <td data-label={tx('Status')}
                          style={{
                            padding: '12px 8px',
                            color: s.isActive ? '#166534' : '#991B1B',
                          }}
                        >
                          {s.isActive ? ui('Active', 'Hai') : ui('Inactive', 'Haifanyi kazi')}
                          <small
                            style={{
                              display: 'block',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {onboardingLabel(s)}
                          </small>
                        </td>
                        <td data-label={tx('Workload')} style={{ padding: '12px 8px', width: '180px' }}>
                          {s.role === 'designer' ? (
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: '11px',
                                  marginBottom: '4px',
                                }}
                              >
                                <span>
                                  {s.currentActiveWorkload || 0}{' '}
                                  <InterfaceText>active</InterfaceText>
                                </span>
                                <label
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <span className="visually-hidden">
                                    <InterfaceText>
                                      Maximum active orders for
                                    </InterfaceText>{' '}
                                    {s.name}
                                  </span>
                                  /{' '}
                                  <input
                                    aria-label={`Maximum active orders for ${s.name}`} disabled={rowStates[s._id]?.busy} aria-invalid={rowStates[s._id]?.validation || undefined}
                                    type="number"
                                    min={1}
                                    max={20}
                                    defaultValue={s.maxActiveWorkload ?? 5}
                                    onBlur={(e) =>
                                      handleUpdateStaff(s._id, {
                                        maxActiveWorkload: Number(
                                          e.target.value,
                                        ),
                                      })
                                    }
                                    style={{
                                      width: 42,
                                      padding: '2px 4px',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: 4,
                                      fontSize: 11,
                                    }}
                                  />
                                </label>
                              </div>
                              <div
                                style={{
                                  width: '100%',
                                  height: '6px',
                                  backgroundColor: 'var(--bg-primary)',
                                  borderRadius: '3px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${percent}%`,
                                    height: '100%',
                                    backgroundColor:
                                      percent >= 100
                                        ? '#ef4444'
                                        : percent >= 60
                                          ? '#f59e0b'
                                          : '#10b981',
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>
                              —
                            </span>
                          )}
                        </td>
                        <td data-label={tx('Auto-assign')} style={{ padding: '12px 8px' }}>
                          {s.role === 'designer' ? (
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                disabled={rowStates[s._id]?.busy} checked={s.isEligibleForAssignment !== false}
                                onChange={(e) =>
                                  handleUpdateStaff(s._id, {
                                    isEligibleForAssignment: e.target.checked,
                                  })
                                }
                              />
                              {s.isEligibleForAssignment !== false
                                ? 'Eligible'
                                : 'Paused'}
                            </label>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>
                              —
                            </span>
                          )}
                        </td>
                        <td data-label={tx('Actions')}
                          style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}
                        >
                          <ActionButton
                            type="button"
                            title={tx('View user')}
                            aria-label={`View ${s.name}`}
                            loading={openingUser === s._id} disabled={openingUser === s._id} onClick={() => openUser(s, 'view')}
                            style={{ padding: 6, marginRight: 4 }}
                          >
                            <Eye size={15} />
                          </ActionButton>
                          <ActionButton
                            type="button"
                            title={tx('Edit user')}
                            aria-label={`Edit ${s.name}`}
                            loading={openingUser === s._id} disabled={openingUser === s._id} onClick={() => openUser(s, 'edit')}
                            style={{ padding: 6, marginRight: 4 }}
                          >
                            <Pencil size={15} />
                          </ActionButton>
                          {!managerOnly && (
                            <ActionButton
                              type="button"
                              title={tx('Delete user')}
                              aria-label={`Delete ${s.name}`}
                              loading={openingUser === s._id} disabled={openingUser === s._id} onClick={() => openUser(s, 'delete')}
                              style={{ padding: 6, color: '#991B1B' }}
                            >
                              <Trash2 size={15} />
                            </ActionButton>
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
          <ActionButton
            type="button"
            className="ui-button"
            disabled={checking}
            onClick={async () => {
              setChecking(true); setDiagnosticError(null);
              try {
                const r = await api.notifications.getDiagnostics(token);
                setTwilioDiagnostics({
                  ...r.diagnostics,
                  checkedAt: new Date().toISOString(),
                });
              } catch (e) {
                setDiagnosticError(e);
              } finally {
                setChecking(false);
              }
            }}
          >
            {checking
              ? ui('Checking…', 'Inakagua…')
              : ui('Check connections', 'Kagua miunganisho')}
          </ActionButton>
          {!twilioDiagnostics && !checking && !diagnosticError && <StatePanel compact kind="info" title={ui('Connections have not been checked', 'Miunganisho haijakaguliwa')} description={ui('Use Check connections to request current provider results.', 'Tumia Kagua miunganisho kupata matokeo ya sasa ya watoa huduma.')} />}
          {diagnosticError && <StateError compact error={diagnosticError} title={ui('Connection check unavailable', 'Ukaguzi wa muunganisho haupatikani')} />}
          {diagnosticError && twilioDiagnostics && <StatePanel compact kind="warning" title={ui('Showing the previous connection check', 'Inaonyesha ukaguzi wa awali wa muunganisho')} />}
          {twilioDiagnostics && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(min(100%,240px),1fr))',
                gap: 16,
                margin: '16px 0',
              }}
            >
              {[
                [
                  'NextSMS',
                  twilioDiagnostics.sms,
                  twilioDiagnostics.sms?.authenticated,
                  [
                    ['API', twilioDiagnostics.sms?.apiVersion],
                    [
                      ui('Sender', 'Mtumaji'),
                      twilioDiagnostics.sms?.configuredSenderId,
                    ],
                    [
                      ui('Latency', 'Muda wa majibu'),
                      `${twilioDiagnostics.sms?.latencyMs ?? 0} ms`,
                    ],
                  ],
                ],
                [
                  ui('SMTP email', 'Barua pepe ya SMTP'),
                  twilioDiagnostics.email,
                  twilioDiagnostics.email?.connected,
                  [
                    [ui('Host', 'Seva'), twilioDiagnostics.email?.host],
                    [ui('Port', 'Mlango'), twilioDiagnostics.email?.port],
                    ['TLS', String(twilioDiagnostics.email?.secure ?? false)],
                    [ui('Sender', 'Mtumaji'), twilioDiagnostics.email?.from],
                    [
                      ui('Latency', 'Muda wa majibu'),
                      `${twilioDiagnostics.email?.latencyMs ?? 0} ms`,
                    ],
                  ],
                ],
                [
                  'Twilio / WhatsApp',
                  twilioDiagnostics.twilio,
                  twilioDiagnostics.twilio?.success,
                  [
                    [
                      ui('Account', 'Akaunti'),
                      twilioDiagnostics.twilio?.accountName,
                    ],
                    [ui('Status', 'Hali'), twilioDiagnostics.twilio?.status],
                    [
                      ui('Phone', 'Simu'),
                      twilioDiagnostics.twilio?.phoneNumber,
                    ],
                    ['WhatsApp', twilioDiagnostics.twilio?.whatsappNumber],
                  ],
                ],
              ].map(([name, report, connected, rows]) => (
                <section
                  key={name}
                  style={{
                    padding: 16,
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                  }}
                >
                  <h3>{name}</h3>
                  <p>
                    {!report ? ui('Unavailable', 'Haipatikani') : !report.configured
                      ? ui('Not configured', 'Haijasanidiwa')
                      : connected
                        ? ui('Connected', 'Imeunganishwa')
                        : ui('Connection failed', 'Muunganisho umeshindikana')}
                  </p>
                  <dl>
                    {rows
                      .filter(
                        ([, value]) => value !== undefined && value !== null,
                      )
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt
                            style={{ color: 'var(--text-muted)', fontSize: 12 }}
                          >
                            {label}
                          </dt>
                          <dd style={{ margin: '2px 0 10px' }}>{value}</dd>
                        </div>
                      ))}
                  </dl>
                  {report?.message && <p>{report.message}</p>}
                </section>
              ))}
              <small>
                {ui('Checked', 'Imekaguliwa')}:{' '}
                {new Date(twilioDiagnostics.checkedAt).toLocaleString()}
              </small>
            </div>
          )}
          {/* Header & Diagnostics */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
                <span>{ui('Notification history', 'Historia ya taarifa')}</span>
              </h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {twilioDiagnostics
                  ? ui('Connection check completed', 'Ukaguzi umekamilika')
                  : ui('Connections not checked', 'Miunganisho haijakaguliwa')}
              </span>
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
                <Send size={13} />
                <InterfaceText>Send Test Message</InterfaceText>
              </button>
              <ActionButton
                type="button"
                onClick={loadData}
                title={tx('Refresh messages')}
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
                {loading ? <SoftFlutter size={13} /> : <RefreshCw size={13} />}
                <InterfaceText>Refresh</InterfaceText>
              </ActionButton>
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '16px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                }}
              >
                <InterfaceText>Channel:</InterfaceText>
              </span>
              {['all', 'whatsapp', 'sms', 'email'].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setNotifChannelFilter(ch)}
                  style={{
                    backgroundColor:
                      notifChannelFilter === ch
                        ? '#2563eb'
                        : 'var(--bg-primary)',
                    color:
                      notifChannelFilter === ch
                        ? '#ffffff'
                        : 'var(--text-muted)',
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                }}
              >
                <InterfaceText>Status:</InterfaceText>
              </span>
              {['all', 'delivered', 'sent', 'received', 'failed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setNotifStatusFilter(st)}
                  style={{
                    backgroundColor:
                      notifStatusFilter === st
                        ? '#374151'
                        : 'var(--bg-primary)',
                    color:
                      notifStatusFilter === st
                        ? '#ffffff'
                        : 'var(--text-muted)',
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
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {(() => {
              const filtered = simulatedNotifs.filter((n) => {
                if (
                  notifChannelFilter !== 'all' &&
                  (n.channel || '').toLowerCase() !== notifChannelFilter
                )
                  return false;
                if (
                  notifStatusFilter !== 'all' &&
                  (n.status || '').toLowerCase() !== notifStatusFilter
                )
                  return false;
                return true;
              });

              if (filtered.length === 0) {
                if (sectionErrors.notifs || sectionBusy.notifs) return null;
                return <StatePanel compact kind="empty" title={simulatedNotifs.length ? ui('No messages match these filters', 'Hakuna ujumbe unaolingana na vichujio') : ui('No notification history yet', 'Hakuna historia ya taarifa bado')} description={ui('Recorded channel outcomes will appear here.', 'Matokeo ya njia za ujumbe yataonekana hapa.')}>
                  {(notifChannelFilter !== 'all' || notifStatusFilter !== 'all') && <button className="ui-button" onClick={() => { setNotifChannelFilter('all'); setNotifStatusFilter('all'); }}>{ui('Clear filters', 'Ondoa vichujio')}</button>}
                </StatePanel>;
              }

              return filtered.map((n) => {
                const isFailed =
                  n.status === 'failed' || n.status === 'undelivered';
                const isDelivered = n.status === 'delivered';
                const isReceived =
                  n.status === 'received' || n.direction === 'inbound';
                const recipient = n.recipient || n.to || '—';
                const channel = n.channel || 'whatsapp';
                const dateString = n.createdAt || n.timestamp;

                return (
                  <div
                    key={n._id || n.id}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: isFailed
                        ? '1px solid #7f1d1d'
                        : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Channel Badge */}
                        <span
                          style={{
                            backgroundColor:
                              channel === 'whatsapp'
                                ? '#064e3b'
                                : channel === 'sms'
                                  ? '#1e3a8a'
                                  : '#581c87',
                            color:
                              channel === 'whatsapp'
                                ? '#6ee7b7'
                                : channel === 'sms'
                                  ? '#93c5fd'
                                  : '#d8b4fe',
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
                            backgroundColor: isDelivered
                              ? '#064e3b'
                              : isFailed
                                ? '#7f1d1d'
                                : isReceived
                                  ? '#374151'
                                  : '#1e3a8a',
                            color: isDelivered
                              ? '#6ee7b7'
                              : isFailed
                                ? '#fca5a5'
                                : isReceived
                                  ? '#e5e7eb'
                                  : '#93c5fd',
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
                          <span
                            style={{
                              fontSize: '11px',
                              backgroundColor: '#374151',
                              color: '#e5e7eb',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            <InterfaceText>Inbound</InterfaceText>
                          </span>
                        )}

                        {n.fallbackFromChannel && (
                          <span
                            style={{
                              fontSize: '11px',
                              backgroundColor: '#78350f',
                              color: '#fde68a',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            <InterfaceText>Fallback from</InterfaceText>{' '}
                            {n.fallbackFromChannel}
                          </span>
                        )}

                        <span style={{ fontSize: '13px', fontWeight: '600' }}>
                          {n.direction === 'inbound'
                            ? `From: ${recipient}`
                            : `To: ${recipient}`}
                        </span>

                        {n.template && (
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            • {n.template}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        {dateString && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {new Date(dateString).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        color: 'var(--text-main)',
                        margin: '4px 0',
                      }}
                    >
                      {n.message}
                    </pre>

                    {n.mediaUrl && (
                      <div
                        style={{
                          marginTop: '6px',
                          fontSize: '12px',
                          color: '#60a5fa',
                        }}
                      >
                        <InterfaceText>Media:</InterfaceText>
                        <a
                          href={n.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'inherit',
                            textDecoration: 'underline',
                          }}
                        >
                          {n.mediaUrl}
                        </a>
                      </div>
                    )}

                    {/* Twilio SID & Error display */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border-color)',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      <div>
                        {n.twilioSid && (
                          <span>
                            <InterfaceText>SID:</InterfaceText> {n.twilioSid}{' '}
                            •{' '}
                          </span>
                        )}
                        <span>
                          <InterfaceText>Mode:</InterfaceText>{' '}
                          {n.mode || 'simulated'}
                        </span>
                        {n.errorCode && (
                          <span style={{ color: '#f87171' }}>
                            <InterfaceText>• Error Code:</InterfaceText>{' '}
                            {n.errorCode}
                          </span>
                        )}
                        {n.errorMessage && (
                          <div style={{ color: '#f87171', marginTop: '2px' }}>
                            {n.errorMessage}
                          </div>
                        )}
                      </div>

                      {/* Resend Action if failed */}
                      {isFailed && (n._id || n.id) && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <ActionButton loading={resendingId === (n._id || n.id)}
                            type="button"
                            disabled={resendingId === (n._id || n.id)}
                            onClick={() =>
                              handleResendNotif(n._id || n.id, 'sms')
                            }
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
                            <InterfaceText>Resend SMS</InterfaceText>
                          </ActionButton>
                          <ActionButton loading={resendingId === (n._id || n.id)}
                            type="button"
                            disabled={resendingId === (n._id || n.id)}
                            onClick={() =>
                              handleResendNotif(n._id || n.id, 'whatsapp')
                            }
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
                            <InterfaceText>Resend WhatsApp</InterfaceText>
                          </ActionButton>
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
          <h2
            style={{
              fontSize: '16px',
              fontWeight: '700',
              marginBottom: '16px',
            }}
          >
            <InterfaceText>Audit log</InterfaceText>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!auditLogs.length && !sectionErrors.logs && !sectionBusy.logs && <StatePanel compact kind="empty" title={ui('No audit activity yet', 'Hakuna shughuli za ukaguzi bado')} description={ui('Recorded staff actions will appear here.', 'Vitendo vya wafanyakazi vilivyorekodiwa vitaonekana hapa.')} />}
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
                  <strong style={{ color: '#60a5fa' }}>[{log.action}]</strong>
                  <InterfaceText>by</InterfaceText>{' '}
                  <strong>{log.actor?.name || log.actor?.type}</strong>
                  {log.details && (
                    <span
                      style={{ color: 'var(--text-muted)', marginLeft: '8px' }}
                    >
                      {JSON.stringify(log.details)}
                    </span>
                  )}
                </div>
                <span style={{ color: 'var(--text-muted)' }}>
                  {new Date(log.createdAt).toLocaleDateString()}{' '}
                  {new Date(log.createdAt).toLocaleTimeString()}
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-staff-modal-title"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '24px',
              width: 'min(420px, 92vw)',
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <h3
                id="add-staff-modal-title"
                style={{ fontSize: '16px', fontWeight: '700' }}
              >
                <InterfaceText>Add Internal User</InterfaceText>
              </h3>
              <button
                type="button"
                aria-label={tx('Close')}
                onClick={closeDialogs}
                style={{ background: 'none', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {error && <StateError compact error={error} description={typeof error === "string" || error?.status === 400 ? error?.message || error : undefined} />}
            <form
              onSubmit={handleAddStaff}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}
                >
                  <InterfaceText>Full Name *</InterfaceText>
                </label>
                <input
                  type="text"
                  required
                  aria-label={tx('Full name')}
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
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}
                >
                  <InterfaceText>Email Address *</InterfaceText>
                </label>
                <input
                  type="email"
                  required
                  aria-label={tx('Work email')}
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
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}
                >
                  <InterfaceText>Phone</InterfaceText>
                </label>
                <PhoneInput
                  aria-label={tx('Phone')}
                  required
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
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
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}
                >
                  <InterfaceText>Role *</InterfaceText>
                </label>
                <select
                  aria-label={tx('Role')}
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
                  <option value="designer">
                    <InterfaceText>Designer</InterfaceText>
                  </option>
                  {!managerOnly && (
                    <option value="manager">
                      <InterfaceText>Manager</InterfaceText>
                    </option>
                  )}
                  {!managerOnly && (
                    <option value="admin">
                      <InterfaceText>Administrator</InterfaceText>
                    </option>
                  )}
                </select>
              </div>

              <label>
                <InterfaceText>Notification language</InterfaceText>
                <select
                  aria-label={tx('Notification language')}
                  value={newLanguage}
                  onChange={(event) => setNewLanguage(event.target.value)}
                  style={{ display: 'block', width: '100%', padding: 8 }}
                >
                  <option value="en">
                    <InterfaceText>English</InterfaceText>
                  </option>
                  <option value="sw">
                    <InterfaceText>Kiswahili</InterfaceText>
                  </option>
                </select>
              </label>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                <InterfaceText>
                  Tinzel generates an 8-character initial password, valid for 24
                  hours, and sends it by SMS and email. The user must change it
                  before using the workspace.
                </InterfaceText>
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={closeDialogs}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    padding: '6px 12px',
                  }}
                >
                  <InterfaceText>Cancel</InterfaceText>
                </button>
                <ActionButton loading={creating}
                  type="submit"
                  disabled={creating}
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
                  {creating ? ui('Creating account…', 'Inafungua akaunti…') : ui('Create Account', 'Fungua akaunti')}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
      {userModal && selectedUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={tx(`${userModal} user`)}
            style={{
              background: '#FFFFFF',
              color: 'var(--text-main)',
              borderRadius: 8,
              padding: 24,
              width: 'min(100%, 460px)',
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0 }}>
                {userModal === 'view'
                  ? 'User Details'
                  : userModal === 'edit'
                    ? 'Edit User'
                    : 'Delete User'}
              </h3>
              <button
                type="button"
                onClick={closeDialogs}
                aria-label={tx('Close')}
              >
                <X size={18} />
              </button>
            </div>
            {error && <StateError compact error={error} description={typeof error === "string" || error?.status === 400 ? error?.message || error : undefined} />}
            {userModal !== 'delete' && (
              <StaffOnboardingStatus
                user={selectedUser}
                token={token}
                role={role}
                onUpdate={(user) => {
                  setSelectedUser(user);
                  setStaff((previous) =>
                    previous.map((item) =>
                      item._id === user._id ? user : item,
                    ),
                  );
                }}
              />
            )}
            {userModal === 'view' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(80px, 110px) minmax(0, 1fr)',
                  gap: 10,
                  fontSize: 14,
                }}
              >
                {[
                  ['Name', selectedUser.name],
                  ['Email', selectedUser.email],
                  ['Phone', selectedUser.phone || '—'],
                  ['Role', selectedUser.role],
                  ['Status', selectedUser.isActive ? ui('Active', 'Hai') : ui('Inactive', 'Haifanyi kazi')],
                  ...(selectedUser.role === 'designer'
                    ? [
                        [
                          'Active orders',
                          selectedUser.currentActiveWorkload || 0,
                        ],
                        ['Capacity', selectedUser.maxActiveWorkload],
                        [
                          'Auto assignment',
                          selectedUser.isEligibleForAssignment
                            ? 'Eligible'
                            : 'Paused',
                        ],
                      ]
                    : []),
                  [
                    'Created',
                    new Date(selectedUser.createdAt).toLocaleString(),
                  ],
                ].map(([key, value]) => (
                  <React.Fragment key={key}>
                    <strong>{key}</strong>
                    <span>{value}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
            {userModal === 'delete' && (
              <>
                <p>
                  <InterfaceText>Delete</InterfaceText>
                  <strong>{selectedUser.name}</strong> ({selectedUser.email}{' '}
                  <InterfaceText>
                    )? Their access ends immediately. Existing order and audit
                    history remains available.
                  </InterfaceText>
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                  }}
                >
                  <button type="button" onClick={closeDialogs}>
                    <InterfaceText>Cancel</InterfaceText>
                  </button>
                  <ActionButton loading={saving}
                    type="button"
                    disabled={saving}
                    onClick={deleteUser}
                    style={{
                      background: '#991B1B',
                      color: '#FFFFFF',
                      border: 0,
                      borderRadius: 6,
                      padding: '8px 12px',
                    }}
                  >
                    {saving ? ui('Deleting…', 'Inafuta…') : ui('Delete User', 'Futa mtumiaji')}
                  </ActionButton>
                </div>
              </>
            )}
            {userModal === 'edit' && (
              <form onSubmit={saveUser} style={{ display: 'grid', gap: 12 }}>
                <label>
                  <InterfaceText>Full name *</InterfaceText>
                  <input
                    required
                    value={userForm.name}
                    onChange={(e) =>
                      setUserForm({ ...userForm, name: e.target.value })
                    }
                    style={{ display: 'block', width: '100%', padding: 8 }}
                  />
                </label>
                <label>
                  <InterfaceText>Email *</InterfaceText>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm({ ...userForm, email: e.target.value })
                    }
                    style={{ display: 'block', width: '100%', padding: 8 }}
                  />
                </label>
                <label>
                  <InterfaceText>Phone</InterfaceText>
                  <PhoneInput
                    type="tel"
                    value={userForm.phone}
                    onChange={(e) =>
                      setUserForm({ ...userForm, phone: e.target.value })
                    }
                    style={{ display: 'block', width: '100%', padding: 8 }}
                  />
                </label>
                <label>
                  <InterfaceText>Role *</InterfaceText>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value })
                    }
                    style={{ display: 'block', width: '100%', padding: 8 }}
                  >
                    {!managerOnly && (
                      <option value="admin">
                        <InterfaceText>Administrator</InterfaceText>
                      </option>
                    )}
                    {!managerOnly && (
                      <option value="manager">
                        <InterfaceText>Manager</InterfaceText>
                      </option>
                    )}
                    <option value="designer">
                      <InterfaceText>Designer</InterfaceText>
                    </option>
                  </select>
                </label>
                <label>
                  <InterfaceText>Notification language</InterfaceText>
                  <select
                    value={userForm.preferredLanguage}
                    onChange={(event) =>
                      setUserForm({
                        ...userForm,
                        preferredLanguage: event.target.value,
                      })
                    }
                    style={{ display: 'block', width: '100%', padding: 8 }}
                  >
                    <option value="en">
                      <InterfaceText>English</InterfaceText>
                    </option>
                    <option value="sw">
                      <InterfaceText>Kiswahili</InterfaceText>
                    </option>
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={userForm.isActive}
                    onChange={(e) =>
                      setUserForm({ ...userForm, isActive: e.target.checked })
                    }
                  />
                  <InterfaceText>Active account</InterfaceText>
                </label>
                {userForm.role === 'designer' && (
                  <>
                    <label>
                      <InterfaceText>Maximum active orders</InterfaceText>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        required
                        value={userForm.maxActiveWorkload}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            maxActiveWorkload: e.target.value,
                          })
                        }
                        style={{ display: 'block', width: '100%', padding: 8 }}
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={userForm.isEligibleForAssignment}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            isEligibleForAssignment: e.target.checked,
                          })
                        }
                      />
                      <InterfaceText>
                        Eligible for automatic assignment
                      </InterfaceText>
                    </label>
                  </>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                  }}
                >
                  <button type="button" onClick={closeDialogs}>
                    <InterfaceText>Cancel</InterfaceText>
                  </button>
                  <ActionButton loading={saving}
                    type="submit"
                    disabled={saving}
                    style={{
                      background: 'var(--text-main)',
                      color: '#FFFFFF',
                      border: 0,
                      borderRadius: 6,
                      padding: '8px 12px',
                    }}
                  >
                    {saving ? ui('Saving…', 'Inahifadhi…') : ui('Save Changes', 'Hifadhi mabadiliko')}
                  </ActionButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showTestNotifModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={tx('Send test notification')}
            style={{
              backgroundColor: '#ffffff',
              color: 'var(--text-main)',
              borderRadius: '8px',
              padding: '24px',
              width: 'min(100%, 460px)',
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                <InterfaceText>Send Test Notification</InterfaceText>
              </h3>
              <button
                type="button"
                onClick={closeDialogs}
                aria-label={tx('Close')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSendTestNotif}
              style={{ display: 'grid', gap: '14px' }}
            >
              <div>
                <label
                  htmlFor={`control-47723`}
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}
                >
                  <InterfaceText>Recipient Phone Number *</InterfaceText>
                </label>
                <input
                  id={`control-47723`}
                  type="text"
                  required
                  placeholder={tx('+255712345678 or 0712345678')}
                  value={testNotifData.to}
                  onChange={(e) =>
                    setTestNotifData({ ...testNotifData, to: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor={`control-48395`}
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}
                >
                  <InterfaceText>Channel *</InterfaceText>
                </label>
                <select
                  id={`control-48395`}
                  value={testNotifData.channel}
                  onChange={(e) =>
                    setTestNotifData({
                      ...testNotifData,
                      channel: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="whatsapp">
                    <InterfaceText>WhatsApp (Twilio)</InterfaceText>
                  </option>
                  <option value="sms">
                    <InterfaceText>SMS (Twilio)</InterfaceText>
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={`control-49157`}
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}
                >
                  <InterfaceText>Message Content *</InterfaceText>
                </label>
                <textarea
                  id={`control-49157`}
                  required
                  rows={3}
                  placeholder={tx(
                    'Habari! Hili ni jaribio la ujumbe kutoka Tinzel platform.',
                  )}
                  value={testNotifData.message}
                  onChange={(e) =>
                    setTestNotifData({
                      ...testNotifData,
                      message: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={closeDialogs}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #d1d5db',
                    padding: '8px 14px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <InterfaceText>Cancel</InterfaceText>
                </button>
                <ActionButton loading={testNotifSending}
                  type="submit"
                  disabled={testNotifSending}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {testNotifSending ? ui('Sending…', 'Inatuma…') : ui('Send Test', 'Tuma jaribio')}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
