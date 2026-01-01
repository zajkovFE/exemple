// render-structure.js
function renderStructure(data) {
  if (!Array.isArray(data) || data.length === 0) {
    alert("ИИ вернул пустую структуру. Попробуйте уточнить запрос.");
    return;
  }

  const canvas = document.getElementById('form-canvas');
  if (confirm("Очистить текущий холст и вставить новую структуру?")) {
    canvas.innerHTML = '';
  }

  let currentRow = null;
  let currentRowWidth = 0;

  data.forEach(item => {
    const width = item.w || 1;

    // Создаём новую строку, если текущая переполняется
    if (!currentRow || currentRowWidth + width > 2) {
      currentRow = addNewRow();
      currentRowWidth = 0;
    }

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

    currentRow.appendChild(box);
    currentRowWidth += width;
  });

  console.log(`✅ Структура отрисована: ${data.length} блоков → ${document.querySelectorAll('.form-row').length} строк`);
}
