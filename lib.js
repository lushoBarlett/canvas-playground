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