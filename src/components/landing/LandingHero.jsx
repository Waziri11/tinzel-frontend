import React, { useState } from 'react';
import { Button, Row, Col } from 'antd';
import { BookOutlined, UserOutlined, HeartOutlined } from '@ant-design/icons';

function OptionCard({ label, onClick, variant }) {
  const [hovered, setHovered] = useState(false);
  const isPrimary = variant === 'primary';

  const baseBg = isPrimary ? '#991B1B' : '#FFFFFF';
  const hoverBg = isPrimary ? '#7F1D1D' : '#FFFBEB';
  const textColor = isPrimary ? '#FFFFFF' : '#991B1B';
  const borderColor = isPrimary ? '#991B1B' : '#B45309';

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        height: '240px',
        backgroundColor: hovered ? hoverBg : baseBg,
        border: `2px solid ${borderColor}`,
        outline: `1px solid ${isPrimary ? '#D97706' : 'transparent'}`,
        outlineOffset: '-10px',
        borderRadius: '14px',
        color: textColor,
        fontFamily: '"Georgia", "Times New Roman", serif',
        fontSize: '34px',
        fontWeight: '700',
        letterSpacing: '-0.3px',
        lineHeight: '1.2',
        padding: '0 32px',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 14px 30px rgba(153, 27, 27, 0.14)' : '0 4px 12px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.25s ease',
      }}
    >
      {label}
    </button>
  );
}

export default function LandingHero({ onSelectNewOrder, onOpenFollowUp, onOpenLogin }) {
  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '20px 0 60px 0' }}>
      {/* Top Editorial Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #E7E5E4',
          paddingBottom: '20px',
          marginBottom: '48px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              backgroundColor: '#991B1B',
              width: '42px',
              height: '42px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #B45309',
            }}
          >
            <BookOutlined style={{ color: '#FFFFFF', fontSize: '20px' }} />
          </div>
          <div>
            <div
              style={{
                fontFamily: '"Georgia", "Times New Roman", serif',
                fontSize: '26px',
                fontWeight: '800',
                letterSpacing: '-0.5px',
                color: '#1C1917',
                lineHeight: '1.1',
              }}
            >
              TINZEL
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                color: '#B45309',
              }}
            >
              Bespoke Love & Milestone Magazines
            </div>
          </div>
        </div>

        {/* Top-Right Login Button */}
        <Button
          onClick={onOpenLogin}
          icon={<UserOutlined style={{ color: '#991B1B' }} />}
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#B45309',
            color: '#1C1917',
            height: '38px',
            padding: '0 18px',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '6px',
          }}
        >
          Login
        </Button>
      </div>

      {/* Hero Narrative */}
      <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 54px auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            color: '#B45309',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '20px',
          }}
        >
          <HeartOutlined /> Personal Keepsake Publications
        </div>

        <h1
          style={{
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontSize: '44px',
            fontWeight: '800',
            lineHeight: '1.18',
            color: '#1C1917',
            marginBottom: '18px',
            letterSpacing: '-0.5px',
          }}
        >
          Every Great Love Story Deserves Its Own Magazine
        </h1>

        <p
          style={{
            fontSize: '17px',
            color: '#78716C',
            lineHeight: '1.7',
            maxWidth: '680px',
            margin: '0 auto',
            fontFamily: '"Georgia", serif',
          }}
        >
          From wedding vows and heartfelt tributes to unforgettable family celebrations — we immortalize
          your most intimate memories into a luxury, printed editorial publication.
        </p>
      </div>

      {/* The Two Big Options — minimal */}
      <Row gutter={[28, 28]} justify="center">
        <Col xs={24} md={12}>
          <OptionCard label="New Magazine Order" onClick={onSelectNewOrder} variant="primary" />
        </Col>
        <Col xs={24} md={12}>
          <OptionCard label="Magazine Order Follow Up" onClick={onOpenFollowUp} variant="secondary" />
        </Col>
      </Row>

      {/* Quote Banner */}
      <div
        style={{
          marginTop: '60px',
          padding: '28px 24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E7E5E4',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: '"Georgia", serif',
            fontStyle: 'italic',
            fontSize: '16px',
            color: '#1C1917',
            marginBottom: '6px',
          }}
        >
          "A wedding happens in a day, but your love story lives forever in print."
        </p>
        <span style={{ fontSize: '12px', color: '#B45309', fontWeight: '700', letterSpacing: '1px' }}>
          TINZEL MAGAZINE STUDIOS
        </span>
      </div>
    </div>
  );
}
