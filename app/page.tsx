"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Camera,
  ImageIcon,
  Sun,
  CloudRain,
  Cloud,
  Loader2,
  MapPin,
  ChevronDown,
  X,
  Send,
  Plus,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeather, getCityCode, cities } from "@/hooks/useWeather";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null; // 用于 UI 显示的 blob URL
  imageBase64?: string | null; // 用于发送给 API 的 base64 数据
}

// 天气数据结构（兼容两种 API 的返回格式）
interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  city?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  imageBase64?: string; // 用于发送给 API 的 base64 数据
}

const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY || "";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 Data URL 前缀，只返回纯 base64 字符串
      const base64 = result.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getWeatherIcon(condition: string) {
  switch (condition) {
    case "晴天":
      return <Sun className="w-5 h-5 text-yellow-500" />;
    case "小雨":
    case "中雨":
    case "大雨":
    case "暴雨":
      return <CloudRain className="w-5 h-5 text-blue-400" />;
    case "多云":
    case "少云":
    case "阴天":
      return <Cloud className="w-5 h-5 text-gray-400" />;
    default:
      return <Sun className="w-5 h-5 text-yellow-500" />;
  }
}

interface UserInfo {
  id: string;
  account: string;
  nickname: string;
}

function getWelcomeMessage(nickname?: string): string {
  if (nickname) {
    return `${nickname}你好！我是你的穿搭管家 👋\n\n有什么可以帮你的？发张照片给我看看，或者告诉我你今天的计划，我来帮你搭配~`;
  }
  return "你好！我是你的穿搭管家 👋\n\n有什么可以帮你的？发张照片给我看看，或者告诉我你今天的计划，我来帮你搭配~";
}

