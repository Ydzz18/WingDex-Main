import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import {
  Activity,
  Archive,
  ArrowUpRight,
  Award,
  Bird,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Feather,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

type Section = 'overview' | 'users' | 'collections' | 'badges' | 'ranks' | 'announcements';
type DataRow = Record<string, unknown>;
type PageResult = { rows: DataRow[]; total: number };
type Overview = {
  totalUsers: number;
  totalObservations: number;
  savedSpecies: number;
  activeBadges: number;
  publishedRanks: number;
  publishedAnnouncements: number;
  recentUsers: DataRow[];
  recentActivity: DataRow[];
};
type AnnouncementStatus = 'draft' | 'published' | 'archived';
type ContentDraft = {
  title: string;
  description: string;
  body: string;
  rule_type: 'unique_species' | 'observations' | 'saved_species';
  threshold: number;
  is_active: boolean;
  is_published: boolean;
  status: AnnouncementStatus;
  audience: 'all';
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const apiBaseUrl = (import.meta.env.VITE_ADMIN_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const supabase: SupabaseClient | null = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  : null;

const sectionMeta: Record<Section, { title: string; subtitle: string; icon: typeof LayoutDashboard }> = {
  overview: { title: 'The field desk', subtitle: 'A clear view of Wingdex, at a glance.', icon: LayoutDashboard },
  users: { title: 'People in the field', subtitle: 'Account details and activity, for support context only.', icon: Users },
  collections: { title: 'Field records', subtitle: 'Saved species and observations across the community.', icon: BookOpen },
  badges: { title: 'Badges', subtitle: 'Shape the small rewards that mark a birder’s progress.', icon: Award },
  ranks: { title: 'Ranks', subtitle: 'Set the published thresholds for a growing life list.', icon: Feather },
  announcements: { title: 'Announcements', subtitle: 'Write once, then publish to every Wingdex birder.', icon: Megaphone },
};

const emptyDraft = (): ContentDraft => ({
  title: '',
  description: '',
  body: '',
  rule_type: 'unique_species',
  threshold: 1,
  is_active: true,
  is_published: true,
  status: 'draft',
  audience: 'all',
});

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function adminRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('The Wingdex backend could not be reached. Check the API URL and server status.', 0);
  }
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    throw new ApiError(payload.error ?? 'The request could not be completed.', response.status);
  }
  return payload as T;
}

