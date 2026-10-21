import { NextRequest, NextResponse } from "next/server";

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

console.log('OpenWeatherMap API Key loaded:', OPENWEATHER_API_KEY ? `***${OPENWEATHER_API_KEY.substring(0, 5)}` : 'NOT SET');

interface OpenWeatherResponse {
  name: string;
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    description: string;
  }>;
}

interface GeocodeResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

// 天气描述映射
const descMap: Record<string, string> = {
  "clear sky": "晴朗",
  "few clouds": "少云",
  "scattered clouds": "多云",
  "broken clouds": "阴天",
  "overcast clouds": "阴天",
  "shower rain": "阵雨",
  "rain": "小雨",
  "light rain": "小雨",
  "moderate rain": "中雨",
  "heavy intensity rain": "大雨",
  "very heavy rain": "暴雨",
  "extreme rain": "特大暴雨",
  "freezing rain": "冻雨",
  "thunderstorm": "雷阵雨",
  "thunderstorm with light rain": "雷阵雨伴小雨",
  "thunderstorm with rain": "雷阵雨伴中雨",
  "thunderstorm with heavy rain": "雷阵雨伴大雨",
  "light snow": "小雪",
  "snow": "中雪",
  "heavy snow": "大雪",
  "sleet": "雨夹雪",
  "mist": "薄雾",
  "fog": "雾",
  "haze": "霾",
  "dust": "浮尘",
  "sand": "沙尘",
  "smoke": "烟雾",
  "tornado": "龙卷风",
  "squalls": "狂风",
};

