// 把预览版构建结果合成一个独立的 HTML 文件：dist-demo/team-show-preview.html
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../dist-demo/', import.meta.url);
let html = readFileSync(new URL('index.html', dir), 'utf8');
html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+)"><\/script>/, (_, f) =>
  '<script type="module">' + readFileSync(new URL(f, dir), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>'
);
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+)">/, (_, f) => '<style>' + readFileSync(new URL(f, dir), 'utf8') + '</style>');
if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error('还有没内联的资源');
writeFileSync(new URL('team-show-preview.html', dir), html);
console.log('已生成 dist-demo/team-show-preview.html，' + Math.round(html.length / 1024) + ' KB');
