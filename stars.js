import { setup2DCanvas } from './lib.js';

export default function Stars2D() {

  let acceleration = 1;
  let accelerate = false;

  const main = document.getElementsByTagName('main')[0];

  setTimeout(() => {
    main.style.display = 'flex';
  }, 3000);

  main.addEventListener('click', e => {
    e.currentTarget.style.animation = 'fadeOut 1s ease-in-out forwards';
    e.currentTarget.style['background-color'] = 'lightblue';
    accelerate = true;
  });

  const particles = [];

  const { canvas, ctx } = setup2DCanvas();

  function loop() {
    window.requestAnimationFrame(loop);
    createParticles();
    updateParticles();
    killParticles();
    drawParticles();
  }

  window.requestAnimationFrame(loop);

  function vmod(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function dcenter(x, y) {
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    const dx = x - center.x;
    const dy = y - center.y;
    return [dx, dy];
  }

  function speedVectorAwayFromTheCenter(x, y) {
    const [dx, dy] = dcenter(x, y);

    const angle = Math.atan2(dy, dx);

    return [
      Math.cos(angle) * vmod(dx, dy) / 100,
      Math.sin(angle) * vmod(dx, dy) / 100,
    ];
  }

  function createParticles() {
    if (acceleration > 5)
      accelerate = false;

    for (let i = 0; i < Math.random() * 5 * acceleration; i++)
      createParticle();

    function createParticle() {
      const x = (Math.random() - 0.5) * canvas.width / 16 + canvas.width / 2;
      const y = (Math.random() - 0.5) * canvas.height / 16 + canvas.height / 2;
      particles.push({
        x, y,
        radius: Math.random() * 2,
        escape: Math.random() + 0.1,
        color: 'white'
      });
    }
  }

  function updateParticles() {
    for (let particle of particles) {
      const [vx, vy] = speedVectorAwayFromTheCenter(particle.x, particle.y);
      particle.x += vx * particle.escape * acceleration;
      particle.y += vy * particle.escape * acceleration;
    }

    if (accelerate)
      acceleration *= 1.01;
  }

  function killParticles() {
    for (let i = 0; i < particles.length; i++) {

      const { x, y } = particles[i];

      if (x < 0 || x > canvas.width || y < 0 || y > canvas.height)
        particles.splice(i, 1);
    }
  }

  function drawParticles() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const { x, y, color, radius, escape } of particles) {
      [dx, dy] = dcenter(x, y);
      ctx.beginPath();
      ctx.arc(x, y, escape * radius * vmod(dx, dy) / 500 + 0.1, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }
}
