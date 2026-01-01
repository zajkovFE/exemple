/**
 * SENTINEL AI ENGINE (v2.0) - "Roman Concrete" Edition
 * Автономный модуль управления ИИ для Pharma-Architect
 */

const SENTINEL_CONFIG = {
    priorityModels: [
        "gemini-flash-latest",   // Самый стабильный короткий адрес
        "gemini-1.5-flash",     // Запасной вариант с явным указанием версии
        "gemini-1.0-pro"        // Резерв
        "gemini-2.0-flash-exp", // Экспериментальный путь
    ],
    currentModel: "gemini-flash-latest", // Сразу ставим правильный
    apiVersion: "v1beta",
    isChecking: false
};

// 1. САМОДИАГНОСТИКА: Поиск лучшей живой модели
async function sentinelHealthCheck() {
    const KEY = localStorage.getItem('gemini_api_key')?.trim();
    if (!KEY || SENTINEL_CONFIG.isChecking) return;

    SENTINEL_CONFIG.isChecking = true;
    console.log("🛡 SENTINEL: Проверка здоровья системы...");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/${SENTINEL_CONFIG.apiVersion}/models?key=${KEY}`);
        const data = await response.json();

        if (data.models) {
            for (let target of SENTINEL_CONFIG.priorityModels) {
                const found = data.models.find(m => m.name.includes(target));
                if (found) {
                    const modelId = found.name.split('/').pop();
                    if (SENTINEL_CONFIG.currentModel !== modelId) {
                        console.log(`✅ SENTINEL: Переключено на оптимальную модель: ${modelId}`);
                        SENTINEL_CONFIG.currentModel = modelId;
                    }
                    break;
                }
            }
        }
    } catch (e) {
        console.warn("⚠️ SENTINEL: Ошибка связи с реестром моделей. Используем дефолт.");
    } finally {
        SENTINEL_CONFIG.isChecking = false;
    }
}

// 2. ЯДРО ЗАПРОСОВ (РИМСКИЙ БЕТОН)
async function askSentinel(promptText, role) {
    const KEY = localStorage.getItem('gemini_api_key')?.trim();
    if (!KEY) throw new Error("API Key missing");

    const systemInstructions = {
        architect: "Ты — медицинский архитектор. Верни ТОЛЬКО JSON массив: [{'t': 'Заголовок', 'w': 1 или 2}].",
        editor: "Ты — врач. Верни ТОЛЬКО JSON объект: {'Заголовок': 'Текст наполнения'}."
    };

    const url = `https://generativelanguage.googleapis.com/${SENTINEL_CONFIG.apiVersion}/models/${SENTINEL_CONFIG.currentModel}:generateContent?key=${KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemInstructions[role]}\n\nКонтекст: ${promptText}` }] }],
                generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
            })
        });

        // 🛡 УЛУЧШЕННОЕ САМОЛЕЧЕНИЕ
        if (response.status === 404 || response.status === 429) {
            console.warn(`🚨 Ошибка ${response.status} на модели ${SENTINEL_CONFIG.currentModel}. Откат на стабильную версию...`);
            
            // Если 2.0 подвела, временно удаляем её из списка и ищем замену
            SENTINEL_CONFIG.priorityModels = SENTINEL_CONFIG.priorityModels.filter(m => m !== SENTINEL_CONFIG.currentModel);
            await sentinelHealthCheck(); 
            
            return askSentinel(promptText, role); // Рекурсивный перезапуск
        }

        const data = await response.json();
        
        // ПРОВЕРКА: Если ИИ вернул пустой ответ или ошибку в JSON
        if (!data.candidates || !data.candidates[0]) {
            throw new Error("Пустой ответ от API");
        }

        const content = data.candidates[0].content.parts[0].text;
        return JSON.parse(content.replace(/```json|```/g, "").trim());
    } catch (e) {
        console.error("❌ SENTINEL CRITICAL ERROR:", e);
        // Последний шанс: если всё упало, пробуем принудительно flash-latest
        if (SENTINEL_CONFIG.currentModel !== "gemini-flash-latest") {
             SENTINEL_CONFIG.currentModel = "gemini-flash-latest";
             return askSentinel(promptText, role);
        }
        return null;
    }
}

// Запускаем диагностику при старте
sentinelHealthCheck();
