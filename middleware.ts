import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 定义需要认证的路由
const protectedRoutes = ['/', '/chat'];
const publicRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是公开路由
  if (publicRoutes.includes(pathname)) {
    // 如果已登录（有 token cookie），跳转到首页
    const token = request.cookies.get('token')?.value;
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 检查是否是受保护的路由
  if (protectedRoutes.includes(pathname)) {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      // 没有 Token，重定向到登录页
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 在 Edge Runtime 中无法使用 jsonwebtoken，我们只检查 Token 是否存在
    // Token 的验证将在 API 路由中进行
    
    // 如果有 Token，继续访问（验证由 API 处理）
    return NextResponse.next();
  }

  // 其他路由直接放行
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/chat'],
};