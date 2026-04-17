export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  src: string
): WebGLShader {
  if (!src || typeof src !== 'string' || src.trim().length === 0) {
    throw new Error(
      `Shader source is empty or not a string. Got: ${typeof src}. ` +
      `Check that your .ts shader files export a default string.`
    )
  }

  const trimmed = src.trimStart()
  if (!trimmed.startsWith('#version')) {
    throw new Error(
      `Shader does not start with #version directive. ` +
      `First 50 chars: "${src.slice(0, 50)}". ` +
      `Make sure there is NO whitespace or BOM before #version 300 es.`
    )
  }

  const shader = gl.createShader(type)
  if (!shader) throw new Error('gl.createShader returned null')

  gl.shaderSource(shader, src)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log     = gl.getShaderInfoLog(shader) ?? 'no log'
    const preview = src.slice(0, 200).replace(/\n/g, '↵')
    gl.deleteShader(shader)
    throw new Error(
      `GLSL compile error (${type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT'}):\n` +
      `${log}\n` +
      `Source preview: ${preview}`
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

  const program = gl.createProgram()
  if (!program) throw new Error('gl.createProgram returned null')

  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'no log'
    gl.deleteProgram(program)
    throw new Error(`GLSL link error: ${log}`)
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
