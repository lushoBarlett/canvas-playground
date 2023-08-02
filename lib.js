export function setup2DCanvas() {
  const canvas = document.getElementById('root-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

export function setup2DWebGLCanvas() {
  const canvas = document.getElementById('root-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const glctx = canvas.getContext('webgl');
  return { canvas, glctx };
}

export class WSStableConnection {

  constructor(url, receiver = null) {
    this.url = url;
    this.sendQueue = [];
    this.receiveQueue = [];
    this.receiver = receiver;
    this.opened = false;

    const open = () => {

      this.opened = true;

      console.log(`[${url}]: connected`);

      for (let msg of this.sendQueue) {
        console.log(`[${url}]: > ${JSON.stringify(msg)}`);
        this.ws.send(JSON.stringify(msg));
      }

      this.sendQueue = [];
    };

    const message = ({ data }) => {
      console.log(`[${url}]: < ${data}`);

      this.receiveQueue.push(JSON.parse(data));

      if (!this.receiver)
        return;

      for (let msg of this.receiveQueue)
        this.receiver(msg);

      this.receiveQueue = [];
    };

    const close = () => {
      console.log(`[${url}]: closed`);

      if (this.opened) {
        console.log(`[${url}]: reconnecting...`);

        setTimeout(() => {
          this.ws = new WebSocket(url)
          this.ws.onopen = open;
          this.ws.onmessage = message;
          this.ws.onclose = close;
        }, 1000);
      }

      this.opened = false;
    };

    this.ws = new WebSocket(url);
    this.ws.onopen = open;
    this.ws.onmessage = message;
    this.ws.onclose = close;
  }

  send(msg) {
    if (this.ws.readyState === WebSocket.OPEN) {
      console.log(`[${this.url}]: > ${JSON.stringify(msg)}`);
      this.ws.send(JSON.stringify(msg));

    } else {
      this.sendQueue.push(msg);
    }
  }
}

export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * @brief class Controls is an abstract class that defines the interface for
 * any control scheme.
 */
export class Controls {

    setup(onDirection, onSpeed) {
      throw new Error('Controls: setup not implemented');
    }

    teardown() {
      throw new Error('Controls: teardown not implemented');
    }
}

export class KeyboardControls extends Controls {

  constructor() {
    super();
    this.keydown = null;
    this.keypress = null;
    this.keyup = null;
  }

  setup(onDirection, onSpeed) {
    this.keydown = e => {
      switch (e.key) {
        case 'ArrowUp':    return onDirection('UP');
        case 'ArrowDown':  return onDirection('DOWN');
        case 'ArrowLeft':  return onDirection('LEFT');
        case 'ArrowRight': return onDirection('RIGHT');
      }
    };

    this.keypress = e => {
      switch (e.key) {
        case '0': return onSpeed(true);
      }
    }

    this.keyup = e => {
      switch (e.key) {
        case '0': return onSpeed(false);
      }
    }

    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keypress', this.keypress);
    window.addEventListener('keyup', this.keyup);
  }

  teardown() {
    if (!this.keydown)
      console.warn('PCControls: not setup');

    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keypress', this.keypress);
    window.removeEventListener('keyup', this.keyup);
  }
}

export class MobileControls extends Controls {

  DEADZONE = 0.1;

  constructor() {
    super();
    this.touchstart = null;
    this.touchmove = null;
    this.spedup = false;
  }

  setup(onDirection, onSpeed) {

    let touchStartX = 0;
    let touchStartY = 0;

    this.touchmove = ({ touches: [{ clientX, clientY }] }) => {
      const touchEndX = clientX;
      const touchEndY = clientY;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      if (Math.abs(deltaX) < this.DEADZONE && Math.abs(deltaY) < this.DEADZONE) {
        this.spedup = !this.spedup;
        onSpeed(this.spedup);
        return;
      }

      if (Math.abs(deltaX) > Math.abs(deltaY))
        deltaX > 0 ? onDirection('RIGHT') : onDirection('LEFT');
      else
        deltaY > 0 ? onDirection('DOWN') : onDirection('UP');
    };

    this.touchstart = ({ touches: [{ clientX, clientY }] }) => {
      touchStartX = clientX;
      touchStartY = clientY;
    };

    window.addEventListener('touchstart', this.touchstart);
    window.addEventListener('touchmove', this.touchmove);
  }

  teardown() {
    if (!this.touchstart)
      console.warn('MobileControls: not setup');

    window.removeEventListener('touchstart', this.touchstart);
    window.removeEventListener('touchmove', this.touchmove);
  }
}