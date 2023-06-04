import { setup2DWebGLCanvas } from "./lib.js";

let glctx = null;
let canvas = null;

// Aspect ratio and coordinate system
// details

let aspectRatio;
let currentRotation = [0, 1];
let currentScale = [1.0, 1.0];

// Vertex information

let vertexArray;
let vertexBuffer;
let vertexNumComponents;
let vertexCount;

// Rendering data shared with the
// scalers.

let uScalingFactor;
let uRotationVector;
let aVertexPosition;
let uResolution;
let uTime;

// Animation timing

let shaderProgram;
let currentAngle;
let previousTime = 0.0;
let degreesPerSecond = 90.0;

function compileShader(id, type) {
  const code = document.getElementById(id).firstChild.nodeValue;
  const shader = glctx.createShader(type);

  glctx.shaderSource(shader, code);
  glctx.compileShader(shader);

  if (!glctx.getShaderParameter(shader, glctx.COMPILE_STATUS)) {
    console.log(
      `Error compiling ${type === glctx.VERTEX_SHADER ? "vertex" : "fragment"
      } shader:`
    );
    console.log(glctx.getShaderInfoLog(shader));
  }
  return shader;
}

function buildShaderProgram(shaderInfo) {
  const program = glctx.createProgram();

  shaderInfo.forEach((desc) => {
    const shader = compileShader(desc.id, desc.type);

    if (shader) {
      glctx.attachShader(program, shader);
    }
  });

  glctx.linkProgram(program);

  if (!glctx.getProgramParameter(program, glctx.LINK_STATUS)) {
    console.log("Error linking shader program:");
    console.log(glctx.getProgramInfoLog(program));
  }

  return program;
}

export default function Caleidoscope() {

  const { canvas: c, glctx: g } = setup2DWebGLCanvas();
  canvas = c;
  glctx = g;

  const shaderSet = [
    {
      type: glctx.VERTEX_SHADER,
      id: "vertex-shader",
    },
    {
      type: glctx.FRAGMENT_SHADER,
      id: "fragment-shader",
    },
  ];

  shaderProgram = buildShaderProgram(shaderSet);

  aspectRatio = canvas.width / canvas.height;
  currentRotation = [0, 1];
  currentScale = [1.0, aspectRatio];

  vertexArray = new Float32Array([
    -1,  1,
     1,  1,
     1, -1,

    -1,  1,
     1, -1,
    -1, -1,
  ]);

  vertexBuffer = glctx.createBuffer();
  glctx.bindBuffer(glctx.ARRAY_BUFFER, vertexBuffer);
  glctx.bufferData(glctx.ARRAY_BUFFER, vertexArray, glctx.STATIC_DRAW);

  vertexNumComponents = 2;
  vertexCount = vertexArray.length / vertexNumComponents;

  currentAngle = 0.0;

  animateScene();
}

function animateScene() {
  glctx.viewport(0, 0, canvas.width, canvas.height);
  glctx.clearColor(0, 0, 0, 1);
  glctx.clear(glctx.COLOR_BUFFER_BIT);

  const radians = (currentAngle * Math.PI) / 180.0;
  //currentRotation[0] = Math.sin(radians);
  //currentRotation[1] = Math.cos(radians);

  glctx.useProgram(shaderProgram);

  uScalingFactor = glctx.getUniformLocation(shaderProgram, "uScalingFactor");
  uRotationVector = glctx.getUniformLocation(shaderProgram, "uRotationVector");
  uResolution = glctx.getUniformLocation(shaderProgram, "uResolution");
  uTime = glctx.getUniformLocation(shaderProgram, "uTime");

  glctx.uniform2fv(uScalingFactor, currentScale);
  glctx.uniform2fv(uRotationVector, currentRotation);
  glctx.uniform2fv(uResolution, [canvas.width, canvas.height]);
  glctx.uniform1f(uTime, previousTime / 1000);

  glctx.bindBuffer(glctx.ARRAY_BUFFER, vertexBuffer);

  aVertexPosition = glctx.getAttribLocation(shaderProgram, "aVertexPosition");

  glctx.enableVertexAttribArray(aVertexPosition);
  glctx.vertexAttribPointer(
    aVertexPosition,
    vertexNumComponents,
    glctx.FLOAT,
    false,
    0,
    0
  );

  glctx.drawArrays(glctx.TRIANGLES, 0, vertexCount);

  requestAnimationFrame((currentTime) => {
    const deltaAngle =
      ((currentTime - previousTime) / 1000.0) * degreesPerSecond;

    currentAngle = (currentAngle + deltaAngle) % 360;

    previousTime = currentTime;
    animateScene();
  });
}