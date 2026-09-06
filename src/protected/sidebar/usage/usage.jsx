// Usage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { fetchYearUsage } from '../../../api/user/usage';
import SpinnerRounded from '../../../components/loading';
import { USAGE_KEY } from '../../../utils/constants'
import './usage.css';
import { useUserID } from '../../../utils/userIdContext';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const parseCounts = (byModel) => {
  try {
    const o = typeof byModel === 'string' ? JSON.parse(byModel) : byModel;
    if (!o || typeof o !== 'object') return null;
    const r = {};
    for (const [k, v] of Object.entries(o)) r[k] = Number((v && v.requests) ?? v) || 0;
    return r;
  } catch {
    return null;
  }
};
const pct = (part, total) => (!total ? '0%' : `${((part / total) * 100).toFixed(0)}%`);

const readUsageCache = () => {
  try {
    return JSON.parse(sessionStorage.getItem(USAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const getCache = (year) => {
  const cache = readUsageCache();
  return cache?.data?.[String(year)] ?? null;
};

const putCache = (year, data) => {
  const y = String(year);
  const cache = readUsageCache();
  const now = Date.now();

  sessionStorage.setItem(
    USAGE_KEY,
    JSON.stringify({
      data: {
        ...(cache.data || {}),
        [y]: data,
      },
      lastFetched: now,
    })
  );
};

export default function Usage({ onClose, modelLabelsById }) {
  const { accessToken, updateAccessToken } = useUserID()
  const currentYear = String(new Date().getFullYear());
  const [selectedYearId, setSelectedYearId] = useState(currentYear);
  const [yearData, setYearData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const year = String(new Date().getFullYear());
        const cache = readUsageCache();

        const now = Date.now();
        const TWELVE_HOURS = 60 * 60 * 1000;

        const cachedYear = cache.data?.[year];
        const expired = !cache.lastFetched || now - cache.lastFetched > TWELVE_HOURS;

        if (!cachedYear || expired) {
          setLoading(true)
          setErrMsg('')
          const res = await fetchYearUsage(year, accessToken, updateAccessToken);
          const data = res?.data ?? res;
          if (!cancelled) {
            putCache(year, data);
            setYearData(data);
          }
          
        }
      } catch (e) {
        console.error('Yearly usage load failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [accessToken, updateAccessToken]);


  useEffect(() => {
    const cacheData = getCache(selectedYearId);
    if (cacheData) setYearData(cacheData);
    else setYearData(null);
  }, [selectedYearId]);

  // Fetch ONLY when user switches the year and it's not cached
  const onYearChange = async (e) => {
    
    const y = String(e.target.value);
    setSelectedYearId(y);

    const cached = getCache(y);
    if (cached) {
      setYearData(cached);
      setLoading(false)
      return;
    }
    setLoading(true)
    setErrMsg('');
    try {
      const res = await fetchYearUsage(y, accessToken, updateAccessToken);
      const data = res?.data ?? res;
      setYearData(data);
      putCache(y, data);
    } catch (e2) {
      setErrMsg(e2?.message || 'Failed to load usage');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (!yearData?.months) return { bestMonth: null, topModel: null };
    const wins = {};
    let bestMonth = { label: '', total: 0 };

    yearData.months.forEach((m, i) => {
      const counts = parseCounts(m && m.byModel);
      const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
      const label = (m && m.label) || MONTH_NAMES[i];

      if (total > bestMonth.total) bestMonth = { label, total };

      if (counts && total) {
        const max = Math.max(...Object.values(counts));
        for (const [model, v] of Object.entries(counts)) {
          if (v === max) wins[model] = (wins[model] || 0) + 1;
        }
      }
    });

    const topModel = Object.entries(wins).sort((a, b) => b[1] - a[1])[0] || null;
    return { bestMonth: bestMonth.total ? bestMonth : null, topModel };
  }, [yearData]);

  return (
    <div className="usage-container" role="dialog" aria-labelledby="usage-title">
      <div className="usage-header">
        <button className="usage-close" onClick={onClose} aria-label="Close" title="Close" type="button">✕</button>
        <h2 id="usage-title" className="usage-title">Model Usage Statistics</h2>
        <div className="usage-header-spacer" aria-hidden="true" />
      </div>

      <div className="usage-subheader">
        <div className="usage-year-row">
          <label className="usage-year-label" htmlFor="year-select">Year: </label>
          <select
            id="year-select"
            className="usage-year-select"
            value={selectedYearId}
            onChange={onYearChange}
          >
            {(new Date().getFullYear() < 2026 ? [String(new Date().getFullYear())]
              : Array.from({ length: 1 }, (_, k) => String(new Date().getFullYear() - k))
            ).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="usage-year-summary" aria-live="polite">
            <div className="usage-year-byModel">
              <span className="usage-year-summary-title">Most active months: </span>
              {summary.bestMonth
                ? <span><strong>{summary.bestMonth.label}</strong> — {summary.bestMonth.total} requests</span>
                : <span>— No Data</span>}
            </div>
            <div className="usage-winning-months">
              <span className="usage-year-summary-title">Highest LLM Usage: </span>
              {summary.topModel
                ? <span>👑 <strong>{modelLabelsById[summary.topModel[0]]}</strong> — {summary.topModel[1]} {summary.topModel[1] === 1 ? 'month' : 'months'}</span>
                : <span>— No Data</span>}
            </div>
          </div>
      </div>

      {errMsg && <div className="usage-error">{errMsg}</div>}
      {loading ? (
        <div className="loading-container">
          <SpinnerRounded />
        </div>
      ) : (
        <div className="usage-months-grid scrollbar-custom">
          {(yearData?.months || []).map((m, i) => {
            const label = (m && m.label) || MONTH_NAMES[i];
            const counts = parseCounts(m && m.byModel);
            const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

            if (!counts || total === 0) {
              return (
                <div key={i} className="usage-month-cell">
                  <div className="usage-month-name">{label}</div>
                  <div className="usage-month-empty">No Data Available</div>
                </div>
              );
            }

            const top3 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);

            return (
              <div key={i} className="usage-month-cell">
                <div className="usage-month-name">{label}</div>
                <ol className="usage-month-top3">
                  {top3.map(([model, req], idx) => (
                    <li key={model}>
                      <span className="usage-rank">#{idx + 1}</span>
                      <span className="usage-model">{modelLabelsById[model] ?? model}</span>
                      <span className="usage-pct">{pct(req, total)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
