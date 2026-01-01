// SENTINEL AI ENGINE (v2.5) - Qwen OpenRouter Edition


const SENTINEL_CONFIG = {
    // Используем мощную Qwen 2.5 (или "alibaba/qwen-2-7b-instruct:free" для полной халявы)...халявы нет, есть только сила, силы нет, есть только спокойствие, спокойствия...Йода, достал уже...
   model: "qwen/qwen-2.5-72b-instruct", 
    apiVersion: "https://openrouter.ai/api/v1/chat/completions"
};

async function askSentinel(promptText, role) {
    const KEY = localStorage.getItem('openrouter_api_key')?.trim();
    if (!KEY) {
        alert("API ключ OpenRouter не найден в Сервис -> Ключ API");
        throw new Error("Missing API Key");
    }

    const systemInstructions = {
        architect: "Ты — медицинский архитектор. Верни ТОЛЬКО валидный JSON массив объектов: [{\"t\":\"Заголовок\",\"w\":1}]. Без лишнего текста.",
        editor: "Ты — врач. Верни ТОЛЬКО валидный JSON объект: {\"Заголовок\":\"Текст\"}. Без лишних слов."
    };

    try {
        const response = await fetch(SENTINEL_CONFIG.apiVersion, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://pharma-architect.local', // Требование OpenRouter
                'X-Title': 'Pharma-Architect'
            },
            body: JSON.stringify({
                model: SENTINEL_CONFIG.model,
                messages: [
                    { role: "system", content: systemInstructions[role] },
                    { role: "user", content: promptText }
                ],
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "Ошибка OpenRouter");
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Очистка от возможных markdown-тегов и парсинг
        const cleanJson = content.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanJson);

    } catch (e) {
        console.error("❌ SENTINEL CRITICAL:", e);
        alert("Ошибка ИИ: " + e.message);
        return null;
    }
}
