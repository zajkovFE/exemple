// SENTINEL AI ENGINE (v2.8) - Qwen OpenRouter Edition (ПОЛНОСТЬЮ ИСПРАВЛЕНО)

const SENTINEL_CONFIG = {
    model: "qwen/qwen-2.5-72b-instruct", 
    apiEndpoint: "https://openrouter.ai/api/v1/chat/completions" // ИСПРАВЛЕНО: убраны пробелы!
};

// УНИВЕРСАЛЬНЫЙ ЗАПРОС К ИИ
async function askSentinel(promptText, role = 'general', context = '') {
    console.log("🚀 Запуск ИИ-запроса:", { role, promptText, context });
    
    const KEY = localStorage.getItem('openrouter_api_key')?.trim();
    if (!KEY || KEY.length < 5) {
        alert("🔑 API ключ OpenRouter не найден или невалиден! Нажмите 'СЕРВИС' → 'Ключ API'");
        throw new Error("Missing or invalid OpenRouter API Key");
    }

    // СИСТЕМНЫЕ ИНСТРУКЦИИ ДЛЯ ВСЕХ РОЛЕЙ
    const systemInstructions = {
        architect: `Ты — медицинский архитектор. Верни ТОЛЬКО валидный JSON-массив объектов: [{"t":"Заголовок","w":1}]. Никакого дополнительного текста. w может быть только 1 или 2.`,
        editor: `Ты — врач. Верни ТОЛЬКО валидный JSON-объект: {"Заголовок":"Текст"}. Никакого дополнительного текста.`,
        general: `Вы — эрудированный эксперт. Отвечайте точно, по делу, с академической строгостью. Поддерживайте научный стиль, но будьте понятны.`,
        historian: `Вы — историк мирового уровня, специализирующийся на ${context || 'различных эпохах'}. Отвечайте как учёный: с фактами, датами, источниками.`,
        scientist: `Вы — учёный с PhD в области ${context || 'различных дисциплин'}. Объясняйте сложные концепции ясно, но без упрощений.`,
        philosopher: `Вы — философ, анализирующий ${context || 'фундаментальные вопросы бытия'}. Рассматривайте разные точки зрения, приводите аргументы.`,
        safety_engineer: `Вы — инженер по техносферной безопасности. Оценивайте риски объективно, предлагайте конкретные меры защиты.`
    };

    let systemInstruction = systemInstructions[role] || systemInstructions.general;

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
                    { role: "system", content: systemInstruction },
                    { role: "user", content: promptText }
                ],
                temperature: role === 'architect' || role === 'editor' ? 0.1 : 0.3,
                max_tokens: role === 'architect' || role === 'editor' ? 500 : 4000
            })
        });

        const responseText = await response.text();
        console.log("🔍 Сырой ответ от ИИ (первые 500 символов):", responseText.substring(0, 500) + '...');
        
        if (!response.ok) {
            console.error(`❌ Ошибка API ${response.status}:`, responseText);
            try {
                const errorData = JSON.parse(responseText);
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            } catch (e) {
                throw new Error(`Сервер вернул ошибку ${response.status}: ${responseText.substring(0, 300)}`);
            }
        }

        const data = JSON.parse(responseText);
        console.log("📊 Полная структура ответа:", data);
        
        let content = null;
        if (data.choices?.[0]?.message?.content) {
            content = data.choices[0].message.content.trim();
        } else if (data.data?.choices?.[0]?.message?.content) {
            content = data.data.choices[0].message.content.trim();
        } else if (data.message?.content) {
            content = data.message.content.trim();
        } else if (data.result) {
            content = data.result.trim();
        } else {
            const stringData = JSON.stringify(data);
            const textMatch = stringData.match(/"content":"([^"]+)"/);
            if (textMatch && textMatch[1]) {
                content = textMatch[1].replace(/\\n/g, '\n').trim();
            }
        }
        
        if (!content) {
            throw new Error("Ответ ИИ не содержит данных или имеет неподдерживаемый формат");
        }

        console.log("📦 Сырой контент ИИ (первые 300 символов):", content.substring(0, 300) + '...');

        if (role === 'architect' || role === 'editor') {
            return safeParseJSON(content);
        }
        
        return content;
        
    } catch (e) {
        console.error("❌ SENTINEL CRITICAL ERROR:", e);
        alert(`❌ Ошибка ИИ: ${e.message || "Неизвестная ошибка. Проверьте ключ и интернет."}`);
        
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

// --- Аварийный парсер + ограничение длины ---
function safeParseJSON(content) {
    let cleanJson = content.replace(/```(?:json)?\n?([\s\S]*?)\n?```/gi, '$1').trim();

    const jsonMatch = cleanJson.match(/(\{[\s\S]*?\}|

\[[\s\S]*?\]

)/);
    if (jsonMatch) {
        cleanJson = jsonMatch[1];
    } else {
        cleanJson = cleanJson.replace(/^[^

\[\{]+/, '').replace(/[^\]

\}]+$/, '');
    }

    try {
        let obj = JSON.parse(cleanJson);
        return limitFields(obj);
    } catch (e) {
        console.warn("❌ Ошибка парсинга JSON, пробуем исправить:", e.message);

        if (!cleanJson.endsWith("}")) {
            cleanJson = cleanJson + "}";
        }

        const quoteCount = (cleanJson.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) {
            cleanJson = cleanJson.replace(/"([^"]*)$/, '"$1"');
        }

        let obj = JSON.parse(cleanJson);
        return limitFields(obj);
    }
}

// --- Ограничение длины значений до 600 символов ---
function limitFields(obj) {
    if (typeof obj !== "object" || obj === null) return obj;

    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === "string" && obj[key].length > 600) {
            obj[key] = obj[key].substring(0, 600) + "...";
        }
    });

    return obj;
}

// СОВМЕСТИМОСТЬ СО СТАРОЙ ВЕРСИЕЙ
async function _askMedicalAI(promptText, role) {
    console.warn("⚠️ Используется устаревшая функция _askMedicalAI. Обновите вызовы на askSentinel.");
    return await askSentinel(promptText, role);
}

if (typeof window !== 'undefined') {
    window.askSentinel = askSentinel;
    window._askMedicalAI = _askMedicalAI;
}

console.log("✅ SENTINEL AI ENGINE загружен. Версия: v2.8 (ПОЛНОСТЬЮ ИСПРАВЛЕНО)"); 
console.log("💡 Доступные роли:", Object.keys({
    architect: '',
    editor: '',
    general: '',
    historian: '',
    scientist: '',
    philosopher: '',
    safety_engineer: ''
}).join(', '));
console.log("🔧 Для отладки: проверьте консоль на наличие ошибок при запросах к ИИ");
