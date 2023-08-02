import { isMobileDevice, MobileControls, KeyboardControls, setup2DCanvas, WSStableConnection, Controls } from './lib.js';

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

const DIRECTION_VALUES = {
  RIGHT:           0    ,
  UP:        Math.PI / 2,
  LEFT:      Math.PI    ,
  DOWN:  3 * Math.PI / 2,
};

class Bike {
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

  updateLine() {
    const p = this.line[this.line.length - 1];
    p[0] = this.x;
    p[1] = this.y;
  }

  move() {
    const angle = DIRECTION_VALUES[this.direction];

    this.x += this.speed * Math.cos(angle);
    this.y -= this.speed * Math.sin(angle); // y axis is inverted

    this.updateLine();
  }

  changeDirection(direction) {
    if (this.direction === direction)
      return;

    this.direction = direction;

    this.line.push([this.x, this.y]);
  }

  changeSpeed(spedup) {
    this.speed = spedup ? 4 : 2;
  }

  updateDirection(direction, x, y) {
    this.x = x;
    this.y = y;
    this.updateLine();
    this.changeDirection(direction);

    console.log(this);
  }

  updateSpeed(spedup, x, y) {
    this.x = x;
    this.y = y;
    this.updateLine();
    this.changeSpeed(spedup);

    console.log(this);
  }
};

function PlayButton(audio) {
  const playbutton = document.createElement('button');

  playbutton.style = `
    position: absolute; bottom: 3rem; right: 3rem; width: 6rem; height: 6rem; border-radius: 50%;
    background-color: cyan; color: black; font-size: 2rem; font-weight: bold;
    border: none; outline: none; user-select: none; cursor: pointer;
  `;

  playbutton.innerText = "▶";

  playbutton.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      playbutton.innerText = "⏸";

    } else {
      audio.pause();
      playbutton.innerText = "▶";
    }
  });

  return playbutton;
}

