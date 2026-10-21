import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByAccount } from '@/app/data/users';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-must-be-at-least-32-characters';
const JWT_EXPIRES_IN = '7d';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account, password } = body;

    // 验证输入
    if (!account || !password) {
      return NextResponse.json(
        { error: '请填写账号和密码' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = findUserByAccount(account);
    if (!user) {
      return NextResponse.json(
        { error: '账号或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '账号或密码错误' },
        { status: 401 }
      );
    }

    // 生成 JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          account: user.account,
          nickname: user.nickname,
        },
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}