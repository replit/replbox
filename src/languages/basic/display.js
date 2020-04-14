function toPx(n) {
  return `${n}px`;
}
function getPixelSize({ wrapper, columns, rows, borderWidth, }) {
  const wrapperSize = Math.min(wrapper.clientWidth, wrapper.clientHeight);
  const gridSize = Math.max(columns, rows);
  const totalBorderSize = gridSize * borderWidth + 2;
  return Math.floor((wrapperSize - totalBorderSize) / gridSize);
}
function observePixelSize(opts) {
  // @ts-ignore not implemented in current ts dom
  if (typeof ResizeObserver === "undefined") {
    return;
  }
  let throttleTimer = null;
  // @ts-ignore not implemented in current ts dom
  const observer = new ResizeObserver(() => {
    if (throttleTimer) {
      return;
    }
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      const pixelSize = getPixelSize(opts);
      const cells = opts.wrapper.getElementsByTagName("td");
      for (let i = 0; i < cells.length; i++) {
        const cell = cells.item(i);
        if (!cell) {
          continue;
        }
        cell.style.width = toPx(pixelSize);
        cell.style.height = toPx(pixelSize);
      }
    }, 50);
  });
  observer.observe(opts.wrapper);
}
function createGrid({ wrapper, rows, columns, defaultBg, borderWidth, borderColor, }) {
  const params = {
    wrapper,
    rows,
    columns,
    defaultBg,
    borderWidth,
    borderColor,
  };
  const pixelSize = getPixelSize(params);
  observePixelSize(params);
  const baseCell = document.createElement("td");
  baseCell.style.width = toPx(pixelSize);
  baseCell.style.height = toPx(pixelSize);
  baseCell.style.padding = toPx(0);
  baseCell.style.backgroundColor = defaultBg;
  const baseRow = document.createElement("tr");
  for (let _ = 0; _ < columns; _++) {
    const pixel = baseCell.cloneNode(true);
    baseRow.appendChild(pixel);
  }
  const tbody = document.createElement("tbody");
  for (let _ = 0; _ < rows; _++) {
    const row = baseRow.cloneNode(true);
    tbody.appendChild(row);
  }
  const table = document.createElement("table");
  table.style.backgroundColor = borderColor;
  table.style.position = 'relative';
  // table { border-collapse: separate; border-spacing: 5px; } /* cellspacing="5" */
  // table { border-collapse: collapse; border-spacing: 0; }
  table.style.borderSpacing = toPx(borderWidth);
  table.style.borderCollapse = borderWidth > 0 ? "separate" : "collapse";
  table.appendChild(tbody);
  wrapper.appendChild(table);
  return tbody;
}

module.exports = class TableDisplay {
  constructor({ wrapper, rows, columns, defaultBg, borderWidth, borderColor, }) {
    this.grid = createGrid({
      wrapper,
      rows,
      columns,
      defaultBg,
      borderWidth,
      borderColor,
    });
    this.rows = rows;
    this.columns = columns;
    this.defaultBg = defaultBg;
    this.keyQueue = [];
    this.clickQueue = [];
    this.pressedKey = undefined;
    this.texts = {};
    this.initKeyQueuing();
  }
  initKeyQueuing() {
    const getKey = (e) => e.key || String.fromCharCode(e.keyCode);
    window.addEventListener("keypress", (e) => {
      this.keyQueue.push(getKey(e));
    });
    this.grid.addEventListener("click", (e) => {
      if (e.target.nodeName !== 'TD') return;
      this.clickQueue.push([
        e.target.cellIndex,
        e.target.parentNode.rowIndex,
      ])
    });
  }
  isInside(x, y) {
    return x < this.columns && x >= 0 && y < this.rows && y >= 0;
  }
  getPixel(x, y) {
    const row = this.grid.rows.item(y);
    if (!row) {
      throw new Error(`Expected row at ${y}`);
    }
    const pixel = row.cells.item(x);
    if (!pixel) {
      throw new Error(`Expected pixel at (${x},${y})`);
    }
    return pixel;
  }
  plot(xFloat, yFloat, color) {
    const x = Math.floor(xFloat);
    const y = Math.floor(yFloat);
    if (!this.isInside(x, y)) {
      return;
    }
    const pixel = this.getPixel(x, y);
    pixel.style.backgroundColor = color;
  }
  color(xFloat, yFloat) {
    const x = Math.floor(xFloat);
    const y = Math.floor(yFloat);
    if (!this.isInside(x, y)) {
      return this.defaultBg;
    }
    const pixel = this.getPixel(x, y);
    return pixel.style.backgroundColor || this.defaultBg;
  }
  clear() {
    for (let x = 0; x < this.columns; x++) {
      for (let y = 0; y < this.rows; y++) {
        const pixel = this.getPixel(x, y);
        pixel.style.backgroundColor = this.defaultBg;
      }
    }

    for (let pos in this.texts) {
      const el = this.texts[pos];
      el.parentElement.removeChild(el);
    }
  }
  getChar() {
    return this.keyQueue.shift();
  }
  getClick() {
    return this.clickQueue.shift();
  }
  text(x, y, text, size = 12, color = "black") {
    const el = document.createElement('span');
    el.textContent = text;
    el.style.position = 'absolute';
    el.style.fontSize = size;
    el.style.color = color;
    el.style.fontFamily = 'monospace';
    el.style.left = (x / this.rows * 100) + '%';
    el.style.top = (y / this.columns * 100) + '%';
    this.grid.parentElement.appendChild(el);
    this.texts[`${x}:${y}`] = el;
  }
  draw(table) {
    for (let i in table) {
      for (let j in table[i]) {
        this.plot(i, j, table[i][j]);
      }
    }
  }
}
