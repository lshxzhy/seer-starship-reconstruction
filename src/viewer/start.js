
(() => {
  'use strict';
  const root = document.getElementById('seer-starship-3d');
  const canvas = root.querySelector('canvas');
  const stage = root.querySelector('.seer-stage');
  const error = root.querySelector('.seer-error');
  const rotateButton = root.querySelector('[data-action="rotate"]');
  const wireButton = root.querySelector('[data-action="wire"]');
  const status = root.querySelector('[data-status]');
  const showError = message => { error.textContent = message; error.hidden = false; };
  if (!window.THREE) { showError('Three.js 未能加载，请联网后重新打开。离线 HTML 文件已内置所需库。'); return; }
  const T = window.THREE;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:'high-performance'});
  } catch (e) { showError('当前浏览器未能启用 WebGL，请在支持硬件加速的浏览器中打开。'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setClearColor(0, 0);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(38, 1, .1, 240);
  const ship = new T.Group();
  scene.add(ship);
