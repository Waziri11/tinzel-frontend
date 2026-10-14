import React, { useState, useEffect } from 'react';
import { Row, Col, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import DynamicFormRenderer from './DynamicFormRenderer';

function MagazineCoverCard({ form, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const coverImage = form.coverImageUrl || '/brand/magazine-cover-sample.jpg';

  // Format title: If it contains 'Harusi Yetu - Wedding Edition', clean to 'Wedding Magazine'
  let displayTitle = form.title || 'Personalized Magazine';
  if (displayTitle.toLowerCase().includes('harusi yetu') || form.slug === 'wedding-magazine') {
    displayTitle = 'Wedding Magazine';
  } else if (displayTitle.toLowerCase().includes('birthday celebration special')) {
    displayTitle = 'Birthday Magazine';
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Interactive Magazine Cover Link - Pure clean art, no buttons or pill tags */}
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
            alt={displayTitle}
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
        </div>
      </div>

      {/* Ultra Minimalist Bottom Title & Price Only */}
      <div style={{ marginTop: '18px' }}>
        <h2
          onClick={() => onSelect(form.slug)}
          style={{
            fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
            fontStyle: 'italic',
            fontSize: '32px',
            fontWeight: '600',
            color: hovered ? '#C5A059' : '#1C1917',
            marginBottom: '4px',
            cursor: 'pointer',
            transition: 'color 0.2s ease',
            lineHeight: '1.2',
          }}
        >
          {displayTitle}
        </h2>

        {/* Price only in gold text */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#C5A059',
            letterSpacing: '0.6px',
          }}
        >
          {form.price?.toLocaleString()} {form.currency}
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
          <button
            type="button"
            onClick={() => setSelectedFormSlug(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E7E5E4',
              borderRadius: '6px',
              color: '#1C1917',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Back to Magazine Editions"
          >
            <ArrowLeftOutlined style={{ fontSize: '16px' }} />
          </button>
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
      {/* Top Header / Minimalist Back Arrow & Refined Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '48px',
          borderBottom: '1px solid #E7E5E4',
          paddingBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={onBackToHome}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '42px',
            height: '42px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: '6px',
            color: '#1C1917',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Back to Home"
        >
          <ArrowLeftOutlined style={{ fontSize: '16px' }} />
        </button>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: '26px',
              fontWeight: '600',
              color: '#1C1917',
              lineHeight: '1.1',
              marginBottom: '2px',
            }}
          >
            Tinzel Editorial Catalogue
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#C5A059',
            }}
          >
            Select Your Magazine Format
          </div>
        </div>
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
