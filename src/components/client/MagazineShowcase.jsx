import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Tag, Typography, Divider, Spin } from 'antd';
import {
  BookOutlined,
  HeartOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  PictureOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { api } from '../../services/api';
import DynamicFormRenderer from './DynamicFormRenderer';

const { Title, Paragraph, Text } = Typography;

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
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#B45309' }}>
            Tinzel Editorial Catalogue
          </span>
          <div style={{ fontFamily: '"Georgia", serif', fontSize: '16px', fontWeight: '700', color: '#1C1917' }}>
            Select Your Magazine Format
          </div>
        </div>
      </div>

      {/* Editorial Introduction */}
      <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
        <h1
          style={{
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontSize: '36px',
            fontWeight: '800',
            color: '#1C1917',
            marginBottom: '12px',
          }}
        >
          Curated Magazine Editions
        </h1>
        <p style={{ fontSize: '15px', color: '#78716C', lineHeight: '1.6' }}>
          Each edition is custom-crafted with dedicated typography, high-definition photo galleries, and
          editorial storytelling tailored to your milestone.
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
        /* Magazine Cover Cards Grid */
        <Row gutter={[32, 32]}>
          {forms.map((form, index) => {
            const isWedding = form.slug.includes('wedding');

            return (
              <Col xs={24} md={12} key={form.slug}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #E7E5E4',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Faux Magazine Cover Header */}
                  <div
                    style={{
                      backgroundColor: isWedding ? '#991B1B' : '#78350F',
                      padding: '24px 28px',
                      color: '#FFFFFF',
                      borderBottom: '2px solid #D97706',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '1.5px',
                          textTransform: 'uppercase',
                          color: '#FEF3C7',
                        }}
                      >
                        ISSUE NO. {String(index + 1).padStart(2, '0')} • SPECIAL EDITION
                      </span>
                      <span
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#1C1917',
                          padding: '3px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '800',
                        }}
                      >
                        {form.price?.toLocaleString()} {form.currency}
                      </span>
                    </div>

                    <h2
                      style={{
                        fontFamily: '"Georgia", "Times New Roman", serif',
                        fontSize: '26px',
                        fontWeight: '800',
                        color: '#FFFFFF',
                        lineHeight: '1.2',
                        marginBottom: '6px',
                      }}
                    >
                      {form.title}
                    </h2>

                    <div style={{ fontSize: '13px', color: '#FDE68A' }}>
                      {form.magazineType || 'Keepsake Magazine'}
                    </div>
                  </div>

                  {/* Magazine Description & Details Body */}
                  <div style={{ padding: '28px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#78716C',
                          lineHeight: '1.6',
                          marginBottom: '20px',
                          minHeight: '44px',
                        }}
                      >
                        {form.description ||
                          'A bespoke editorial publication featuring high-definition photo spreads, personalized vows, and memorable quotes.'}
                      </p>

                      <Divider style={{ margin: '16px 0', borderColor: '#F5F5F4' }} />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1C1917' }}>
                          <CheckCircleOutlined style={{ color: '#991B1B' }} />
                          <span>Complete personalized layout with dedicated artist</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1C1917' }}>
                          <CheckCircleOutlined style={{ color: '#991B1B' }} />
                          <span>Lipa Namba ({form.lipaNambaInstructions?.tillNumber || '55667788'}) payment integration</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1C1917' }}>
                          <CheckCircleOutlined style={{ color: '#991B1B' }} />
                          <span>Interactive page-by-page proof reader before printing</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="primary"
                      size="large"
                      block
                      onClick={() => setSelectedFormSlug(form.slug)}
                      style={{
                        backgroundColor: '#991B1B',
                        borderColor: '#991B1B',
                        color: '#FFFFFF',
                        height: '46px',
                        fontSize: '14px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      Select & Fill Magazine Form <ArrowRightOutlined />
                    </Button>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
