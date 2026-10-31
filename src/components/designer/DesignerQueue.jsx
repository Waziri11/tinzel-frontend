import React, { useEffect, useState, useMemo } from 'react';
import { ArrowRight, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import BrandLoading from '../common/BrandLoading';
import './designerWorkspace.css';

const ACTIVE_STATUSES = new Set(['assigned', 'in_design', 'revision_requested']);
const REVIEW_STATUSES = new Set(['draft_manager_review', 'client_review']);
const COMPLETED_STATUSES = new Set([
  'client_approved',
  'print_document_prep',
  'print_manager_review',
  'printing_sent',
  'printing_in_progress',
  'printing_completed',
  'dispatched',
  'delivered',
  'closed',
]);

const PAGE_SIZE = 10;

export default function DesignerQueue({ token, onOpenOrder }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'review' | 'completed' | 'all'
  const [currentPage, setCurrentPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.designer.getOrders(token);
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message || 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  // Reset pagination on search or tab filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const filteredOrders = useMemo(() => {
    let list = orders;

    // Filter by Tab
    if (activeTab === 'active') {
      list = list.filter((o) => ACTIVE_STATUSES.has(o.status));
    } else if (activeTab === 'review') {
      list = list.filter((o) => REVIEW_STATUSES.has(o.status));
    } else if (activeTab === 'completed') {
      list = list.filter((o) => COMPLETED_STATUSES.has(o.status));
    }

    // Filter by Search Query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        const id = (o.trackingId || o.submissionId || '').toLowerCase();
        const client = (o.clientName || '').toLowerCase();
        const title = (o.formTitle || '').toLowerCase();
        return id.includes(q) || client.includes(q) || title.includes(q);
      });
    }

    return list;
  }, [orders, activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  if (loading) {
    return <BrandLoading title="Loading assigned orders" description="Getting your design queue ready." />;
  }

  return (
    <section className="designer-page">
      <div className="designer-page-title">
        <div>
          <h1>Design orders</h1>
          <p>Open an order to work with its files, drafts and revision history.</p>
        </div>
        <button type="button" className="secondary-button" onClick={load}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="designer-alert is-error">{error}</div>}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div className="segmented">
          <button
            type="button"
            className={activeTab === 'active' ? 'active' : ''}
            onClick={() => setActiveTab('active')}
          >
            Active ({orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length})
          </button>
          <button
            type="button"
            className={activeTab === 'review' ? 'active' : ''}
            onClick={() => setActiveTab('review')}
          >
            In Review ({orders.filter((o) => REVIEW_STATUSES.has(o.status)).length})
          </button>
          <button
            type="button"
            className={activeTab === 'completed' ? 'active' : ''}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({orders.filter((o) => COMPLETED_STATUSES.has(o.status)).length})
          </button>
          <button
            type="button"
            className={activeTab === 'all' ? 'active' : ''}
            onClick={() => setActiveTab('all')}
          >
            All ({orders.length})
          </button>
        </div>

        <div style={{ position: 'relative', width: 'min(320px, 100%)' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#A8A29E',
              pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order ID or client..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid #D6D3D1',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="designer-table-card">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Client</th>
              <th>Edition</th>
              <th>Status</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr key={order._id}>
                <td>
                  <strong>{order.trackingId || order.submissionId}</strong>
                </td>
                <td>{order.clientName}</td>
                <td>{order.formTitle}</td>
                <td>
                  <span className="designer-status">{order.status.replaceAll('_', ' ')}</span>
                </td>
                <td>{new Date(order.updatedAt).toLocaleDateString()}</td>
                <td>
                  <button
                    type="button"
                    aria-label={`Open ${order.trackingId || order.submissionId}`}
                    onClick={() => onOpenOrder(order._id)}
                  >
                    Open <ArrowRight size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="designer-empty">
            {searchQuery
              ? `No orders matching "${searchQuery}" in ${activeTab} tab.`
              : `No orders in ${activeTab} tab.`}
            {searchQuery && (
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setSearchQuery('')}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderTop: '1px solid #F5F5F4',
              fontSize: '13px',
              color: '#78716C',
            }}
          >
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="secondary-button"
                style={{ padding: '6px 10px', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="secondary-button"
                style={{ padding: '6px 10px', opacity: currentPage >= totalPages ? 0.5 : 1 }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
