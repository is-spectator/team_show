// 全站数据：启动时拉一次 /api/bootstrap，每次写操作成功后重新拉取，保证所有页面看到同一份最新数据。
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, getPassword, setPassword } from './api';
import type { Bootstrap } from './types';
import { Modal } from './components/ui';

const ME_KEY = 'team-show:me';

interface Ctx {
  data: Bootstrap;
  reload: () => Promise<void>;
  /** 执行写操作：需要密码时先弹窗；成功后刷新数据并提示。返回 false 表示没有执行成功。 */
  mutate: <T>(fn: () => Promise<T>, okText?: string) => Promise<T | false>;
  me: string;
  setMe: (name: string) => void;
  unlocked: boolean;
  lock: () => void;
  requestUnlock: () => Promise<boolean>;
  toast: (text: string, kind?: 'ok' | 'err') => void;
}

const DataCtx = createContext<Ctx | null>(null);

export function useData(): Ctx {
  const c = useContext(DataCtx);
  if (!c) throw new Error('useData 需要在 DataProvider 里使用');
  return c;
}

function readMe() {
  try {
    return localStorage.getItem(ME_KEY) || '';
  } catch {
    return '';
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [me, setMeState] = useState(readMe);
  const [hasPw, setHasPw] = useState(() => !!getPassword());
  const [tip, setTip] = useState<{ text: string; kind: 'ok' | 'err'; n: number } | null>(null);
  const [askPw, setAskPw] = useState(false);
  const pwResolve = useRef<((ok: boolean) => void) | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await api.bootstrap());
      setLoadErr('');
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const toast = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    setTip({ text, kind, n: Date.now() });
  }, []);

  useEffect(() => {
    if (!tip) return;
    const t = setTimeout(() => setTip(null), tip.kind === 'err' ? 5000 : 2500);
    return () => clearTimeout(t);
  }, [tip]);

  const requestUnlock = useCallback(() => {
    setAskPw(true);
    return new Promise<boolean>((resolve) => {
      pwResolve.current = resolve;
    });
  }, []);

  const unlocked = !data?.authRequired || hasPw;

  const mutate = useCallback(
    async <T,>(fn: () => Promise<T>, okText?: string): Promise<T | false> => {
      if (data?.authRequired && !getPassword() && !(await requestUnlock())) return false;
      try {
        const r = await fn();
        await reload();
        if (okText) toast(okText);
        return r;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setPassword('');
          setHasPw(false);
          if (await requestUnlock()) return mutate(fn, okText);
          return false;
        }
        toast((e as Error).message, 'err');
        return false;
      }
    },
    [data?.authRequired, reload, requestUnlock, toast]
  );

  const setMe = (name: string) => {
    setMeState(name);
    try {
      localStorage.setItem(ME_KEY, name);
    } catch {
      /* 忽略 */
    }
  };

  const lock = () => {
    setPassword('');
    setHasPw(false);
    toast('已退出编辑');
  };

  if (!data) {
    return (
      <div className="boot">
        {loadErr ? (
          <div className="pn" style={{ padding: 24, maxWidth: 420 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>加载失败</h2>
            <p className="muted">{loadErr}</p>
            <button className="b p" onClick={reload}>重试</button>
          </div>
        ) : (
          <span className="muted">加载中…</span>
        )}
      </div>
    );
  }

  return (
    <DataCtx.Provider value={{ data, reload, mutate, me, setMe, unlocked, lock, requestUnlock, toast }}>
      {children}
      {askPw && (
        <PasswordModal
          onDone={(ok) => {
            setAskPw(false);
            if (ok) {
              setHasPw(true);
              toast('已进入编辑模式');
            }
            pwResolve.current?.(ok);
            pwResolve.current = null;
          }}
        />
      )}
      {tip && (
        <div key={tip.n} className={'toast' + (tip.kind === 'err' ? ' err' : '')} role={tip.kind === 'err' ? 'alert' : 'status'}>
          {tip.text}
        </div>
      )}
    </DataCtx.Provider>
  );
}

function PasswordModal({ onDone }: { onDone: (ok: boolean) => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.login(pw);
      setPassword(pw);
      onDone(true);
    } catch (ex) {
      setErr((ex as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="输入编辑密码" onClose={() => onDone(false)} width={400}>
      <form onSubmit={submit}>
        <div className="mbody">
          <p className="muted" style={{ marginTop: 0, lineHeight: 1.6 }}>
            浏览不需要密码。修改数据前需要输入团队的编辑密码，输入一次后这台电脑会记住。
          </p>
          <label className="fl">
            编辑密码
            <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          {err && <div className="alert">{err}</div>}
        </div>
        <div className="mfoot">
          <button type="button" className="b" onClick={() => onDone(false)}>取消</button>
          <button type="submit" className="b p" disabled={busy || !pw}>确定</button>
        </div>
      </form>
    </Modal>
  );
}
