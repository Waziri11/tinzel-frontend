import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Cpu,
  Clock,
  ArrowRight,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [health, setHealth] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setLoadingHealth(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealth({ status: 'offline', message: err.message, database: { status: 'offline' } });
      setError('Could not connect to backend server. Make sure it is running on port 5000.');
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchItems = async () => {
    setLoadingItems(true);
    try {
      const res = await fetch(`${API_BASE}/api/items`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setItems(result.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchItems();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error('Failed to create item');
      setTitle('');
      setDescription('');
      await fetchItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/items/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete item');
      await fetchItems();
    } catch (err) {
      setError(err.message);
    }
  };

  const isBackendOnline = health && health.status === 'ok';

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '20px',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              backgroundColor: 'var(--accent-primary)',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={26} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              Tinzel MERN Stack
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Full-Stack Architecture & Live Connectivity Monitor
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            checkHealth();
            fetchItems();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          <RefreshCw size={14} className={loadingHealth ? 'spin' : ''} />
          Refresh Status
        </button>
      </header>

      {/* Connectivity Banner / Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {/* Backend Status Card */}
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="var(--text-muted)" />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Express Backend</span>
            </div>
            {isBackendOnline ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#064e3b',
                  color: '#6ee7b7',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                <CheckCircle2 size={12} /> Connected
              </span>
            ) : (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#7f1d1d',
                  color: '#fca5a5',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                <XCircle size={12} /> Offline
              </span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Port: 5000 • Proxy: Active
          </div>
          {health?.uptimeSeconds !== undefined && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> Uptime: {health.uptimeSeconds}s
            </div>
          )}
        </div>

        {/* Database Status Card */}
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="var(--text-muted)" />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>MongoDB</span>
            </div>
            {health?.database?.status === 'connected' ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#064e3b',
                  color: '#6ee7b7',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                <CheckCircle2 size={12} /> Connected
              </span>
            ) : (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#451a03',
                  color: '#fcd34d',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                Fallback Mode
              </span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Status: {health?.database?.status || 'Unknown'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {health?.database?.status === 'connected' ? 'Atlas/Local instance active' : 'In-memory fallback ready'}
          </div>
        </div>

        {/* Frontend Status Card */}
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="var(--text-muted)" />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>React & Vite</span>
            </div>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#064e3b',
                color: '#6ee7b7',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              <CheckCircle2 size={12} /> Running
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Port: 5173 • Fast Refresh
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Proxy: /api -&gt; localhost:5000
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div
          style={{
            backgroundColor: '#450a0a',
            border: '1px solid var(--accent-danger)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <XCircle size={16} />
          {error}
        </div>
      )}

      {/* Main Content: Interactive API Communication Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px' }}>
        {/* Create Item Panel */}
        <section
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity size={18} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '17px', fontWeight: '600' }}>Test Backend Communication</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Send a POST request through the frontend to verify live read/write roundtrip.
          </p>

          <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Item Title
              </label>
              <input
                type="text"
                placeholder="e.g. Verify database migrations"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief notes or payload description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !title.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: title.trim() ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: '#ffffff',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'background-color 0.15s ease',
              }}
            >
              <Plus size={16} />
              {submitting ? 'Submitting...' : 'Send to API'}
            </button>
          </form>
        </section>

        {/* Items List Panel */}
        <section
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '600' }}>Live API Data ({items.length})</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GET /api/items</span>
          </div>

          {loadingItems ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              Fetching records from API...
            </div>
          ) : items.length === 0 ? (
            <div
              style={{
                border: '1px dashed var(--border-color)',
                borderRadius: '6px',
                padding: '32px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '14px',
              }}
            >
              No items found. Create one using the form on the left.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map((item) => (
                <div
                  key={item._id}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{item.title}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          fontWeight: '600',
                          letterSpacing: '0.5px',
                          color: item.status === 'completed' ? '#4ade80' : '#fbbf24',
                        }}
                      >
                        [{item.status}]
                      </span>
                    </div>
                    {item.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        {item.description}
                      </p>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ID: {item._id}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item._id)}
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted)',
                      padding: '6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Delete item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Documentation / Architecture Footer */}
      <footer
        style={{
          marginTop: '40px',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>MongoDB</span>
          <ArrowRight size={12} />
          <span>Express.js</span>
          <ArrowRight size={12} />
          <span>React</span>
          <ArrowRight size={12} />
          <span>Node.js</span>
        </div>
        <div>Tinzel Architecture Ready</div>
      </footer>
    </div>
  );
}
