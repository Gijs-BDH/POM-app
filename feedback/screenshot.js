export class ScreenshotCapture {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.highlights = [];
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.currentRect = null;
    this.baseImage = null;

    this.setupEventListeners();
  }

  async captureScreen() {
    try {
      const body = document.body;
      const html = document.documentElement;
      const height = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
      const width = Math.max(
        body.scrollWidth,
        body.offsetWidth,
        html.clientWidth,
        html.scrollWidth,
        html.offsetWidth
      );

      const currentScrollY = window.scrollY;
      const currentScrollX = window.scrollX;

      window.scrollTo(0, 0);

      await new Promise(resolve => setTimeout(resolve, 100));

      const scale = window.devicePixelRatio || 1;
      const canvasWidth = Math.min(width, 1920);
      const canvasHeight = Math.min(height, 10000);

      this.canvas.width = canvasWidth * scale;
      this.canvas.height = canvasHeight * scale;
      this.canvas.style.width = canvasWidth + 'px';
      this.canvas.style.height = canvasHeight + 'px';
      this.ctx.scale(scale, scale);

      const elements = document.querySelectorAll('*');
      const styles = new Map();

      elements.forEach(el => {
        const computed = window.getComputedStyle(el);
        styles.set(el, {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          border: computed.border,
          backgroundImage: computed.backgroundImage
        });
      });

      this.drawElement(document.body, 0, 0, styles);

      this.baseImage = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

      window.scrollTo(currentScrollX, currentScrollY);

      return true;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      throw error;
    }
  }

  drawElement(element, offsetX, offsetY, styles) {
    if (!element || element.nodeType !== 1) return;

    if (element.id === 'feedback-floating-buttons' ||
        element.id === 'give-feedback-popup' ||
        element.id === 'check-feedback-popup' ||
        element.id === 'feedback-error-modal') {
      return;
    }

    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const x = rect.left + scrollX + offsetX;
    const y = rect.top + scrollY + offsetY;
    const width = rect.width;
    const height = rect.height;

    const style = styles.get(element);
    if (!style) return;

    if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      this.ctx.fillStyle = style.backgroundColor;
      this.ctx.fillRect(x, y, width, height);
    }

    if (style.border && style.border !== '0px none rgb(0, 0, 0)') {
      this.ctx.strokeStyle = style.color;
      this.ctx.strokeRect(x, y, width, height);
    }

    if (element.tagName === 'IMG' && element.complete) {
      try {
        this.ctx.drawImage(element, x, y, width, height);
      } catch (e) {
        console.warn('Could not draw image:', e);
      }
    }

    if (element.childNodes) {
      for (let child of element.childNodes) {
        if (child.nodeType === 3) {
          const text = child.textContent.trim();
          if (text) {
            this.ctx.fillStyle = style.color || '#000000';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(text.substring(0, 100), x + 5, y + 15);
          }
        } else if (child.nodeType === 1) {
          this.drawElement(child, offsetX, offsetY, styles);
        }
      }
    }
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
    this.isDrawing = true;
  }

  handleMouseMove(e) {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (this.baseImage) {
      this.ctx.putImageData(this.baseImage, 0, 0);
    }

    this.drawHighlights();

    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';

    const width = currentX - this.startX;
    const height = currentY - this.startY;

    this.ctx.fillRect(this.startX, this.startY, width, height);
    this.ctx.strokeRect(this.startX, this.startY, width, height);
  }

  handleMouseUp(e) {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const width = endX - this.startX;
    const height = endY - this.startY;

    if (Math.abs(width) > 5 && Math.abs(height) > 5) {
      this.highlights.push({
        x: this.startX,
        y: this.startY,
        width: width,
        height: height
      });
    }

    this.isDrawing = false;
    this.redraw();
  }

  drawHighlights() {
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';

    this.highlights.forEach(highlight => {
      this.ctx.fillRect(highlight.x, highlight.y, highlight.width, highlight.height);
      this.ctx.strokeRect(highlight.x, highlight.y, highlight.width, highlight.height);
    });
  }

  clearHighlights() {
    this.highlights = [];
    this.redraw();
  }

  redraw() {
    if (this.baseImage) {
      this.ctx.putImageData(this.baseImage, 0, 0);
      this.drawHighlights();
    }
  }

  getImageData() {
    return this.canvas.toDataURL('image/png');
  }
}
