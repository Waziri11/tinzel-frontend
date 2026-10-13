import React from 'react';
import { Button, Card, Row, Col, Typography, Tag, Divider } from 'antd';
import {
  BookOutlined,
  SearchOutlined,
  UserOutlined,
  HeartOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

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
        <div>
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
            Staff Login
          </Button>
        </div>
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

      {/* The Two Big Options */}
      <Row gutter={[28, 28]} justify="center">
        {/* Option 1: New Magazine Order */}
        <Col xs={24} md={12}>
          <div
            onClick={onSelectNewOrder}
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #991B1B',
              borderRadius: '12px',
              padding: '36px 32px',
              cursor: 'pointer',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              position: 'relative',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div
                  style={{
                    backgroundColor: '#991B1B',
                    width: '52px',
                    height: '52px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #B45309',
                  }}
                >
                  <BookOutlined style={{ fontSize: '24px', color: '#FFFFFF' }} />
                </div>
                <Tag
                  color="#991B1B"
                  style={{
                    fontWeight: '700',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    backgroundColor: '#991B1B',
                    border: 'none',
                  }}
                >
                  Start New
                </Tag>
              </div>

              <h2
                style={{
                  fontFamily: '"Georgia", serif',
                  fontSize: '25px',
                  fontWeight: '800',
                  color: '#1C1917',
                  marginBottom: '12px',
                  lineHeight: '1.25',
                }}
              >
                New Magazine Order
              </h2>

              <p style={{ fontSize: '14px', color: '#78716C', lineHeight: '1.6', marginBottom: '22px' }}>
                Begin your customized magazine. Select your preferred event edition, submit your love story and
                speeches, upload your high-resolution photos, and have our artists design your layout.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1C1917' }}>
                  <CheckCircleOutlined style={{ color: '#B45309' }} />
                  <span>Curated wedding & celebration layouts</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1C1917' }}>
                  <CheckCircleOutlined style={{ color: '#B45309' }} />
                  <span>High-resolution photo spreads & custom stories</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1C1917' }}>
                  <CheckCircleOutlined style={{ color: '#B45309' }} />
                  <span>Direct Lipa Namba payment & prompt artist assignment</span>
                </div>
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              block
              style={{
                backgroundColor: '#991B1B',
                borderColor: '#991B1B',
                color: '#FFFFFF',
                height: '48px',
                fontSize: '15px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              Order a New Magazine <ArrowRightOutlined />
            </Button>
          </div>
        </Col>

        {/* Option 2: Magazine Order Follow Up */}
        <Col xs={24} md={12}>
          <div
            onClick={onOpenFollowUp}
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #B45309',
              borderRadius: '12px',
              padding: '36px 32px',
              cursor: 'pointer',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              position: 'relative',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    width: '52px',
                    height: '52px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #B45309',
                  }}
                >
                  <SearchOutlined style={{ fontSize: '24px', color: '#B45309' }} />
                </div>
                <Tag
                  style={{
                    fontWeight: '700',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    color: '#B45309',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FDE68A',
                  }}
                >
                  Client Portal
                </Tag>
              </div>

              <h2
                style={{
                  fontFamily: '"Georgia", serif',
                  fontSize: '25px',
                  fontWeight: '800',
                  color: '#1C1917',
                  marginBottom: '12px',
                  lineHeight: '1.25',
                }}
              >
                Magazine Order Follow Up
              </h2>

              <p style={{ fontSize: '14px', color: '#78716C', lineHeight: '1.6', marginBottom: '22px' }}>
                Already placed an order? Enter your Magazine Order Number to view design progress, inspect
                whole-magazine draft proofs page-by-page, and authorize the final print run.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1C1917' }}>
                  <CheckCircleOutlined style={{ color: '#991B1B' }} />
                  <span>Real-time conveyor belt production status</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1C1917' }}>
                  <CheckCircleOutlined style={{ color: '#991B1B' }} />
                  <span>Private whole-magazine proof reader & flip viewer</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1C1917' }}>
                  <CheckCircleOutlined style={{ color: '#991B1B' }} />
                  <span>One-click whole-magazine print authorization</span>
                </div>
              </div>
            </div>

            <Button
              size="large"
              block
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#B45309',
                color: '#B45309',
                height: '48px',
                fontSize: '15px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              Track Order with Number <SearchOutlined />
            </Button>
          </div>
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
