/**
 * SENTINEL AI ENGINE (v2.0) - "Roman Concrete" Edition
 * Автономный модуль управления ИИ для Pharma-Architect
 */

async function askSentinel(promptText, role, attempt = 1) {
  const MAX_ATTEMPTS = 2;
  if (attempt > MAX_ATTEMPTS) {
    throw new Error("❌ SENTINEL: Все попытки исчерпаны. Проверьте API-ключ и интернет.");
  }

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
        contents: [{ parts: [{ text: `${systemInstructions[role]}\nКонтекст: ${promptText}` }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      })
    });

    // 🔁 РЕКУРСИВНЫЙ FALLOVER при 404 / 429
    if (response.status === 404 || response.status === 429) {
      console.warn(`🚨 ${response.status} на модели ${SENTINEL_CONFIG.currentModel} (попытка ${attempt}/${MAX_ATTEMPTS}). Переключаемся...`);
      SENTINEL_CONFIG.priorityModels = SENTINEL_CONFIG.priorityModels.filter(m => m !== SENTINEL_CONFIG.currentModel);
      await sentinelHealthCheck();
      return askSentinel(promptText, role, attempt + 1); // ← attempt + 1
    }

    const data = await response.json();

    // ✅ ПРОВЕРКА ОШИБОК ОТ API (ОБЯЗАТЕЛЬНО ДО candidates!)
    if (data.error) {
      const { code, message } = data.error;
      throw new Error(`Gemini API Error ${code}: ${message}`);
    }

    if (!data.candidates || !data.candidates[0]) {
      throw new Error("Пустой ответ: candidates отсутствуют");
    }

    const content = data.candidates[0].content.parts[0].text;
    return JSON.parse(content.replace(/```json|```/g, "").trim());

  } catch (e) {
    console.error("❌ SENTINEL CRITICAL ERROR:", e.message || e);
    // Последний fallback — только если текущая модель НЕ flash-latest
    if (SENTINEL_CONFIG.currentModel !== "gemini-flash-latest") {
      console.log("🔁 Принудительный fallback на gemini-flash-latest");
      SENTINEL_CONFIG.currentModel = "gemini-flash-latest";
      return askSentinel(promptText, role, attempt); // ← без +1, чтобы не тратить попытку
    }
    return null;
  }
}

// Запуск диагностики при старте
sentinelHealthCheck();
