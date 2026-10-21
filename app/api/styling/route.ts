import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  apiKey: process.env.AI_API_KEY,
});

interface Message {
  role: "user" | "assistant";
  content: string;
  imageBase64?: string; // 用于传递历史图片的 base64 数据
}

interface RequestBody {
  messages: Message[];
  imageBase64?: string | null; // 图片可选
  weather?: {
    temp: number;
    condition: string;
    humidity: number;
  } | null;
  city?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, imageBase64, weather, city } = await request.json() as RequestBody;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "缺少对话内容" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Mock 模式：如果没有配置 API Key，返回模拟回复（用于测试）
    if (!process.env.AI_API_KEY || process.env.AI_API_KEY.length < 10) {
      const mockResponses = [
        `今天${city}天气${weather?.condition || "晴朗"}，${weather?.temp || 25}度，适合穿 ${weather?.temp && weather.temp > 28 ? "短袖+短裤" : "薄外套"}！`,
        "这套穿搭看起来很有品味！颜色搭配很和谐，建议可以尝试搭配一条亮色的配饰~",
        "约会的话推荐穿浅色连衣裙，温柔又气质！配上小高跟，氛围感拉满✨",
        "工作场合建议选择简约大方的款式，纯色衬衫+西装裤永远不会出错！",
        "周末休闲风可以试试卫衣+牛仔裤，舒适又时尚，配上小白鞋青春感十足！",
      ];
      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      
      // 模拟流式输出
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          for (const char of randomResponse) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: char } }] })}\n\n`));
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // 构建系统提示词
    const weatherInfo = weather 
      ? `当前天气：${weather.condition}，${weather.temp}度，湿度${weather.humidity}%（城市：${city || "未知"}）`
      : "天气信息未知";

    // 如果有真实天气数据，添加隐藏的系统上下文指令
    const hiddenContext = weather
      ? `\n[系统上下文：用户当前位于 ${city || "未知城市"}，实时天气为 ${weather.condition}，气温 ${weather.temp}度。请基于此真实天气数据提供穿搭建议，不要 hallucinate（编造）天气情况。如果用户问"怎么穿"或类似问题，必须结合这里的真实天气数据回答。]\n`
      : "";

    const systemPrompt = `你是一个专业的时尚造型师，一位懂生活、有品位的穿搭管家。

【当前环境】
${weatherInfo}${hiddenContext}

【核心指令】
你的任务是根据用户的文字描述、上传的照片以及当前的城市天气，提供专业且贴心的穿搭建议。

【关键规则】

1. 关于心情和场景推断：
- 不需要用户显式选择心情标签
- 请通过分析用户的文字内容（如关键词"开心"、"累"、"约会"、"上班"、"逛街"等）和图片风格，自动推断用户的情绪和场景
- 根据推断的情绪和场景调整建议的语气和风格
- 如果用户没提心情和场景，就默认以"舒适得体"为主，给出实用建议

2. 关于照片（Photo）：
- 如果用户上传了照片：请详细点评这套穿搭的优缺点，结合天气给出改进建议（可以用打分制，也可以直接说修改意见，不要固定格式）
- 点评时要真诚，像朋友一样——好的地方要夸，不好的地方要直说但委婉
- 如果用户没传照片：请根据天气和用户描述的场景，直接推荐具体的单品搭配方案，说得具体点（颜色、款式、品牌参考都可以）

3. 关于天气查询：
- 如果用户只问天气不问穿搭，也要友好回复
- 可以结合天气给出一些简单的穿搭建议

4. 关于多样性：
- 每次回答的风格不要太死板，要有变化
- 如果是纯文字咨询，可以多用反问句引导用户（"你是要去什么场合呀？"、"喜欢什么风格呢？"）
- 如果是看图说话，语气要像朋友一样真诚点评，不要太官方
- 可以适当用一些口语化的表达，让对话更自然

5. 拒绝机械回复：
- 不要每次都输出固定的格式（如固定的打分模板、固定的分段结构）
- 直接用自然流畅的中文与用户对话，像微信聊天一样
- 可以适当幽默、调侃，但最终要给出有用的建议

【语气风格】
- 专业但不高高在上
- 贴心但不啰嗦
- 可以适当毒舌吐槽，但要给解决方案
- 像一个懂穿搭的朋友在给你建议`;

    // 构建完整的消息历史
    const chatMessages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // 转换历史消息（包含历史图片）
    for (const msg of messages.slice(0, -1)) {
      if (msg.role === "user" && msg.imageBase64) {
        // 历史用户消息有图片：多模态格式
        chatMessages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${msg.imageBase64}`,
              },
            },
            {
              type: "text",
              text: msg.content,
            },
          ],
        });
      } else {
        // 纯文本消息
        chatMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // 处理最新的用户消息
    const lastMessage = messages[messages.length - 1];
    
    if (imageBase64) {
      // 有图片：多模态模式
      chatMessages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
          {
            type: "text",
            text: lastMessage.content,
          },
        ],
      });
    } else {
      // 无图片：纯文本模式
      chatMessages.push({
        role: "user",
        content: lastMessage.content,
      });
    }

    // 选择模型：有图片（当前或历史）用 VL 模型，无图片用普通文本模型
    const hasAnyImage = imageBase64 || messages.some(msg => msg.imageBase64);
    const model = hasAnyImage ? "qwen-vl-max" : "qwen-plus";

    // 调用大模型
    const completion = await openai.chat.completions.create({
      model: model,
      messages: chatMessages,
      max_tokens: 3000,
      stream: true,
    });

    // 创建 SSE 响应
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
            }
          }
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error("Stream Error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    
    let errorMessage = "服务器内部错误";
    if (error instanceof Error) {
      errorMessage = error.message;
      // 如果是 API 认证错误
      if (errorMessage.includes("Invalid API Key") || errorMessage.includes("Unauthorized") || errorMessage.includes("401")) {
        errorMessage = "API Key 无效，请检查环境变量配置。请访问 https://bailian.aliyun.com/ 申请正确的阿里云百炼 API Key";
      } else if (errorMessage.includes("timeout")) {
        errorMessage = "请求超时，请稍后重试";
      } else if (errorMessage.includes("image")) {
        errorMessage = "图片处理失败，请检查图片格式";
      }
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}