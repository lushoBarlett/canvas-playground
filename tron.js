import { setup2DCanvas } from './lib.js';

async function accessToken() {
  const cliendID = 'e0ce7c5a25654079a4352b6bcfc14425';
  const clientSecret = 'fa10f88e258443a98fd5b038be182343';

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=client_credentials&client_id=${cliendID}&client_secret=${clientSecret}`
  });

  const { token_type, access_token } = await response.json();

  if (token_type !== 'Bearer')
    throw new Error('Token type is not Bearer');

  return access_token;
}

async function getTrack(trackId, token) {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}?market=AR`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  const { name, preview_url } = await response.json();

  return { name, preview: preview_url };
}

function createAudioElement(preview) {
  const audio =
    preview
    ? new Audio(preview)
    : new Audio('https://p.scdn.co/mp3-preview/6fba9b7a68571c873a607891a2f29aa69827a58b?cid=0b297fa8a249464ba34f5861d4140e58');

  audio.loop = true;

  return audio;
}

function segmentIntersection([axStart, ayStart], [axEnd, ayEnd], [bxStart, byStart], [bxEnd, byEnd]) {
  // this is a port of the algorithm described in
  // https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection#Given_two_points_on_each_line
  const a1 = ayEnd - ayStart;
  const b1 = axStart - axEnd;
  const c1 = a1 * axStart + b1 * ayStart;

  const a2 = byEnd - byStart;
  const b2 = bxStart - bxEnd;
  const c2 = a2 * bxStart + b2 * byStart;

  const determinant = a1 * b2 - a2 * b1;

  if (determinant === 0)
    return false;

  const x = (b2 * c1 - b1 * c2) / determinant;
  const y = (a1 * c2 - a2 * c1) / determinant;

  const rx0 = (x - axStart) / (axEnd - axStart);
  const ry0 = (y - ayStart) / (ayEnd - ayStart);
  const rx1 = (x - bxStart) / (bxEnd - bxStart);
  const ry1 = (y - byStart) / (byEnd - byStart);

  return (
    ((rx0 > 0 && rx0 < 1) || (ry0 > 0 && ry0 < 1)) &&
    ((rx1 > 0 && rx1 < 1) || (ry1 > 0 && ry1 < 1))
  )
}

function pathIntersection(path1, path2) {
  for (let i = 0; i < path1.length - 1; i++)
    for (let j = 0; j < path2.length - 1; j++)
      if (segmentIntersection(path1[i], path1[i + 1], path2[j], path2[j + 1]))
        return true;
  return false;
}

class Moto {
  constructor(ctx, x, y, width, height, color, direction, player) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.direction = direction;
    this.player = player;

    this.speed = 2;

    this.line = [[this.x, this.y], [this.x, this.y]];
  }

  draw() {
    this.ctx.fillStyle = this.color;
    const offsetx = this.width / 2;
    const offsety = this.height / 2;
    this.ctx.fillRect(this.x - offsetx, this.y - offsety, this.width, this.height);

    this.ctx.beginPath();

    for (const [x, y] of this.line)
      this.ctx.lineTo(x, y);

    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = 4;

    this.ctx.stroke();
  }

  move() {
    this.x += this.speed * Math.cos(this.direction);
    this.y += this.speed * Math.sin(this.direction);

    this.line[this.line.length - 1] = [this.x, this.y];
  }

  changeDirection(direction) {
    if (Math.abs(Math.cos(this.direction)) === Math.abs(Math.cos(direction)))
      return;

    if (Math.abs(Math.sin(this.direction)) === Math.abs(Math.sin(direction)))
      return;

    this.direction = direction;

    this.line.push([this.x, this.y]);
  }
};

