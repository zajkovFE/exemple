// openai.js 
async function askOpenAI(prompt, role) {
  const KEY = localStorage.getItem('openai_api_key')?.trim();
  if (!KEY) throw new Error("OpenAI ключ не задан. Нажмите 'СЕРВИС' → 'Ключ API'.");

  const systemPrompt = {
    architect: "Ты — медицинский архитектор. Верни ТОЛЬКО валидный JSON-массив: [{\"t\":\"Заголовок\",\"w\":1}]. Никаких пояснений.",
    editor: "Ты — врач. Верни ТОЛЬКО валидный JSON-объект: {\"Заголовок\":\"Текст\"}. Никаких пояснений."
  };

  // обращение к богу..шутка, только к опен сурс...помоли...надеемся на чудо, работай
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo-0125",
      messages: [
        { role: "system", content: systemPrompt[role] },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 500
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  return JSON.parse(data.choices[0].message.content);
}
