// =============================================================
// auth.gs — Sistema de autenticación con tokens firmados
// =============================================================

const Auth = {
  TOKEN_TTL_MS: 8 * 60 * 60 * 1000, // 8 horas

  /**
   * Autentica al usuario con email y contraseña.
   * Retorna la sesión con token si las credenciales son válidas.
   */
  login(email, password) {
    const usuario = Sheets.getBy('Usuarios', 'email', email)
    if (!usuario) throw new Error('Credenciales incorrectas')
    if (!usuario.activo) throw new Error('Usuario inactivo')

    // En producción usar bcrypt o similar; aquí usamos hash SHA-256 simple
    const passwordHash = this._sha256(password + CONFIG.JWT_SECRET)
    if (usuario.password_hash && usuario.password_hash !== passwordHash) {
      throw new Error('Credenciales incorrectas')
    }

    const ahora = Date.now()
    const payload = {
      userId: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      sucursalId: usuario.sucursal_id,
      iat: ahora,
      exp: ahora + this.TOKEN_TTL_MS,
    }

    const token = this._sign(payload)

    // Log de acceso
    LogService.registrar(usuario.id, 'LOGIN', 'Auth', usuario.sucursal_id, 'Login exitoso')

    return {
      sesion: {
        userId: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        sucursalId: usuario.sucursal_id,
        token: token,
        expiresAt: payload.exp,
      },
    }
  },

  /**
   * Verifica y decodifica un token.
   * Retorna { valid, userId, rol, sucursalId } o lanza error.
   */
  verifyToken(token) {
    if (!token) throw new Error('Token requerido')

    try {
      const payload = this._verify(token)
      if (Date.now() > payload.exp) throw new Error('Token expirado')

      return {
        valid: true,
        userId: payload.userId,
        nombre: payload.nombre,
        email: payload.email,
        rol: payload.rol,
        sucursalId: payload.sucursalId,
      }
    } catch (e) {
      throw new Error('Token inválido: ' + e.message)
    }
  },

  /** Firma un payload con HMAC-SHA256 */
  _sign(payload) {
    const header = this._b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const body = this._b64(JSON.stringify(payload))
    const sig = this._hmac(header + '.' + body)
    return header + '.' + body + '.' + sig
  },

  /** Verifica y decodifica un token firmado */
  _verify(token) {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Formato inválido')
    const [header, body, sig] = parts
    const expectedSig = this._hmac(header + '.' + body)
    if (sig !== expectedSig) throw new Error('Firma inválida')
    return JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(body)).getDataAsString())
  },

  _b64(str) {
    return Utilities.base64EncodeWebSafe(str).replace(/=+$/, '')
  },

  _hmac(data) {
    const mac = Utilities.computeHmacSha256Signature(data, CONFIG.JWT_SECRET)
    return Utilities.base64EncodeWebSafe(mac).replace(/=+$/, '')
  },

  _sha256(str) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str)
    return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('')
  },
}