export default function HomePage() {
  const [selectedCity, setSelectedCity] = useState<string>("北京");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [inputText, setInputText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null); // 定位获取的真实天气
  const [showCameraModal, setShowCameraModal] = useState(false); // 控制摄像头模态框
  const [citySearch, setCitySearch] = useState<string>(""); // 城市搜索关键词
  const [user, setUser] = useState<UserInfo | null>(null); // 当前登录用户
  const [showUserMenu, setShowUserMenu] = useState(false); // 用户菜单显示状态
  const chatEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const cityCode = getCityCode(selectedCity);
  const { weather, loading: weatherLoading, refetch: refetchWeather } = useWeather(cityCode, {
    apiKey: WEATHER_API_KEY,
  });

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, currentResponse, scrollToBottom]);

  // 初始化用户状态
  useEffect(() => {
    // 从 localStorage 获取用户信息
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }

    // 尝试合并未登录时的聊天记录（如果有）
    const guestChatHistory = localStorage.getItem("guest_chat_history");
    if (userData && guestChatHistory) {
      try {
        const parsedHistory = JSON.parse(guestChatHistory);
        if (parsedHistory.length > 0) {
          console.log("Found guest chat history, would merge on server");
          // 这里可以调用 API 将记录合并到用户账户
          // localStorage.removeItem("guest_chat_history");
        }
      } catch (e) {
        console.error("Failed to parse guest chat history:", e);
      }
    }
  }, []);

  // 添加欢迎消息（支持个性化称呼）
  useEffect(() => {
    if (chatHistory.length === 0) {
      setChatHistory([
        {
          id: "welcome",
          role: "assistant",
          content: getWelcomeMessage(user?.nickname),
        },
      ]);
    }
  }, [chatHistory.length, user?.nickname]);

  // 用户信息变化时更新欢迎消息
  useEffect(() => {
    if (user && chatHistory.length > 0 && chatHistory[0].id === "welcome") {
      setChatHistory((prev) => [
        {
          ...prev[0],
          content: getWelcomeMessage(user.nickname),
        },
        ...prev.slice(1),
      ]);
    }
  }, [user]);

  // 退出登录
  const handleLogout = useCallback(() => {
    // 清除 Token 和用户信息
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    
    // 清除用户状态
    setUser(null);
    
    // 保存当前聊天记录为访客记录（可选）
    localStorage.setItem("guest_chat_history", JSON.stringify(chatHistory));
    
    // 跳转到登录页
    window.location.href = "/login";
  }, [chatHistory]);

  // 当天气数据更新时，自动向对话中添加天气消息
  useEffect(() => {
    if (weather && selectedCity) {
      // 生成穿搭建议
      let clothingSuggestion = "";
      if (weather.temp > 28) {
        clothingSuggestion = "适合穿轻薄透气的短袖、短裤或连衣裙，记得做好防晒~";
      } else if (weather.temp > 20) {
        clothingSuggestion = "适合穿长袖衬衫或薄外套，早晚温差大可以加件针织衫";
      } else if (weather.temp > 10) {
        clothingSuggestion = "适合穿外套或风衣，里面搭配长袖，怕冷可以加件薄毛衣";
      } else {
        clothingSuggestion = "适合穿厚外套或羽绒服，注意头部和手部保暖哦";
      }

      // 创建天气消息
      const weatherMessage: ChatMessage = {
        id: `weather-${selectedCity}`,
        role: "assistant",
        content: `📍 ${selectedCity}\n当前气温 ${weather.temp}°C，${weather.condition}\n\n${clothingSuggestion}`,
      };

      // 移除旧的天气消息，并添加新的
      setChatHistory((prev) => {
        // 过滤掉旧的天气消息（id 以 "weather-" 开头）
        const filtered = prev.filter((msg) => !msg.id.startsWith("weather-"));
        // 检查是否已经存在相同的天气消息
        const exists = filtered.some(
          (msg) => msg.id === weatherMessage.id
        );
        if (!exists) {
          return [...filtered, weatherMessage];
        }
        return prev;
      });
    }
  }, [weather, selectedCity]);

  const handleCitySelect = useCallback((city: string) => {
    setSelectedCity(city);
    setShowCityDropdown(false);
  }, []);

  // 处理定位获取天气
  const handleLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("您的浏览器不支持定位功能，请手动选择城市");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;

        try {
          console.log(`定位成功：lat=${lat}, lon=${lon}`);
          
          // 调用后端天气 API
          const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "获取天气失败");
          }

          console.log(`天气获取成功：${data.city} ${data.temp}°C ${data.desc}`);

          // 更新城市选择，这会触发 useWeather 自动获取天气
          setSelectedCity(data.city);

          // 存储真实天气数据（用于后续对话的上下文）
          setCurrentWeather({
            temp: data.temp,
            condition: data.desc,
            humidity: data.humidity,
            city: data.city,
          });

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "获取天气失败";
          console.error("定位天气获取失败:", errorMessage);
          setError(errorMessage);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("定位权限被拒绝，请手动选择城市或在浏览器设置中允许定位");
        } else {
          setError("定位失败，请手动选择城市");
        }
        console.error("定位失败:", err.message);
      }
    );
  }, []);

  const handleImageCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
      }
      setShowImageOptions(false);
    },
    []
  );

  const handleGallerySelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
      }
      setShowImageOptions(false);
    },
    []
  );

  const removeImage = useCallback(() => {
    setImage(null);
    setImagePreview(null);
  }, []);

  // 打开摄像头模态框
  const openCamera = useCallback(async () => {
    setShowImageOptions(false);
    setShowCameraModal(true);

    try {
      // 请求摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // 后置摄像头
        audio: false,
      });

      cameraStreamRef.current = stream;

      // 等待 video 元素加载后设置 srcObject
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error("无法访问摄像头:", err);
      setError("无法访问摄像头，请检查权限设置");
      setShowCameraModal(false);
    }
  }, []);

  // 关闭摄像头模态框
  const closeCamera = useCallback(() => {
    // 停止所有视频轨道
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setShowCameraModal(false);
  }, []);

  // 拍摄照片
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // 设置 canvas 尺寸与视频一致
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 在 canvas 上绘制当前视频帧
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);

      // 将 canvas 转换为 Blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
          setImage(file);
          setImagePreview(URL.createObjectURL(file));
        }
      }, "image/jpeg", 0.9);
    }

    // 关闭摄像头
    closeCamera();
  }, [closeCamera]);

  const handleSend = async () => {
    // 只需要有文字或图片才能发送
    if (!image && !inputText.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setCurrentResponse("");

    // 构建当前用户消息内容
    let messageContent = inputText.trim();
    if (!messageContent) {
      messageContent = "请给我一些穿搭建议";
    }

    // 先转换图片为 base64（如果有图片）
    const currentImage = image;
    const currentImagePreview = imagePreview;
    
    // 只有有图片时才转换 base64
    const base64Image = currentImage ? await fileToBase64(currentImage) : null;

    // 构建当前用户消息（存储 base64 用于后续发送）
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      imageUrl: currentImagePreview, // 用于 UI 显示
      imageBase64: base64Image, // 用于发送给 API
    };

    // 构建完整的消息历史（用于发送给 API）
    // 包含历史消息中的图片 base64 数据
    const allMessagesForAPI: Message[] = [
      ...chatHistory
        .filter((msg) => msg.id !== "welcome")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          imageBase64: msg.imageBase64 || undefined, // 传递历史图片的 base64
        })),
      {
        role: "user" as const,
        content: messageContent,
        imageBase64: base64Image || undefined,
      },
    ];

    // 先添加到聊天历史
    setChatHistory((prev) => [...prev, userMessage]);

    // Clear input
    setInputText("");
    removeImage();

    try {
      // 优先使用定位获取的真实天气，否则使用城市选择的天气
      const weatherData = currentWeather || (weather ? {
        temp: weather.temp,
        condition: weather.condition,
        humidity: weather.humidity,
      } : null);

      const response = await fetch("/api/styling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessagesForAPI,
          imageBase64: base64Image,
          weather: weatherData,
          city: currentWeather?.city || selectedCity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "请求失败");
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法获取响应流");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const messages = buffer.split("\n\n");
        buffer = messages.pop() || "";

        for (const message of messages) {
          if (message.startsWith("data: ")) {
            try {
              const data = JSON.parse(message.slice(5));
              if (data.done) {
                // Add the complete response to chat history
                setChatHistory((prev) => [
                  ...prev,
                  { id: (Date.now() + 1).toString(), role: "assistant", content: fullResponse },
                ]);
                setCurrentResponse("");
              } else if (data.content) {
                fullResponse += data.content;
                setCurrentResponse(fullResponse);
              }
            } catch (e) {
              console.error("Failed to parse SSE message:", e);
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "发生错误";
      setError(errorMessage);
      // Add error message to chat
      setChatHistory((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: `😅 抱歉，出错了：${errorMessage}` },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // 动态背景效果
  useEffect(() => {
    if (weather) {
      // 根据天气条件设置背景
      const condition = weather.condition.toLowerCase();
      let gradientClass = "";
      
      if (condition.includes("晴") || condition.includes("clear")) {
        gradientClass = "bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-50";
      } else if (condition.includes("雨") || condition.includes("rain")) {
        gradientClass = "bg-gradient-to-br from-slate-200 via-gray-200 to-blue-gray-100";
      } else if (condition.includes("阴") || condition.includes("cloud") || condition.includes("多云")) {
        gradientClass = "bg-gradient-to-br from-gray-200 via-slate-100 to-gray-100";
      } else if (condition.includes("雪") || condition.includes("snow")) {
        gradientClass = "bg-gradient-to-br from-slate-100 via-blue-50 to-white";
      } else {
        gradientClass = "bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50";
      }
      
      // 移除旧的动态背景类，添加新的
      // 先移除所有可能的背景渐变类
      const bodyClasses = document.body.classList;
      const classesToRemove = Array.from(bodyClasses).filter(cls => 
        cls.startsWith('bg-gradient-') || 
        cls.startsWith('from-') || 
        cls.startsWith('via-') || 
        cls.startsWith('to-')
      );
      classesToRemove.forEach(cls => bodyClasses.remove(cls));
      
      // 添加新的背景类（分割成单个类名）
      gradientClass.split(' ').forEach(cls => {
        if (cls) bodyClasses.add(cls);
      });
    }
  }, [weather]);

  return (
    <div className={cn(
      "h-screen flex flex-col min-h-screen",
      weather ? (
        weather.condition.includes("晴") || weather.condition.includes("clear") 
          ? "bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-50"
          : weather.condition.includes("雨") || weather.condition.includes("rain")
            ? "bg-gradient-to-br from-slate-200 via-gray-200 to-blue-gray-100"
            : weather.condition.includes("阴") || weather.condition.includes("cloud")
              ? "bg-gradient-to-br from-gray-200 via-slate-100 to-gray-100"
              : weather.condition.includes("雪") || weather.condition.includes("snow")
                ? "bg-gradient-to-br from-slate-100 via-blue-50 to-white"
                : "bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50"
      ) : "bg-yellow-50"
    )}>
      {/* Top Navigation - City & Weather */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img 
              src="/new-logo.jpg" 
              alt="AI 穿搭助手" 
              className="w-8 h-8 object-contain rounded-lg"
            />
            <span className="font-bold text-gray-700">AI 穿搭助手</span>
          </div>

          {/* City & Weather */}
          <div className="flex items-center gap-3">
            {/* Location Button */}
            <button
              onClick={handleLocation}
              disabled={isLocating}
              className={cn(
                "flex items-center gap-1 bg-white/70 hover:bg-white/90 rounded-xl px-3 py-1.5 text-sm text-gray-700 transition-all",
                isLocating && "opacity-70 cursor-not-allowed"
              )}
              title="获取当前位置"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              <span>{isLocating ? "定位中..." : "定位"}</span>
            </button>

            {/* City Selector with Search */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowCityDropdown(!showCityDropdown);
                  setCitySearch("");
                }}
                className="flex items-center gap-1 bg-white/70 hover:bg-white/90 rounded-xl px-3 py-1.5 text-sm text-gray-700 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>{selectedCity}</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showCityDropdown && "rotate-180")} />
              </button>

              {showCityDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg z-20 py-2 min-w-48 max-h-80 overflow-y-auto">
                  {/* Search Input */}
                  <div className="px-2 pb-2 sticky top-0 bg-white border-b border-gray-100">
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      placeholder="搜索城市..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Filtered Cities */}
                  {cities
                    .filter((city) => city.includes(citySearch))
                    .map((city) => (
                      <button
                        key={city}
                        onClick={() => handleCitySelect(city)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-yellow-100 transition-colors",
                          selectedCity === city && "bg-yellow-100 text-yellow-700 font-medium"
                        )}
                      >
                        {city}
                      </button>
                    ))}
                  
                  {/* No Results */}
                  {cities.filter((city) => city.includes(citySearch)).length === 0 && (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      未找到匹配的城市
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Weather Display */}
            {weather && (
              <div className="flex items-center gap-1.5 bg-white/70 rounded-xl px-3 py-1.5">
                {getWeatherIcon(weather.condition)}
                <span className="text-sm font-medium text-gray-700">{weather.temp}° {weather.condition}</span>
              </div>
            )}

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-white/70 hover:bg-white/90 rounded-xl px-3 py-1.5 text-sm text-gray-700 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span>{user.nickname}</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showUserMenu && "rotate-180")} />
                </button>

                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg z-20 py-2 min-w-40">
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>退出登录</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Chat Messages */}
          <div className="space-y-4">
            {chatHistory.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <img
                  src={message.role === "user" ? "/avatar_user.jpg" : "/avatar_ai.jpg"}
                  alt={message.role === "user" ? "用户" : "AI 助手"}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />

                {/* Message Content */}
                <div
                  className={cn(
                    "max-w-[75%] space-y-1.5",
                    message.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  {message.imageUrl && message.role === "user" && (
                    <img
                      src={message.imageUrl}
                      alt="穿搭照片"
                      className="w-40 h-40 object-cover rounded-2xl shadow-sm"
                    />
                  )}
                  <div
                    className={cn(
                      "rounded-xl px-4 py-2.5 shadow-md",
                      message.role === "user"
                        ? "bg-orange-100 text-orange-900 rounded-tr-sm"
                        : "bg-white text-gray-700 rounded-tl-sm"
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {currentResponse && (
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
                  <span className="text-white">🤖</span>
                </div>
                <div className="max-w-[75%]">
                  <div className="bg-white rounded-xl px-4 py-2.5 shadow-md rounded-tl-sm">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {currentResponse}
                      <span className="inline-block w-2 h-4 bg-gray-400 ml-0.5 animate-pulse" />
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>
      </main>

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-lg mx-4">
            {/* Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-2xl bg-black"
            />

            {/* Hidden Canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Controls */}
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={closeCamera}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={capturePhoto}
                className="px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold rounded-xl transition-colors"
              >
                拍摄
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Input Area */}
      <footer className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {/* Weather Initialization / Error Message */}
          {weatherLoading && (
            <div className="mb-2 text-center">
              <span className="inline-flex items-center gap-1 text-yellow-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                天气服务正在初始化中，请稍后再试
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && !weatherLoading && (
            <div className="mb-2 text-center">
              <span className="text-orange-500 text-sm">{error}</span>
            </div>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <img
                src={imagePreview}
                alt="预览"
                className="w-16 h-16 object-cover rounded-xl shadow-sm"
              />
              <button
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-end gap-2">
            {/* Image Upload Button */}
            <div className="relative">
              <button
                onClick={() => setShowImageOptions(!showImageOptions)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center text-gray-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>

              {showImageOptions && (
                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg z-20 py-2 min-w-36">
                  <button
                    onClick={openCamera}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">拍照</span>
                  </button>
                  <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer">
                    <ImageIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">从相册选择</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGallerySelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="flex-1">
              <textarea
                ref={textInputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="输入你想说的话..."
                rows={1}
                className="w-full px-4 py-2.5 bg-gray-100 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-all"
                style={{ minHeight: "42px", maxHeight: "120px" }}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isSubmitting || (!image && !inputText.trim())}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                isSubmitting || (!image && !inputText.trim())
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white hover:shadow-md"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
