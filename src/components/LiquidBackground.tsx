import { useEffect, useRef } from 'preact/hooks';
import vert from '@/shaders/liquid-bg.vert?raw';
import frag from '@/shaders/liquid-bg.frag?raw';

/**
 * Compile a WebGL shader with error handling
 */
function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('Failed to create shader');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    console.error('Shader compilation failed:', info);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Link a WebGL program with error handling
 */
function linkProgram(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  vs: WebGLShader,
  fs: WebGLShader,
): boolean {
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    console.error('Program linking failed:', info);
    return false;
  }

  return true;
}

/**
 * Liquid mesh background with WebGL shader
 * Owns and manages its canvas element
 */
export function LiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      canvas.style.display = 'none';
      return;
    }

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.warn('WebGL not supported');
      return;
    }

    // Compile shaders
    const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);

    if (!vs || !fs) {
      return;
    }

    // Create and link program
    const program = gl.createProgram();
    if (!program) {
      console.error('Failed to create WebGL program');
      return;
    }

    if (!linkProgram(gl, program, vs, fs)) {
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);

    // Set up geometry (full screen quad)
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');

    let width = 0;
    let height = 0;
    let mouseX = 0;
    let mouseY = 0;
    let dpr = 1;
    let rafId = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio, 1.5);
      width = window.innerWidth * dpr;
      height = window.innerHeight * dpr;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uResolution, width, height);
    }

    function handleMouseMove(e: MouseEvent) {
      mouseX = e.clientX * dpr;
      mouseY = (window.innerHeight - e.clientY) * dpr;
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();

    const startTime = performance.now();

    function render() {
      const currentTime = performance.now();
      const time = (currentTime - startTime) * 0.001;

      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouseX, mouseY);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(render);
    }

    render();

    // Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return <canvas ref={canvasRef} id="liquid-bg" />;
}
