import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Modal, ErrorText } from './ui';
import { useData } from '../store';
import { today, ymd } from '../lib/date';

/** 页面框架：左上角是团队名称（详情页是返回），右上角是日期和编辑开关 */
export function Layout({ back = false, children }: { back?: boolean; children: ReactNode }) {
  const { settings, authRequired, canEdit, lock } = useData();
  const [dialog, setDialog] = useState<'' | 'unlock' | 'team'>('');
  return (
    <div className="page">
      <header className="top">
        {back ? (
          <Link to="/" className="back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            全部项目
          </Link>
        ) : (
          <div className="brand">
            <svg width="30" height="18" viewBox="0 0 30 18" aria-hidden="true">
              <path d="M7 9 L1 3 Q3 9 1 15 Z" fill="#2449D8" /><line x1="7" y1="9" x2="20" y2="9" stroke="#2449D8" strokeWidth="2.4" strokeLinecap="round" /><path d="M19 3 C24 2 28 5 29 9 C28 13 24 16 19 15 Z" fill="#2449D8" />
            </svg>
            {canEdit ? (
              <button type="button" className="brand-name" onClick={() => setDialog('team')} title="修改团队名称">{settings.teamName}</button>
            ) : (
              <span>{settings.teamName}</span>
            )}
          </div>
        )}
        <div className="top-right">
          <span className="mono muted">截至 {ymd(today())}</span>
          {authRequired && (canEdit ? (
            <button type="button" className="link-btn" onClick={lock}>退出编辑</button>
          ) : (
            <button type="button" className="link-btn" onClick={() => setDialog('unlock')}>编辑</button>
          ))}
        </div>
      </header>
      {children}
      {dialog === 'unlock' && <UnlockDialog onClose={() => setDialog('')} />}
      {dialog === 'team' && <TeamDialog onClose={() => setDialog('')} />}
    </div>
  );
}

function UnlockDialog({ onClose }: { onClose: () => void }) {
  const { unlock } = useData();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const go = () => unlock(pw).then(onClose, (e: Error) => setErr(e.message));
  return (
    <Modal title="输入编辑密码" hint="浏览不需要密码。输入后，这台电脑上的浏览器就可以导入和编辑项目。" onClose={onClose} width={440}
      footer={<><span className="grow" /><button type="button" className="btn dark" onClick={go} disabled={!pw}>确定</button></>}>
      <label className="fld">编辑密码
        <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && pw && go()} autoComplete="current-password" />
      </label>
      <ErrorText>{err}</ErrorText>
    </Modal>
  );
}

function TeamDialog({ onClose }: { onClose: () => void }) {
  const { settings, saveSettings } = useData();
  const [name, setName] = useState(settings.teamName);
  const [err, setErr] = useState('');
  const go = () => saveSettings({ teamName: name }).then(onClose, (e: Error) => setErr(e.message));
  return (
    <Modal title="团队名称" hint="显示在首页左上角和浏览器标签上。" onClose={onClose} width={440}
      footer={<><span className="grow" /><button type="button" className="btn dark" onClick={go} disabled={!name.trim()}>保存</button></>}>
      <label className="fld">团队名称
        <input type="text" value={name} maxLength={30} onChange={(e) => { setName(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && go()} />
      </label>
      <ErrorText>{err}</ErrorText>
    </Modal>
  );
}
