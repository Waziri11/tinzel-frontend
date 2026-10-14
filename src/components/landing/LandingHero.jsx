import React, { useState, useEffect } from 'react';
import { Button, Row, Col } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import TinzelLogo from '../common/TinzelLogo';

const OCCASIONS = [
  'Great Love Story',
  'Beautiful Wedding',
  'Amazing Graduation',
  'Memorable Birthday',
  'Cherished Anniversary',
  'Milestone Celebration',
];

function OptionCard({ label, onClick }) {
  const [hovered, setHovered] = useState(false);

  // Authentic Tinzel Gold: #C5A059
  // Default: Crisp white background with delicate gold border and inner inlay.
  // Hovered: Solid rich gold fill with pure white typography.
  const baseBg = '#FFFFFF';
  const hoverBg = '#C5A059';
  const textColor = hovered ? '#FFFFFF' : '#C5A059';
  const borderColor = '#C5A059';

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
        outline: '1px solid #D4AF37',
        outlineOffset: '-10px',
        borderRadius: '14px',
        color: textColor,
        fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
        fontStyle: 'italic',
        fontSize: '38px',
        fontWeight: '600',
        letterSpacing: '-0.2px',
        lineHeight: '1.2',
        padding: '0 32px',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 14px 30px rgba(197, 160, 89, 0.28)' : '0 4px 14px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.25s ease',
      }}
    >
      {label}
    </button>
  );
}

export default function LandingHero({ onSelectNewOrder, onOpenFollowUp, onOpenLogin }) {
  const [occasionIndex, setOccasionIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setOccasionIndex((prev) => (prev + 1) % OCCASIONS.length);
        setIsFading(false);
      }, 350);
    }, 3200);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '16px 0 60px 0' }}>
      {/* Top Editorial Bar: Logo on left, Login on right (Zero lines, Zero taglines) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '64px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <TinzelLogo variant="full" height={48} />
        </div>

        {/* Top-Right Login Button */}
        <Button
          onClick={onOpenLogin}
          icon={<UserOutlined style={{ color: '#C5A059' }} />}
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#C5A059',
            color: '#1C1917',
            height: '38px',
            padding: '0 18px',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
          }}
        >
          Login
        </Button>
      </div>

      {/* Hero Narrative: Animated Headline Only (Subtitle removed for pure minimalism) */}
      <div style={{ textAlign: 'center', maxWidth: '860px', margin: '0 auto 64px auto' }}>
        <h1
          style={{
            fontFamily: 'var(--font-brand, "Cormorant Garamond", Georgia, serif)',
            fontSize: '56px',
            fontWeight: '600',
            lineHeight: '1.2',
            color: '#1C1917',
            letterSpacing: '-0.5px',
            margin: 0,
          }}
        >
          Every{' '}
          <span
            style={{
              display: 'inline-block',
              color: '#C5A059',
              fontStyle: 'italic',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
              opacity: isFading ? 0 : 1,
              transform: isFading ? 'translateY(-8px)' : 'translateY(0)',
              whiteSpace: 'nowrap',
            }}
          >
            {OCCASIONS[occasionIndex]}
          </span>{' '}
          Deserves Its Own Magazine
        </h1>
      </div>

      {/* The Two Big Minimal Options */}
      <Row gutter={[28, 28]} justify="center">
        <Col xs={24} md={12}>
          <OptionCard label="New Magazine Order" onClick={onSelectNewOrder} />
        </Col>
        <Col xs={24} md={12}>
          <OptionCard label="Magazine Order Follow Up" onClick={onOpenFollowUp} />
        </Col>
      </Row>
    </div>
  );
}
