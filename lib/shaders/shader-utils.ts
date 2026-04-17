export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  src: string
): WebGLShader {
  if (!src || src.trim() === '') {
    throw new Error(
      'Shader source is empty or undefined. ' +
      'Check that the .ts shader file exports a default string.'
    )
  }
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log  = gl.getShaderInfoLog(shader)
    const preview = src.slice(0, 120)
    gl.deleteShader(shader)
    throw new Error(
      `Shader compile failed.\nLog: ${log}\nSource (first 120 chars): ${preview}`
    )
  }
  return shader
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string
): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER,   vertSrc)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  const program = gl.createProgram()!
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`)
  }
  gl.deleteShader(vert)
  gl.deleteShader(frag)
  return program
}

export function setUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniforms: Record<string, number | number[]>
) {
  gl.useProgram(program)
  for (const [name, value] of Object.entries(uniforms)) {
    const loc = gl.getUniformLocation(program, name)
    if (loc === null) continue
    if (typeof value === 'number') {
      gl.uniform1f(loc, value)
    } else if (value.length === 2) {
      gl.uniform2f(loc, value[0], value[1])
    } else if (value.length === 3) {
      gl.uniform3f(loc, value[0], value[1], value[2])
    }
  }
}
