import { type ChangeEvent, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  Image as ImageIcon,
  LogOut,
  RefreshCw,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react';

import { isSupabaseConfigured, supabaseClient, type Member, type Project, type Publication } from '../lib/supabase';
import { uploadMemberPhoto, uploadMemberCV, uploadLabPhoto, deleteStorageFile } from '../lib/storage';
import type { SoftwareItem, LabPhoto, DissertationItem, ResourceItem } from '../lib/siteContent';
import { RichTextEditor } from '../components/RichTextEditor';
import {
  defaultSiteContent,
  normalizeSiteContent,
  type SiteContent,
  type SiteContentItem,
} from '../lib/siteContent';

type StatusMessage = {
  type: 'success' | 'error';
  message: string;
};

type AdminContent = {
  siteContent: SiteContent;
  members: Member[];
  projects: Project[];
  publications: Publication[];
};

type ContentBackup = {
  id: string;
  created_at: string;
  label: string | null;
  content: AdminContent;
};

const MAX_HISTORY = 20;
const SECTION_NAV = [
  { id: 'admin-goal',          label: 'Our Goal' },
  { id: 'admin-members',       label: 'Members + Photos' },
  { id: 'admin-projects',      label: 'Projects + Software' },
  { id: 'admin-publications',  label: 'Papers + Dissertations' },
  { id: 'admin-teaching',      label: 'Teaching' },
  { id: 'admin-contact',       label: 'Contact' },
] as const;

const CLONE = <T,>(data: T): T => JSON.parse(JSON.stringify(data));

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toNumberOrNull = (value: string) => (value.trim() ? Number(value) : null);

const normalizeMember = (member: Member) => ({
  ...member,
  cv_link: member.cv_link?.trim() || null,
  photo_url: member.photo_url?.trim() || null,
  photo_storage_path: member.photo_storage_path ?? null,
  cv_storage_path: member.cv_storage_path ?? null,
  display_order: Number.isFinite(member.display_order) ? member.display_order : 0,
});

const normalizeProject = (project: Project) => ({
  ...project,
  start_year: project.start_year ?? null,
  end_year: project.end_year ?? null,
  display_order: Number.isFinite(project.display_order) ? project.display_order : 0,
});

const normalizePublication = (publication: Publication) => ({
  ...publication,
  doi: publication.doi?.trim() || null,
  link: publication.link?.trim() || null,
  year: Number.isFinite(publication.year) ? publication.year : new Date().getFullYear(),
});

const emptyMember = (order: number): Member => ({
  id: createId(),
  name: '',
  role: '',
  description: '',
  photo_url: null,
  photo_storage_path: null,
  is_current: true,
  cv_link: null,
  cv_storage_path: null,
  display_order: order,
});

const emptyProject = (order: number): Project => ({
  id: createId(),
  title: '',
  description: '',
  status: 'active',
  start_year: null,
  end_year: null,
  display_order: order,
});

const emptyPublication = (): Publication => ({
  id: createId(),
  title: '',
  authors: '',
  journal: '',
  year: new Date().getFullYear(),
  doi: null,
  link: null,
});

const emptySiteItem = (): SiteContentItem => ({
  title: '',
  description: '',
});

const emptySoftwareItem = (): SoftwareItem => ({
  id: createId(),
  title: '',
  description: '',
  link: '',
});

const emptyDissertation = (): DissertationItem => ({
  id: createId(),
  student: '',
  title: '',
  year: String(new Date().getFullYear()),
  type: 'phd',
  link: '',
});

const emptyResource = (): ResourceItem => ({
  id: createId(),
  title: '',
  description: '',
  link: '',
});

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [workingContent, setWorkingContent] = useState<AdminContent | null>(null);
  const [syncedContent, setSyncedContent] = useState<AdminContent | null>(null);
  const [undoStack, setUndoStack] = useState<AdminContent[]>([]);
  const [activeSection, setActiveSection] = useState<string>(SECTION_NAV[0].id);
  const [deletedMemberIds, setDeletedMemberIds] = useState<string[]>([]);
  const [deletedProjectIds, setDeletedProjectIds] = useState<string[]>([]);
  const [deletedPublicationIds, setDeletedPublicationIds] = useState<string[]>([]);
  const [showBackups, setShowBackups] = useState(false);
  const [backups, setBackups] = useState<ContentBackup[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Set<string>>(new Set());

  const hasClient = Boolean(supabaseClient);
  const isDirty = useMemo(() => {
    if (!workingContent || !syncedContent) return false;
    return JSON.stringify(workingContent) !== JSON.stringify(syncedContent);
  }, [workingContent, syncedContent]);

  useEffect(() => {
    if (!supabaseClient) { setAuthLoading(false); return; }
    supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthLoading(false);
    });
    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession ?? null);
    });
    return () => { subscription.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) return;
    const fetchContent = async () => {
      if (!supabaseClient) return;
      setDataLoading(true);
      setStatusMessage(null);
      const [membersResult, projectsResult, publicationsResult, siteContentResult] = await Promise.all([
        supabaseClient.from('members').select('*').order('display_order'),
        supabaseClient.from('projects').select('*').order('display_order'),
        supabaseClient.from('publications').select('*').order('year', { ascending: false }),
        supabaseClient.from('site_content').select('*').order('id'),
      ]);
      if (membersResult.error || projectsResult.error || publicationsResult.error || siteContentResult.error) {
        setStatusMessage({ type: 'error', message: 'Failed to load content from Supabase.' });
        setDataLoading(false);
        return;
      }
      const nextContent: AdminContent = {
        members: membersResult.data ?? [],
        projects: projectsResult.data ?? [],
        publications: publicationsResult.data ?? [],
        siteContent: normalizeSiteContent(siteContentResult.data?.[0] ?? null),
      };
      setSyncedContent(nextContent);
      setWorkingContent(CLONE(nextContent));
      setUndoStack([]);
      setDeletedMemberIds([]);
      setDeletedProjectIds([]);
      setDeletedPublicationIds([]);
      setDataLoading(false);
    };
    fetchContent();
  }, [session]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: '-160px 0px -60% 0px', threshold: [0.1, 0.4] },
    );
    SECTION_NAV.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => { observer.disconnect(); };
  }, [workingContent]);

  const applyUpdate = (mutator: (draft: AdminContent) => void) => {
    setWorkingContent((prev) => {
      if (!prev) return prev;
      const next = CLONE(prev);
      mutator(next);
      if (JSON.stringify(next) === JSON.stringify(prev)) return prev;
      setUndoStack((stack) => {
        const updated = [...stack, prev];
        return updated.length > MAX_HISTORY ? updated.slice(updated.length - MAX_HISTORY) : updated;
      });
      return next;
    });
  };

  const handleUndo = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const previous = stack[stack.length - 1];
      setWorkingContent(CLONE(previous));
      return stack.slice(0, -1);
    });
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabaseClient) return;
    setStatusMessage(null);
    const { error } = await supabaseClient.auth.signInWithPassword({ email: formEmail, password: formPassword });
    if (error) setStatusMessage({ type: 'error', message: error.message });
  };

  const handleSignOut = async () => {
    if (!supabaseClient) return;
    setStatusMessage(null);
    const { error } = await supabaseClient.auth.signOut();
    if (error) setStatusMessage({ type: 'error', message: error.message });
  };

  const handleSaveAll = async () => {
    if (!supabaseClient || !workingContent) return;
    setSaving(true);
    setStatusMessage(null);

    const preparedMembers = workingContent.members.map(normalizeMember);
    const preparedProjects = workingContent.projects.map(normalizeProject);
    const preparedPublications = workingContent.publications.map(normalizePublication);
    const preparedSiteContent = {
      ...workingContent.siteContent,
      id: workingContent.siteContent.id || defaultSiteContent.id,
    };

    const memberResult = await supabaseClient.from('members').upsert(preparedMembers, { onConflict: 'id' });
    if (!memberResult.error && deletedMemberIds.length > 0) {
      await supabaseClient.from('members').delete().in('id', deletedMemberIds);
    }
    const projectResult = await supabaseClient.from('projects').upsert(preparedProjects, { onConflict: 'id' });
    if (!projectResult.error && deletedProjectIds.length > 0) {
      await supabaseClient.from('projects').delete().in('id', deletedProjectIds);
    }
    const publicationResult = await supabaseClient.from('publications').upsert(preparedPublications, { onConflict: 'id' });
    if (!publicationResult.error && deletedPublicationIds.length > 0) {
      await supabaseClient.from('publications').delete().in('id', deletedPublicationIds);
    }
    const siteContentResult = await supabaseClient.from('site_content').upsert([preparedSiteContent], { onConflict: 'id' });

    if (memberResult.error || projectResult.error || publicationResult.error || siteContentResult.error) {
      setStatusMessage({ type: 'error', message: 'Saving failed. Check your Supabase policies and try again.' });
    } else {
      setSyncedContent(CLONE(workingContent));
      setUndoStack([]);
      setDeletedMemberIds([]);
      setDeletedProjectIds([]);
      setDeletedPublicationIds([]);
      setStatusMessage({ type: 'success', message: 'Changes saved successfully.' });
    }
    setSaving(false);
  };

  const handleForceSync = async () => {
    if (!supabaseClient || isSyncing) return;
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const [membersResult, projectsResult, publicationsResult, siteContentResult] = await Promise.all([
        supabaseClient.from('members').select('*').order('display_order'),
        supabaseClient.from('projects').select('*').order('display_order'),
        supabaseClient.from('publications').select('*').order('year', { ascending: false }),
        supabaseClient.from('site_content').select('*').order('id'),
      ]);
      if (membersResult.error || projectsResult.error || publicationsResult.error || siteContentResult.error) {
        throw new Error('Failed to sync content');
      }
      const nextContent: AdminContent = {
        members: membersResult.data ?? [],
        projects: projectsResult.data ?? [],
        publications: publicationsResult.data ?? [],
        siteContent: normalizeSiteContent(siteContentResult.data?.[0] ?? null),
      };
      setSyncedContent(nextContent);
      setWorkingContent(CLONE(nextContent));
      setUndoStack([]);
      setDeletedMemberIds([]);
      setDeletedProjectIds([]);
      setDeletedPublicationIds([]);
      setStatusMessage({ type: 'success', message: 'Synced from database.' });
    } catch (error) {
      setStatusMessage({ type: 'error', message: error instanceof Error ? error.message : 'Sync failed.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const openBackups = async () => {
    if (!supabaseClient) return;
    setShowBackups(true);
    setLoadingBackups(true);
    const { data, error } = await supabaseClient
      .from('content_backups')
      .select('id, created_at, label, content')
      .order('created_at', { ascending: false });
    if (!error && data) setBackups(data as ContentBackup[]);
    setLoadingBackups(false);
  };

  const handleCreateBackup = async () => {
    if (!supabaseClient || !workingContent || creatingBackup) return;
    setCreatingBackup(true);
    const label = `Manual backup · ${new Date().toLocaleString()}`;
    const { error } = await supabaseClient.from('content_backups').insert({ label, content: workingContent });
    if (error) {
      setStatusMessage({ type: 'error', message: 'Backup failed to save.' });
    } else {
      setStatusMessage({ type: 'success', message: 'Backup saved.' });
      await openBackups();
    }
    setCreatingBackup(false);
  };

  const handleRestoreBackup = async (backup: ContentBackup) => {
    setRestoringBackup(backup.id);
    setWorkingContent(CLONE(backup.content));
    setStatusMessage({ type: 'success', message: `Restored backup from ${formatTimestamp(backup.created_at)}.` });
    setRestoringBackup(null);
  };

  // --- Member upload handlers ---

  const setUploadKey = (key: string, active: boolean) => {
    setUploading((prev) => {
      const next = new Set(prev);
      active ? next.add(key) : next.delete(key);
      return next;
    });
  };

  const handleMemberPhotoUpload = async (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !workingContent) return;
    const member = workingContent.members[index];
    const key = `${member.id}-photo`;
    setUploadKey(key, true);
    try {
      const prevPath = member.photo_storage_path;
      const { publicUrl, storagePath } = await uploadMemberPhoto(member.name || member.id, file);
      applyUpdate((draft) => {
        draft.members[index].photo_url = publicUrl;
        draft.members[index].photo_storage_path = storagePath;
      });
      if (prevPath) void deleteStorageFile(prevPath);
    } catch (err) {
      setStatusMessage({ type: 'error', message: err instanceof Error ? err.message : 'Photo upload failed.' });
    } finally {
      setUploadKey(key, false);
      event.target.value = '';
    }
  };

  const handleMemberPhotoRemove = (index: number) => {
    if (!workingContent) return;
    const member = workingContent.members[index];
    if (member.photo_storage_path) void deleteStorageFile(member.photo_storage_path);
    applyUpdate((draft) => {
      draft.members[index].photo_url = null;
      draft.members[index].photo_storage_path = null;
    });
  };

  const handleMemberCVUpload = async (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !workingContent) return;
    const member = workingContent.members[index];
    const key = `${member.id}-cv`;
    setUploadKey(key, true);
    try {
      const prevPath = member.cv_storage_path;
      const { publicUrl, storagePath } = await uploadMemberCV(member.name || member.id, file);
      applyUpdate((draft) => {
        draft.members[index].cv_link = publicUrl;
        draft.members[index].cv_storage_path = storagePath;
      });
      if (prevPath) void deleteStorageFile(prevPath);
    } catch (err) {
      setStatusMessage({ type: 'error', message: err instanceof Error ? err.message : 'CV upload failed.' });
    } finally {
      setUploadKey(key, false);
      event.target.value = '';
    }
  };

  const handleMemberCVRemove = (index: number) => {
    if (!workingContent) return;
    const member = workingContent.members[index];
    if (member.cv_storage_path) void deleteStorageFile(member.cv_storage_path);
    applyUpdate((draft) => {
      draft.members[index].cv_link = null;
      draft.members[index].cv_storage_path = null;
    });
  };

  const handleLabPhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !workingContent) return;
    const key = `lab-photo-${Date.now()}`;
    setUploadKey(key, true);
    try {
      const { publicUrl, storagePath } = await uploadLabPhoto(key, file);
      const newPhoto: LabPhoto = {
        id: createId(),
        imageUrl: publicUrl,
        storagePath,
        caption: '',
        alt: file.name,
      };
      applyUpdate((d) => { d.siteContent.lab_photos.push(newPhoto); });
    } catch (err) {
      setStatusMessage({ type: 'error', message: err instanceof Error ? err.message : 'Photo upload failed.' });
    } finally {
      setUploadKey(key, false);
      event.target.value = '';
    }
  };

  const handleLabPhotoRemove = (photoId: string) => {
    if (!workingContent) return;
    const photo = workingContent.siteContent.lab_photos.find((p) => p.id === photoId);
    if (photo?.storagePath) void deleteStorageFile(photo.storagePath);
    applyUpdate((d) => { d.siteContent.lab_photos = d.siteContent.lab_photos.filter((p) => p.id !== photoId); });
  };

  const handleMoveMember = (index: number, direction: 'up' | 'down') => {
    applyUpdate((draft) => {
      const members = draft.members;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= members.length) return;
      [members[index], members[newIndex]] = [members[newIndex], members[index]];
    });
  };

  // --- Not configured / loading / auth screens ---

  if (!isSupabaseConfigured || !hasClient) {
    return (
      <div className="admin-page admin-auth">
        <div className="admin-card admin-empty">
          <h1>Admin Panel</h1>
          <p>Add your Supabase URL and anon key to use the admin dashboard.</p>
          <code>VITE_SUPABASE_URL</code>
          <code>VITE_SUPABASE_ANON_KEY</code>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="admin-page admin-auth">
        <div className="admin-card admin-empty">Loading admin session…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="admin-page admin-auth">
        <form className="admin-card admin-auth-card" onSubmit={handleSignIn}>
          <h1>Admin Sign In</h1>
          <p>Use your Supabase credentials to access EvoLab content.</p>
          <label className="admin-label" htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            className="admin-input"
            type="email"
            autoComplete="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            required
          />
          <label className="admin-label" htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            className="admin-input"
            type="password"
            autoComplete="current-password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            required
          />
          <button className="admin-button admin-button--primary" type="submit">Sign In</button>
          {statusMessage && <p className={`admin-note ${statusMessage.type}`}>{statusMessage.message}</p>}
        </form>
      </div>
    );
  }

  if (!workingContent) {
    return (
      <div className="admin-page admin-auth">
        <div className="admin-card admin-empty">Loading content…</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-shell">
        {/* ── Sidebar ── */}
        <aside className="admin-sidebar">
          <div>
            <p className="admin-kicker">EvoLab</p>
            <h1>Admin Panel</h1>
            <p className="admin-subtle" style={{ fontSize: '0.78rem' }}>{session.user.email}</p>
          </div>

          <nav className="admin-nav">
            {SECTION_NAV.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? 'is-active' : undefined}
                onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className="admin-sidebar-actions">
            <button
              className="admin-button admin-button--outline admin-button--full"
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </button>
            <button
              className="admin-button admin-button--blue admin-button--full"
              type="button"
              onClick={handleForceSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing…' : 'Sync DB'}
            </button>
            <button
              className="admin-button admin-button--purple admin-button--full"
              type="button"
              onClick={openBackups}
            >
              <History className="h-4 w-4" />
              Backups
            </button>
            <button
              className={`admin-button admin-button--full ${isDirty ? 'admin-button--primary' : 'admin-button--ghost'}`}
              type="button"
              onClick={handleSaveAll}
              disabled={saving || !isDirty}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              className="admin-button admin-button--ghost admin-button--full"
              type="button"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>

          <p className="admin-subtle" style={{ fontSize: '0.72rem', marginTop: 'auto' }}>
            {isDirty ? 'Unsaved changes' : 'All saved'} · {dataLoading ? 'Loading…' : 'Ready'}
          </p>
        </aside>

        {/* ── Main content ── */}
        <main className="admin-main admin-content-scroll">
        {statusMessage && <p className={`admin-note ${statusMessage.type}`}>{statusMessage.message}</p>}

        {/* ── Our Goal ── */}
        <section id="admin-goal" className="admin-section">
          <div className="admin-section-header">
            <div>
              <h3>Our Goal</h3>
              <p className="admin-subtle">Intro text and focus cards shown in the first section.</p>
            </div>
          </div>
          <div className="admin-grid">
            <div className="admin-card">
              <RichTextEditor
                label="Intro paragraph 1"
                value={workingContent.siteContent.goal_intro_primary}
                onChange={(v) => applyUpdate((d) => { d.siteContent.goal_intro_primary = v; })}
              />
              <RichTextEditor
                label="Intro paragraph 2"
                value={workingContent.siteContent.goal_intro_secondary}
                onChange={(v) => applyUpdate((d) => { d.siteContent.goal_intro_secondary = v; })}
              />
              <div className="admin-inline-header">
                <p className="admin-subtle">Focus cards</p>
                <button
                  className="admin-button admin-button--ghost"
                  type="button"
                  onClick={() => applyUpdate((d) => { d.siteContent.goal_focus_items.push(emptySiteItem()); })}
                >
                  Add card
                </button>
              </div>
              <div className="admin-item-grid">
                {workingContent.siteContent.goal_focus_items.map((item, index) => (
                  <div className="admin-item-card" key={`goal-focus-${index}`}>
                    <label className="admin-label">Title</label>
                    <input
                      className="admin-input"
                      value={item.title}
                      onChange={(e) => applyUpdate((d) => { d.siteContent.goal_focus_items[index].title = e.target.value; })}
                    />
                    <RichTextEditor
                      label="Description"
                      value={item.description}
                      onChange={(v) => applyUpdate((d) => { d.siteContent.goal_focus_items[index].description = v; })}
                    />
                    <button
                      className="admin-button admin-button--danger"
                      type="button"
                      onClick={() => applyUpdate((d) => {
                        d.siteContent.goal_focus_items = d.siteContent.goal_focus_items.filter((_, i) => i !== index);
                      })}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Members ── */}
        <section id="admin-members" className="admin-section">
          <div className="admin-section-header">
            <div>
              <h3>Members</h3>
              <p className="admin-subtle">Control order, bios, photos, and CVs for the team section.</p>
            </div>
            <button
              className="admin-button admin-button--ghost"
              type="button"
              onClick={() => applyUpdate((d) => { d.members.push(emptyMember(d.members.length + 1)); })}
            >
              Add member
            </button>
          </div>
          <div className="admin-card" style={{ marginBottom: 16 }}>
            <RichTextEditor
              label="Section lead text"
              value={workingContent.siteContent.members_lead}
              onChange={(v) => applyUpdate((d) => { d.siteContent.members_lead = v; })}
            />
          </div>
          <div className="admin-grid">
            {workingContent.members.map((member, index) => {
              const photoKey = `${member.id}-photo`;
              const cvKey = `${member.id}-cv`;
              const isFirst = index === 0;
              const isLast = index === workingContent.members.length - 1;
              return (
                <div className="admin-card" key={member.id}>
                  {/* Header row: photo + name/role + move/delete */}
                  <div className="admin-member-header">
                    {/* Photo */}
                    <div className="admin-member-photo-col">
                      {member.photo_url ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <img className="admin-photo-thumb" src={member.photo_url} alt={member.name} />
                          <button
                            className="admin-button admin-button--danger"
                            type="button"
                            style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                            onClick={() => handleMemberPhotoRemove(index)}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className={`admin-upload-btn admin-upload-btn--photo ${uploading.has(photoKey) ? 'is-loading' : ''}`}>
                          <ImageIcon className="h-5 w-5" />
                          <span>{uploading.has(photoKey) ? 'Uploading…' : 'Photo'}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={uploading.has(photoKey)}
                            onChange={(e) => void handleMemberPhotoUpload(index, e)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      )}
                    </div>

                    {/* Name / Role / Order / Current */}
                    <div style={{ flex: 1 }}>
                      <div className="admin-form-row">
                        <div>
                          <label className="admin-label">Name</label>
                          <input
                            className="admin-input"
                            value={member.name}
                            onChange={(e) => applyUpdate((d) => { d.members[index].name = e.target.value; })}
                          />
                        </div>
                        <div>
                          <label className="admin-label">Role</label>
                          <input
                            className="admin-input"
                            value={member.role}
                            onChange={(e) => applyUpdate((d) => { d.members[index].role = e.target.value; })}
                          />
                        </div>
                        <div>
                          <label className="admin-label">Order</label>
                          <input
                            className="admin-input"
                            type="number"
                            value={member.display_order}
                            onChange={(e) => applyUpdate((d) => { d.members[index].display_order = Number(e.target.value); })}
                          />
                        </div>
                        <div className="admin-toggle">
                          <label className="admin-label">Current member</label>
                          <label className="admin-checkbox-row">
                            <input
                              type="checkbox"
                              checked={member.is_current}
                              onChange={(e) => applyUpdate((d) => { d.members[index].is_current = e.target.checked; })}
                            />
                            <span>{member.is_current ? 'Yes' : 'No'}</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Move / Delete buttons */}
                    <div className="admin-member-actions-col">
                      <button
                        className="admin-icon-btn"
                        type="button"
                        disabled={isFirst}
                        onClick={() => handleMoveMember(index, 'up')}
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        className="admin-icon-btn"
                        type="button"
                        disabled={isLast}
                        onClick={() => handleMoveMember(index, 'down')}
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        className="admin-icon-btn admin-icon-btn--danger"
                        type="button"
                        onClick={() => {
                          if (!member.id.startsWith('tmp-')) setDeletedMemberIds((p) => [...new Set([...p, member.id])]);
                          if (member.photo_storage_path) void deleteStorageFile(member.photo_storage_path);
                          if (member.cv_storage_path) void deleteStorageFile(member.cv_storage_path);
                          applyUpdate((d) => { d.members = d.members.filter((_, i) => i !== index); });
                        }}
                        aria-label="Delete member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bio */}
                  <div style={{ marginTop: 10 }}>
                    <RichTextEditor
                      label="Bio"
                      value={member.description}
                      onChange={(v) => applyUpdate((d) => { d.members[index].description = v; })}
                    />
                  </div>

                  {/* CV upload */}
                  <div className="admin-upload-section">
                    <label className="admin-label">CV (PDF)</label>
                    {member.cv_link ? (
                      <div className="admin-file-tag">
                        <FileText className="h-4 w-4" />
                        <a href={member.cv_link} target="_blank" rel="noreferrer">View CV</a>
                        <button
                          className="admin-button admin-button--danger"
                          type="button"
                          style={{ padding: '3px 10px', fontSize: '0.72rem' }}
                          onClick={() => handleMemberCVRemove(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className={`admin-upload-btn ${uploading.has(cvKey) ? 'is-loading' : ''}`}>
                        <FileText className="h-4 w-4" />
                        {uploading.has(cvKey) ? 'Uploading…' : 'Upload CV'}
                        <input
                          type="file"
                          accept="application/pdf"
                          disabled={uploading.has(cvKey)}
                          onChange={(e) => void handleMemberCVUpload(index, e)}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Projects ── */}
        <section id="admin-projects" className="admin-section">
          <div className="admin-section-header">
            <div>
              <h3>Projects</h3>
              <p className="admin-subtle">Keep the project list and years up to date.</p>
            </div>
            <button
              className="admin-button admin-button--ghost"
              type="button"
              onClick={() => applyUpdate((d) => { d.projects.push(emptyProject(d.projects.length + 1)); })}
            >
              Add project
            </button>
          </div>
          <div className="admin-grid">
            {workingContent.projects.map((project, index) => (
              <div className="admin-card" key={project.id}>
                <div className="admin-form-row">
                  <div>
                    <label className="admin-label">Title</label>
                    <input
                      className="admin-input"
                      value={project.title}
                      onChange={(e) => applyUpdate((d) => { d.projects[index].title = e.target.value; })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Status</label>
                    <select
                      className="admin-input"
                      value={project.status}
                      onChange={(e) => applyUpdate((d) => { d.projects[index].status = e.target.value as Project['status']; })}
                    >
                      <option value="active">Active</option>
                      <option value="past">Past</option>
                    </select>
                  </div>
                  <div>
                    <label className="admin-label">Start year</label>
                    <input
                      className="admin-input"
                      type="number"
                      value={project.start_year ?? ''}
                      onChange={(e) => applyUpdate((d) => { d.projects[index].start_year = toNumberOrNull(e.target.value); })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">End year</label>
                    <input
                      className="admin-input"
                      type="number"
                      value={project.end_year ?? ''}
                      onChange={(e) => applyUpdate((d) => { d.projects[index].end_year = toNumberOrNull(e.target.value); })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Display order</label>
                    <input
                      className="admin-input"
                      type="number"
                      value={project.display_order}
                      onChange={(e) => applyUpdate((d) => { d.projects[index].display_order = Number(e.target.value); })}
                    />
                  </div>
                </div>
                <div>
                  <RichTextEditor
                    label="Summary"
                    value={project.description}
                    onChange={(v) => applyUpdate((d) => { d.projects[index].description = v; })}
                  />
                </div>
                <div className="admin-actions">
                  <button
                    className="admin-button admin-button--danger"
                    type="button"
                    onClick={() => {
                      if (!project.id.startsWith('tmp-')) setDeletedProjectIds((p) => [...new Set([...p, project.id])]);
                      applyUpdate((d) => { d.projects = d.projects.filter((_, i) => i !== index); });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Publications ── */}
        <section id="admin-publications" className="admin-section">
          <div className="admin-section-header">
            <div>
              <h3>Publications</h3>
              <p className="admin-subtle">Manage papers and citation details.</p>
            </div>
            <button
              className="admin-button admin-button--ghost"
              type="button"
              onClick={() => applyUpdate((d) => { d.publications.unshift(emptyPublication()); })}
            >
              Add publication
            </button>
          </div>
          <div className="admin-grid">
            {workingContent.publications.map((publication, index) => (
              <div className="admin-card" key={publication.id}>
                <div className="admin-form-row">
                  <div>
                    <label className="admin-label">Title</label>
                    <input
                      className="admin-input"
                      value={publication.title}
                      onChange={(e) => applyUpdate((d) => { d.publications[index].title = e.target.value; })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Authors</label>
                    <input
                      className="admin-input"
                      value={publication.authors}
                      onChange={(e) => applyUpdate((d) => { d.publications[index].authors = e.target.value; })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Journal</label>
                    <input
                      className="admin-input"
                      value={publication.journal}
                      onChange={(e) => applyUpdate((d) => { d.publications[index].journal = e.target.value; })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Year</label>
                    <input
                      className="admin-input"
                      type="number"
                      value={publication.year ?? ''}
                      onChange={(e) => applyUpdate((d) => { d.publications[index].year = Number(e.target.value); })}
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div>
                    <label className="admin-label">DOI</label>
                    <input
                      className="admin-input"
                      value={publication.doi ?? ''}
                      onChange={(e) => applyUpdate((d) => { d.publications[index].doi = e.target.value; })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Link</label>
                    <input
                      className="admin-input"
                      value={publication.link ?? ''}
                      onChange={(e) => applyUpdate((d) => { d.publications[index].link = e.target.value; })}
                    />
                  </div>
                </div>
                <div className="admin-actions">
                  <button
                    className="admin-button admin-button--danger"
                    type="button"
                    onClick={() => {
                      if (!publication.id.startsWith('tmp-')) setDeletedPublicationIds((p) => [...new Set([...p, publication.id])]);
                      applyUpdate((d) => { d.publications = d.publications.filter((_, i) => i !== index); });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Software (sub-section of Projects) ── */}
        <section id="admin-software" className="admin-section" style={{ paddingTop: 0 }}>
          <div className="admin-section-header">
            <div>
              <h3>Software</h3>
              <p className="admin-subtle">Open-source tools developed by the lab.</p>
            </div>
            <button
              className="admin-button admin-button--ghost"
              type="button"
              onClick={() => applyUpdate((d) => { d.siteContent.software_items.push(emptySoftwareItem()); })}
            >
              Add tool
            </button>
          </div>
          <div className="admin-card" style={{ marginBottom: 16 }}>
            <RichTextEditor
              label="Section lead"
              value={workingContent.siteContent.software_lead}
              onChange={(v) => applyUpdate((d) => { d.siteContent.software_lead = v; })}
            />
          </div>
          <div className="admin-grid">
            {workingContent.siteContent.software_items.map((tool, index) => (
              <div className="admin-card" key={tool.id}>
                <label className="admin-label">Name</label>
                <input
                  className="admin-input"
                  value={tool.title}
                  onChange={(e) => applyUpdate((d) => { d.siteContent.software_items[index].title = e.target.value; })}
                />
                <RichTextEditor
                  label="Description"
                  value={tool.description}
                  onChange={(v) => applyUpdate((d) => { d.siteContent.software_items[index].description = v; })}
                />
                <label className="admin-label" style={{ marginTop: 8 }}>Link (URL)</label>
                <input
                  className="admin-input"
                  placeholder="https://github.com/..."
                  value={tool.link}
                  onChange={(e) => applyUpdate((d) => { d.siteContent.software_items[index].link = e.target.value; })}
                />
                <div className="admin-actions">
                  <button
                    className="admin-button admin-button--danger"
                    type="button"
                    onClick={() => applyUpdate((d) => {
                      d.siteContent.software_items = d.siteContent.software_items.filter((_, i) => i !== index);
                    })}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Teaching ── */}
        <section id="admin-teaching" className="admin-section">
          <div className="admin-section-header">
            <div>
              <h3>Teaching</h3>
              <p className="admin-subtle">Section lead and course/topic cards.</p>
            </div>
            <button
              className="admin-button admin-button--ghost"
              type="button"
              onClick={() => applyUpdate((d) => { d.siteContent.teaching_items.push(emptySiteItem()); })}
            >
              Add card
            </button>
          </div>
          <div className="admin-grid">
            <div className="admin-card">
              <RichTextEditor
                label="Section lead"
                value={workingContent.siteContent.teaching_lead}
                onChange={(v) => applyUpdate((d) => { d.siteContent.teaching_lead = v; })}
              />
            </div>
            {workingContent.siteContent.teaching_items.map((item, index) => (
              <div className="admin-item-card" key={`teaching-${index}`}>
                <label className="admin-label">Title</label>
                <input
                  className="admin-input"
                  value={item.title}
                  onChange={(e) => applyUpdate((d) => { d.siteContent.teaching_items[index].title = e.target.value; })}
                />
                <RichTextEditor
                  label="Description"
                  value={item.description}
                  onChange={(v) => applyUpdate((d) => { d.siteContent.teaching_items[index].description = v; })}
                />
                <div className="admin-actions">
                  <button
                    className="admin-button admin-button--danger"
                    type="button"
                    onClick={() => applyUpdate((d) => {
                      d.siteContent.teaching_items = d.siteContent.teaching_items.filter((_, i) => i !== index);
                    })}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Lab Photos ── */}
        <section id="admin-lab-photos" className="admin-section">
          <div className="admin-section-header">
            <div>
              <h3>Lab Photos</h3>
              <p className="admin-subtle">Photos shown in the slideshow on the public site.</p>
            </div>
            <label className={`admin-upload-btn ${uploading.size > 0 ? 'is-loading' : ''}`}>
              <ImageIcon className="h-4 w-4" />
              {uploading.size > 0 ? 'Uploading…' : 'Upload photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading.size > 0}
                onChange={(e) => void handleLabPhotoUpload(e)}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <div className="admin-photo-gallery">
            {workingContent.siteContent.lab_photos.length === 0 && (
              <p className="admin-subtle">No photos yet — upload one above.</p>
            )}
            {workingContent.siteContent.lab_photos.map((photo, index) => (
              <div className="admin-gallery-card" key={photo.id}>
                <img src={photo.imageUrl} alt={photo.alt} className="admin-gallery-thumb" />
                <div className="admin-gallery-fields">
                  <label className="admin-label">Caption</label>
                  <input
                    className="admin-input"
                    value={photo.caption}
                    placeholder="Optional caption"
                    onChange={(e) => applyUpdate((d) => { d.siteContent.lab_photos[index].caption = e.target.value; })}
                  />
                  <label className="admin-label">Alt text</label>
                  <input
                    className="admin-input"
                    value={photo.alt}
                    onChange={(e) => applyUpdate((d) => { d.siteContent.lab_photos[index].alt = e.target.value; })}
                  />
                </div>
                <button
                  className="admin-icon-btn admin-icon-btn--danger"
                  type="button"
                  onClick={() => handleLabPhotoRemove(photo.id)}
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Dissertations ── */}
        <section id="admin-dissertations" className="admin-section">
          <div className="admin-section-header">
            <div>
              <h3>Dissertations</h3>
              <p className="admin-subtle">PhD and MSc theses completed in the lab.</p>
            </div>
            <button
              className="admin-button admin-button--ghost"
              type="button"
              onClick={() => applyUpdate((d) => { d.siteContent.dissertation_items.push(emptyDissertation()); })}
            >
              Add dissertation
            </button>
          </div>
          <div className="admin-card" style={{ marginBottom: 16 }}>
            <RichTextEditor
              label="Section lead"
              value={workingContent.siteContent.dissertations_lead}
              onChange={(v) => applyUpdate((d) => { d.siteContent.dissertations_lead = v; })}
            />
          </div>
          <div className="admin-grid">
            {workingContent.siteContent.dissertation_items.map((diss, index) => (
              <div className="admin-card" key={diss.id}>
                <div className="admin-form-row">
                  <div>
                    <label className="admin-label">Student</label>
                    <input
                      className="admin-input"
                      value={diss.student}
                      onChange={(e) => applyUpdate((d) => { d.siteContent.dissertation_items[index].student = e.target.value; })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Year</label>
                    <input
                      className="admin-input"
                      value={diss.year}
                      onChange={(e) => applyUpdate((d) => { d.siteContent.dissertation_items[index].year = e.target.value; })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Type</label>
                    <select
                      className="admin-input"
                      value={diss.type}
                      onChange={(e) => applyUpdate((d) => {
                        d.siteContent.dissertation_items[index].type = e.target.value as 'phd' | 'msc';
                      })}
                    >
                      <option value="phd">PhD</option>
                      <option value="msc">MSc</option>
                    </select>
                  </div>
                </div>
                <label className="admin-label">Thesis title</label>
                <input
                  className="admin-input"
                  value={diss.title}
                  onChange={(e) => applyUpdate((d) => { d.siteContent.dissertation_items[index].title = e.target.value; })}
                />
                <label className="admin-label" style={{ marginTop: 8 }}>Link (PDF or URL, optional)</label>
                <input
                  className="admin-input"
                  placeholder="https://..."
                  value={diss.link}
                  onChange={(e) => applyUpdate((d) => { d.siteContent.dissertation_items[index].link = e.target.value; })}
                />
                <div className="admin-actions">
                  <button
                    className="admin-button admin-button--danger"
                    type="button"
                    onClick={() => applyUpdate((d) => {
                      d.siteContent.dissertation_items = d.siteContent.dissertation_items.filter((_, i) => i !== index);
                    })}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Resources (sub-section of Papers) ── */}
        <section id="admin-resources" className="admin-section" style={{ paddingTop: 0 }}>
          <div className="admin-section-header">
            <div>
              <h3>Resources</h3>
              <p className="admin-subtle">Links with description — e.g. Google Drive, shared docs, datasets.</p>
            </div>
            <button
              className="admin-button admin-button--ghost"
              type="button"
              onClick={() => applyUpdate((d) => { d.siteContent.resource_items.push(emptyResource()); })}
            >
              Add resource
            </button>
          </div>
          <div className="admin-card" style={{ marginBottom: 16 }}>
            <RichTextEditor
              label="Section lead"
              value={workingContent.siteContent.resources_lead}
              onChange={(v) => applyUpdate((d) => { d.siteContent.resources_lead = v; })}
            />
          </div>
          <div className="admin-grid">
            {workingContent.siteContent.resource_items.map((res, index) => (
              <div className="admin-card" key={res.id}>
                <label className="admin-label">Title</label>
                <input
                  className="admin-input"
                  value={res.title}
                  placeholder="e.g. Lab Data Drive"
                  onChange={(e) => applyUpdate((d) => { d.siteContent.resource_items[index].title = e.target.value; })}
                />
                <label className="admin-label" style={{ marginTop: 8 }}>Short description</label>
                <input
                  className="admin-input"
                  value={res.description}
                  placeholder="e.g. Raw sequencing data and analysis scripts"
                  onChange={(e) => applyUpdate((d) => { d.siteContent.resource_items[index].description = e.target.value; })}
                />
                <label className="admin-label" style={{ marginTop: 8 }}>Link</label>
                <input
                  className="admin-input"
                  value={res.link}
                  placeholder="https://drive.google.com/..."
                  onChange={(e) => applyUpdate((d) => { d.siteContent.resource_items[index].link = e.target.value; })}
                />
                <div className="admin-actions">
                  <button
                    className="admin-button admin-button--danger"
                    type="button"
                    onClick={() => applyUpdate((d) => {
                      d.siteContent.resource_items = d.siteContent.resource_items.filter((_, i) => i !== index);
                    })}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact ── */}
        <section id="admin-contact" className="admin-section">
          <div className="admin-section-header">
            <div>
              <h3>Contact</h3>
              <p className="admin-subtle">Lead text and contact details shown in the last section.</p>
            </div>
          </div>
          <div className="admin-card">
            <RichTextEditor
              label="Section lead"
              value={workingContent.siteContent.contact_lead}
              onChange={(v) => applyUpdate((d) => { d.siteContent.contact_lead = v; })}
            />
            <div className="admin-form-row" style={{ marginTop: 12 }}>
              <div>
                <label className="admin-label">Email</label>
                <input
                  className="admin-input"
                  value={workingContent.siteContent.contact_email}
                  onChange={(e) => applyUpdate((d) => { d.siteContent.contact_email = e.target.value; })}
                />
              </div>
              <div>
                <label className="admin-label">Phone</label>
                <input
                  className="admin-input"
                  value={workingContent.siteContent.contact_phone}
                  onChange={(e) => applyUpdate((d) => { d.siteContent.contact_phone = e.target.value; })}
                />
              </div>
            </div>
            <label className="admin-label" style={{ marginTop: 8 }}>Location</label>
            <input
              className="admin-input"
              value={workingContent.siteContent.contact_location}
              onChange={(e) => applyUpdate((d) => { d.siteContent.contact_location = e.target.value; })}
            />
          </div>
        </section>

      </main>
      </div>{/* admin-shell */}

      {/* Backups modal */}
      {showBackups && (
        <div className="admin-backdrop" role="presentation" onClick={() => setShowBackups(false)}>
          <div className="admin-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3>Backups</h3>
                <p className="admin-subtle">Manual snapshots stored in Supabase.</p>
              </div>
              <button className="admin-button admin-button--ghost" type="button" onClick={() => setShowBackups(false)}>
                Close
              </button>
            </div>
            <div className="admin-modal-actions">
              <button
                className="admin-button admin-button--primary"
                type="button"
                onClick={handleCreateBackup}
                disabled={creatingBackup}
              >
                {creatingBackup ? 'Saving backup…' : 'Create backup'}
              </button>
            </div>
            {loadingBackups ? (
              <p className="admin-subtle">Loading backups…</p>
            ) : backups.length === 0 ? (
              <p className="admin-subtle">No backups yet.</p>
            ) : (
              <div className="admin-backup-list">
                {backups.map((backup) => (
                  <div className="admin-backup-item" key={backup.id}>
                    <div>
                      <p className="admin-backup-title">{backup.label ?? 'Backup'}</p>
                      <p className="admin-subtle">{formatTimestamp(backup.created_at)}</p>
                    </div>
                    <button
                      className="admin-button admin-button--outline"
                      type="button"
                      onClick={() => handleRestoreBackup(backup)}
                      disabled={restoringBackup === backup.id}
                    >
                      {restoringBackup === backup.id ? 'Restoring…' : 'Restore'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