export default async function Tron() {
  const token = await accessToken();

  const { name, preview } = await getTrack('7hqlHZIXhwAzpWQxm9KzBd', token);

  if (name !== 'Derezzed')
    throw new Error('Song picked is not Derezzed');

  if (!preview)
    console.warn('No preview available, using a backup preview');

  const audio = createAudioElement(preview);

  document.body.append(audio, PlayButton(audio));

  const { canvas, ctx } = setup2DCanvas();

  /**
   * Used as parameters of the graphics of the game.
   * Calculated after the canvas size is handshaked
   */
  let SIZE, SIDE, OFFSET;

  const BORDER = 8;

  const MQ = new WSStableConnection(`ws://${window.location.hostname}:11235`, receiver);

  MQ.send({ type: 'connect' });

  /**
   * @type {readonly [Bike, Bike]}
   * Both bikes are stored in this array,
   * one is controlled by the player, the other
   * is controlled by another player in the web
   */
  let bikes;

  /**
   * @type {0 | 1}
   * Bike index that is controlled by the player
   * We receive this information from the server
   * in the 'connect' message
   */
  let me;

  /**
   * @type {boolean}
   * Whether the game is running or not,
   * we use this to stop the game loop in
   * the update function when the game is over
   */
  let gameOn;

  /**
   * @type {Controls}
   * Controls object that is used to control
   */
  let controls;

  return; // ONLY REACTIVE CODE FROM HERE ON

  function receiver(message) {
    switch (message.type) {

      case 'connect':
        me = message.player - 1;
        calculateGameParameters(canvas.width, canvas.height);
        resetGame();
        draw();
        MQ.send({ type: 'start', width: canvas.width, height: canvas.height });
        break;

      case 'start':
        gameOn = true;
        calculateGameParameters(message.width, message.height);
        resetGame();
        controls = isMobileDevice() ? new MobileControls() : new KeyboardControls();
        controls.setup(changeDirection, changeSpeed);
        update();
        break;

      case 'turn':
        bikes[1 - me].updateDirection(message.direction, message.x, message.y);
        break;

      case 'speed':
        bikes[1 - me].updateSpeed(message.spedup, message.x, message.y);
        break;

      case 'won':
        resetGame();
        break;
    }
  }

  function changeDirection(direction) {
    MQ.send({ type: 'turn', direction, x: bikes[me].x, y: bikes[me].y });
    bikes[me].changeDirection(direction);
  }

  function changeSpeed(spedup) {
    MQ.send({ type: 'speed', spedup, x: bikes[me].x, y: bikes[me].y });
    bikes[me].changeSpeed(spedup);
  }

  function calculateGameParameters(width, height) {
    canvas.width = width;
    canvas.height = height;

    SIZE = Math.min(canvas.width, canvas.height);
    SIDE = SIZE * 0.8;
    OFFSET = {
      x: (canvas.width - SIDE) / 2,
      y: (canvas.height - SIDE) / 2,
    };
  }

  function neonBorder(borderWidth, offset, color) {
    neon(color)
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(offset.x, offset.y, SIDE, SIDE);
  }

  function neon(color) {
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
  }

  function resetGame() {
    bikes = [
      new Bike(ctx, OFFSET.x + 10, OFFSET.y + 10, 10, 10, "rgb(100, 200, 250)", 'RIGHT', 1),
      new Bike(ctx, OFFSET.x + SIDE - 10, OFFSET.y + SIDE - 10, 10, 10, "rgb(250, 200, 100)", 'LEFT', 2),
    ];
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    neon("rgb(20, 50, 70)");
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = OFFSET.x + SIDE / 10; i < OFFSET.x + SIDE - BORDER; i += SIDE / 10) {
      ctx.moveTo(i, OFFSET.y + BORDER / 2);
      ctx.lineTo(i, OFFSET.y + SIDE - BORDER / 2);
    }
    for (let i = OFFSET.y + SIDE / 10; i < OFFSET.y + SIDE - BORDER; i += SIDE / 10) {
      ctx.moveTo(OFFSET.x + BORDER / 2, i);
      ctx.lineTo(OFFSET.x + SIDE - BORDER / 2, i);
    }
    ctx.stroke();

    neonBorder(BORDER, OFFSET, "rgb(100, 200, 250)");
    neonBorder(BORDER / 2, OFFSET, "rgb(250, 250, 250)");

    bikes.forEach(moto => {
      moto.move();
      moto.draw();
    });

    const mine = bikes[me];
    const theirs = bikes[1 - me];

    if (pathIntersection(mine.line.slice(-2), theirs.line)) {
      MQ.send({ type: "hit", player: me + 1, x: mine.x, y: mine.y });
      resetGame();
    }

    if (pathIntersection(theirs.line.slice(-2), mine.line)) {
      MQ.send({ type: "hit", player: 2 - me, x: theirs.x, y: theirs.y });
      resetGame();
    }

    if (pathIntersection(mine.line.slice(-2), mine.line.slice(0, -1))) {
      MQ.send({ type: "hit", player: me + 1, x: mine.x, y: mine.y });
      resetGame();
    }

    if (pathIntersection(theirs.line.slice(-2), theirs.line.slice(0, -1))) {
      MQ.send({ type: "hit", player: 2 - me, x: theirs.x, y: theirs.y });
      resetGame();
    }

    const sceneBoundingPath = [
      [OFFSET.x, OFFSET.y],
      [OFFSET.x + SIDE, OFFSET.y],
      [OFFSET.x + SIDE, OFFSET.y + SIDE],
      [OFFSET.x, OFFSET.y + SIDE],
      [OFFSET.x, OFFSET.y],
    ];

    if (pathIntersection(mine.line, sceneBoundingPath)) {
      MQ.send({ type: "hit", player: me + 1, x: mine.x, y: mine.y });
      resetGame();
    }

    if (pathIntersection(theirs.line, sceneBoundingPath)) {
      MQ.send({ type: "hit", player: 2 - me, x: theirs.x, y: theirs.y });
      resetGame();
    }
  }

  function update() {
    draw();

    if (gameOn)
      requestAnimationFrame(update);
  }
}