// 预览版启动：在应用加载前接管 /api 请求。
import { setExportUrl } from '../api';
import { demoExportUrl, installMockApi } from './mockApi';

installMockApi();
setExportUrl(demoExportUrl);
