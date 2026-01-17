import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import transactionsService, {
  Transaction,
  TransactionFilters,
  PaginatedTransactions,
} from '../services/transactions.service';

const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedTransactions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, filters]);

  const fetchCategories = async () => {
    try {
      const cats = await transactionsService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await transactionsService.getTransactions(page, 20, filters);
      setData(result);
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm });
    setPage(1);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    setFilters({ ...filters, category: category || undefined });
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setFilters({});
    setPage(1);
  };

  const handleUpdateCategory = async (transactionId: string, newCategory: string) => {
    try {
      await transactionsService.updateTransactionCategory(transactionId, newCategory);
      fetchTransactions(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to update category:', err);
      alert('Failed to update category. Please try again.');
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getAmountColor = (amount: number): string => {
    return amount >= 0 ? 'text-success-600' : 'text-danger-600';
  };

  const hasActiveFilters = searchTerm || selectedCategory;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Transactions</h1>
            <p className="text-gray-600">View and manage your transaction history</p>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Upload CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by description..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSearch}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4">
            <button
              onClick={handleClearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-danger-50 border border-danger-500 text-danger-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading transactions</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchTransactions}
            className="mt-2 text-sm font-medium hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading transactions...</p>
          </div>
        ) : data && data.transactions.length > 0 ? (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.transactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transaction.category ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                              {transaction.category.name}
                            </span>
                            {!transaction.category.isUserVerified && (
                              <span
                                className="text-xs text-gray-500"
                                title={`Confidence: ${(transaction.category.confidence * 100).toFixed(0)}%`}
                              >
                                AI
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Uncategorized</span>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getAmountColor(transaction.amount)}`}>
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(page * 20, data.total)}
                </span>{' '}
                of <span className="font-medium">{data.total}</span> transactions
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
            <p className="mt-1 text-sm text-gray-500">
              {hasActiveFilters
                ? 'No transactions match your filters.'
                : 'Get started by uploading your bank statement CSV file.'}
            </p>
            {!hasActiveFilters && (
              <button
                onClick={() => navigate('/upload')}
                className="mt-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Upload Transactions
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
