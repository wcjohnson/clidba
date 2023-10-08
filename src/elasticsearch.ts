/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@elastic/elasticsearch"
import { Value, resolveValue } from "./value"
import { Connector, Instruction } from "./util"

export interface ElasticsearchConnectionArgs {
  url: Value,
  rootUser: Value,
  rootPass: Value
}

export async function connect(args: ElasticsearchConnectionArgs) {
  const url = resolveValue(args.url, false, "url")
  const rootUser = resolveValue(args.rootUser, false, "rootUser")
  const rootPass = resolveValue(args.rootPass, false, "rootPass")

  const client = new Client({
    nodes: [url],
    tls: {
      rejectUnauthorized: false
    },
    auth: {
      username: rootUser,
      password: rootPass
    }
  })

  try {
    await client.ping()
  } catch(err) {
    try { await client.close() } catch {
      // do nothing
    }
    throw err
  }

  return client
}


export interface ElasticsearchCreateRoleInstruction extends Instruction {
  name?: string,
  cluster?: [string],
  indices?: [any],
  applications?: [any]
}

export interface ElasticsearchCreateUserInstruction extends Instruction {
  name?: Value,
  password?: Value,
  roles?: [string]
}

export const elasticsearchConnector: Connector<ElasticsearchConnectionArgs, Client> = {
  connect,
  async close(conn) {
    await conn.close()
  },
  implementations: {
    async createRole(client, instruction: ElasticsearchCreateRoleInstruction) {
      const {name, cluster, indices, applications} = instruction
      if(!name) {
        throw new Error(`createRole: missing required argument 'name'`)
      }
      console.log("createElasticsearchRole: creating role ", name)
      try {
        // This will throw a 404 error if the role doesn't exist, which is the
        // desired case here.
        await client.security.getRole({name: name})
        console.log("createElasticsearchRole: role", name, "already exists, skipping")
        return true
      } catch {
        // do nothing
      }
  
      await client.security.putRole({
        name: name,
        refresh: 'wait_for',
        cluster: cluster || [],
        indices: indices || [],
        applications: applications || []
      })
      console.log("createElasticsearchRole: role", name, "created")
      return true
    },
  
    async createUser(client, instruction: ElasticsearchCreateUserInstruction) {
      const name = resolveValue(instruction.name, false, "name")
      const password = resolveValue(instruction.password, false, "password")
      const roles = instruction.roles || []
  
      try {
        // This will throw a 404 error if the user doesn't exist, which is the
        // desired case here.
        await client.security.getUser({username: name})
        console.log("createElasticsearchUser: user", name, "already exists, skipping")
        return true
      } catch {
        // do nothing
      }
  
      await client.security.putUser({
        username: name,
        refresh: "wait_for",
        password: password,
        roles: roles
      })
      console.log("createElasticsearchUser: user", name, "created")
      return true
    }
  }
}
