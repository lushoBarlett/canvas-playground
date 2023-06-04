import { setup2DCanvas } from './lib.js';

export default function TextAnimation() {
  const { canvas, ctx } = setup2DCanvas();

  const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

  const backgrounds = ['orange', 'white'];

  const textData = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    caret: '|',
    text: '',
    fullText: 'lusho',
    font: '200px monospace',
    colors: ['white', 'orange'],
    textAlign: 'center',
    textBaseline: 'middle',
  }

  const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 200,
    color: 'white',
    animationFunction: x => Math.abs(x) * Math.sign(x) / 8,
    dx: 0,
    dy: 0,
  };

  canvas.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    computeMouseDistance();
  });

  canvas.addEventListener('click', e => {
    enlargeBall();

    function enlargeBall() {
      ball.radius *= 1.05;
      if (ball.radius < Math.max(canvas.width, canvas.height))
        setTimeout(enlargeBall, 5);
    }
  });

  loop();
  writeText();

  function writeText() {
    textData.text = textData.fullText.substring(0, textData.text.length) + textData.caret;

    setTimeout(() => {
      if (textData.text.length < textData.fullText.length + 1)
        writeText();
      else
        setTimeout(toggleCaret, 500);
    }, 100);
  }

  function toggleCaret() {
    const next = textData.text[textData.text.length - 1] == textData.caret ? ' ' : textData.caret;
    textData.text = textData.text.substring(0, textData.text.length - 1) + next;
    setTimeout(toggleCaret, 500);
  }

  function loop() {
    draw();
    window.requestAnimationFrame(loop);
  }

  function draw() {
    ctx.save();

    setBackground(0);
    setText(0);

    computeMouseDistance();

    ball.x += ball.animationFunction(ball.dx);
    ball.y += ball.animationFunction(ball.dy);

    drawClippingBall();

    setBackground(1);
    setText(1);

    ctx.restore();
  }


  function setBackground(which) {
    ctx.fillStyle = backgrounds[which];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function setText(which) {
    ctx.font = textData.font;
    ctx.textAlign = textData.textAlign;
    ctx.textBaseline = textData.textBaseline;
    ctx.fillStyle = textData.colors[which];
    ctx.fillText(textData.text, textData.x, textData.y);
  }

  function drawClippingBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);
    ctx.clip()
  }

  function computeMouseDistance() {
    ball.dx = mouse.x - ball.x;
    ball.dy = mouse.y - ball.y;
  }
}