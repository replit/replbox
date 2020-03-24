const borderWidth = 2;

class Display {
  constructor(canvas, { borderColor = '#000000', rows, cols }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.borderColor = borderColor;
    this.rows = rows;
    this.cols = cols;
    this.colorStore = {};
    this.keyQueue = [];
    window.addEventListener('keydown', e => {
      this.keyQueue.push(e.key || String.fromCharCode(e.keyCode));
    });
  }

  lookup(x, y) {
    var x = Math.floor(pos.x / this.cellWidth);
    var y = Math.floor(pos.y / this.cellHeight);
    return {
      x: x,
      y: y,
      dimensions: {
        t: this.cellHeight * y,
        l: this.cellWidth * x,
        w: this.cellWidth,
        h: this.cellHeight,
      },
    };
  }

  draw() {
    this.cellWidth = this.canvas.width / this.cols;
    this.cellHeight = this.canvas.height / this.rows;

    const { ctx } = this;
    let x = 0;
    let y = 0;

    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    while (y < this.canvas.height + 1) {
      ctx.moveTo(x, y);
      ctx.lineTo(this.canvas.width, y);
      y += this.cellHeight;
    }

    y = 0;
    while (x < this.canvas.width + 1) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, this.canvas.height);
      x = x + this.cellWidth;
    }
    ctx.stroke();
  }

  plot(x, y, color) {
    this.ctx.fillStyle = color || this.borderColor;
    this.ctx.fillRect(
      this.cellWidth * x + 1,
      this.cellHeight * y + 1,
      this.cellWidth - borderWidth,
      this.cellHeight - borderWidth,
    );
    this.colorStore[x + ':' + y] = color;
  }

  color(x, y) {
    return this.colorStore[x + ':' + y] || 'white';
  }

  clear() {
    for (const cell in this.colorStore) {
      const [xStr, yStr] = cell.split(':');
      const x = parseInt(xStr);
      const y = parseInt(yStr);
      this.ctx.clearRect(
        this.cellWidth * x + 1,
        this.cellHeight * y + 1,
        this.cellWidth - borderWidth,
        this.cellHeight - borderWidth,
      );
    }
    this.colorStore = {};
  }

  getChar() {
    return this.keyQueue.shift();
  }
}

module.exports = Display;
