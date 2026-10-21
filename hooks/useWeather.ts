"use client";

import { useState, useEffect, useCallback } from "react";

export interface Weather {
  temp: number;
  condition: string;
  humidity: number;
  icon?: string;
}

interface UseWeatherOptions {
  apiKey: string;
}

export function useWeather(cityName: string, options: UseWeatherOptions) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!cityName) return;

    setLoading(true);
    setError(null);

    try {
      // 直接调用后端 API，传递城市名（后端会处理真实数据或 Mock）
      const weatherResponse = await fetch(`/api/weather?city=${encodeURIComponent(cityName)}`);
      
      if (!weatherResponse.ok) {
        const errorData = await weatherResponse.json();
        throw new Error(errorData.error || "获取天气数据失败");
      }

      const weatherData = await weatherResponse.json();

      setWeather({
        temp: weatherData.temp,
        condition: weatherData.desc,
        humidity: weatherData.humidity,
      });

      console.log(`Weather loaded for ${cityName}: ${weatherData.temp}°C ${weatherData.desc}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "获取天气失败";
      setError(errorMessage);
      console.error("Weather API Error:", err);
    } finally {
      setLoading(false);
    }
  }, [cityName]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  return { weather, loading, error, refetch: fetchWeather };
}

// 中国主要城市列表（包含地级市、县级市和部分区县）
export const cities: string[] = [
  // 直辖市
  "北京", "上海", "广州", "深圳", "天津", "重庆",
  
  // 华北地区
  "石家庄", "太原", "呼和浩特", "唐山", "秦皇岛", "邯郸", "邢台", "保定", "张家口", "承德", "沧州", "廊坊", "衡水",
  "大同", "阳泉", "长治", "晋城", "朔州", "晋中", "运城", "忻州", "临汾", "吕梁",
  "包头", "乌海", "赤峰", "通辽", "鄂尔多斯", "呼伦贝尔", "巴彦淖尔", "乌兰察布",
  
  // 东北地区
  "沈阳", "大连", "长春", "哈尔滨", "鞍山", "抚顺", "本溪", "丹东", "锦州", "营口", "阜新", "辽阳", "盘锦", "铁岭", "朝阳", "葫芦岛",
  "吉林", "四平", "辽源", "通化", "白山", "松原", "白城",
  "齐齐哈尔", "鸡西", "鹤岗", "双鸭山", "大庆", "伊春", "佳木斯", "七台河", "牡丹江", "黑河", "绥化",
  
  // 华东地区
  "南京", "苏州", "无锡", "常州", "镇江", "扬州", "泰州", "南通", "盐城", "淮安", "宿迁", "连云港",
  "杭州", "宁波", "温州", "嘉兴", "湖州", "绍兴", "金华", "衢州", "舟山", "台州", "丽水",
  "合肥", "芜湖", "蚌埠", "淮南", "马鞍山", "淮北", "铜陵", "安庆", "黄山", "滁州", "阜阳", "宿州", "六安", "亳州", "池州", "宣城",
  "福州", "厦门", "莆田", "三明", "泉州", "漳州", "南平", "龙岩", "宁德",
  "南昌", "景德镇", "萍乡", "九江", "新余", "鹰潭", "赣州", "吉安", "宜春", "抚州", "上饶",
  "济南", "青岛", "淄博", "枣庄", "东营", "烟台", "潍坊", "济宁", "泰安", "威海", "日照", "临沂", "德州", "聊城", "滨州", "菏泽",
  
  // 中南地区
  "郑州", "开封", "洛阳", "平顶山", "安阳", "鹤壁", "新乡", "焦作", "濮阳", "许昌", "漯河", "三门峡", "南阳", "商丘", "信阳", "周口", "驻马店",
  "武汉", "黄石", "十堰", "宜昌", "襄阳", "鄂州", "荆门", "孝感", "荆州", "黄冈", "咸宁", "随州",
  "长沙", "株洲", "湘潭", "衡阳", "邵阳", "岳阳", "常德", "张家界", "益阳", "郴州", "永州", "怀化", "娄底",
  "广州", "韶关", "深圳", "珠海", "汕头", "佛山", "江门", "湛江", "茂名", "肇庆", "惠州", "梅州", "汕尾", "河源", "阳江", "清远", "东莞", "中山", "潮州", "揭阳", "云浮",
  "南宁", "柳州", "桂林", "梧州", "北海", "防城港", "钦州", "贵港", "玉林", "百色", "贺州", "河池", "来宾", "崇左",
  
  // 西南地区
  "成都", "自贡", "攀枝花", "泸州", "德阳", "绵阳", "广元", "遂宁", "内江", "乐山", "南充", "眉山", "宜宾", "广安", "达州", "雅安", "巴中", "资阳",
  "贵阳", "六盘水", "遵义", "安顺", "毕节", "铜仁",
  "昆明", "曲靖", "玉溪", "保山", "昭通", "丽江", "普洱", "临沧",
  "拉萨", "日喀则", "昌都", "林芝",
  
  // 西北地区
  "西安", "铜川", "宝鸡", "咸阳", "渭南", "延安", "汉中", "榆林", "安康", "商洛",
  "兰州", "嘉峪关", "金昌", "白银", "天水", "武威", "张掖", "平凉", "酒泉", "庆阳", "定西", "陇南",
  "西宁", "海东",
  "银川", "石嘴山", "吴忠", "固原", "中卫",
  "乌鲁木齐", "克拉玛依", "吐鲁番", "哈密",
  
  // 港澳台
  "香港", "澳门", "台北", "高雄", "台中", "台南",
  
  // 著名区县
  "朝阳区", "海淀区", "西城区", "东城区", "丰台区", "石景山区", "通州区", "顺义区", "昌平区", "大兴区",
  "浦东新区", "徐汇区", "黄浦区", "静安区", "长宁区", "普陀区", "虹口区", "杨浦区", "闵行区", "宝山区",
  "天河区", "越秀区", "海珠区", "白云区", "番禺区", "花都区", "南沙区",
  "福田区", "罗湖区", "南山区", "宝安区", "龙岗区", "龙华区", "光明区",
  "西湖区", "拱墅区", "滨江区", "萧山区", "余杭区",
  "锦江区", "青羊区", "武侯区", "成华区", "金牛区", "高新区",
  "武昌区", "汉口", "汉阳", "江岸区", "江汉区", "硚口区",
  "雁塔区", "未央区", "碑林区", "莲湖区",
  "玄武区", "秦淮区", "鼓楼区", "建邺区",
  "渝中区", "江北区", "南岸区", "九龙坡区", "沙坪坝区",
  
  // 旅游城市
  "三亚", "丽江", "桂林", "张家界", "九寨沟", "黄山", "鼓浪屿", "乌镇", "西塘", "周庄", "凤凰古城", "阳朔", "大理", "西双版纳",
];

// 获取城市名称（保持兼容）
export function getCityCode(cityName: string): string {
  return cityName;
}