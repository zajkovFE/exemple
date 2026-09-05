// SENTINEL AI ENGINE (v3.0) - OpenRouter Multi-Model Edition (АТТРАКТОР: авто-переключение моделей)

const SENTINEL_CONFIG = {
    // ПОРЯДОК ВАЖЕН: первая модель — основная, остальные — автоматический fallback ("аттрактор").
    // Если модель недоступна, переименована, лимитирована или провайдер лёг — система сама
    // переходит к следующей в списке без вмешательства пользователя.
    models: [
        "z-ai/glm-5.2:free",        // основная: сильная, с честным structured-output/tools
        "minimax/minimax-m3:free",  // fallback №1: большой контекст, тоже поддерживает tools
        "openrouter/free"           // fallback №2: мета-роутер, сам подбирает любую доступную бесплатную модель
    ],
    apiEndpoint: "https://openrouter.ai/api/v1/chat/completions"
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
        // Просим больше блоков и детализации
        architect: `Ты — ведущий медицинский методолог. Спроектируй подробную структуру документа. 
    Верни ТОЛЬКО JSON-массив объектов: [{"t":"Заголовок","w":1}]. 
    Используй w:2 для важных широких разделов. Создай не менее 8-10 логических блоков.`,
        editor: `Ты — опытный врач-клиницист. Твоя задача — максимально подробно и профессионально заполнить разделы. 
    Используй медицинскую терминологию, пиши развернуто. Важно: пиши ТОЛЬКО текст для блоков, без вступлений, без заголовков внутри текста и без разметки **ВВЕДЕНИЕ**. Максимум 200 слов на блок.
    Верни ТОЛЬКО JSON-объект: {"Заголовок":"Текст"}.`,
        general: `Вы — эрудированный эксперт. Отвечайте точно, по делу, с академической строгостью. Поддерживайте научный стиль, но будьте понятны.`,
        historian: `Вы — историк мирового уровня, специализирующийся на ${context || 'различных эпохах'}. Отвечайте как учёный: с фактами, датами, источниками.`,
        scientist: `Вы — учёный с PhD в области ${context || 'различных дисциплин'}. Объясняйте сложные концепции ясно, но без упрощений.`,
        philosopher: `Вы — философ, анализирующий ${context || 'фундаментальные вопросы бытия'}. Рассматривайте разные точки зрения, приводите аргументы.`,
        safety_engineer: `Вы — инженер по техносферной безопасности. Оценивайте риски объективно, предлагайте конкретные меры защиты.`
    };

    // Определяем инструкцию для роли
    let systemInstruction = systemInstructions[role] || systemInstructions.general;

    // Для architect/editor просим у моделей, которые это поддерживают, честный JSON-формат.
    // Если провайдер конкретной модели его не поддержит — он просто проигнорирует поле,
    // а старый "костыль" parseStrictJSON всё равно подстрахует на этапе разбора ответа.
    const wantsJson = (role === 'architect' || role === 'editor');

    let lastError = null;

    // === АТТРАКТОР: перебор моделей по порядку из SENTINEL_CONFIG.models ===
    for (let i = 0; i < SENTINEL_CONFIG.models.length; i++) {
        const modelId = SENTINEL_CONFIG.models[i];
        console.log(`🎯 Попытка ${i + 1}/${SENTINEL_CONFIG.models.length}: модель "${modelId}"`);

        try {
            // editor теперь вызывается пачками по несколько заголовков (см. AI_FILL_BATCH_SIZE
            // в index.html), поэтому его лимит токенов можно держать выше architect без риска
            // упереться в потолок и спровоцировать дублирование/обрезание контента
            let maxTokens = 4000;
            if (role === 'architect') maxTokens = 2000;
            if (role === 'editor') maxTokens = 3000;

            const requestBody = {
                model: modelId,
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: promptText }
                ],
                temperature: wantsJson ? 0.4 : 0.7,
                max_tokens: maxTokens
            };

            if (wantsJson) {
                requestBody.response_format = { type: "json_object" };
            }

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
                body: JSON.stringify(requestBody)
            });

            const responseText = await response.text();
            console.log(`🔍 [${modelId}] Сырой ответ (первые 500 символов):`, responseText.substring(0, 500) + '...');

            if (!response.ok) {
                console.warn(`⚠️ [${modelId}] Ошибка API ${response.status}, переключаюсь на следующую модель...`);
                try {
                    const errorData = JSON.parse(responseText);
                    lastError = new Error(errorData.error?.message || `HTTP ${response.status}`);
                } catch (e) {
                    lastError = new Error(`Сервер вернул ошибку ${response.status}: ${responseText.substring(0, 300)}`);
                }
                continue; // пробуем следующую модель в списке
            }

            const data = JSON.parse(responseText);
            console.log(`📊 [${modelId}] Полная структура ответа:`, data);

            // Попытка найти содержимое в разных форматах ответа
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
                console.warn(`⚠️ [${modelId}] Пустой/нераспознанный ответ, переключаюсь на следующую модель...`);
                lastError = new Error("Ответ ИИ не содержит данных или имеет неподдерживаемый формат");
                continue;
            }

            console.log(`📦 [${modelId}] Сырой контент (первые 300 символов):`, content.substring(0, 300) + '...');

            // Успех — если это была не первая модель в списке, сообщаем об этом мягко (без alert, чтобы не пугать)
            if (i > 0) {
                console.log(`✅ Аттрактор сработал: подключился к резервной модели "${modelId}"`);
            }

            // Для медицинских ролей - строгий JSON (старый "костяк"-парсер остаётся как подстраховка)
            if (wantsJson) {
                return parseStrictJSON(content);
            }

            return content;

        } catch (e) {
            console.warn(`⚠️ [${modelId}] Исключение при запросе, переключаюсь на следующую модель...`, e);
            lastError = e;
            continue; // пробуем следующую модель
        }
    }

    // === Если ВСЕ модели из списка не сработали ===
    console.error("❌ SENTINEL CRITICAL ERROR: все модели из списка недоступны.", lastError);
    alert(`❌ Ошибка ИИ: ни одна из моделей (${SENTINEL_CONFIG.models.join(', ')}) не ответила.\nПоследняя ошибка: ${lastError?.message || "неизвестная ошибка"}.\nПроверьте ключ и интернет.`);

    // Возвращаем тестовые данные для медицинских ролей (старый "костыль" — оставлен как есть)
    if (role === 'architect') {
        return [
            {"t": "Тестовая структура", "w": 2},
            {"t": "Диагноз", "w": 1},
            {"t": "Лечение", "w": 1}
        ];
    }
    return null;
}

// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: СТРОГИЙ ПАРСИНГ JSON (без изменений — рабочий костыль остаётся)
function parseStrictJSON(content) {
    let cleanJson = content.trim();

    // 1. Удаляем markdown-обертки
    cleanJson = cleanJson.replace(/```json|```/gi, '').trim();

    // 2. ПРОВЕРКА НА ОБРЫВ: Если JSON не закрыт, пробуем закрыть его
    if (cleanJson.startsWith('{') && !cleanJson.endsWith('}')) {
        console.warn("⚠️ Обнаружен оборванный JSON, пытаюсь восстановить...");

        // Если текст оборвался на середине слова, добавляем кавычку и скобку
        if (cleanJson.lastIndexOf('"') > cleanJson.lastIndexOf(':')) {
             cleanJson += '"';
        }
        cleanJson += '}';
    }

    try {
        return JSON.parse(cleanJson);
    } catch (e) {
        // Если даже после починки не парсится, вытаскиваем текст "грубой силой"
        console.log("🛠 Экстренное извлечение текста...");
        const match = cleanJson.match(/"[^"]+":\s*"([\s\S]*)/);
        if (match && match[1]) {
            let text = match[1].replace(/"}$/, '').trim();
            // Возвращаем объект, чтобы не ломать логику aiDirectFill
            const firstTitle = document.querySelector('.box-title')?.innerText || "Текст";
            return { [firstTitle]: text };
        }
        throw new Error("Не удалось восстановить JSON: " + e.message);
    }
}

console.log("✅ SENTINEL AI ENGINE загружен. Версия: v3.0 (МУЛЬТИМОДЕЛЬНЫЙ АТТРАКТОР)");
console.log("🎯 Цепочка моделей (по приоритету):", SENTINEL_CONFIG.models.join(" → "));
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
