/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Await `connector(args)` repeatedly on the given delay until the given number of attempts is exhausted. Returns the result of the connector.
 */
export async function repeatConnect<T, U>(attempts: number, _delay: number, connector: (args: T) => Promise<U>, args: T): Promise<U> {
  for(let i = 0; i < attempts; i++) {
    let connection = null
    try {
      connection = await connector(args)
      if(!connection) throw new Error("connection failed")
      return connection
    } catch(err) {
      console.log("Connection attempt #", i+1, "failed with error", err, "retrying in", _delay, "ms")
    }
    await delay(_delay)
  }

  console.log("All", attempts, "attempts have been exhausted, aborting connection")
  throw new Error("connection attempts exhausted")
}

async function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export interface Instruction {
  operation: string,
  optional?: boolean,
  [k: string]: any
}

export type Implementation<ConnectionT, InstructionT = Instruction> = (connection: ConnectionT, instruction: InstructionT) => Promise<boolean>

export interface Connector<ConnectionArgsT, ConnectionT> {
  connect: (connectionArgs: ConnectionArgsT) => Promise<ConnectionT>,
  close: (connection: ConnectionT) => Promise<void>,
  implementations: {
    [operation: string]: Implementation<ConnectionT> | undefined
  }
}

export type GetConnectionType<D extends Connector<any,any>> = Parameters<D["close"]>[0]
export type GetConfigType<D extends Connector<any,any>> = Parameters<D["connect"]>[0]

/**
 * Connect to a database, then run a program on it.
 */
export async function runProgram<ConnectorT extends Connector<any, any>>(connector: ConnectorT, connectionArgs: GetConfigType<ConnectorT>, instructions: [Instruction]) {
  // Connect
  const connection = await repeatConnect(50, 10000, connector.connect, connectionArgs)

  // Run program
  for(const [i, instruction] of instructions.entries()) {
    try {
      const impl = connector.implementations[instruction.operation]
      if(impl) {
        if(!await impl(connection, instruction)) {
          throw new Error("instruction returned false")
        }
      } else {
        throw new Error(`Operation ${instruction.operation} not implemented.`)
      }
    } catch(err) {
      if(instruction.optional) {
        console.error("Instruction #", i, "with data", instruction, "failed with error", err, "but the instruction was optional. Continuing.")
      } else {
        const e = new Error(`Instruction #${i} with data ${instruction} failed: ${(err as Error).message}`)
        throw e
      }
    }
  }

  // Close connection
  try {
    await connector.close(connection)
  } catch(err) {
    console.error("Failed while trying to close connection", err)
  }
}
