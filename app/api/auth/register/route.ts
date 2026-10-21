import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByAccount, saveUser, generateId } from '@/app/data/users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account, password, nickname } = body;

    // 验证输入
    if (!account || !password || !nickname) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      );
    }

    // 检查账号是否已存在
    const existingUser = findUserByAccount(account);
    if (existingUser) {
      return NextResponse.json(
        { error: '该账号已存在' },
        { status: 409 }
      );
    }

    // 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const user = {
      id: generateId(),
      account,
      password: hashedPassword,
      nickname,
      createdAt: new Date(),
    };

    saveUser(user);

    return NextResponse.json({
      success: true,
      message: '注册成功',
      data: {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
      },
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}