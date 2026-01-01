// storage.js - надежное управление базой и сохранением

// Гарантирует наличие id="f-name" на первом блоке с заголовком
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
  // Сначала пытаемся найти элемент с id="f-name"
  const fNameEl = document.getElementById('f-name');
  if (fNameEl) {
    return fNameEl.innerText.trim() || 'Без названия';
  }
  
  // Если его нет — ищем первый блок с заголовком
  const firstTitleEl = document.querySelector('#form-canvas .box-title');
  if (firstTitleEl) {
    return firstTitleEl.innerText.trim() || 'Без названия';
  }
  
  // Если вообще ничего нет — возвращаем стандартное название
  return "Новый протокол " + new Date().toLocaleDateString();
}

// Сохраняет новый протокол
function saveNewProtocol(group, subgroup) {
  ensureFNameID();
  
  const db = JSON.parse(localStorage.getItem('pharmaDB') || '[]');
  const protoName = getProtocolName();
  
  db.push({
    id: Date.now(),
    name: protoName,
    group: group,
    subgroup: subgroup,
    html: document.getElementById('form-canvas').innerHTML,
    updatedAt: Date.now()
  });
  
  localStorage.setItem('pharmaDB', JSON.stringify(db));
  return db.length - 1; // возвращаем индекс нового элемента
}

// Обновляет существующий протокол
function updateProtocol(index) {
  if (index === null || index < 0) return false;
  
  ensureFNameID();
  
  const db = JSON.parse(localStorage.getItem('pharmaDB') || '[]');
  if (index >= db.length) return false;
  
  db[index].name = getProtocolName();
  db[index].html = document.getElementById('form-canvas').innerHTML;
  db[index].updatedAt = Date.now();
  
  localStorage.setItem('pharmaDB', JSON.stringify(db));
  return true;
}

// Загружает протокол по индексу
function loadProtocol(index) {
  const db = JSON.parse(localStorage.getItem('pharmaDB') || '[]');
  if (index < 0 || index >= db.length) return false;
  
  document.getElementById('form-canvas').innerHTML = db[index].html;
  return true;
}

// Удаляет протокол по индексу
function deleteProtocol(index) {
  const db = JSON.parse(localStorage.getItem('pharmaDB') || '[]');
  if (index < 0 || index >= db.length) return false;
  
  db.splice(index, 1);
  localStorage.setItem('pharmaDB', JSON.stringify(db));
  return true;
}

// Экспорт базы
function exportDatabase() {
  const db = localStorage.getItem('pharmaDB');
  if (!db || db === "[]") {
    alert("База пуста, нечего экспортировать.");
    return null;
  }
  return db;
}

// Импорт базы
function importDatabase(data) {
  try {
    const importedData = JSON.parse(data);
    if (!Array.isArray(importedData)) {
      throw new Error("Неверный формат данных");
    }
    
    localStorage.setItem('pharmaDB', JSON.stringify(importedData));
    return true;
  } catch (e) {
    console.error("Ошибка импорта базы:", e);
    return false;
  }
}
