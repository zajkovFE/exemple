// SENTINEL AI ENGINE (v2.6) - Qwen OpenRouter Edition (FIXED JSON OUTPUT)

const SENTINEL_CONFIG = {
    model: "qwen/qwen-2.5-72b-instruct", 
    apiEndpoint: "https://openrouter.ai/api/v1/chat/completions"
};

async function askSentinel(promptText, role) {
    console.log("🚀 Запуск ИИ-запроса:", { role, promptText });
    
    const KEY = localStorage.getItem('openrouter_api_key')?.trim();
    if (!KEY) {
        alert("🔑 API ключ OpenRouter не найден! Нажмите 'СЕРВИС' → 'Ключ API'");
        throw new Error("Missing OpenRouter API Key");
    }

    // УЛУЧШЕННЫЕ СИСТЕМНЫЕ ИНСТРУКЦИИ С ГАРАНТИРОВАННЫМ JSON
    const systemInstructions = {
        architect: `Ты — медицинский архитектор. СТРОГО СЛЕДУЙ ПРАВИЛАМ:
1. ВЕРНИ ТОЛЬКО ЧИСТЫЙ JSON-МАССИВ БЕЗ КАКИХ-ЛИБО ДОПОЛНИТЕЛЬНЫХ СИМВОЛОВ
2. Формат: [{"t":"Заголовок 1","w":1},{"t":"Заголовок 2","w":2}]
3. w может быть только 1 или 2
4. НИКАКИХ ПОЯСНЕНИЙ, КОММЕНТАРИЕВ, MARKDOWN, ТЕКСТА ДО И ПОСЛЕ JSON
5. Если не можешь создать структуру — верни пустой массив []

Пример правильного ответа:
[{"t":"Анамнез","w":2},{"t":"Диагноз","w":1}]`,

        editor: `Ты — врач-клиницист. СТРОГО СЛЕДУЙ ПРАВИЛАМ:
1. ВЕРНИ ТОЛЬКО ЧИСТЫЙ JSON-ОБЪЕКТ БЕЗ КАКИХ-ЛИБО ДОПОЛНИТЕЛЬНЫХ СИМВОЛОВ
2. Формат: {"Заголовок 1":"Текст 1","Заголовок 2":"Текст 2"}
3. Ключи должны точно совпадать с названиями разделов
4. НИКАКИХ ПОЯСНЕНИЙ, КОММЕНТАРИЕВ, MARKDOWN, ТЕКСТА ДО И ПОСЛЕ JSON
5. Если не можешь заполнить — верни пустой объект {}

Пример правильного ответа:
{"Анамнез":"Пациент 45 лет, жалобы на головную боль...", "Диагноз":"Артериальная гипертензия"}`
    };

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
                        content: systemInstructions[role] 
                    },
                    { 
                        role: "user", 
                        content: `ЗАПРОС: ${promptText}\n\nВЕРНИ ТОЛЬКО JSON БЕЗ КАКОГО-ЛИБО ДОПОЛНИТЕЛЬНОГО ТЕКСТА` 
                    }
                ],
                temperature: 0.1,
                max_tokens: 1000
            })
        });

        // ДЕТАЛЬНАЯ ОТЛАДКА ОТВЕТА
        const responseText = await response.text();
        console.log("🔍 Сырой ответ от ИИ:", responseText);
        
        if (!response.ok) {
            try {
                const errorData = JSON.parse(responseText);
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            } catch (e) {
                throw new Error(`Сервер вернул ошибку: ${responseText.substring(0, 200)}`);
            }
        }

        const data = JSON.parse(responseText);
        
        if (!data?.choices?.[0]?.message?.content) {
            throw new Error("Ответ ИИ не содержит данных для обработки");
        }

        let content = data.choices[0].message.content.trim();
        console.log("📦 Сырой контент ИИ:", content);

        // УЛУЧШЕННАЯ ОЧИСТКА И ПАРСИНГ JSON
        let cleanJson = content;
        
        // Шаг 1: Удаляем markdown-блоки кода
        cleanJson = cleanJson.replace(/```(?:json)?\n?([\s\S]*?)\n?```/gi, '$1');
        
        // Шаг 2: Ищем первый валидный JSON-объект или массив
        const jsonMatch = cleanJson.match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/);
        if (jsonMatch) {
            cleanJson = jsonMatch[1];
        } else {
            // Если не нашли JSON - пытаемся очистить от текста
            cleanJson = cleanJson
                .replace(/^[^\[\{]+/, '')  // Удаляем текст до [
                .replace(/[^\]\}]+$/, '');  // Удаляем текст после ]
        }
        
        cleanJson = cleanJson.trim();
        console.log("🧹 Очищенный JSON:", cleanJson);

        // Шаг 3: Проверяем валидность перед парсингом
        if (!cleanJson || (cleanJson[0] !== '[' && cleanJson[0] !== '{')) {
            throw new Error(`Некорректный формат JSON. Ответ ИИ: ${content.substring(0, 200)}`);
        }

        try {
            const result = JSON.parse(cleanJson);
            console.log("✅ Успешно распарсен JSON:", result);
            
            // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА ДЛЯ АРХИТЕКТОРА
            if (role === 'architect') {
                if (!Array.isArray(result)) {
                    throw new Error("ИИ вернул не массив для архитектора");
                }
                result.forEach((item, index) => {
                    if (!item.t || typeof item.t !== 'string') {
                        console.warn(`⚠️ Исправлен некорректный заголовок в элементе ${index}`);
                        item.t = `Раздел ${index + 1}`;
                    }
                    item.w = item.w === 2 ? 2 : 1; // w может быть только 1 или 2
                });
            }
            
            return result;
        } catch (parseError) {
            console.error("❌ Ошибка парсинга JSON:", parseError);
            console.error("❌ Проблемный контент:", cleanJson);
            throw new Error(`ИИ вернул некорректный JSON: ${parseError.message}. Попробуйте уточнить запрос.`);
        }

    } catch (e) {
        console.error("❌ SENTINEL CRITICAL ERROR:", e);
        console.error("🛠️ Для отладки сохраните этот лог и отправьте разработчику");
        alert(`❌ Ошибка ИИ: ${e.message || "Произошла неизвестная ошибка"}`);
        
        // Возвращаем тестовые данные для отладки
        if (role === 'architect') {
            return [
                {"t": "Тестовая структура", "w": 2},
                {"t": "Диагноз", "w": 1},
                {"t": "Лечение", "w": 1}
            ];
        }
        return null;
    }
}

// Экспортируем функцию
window.askSentinel = askSentinel;

console.log("✅ SENTINEL AI ENGINE загружен. Версия: v2.6 (FIXED JSON)");