export default async function Tron() {
  const token = await accessToken();

  const { name, preview } = await getTrack('7hqlHZIXhwAzpWQxm9KzBd', token);

  if (name !== 'Derezzed')
    throw new Error('Song picked is not Derezzed');

  if (!preview)
    console.warn('No preview available, using a backup preview');

  const audio = createAudioElement(preview);

  document.body.append(audio);

  document.body.addEventListener('click', () =>
    audio.paused ? audio.play() : audio.pause());

  const { canvas, ctx } = setup2DCanvas();

  const SIZE = Math.min(canvas.width, canvas.height);

  const SIDE = SIZE * 0.8;

  // paint neon borders
  const borderWidth = 8;
  const offset = {
    x: (canvas.width - SIDE) / 2,
    y: (canvas.height - SIDE) / 2,
  };

  // blur
  function neonBorder(borderWidth, offset, color) {
    neon(color)
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(offset.x, offset.y, SIDE, SIDE);
  }

  function neon(color) {
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
  }

  let motos;

  function resetGame() {
    motos = [
      new Moto(ctx, offset.x + 10, offset.y + 10, 10, 10, 'rgb(100, 200, 250)', 0, 1),
      new Moto(ctx, offset.x + SIDE - 10, offset.y + SIDE - 10, 10, 10, 'rgb(250, 200, 100)', Math.PI, 2),
    ];
  }

  resetGame();

  draw();

  window.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowUp':    return motos[0].changeDirection(3 * Math.PI / 2);
      case 'ArrowDown':  return motos[0].changeDirection(    Math.PI / 2);
      case 'ArrowLeft':  return motos[0].changeDirection(    Math.PI    );
      case 'ArrowRight': return motos[0].changeDirection(              0);
      case 'w':          return motos[1].changeDirection(3 * Math.PI / 2);
      case 's':          return motos[1].changeDirection(    Math.PI / 2);
      case 'a':          return motos[1].changeDirection(    Math.PI    );
      case 'd':          return motos[1].changeDirection(              0);
    }
  });

  window.addEventListener('keypress', e => {
    switch (e.key) {
      case '0': return motos[0].speed = 4;
      case ' ': return motos[1].speed = 4;
    }
  });

  window.addEventListener('keyup', e => {
    switch (e.key) {
      case '0': return motos[0].speed = 2;
      case ' ': return motos[1].speed = 2;
    }
  });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // paint the background black
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    neon('rgb(20, 50, 70)')
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = offset.x + SIDE / 10; i < offset.x + SIDE - borderWidth; i += SIDE / 10) {
      ctx.moveTo(i, offset.y + borderWidth / 2);
      ctx.lineTo(i, offset.y + SIDE - borderWidth / 2);
    }
    for (let i = offset.y + SIDE / 10; i < offset.y + SIDE - borderWidth; i += SIDE / 10) {
      ctx.moveTo(offset.x + borderWidth / 2, i);
      ctx.lineTo(offset.x + SIDE - borderWidth / 2, i);
    }
    ctx.stroke();

    neonBorder(borderWidth, offset, 'rgb(100, 200, 250)');
    neonBorder(borderWidth / 2, offset, 'rgb(250, 250, 250)');

    motos.forEach(moto => {
      moto.move();
      moto.draw();
    });

    if (pathIntersection(motos[0].line, motos[1].line))
      resetGame();

    if (pathIntersection(motos[0].line.slice(-2), motos[0].line.slice(0, -1)))
      resetGame();

    if (pathIntersection(motos[1].line.slice(-2), motos[1].line.slice(0, -1)))
      resetGame();

    const sceneBoundingPath = [
      [offset.x, offset.y],
      [offset.x + SIDE, offset.y],
      [offset.x + SIDE, offset.y + SIDE],
      [offset.x, offset.y + SIDE],
      [offset.x, offset.y],
    ];

    if (pathIntersection(motos[0].line, sceneBoundingPath))
      resetGame();

    if (pathIntersection(motos[1].line, sceneBoundingPath))
      resetGame();

    requestAnimationFrame(draw);
  }
}