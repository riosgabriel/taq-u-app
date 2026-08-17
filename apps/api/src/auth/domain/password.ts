import { Data, Effect } from "effect"
import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto"

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 64
const SALT_LENGTH = 32

// Precomputed valid hash for a throwaway password. Login verifies against it when
// the email is unknown so both branches pay the same scrypt cost (no timing oracle).
export const DUMMY_PASSWORD_HASH = (() => {
  const salt = randomBytes(SALT_LENGTH)
  const hash = scryptSync("timing-equalizer", salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${hash.toString("hex")}`
})()

const scryptAsync = (password: string, salt: Buffer, keyLength: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })

export const hashPassword = async (plain: string): Promise<string> => {
  const salt = randomBytes(SALT_LENGTH)
  const hash = await scryptAsync(plain, salt, KEY_LENGTH)
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${hash.toString("hex")}`
}

export const verifyPassword = async (plain: string, encoded: string): Promise<boolean> => {
  const parts = encoded.split("$")
  if (parts.length !== 6 || parts[0] !== "scrypt") return false
  const keyLength = Buffer.from(parts[5], "hex").length
  if (keyLength === 0) return false
  const salt = Buffer.from(parts[4], "hex")
  const expected = Buffer.from(parts[5], "hex")
  const derived = await scryptAsync(plain, salt, keyLength)
  return timingSafeEqual(derived, expected)
}

export class PasswordHashError extends Data.TaggedError("auth/PasswordHashError")<{
  readonly cause: unknown
}> {}

export const hashPasswordEffect = (plain: string): Effect.Effect<string, PasswordHashError> =>
  Effect.tryPromise({
    try: () => hashPassword(plain),
    catch: (cause) => new PasswordHashError({ cause }),
  })

export const verifyPasswordEffect = (plain: string, encoded: string): Effect.Effect<boolean, PasswordHashError> =>
  Effect.tryPromise({
    try: () => verifyPassword(plain, encoded),
    catch: (cause) => new PasswordHashError({ cause }),
  })
