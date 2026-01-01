// storage.js - надежное управление сохранением

// Гарантирует наличие id="f-name" на первом блоке
function ensureFNameID() {
  const canvas = document.getElementById('form-canvas');
  const firstTitle = canvas.querySelector('.box-title');
  if (!firstTitle) return;

  // Удаляем старый id, если есть
  const oldEl = document.getElementById('f-name');
  if (oldEl) oldEl.removeAttribute('id');

  // Присваиваем id на контентный блок первого заголовка
  const contentEl = firstTitle.nextElementSibling;
  if (contentEl) {
    contentEl.id = 'f-name';
  }
}

// Получает название протокола надежным способом
function getProtocolName() {
  // Способ 1: Через id="f-name"
  const fNameEl = document.getElementById('f-name');
  if (fNameEl && fNameEl.innerText.trim()) {
    return fNameEl.innerText.trim();
  }
  
  // Способ 2: Через первый блок с заголовком
  const firstBox = document.querySelector('#form-canvas .box');
  if (firstBox) {
    const titleEl = firstBox.querySelector('.box-title');
    const contentEl = firstBox.querySelector('.box-content');
    if (contentEl && titleEl && titleEl.innerText.includes('Название')) {
      return contentEl.innerText.trim() || 'Без названия';
    }
  }
  
  // Способ 3: Через любой заполненный блок
  const filledBox = Array.from(document.querySelectorAll('.box-content'))
    .find(el => el.innerText.trim().length > 0);
  
  if (filledBox) {
    return filledBox.innerText.trim().substring(0, 30) + '...';
  }
  
  // Дефолтное название
  return "Новый протокол " + new Date().toLocaleDateString();
}

// Сохраняет новый протокол (для кнопки "📁 В базу браузера")
function startSaveSequence() {
  ensureFNameID();
  
  const db = JSON.parse(localStorage.getItem('pharmaDB') || '[]');
  const protoName = getProtocolName();
  
  // Автоматическое определение группы и подгруппы
  let group = "Общие";
  let subgroup = "Без подгруппы";
  
  if (protoName.toLowerCase().includes('анамнез') || 
      protoName.toLowerCase().includes('история')) {
    group = "Анамнез";
    subgroup = "Общий";
  } else if (protoName.toLowerCase().includes('диагноз')) {
    group = "Диагностика";
    subgroup = "Основной";
  } else if (protoName.toLowerCase().includes('лечение') || 
             protoName.toLowerCase().includes('назначение')) {
    group = "Лечение";
    subgroup = "Основное";
  }
  
  db.push({
    id: Date.now(),
    name: protoName,
    group: group,
    subgroup: subgroup,
    html: document.getElementById('form-canvas').innerHTML,
    updatedAt: Date.now()
  });
  
  localStorage.setItem('pharmaDB', JSON.stringify(db));
  currentEditingIndex = db.length - 1;
  
  // Обновляем интерфейс
  updateToolbar();
  renderDB();
  alert(`✅ "${protoName}" сохранен в группу "${group}"`);
}

// Обновляет существующий протокол (для кнопки "💾 СОХРАНИТЬ ПРАВКИ")
function updateExistingRecord() {
  if (currentEditingIndex === null) {
    alert("❌ Нет активной записи для обновления");
    return;
  }
  
  if (!confirm("Обновить текущую запись?")) return;
  
  ensureFNameID();
  
  const db = JSON.parse(localStorage.getItem('pharmaDB') || '[]');
  if (currentEditingIndex < 0 || currentEditingIndex >= db.length) {
    alert("❌ Запись не найдена");
    return;
  }
  
  db[currentEditingIndex].name = getProtocolName();
  db[currentEditingIndex].html = document.getElementById('form-canvas').innerHTML;
  db[currentEditingIndex].updatedAt = Date.now();
  
  localStorage.setItem('pharmaDB', JSON.stringify(db));
  renderDB();
  alert("✅ Запись успешно обновлена!");
}

// Сохраняет как новый (для кнопки "📝 КАК НОВЫЙ (КОПИЯ)")
function saveAsNewCopy() {
  const currentName = getProtocolName();
  const newName = prompt("Введите название копии:", currentName + " (копия)");
  
  if (!newName) return;
  
  ensureFNameID();
  
  const db = JSON.parse(localStorage.getItem('pharmaDB') || '[]');
  db.push({
    id: Date.now(),
    name: newName,
    group: "Копии",
    subgroup: "Ручные",
    html: document.getElementById('form-canvas').innerHTML,
    updatedAt: Date.now()
  });
  
  localStorage.setItem('pharmaDB', JSON.stringify(db));
  currentEditingIndex = db.length - 1;
  
  updateToolbar();
  renderDB();
  alert(`✅ Копия "${newName}" создана!`);
}
function loadFromDB(index) {
  const db = JSON.parse(localStorage.getItem('pharmaDB'));
  document.getElementById('form-canvas').innerHTML = db[index].html;
  currentEditingIndex = index;
  updateToolbar(); 
  window.scrollTo(0,0);
}
// Экспорт в HTML (для кнопки "💾 Скачать .html")
function downloadProject() {
  ensureFNameID();
  
  const protoName = getProtocolName();
  const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>${protoName} - Фарма-Архитектор</title>
<style>
body { font-family: Arial, sans-serif; padding: 20px; }
.workspace { border: 2px solid #000; padding: 30px; max-width: 1000px; margin: 0 auto; }
.form-row { display: flex; gap: 15px; margin-bottom: 15px; }
.box { border: 1px solid #000; padding: 15px; flex: 1; }
.box-title { font-weight: bold; text-transform: uppercase; margin-bottom: 8px; font-size: 14px; }
.box-content { line-height: 1.5; }
</style>
</head>
<body>
<div class="workspace">
${document.getElementById('form-canvas').innerHTML}
</div>
<footer style="text-align: center; margin-top: 30px; color: #666;">
Сохранено из Фарма-Архитектора v13.2 • ${new Date().toLocaleDateString()}
</footer>
</body>
</html>
`;
  
  const blob = new Blob([htmlContent], {type: 'text/html'});
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${protoName.replace(/[^\w\s]/gi, '_')}.html`;
  a.click();
  
  URL.revokeObjectURL(url);
  alert("✅ HTML-файл сохранен!");
}
