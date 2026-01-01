// ai-core.js — умный выбор ИИ
async function askAI(prompt, role) {
  console.log("🧠 Попытка: Gemini (askSentinel)");
  try {
    const res = await askSentinel(prompt, role);
    if (res) return res;
  } catch (e) {
    console.warn("⚠️ Gemini не ответил:", e.message);
  }

  console.log("🔄 Fallback: Qwen (askQwen)");
  try {
    const res = await askQwen(prompt, role);
    if (res) return res;
  } catch (e) {
    console.error("❌ Все ИИ недоступны:", e.message);
  }

  throw new Error("Все ИИ-сервисы недоступны. Проверьте ключи и интернет.");
}
