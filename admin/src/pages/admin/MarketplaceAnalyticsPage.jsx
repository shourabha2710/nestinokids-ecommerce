import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MousePointerClick, AlertTriangle, Loader2 } from 'lucide-react';
import marketplaceService from '../../services/marketplaceService';
import { adminAPI } from '../../services/adminApi';
import { getErrorMessage } from '../../utils/errorUtils';
import MarketplaceAnalyticsFilters from '../../components/marketplace/MarketplaceAnalyticsFilters';
import MarketplaceTrendChart from '../../components/marketplace/MarketplaceTrendChart';
import MarketplaceBreakdownChart from '../../components/marketplace/MarketplaceBreakdownChart';
import MarketplaceTopProductsTable from '../../components/marketplace/MarketplaceTopProductsTable';
import MarketplaceRecentClicksTable from '../../components/marketplace/MarketplaceRecentClicksTable';

const DEFAULT_FILTERS = {
  startDate: null,
  endDate: null,
  marketplace: 'all',
  sourcePage: 'all',
  productId: 'all',
};

const formatCount = (v) => Intl.NumberFormat('en-IN').format(v ?? 0);

const MarketplaceAnalyticsPage = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [products, setProducts] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    adminAPI.getProducts({ limit: 200 })
      .then((res) => {
        if (active) setProducts(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => { active = false; };
  }, []);

  const hasInvalidRange = useMemo(() => {
    const { startDate, endDate } = filters;
    return !!(startDate && endDate && startDate > endDate);
  }, [filters]);

  const params = useMemo(() => {
    const p = {};
    if (filters.startDate) p.start_date = filters.startDate;
    if (filters.endDate) p.end_date = filters.endDate;
    if (filters.marketplace !== 'all') p.marketplace = filters.marketplace;
    if (filters.sourcePage !== 'all') p.source_page = filters.sourcePage;
    if (filters.productId !== 'all') p.product_id = filters.productId;
    return p;
  }, [filters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await marketplaceService.getAnalytics(params);
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load marketplace click analytics'));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (hasInvalidRange) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [fetchData, hasInvalidRange]);

  const marketplaceBreakdown = useMemo(
    () => (data?.marketplace_breakdown || []).map((b) => ({ name: b.marketplace, value: b.clicks, share: b.share })),
    [data],
  );
  const sourceBreakdown = useMemo(
    () => (data?.source_breakdown || []).map((b) => ({ name: b.source_page || 'unknown', value: b.clicks, share: b.share })),
    [data],
  );

  const totalClicks = data?.summary?.total_clicks ?? 0;

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketplace Click Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track outbound clicks to external marketplaces</p>
      </div>

      <MarketplaceAnalyticsFilters filters={filters} onChange={setFilters} products={products} />

      {hasInvalidRange && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Start date cannot be after end date</span>
        </div>
      )}

      {error && !hasInvalidRange && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {!hasInvalidRange && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="p-2.5 bg-gold/10 rounded-xl">
              <MousePointerClick size={20} className="text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCount(totalClicks)}</p>
              <p className="text-sm text-gray-500">Total Clicks</p>
            </div>
          </div>

          <MarketplaceTrendChart data={data?.daily_trend || []} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MarketplaceBreakdownChart title="By Marketplace" data={marketplaceBreakdown} />
            <MarketplaceBreakdownChart title="By Source Page" data={sourceBreakdown} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <MarketplaceTopProductsTable data={data?.top_products || []} />
            <MarketplaceRecentClicksTable data={data?.recent_clicks || []} />
          </div>

          {loading && <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Updating...</div>}
        </>
      )}
    </div>
  );
};

export default MarketplaceAnalyticsPage;
