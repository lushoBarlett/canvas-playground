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