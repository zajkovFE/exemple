// SENTINEL AI ENGINE (v2.5) - Qwen OpenRouter Edition

const SENTINEL_CONFIG = {
    // Правильное имя модели для OpenRouter
    model: "qwen/qwen-2.5-72b-instruct", 
    // ⚠️ ИСПРАВЛЕНО: УБРАНЫ ЛИШНИЕ ПРОБЕЛЫ
    apiEndpoint: "https://openrouter.ai/api/v1/chat/completions"
};

async function askSentinel(promptText, role) {
    const KEY = localStorage.getItem('openrouter_api_key')?.trim();
    if (!KEY) {
        alert("API ключ OpenRouter не найден! Нажмите 'СЕРВИС' → 'Ключ API'");
        throw new Error("Missing OpenRouter API Key");
    }

    const systemInstructions = {
        architect: "Ты — медицинский архитектор. Верни ТОЛЬКО валидный JSON массив объектов: [{\"t\":\"Заголовок\",\"w\":1}]. Никаких пояснений, только чистый JSON.",
        editor: "Ты — врач. Верни ТОЛЬКО валидный JSON объект: {\"Заголовок\":\"Текст\"}. Никаких пояснений, только чистый JSON."
    };

    try {
        const response = await fetch(SENTINEL_CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KEY}`,
                'Content-Type': 'application/json',
                // ⚠️ ИСПРАВЛЕНО: Правильный формат Referer (без пробелов, реальный URL)
                'HTTP-Referer': window.location.href,
                'X-Title': 'Pharma-Architect'
            },
            body: JSON.stringify({
                model: SENTINEL_CONFIG.model,
                messages: [
                    { role: "system", content: systemInstructions[role] },
                    { role: "user", content: promptText }
                ],
                temperature: 0.1,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        // ⚠️ ИСПРАВЛЕНО: Надежная проверка структуры ответа
        if (!data?.choices?.[0]?.message?.content) {
            throw new Error("Некорректный ответ от ИИ: отсутствует содержимое");
        }

        const content = data.choices[0].message.content;
        
        // ⚠️ ИСПРАВЛЕНО: Надежная очистка и парсинг JSON
        const cleanJson = content
            .replace(/```json|```/g, "")
            .replace(/[\s\S]*?(\{.*\}|\[.*\])[\s\S]*/s, "$1")
            .trim();
        
        try {
            return JSON.parse(cleanJson);
        } catch (parseError) {
            console.error("❌ Ошибка парсинга JSON:", cleanJson);
            throw new Error(`ИИ вернул некорректный JSON: ${parseError.message}`);
        }

    } catch (e) {
        console.error("❌ SENTINEL CRITICAL ERROR:", e);
        alert(`Ошибка ИИ: ${e.message || "Неизвестная ошибка. Проверьте ключ и интернет."}`);
        return null;
    }
}

// Экспортируем функцию в глобальную область видимости
window.askSentinel = askSentinel;
