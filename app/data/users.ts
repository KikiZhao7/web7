import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  account: string;
  password: string; // 加密后的密码
  nickname: string;
  createdAt: Date;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 初始化用户文件
function initUsersFile() {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
}

// 获取所有用户
export function getUsers(): User[] {
  initUsersFile();
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

// 保存用户
export function saveUser(user: User): void {
  initUsersFile();
  const users = getUsers();
  users.push(user);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 根据账号查找用户
export function findUserByAccount(account: string): User | undefined {
  const users = getUsers();
  return users.find(user => user.account === account);
}

// 根据 ID 查找用户
export function findUserById(id: string): User | undefined {
  const users = getUsers();
  return users.find(user => user.id === id);
}

// 生成唯一 ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}