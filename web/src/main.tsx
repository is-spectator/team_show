import '@demo-boot';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter, Route, Routes, Link } from 'react-router';
import { DataProvider } from './store';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ProjectPage } from './pages/ProjectPage';
import './styles.css';

function NotFound() {
  return (
    <Layout back>
      <p className="empty">页面不存在。<Link to="/">回到全部项目</Link></p>
    </Layout>
  );
}

// 预览版是单个 HTML 文件，可能嵌在别的页面里打开，路由只放在内存里。
const Router = __DEMO__ ? MemoryRouter : BrowserRouter;

function DemoBanner() {
  if (!__DEMO__) return null;
  const reset = () => {
    try {
      localStorage.removeItem('team-show:demo-v3');
    } catch {
      /* 忽略 */
    }
    location.reload();
  };
  return (
    <div className="demo-bar">
      预览版：数据只保存在你自己的浏览器里，正式部署后才会多人共享。
      <button type="button" className="link-btn" onClick={reset}>恢复示例数据</button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <DemoBanner />
      <DataProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/p/:id" element={<ProjectPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </DataProvider>
    </Router>
  </StrictMode>
);
