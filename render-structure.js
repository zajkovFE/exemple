// ✅ Новая версия renderStructure — без локального currentRowWidth
function renderStructure(data) {
  if (!Array.isArray(data) || data.length === 0) {
    alert("ИИ вернул пустую структуру. Попробуйте уточнить запрос.");
    return;
  }

  const canvas = document.getElementById('form-canvas');
  if (confirm("Очистить текущий холст и вставить новую структуру?")) {
    canvas.innerHTML = '';
  }

  data.forEach(item => {
    const width = item.w || 1;
    
    // Находим последнюю строку, у которой row.__usedWidth < 2
    let row = null;
    const rows = canvas.querySelectorAll('.form-row');
    
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const used = r.__usedWidth || 0;
      if (used + width <= 2) {
        row = r;
        break;
      }
    }

    // Если нет подходящей строки — создаём новую
    if (!row) {
      row = addNewRow();
      row.__usedWidth = 0; // ← привязываем данные к строке
    }

    // Создаём блок
    const box = document.createElement('div');
    box.className = 'box';
    box.style.flex = width;

    box.innerHTML = `
      <div class="box-ctrl">
        <button class="ctrl-btn" onclick="resizeBox(this, 0.3)">↔️</button>
        <input type="color" class="color-pick" onchange="this.parentElement.parentElement.style.background=this.value">
        <button class="ctrl-btn" style="background:red" onclick="this.closest('.box').remove()">❌</button>
      </div>
      <div class="box-title" contenteditable="true">${item.t || 'Без заголовка'}</div>
      <div class="box-content" contenteditable="true"></div>
    `;

    row.appendChild(box);
    row.__usedWidth += width; // ← обновляем именно у строки
  });

  console.log(`✅ Структура отрисована: ${data.length} блоков → ${canvas.querySelectorAll('.form-row').length} строк`);
}
