import { Module } from "active-module-framework";
import { RemoteDB } from "./RemoteDB";
export class Params extends Module {
  public async onCreateModule() {
    const remoteDB = await this.getModule(RemoteDB);
    if (remoteDB) {
      remoteDB.addOpenListener(() => {
        remoteDB.run("create table IF NOT EXISTS params(params_name TEXT primary key,params_value TEXT);");
      });
    }
    return true;
  }
  public async getParam(name: string, defValue?: unknown) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB)
      return null;
    const result = await remoteDB.get("select params_value as value from params where params_name=$1", name);
    return result || { value: defValue };
  }
  public JS_getGlobal(name: string, defValue?: unknown) {
    return this.getParam("Global_" + name, defValue);
  }
}
