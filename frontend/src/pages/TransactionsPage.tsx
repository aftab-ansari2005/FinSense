import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import transactionsService, {
  TransactionFilters,
  PaginatedTransactions,
} from '../services/transactions.service';

/* ── shared ink styles ── */
const inkLabel: React.CSSProperties = {
  fontFamily: "'Lato', sans-serif", fontSize: '10px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.13em', color: '#9a7a50',
  margin: '0 0 8px',
};
const inkText: React.CSSProperties = {
  fontFamily: "'Lato', sans-serif", color: '#1e1610',
};

/* ── paper section wrapper ── */
const Section: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    className="paper-card-base paper-card-torn"
    style={{ borderRadius: '3px', padding: '22px 24px 32px', position: 'relative', ...style }}
  >
    {children}
  </div>
);

const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData]           = useState<PaginatedTransactions | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const [filters, setFilters]     = useState<TransactionFilters>({});
  const [searchTerm, setSearchTerm]           = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories]           = useState<string[]>([]);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchTransactions(); }, [page, filters]);

  const fetchCategories = async () => {
    try { setCategories(await transactionsService.getCategories()); }
    catch { /* silent */ }
  };

  const fetchTransactions = async () => {
    setLoading(true); setError(null);
    try { setData(await transactionsService.getTransactions(page, 20, filters)); }
    catch (e: any) { setError(e.response?.data?.message || 'Failed to load transactions'); }
    finally { setLoading(false); }
  };

  const handleSearch = () => { setFilters({ ...filters, search: searchTerm }); setPage(1); };
  const handleCategoryFilter = (c: string) => { setSelectedCategory(c); setFilters({ ...filters, category: c || undefined }); setPage(1); };
  const handleClearFilters = () => { setSearchTerm(''); setSelectedCategory(''); setFilters({}); setPage(1); };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const hasFilters = !!(searchTerm || selectedCategory);

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Lato', sans-serif", fontSize: '14px',
    background: 'linear-gradient(160deg, #fdfaf0, #f5eed8)',
    backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, transparent 27px, rgba(160,130,80,.07) 27px, rgba(160,130,80,.07) 28px), linear-gradient(160deg, #fdfaf0, #f5eed8)`,
    border: '1px solid rgba(180,148,95,.35)',
    borderBottom: '2px solid rgba(140,110,60,.4)',
    borderRadius: '3px', padding: '9px 14px',
    color: '#1e1610', outline: 'none',
    boxShadow: 'inset 0 2px 5px rgba(60,38,14,.1)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Page header ── */}
      <div
        className="paper-blue"
        style={{
          padding: '24px 28px 18px',
          boxShadow: '0 4px 18px rgba(58,34,10,.3)',
          clipPath: `polygon(0% 0%, 100% 0%, 100% 78%, 97% 84%, 93% 78%, 90% 85%, 86% 78%, 82% 85%, 78% 78%, 74% 85%, 70% 78%, 66% 84%, 62% 78%, 58% 84%, 54% 78%, 50% 85%, 46% 78%, 42% 84%, 38% 78%, 34% 85%, 30% 78%, 26% 84%, 22% 78%, 18% 84%, 14% 78%, 10% 84%, 6% 78%, 2% 84%, 0% 78%)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 style={{ ...inkText, fontWeight: 900, fontSize: '26px', margin: '0 0 5px', color: '#1a3848' }}>Transactions</h1>
          <p style={{ ...inkText, fontSize: '14px', color: '#3e6070', margin: 0 }}>View and manage your transaction history</p>
        </div>
        <button className="btn-wood-lime" onClick={() => navigate('/upload')}
          style={{ fontSize: '13px', whiteSpace: 'nowrap', alignSelf: 'center' }}>
          ⬆ Upload CSV
        </button>
      </div>

      {/* ── Filters ── */}
      <Section>
        <h2 style={{ ...inkText, fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>Filters</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <p style={inkLabel}>Search</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text" value={searchTerm} style={{ ...inputStyle, flex: 1 }}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by description…"
              />
              <button className="btn-wood-lime" onClick={handleSearch} style={{ fontSize: '13px' }}>Search</button>
            </div>
          </div>

          <div>
            <p style={inkLabel}>Category</p>
            <select value={selectedCategory} onChange={e => handleCategoryFilter(e.target.value)}
              style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {hasFilters && (
            <button onClick={handleClearFilters} style={{
              ...inkText, fontSize: '12px', background: 'none', border: 'none',
              cursor: 'pointer', textDecoration: 'underline', color: '#7a6248',
              paddingBottom: '10px',
            }}>
              Clear filters
            </button>
          )}
        </div>
      </Section>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: 'rgba(170,50,50,.1)', border: '1px solid rgba(150,50,50,.3)', borderRadius: '3px', padding: '12px 16px' }}>
          <p style={{ ...inkText, fontWeight: 700, color: '#802020', fontSize: '14px', margin: '0 0 4px' }}>Error loading transactions</p>
          <p style={{ ...inkText, fontSize: '12px', color: '#802020', margin: 0 }}>{error}</p>
          <button onClick={fetchTransactions} style={{ ...inkText, marginTop: '8px', fontSize: '12px', color: '#802020', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Try again</button>
        </div>
      )}

      {/* ── Transactions table ── */}
      <Section style={{ padding: '0 0 28px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ ...inkText, color: '#9a7a50', fontSize: '14px' }}>Loading transactions…</p>
          </div>
        ) : data && data.transactions.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(180deg, #f0e8d4, #e8dcc0)', borderBottom: '2px solid rgba(180,148,95,.3)' }}>
                    {['Date', 'Description', 'Category', 'Amount'].map((h, i) => (
                      <th key={h} style={{
                        ...inkLabel,
                        padding: '12px 16px',
                        textAlign: i === 3 ? 'right' : 'left',
                        margin: 0,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx, idx) => (
                    <tr key={tx._id} style={{
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(180,148,95,.05)',
                      borderBottom: '1px solid rgba(180,148,95,.12)',
                      transition: 'background .12s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,148,95,.13)')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(180,148,95,.05)')}
                    >
                      <td style={{ ...inkText, fontSize: '13px', padding: '11px 16px', whiteSpace: 'nowrap', color: '#5a4832' }}>{fmtDate(tx.date)}</td>
                      <td style={{ ...inkText, fontSize: '13px', padding: '11px 16px', maxWidth: '280px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.description}>{tx.description}</div>
                      </td>
                      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                        {tx.category ? (
                          <span style={{
                            fontFamily: "'Lato', sans-serif", fontSize: '11px', fontWeight: 700,
                            background: 'rgba(58,90,128,.12)', color: '#2c4a6e',
                            border: '1px solid rgba(58,90,128,.2)',
                            borderRadius: '20px', padding: '3px 10px',
                          }}>{tx.category.name}</span>
                        ) : (
                          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: '11px', color: '#b0906a' }}>Uncategorized</span>
                        )}
                      </td>
                      <td style={{
                        ...inkText, fontSize: '13px', fontWeight: 700,
                        padding: '11px 16px', textAlign: 'right',
                        color: tx.amount >= 0 ? '#2a5e2a' : '#7a1818',
                      }}>{fmt(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{
              padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderTop: '1px solid rgba(180,148,95,.2)',
              background: 'linear-gradient(180deg, rgba(180,148,95,.06), transparent)',
            }}>
              <p style={{ ...inkText, fontSize: '12px', color: '#9a7a50', margin: 0 }}>
                Showing <strong>{(page - 1) * 20 + 1}</strong> – <strong>{Math.min(page * 20, data.total)}</strong> of <strong>{data.total}</strong>
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-wood-natural" onClick={() => setPage(page - 1)} disabled={page === 1}
                  style={{ fontSize: '12px', padding: '6px 14px', opacity: page === 1 ? 0.45 : 1 }}>← Prev</button>
                <button className="btn-wood-natural" onClick={() => setPage(page + 1)} disabled={page >= data.totalPages}
                  style={{ fontSize: '12px', padding: '6px 14px', opacity: page >= data.totalPages ? 0.45 : 1 }}>Next →</button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <svg style={{ width: '44px', height: '44px', opacity: .22, color: '#5c4230', margin: '0 auto 12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={{ ...inkText, fontSize: '15px', fontWeight: 700, margin: '0 0 6px' }}>No transactions</p>
            <p style={{ ...inkText, fontSize: '13px', color: '#9a7a50', margin: '0 0 16px' }}>
              {hasFilters ? 'No transactions match your filters.' : 'Get started by uploading your bank statement CSV.'}
            </p>
            {!hasFilters && (
              <button className="btn-wood-lime" onClick={() => navigate('/upload')} style={{ fontSize: '13px' }}>Upload Transactions</button>
            )}
          </div>
        )}
      </Section>
    </div>
  );
};

export default TransactionsPage;
