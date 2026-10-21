"use client";

import { useState } from "react";
import { Eye, EyeOff, User, Lock, Mail, UserPlus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type FormType = "login" | "register";

interface FormData {
  account: string;
  password: string;
  confirmPassword: string;
  nickname: string;
}

interface FormErrors {
  account?: string;
  password?: string;
  confirmPassword?: string;
  nickname?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [formType, setFormType] = useState<FormType>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    account: "",
    password: "",
    confirmPassword: "",
    nickname: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateLogin = () => {
    const newErrors: FormErrors = {};
    let hasError = false;

    if (!formData.account.trim()) {
      newErrors.account = "请输入账号或手机号";
      hasError = true;
    }

    if (!formData.password) {
      newErrors.password = "请输入密码";
      hasError = true;
    }

    setErrors(newErrors);
    return !hasError;
  };

  const validateRegister = () => {
    const newErrors: FormErrors = {};
    let hasError = false;

    if (!formData.account.trim()) {
      newErrors.account = "请输入账号或手机号";
      hasError = true;
    }

    if (!formData.password) {
      newErrors.password = "请输入密码";
      hasError = true;
    } else if (formData.password.length < 6) {
      newErrors.password = "密码至少需要6位";
      hasError = true;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "请确认密码";
      hasError = true;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "两次输入的密码不一致";
      hasError = true;
    }

    if (!formData.nickname.trim()) {
      newErrors.nickname = "请输入昵称";
      hasError = true;
    }

    setErrors(newErrors);
    return !hasError;
  };

  const handleLogin = async () => {
    if (!validateLogin()) return;

    setIsSubmitting(true);
    setGeneralError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: formData.account,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setGeneralError(data.error || "登录失败");
        return;
      }

      // 保存 Token
      const { token, user } = data.data;
      
      // 保存到 localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      
      // 保存到 Cookie（用于服务端验证）
      document.cookie = `token=${token}; path=/; expires=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()}`;

      // 跳转到首页
      router.push("/");
    } catch (error) {
      setGeneralError("网络错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!validateRegister()) return;

    setIsSubmitting(true);
    setGeneralError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: formData.account,
          password: formData.password,
          nickname: formData.nickname,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setGeneralError(data.error || "注册失败");
        return;
      }

      // 注册成功后自动登录
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: formData.account,
          password: formData.password,
        }),
      });

      const loginData = await loginResponse.json();
      
      if (loginResponse.ok) {
        const { token, user } = loginData.data;
        
        // 保存 Token
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        document.cookie = `token=${token}; path=/; expires=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()}`;

        // 跳转到首页
        router.push("/");
      } else {
        setGeneralError("注册成功，但登录失败，请手动登录");
      }
    } catch (error) {
      setGeneralError("网络错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formType === "login") {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    setGeneralError("");
  };

  const handleFocus = () => {
    setGeneralError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-orange-200 to-yellow-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full opacity-20 blur-3xl" />
        
        {/* 简约穿搭装饰 */}
        <svg className="absolute top-20 right-20 w-16 h-16 text-purple-300 opacity-60" viewBox="0 0 100 100" fill="none">
          <path d="M50 10 L60 40 L70 35 L80 60 L60 70 L50 90 L40 70 L20 60 L30 35 L40 40 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
        <svg className="absolute bottom-32 left-20 w-12 h-12 text-orange-300 opacity-60" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="35" r="20" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="30" y="55" width="40" height="35" rx="5" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
        <svg className="absolute top-1/3 left-10 w-10 h-10 text-pink-300 opacity-60" viewBox="0 0 100 100" fill="none">
          <ellipse cx="50" cy="30" rx="25" ry="15" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M30 45 L50 90 L70 45" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      </div>

      {/* 登录/注册卡片 */}
      <div className="relative w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
          {/* Logo 和标题 */}
          <div className="text-center mb-8">
            <img 
              src="/new-logo.jpg" 
              alt="AI 穿搭助手" 
              className="w-32 h-auto mx-auto mb-4 rounded-xl object-contain"
            />
            <h1 className="text-2xl font-bold text-gray-800">
              {formType === "login" ? "今天穿什么？" : "创建衣橱档案"}
            </h1>
            <p className="text-gray-500 mt-2">
              {formType === "login" 
                ? "登录获取专属天气穿搭建议" 
                : "创建账号，开启时尚之旅"}
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 账号输入 */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                手机号 / 邮箱
              </label>
              <div className={cn(
                "relative flex items-center",
                errors.account && "text-red-500"
              )}>
                <User className={cn(
                  "absolute left-3 w-5 h-5",
                  errors.account ? "text-red-500" : "text-gray-400"
                )} />
                <input
                  type="text"
                  value={formData.account}
                  onChange={(e) => handleInputChange("account", e.target.value)}
                  onFocus={handleFocus}
                  placeholder="手机号 / 邮箱"
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200",
                    errors.account
                      ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      : "border-gray-200 bg-gray-50 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  )}
                />
              </div>
              {errors.account && (
                <p className="text-sm text-red-500">{errors.account}</p>
              )}
            </div>

            {/* 密码输入 */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <div className={cn(
                "relative flex items-center",
                errors.password && "text-red-500"
              )}>
                <Lock className={cn(
                  "absolute left-3 w-5 h-5",
                  errors.password ? "text-red-500" : "text-gray-400"
                )} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  onFocus={handleFocus}
                  placeholder="请输入密码"
                  className={cn(
                    "w-full pl-10 pr-12 py-3 rounded-xl border transition-all duration-200",
                    errors.password
                      ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      : "border-gray-200 bg-gray-50 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* 确认密码（注册时显示） */}
            {formType === "register" && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  确认密码
                </label>
                <div className={cn(
                  "relative flex items-center",
                  errors.confirmPassword && "text-red-500"
                )}>
                  <Lock className={cn(
                    "absolute left-3 w-5 h-5",
                    errors.confirmPassword ? "text-red-500" : "text-gray-400"
                  )} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    onFocus={handleFocus}
                    placeholder="请再次输入密码"
                    className={cn(
                      "w-full pl-10 pr-12 py-3 rounded-xl border transition-all duration-200",
                      errors.confirmPassword
                        ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border-gray-200 bg-gray-50 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* 昵称（注册时显示） */}
            {formType === "register" && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  昵称
                </label>
                <div className={cn(
                  "relative flex items-center",
                  errors.nickname && "text-red-500"
                )}>
                  <Mail className={cn(
                    "absolute left-3 w-5 h-5",
                    errors.nickname ? "text-red-500" : "text-gray-400"
                  )} />
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => handleInputChange("nickname", e.target.value)}
                    onFocus={handleFocus}
                    placeholder="请输入您的昵称"
                    className={cn(
                      "w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200",
                      errors.nickname
                        ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border-gray-200 bg-gray-50 focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                    )}
                  />
                </div>
                {errors.nickname && (
                  <p className="text-sm text-red-500">{errors.nickname}</p>
                )}
              </div>
            )}

            {/* 记住密码（登录时显示） */}
            {formType === "login" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-400"
                />
                <span className="text-sm text-gray-600">记住密码</span>
              </label>
            )}

            {/* 错误提示 */}
            {generalError && (
              <p className="text-center text-sm text-red-500">{generalError}</p>
            )}

            {/* 登录/注册按钮 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
                isSubmitting && "opacity-70 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  处理中...
                </span>
              ) : (
                formType === "login" ? "登录" : "注册"
              )}
            </button>
          </form>

          {/* 切换登录/注册 */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setFormType(formType === "login" ? "register" : "login");
                setErrors({});
                setGeneralError("");
              }}
              className="inline-flex items-center gap-1 text-gray-600 hover:text-purple-600 transition-colors"
            >
              {formType === "login" ? (
                <>
                  新用户？
                  <span className="font-medium">创建衣橱档案</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  已有档案？
                  <span className="font-medium">立即登录</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* 忘记密码链接（登录时显示） */}
          {formType === "login" && (
            <div className="mt-4 text-center">
              <a href="#" className="text-sm text-gray-500 hover:text-purple-500 transition-colors">
                忘记密码？
              </a>
            </div>
          )}

          {/* 第三方登录 */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/90 text-gray-500">其他登录方式</span>
              </div>
            </div>
            
            <div className="flex justify-center gap-6 mt-6">
              {/* 微信图标占位 */}
              <button className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors shadow-md hover:shadow-lg">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c4.801 0 8.692-3.287 8.692-7.342 0-4.054-3.891-7.339-8.692-7.339zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.446.618-4.664 1.728-.194.178-.403.411-.403.679 0 .508.415.919.927.919.284 0 .543-.141.712-.37l.016-.026c.019-.027.054-.04.081-.068 1.024-.854 2.278-1.344 3.551-1.291-.117-.666-.467-1.264-.983-1.662zm-2.53 3.274c-.712 0-1.289.586-1.289 1.307 0 .722.577 1.308 1.29 1.308.712 0 1.289-.586 1.289-1.308 0-.721-.577-1.307-1.29-1.307z"/>
                </svg>
              </button>
              
              {/* Apple 图标占位 */}
              <button className="w-12 h-12 rounded-full bg-gray-900 hover:bg-gray-800 flex items-center justify-center transition-colors shadow-md hover:shadow-lg">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.28-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.81zm-5.99-4.32c-.82 0-1.5-.69-1.5-1.57 0-.88.68-1.57 1.5-1.57.82 0 1.5.69 1.5 1.57 0 .88-.68 1.57-1.5 1.57z"/>
                </svg>
              </button>
              
              {/* 更多第三方图标位置 */}
              <button className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shadow-md hover:shadow-lg">
                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 底部版权信息 */}
        <p className="text-center text-sm text-gray-400 mt-6">
          © 2026 AI 穿搭助手 · 让穿搭更简单
        </p>
      </div>
    </div>
  );
}