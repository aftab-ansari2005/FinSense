import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'gray';
  loading?: boolean;
}

const valueColorMap: Record<string, string> = {
  primary: '#1e4a7a',
  success: '#2a5e2a',
  warning: '#7a5008',
  danger:  '#7a1818',
  gray:    '#1e1610',
};

const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon, trend, color = 'primary', loading = false,
}) => {

  /* ── loading state ── */
  if (loading) {
    return (
      <div
        className="paper-card-base paper-card-torn"
        style={{ borderRadius: '3px', padding: '22px 22px 36px', minHeight: '130px' }}
      >
        <div style={{ height: '10px', background: 'rgba(140,110,60,.15)', borderRadius: '4px', width: '44%', marginBottom: '16px' }} />
        <div style={{ height: '26px', background: 'rgba(140,110,60,.12)', borderRadius: '4px', width: '62%', marginBottom: '12px' }} />
        <div style={{ height: '10px', background: 'rgba(140,110,60,.09)', borderRadius: '4px', width: '36%' }} />
      </div>
    );
  }

  /* ── real card ── */
  return (
    <div
      className="paper-card-base paper-card-torn paper-corner"
      style={{
        borderRadius: '3px',
        padding: '20px 20px 36px',
        position: 'relative',
        transition: 'transform .15s ease, box-shadow .15s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform  = 'translateY(-3px)';
        el.style.boxShadow  = '0 10px 30px rgba(60,38,14,.42), 0 1px 0 rgba(255,252,230,.55) inset';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform  = 'translateY(0)';
        el.style.boxShadow  = '';   /* let class default take over */
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* faint uppercase label */}
          <p style={{
            fontFamily: "'Lato', sans-serif", margin: '0 0 10px',
            fontSize: '10px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.14em',
            color: '#9a7a50',
          }}>{title}</p>

          {/* big value */}
          <p style={{
            fontFamily: "'Lato', sans-serif", margin: '0 0 8px',
            fontSize: '2rem', fontWeight: 700, lineHeight: 1.1,
            color: valueColorMap[color] ?? '#1e1610',
          }}>{value}</p>

          {/* subtitle */}
          {subtitle && (
            <p style={{ fontFamily: "'Lato', sans-serif", margin: 0, fontSize: '12px', color: '#9a7a50' }}>
              {subtitle}
            </p>
          )}

          {/* trend */}
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px', gap: '4px' }}>
              <span style={{
                fontFamily: "'Lato', sans-serif", fontSize: '13px', fontWeight: 700,
                color: trend.isPositive ? '#2a5e2a' : '#7a1818',
              }}>
                {trend.isPositive ? '▲' : '▼'} {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>

        {/* watermark icon — very translucent */}
        {icon && (
          <div style={{ marginLeft: '10px', opacity: .15, color: '#5c4230', flexShrink: 0 }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
