// SENTINEL AI ENGINE (v3.0) - UNIVERSAL EDITION

const SENTINEL_CONFIG = {
    model: "qwen/qwen-2.5-72b-instruct", 
    apiEndpoint: "https://openrouter.ai/api/v1/chat/completions"
};

// УНИВЕРСАЛЬНЫЙ ЗАПРОС К ИИ
async function askUniversalAI(promptText, role = 'general', context = '') {
    console.log("🚀 Универсальный запрос к ИИ:", { role, promptText });
    
    const KEY = localStorage.getItem('openrouter_api_key')?.trim();
    if (!KEY) {
        alert("🔑 API ключ OpenRouter не найден! Нажмите 'СЕРВИС' → 'Ключ API'");
        throw new Error("Missing OpenRouter API Key");
    }

    // ГИБКИЕ СИСТЕМНЫЕ ИНСТРУКЦИИ ДЛЯ РАЗНЫХ РОЛЕЙ
    const roleInstructions = {
        general: `Вы — эрудированный эксперт с глубокими знаниями во многих областях. Отвечайте точно, по делу, с академической строгостью. Поддерживайте научный стиль, но будьте понятны.`,
        
        historian: `Вы — историк мирового уровня, специализирующийся на [КОНТЕКСТ]. Отвечайте как учёный: с фактами, датами, источниками. Избегайте спекуляций.`,
        
        scientist: `Вы — учёный с PhD в области [КОНТЕКСТ]. Объясняйте сложные концепции ясно, но без упрощений. Используйте научную терминологию корректно.`,
        
        philosopher: `Вы — философ, анализирующий [КОНТЕКСТ]. Рассматривайте разные точки зрения, приводите аргументы, избегайте догматизма.`,
        
        safety_engineer: `Вы — инженер по техносферной безопасности. Оценивайте риски объективно, предлагайте конкретные меры защиты, ссылайтесь на стандарты.`,
        
        architect: `Ты — медицинский архитектор. Верни ТОЛЬКО валидный JSON-массив: [{\"t\":\"Заголовок\",\"w\":1}]. Никаких пояснений.`, 
        
        editor: `Ты — врач. Верни ТОЛЬКО валидный JSON-объект: {\"Заголовок\":\"Текст\"}. Никаких пояснений.`
    };

    // Определяем инструкцию для роли
    let systemInstruction = roleInstructions[role] || roleInstructions.general;
    if (context) {
        systemInstruction = systemInstruction.replace('[КОНТЕКСТ]', context);
    }

    try {
        const response = await fetch(SENTINEL_CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.protocol === 'file:' 
                    ? 'http://localhost' 
                    : window.location.href,
                'X-Title': 'Pharma-Architect'
            },
            body: JSON.stringify({
                model: SENTINEL_CONFIG.model,
                messages: [
                    { 
                        role: "system", 
                        content: systemInstruction
                    },
                    { 
                        role: "user", 
                        content: promptText
                    }
                ],
                temperature: 0.3, // Чуть выше для творческих задач
                max_tokens: 2000
            })
        });

        const responseText = await response.text();
        if (!response.ok) {
            const errorData = JSON.parse(responseText);
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = JSON.parse(responseText);
        if (!data?.choices?.[0]?.message?.content) {
            throw new Error("Ответ ИИ не содержит данных");
        }

        return data.choices[0].message.content;
        
    } catch (e) {
        console.error("❌ UNIVERSAL AI ERROR:", e);
        alert(`Ошибка ИИ: ${e.message || "Неизвестная ошибка. Проверьте ключ и интернет."}`);
        return null;
    }
}

// СОВМЕСТИМОСТЬ СО СТАРЫМ ИНТЕРФЕЙСОМ
async function askSentinel(promptText, role) {
    if (role === 'architect' || role === 'editor') {
        // Старая функциональность для медицинских задач
        return _askMedicalAI(promptText, role);
    }
    // Новая универсальная функциональность
    return askUniversalAI(promptText, role);
}

// ВНУТРЕННЯЯ ФУНКЦИЯ ДЛЯ МЕДИЦИНСКИХ ЗАДАЧ
async function _askMedicalAI(promptText, role) {
    const KEY = localStorage.getItem('openrouter_api_key')?.trim();
    if (!KEY) throw new Error("Missing API Key");

    const systemInstructions = {
        architect: `Ты — медицинский архитектор. Верни ТОЛЬКО валидный JSON-массив: [{\"t\":\"Заголовок\",\"w\":1}]. Никаких пояснений.`,
        editor: `Ты — врач. Верни ТОЛЬКО валидный JSON-объект: {\"Заголовок\":\"Текст\"}. Никаких пояснений.`
    };

    const response = await fetch(SENTINEL_CONFIG.apiEndpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.protocol === 'file:' ? 'http://localhost' : window.location.href,
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

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Очистка и парсинг JSON
    const cleanJson = content
        .replace(/```json|```/g, "")
        .replace(/[\s\S]*?(\{.*\}|\[.*\])[\s\S]*/s, "$1")
        .trim();
    
    return JSON.parse(cleanJson);
}

// ЭКСПОРТИРУЕМ ФУНКЦИИ
window.askUniversalAI = askUniversalAI;
window.askSentinel = askSentinel;
