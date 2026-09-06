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
    // Отдельная цепочка для роли "organizer" (кнопка "✨ Причесать"): DeepSeek сильнее в
    // аккуратной реорганизации/сопоставлении уже готового текста заголовкам. Если он недоступен —
    // откатываемся на основную цепочку, чтобы кнопка всё равно работала.
    organizerModels: [
        "deepseek/deepseek-v4-flash:free",
        "z-ai/glm-5.2:free",
        "minimax/minimax-m3:free",
        "openrouter/free"
    ],
    apiEndpoint: "https://openrouter.ai/api/v1/chat/completions"
};

// УНИВЕРСАЛЬНЫЙ ЗАПРОС К ИИ
// expectedKeys — заголовки, которые ОБЯЗАНЫ быть в ответе (текущая пачка/весь холст),
// нужны только как подсказка аварийному фолбэку parseStrictJSON при поломанном JSON
async function askSentinel(promptText, role = 'general', context = '', expectedKeys = []) {
    console.log("🚀 Запуск ИИ-запроса:", { role, promptText, context, expectedKeys });

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
        organizer: `Ты — редактор-корректор медицинского документа. Тебе дают набор заголовков и уже существующий текст под каждым из них — часть текста могла случайно попасть не в свой раздел из-за технического сбоя.
    Твоя задача: сопоставить каждый фрагмент правильному заголовку. НИЧЕГО не придумывай и не добавляй новых фактов — только переставляй и, если нужно, аккуратно разделяй уже имеющийся текст между разделами.
    Верни ТОЛЬКО JSON-объект вида {"Заголовок":"Текст"} — по одному ключу на каждый заголовок из списка, без пропусков.`,
        physician: `Ты — практикующий врач-клиницист, составляющий подробную ИСТОРИЮ БОЛЕЗНИ для учебных целей.
    Важно: пациент и случай — синтетические, учебные, ты НЕ описываешь реального человека и НЕ ссылаешься на конкретные внешние источники или сайты (у тебя нет доступа в интернет — любая ссылка на источник была бы выдумкой).
    Пиши максимально подробно и клинически достоверно, соблюдая стандартную структуру истории болезни там, где это уместно для заданных заголовков:
    — Жалобы (основные и дополнительные, с деталями: локализация, характер, длительность, что провоцирует/облегчает);
    — Анамнез заболевания (начало, динамика, обращения за помощью, проведённое лечение и его эффект);
    — Анамнез жизни (перенесённые заболевания, наследственность, вредные привычки, аллергоанамнез — где уместно);
    — Объективный статус (по органам и системам, конкретные показатели: АД, ЧСС, температура, лабораторные и инструментальные значения — правдоподобные, в пределах реальных клинических диапазонов);
    — Обоснование диагноза со ссылкой на критерии МКБ-10/МКБ-11/DSM (если применимо для данной специальности);
    — Дифференциальная диагностика (конкретные альтернативы и почему они исключены);
    — План обследования и лечения (конкретные препараты, дозировки, схемы — с пометкой, что это учебный пример, а не назначение реальному пациенту);
    — Прогноз и рекомендации.
    Пиши развёрнуто и по существу, без "воды" и без вступлений — только содержательный текст для блока. Ограничения на количество слов нет, но не повторяй одну мысль разными словами.
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
    const wantsJson = (role === 'architect' || role === 'editor' || role === 'organizer' || role === 'physician');

    let lastError = null;

    // Для organizer — своя цепочка моделей (с DeepSeek первым), для всех остальных — основная
    const modelChain = (role === 'organizer') ? SENTINEL_CONFIG.organizerModels : SENTINEL_CONFIG.models;

    // === АТТРАКТОР: перебор моделей по порядку из выбранной цепочки ===
    for (let i = 0; i < modelChain.length; i++) {
        const modelId = modelChain[i];
        console.log(`🎯 Попытка ${i + 1}/${modelChain.length}: модель "${modelId}"`);

        try {
            // editor вызывается пачками по несколько заголовков (см. AI_FILL_BATCH_SIZE в index.html),
            // organizer обрабатывает весь холст целиком за один проход — обоим нужен запас токенов
            let maxTokens = 4000;
            if (role === 'architect') maxTokens = 2000;
            if (role === 'editor') maxTokens = 3000;
            if (role === 'organizer') maxTokens = 4000;
            if (role === 'physician') maxTokens = 4000;

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
                return parseStrictJSON(content, expectedKeys);
            }

            return content;

        } catch (e) {
            console.warn(`⚠️ [${modelId}] Исключение при запросе, переключаюсь на следующую модель...`, e);
            lastError = e;
            continue; // пробуем следующую модель
        }
    }

    // === Если ВСЕ модели из выбранной цепочки не сработали ===
    console.error("❌ SENTINEL CRITICAL ERROR: все модели из списка недоступны.", lastError);
    alert(`❌ Ошибка ИИ: ни одна из моделей (${modelChain.join(', ')}) не ответила.\nПоследняя ошибка: ${lastError?.message || "неизвестная ошибка"}.\nПроверьте ключ и интернет.`);

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

// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: СТРОГИЙ ПАРСИНГ JSON
// expectedKeys — заголовки текущей пачки/холста. Используются ТОЛЬКО как подсказка на
// самый крайний случай, если вообще ничего не удалось распознать — раньше тут всегда
// брался document.querySelector('.box-title') (первый заголовок на всей странице),
// из-за чего текст непарсящейся пачки улетал в чужой, самый первый блок документа.
function parseStrictJSON(content, expectedKeys = []) {
    let cleanJson = content.trim();

    // 1. Удаляем markdown-обертки
    cleanJson = cleanJson.replace(/```json|```/gi, '').trim();

    // 2. Попытка обычного парсинга как есть
    try {
        return JSON.parse(cleanJson);
    } catch (e) {
        // идём дальше к попыткам восстановления
    }

    // 3. ПРОВЕРКА НА ОБРЫВ: если JSON не закрыт, пробуем закрыть его и распарсить снова
    if (cleanJson.startsWith('{') && !cleanJson.endsWith('}')) {
        console.warn("⚠️ Обнаружен оборванный JSON, пытаюсь восстановить...");
        let repaired = cleanJson;
        if (repaired.lastIndexOf('"') > repaired.lastIndexOf(':')) {
            repaired += '"';
        }
        repaired += '}';
        try {
            return JSON.parse(repaired);
        } catch (e) {
            // идём дальше
        }
    }

    // 4. МНОГОКЛЮЧЕВОЕ ВОССТАНОВЛЕНИЕ: вытаскиваем ВСЕ пары "заголовок":"текст" через regex,
    // а не только первую. Так частично битый JSON с несколькими ключами восстановится
    // почти полностью, а не схлопнется в один блок.
    const pairRegex = /"((?:[^"\\]|\\.)+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    const recovered = {};
    let match;
    let foundCount = 0;
    while ((match = pairRegex.exec(cleanJson)) !== null) {
        const key = match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
        const value = match[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
        recovered[key] = value;
        foundCount++;
    }
    if (foundCount > 0) {
        console.warn(`⚠️ JSON был повреждён, но через regex восстановлено пар "заголовок→текст": ${foundCount}`);
        return recovered;
    }

    // 5. КРАЙНИЙ СЛУЧАЙ: вообще ни одной пары не распознано — сливаем весь текст
    // в ПЕРВЫЙ ЗАГОЛОВОК ТЕКУЩЕЙ ПАЧКИ (expectedKeys), а не в первый на всей странице
    console.warn("🛠 Экстренное извлечение текста — ни один ключ не распознан regex'ом...");
    const looseMatch = cleanJson.match(/"[^"]+":\s*"([\s\S]*)/);
    if (looseMatch && looseMatch[1]) {
        let text = looseMatch[1].replace(/"}$/, '').trim();
        const fallbackTitle = (expectedKeys && expectedKeys[0])
            || document.querySelector('.box-title')?.innerText
            || "Текст";
        console.warn(`🛠 Весь текст этой пачки отнесён к заголовку: "${fallbackTitle}"`);
        return { [fallbackTitle]: text };
    }

    throw new Error("Не удалось восстановить JSON ни одним из способов");
}

console.log("✅ SENTINEL AI ENGINE загружен. Версия: v3.1 (МНОГОКЛЮЧЕВОЕ ВОССТАНОВЛЕНИЕ + ORGANIZER)");
console.log("🎯 Основная цепочка моделей:", SENTINEL_CONFIG.models.join(" → "));
console.log("🎯 Цепочка для organizer (кнопка «Причесать»):", SENTINEL_CONFIG.organizerModels.join(" → "));
console.log("💡 Доступные роли:", Object.keys({
    architect: '',
    editor: '',
    organizer: '',
    general: '',
    historian: '',
    scientist: '',
    philosopher: '',
    safety_engineer: ''
}).join(', '));
console.log("🔧 Для отладки: проверьте консоль на наличие ошибок при запросах к ИИ");
