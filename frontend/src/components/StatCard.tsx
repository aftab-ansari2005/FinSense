import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'gray';
  loading?: boolean;
}

const valueColorMap: Record<string, string> = {
  primary: '#2c5f8a',
  success: '#3a6b3a',
  warning: '#8a6010',
  danger: '#8a2020',
  gray:    '#1e1610',
};

const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon, trend, color = 'primary', loading = false,
}) => {

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(160deg, #faf5ea, #ede4c8)',
        borderRadius: '4px',
        padding: '24px',
        boxShadow: '0 4px 18px rgba(60,35,10,0.26)',
        minHeight: '130px',
        clipPath: `polygon(
          0% 0%, 100% 0%, 100% 85%,
          98% 89%, 95% 84%, 92% 90%, 89% 84%,
          86% 90%, 83% 85%, 80% 90%, 77% 84%,
          74% 90%, 71% 85%, 68% 90%, 65% 84%,
          62% 91%, 59% 85%, 56% 90%, 53% 84%,
          50% 90%, 47% 85%, 44% 91%, 41% 85%,
          38% 90%, 35% 84%, 32% 90%, 29% 84%,
          26% 90%, 23% 85%, 20% 91%, 17% 85%,
          14% 90%, 11% 84%, 8% 90%, 5% 85%,
          2% 90%, 0% 85%
        )`,
      }}>
        <div style={{ height: '10px', background: 'rgba(140,100,50,0.15)', borderRadius: '4px', width: '45%', marginBottom: '16px' }} />
        <div style={{ height: '26px', background: 'rgba(140,100,50,0.12)', borderRadius: '4px', width: '65%', marginBottom: '12px' }} />
        <div style={{ height: '10px', background: 'rgba(140,100,50,0.10)', borderRadius: '4px', width: '38%' }} />
      </div>
    );
  }

  /* ── real card ── */
  return (
    <div
      style={{
        /* warm parchment with subtle ruled lines */
        background: 'linear-gradient(160deg, #faf5ea 0%, #f4edda 55%, #ede4c8 100%)',
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            rgba(180,145,90,0)    0px,
            rgba(180,145,90,0)    27px,
            rgba(180,145,90,0.07) 28px
          ),
          linear-gradient(160deg, #faf5ea 0%, #f4edda 55%, #ede4c8 100%)
        `,
        borderRadius: '4px',
        /* extra bottom padding so text isn't clipped by the torn edge */
        padding: '22px 22px 36px',
        boxShadow: '0 4px 18px rgba(60,35,10,0.28), 0 1px 0 rgba(255,255,240,0.5) inset',
        border: '1px solid rgba(180,145,90,0.2)',
        position: 'relative',
        /* ── torn bottom via clip-path ── */
        clipPath: `polygon(
          0% 0%, 100% 0%, 100% 85%,
          98% 89%, 95% 84%, 92% 90%, 89% 84%,
          86% 90%, 83% 85%, 80% 90%, 77% 84%,
          74% 90%, 71% 85%, 68% 90%, 65% 84%,
          62% 91%, 59% 85%, 56% 90%, 53% 84%,
          50% 90%, 47% 85%, 44% 91%, 41% 85%,
          38% 90%, 35% 84%, 32% 90%, 29% 84%,
          26% 90%, 23% 85%, 20% 91%, 17% 85%,
          14% 90%, 11% 84%, 8% 90%, 5% 85%,
          2% 90%, 0% 85%
        )`,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform   = 'translateY(-2px)';
        el.style.boxShadow   = '0 8px 28px rgba(60,35,10,0.38), 0 1px 0 rgba(255,255,240,0.5) inset';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform   = 'translateY(0)';
        el.style.boxShadow   = '0 4px 18px rgba(60,35,10,0.28), 0 1px 0 rgba(255,255,240,0.5) inset';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Uppercase faded ink label */}
          <p style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: '10px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: '#9a7a52', marginBottom: '10px', margin: '0 0 10px',
          }}>
            {title}
          </p>

          {/* Main value */}
          <p style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: '2rem', fontWeight: 700,
            color: valueColorMap[color] || '#1e1610',
            lineHeight: 1.1, margin: '0 0 8px',
          }}>
            {value}
          </p>

          {/* Subtitle */}
          {subtitle && (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: '12px', color: '#9a7a52', margin: 0 }}>
              {subtitle}
            </p>
          )}

          {/* Trend indicator */}
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px', gap: '4px' }}>
              <span style={{
                fontSize: '13px',
                color: trend.isPositive ? '#3a6b3a' : '#8a2020',
                fontWeight: 700,
                fontFamily: "'Lato', sans-serif",
              }}>
                {trend.isPositive ? '▲' : '▼'} {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>

        {/* Watermark icon — very faint */}
        {icon && (
          <div style={{
            marginLeft: '12px', opacity: 0.18,
            color: '#6b4c37', flexShrink: 0, marginTop: '2px',
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
