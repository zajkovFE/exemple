// ✅ Новая версия renderStructure — без локального currentRowWidth
function renderStructure(data) {
  if (!Array.isArray(data) || data.length === 0) {
    alert("ИИ вернул пустую структуру. Попробуйте уточнить запрос.");
    return;
  }

  const canvas = document.getElementById('form-canvas');
  // Используем стильный confirm или просто очистку
  if (canvas.children.length > 0 && confirm("Очистить текущий холст перед вставкой?")) {
    canvas.innerHTML = '';
  }

  data.forEach(item => {
    // Гарантируем, что ширина — это число 1 или 2
    const width = parseInt(item.w) || 1;
    
    let row = null;
    const rows = canvas.querySelectorAll('.form-row');
    
    // Ищем строку, где есть место
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const used = parseFloat(r.dataset.usedWidth) || 0;
      if (used + width <= 2.1) { // 2.1 для запаса на погрешность
        row = r;
        break;
      }
    }

    if (!row) {
      row = addNewRow();
      row.dataset.usedWidth = 0; // Используем dataset вместо __usedWidth (это надежнее)
    }

    const box = document.createElement('div');
    box.className = 'box';
    
    // Улучшенная настройка ширины через Flex
    if (width >= 2) {
      box.style.flex = "1 1 100%";
    } else {
      box.style.flex = "1 1 calc(50% - 15px)";
    }

    box.innerHTML = `
      <div class="box-ctrl">
        <button class="ctrl-btn" onclick="resizeBox(this, 0.3)">↔️</button>
        <input type="color" class="color-pick" title="Цвет фона" onchange="this.parentElement.parentElement.style.background=this.value">
        <button class="ctrl-btn" style="background:red" onclick="removeBox(this)">❌</button>
      </div>
      <div class="box-title" contenteditable="true">${item.t || 'Новый раздел'}</div>
      <div class="box-content" contenteditable="true" placeholder="Текст появится здесь..."></div>
    `;

    row.appendChild(box);
    row.dataset.usedWidth = (parseFloat(row.dataset.usedWidth) || 0) + width;
  });
}

// Вспомогательная функция для удаления, которая чистит счетчик строки
function removeBox(btn) {
    const box = btn.closest('.box');
    const row = box.parentElement;
    const width = box.style.flex.includes('100%') ? 2 : 1;
    row.dataset.usedWidth = Math.max(0, (parseFloat(row.dataset.usedWidth) || 0) - width);
    box.remove();

  console.log(`✅ Структура отрисована: ${data.length} блоков → ${canvas.querySelectorAll('.form-row').length} строк`);
}
