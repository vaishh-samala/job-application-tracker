import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowUpRight, BriefcaseBusiness, CalendarDays, Check, ChevronDown,
  CircleDollarSign, Clock3, ExternalLink, Filter, LayoutDashboard, MapPin,
  MoreHorizontal, Plus, Search, Sparkles, Target, Trash2, TrendingUp, X
} from 'lucide-react';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const STATUSES = ['Wishlist', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
const EMPTY_FORM = {
  company: '', role: '', location: '', job_url: '', salary_range: '',
  status: 'Applied', applied_date: new Date().toISOString().slice(0, 10),
  interview_date: '', notes: ''
};

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed. Check the API server.');
  return payload;
}

function formatDate(date) {
  if (!date) return '—';
  const parsed = new Date(`${String(date).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(company = '') {
  return company.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function StatusPill({ status }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}>{status}</span>;
}

function MetricCard({ icon: Icon, label, value, helper, tone }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon size={19} /></div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-helper">{helper}</div>
    </article>
  );
}

function ApplicationModal({ initial, onClose, onSave, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!form.company.trim() || !form.role.trim()) {
      setError('Company and role are required.');
      return;
    }
    try {
      await onSave({
        ...form,
        company: form.company.trim(),
        role: form.role.trim(),
        applied_date: form.applied_date || null,
        interview_date: form.interview_date || null
      });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div><p className="eyebrow">{initial?.id ? 'UPDATE RECORD' : 'NEW OPPORTUNITY'}</p><h2 id="modal-title">{initial?.id ? 'Edit application' : 'Add application'}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>Company <span>*</span><input autoFocus value={form.company} onChange={(e) => update('company', e.target.value)} placeholder="e.g. Microsoft" required /></label>
            <label>Job title <span>*</span><input value={form.role} onChange={(e) => update('role', e.target.value)} placeholder="e.g. Data Analyst" required /></label>
            <label>Location<input value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Hyderabad / Remote" /></label>
            <label>Status<select value={form.status} onChange={(e) => update('status', e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label>Applied date<input type="date" value={String(form.applied_date || '').slice(0, 10)} onChange={(e) => update('applied_date', e.target.value)} /></label>
            <label>Interview date<input type="date" value={String(form.interview_date || '').slice(0, 10)} onChange={(e) => update('interview_date', e.target.value)} /></label>
            <label>Salary range<input value={form.salary_range} onChange={(e) => update('salary_range', e.target.value)} placeholder="e.g. ₹5–7 LPA" /></label>
            <label>Job posting URL<input type="url" value={form.job_url} onChange={(e) => update('job_url', e.target.value)} placeholder="https://..." /></label>
            <label className="full-field">Notes<textarea rows="3" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Recruiter contact, next steps, or interview notes..." /></label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : <><Check size={16} /> Save application</>}</button></div>
        </form>
      </section>
    </div>
  );
}

export default function App() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, interviews: 0, offers: 0, appliedThisWeek: 0, byStatus: {} });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'All statuses') params.set('status', status);
      const [items, summary] = await Promise.all([
        request(`/applications?${params.toString()}`),
        request('/applications/stats')
      ]);
      setApplications(items);
      setStats(summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const topStatuses = useMemo(() => STATUSES.map((name) => ({ name, count: stats.byStatus?.[name] || 0 })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 4), [stats]);
  const maxStatusCount = Math.max(1, ...topStatuses.map((item) => item.count));

  async function saveApplication(form) {
    setSaving(true);
    try {
      if (modal?.id) await request(`/applications/${modal.id}`, { method: 'PUT', body: JSON.stringify(form) });
      else await request('/applications', { method: 'POST', body: JSON.stringify(form) });
      setModal(null);
      setNotice(modal?.id ? 'Application updated.' : 'Application added.');
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteApplication(item) {
    if (!window.confirm(`Delete the application for ${item.company}? This cannot be undone.`)) return;
    try {
      await request(`/applications/${item.id}`, { method: 'DELETE' });
      setNotice('Application deleted.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><BriefcaseBusiness size={21} /></div><span>job<span className="brand-accent">track</span></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <button className="nav-link active"><LayoutDashboard size={18} /> Overview</button>
        <button className="nav-link" onClick={() => { setStatus('All statuses'); document.querySelector('.applications-section')?.scrollIntoView({ behavior: 'smooth' }); }}><BriefcaseBusiness size={18} /> Applications <span className="nav-count">{stats.total}</span></button>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><div className="tip-icon"><Sparkles size={17} /></div><strong>Stay consistent.</strong><p>Small steps every day move your job search forward.</p></div>
          <div className="profile-mini"><div className="profile-avatar">V</div><div><strong>Your workspace</strong><span>Personal tracker</span></div><MoreHorizontal size={18} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div><div className="topbar-right"><span className="today-label"><CalendarDays size={15} /> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span><div className="top-avatar">V</div></div></header>

        <div className="page-content">
          <section className="welcome-row"><div><p className="eyebrow">YOUR CAREER, ORGANIZED</p><h1>Job search overview<span>.</span></h1><p className="page-subtitle">A clear view of every opportunity and your next move.</p></div><button className="button button-primary add-main" onClick={() => setModal({ ...EMPTY_FORM })}><Plus size={17} /> Add application</button></section>

          {error && <div className="alert alert-error"><span>{error}</span><button onClick={load} className="text-button">Retry</button></div>}
          {notice && <div className="alert alert-success"><Check size={16} /> {notice}<button className="alert-close" onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}

          <section className="metrics-grid">
            <MetricCard icon={BriefcaseBusiness} label="TOTAL APPLICATIONS" value={stats.total} helper="All tracked opportunities" tone="violet" />
            <MetricCard icon={Activity} label="IN PROGRESS" value={stats.interviews} helper="Screening and interviews" tone="blue" />
            <MetricCard icon={TrendingUp} label="OFFERS RECEIVED" value={stats.offers} helper="Your wins so far" tone="green" />
            <MetricCard icon={Target} label="APPLIED THIS WEEK" value={stats.appliedThisWeek} helper="Keep the momentum going" tone="orange" />
          </section>

          <section className="insights-grid">
            <article className="panel status-panel"><div className="panel-heading"><div><h2>Application pipeline</h2><p>How your opportunities are progressing</p></div><span className="panel-icon"><TrendingUp size={18} /></span></div>
              {topStatuses.length ? <div className="pipeline-list">{topStatuses.map((item) => <div className="pipeline-item" key={item.name}><div className="pipeline-label"><span>{item.name}</span><strong>{item.count}</strong></div><div className="progress-track"><div className={`progress-fill fill-${item.name.toLowerCase()}`} style={{ width: `${(item.count / maxStatusCount) * 100}%` }} /></div></div>)}</div> : <div className="insight-empty"><div className="empty-symbol"><Activity size={22} /></div><strong>Your pipeline starts here</strong><p>Add your first application to see progress.</p></div>}
            </article>
            <article className="panel focus-panel"><div className="focus-decoration"><CircleDollarSign size={25} /></div><p className="eyebrow">YOUR NEXT MOVE</p><h2>Make every follow-up count.</h2><p>Keep interview dates and recruiter notes in one place so the next step is always clear.</p><button className="focus-link" onClick={() => { setStatus('Interview'); document.querySelector('.applications-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Review interviews <ArrowUpRight size={16} /></button><div className="focus-orb orb-one" /><div className="focus-orb orb-two" /></article>
          </section>

          <section className="panel applications-section">
            <div className="applications-heading"><div><h2>Recent applications</h2><p>Manage and review your opportunities</p></div><button className="button button-secondary" onClick={() => setModal({ ...EMPTY_FORM })}><Plus size={16} /> New entry</button></div>
            <div className="table-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, role, location..." aria-label="Search applications" />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}</div><label className="filter-box"><Filter size={15} /><select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option>All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><ChevronDown size={14} /></label></div>

            {loading ? <div className="table-state"><div className="spinner" />Loading applications…</div> : applications.length === 0 ? <div className="table-state empty-state"><div className="empty-symbol"><BriefcaseBusiness size={24} /></div><h3>{search || status !== 'All statuses' ? 'No matching applications' : 'Your next opportunity starts here'}</h3><p>{search || status !== 'All statuses' ? 'Try changing your search or filter.' : 'Add a role you applied for and keep the details organized.'}</p>{!search && status === 'All statuses' && <button className="button button-primary" onClick={() => setModal({ ...EMPTY_FORM })}><Plus size={16} /> Add your first application</button>}</div> : <div className="table-wrap"><table><thead><tr><th>COMPANY & ROLE</th><th>LOCATION</th><th>APPLIED DATE</th><th>STATUS</th><th>DETAILS</th><th></th></tr></thead><tbody>{applications.map((item) => <tr key={item.id}><td><div className="company-cell"><div className="company-logo">{initials(item.company)}</div><div className="company-info"><strong>{item.company}</strong><span>{item.role}</span></div></div></td><td><span className="location-cell"><MapPin size={14} />{item.location || '—'}</span></td><td><span className="date-cell"><CalendarDays size={14} />{formatDate(item.applied_date)}</span></td><td><StatusPill status={item.status} /></td><td>{item.job_url ? <a className="detail-link" href={item.job_url} target="_blank" rel="noreferrer">Job post <ExternalLink size={13} /></a> : item.salary_range || (item.interview_date ? `Interview: ${formatDate(item.interview_date)}` : '—')}</td><td><div className="row-actions"><button className="icon-button" title="Edit application" onClick={() => setModal({ ...item, applied_date: String(item.applied_date || '').slice(0, 10), interview_date: String(item.interview_date || '').slice(0, 10) })}><MoreHorizontal size={18} /></button><button className="icon-button delete-action" title="Delete application" onClick={() => deleteApplication(item)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}
            <div className="table-footer"><span>Showing <strong>{applications.length}</strong> {applications.length === 1 ? 'application' : 'applications'}{search || status !== 'All statuses' ? ' matching your filters' : ''}</span><span className="footer-live"><span /> Connected to your workspace</span></div>
          </section>
          <footer className="page-footer"><span>© {new Date().getFullYear()} JobTrack</span><span>Built to keep your next move in focus.</span></footer>
        </div>
      </main>

      {modal && <ApplicationModal initial={modal.id ? modal : null} onClose={() => setModal(null)} onSave={saveApplication} saving={saving} />}
    </div>
  );
}
