import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import DynamicFormRenderer from './DynamicFormRenderer';

function MagazineCoverCard({ form, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const coverImage = form.coverImageUrl || '/brand/magazine-cover-sample.jpg';

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Interactive Magazine Cover Link */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(form.slug)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSelect(form.slug);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          cursor: 'pointer',
          display: 'inline-block',
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          border: `2px solid ${hovered ? '#C5A059' : '#E7E5E4'}`,
          boxShadow: hovered
            ? '0 24px 48px rgba(197, 160, 89, 0.28), 0 8px 16px rgba(0, 0, 0, 0.08)'
            : '0 12px 28px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
          transform: hovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          maxWidth: '380px',
          width: '100%',
          outline: 'none',
        }}
      >
        {/* Magazine Cover Portrait Image */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '141.4%', backgroundColor: '#1C1917' }}>
          <img
            src={coverImage}
            alt={form.title}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {/* Book Spine Edge Accent (Solid border, strict no-gradient rule) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '4px',
              backgroundColor: '#C5A059',
              pointerEvents: 'none',
            }}
          />

          {/* Golden inner foil border effect */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              right: '10px',
              bottom: '10px',
              border: `1px solid ${hovered ? 'rgba(212, 175, 55, 0.9)' : 'rgba(255, 255, 255, 0.25)'}`,
              pointerEvents: 'none',
              transition: 'border-color 0.3s ease',
            }}
          />

          {/* Hover Action Pill Indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: hovered ? '#C5A059' : 'rgba(28, 25, 23, 0.85)',
              color: '#FFFFFF',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              transition: 'all 0.25s ease',
            }}
          >
            {hovered ? 'Personalize This Edition' : 'Click Cover to Customize'}
          </div>
        </div>
      </div>

      {/* Minimal Bottom Title & Price */}
      <div style={{ marginTop: '20px' }}>
        <h2
          onClick={() => onSelect(form.slug)}
          style={{
            fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
            fontStyle: 'italic',
            fontSize: '30px',
            fontWeight: '600',
            color: hovered ? '#C5A059' : '#1C1917',
            marginBottom: '4px',
            cursor: 'pointer',
            transition: 'color 0.2s ease',
            lineHeight: '1.15',
          }}
        >
          {form.title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: '700',
              color: '#C5A059',
              letterSpacing: '0.5px',
            }}
          >
            {form.price?.toLocaleString()} {form.currency}
          </span>
          <span style={{ color: '#D6D3D1' }}>•</span>
          <span style={{ fontSize: '13px', color: '#78716C' }}>
            {form.magazineType || 'Keepsake Edition'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MagazineShowcase({ onBackToHome, onNavigateToTracking }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormSlug, setSelectedFormSlug] = useState(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    setLoading(true);
    try {
      const data = await api.public.getForms();
      setForms(data.forms || []);
    } catch (err) {
      console.error('Failed to load forms:', err);
    } finally {
      setLoading(false);
    }
  };

  // If user selected a magazine format, render the submission form
  if (selectedFormSlug) {
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '60px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Button
            onClick={() => setSelectedFormSlug(null)}
            icon={<ArrowLeftOutlined />}
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E7E5E4',
              color: '#1C1917',
              fontWeight: '600',
              borderRadius: '6px',
            }}
          >
            Back to Magazine Editions
          </Button>
        </div>

        <DynamicFormRenderer
          slug={selectedFormSlug}
          onNavigateToTracking={onNavigateToTracking}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Header / Back Link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '36px',
          borderBottom: '1px solid #E7E5E4',
          paddingBottom: '16px',
        }}
      >
        <Button
          onClick={onBackToHome}
          icon={<ArrowLeftOutlined />}
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E7E5E4',
            color: '#1C1917',
            fontWeight: '600',
            borderRadius: '6px',
          }}
        >
          Back to Home
        </Button>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#C5A059' }}>
            Tinzel Editorial Catalogue
          </span>
          <div style={{ fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)', fontStyle: 'italic', fontSize: '20px', fontWeight: '600', color: '#1C1917' }}>
            Select Your Magazine Format
          </div>
        </div>
      </div>

      {/* Editorial Introduction */}
      <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
        <h1
          style={{
            fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
            fontSize: '44px',
            fontWeight: '600',
            color: '#1C1917',
            marginBottom: '8px',
            lineHeight: '1.15',
          }}
        >
          Curated Magazine Editions
        </h1>
        <p style={{ fontSize: '15px', color: '#78716C', lineHeight: '1.6' }}>
          Select an edition below to begin personalizing your love story, wedding vows, or anniversary memories into a printed publication.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: '16px', color: '#78716C' }}>Loading editorial editions...</p>
        </div>
      ) : forms.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '8px',
            padding: '40px',
            color: '#78716C',
          }}
        >
          No active magazine formats currently published.
        </div>
      ) : (
        /* Magazine Cover Showcase Grid */
        <Row gutter={[48, 48]} justify="center">
          {forms.map((form) => (
            <Col xs={24} sm={12} md={10} lg={8} key={form.slug}>
              <MagazineCoverCard form={form} onSelect={(slug) => setSelectedFormSlug(slug)} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
