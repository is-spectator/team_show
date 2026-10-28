import { useState } from 'react';
import { Modal, ErrorText } from './ui';
import { parseText, toJson, toYaml } from '../../../shared/project.js';
import { SAMPLE_YAML } from '../lib/sample';
import type { Project } from '../types';

function copy(text: string) {
  return navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error('no clipboard'));
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 一个文件里可以是一个项目，也可以是多个项目组成的列表（YAML 里每个项目以「- name:」开头） */
function splitProjects(text: string): string[] {
  let data: unknown;
  try {
    data = parseText(text);
  } catch {
    return [text]; // 格式错误交给服务端报，提示更具体
  }
  return Array.isArray(data) ? data.map((d) => JSON.stringify(d)) : [text];
}

/** 粘贴 YAML / JSON 创建项目，也可以选本地的 .yaml / .json 文件 */
export function ImportDialog({ onImport, onClose }: { onImport: (texts: string[]) => Promise<void>; onClose: () => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    setErr('');
    try {
      await onImport(splitProjects(text));
    } catch (e) {
      // 多个项目时，出错之前的已经创建了
      const list = splitProjects(text);
      const msg = (e as Error).message;
      setErr(list.length > 1 ? msg + '（出错之前的项目已经创建，请把它们从内容里删掉再导入）' : msg);
      setBusy(false);
    }
  };
  const pickFile = (f: File | undefined) => {
    if (!f) return;
    f.text().then((t) => { setText(t); setErr(''); }, () => setErr('读不了这个文件'));
  };
  return (
    <Modal
      title="导入项目"
      hint="粘贴一份项目的 YAML 或 JSON，或者选择模板文件，点「创建项目」就会多一条鱼。一个文件里也可以放多个项目，一次全部创建。不确定怎么写，可以先点「填入示例」。"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={() => { setText(SAMPLE_YAML); setErr(''); }}>填入示例</button>
          <label className="btn file">
            选择文件
            <input type="file" accept=".yaml,.yml,.json,text/yaml,application/json,text/plain" onChange={(e) => pickFile(e.target.files?.[0])} />
          </label>
          <span className="grow" />
          <button type="button" className="btn dark" disabled={busy || !text.trim()} onClick={create}>{busy ? '创建中…' : '创建项目'}</button>
        </>
      }
    >
      <textarea className="code" aria-label="项目数据" spellCheck={false} value={text} onChange={(e) => { setText(e.target.value); setErr(''); }} placeholder="把 YAML 或 JSON 粘贴到这里" />
      <ErrorText>{err}</ErrorText>
    </Modal>
  );
}

export function ExportDialog({ p, onClose }: { p: Project; onClose: () => void }) {
  const [fmt, setFmt] = useState<'yaml' | 'json'>('yaml');
  const [msg, setMsg] = useState({ ok: '', err: '' });
  const text = fmt === 'yaml' ? toYaml(p) : toJson(p);
  return (
    <Modal
      title="导出项目数据"
      hint="这是当前项目的数据，格式和模板一样。保存下来以后可以直接再导入，也可以改好了导入成一个新项目。"
      onClose={onClose}
      footer={
        <>
          <div className="seg" role="group" aria-label="格式">
            <button type="button" aria-pressed={fmt === 'yaml'} onClick={() => setFmt('yaml')}>YAML</button>
            <button type="button" aria-pressed={fmt === 'json'} onClick={() => setFmt('json')}>JSON</button>
          </div>
          <span className="grow" />
          <button type="button" className="btn" onClick={() => copy(text).then(() => setMsg({ ok: '已复制', err: '' }), () => setMsg({ ok: '', err: '浏览器不允许自动复制，请在文本框里全选后手动复制' }))}>复制</button>
          <button type="button" className="btn dark" onClick={() => download(p.name + (fmt === 'yaml' ? '.yaml' : '.json'), text, fmt === 'yaml' ? 'text/yaml' : 'application/json')}>下载文件</button>
        </>
      }
    >
      <textarea className="code" aria-label="项目数据" spellCheck={false} readOnly value={text} onFocus={(e) => e.target.select()} />
      {msg.ok && <p role="status" className="ok">{msg.ok}</p>}
      <ErrorText>{msg.err}</ErrorText>
    </Modal>
  );
}
