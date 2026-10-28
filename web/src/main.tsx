import '@demo-boot';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter, Route, Routes, Link } from 'react-router';
import { DataProvider } from './store';
import { Layout, Crumb } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Sync } from './pages/Sync';
import { Members } from './pages/Members';
import { Wiki } from './pages/Wiki';
import './styles.css';

function NotFound() {
  return (
    <Layout crumb={<Crumb items={[{ label: '页面不存在' }]} />}>
      <div className="pn empty">页面不存在。<Link to="/">回到工作台</Link></div>
    </Layout>
  );
}

// 预览版是单个 HTML 文件，可能嵌在别的页面里打开，路由只放在内存里。
const Router = __DEMO__ ? MemoryRouter : BrowserRouter;

function DemoBanner() {
  if (!__DEMO__) return null;
  const reset = () => {
    try {
      localStorage.removeItem('team-show:demo-data');
    } catch {
      /* 忽略 */
    }
    location.reload();
  };
  return (
    <div className="demo-bar">
      预览版：数据只保存在你自己的浏览器里，正式部署后才会多人共享。
      <button type="button" className="link" onClick={reset}>恢复示例数据</button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <DemoBanner />
      <DataProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/sync" element={<Sync />} />
          <Route path="/members" element={<Members />} />
          <Route path="/wiki" element={<Wiki />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </DataProvider>
    </Router>
  </StrictMode>
);
