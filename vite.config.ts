import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// `--mode demo` 构建不需要服务器的预览版：接口在浏览器里模拟，数据存在 localStorage。
export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  return {
    root: 'web',
    base: demo ? './' : '/',
    plugins: [react()],
    define: { __DEMO__: JSON.stringify(demo) },
    resolve: {
      alias: { '@demo-boot': fileURLToPath(new URL(demo ? './web/src/demo/boot.ts' : './web/src/demo/noop.ts', import.meta.url)) }
    },
    build: { outDir: demo ? '../dist-demo' : '../dist', emptyOutDir: true },
    server: {
      port: 5173,
      proxy: { '/api': 'http://localhost:' + (process.env.PORT || 3000) }
    }
  };
});