// 使用地理编码 API 将城市名转换为经纬度
async function geocodeCity(cityName: string): Promise<GeocodeResult | null> {
  if (!OPENWEATHER_API_KEY) {
    console.error("No API Key for geocoding");
    return null;
  }
  
  try {
    // 尝试多种搜索方式
    const searchQueries = [
      `${encodeURIComponent(cityName)},CN`,  // 中国城市
      `${encodeURIComponent(cityName)}`,      // 直接搜索
    ];
    
    for (const query of searchQueries) {
      const url = `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${OPENWEATHER_API_KEY}`;
      console.log(`Geocoding URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`Geocoding API responded with ${response.status}`);
        continue;
      }
      
      const results: GeocodeResult[] = await response.json();
      console.log(`Geocoding results for ${query}:`, results);
      
      // 优先选择中国的结果
      const chinaResult = results.find(r => r.country === 'CN');
      if (chinaResult) {
        return chinaResult;
      }
      
      // 如果没有中国结果，返回第一个结果
      if (results.length > 0) {
        return results[0];
      }
    }
    
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// 获取真实天气数据
async function fetchRealWeather(lat: number, lon: number): Promise<{ city: string; temp: number; desc: string; humidity: number } | null> {
  if (!OPENWEATHER_API_KEY) {
    console.error("No API Key for weather");
    return null;
  }
  
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_cn`;
    console.log(`Weather API URL: ${url}`);
    
    const response = await fetch(url, {
      next: { revalidate: 300 }, // 缓存 5 分钟
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Weather API responded with ${response.status}`);
      const errorText = await response.text();
      console.error(`Weather API error response: ${errorText}`);
      return null;
    }
    
    const data: OpenWeatherResponse = await response.json();
    console.log(`Weather API response:`, data);
    
    const descLower = data.weather[0]?.description?.toLowerCase() || "";
    const descZh = descMap[descLower] || data.weather[0]?.description || "未知";
    
    return {
      city: data.name,
      temp: Math.round(data.main.temp),
      desc: descZh,
      humidity: data.main.humidity,
    };
  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const city = searchParams.get("city");

    console.log(`Weather request: lat=${lat}, lon=${lon}, city=${city}`);

    // 优先使用经纬度获取真实天气
    if (lat && lon) {
      console.log(`Fetching real weather for coordinates: lat=${lat}, lon=${lon}`);
      
      const weatherData = await fetchRealWeather(parseFloat(lat), parseFloat(lon));
      if (weatherData) {
        console.log(`Real weather fetched: ${weatherData.city} ${weatherData.temp}°C ${weatherData.desc}`);
        return NextResponse.json(weatherData);
      }
      
      // 如果真实 API 失败，返回错误而不是 Mock 数据
      return NextResponse.json({
        error: "无法获取该位置的天气数据，请检查 API Key 或稍后重试",
        city: "未知位置",
        temp: 0,
        desc: "未知",
        humidity: 0,
      }, { status: 500 });
    }

    // 如果只有城市名，先尝试地理编码获取真实天气
    if (city) {
      console.log(`Fetching real weather for city: ${city}`);
      
      // 1. 先尝试地理编码
      const geocodeResult = await geocodeCity(city);
      if (geocodeResult) {
        console.log(`Geocoded ${city} to: lat=${geocodeResult.lat}, lon=${geocodeResult.lon}, name=${geocodeResult.name}`);
        
        // 2. 使用经纬度获取真实天气
        const weatherData = await fetchRealWeather(geocodeResult.lat, geocodeResult.lon);
        if (weatherData) {
          console.log(`Real weather fetched: ${weatherData.city} ${weatherData.temp}°C ${weatherData.desc}`);
          return NextResponse.json(weatherData);
        }
      }
      
      // 如果地理编码失败，尝试直接用城市名搜索
      // OpenWeatherMap 也支持直接用城市名查询
      if (OPENWEATHER_API_KEY) {
        try {
          const directUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},CN&appid=${OPENWEATHER_API_KEY}&units=metric&lang=zh_cn`;
          console.log(`Direct city search URL: ${directUrl}`);
          
          const response = await fetch(directUrl, {
            next: { revalidate: 300 },
          });
          
          if (response.ok) {
            const data: OpenWeatherResponse = await response.json();
            console.log(`Direct city search result:`, data);
            
            // 修复中文乱码问题 - 使用 descMap 映射而不是直接使用 API 返回的中文
            const descLower = data.weather[0]?.description?.toLowerCase() || "";
            const descZh = descMap[descLower] || data.weather[0]?.description || "未知";
            
            return NextResponse.json({
              city: data.name,
              temp: Math.round(data.main.temp),
              desc: descZh,
              humidity: data.main.humidity,
            });
          }
        } catch (error) {
          console.error("Direct city search error:", error);
        }
      }
      
      // 所有真实 API 都失败，返回 Mock 数据作为备用
      console.warn(`Failed to fetch real weather for city: ${city}, using mock data`);
      const mockData = getMockWeather(city);
      return NextResponse.json({
        city: mockData.city,
        temp: mockData.temp,
        desc: mockData.desc,
        humidity: mockData.humidity,
        source: "mock",
      });
    }
    
    return NextResponse.json(
      { error: "缺少经纬度或城市名参数" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Weather API Error:", error);
    
    return NextResponse.json(
      { error: "获取天气信息失败，请稍后重试" },
      { status: 500 }
    );
  }
}

// Mock 天气数据（作为备用）
function getMockWeather(cityName: string): { city: string; temp: number; desc: string; humidity: number } {
  const mockWeatherData: Record<string, { temp: number; desc: string; humidity: number }> = {
    "北京": { temp: 30, desc: "晴朗", humidity: 45 },
    "上海": { temp: 28, desc: "多云", humidity: 65 },
    "广州": { temp: 32, desc: "小雨", humidity: 75 },
    "深圳": { temp: 31, desc: "晴朗", humidity: 70 },
    "成都": { temp: 25, desc: "阴天", humidity: 80 },
    "杭州": { temp: 27, desc: "多云", humidity: 60 },
    "武汉": { temp: 29, desc: "晴朗", humidity: 55 },
    "西安": { temp: 26, desc: "少云", humidity: 40 },
    "南京": { temp: 28, desc: "小雨", humidity: 70 },
    "苏州": { temp: 27, desc: "多云", humidity: 65 },
    "重庆": { temp: 33, desc: "阴天", humidity: 85 },
    "天津": { temp: 29, desc: "晴朗", humidity: 50 },
    "郑州": { temp: 31, desc: "少云", humidity: 45 },
    "长沙": { temp: 30, desc: "阵雨", humidity: 75 },
    "青岛": { temp: 25, desc: "多云", humidity: 60 },
    "沈阳": { temp: 24, desc: "晴朗", humidity: 40 },
    "大连": { temp: 23, desc: "少云", humidity: 55 },
    "哈尔滨": { temp: 22, desc: "多云", humidity: 50 },
    "长春": { temp: 21, desc: "晴朗", humidity: 45 },
    "石家庄": { temp: 28, desc: "阴天", humidity: 60 },
    "太原": { temp: 26, desc: "晴朗", humidity: 45 },
    "呼和浩特": { temp: 24, desc: "少云", humidity: 35 },
    "济南": { temp: 28, desc: "多云", humidity: 55 },
    "合肥": { temp: 27, desc: "小雨", humidity: 70 },
    "福州": { temp: 31, desc: "阵雨", humidity: 75 },
    "厦门": { temp: 30, desc: "晴朗", humidity: 70 },
    "南昌": { temp: 29, desc: "多云", humidity: 65 },
    "南宁": { temp: 32, desc: "小雨", humidity: 80 },
    "海口": { temp: 33, desc: "阵雨", humidity: 85 },
    "三亚": { temp: 34, desc: "晴朗", humidity: 75 },
    "贵阳": { temp: 23, desc: "阴天", humidity: 85 },
    "昆明": { temp: 22, desc: "晴朗", humidity: 55 },
    "拉萨": { temp: 18, desc: "晴朗", humidity: 30 },
    "乌鲁木齐": { temp: 25, desc: "少云", humidity: 35 },
    "兰州": { temp: 24, desc: "多云", humidity: 45 },
    "西宁": { temp: 18, desc: "晴朗", humidity: 40 },
    "银川": { temp: 26, desc: "少云", humidity: 45 },
    "香港": { temp: 32, desc: "多云", humidity: 80 },
    "澳门": { temp: 32, desc: "晴朗", humidity: 75 },
    "台北": { temp: 29, desc: "阵雨", humidity: 70 },
    "高雄": { temp: 30, desc: "多云", humidity: 75 },
    "台中": { temp: 28, desc: "少云", humidity: 65 },
    "朝阳区": { temp: 30, desc: "晴朗", humidity: 45 },
    "海淀区": { temp: 29, desc: "少云", humidity: 48 },
    "浦东新区": { temp: 28, desc: "多云", humidity: 65 },
    "天河区": { temp: 32, desc: "小雨", humidity: 75 },
    "南山区": { temp: 31, desc: "晴朗", humidity: 70 },
    "西湖区": { temp: 27, desc: "多云", humidity: 60 },
    "锦江区": { temp: 25, desc: "阴天", humidity: 80 },
    "武昌区": { temp: 29, desc: "晴朗", humidity: 55 },
    "雁塔区": { temp: 26, desc: "少云", humidity: 40 },
    "玄武区": { temp: 28, desc: "小雨", humidity: 70 },
    "渝中区": { temp: 33, desc: "阴天", humidity: 85 },
    "丽江": { temp: 20, desc: "晴朗", humidity: 50 },
    "桂林": { temp: 28, desc: "多云", humidity: 70 },
    "张家界": { temp: 25, desc: "阵雨", humidity: 75 },
    "九寨沟": { temp: 18, desc: "晴朗", humidity: 60 },
    "黄山": { temp: 22, desc: "多云", humidity: 55 },
    "鼓浪屿": { temp: 30, desc: "少云", humidity: 70 },
    "乌镇": { temp: 26, desc: "小雨", humidity: 75 },
    "西塘": { temp: 26, desc: "阴天", humidity: 70 },
    "周庄": { temp: 27, desc: "多云", humidity: 65 },
    "凤凰古城": { temp: 28, desc: "阵雨", humidity: 75 },
    "阳朔": { temp: 30, desc: "晴朗", humidity: 75 },
    "大理": { temp: 21, desc: "晴朗", humidity: 55 },
    "西双版纳": { temp: 32, desc: "小雨", humidity: 85 },
  };

  const data = mockWeatherData[cityName];
  if (data) {
    return { city: cityName, ...data };
  }

  // 如果找不到对应城市，随机生成一个合理的天气
  const randomTemp = Math.floor(Math.random() * 15) + 20;
  const conditions = ["晴朗", "多云", "少云", "阴天", "小雨", "阵雨"];
  const randomDesc = conditions[Math.floor(Math.random() * conditions.length)];
  const randomHumidity = Math.floor(Math.random() * 40) + 40;

  return {
    city: cityName,
    temp: randomTemp,
    desc: randomDesc,
    humidity: randomHumidity,
  };
}