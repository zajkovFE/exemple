// render-structure.js
// === ОТРИСОВКА СТРУКТУРЫ ОТ ИИ-АРХИТЕКТОРА ===
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
    const row = document.querySelector('.form-row:last-child') || addNewRow();
    
    const box = document.createElement('div');
    box.className = 'box';
    box.style.flex = item.w || 1;

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
  });

  console.log("✅ Структура из ИИ отрисована:", data.length, "блоков");
}
