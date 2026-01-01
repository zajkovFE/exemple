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
        editor: `Ты — врач-клиницист. Верни ТОЛЬКО валидный JSON-объект: {"Заголовок":"Текст"}. Никакого дополнительного текста. Не сокращай текст, пиши подробно и грамотно.`,
        general: `Вы — эрудированный эксперт. Отвечайте точно, по делу, с академической строгостью. Поддерживайте научный стиль, но будьте понятны.`,
        historian: `Вы — историк мирового уровня, специализирующийся на ${context || 'различных эпохах'}. Отвечайте как учёный: с фактами, датами, источниками.`,
        scientist: `Вы — учёный с PhD в области ${context || 'различных дисциплин'}. Объясняйте сложные концепции ясно, но без упрощений.`,
        philosopher: `Вы — философ, анализирующий ${context || 'фундаментальные вопросы бытия'}. Рассматривайте разные точки зрения, приводите аргументы.`,
        safety_engineer: `Вы — инженер по техносферной безопасности. Оценивайте риски объективно, предлагайте конкретные меры защиты.`
    };

    // Определяем инструкцию для роли
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
                    { 
                        role: "system", 
                        content: systemInstruction
                    },
                    { 
                        role: "user", 
                        content: promptText
                    }
                ],
                temperature: role === 'architect' || role === 'editor' ? 0.1 : 0.3,
                // 🔥 КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: увеличиваем лимит для редактора
                max_tokens: role === 'architect' ? 500 : (role === 'editor' ? 3000 : 4000)
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
        
        // Попытка найти содержимое в разных форматах ответа
        let content = null;
        
        // Формат OpenAI (стандартный)
        if (data.choices?.[0]?.message?.content) {
            content = data.choices[0].message.content.trim();
        } 
        // Формат OpenRouter
        else if (data.data?.choices?.[0]?.message?.content) {
            content = data.data.choices[0].message.content.trim();
        }
        // Формат некоторых других API
        else if (data.message?.content) {
            content = data.message.content.trim();
        }
        // Еще один возможный формат
        else if (data.result) {
            content = data.result.trim();
        }
        // Если ничего не сработало, пытаемся найти любой текст
        else {
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

        // Для медицинских ролей - строгий JSON
        if (role === 'architect' || role === 'editor') {
            return parseStrictJSON(content);
        }
        
        // Для других ролей - возвращаем текст как есть
        return content;
        
    } catch (e) {
        console.error("❌ SENTINEL CRITICAL ERROR:", e);
        
        // 🔥 ДОПОЛНИТЕЛЬНАЯ ОБРАБОТКА: если ошибка парсинга JSON, пробуем восстановить
        if (e.message.includes('Некорректный формат JSON') && role === 'editor') {
            console.warn("⚠️ Попытка восстановить обрезанный JSON...");
            const recoveredContent = tryRecoverJSON(e.message);
            if (recoveredContent) {
                alert("✅ ИИ вернул длинный ответ! JSON восстановлен автоматически.");
                return recoveredContent;
            }
        }
        
        alert(`❌ Ошибка ИИ: ${e.message || "Неизвестная ошибка. Проверьте ключ и интернет."}`);
        
        // Возвращаем тестовые данные для медицинских ролей
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

// 🔥 НОВАЯ ФУНКЦИЯ: Восстановление обрезанного JSON
function tryRecoverJSON(errorMessage) {
    try {
        // Извлекаем обрезанный JSON из сообщения об ошибке
        const jsonMatch = errorMessage.match(/\{[\s\S]*$/);
        if (!jsonMatch || !jsonMatch[0]) return null;
        
        let partialJSON = jsonMatch[0].trim();
        console.log("🔧 Обрезанный JSON для восстановления:", partialJSON.substring(0, 200) + '...');
        
        // Если не закрыты кавычки в последнем значении
        if (partialJSON.endsWith('"') && !partialJSON.endsWith('\\"')) {
            partialJSON = partialJSON.slice(0, -1) + '..."';
        }
        
        // Если не закрыты скобки
        let openBraces = (partialJSON.match(/{/g) || []).length;
        let closeBraces = (partialJSON.match(/}/g) || []).length;
        
        if (openBraces > closeBraces) {
            partialJSON += '}'.repeat(openBraces - closeBraces);
        }
        
        console.log("🔧 Восстановленный JSON:", partialJSON);
        return JSON.parse(partialJSON);
    } catch (e) {
        console.error("❌ Ошибка восстановления JSON:", e);
        return null;
    }
}
