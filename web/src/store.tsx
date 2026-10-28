import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, getPassword, setPassword } from './api';
import type { Item, Project, ProjectInfo, Settings } from './types';

interface Data {
  settings: Settings;
  projects: Project[];
  authRequired: boolean;
  /** 没设编辑密码，或者已经输入过密码 */
  canEdit: boolean;
  unlock: (pw: string) => Promise<void>;
  lock: () => void;
  saveSettings: (s: Settings) => Promise<void>;
  importProject: (text: string) => Promise<Project>;
  patchProject: (id: string, info: Partial<ProjectInfo>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  addItem: (pid: string, item: Omit<Item, 'id'>) => Promise<Item>;
  saveItem: (pid: string, item: Item) => Promise<Item>;
  deleteItem: (pid: string, id: string) => Promise<void>;
}

const Ctx = createContext<Data | null>(null);

export function useData() {
  const d = useContext(Ctx);
  if (!d) throw new Error('useData 需要在 DataProvider 里面');
  return d;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ teamName: '' });
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [unlocked, setUnlocked] = useState(!!getPassword());
  const [loadError, setLoadError] = useState('');

  const load = useCallback(() => {
    setLoadError('');
    api.bootstrap().then(
      (b) => {
        setSettings(b.settings);
        setAuthRequired(b.authRequired);
        setProjects(b.projects);
      },
      (e: Error) => setLoadError(e.message)
    );
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    document.title = settings.teamName ? settings.teamName + ' · 项目进展' : '项目进展';
  }, [settings.teamName]);

  const replace = useCallback((p: Project) => setProjects((list) => (list || []).map((x) => (x.id === p.id ? p : x))), []);

  // 密码在别处被改了，本地存的旧密码会被拒绝：清掉，回到只读。
  const guard = useCallback(<T,>(pr: Promise<T>) => pr.catch((e) => {
    if (e instanceof ApiError && e.status === 401) {
      setPassword('');
      setUnlocked(false);
      throw new ApiError(401, '编辑密码已失效，请重新输入');
    }
    throw e;
  }), []);

  const value = useMemo<Data | null>(() => projects && {
    settings,
    projects,
    authRequired,
    canEdit: !authRequired || unlocked,
    unlock: async (pw) => {
      await api.login(pw);
      setPassword(pw);
      setUnlocked(true);
    },
    lock: () => {
      setPassword('');
      setUnlocked(false);
    },
    saveSettings: async (s) => setSettings(await guard(api.saveSettings(s))),
    importProject: async (text) => {
      const p = await guard(api.importProject(text));
      setProjects((list) => [p, ...(list || [])]);
      return p;
    },
    patchProject: async (id, info) => {
      const p = await guard(api.patchProject(id, info));
      replace(p);
      return p;
    },
    deleteProject: async (id) => {
      await guard(api.deleteProject(id));
      setProjects((list) => (list || []).filter((x) => x.id !== id));
    },
    addItem: async (pid, item) => {
      const r = await guard(api.addItem(pid, item));
      replace(r.project);
      return r.item;
    },
    saveItem: async (pid, item) => {
      const r = await guard(api.saveItem(pid, item));
      replace(r.project);
      return r.item;
    },
    deleteItem: async (pid, id) => {
      replace((await guard(api.deleteItem(pid, id))).project);
    }
  }, [settings, projects, authRequired, unlocked, guard, replace]);

  if (loadError) {
    return (
      <div className="boot">
        <p>数据加载失败：{loadError}</p>
        <button type="button" className="btn" onClick={load}>重试</button>
      </div>
    );
  }
  if (!value) return <div className="boot" role="status">加载中…</div>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
