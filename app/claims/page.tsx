'use client';

import { useState, useEffect } from 'react';

interface ClaimRecord {
  claim_id: string;
  note_filename: string;
  pdf_url: string;
  decision: 'approved' | 'denied' | 'pending';
  amount_approved?: number;
  reason?: string;
  created_at: string;
  patient_name?: string;
  provider_name?: string;
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'denied' | 'pending'>('all');

  useEffect(() => {
    loadClaims();
    const interval = setInterval(loadClaims, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadClaims = async () => {
    try {
      const response = await fetch('/api/claims/list');
      const result = await response.json();
      if (result.success) {
        setClaims(result.data);
      }
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClaims = claims.filter((claim) => {
    if (filter === 'all') return true;
    return claim.decision === filter;
  });

  const getDecisionBadge = (decision: ClaimRecord['decision']) => {
    const styles = {
      approved: 'bg-green-50 text-green-700 border-green-300',
      denied: 'bg-red-50 text-red-700 border-red-300',
      pending: 'bg-amber-50 text-amber-700 border-amber-300',
    };

    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold border uppercase tracking-wide ${styles[decision]}`}>
        {decision}
      </span>
    );
  };

  const stats = {
    total: claims.length,
    approved: claims.filter((c) => c.decision === 'approved').length,
    denied: claims.filter((c) => c.decision === 'denied').length,
    pending: claims.filter((c) => c.decision === 'pending').length,
    totalApproved: claims
      .filter((c) => c.decision === 'approved')
      .reduce((sum, c) => sum + (c.amount_approved || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Claims Management
              </h1>
              <p className="text-xl text-gray-600">
                View and download all processed claim PDFs
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/notes"
                className="inline-flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-xl shadow hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                Back to Notes
              </a>
              <a
                href="/"
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl shadow hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
              >
                Home
              </a>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-600 font-medium mb-2">Total Claims</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-600 font-medium mb-2">Approved</p>
            <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-600 font-medium mb-2">Denied</p>
            <p className="text-3xl font-bold text-red-600">{stats.denied}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-600 font-medium mb-2">Pending</p>
            <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-600 font-medium mb-2">Total Approved</p>
            <p className="text-2xl font-bold text-blue-600">
              ${stats.totalApproved.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                filter === 'approved'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Approved ({stats.approved})
            </button>
            <button
              onClick={() => setFilter('denied')}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                filter === 'denied'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Denied ({stats.denied})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                filter === 'pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={loadClaims}
              className="ml-auto px-5 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold transition-all duration-200 active:scale-[0.98]"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Claims List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading claims...</p>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No claims found</p>
              <p className="text-sm mt-2">
                {filter === 'all'
                  ? 'Upload notes to generate claims'
                  : `No ${filter} claims yet`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClaims.map((claim) => (
                <div
                  key={claim.claim_id}
                  className="border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">
                          {claim.claim_id}
                        </h3>
                        {getDecisionBadge(claim.decision)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Source Note:</p>
                          <p className="font-medium text-gray-900">{claim.note_filename}</p>
                        </div>
                        {claim.patient_name && (
                          <div>
                            <p className="text-sm text-gray-600">Patient:</p>
                            <p className="font-medium text-gray-900">{claim.patient_name}</p>
                          </div>
                        )}
                        {claim.provider_name && (
                          <div>
                            <p className="text-sm text-gray-600">Provider:</p>
                            <p className="font-medium text-gray-900">{claim.provider_name}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-600">Created:</p>
                          <p className="font-medium text-gray-900">
                            {new Date(claim.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {claim.amount_approved && (
                        <div className="bg-green-50 rounded-2xl p-4 mb-3 border border-green-200">
                          <p className="text-sm text-green-700 font-medium mb-1">Amount Approved</p>
                          <p className="text-2xl font-bold text-green-700">
                            ${claim.amount_approved.toFixed(2)}
                          </p>
                        </div>
                      )}

                      {claim.reason && (
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 font-medium mb-1">Reason</p>
                          <p className="text-sm text-gray-800">{claim.reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 flex flex-col gap-3">
                      <a
                        href={claim.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow hover:shadow-lg active:scale-[0.98]"
                      >
                        View PDF
                      </a>
                      <a
                        href={claim.pdf_url}
                        download
                        className="inline-flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow hover:shadow-lg active:scale-[0.98]"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

