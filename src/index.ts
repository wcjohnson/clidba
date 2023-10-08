import fs from "fs"
import { runProgram } from "./util"
import { mysqlConnector } from "./mysql"
import { elasticsearchConnector } from "./elasticsearch"

const drivers = {
  mysql: {
    connector: mysqlConnector
  },
  elasticsearch: {
    connector: elasticsearchConnector
  }
}

async function main(jsonFile: string) {
  const dataStr = await fs.promises.readFile(jsonFile, 'utf8')
  const data = JSON.parse(dataStr)
  const driver = drivers[data.driver as keyof typeof drivers]
  if(!driver) throw new Error(`invalid driver '${data.driver}'`)
  await runProgram(driver.connector, data.config, data.instructions)
}

main(process.argv[2]).then(() => {
  process.exit(0)
}).catch((err) => {
  console.error(err)
  console.log("exiting with error code 1")
  process.exit(1)
})