function readText(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function readCount(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusOf(row: DataRow, section: Section) {
  if (section === 'badges') return row.is_active ? 'Active' : 'Inactive';
  if (section === 'ranks') return row.is_published ? 'Published' : 'Draft';
  return readText(row.status, 'Draft');
}

function statusTone(value: string) {
  return value === 'Published' || value === 'Active'
    ? 'status status--green'
    : value === 'Archived' || value === 'Inactive'
      ? 'status status--quiet'
      : 'status status--amber';
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pageData, setPageData] = useState<PageResult>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<DataRow | null>(null);
  const [editing, setEditing] = useState<DataRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<ContentDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const requestGeneration = useRef(0);

  const invalidateAdminView = (error: unknown) => {
    if (!(error instanceof ApiError) || ![401, 403, 503].includes(error.status)) return;
    setAuthorized(false);
    setVerificationError(error.message);
    setOverview(null);
    setPageData({ rows: [], total: 0 });
    setSelectedUser(null);
    setEditorOpen(false);
    requestGeneration.current += 1;
  };

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setVerificationError('Could not restore your sign-in. Please sign in again.');
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setVerificationError('');
      setAuthorized(false);
      setOverview(null);
      setPageData({ rows: [], total: 0 });
      setSelectedUser(null);
      setEditorOpen(false);
      requestGeneration.current += 1;
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const accessToken = session?.access_token;
  useEffect(() => {
    if (!accessToken) {
      setAuthorized(false);
      setOverview(null);
      return;
    }
    let active = true;
    setVerificationError('');
    adminRequest<Overview>('/admin/overview', accessToken)
      .then((data) => {
        if (!active) return;
        setOverview(data);
        setAuthorized(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAuthorized(false);
        setVerificationError(error instanceof Error ? error.message : 'Admin access could not be verified.');
      });
    return () => { active = false; };
  }, [accessToken]);

  const loadSection = useCallback(async () => {
    if (!authorized || !accessToken) return;
    const requestId = ++requestGeneration.current;
    setLoading(true);
    setLoadError('');
    try {
      if (activeSection === 'overview') {
        const result = await adminRequest<Overview>('/admin/overview', accessToken);
        if (requestId === requestGeneration.current) setOverview(result);
      } else {
        const query = new URLSearchParams({
          page: String(page),
          pageSize: '20',
          search,
        });
        const data = await adminRequest<PageResult>(
          `/admin/${activeSection}?${query.toString()}`,
          accessToken,
        );
        if (requestId === requestGeneration.current) setPageData(data);
      }
    } catch (error) {
      if (requestId !== requestGeneration.current) return;
      setLoadError(error instanceof Error ? error.message : 'Could not load this section.');
      invalidateAdminView(error);
    } finally {
      if (requestId === requestGeneration.current) setLoading(false);
    }
  }, [accessToken, activeSection, authorized, page, search]);

  useEffect(() => {
    void loadSection();
  }, [loadSection]);

  const signOut = async () => {
    requestGeneration.current += 1;
    await supabase?.auth.signOut();
    setSession(null);
    setAuthorized(false);
    setVerificationError('');
    setOverview(null);
    setPageData({ rows: [], total: 0 });
    setSelectedUser(null);
    setEditorOpen(false);
  };

  const chooseSection = (section: Section) => {
    setActiveSection(section);
    setMobileNavOpen(false);
    setSearch('');
    setSearchInput('');
    setPage(1);
    setSelectedUser(null);
    setEditing(null);
    setEditorOpen(false);
  };

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openNewContent = () => {
    setEditing(null);
    setEditorOpen(true);
    setDraft(emptyDraft());
    setFormError('');
  };

  const openEditContent = (row: DataRow) => {
    setEditing(row);
    setEditorOpen(true);
    setDraft({
      ...emptyDraft(),
      title: readText(row.title, ''),
      description: readText(row.description, ''),
      body: readText(row.body, ''),
      rule_type: row.rule_type === 'observations' || row.rule_type === 'saved_species'
        ? row.rule_type
        : 'unique_species',
      threshold: readCount(row.threshold) || 1,
      is_active: Boolean(row.is_active),
      is_published: Boolean(row.is_published),
      status: row.status === 'published' || row.status === 'archived' ? row.status : 'draft',
      audience: 'all',
    });
    setFormError('');
  };

  const saveContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !['badges', 'ranks', 'announcements'].includes(activeSection)) return;
    setSaving(true);
    setFormError('');
    const payload = activeSection === 'badges'
      ? { title: draft.title, description: draft.description, rule_type: draft.rule_type, threshold: Number(draft.threshold), is_active: draft.is_active }
      : activeSection === 'ranks'
        ? { title: draft.title, threshold: Number(draft.threshold), is_published: draft.is_published }
        : { title: draft.title, body: draft.body, status: draft.status, audience: 'all' };
    try {
      await adminRequest(
        editing ? `/admin/${activeSection}/${editing.id}` : `/admin/${activeSection}`,
        accessToken,
        { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
      );
      setEditing(null);
      setEditorOpen(false);
      await loadSection();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Content could not be saved.');
      invalidateAdminView(error);
    } finally {
      setSaving(false);
    }
  };

  const deleteContent = async (row: DataRow) => {
    if (!accessToken || !window.confirm(`Permanently delete “${readText(row.title)}”?`)) return;
    try {
      await adminRequest(`/admin/${activeSection}/${row.id}`, accessToken, { method: 'DELETE' });
      if (editing?.id === row.id) setEditing(null);
      await loadSection();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Content could not be deleted.');
      invalidateAdminView(error);
    }
  };

  const setAnnouncementStatus = async (row: DataRow, status: 'draft' | 'published' | 'archived') => {
    if (!accessToken) return;
    try {
      await adminRequest(`/admin/announcements/${row.id}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadSection();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Announcement status could not be updated.');
      invalidateAdminView(error);
    }
  };

  if (!authReady) {
    return <QuietScreen label="Restoring your secure sign-in…" />;
  }
  if (!session) {
    return <SignInScreen
      configured={Boolean(supabase)}
      error={verificationError}
      onSignedIn={setSession}
    />;
  }
  if (!authorized) {
    return (
      <QuietScreen
        label={verificationError ? 'Admin access could not be verified.' : 'Checking your Wingdex admin access…'}
        error={verificationError}
        onSignOut={signOut}
      />
    );
  }

  const activeMeta = sectionMeta[activeSection];
  const ActiveIcon = activeMeta.icon;

  return (
    <div className="portal">
      {mobileNavOpen && <button className="nav-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><Bird size={20} strokeWidth={1.8} /></div>
          <div><strong>Wingdex</strong><span>FIELD OPERATIONS</span></div>
          <button className="nav-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Admin sections">
          {(Object.keys(sectionMeta) as Section[]).map((section) => {
            const MetaIcon = sectionMeta[section].icon;
            return (
              <button
                key={section}
                className={`nav-item ${activeSection === section ? 'nav-item--active' : ''}`}
                onClick={() => chooseSection(section)}
                aria-current={activeSection === section ? 'page' : undefined}
              >
                <MetaIcon size={18} strokeWidth={1.8} />
                <span>{section === 'overview' ? 'Overview' : section[0].toUpperCase() + section.slice(1)}</span>
                {section === 'announcements' && (overview?.publishedAnnouncements ?? 0) > 0 && (
                  <span className="nav-count">{overview?.publishedAnnouncements}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note"><Feather size={17} /><span>Every field note helps the next birder find their way.</span></div>
          <div className="admin-identity">
            <div className="identity-avatar">{(session.user.email?.[0] ?? 'A').toUpperCase()}</div>
            <div className="identity-copy"><strong>Administrator</strong><span>{session.user.email}</span></div>
            <button className="icon-button signout-button" onClick={() => void signOut()} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="crumbs"><span>Wingdex</span><ChevronRight size={14} /><strong>{activeMeta.title}</strong></div>
          <div className="topbar-right">
            <span className="secure-label"><ShieldCheck size={15} /> Verified admin session</span>
            <span className="topbar-date">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </header>

        <div className="workspace">
          <section className="page-heading">
            <div className="page-heading-icon"><ActiveIcon size={19} strokeWidth={1.8} /></div>
            <div className="page-heading-copy">
              <div className="eyebrow">{activeSection === 'overview' ? 'THE WINGDEX FIELD DESK' : 'COMMUNITY OPERATIONS'}</div>
              <h1>{activeMeta.title}</h1>
              <p>{activeMeta.subtitle}</p>
            </div>
            <div className="heading-actions">
              {['badges', 'ranks', 'announcements'].includes(activeSection) && (
                <button className="button button--primary" onClick={openNewContent}><Plus size={16} />New {activeSection === 'announcements' ? 'announcement' : activeSection.slice(0, -1)}</button>
              )}
              <button className="icon-button refresh-button" onClick={() => void loadSection()} disabled={loading} aria-label="Refresh section"><Activity size={17} /></button>
            </div>
          </section>

          {loadError && <div className="notice notice--error"><CircleAlert size={18} />{loadError}<button onClick={() => void loadSection()}>Retry</button></div>}

          {activeSection === 'overview' && <OverviewSection data={overview} onNavigate={chooseSection} />}

          {activeSection !== 'overview' && (
            <section className="data-panel">
              <div className="panel-toolbar">
                <div><strong>{pageData.total.toLocaleString()}</strong><span> records</span></div>
                <form onSubmit={applySearch} className="search-form">
                  <Search size={16} />
                  <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={activeSection === 'users' ? 'Search name or email' : activeSection === 'collections' ? 'Search species or email' : 'Search by title'} aria-label={`Search ${activeSection}`} />
                  {searchInput && <button type="button" className="search-clear" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }} aria-label="Clear search"><X size={14} /></button>}
                  <button type="submit" className="search-submit">Search</button>
                </form>
              </div>
              {loading ? <TableLoading /> : pageData.rows.length === 0 ? <EmptyState section={activeSection} searching={Boolean(search)} /> : (
                <DataTable
                  section={activeSection}
                  rows={pageData.rows}
                  onSelectUser={setSelectedUser}
                  onEdit={openEditContent}
                  onDelete={(row) => void deleteContent(row)}
                  onSetAnnouncementStatus={(row, status) => void setAnnouncementStatus(row, status)}
                />
              )}
              <div className="panel-footer">
                <span>Page {page} of {Math.max(1, Math.ceil(pageData.total / 20))}</span>
                <div className="pagination">
                  <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page"><ChevronLeft size={17} /></button>
                  <button onClick={() => setPage((current) => Math.min(Math.ceil(pageData.total / 20) || 1, current + 1))} disabled={page >= Math.ceil(pageData.total / 20) || loading} aria-label="Next page"><ChevronRight size={17} /></button>
                </div>
              </div>
            </section>
          )}

          <footer className="page-footer"><span>Wingdex field operations</span><span>People and collections are view-only.</span></footer>
        </div>
      </main>

      {selectedUser && <UserDetail user={selectedUser} onClose={() => setSelectedUser(null)} />}
      {['badges', 'ranks', 'announcements'].includes(activeSection) && editorOpen && (
        <ContentEditor
          section={activeSection as 'badges' | 'ranks' | 'announcements'}
          draft={draft}
          editing={editing}
          saving={saving}
          error={formError}
          onChange={setDraft}
          onClose={() => { setEditing(null); setEditorOpen(false); setFormError(''); }}
          onSave={saveContent}
        />
      )}
    </div>
  );
}

function SignInScreen({
  configured,
  error,
  onSignedIn,
}: {
  configured: boolean;
  error: string;
  onSignedIn: (session: Session) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setPending(true);
    setMessage('');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (signInError || !data.session) {
      setMessage(signInError?.message ?? 'Could not start your session.');
      return;
    }
    onSignedIn(data.session);
  };

  const signInWithProvider = async (provider: 'google' | 'facebook') => {
    if (!supabase) return;
    setPending(true);
    setMessage('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      setPending(false);
      setMessage(oauthError.message);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-emblem"><Bird size={27} strokeWidth={1.7} /></div>
        <div className="eyebrow">WINGDEX FIELD OPERATIONS</div>
        <h1>Welcome back.</h1>
        <p className="auth-intro">Sign in with your Wingdex operator account. Access is confirmed by the server before any admin data is shown.</p>
        {!configured ? (
          <div className="notice notice--error"><CircleAlert size={18} />Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to admin/.env.local, then restart this portal.</div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {(message || error) && <div className="form-error" role="alert">{message || error}</div>}
            <button className="button button--primary auth-submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in securely'}<ArrowUpRight size={16} /></button>
          </form>
        )}
        {configured && (
          <>
            <div className="auth-separator"><span>or continue with</span></div>
            <div className="auth-providers">
              <button type="button" className="button button--outline" disabled={pending} onClick={() => void signInWithProvider('google')}>Google</button>
              <button type="button" className="button button--outline" disabled={pending} onClick={() => void signInWithProvider('facebook')}>Facebook</button>
            </div>
          </>
        )}
        <div className="auth-rule" />
        <p className="auth-footnote"><ShieldCheck size={15} />Only allowlisted accounts can use the operations console.</p>
      </section>
      <div className="auth-side-note">A quiet place to care for a growing field guide.</div>
    </main>
  );
}

function QuietScreen({ label, error, onSignOut }: { label: string; error?: string; onSignOut?: () => void }) {
  return (
    <main className="quiet-screen">
      <div className="auth-emblem"><Bird size={25} /></div>
      <div className="eyebrow">WINGDEX OPERATIONS</div>
      <h1>{label}</h1>
      {error && <p className="form-error" role="alert">{error}</p>}
      {onSignOut && <button className="button button--outline" onClick={onSignOut}><LogOut size={15} />Sign out</button>}
    </main>
  );
}

function OverviewSection({ data, onNavigate }: { data: Overview | null; onNavigate: (section: Section) => void }) {
  const metrics = [
    { label: 'Total members', value: data?.totalUsers, icon: Users, tone: 'sage', change: 'Across Wingdex' },
    { label: 'Field observations', value: data?.totalObservations, icon: Feather, tone: 'linen', change: 'Personal journals' },
    { label: 'Saved species', value: data?.savedSpecies, icon: BookOpen, tone: 'coral', change: 'Across collections' },
    { label: 'Active badges', value: data?.activeBadges, icon: Award, tone: 'sage', change: 'Live in the app' },
    { label: 'Published ranks', value: data?.publishedRanks, icon: Sparkles, tone: 'linen', change: 'Progress markers' },
    { label: 'Announcements', value: data?.publishedAnnouncements, icon: Megaphone, tone: 'coral', change: 'Visible to everyone' },
  ];
  return (
    <div className="overview">
      <section className="register-band" aria-label="Community field register">
        <div className="register-number"><span>FIELD REGISTER</span><strong>01</strong></div>
        <div className="register-description">
          <div className="eyebrow">COMMUNITY DAYBOOK</div>
          <strong>A shared record of birds, places, and the people who notice them.</strong>
        </div>
        <div className="register-latest">
          <span>LATEST FIELD NOTE</span>
          <strong>{readText(data?.recentActivity?.[0]?.common_name, 'Awaiting first observation')}</strong>
          <time>{formatDate(data?.recentActivity?.[0]?.identified_at)}</time>
        </div>
        <div className="register-marks" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      </section>
      <div className="metrics-grid">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className={`metric-card metric-card--${metric.tone}`} style={{ animationDelay: `${index * 55}ms` }}>
              <div className="metric-top"><span>{metric.label}</span><div className="metric-icon"><Icon size={17} /></div></div>
              <div className="metric-value">{data ? readCount(metric.value).toLocaleString() : '—'}</div>
              <div className="metric-foot"><span>{metric.change}</span><ArrowUpRight size={14} /></div>
            </article>
          );
        })}
      </div>
      <div className="overview-grid">
        <section className="list-panel">
          <div className="section-panel-heading"><div><div className="eyebrow">RECENTLY JOINED</div><h2>New to the trail</h2></div><button className="text-button" onClick={() => onNavigate('users')}>All members <ChevronRight size={15} /></button></div>
          {!data?.recentUsers?.length ? <div className="subtle-empty">No member records yet.</div> : (
            <div className="recent-list">
              {data.recentUsers.map((user) => (
                <div className="recent-row" key={String(user.id)}>
                  <div className="recent-avatar">{readText(user.display_name, readText(user.email, 'B')).slice(0, 1).toUpperCase()}</div>
                  <div className="recent-person"><strong>{readText(user.display_name, 'Field birder')}</strong><span>{readText(user.email)}</span></div>
                  <time>{formatDate(user.created_at)}</time>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="list-panel activity-panel">
          <div className="section-panel-heading"><div><div className="eyebrow">LATEST SIGHTINGS</div><h2>From the field</h2></div><button className="text-button" onClick={() => onNavigate('collections')}>Browse records <ChevronRight size={15} /></button></div>
          {!data?.recentActivity?.length ? <div className="subtle-empty">No observations have been recorded yet.</div> : (
            <div className="recent-list">
              {data.recentActivity.map((activity, index) => (
                <div className="activity-row" key={`${String(activity.identified_at)}-${index}`}>
                  <div className="activity-mark"><Bird size={16} /></div>
                  <div className="activity-copy"><strong>{readText(activity.common_name, 'Unidentified field note')}</strong><span>{readText(activity.email, 'Wingdex member')}</span></div>
                  <time>{formatDate(activity.identified_at)}</time>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="overview-note"><div className="note-mark"><ShieldCheck size={17} /></div><div><strong>Quietly keeping the field guide in good shape</strong><span>User and collection records are read-only here. App content is managed separately and published updates appear in the mobile experience.</span></div></div>
    </div>
  );
}

function DataTable({
  section,
  rows,
  onSelectUser,
  onEdit,
  onDelete,
  onSetAnnouncementStatus,
}: {
  section: Section;
  rows: DataRow[];
  onSelectUser: (row: DataRow) => void;
  onEdit: (row: DataRow) => void;
  onDelete: (row: DataRow) => void;
  onSetAnnouncementStatus: (row: DataRow, status: 'draft' | 'published' | 'archived') => void;
}) {
  if (section === 'users') {
    return (
      <div className="table-scroll"><table><thead><tr><th>Member</th><th>Joined</th><th>Observations</th><th>Saved species</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>
        {rows.map((row) => (
          <tr key={String(row.id)} className="clickable-row" onClick={() => onSelectUser(row)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') onSelectUser(row); }}>
            <td><div className="table-person"><div className="recent-avatar">{readText(row.display_name, readText(row.email, 'B')).slice(0, 1).toUpperCase()}</div><div><strong>{readText(row.display_name, 'Field birder')}</strong><span>{readText(row.email)}</span></div></div></td>
            <td>{formatDate(row.created_at)}</td><td>{readCount(row.observation_count).toLocaleString()}</td><td>{readCount(row.saved_species_count).toLocaleString()}</td><td><ChevronRight size={16} className="row-chevron" /></td>
          </tr>
        ))}
      </tbody></table></div>
    );
  }
  if (section === 'collections') {
    return (
      <div className="table-scroll"><table><thead><tr><th>Record</th><th>Member</th><th>Location</th><th>Date</th></tr></thead><tbody>
        {rows.map((row) => {
          const location = typeof row.latitude === 'number' && typeof row.longitude === 'number'
            ? `${row.latitude.toFixed(3)}, ${row.longitude.toFixed(3)}`
            : 'Location not shared';
          return <tr key={String(row.id)}><td><div className="record-name"><span className={`record-kind ${row.kind === 'observation' ? 'record-kind--bird' : ''}`}>{row.kind === 'observation' ? <Bird size={14} /> : <BookOpen size={13} />}</span><div><strong>{readText(row.species, 'Unknown species')}</strong><span>{row.kind === 'observation' ? readText(row.scientific_name, 'Observation') : 'Saved species'}</span></div></div></td><td>{readText(row.email, 'Wingdex member')}</td><td>{location}</td><td>{formatDate(row.happened_at)}</td></tr>;
        })}
      </tbody></table></div>
    );
  }
  return (
    <div className="table-scroll"><table><thead><tr><th>Name</th>{section === 'badges' && <th>Rule</th>}<th>Threshold</th><th>Status</th><th>Updated</th><th className="action-head">Actions</th></tr></thead><tbody>
      {rows.map((row) => {
        const status = statusOf(row, section);
        return <tr key={String(row.id)}>
          <td><div className="content-name"><strong>{readText(row.title)}</strong><span>{readText(section === 'badges' ? row.description : section === 'announcements' ? row.body : 'Published life-list milestone', '')}</span></div></td>
          {section === 'badges' && <td><span className="rule-label">{readText(row.rule_type).replaceAll('_', ' ')}</span></td>}
          {section !== 'announcements' && <td>{readCount(row.threshold).toLocaleString()}</td>}
          {section === 'announcements' && <td>{readText(row.audience, 'all users')}</td>}
          <td><span className={statusTone(status)}><span />{status}</span></td>
          <td>{formatDate(row.updated_at)}</td>
          <td>
            <div className="row-actions">
              <button onClick={() => onEdit(row)} className="text-button" aria-label={`Edit ${readText(row.title)}`}>Edit</button>
              {section === 'announcements' ? (
                row.status === 'archived' ? (
                  <span className="archived-label">Archived</span>
                ) : (
                  <>
                    <button
                      onClick={() => onSetAnnouncementStatus(row, row.status === 'published' ? 'draft' : 'published')}
                      className="text-button announcement-toggle"
                      aria-label={`${row.status === 'published' ? 'Unpublish' : 'Publish'} ${readText(row.title)}`}
                    >
                      {row.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => onSetAnnouncementStatus(row, 'archived')}
                      className="archive-button"
                      aria-label={`Archive ${readText(row.title)}`}
                      title="Archive announcement"
                    >
                      <Archive size={15} /><span>Archive</span>
                    </button>
                  </>
                )
              ) : (
                <button onClick={() => onDelete(row)} className="delete-button" aria-label={`Delete ${readText(row.title)}`} title="Permanently delete">
                  <span>Delete</span><X size={14} />
                </button>
              )}
            </div>
          </td>
        </tr>;
      })}
    </tbody></table></div>
  );
}

function ContentEditor({
  section,
  draft,
  editing,
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: {
  section: 'badges' | 'ranks' | 'announcements';
  draft: ContentDraft;
  editing: DataRow | null;
  saving: boolean;
  error: string;
  onChange: (draft: ContentDraft) => void;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const title = section === 'badges' ? 'badge' : section === 'ranks' ? 'rank' : 'announcement';
  const change = <K extends keyof ContentDraft,>(key: K, value: ContentDraft[K]) => onChange({ ...draft, [key]: value });
  return (
    <div className="editor-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="editor-panel" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="editor-header"><div><div className="eyebrow">{editing ? 'REFINE APP CONTENT' : 'ADD TO THE FIELD GUIDE'}</div><h2 id="editor-title">{editing ? 'Edit' : 'Create'} {title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close editor"><X size={18} /></button></div>
        <form className="editor-form" onSubmit={onSave}>
          <label>Title<input maxLength={section === 'announcements' ? 120 : 80} required value={draft.title} onChange={(event) => change('title', event.target.value)} placeholder={section === 'announcements' ? 'e.g. A new season in the field' : 'e.g. First feather'} /></label>
          {section === 'badges' && (
            <>
              <label>Description<textarea required maxLength={240} rows={3} value={draft.description} onChange={(event) => change('description', event.target.value)} placeholder="Tell birders what this badge celebrates." /></label>
              <label>Progress rule<select value={draft.rule_type} onChange={(event) => change('rule_type', event.target.value as ContentDraft['rule_type'])}><option value="unique_species">Unique identified species</option><option value="observations">Field observations</option><option value="saved_species">Saved species</option></select></label>
              <label>Threshold<input type="number" min={1} max={1000000} required value={draft.threshold} onChange={(event) => change('threshold', Number(event.target.value))} /></label>
              <label className="toggle-field"><span>Active in the app</span><input type="checkbox" checked={draft.is_active} onChange={(event) => change('is_active', event.target.checked)} /></label>
            </>
          )}
          {section === 'ranks' && (
            <>
              <label>Unique identified species required<input type="number" min={1} max={1000000} required value={draft.threshold} onChange={(event) => change('threshold', Number(event.target.value))} /></label>
              <label className="toggle-field"><span>Publish this rank in the app</span><input type="checkbox" checked={draft.is_published} onChange={(event) => change('is_published', event.target.checked)} /></label>
              <p className="field-hint">Thresholds must be unique. Ranks appear in ascending order in the mobile app.</p>
            </>
          )}
          {section === 'announcements' && (
            <>
              <label>Message<textarea required maxLength={4000} rows={7} value={draft.body} onChange={(event) => change('body', event.target.value)} placeholder="Write a short update for the Wingdex community." /></label>
              <label>Audience<select value="all" disabled><option value="all">Everyone</option></select></label>
              <label>Publication state<select value={draft.status} onChange={(event) => change('status', event.target.value as AnnouncementStatus)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
              <p className="field-hint">Only published announcements are visible in Notifications and the Explore preview.</p>
            </>
          )}
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="editor-actions"><button type="button" className="button button--outline" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : `Create ${title}`}<Check size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}

function UserDetail({ user, onClose }: { user: DataRow; onClose: () => void }) {
  return (
    <div className="editor-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="editor-panel detail-panel" role="dialog" aria-modal="true" aria-labelledby="user-detail-title">
        <div className="editor-header"><div><div className="eyebrow">READ-ONLY MEMBER SUMMARY</div><h2 id="user-detail-title">A birder’s record</h2></div><button className="icon-button" onClick={onClose} aria-label="Close member summary"><X size={18} /></button></div>
        <div className="user-detail-hero"><div className="detail-avatar">{readText(user.display_name, readText(user.email, 'B')).slice(0, 1).toUpperCase()}</div><div><strong>{readText(user.display_name, 'Field birder')}</strong><span>{readText(user.email)}</span></div></div>
        <dl className="detail-list">
          <div><dt>Member ID</dt><dd>{readText(user.id)}</dd></div>
          <div><dt>Joined</dt><dd>{formatDate(user.created_at)}</dd></div>
          <div><dt>Observations</dt><dd>{readCount(user.observation_count).toLocaleString()}</dd></div>
          <div><dt>Saved species</dt><dd>{readCount(user.saved_species_count).toLocaleString()}</dd></div>
        </dl>
        <div className="readonly-note"><ShieldCheck size={17} /><span>Member data is view-only in this MVP. Account changes and moderation actions are intentionally unavailable.</span></div>
        <button className="button button--outline detail-close" onClick={onClose}>Close summary</button>
      </section>
    </div>
  );
}

function TableLoading() {
  return <div className="table-loading" role="status"><span className="spinner" />Gathering field notes…</div>;
}

function EmptyState({ section, searching }: { section: Section; searching: boolean }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{searching ? <Search size={21} /> : <Feather size={21} />}</div>
      <strong>{searching ? 'No matching records' : `No ${section === 'users' ? 'members' : section === 'collections' ? 'field records' : section} yet`}</strong>
      <span>{searching ? 'Try another name, email or species.' : section === 'badges' || section === 'ranks' || section === 'announcements' ? 'Create a first entry to give the app something new to share.' : 'Records will appear here as the Wingdex community grows.'}</span>
    </div>
  );
}
