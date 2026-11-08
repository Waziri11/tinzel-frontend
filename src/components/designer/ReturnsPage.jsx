import ExpressOrderBadge from '../common/ExpressOrderBadge';
import { orderSenderName } from '../../utils/orderDisplay';
import RevisionAudioPlayer from '../common/RevisionAudioPlayer';
import SoftFlutter, { ActionButton } from '../common/SoftFlutter';
import InterfaceText, { useInterfaceText } from '../../i18n/InterfaceText';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  RefreshCw,
  RotateCcw,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import { api } from '../../services/api';
import PageSkeleton from '../common/PageSkeleton';
import StatePanel, { StateError } from '../common/StatePanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { navigate } from '../../navigation/location';
import './designerWorkspace.css';

export default function ReturnsPage({ token, staffUser, onOpenOrder }) {
  const tx = useInterfaceText();
  const { lang } = useLanguage();
  const ui = (en, sw) => lang === 'sw' ? sw : en;

  const requestId = useRef(0);
  const [filter, setFilter] = useState('active');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    open: 0,
    submitted_for_review: 0,
    active: 0,
    resolved: 0,
    manager: 0,
    client: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');

  const loadReturns = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const data = await api.designer.getReturns(token, {
        status: filter,
        source: sourceFilter,
        search,
      });
      if (request !== requestId.current) return;
      setRows(data.returns || []);
      if (data.summary) setSummary(data.summary);
      setHasLoaded(true);
    } catch (err) {
      if (request === requestId.current) setError(err);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [token, filter, sourceFilter, search]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const isManagerOrAdmin = ['manager', 'admin'].includes(staffUser?.role);

  if (loading && !hasLoaded) return <PageSkeleton variant="dashboard" />;

  return (
    <section className="designer-page">
      <div className="designer-page-title">
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#8A6825',
              marginBottom: '4px',
            }}
          >
            <InterfaceText>Quality Control &amp; Revisions</InterfaceText>
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: '26px',
              fontWeight: 600,
            }}
          >
            <InterfaceText>Returned Magazines &amp; Changes</InterfaceText>
          </h1>
          <p>
            {isManagerOrAdmin
              ? 'All magazines returned from Manager draft reviews or Client proof reviews for required changes.'
              : 'Correction rounds and change checklists from managers and clients.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="segmented" role="group" aria-label={tx('Filter returns by status')}>
            <button type="button" className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>
              <InterfaceText>Active (</InterfaceText>
              {hasLoaded ? (summary.active || 0) : '—'})
            </button>
            <button type="button" className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>
              <InterfaceText>With Designer (</InterfaceText>
              {hasLoaded ? (summary.open || 0) : '—'})
            </button>
            <button
              type="button"
              className={filter === 'submitted_for_review' ? 'active' : ''}
              onClick={() => setFilter('submitted_for_review')}
            >
              <InterfaceText>Resubmitted (</InterfaceText>
              {hasLoaded ? (summary.submitted_for_review || 0) : '—'})
            </button>
            <button
              type="button"
              className={filter === 'resolved' ? 'active' : ''}
              onClick={() => setFilter('resolved')}
            >
              <InterfaceText>Resolved (</InterfaceText>
              {hasLoaded ? (summary.resolved || 0) : '—'})
            </button>
          </div>
          <ActionButton type="button" className="secondary-button" onClick={loadReturns} disabled={loading}>
            {loading ? <SoftFlutter size={15} /> : <RefreshCw size={15} />}
            <InterfaceText>Refresh</InterfaceText>
          </ActionButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        className="returns-summary-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <RotateCcw size={18} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '20px', lineHeight: 1, color: '#1C1917' }}>
              {hasLoaded ? (summary.open || 0) : '—'}
            </strong>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}>
              <InterfaceText>Open Returns (Needs Fixes)</InterfaceText>
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#DBEAFE',
              color: '#1E40AF',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <FileCheck2 size={18} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '20px', lineHeight: 1, color: '#1C1917' }}>
              {hasLoaded ? (summary.submitted_for_review || 0) : '—'}
            </strong>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}>
              <InterfaceText>Resubmitted for Manager Review</InterfaceText>
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#F4EAD5',
              color: '#6F531C',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <UserCheck size={18} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '20px', lineHeight: 1, color: '#1C1917' }}>
              {hasLoaded ? (summary.manager || 0) : '—'}
            </strong>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}>
              <InterfaceText>Returned by Manager</InterfaceText>
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#DCFCE7',
              color: '#166534',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Users size={18} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '20px', lineHeight: 1, color: '#1C1917' }}>
              {hasLoaded ? (summary.client || 0) : '—'}
            </strong>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#57534E' }}>
              <InterfaceText>Returned by Client</InterfaceText>
            </span>
          </div>
        </div>
      </div>

      {/* Search & Source Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E7E5E4',
          borderRadius: '10px',
          flexWrap: 'wrap',
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: '1 1 260px',
            padding: '0 12px',
            height: '40px',
            border: '1px solid #D6D3D1',
            borderRadius: '8px',
            backgroundColor: '#FAFAF9',
          }}
        >
          <Search size={15} color="#78716C" />
          <input
            aria-label={tx('Search returned magazines')}
            placeholder={tx('Search by client name, magazine title, designer, or requested fix...')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '13px',
              color: '#1C1917',
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
              }}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#78716C',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ×
            </button>
          )}
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#78716C' }}>
            <InterfaceText>Source:</InterfaceText>
          </span>
          {['all', 'manager', 'client'].map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setSourceFilter(src)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #D6D3D1',
                backgroundColor: sourceFilter === src ? '#1C1917' : '#FFFFFF',
                color: sourceFilter === src ? '#FFFFFF' : '#44403C',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {src === 'all' ? 'All Sources' : src}
            </button>
          ))}
        </div>
      </div>

      {error && <StateError error={error} onRetry={loadReturns} title={ui('Corrections could not be loaded', 'Marekebisho hayakuweza kupakiwa')}>
        {hasLoaded && <p>{ui('Showing the last loaded corrections. They may be out of date.', 'Tunaonyesha marekebisho yaliyopakiwa mara ya mwisho. Huenda yamebadilika.')}</p>}
      </StateError>}
      {loading && hasLoaded && <p role="status">{ui('Refreshing corrections…', 'Tunapakia marekebisho upya…')}</p>}

      {loading && !hasLoaded ? (
        <PageSkeleton variant="table" compact title={tx('Loading returned magazines')} />
      ) : hasLoaded && (!error || rows.length > 0) ? (
        <div className="designer-table-card">
          <table>
            <thead>
              <tr>
                <th>
                  <InterfaceText>Order &amp; Magazine</InterfaceText>
                </th>
                <th>
                  <InterfaceText>Client</InterfaceText>
                </th>
                <th>
                  <InterfaceText>Designer</InterfaceText>
                </th>
                <th>
                  <InterfaceText>Return Source</InterfaceText>
                </th>
                <th>
                  <InterfaceText>Round &amp; Draft</InterfaceText>
                </th>
                <th>
                  <InterfaceText>Requested Changes</InterfaceText>
                </th>
                <th>
                  <InterfaceText>Progress</InterfaceText>
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const items = row.items || [];
                const done = items.filter((i) => i.status === 'addressed').length;
                return (
                  <tr key={row._id || `${row.orderId}-${row.roundNumber}`}>
                    <td>
                      <strong style={{ display: 'block', color: '#1C1917' }}>{orderSenderName(row, tx('Unnamed customer'))}</strong>
                      <ExpressOrderBadge order={row} />
                      <span style={{ fontSize: '12px', color: '#78716C' }}>{row.formTitle || 'Tinzel Magazine'}</span>
                    </td>
                    <td>
                      <strong style={{ display: 'block', fontWeight: 600 }}>{row.clientName}</strong>
                      {row.clientWhatsApp && (
                        <span style={{ fontSize: '11px', color: '#78716C' }}>{row.clientWhatsApp}</span>
                      )}
                    </td>
                    <td>
                      {row.assignedDesigner?.name ? (
                        <span style={{ fontWeight: 600, color: '#1C1917' }}>{row.assignedDesigner.name}</span>
                      ) : (
                        <span style={{ color: '#A8A29E' }}>
                          <InterfaceText>Unassigned</InterfaceText>
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor: row.source === 'client' ? '#DBEAFE' : '#F4EAD5',
                          color: row.source === 'client' ? '#1E40AF' : '#6F531C',
                        }}
                      >
                        {row.source}
                      </span>
                    </td>
                    <td>
                      <strong style={{ display: 'block' }}>
                        <InterfaceText>Round</InterfaceText> {row.roundNumber}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#78716C' }}>
                        <InterfaceText>Draft V</InterfaceText> {row.draftVersionNumber || row.currentDraftVersion || 1}
                      </span>
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#44403C' }}>
                        {items.slice(0, 3).map((item, idx) => (
                          <li key={item._id || idx} style={{ marginBottom: '2px' }}>
                            {item.pageReference ? <strong>[P.{item.pageReference}] </strong> : null}
                            {item.text}
                            <RevisionAudioPlayer token={token} orderId={row.orderId} requestId={row._id} item={item} />
                          </li>
                        ))}
                        {items.length > 3 && (
                          <li style={{ color: '#78716C', listStyle: 'none' }}>
                            +{items.length - 3} <InterfaceText>more item</InterfaceText>{' '}
                            {items.length - 3 === 1 ? '' : 's'}
                          </li>
                        )}
                      </ul>
                    </td>
                    <td>
                      {row.status === 'resolved' ? (
                        <span className="return-progress done">
                          <CheckCircle2 size={14} />
                          <InterfaceText>Resolved</InterfaceText>
                        </span>
                      ) : row.status === 'submitted_for_review' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: '#1E40AF',
                            fontWeight: 700,
                            fontSize: '12px',
                          }}
                        >
                          <FileCheck2 size={14} />
                          <InterfaceText>Resubmitted (V</InterfaceText>{' '}
                          {row.submittedVersionNumber || row.currentDraftVersion})
                        </span>
                      ) : (
                        <span className="return-progress">
                          <Clock3 size={14} />
                          {done}/{items.length} <InterfaceText>addressed</InterfaceText>
                        </span>
                      )}
                    </td>
                    <td>
                      <button type="button" onClick={() => onOpenOrder(row.orderId)}>
                        <InterfaceText>Open</InterfaceText>
                        <ArrowRight size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && !error && (
            <StatePanel kind="empty" title={search || sourceFilter !== 'all' || filter !== 'active' ? ui('No corrections match these filters', 'Hakuna marekebisho yanayolingana na vichujio hivi') : ui('No corrections waiting', 'Hakuna marekebisho yanayosubiri')}
              description={ui('New requests will appear here when a magazine is returned for changes.', 'Maombi mapya yataonekana hapa jarida likirudishwa kwa marekebisho.')}>
              {(search || sourceFilter !== 'all' || filter !== 'active') ? <button type="button" className="secondary-button" onClick={() => { setSearch(''); setSearchInput(''); setSourceFilter('all'); setFilter('active'); }}>{ui('Clear filters', 'Ondoa vichujio')}</button>
                : <button type="button" className="secondary-button" onClick={() => navigate(isManagerOrAdmin ? '/staff/design-phase' : '/staff/design')}>{ui('Back to orders', 'Rudi kwenye oda')}</button>}
            </StatePanel>
          )}
        </div>
      ) : null}
    </section>
  );
}
