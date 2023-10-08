// Resolve configuration values from environment or raw data
enum ValueType {
  env = "env",
  raw = "raw"
}

type EnvValue = { type: ValueType.env, env: string }
type RawValue = { type: ValueType.raw, value: string }

export type Value = EnvValue | RawValue | string

export function resolveValue(v: Value | undefined, optional: boolean = false, context: string = '(unknown)'): string {
  // Treat string value as raw
  if(typeof(v) === "string") {
    return v
  }

  if(!v || typeof(v) !== "object") {
    if(!optional) {
      throw new Error(`Missing required value: ${context}`)
    } else {
      return ""
    }
  }

  switch(v.type) {
    case ValueType.raw:
      return v.value

    case ValueType.env: {
      const key = v.env.toUpperCase()
      const val = process.env[key]
      if(!val && !optional) {
        throw new Error(`Missing required configuration environment variable: ${key}`)
      }
      return (val || "")
    }
  }
}
