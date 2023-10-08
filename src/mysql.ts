import { Instruction, Connector } from "./util"
import { Value, resolveValue } from "./value"
import { createConnection, type Connection } from 'mariadb'

interface MysqlConnectionArgs {
  host: Value,
  port: Value,
  user: Value,
  password: Value
}

export async function connect(args: MysqlConnectionArgs) {
  const host = resolveValue(args.host, false, "host")
  const port = resolveValue(args.port, false, "port")
  const user = resolveValue(args.user, false, "user")
  const password = resolveValue(args.password, false, "password")

  const connection = await createConnection({
    host, port: parseInt(port),
    user, password,
    allowPublicKeyRetrieval: true
  })

  try {
    await connection.query("SELECT 1")
  } catch(err) {
    try { await connection.end() } catch {
      // do nothing
    }
    throw err
  }

  return connection
}

export interface MysqlCreateUserInstruction extends Instruction {
  name?: Value,
  hostmask?: Value,
  password?: Value,
  globalPermissions?: [string],
  grantAll?: boolean
}

export interface MysqlDeleteUserInstruction extends Instruction {
  name?: Value,
  hostmask?: Value
}

export const mysqlConnector: Connector<MysqlConnectionArgs, Connection> = {
  connect,
  async close(conn) { await conn.end() },
  implementations: {
    async createUser(connection, instruction: MysqlCreateUserInstruction): Promise<boolean> {
      const name = resolveValue(instruction.name, false, "name")
      const hostmask = instruction.hostmask ? resolveValue(instruction.hostmask) : "%"
      const fqun = `'${name}'@'${hostmask}'`
      const password = resolveValue(instruction.password, false, "password")
  
      // Check for preexisting user
      const rows  = await connection.query(`SELECT COUNT(*) FROM mysql.user WHERE user = '${name}'`)
      const count = rows?.[0]?.['COUNT(*)']
      if( count && count > 0) {
        console.log("createMysqlUser: user", name, "already exists, skipping")
        return true
      }

      // Create
      await connection.query(`CREATE USER ${fqun} IDENTIFIED BY '${password}' REQUIRE NONE WITH MAX_QUERIES_PER_HOUR 0 MAX_CONNECTIONS_PER_HOUR 0 MAX_UPDATES_PER_HOUR 0 MAX_USER_CONNECTIONS 0`)
      console.log("createMysqlUser: user", name, "created successfully")
    
      const globalPermissions = instruction.grantAll ? ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'FILE', 'INDEX', 'ALTER', 'SHOW DATABASES', 'CREATE TEMPORARY TABLES', 'LOCK TABLES', 'CREATE VIEW', 'EVENT', 'TRIGGER', 'SHOW VIEW', 'CREATE ROUTINE', 'ALTER ROUTINE', 'EXECUTE'] : (instruction.globalPermissions || [])
    
      if(globalPermissions.length > 0) {
        const perms = globalPermissions.join(', ')
        await connection.query(`GRANT ${perms} ON *.* TO ${fqun}`)
        console.log("createMysqlUser: user", name, "was granted", perms)
      }
  
      return true
    }
  }
}
