// qwen.js — резервный ИИ
async function askQwen(prompt, role) {
  const KEY = localStorage.getItem('qwen_api_key')?.trim();
  if (!KEY) {
    console.warn("⚠️ Qwen API key не задан. Пропускаю fallback.");
    return null;
  }

  const systemPrompt = {
    architect: "Ты — медицинский архитектор. Верни ТОЛЬКО валидный JSON-массив: [{\"t\":\"Заголовок\",\"w\":1}]. Никаких пояснений.",
    editor: "Ты — врач. Верни ТОЛЬКО валидный JSON-объект: {\"Заголовок\":\"Текст\"}. Никаких пояснений."
  };

  try {
    const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen-turbo", // быстрый и дешёвый
        input: {
          messages: [
            { role: "system", content: systemPrompt[role] },
            { role: "user", content: prompt }
          ]
        },
        parameters: {}
      })
    });

    const data = await response.json();

    if (data.code !== 200) {
      throw new Error(`Qwen Error ${data.code}: ${data.message}`);
    }

    const text = data.output.choices[0].message.content;
    // Очистка от пояснений, markdown
    const jsonStr = text
      .replace(/```json|```/g, "")
      .replace(/.*?(\[.*\]|\{.*\}).*/s, "$1") // вытаскиваем первый JSON
      .trim();

    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("⚠️ Qwen fallback failed:", e.message);
    return null;
  }
}
