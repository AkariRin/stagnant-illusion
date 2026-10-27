import { onRequest } from '../functions/api';

/**
 * Pages Functions 的 context 对象，仅实现 api.ts 实际用到的字段。
 * 完整定义见 https://developers.cloudflare.com/pages/functions/api-reference/
 */
interface PagesContext {
  request: Request;
  env: Env;
  params: Record<string, string>;
  data: Record<string, unknown>;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 静态资源由 assets 直接托管，只有 /api 进入 Worker 处理逻辑
    if (url.pathname === '/api') {
      const context: PagesContext = {
        request,
        env,
        params: {},
        data: {},
        next: () => Promise.resolve(new Response(null, { status: 404 })),
      };
      return onRequest(context);
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
