import { Module } from "active-module-framework";
import { RemoteDB } from "./RemoteDB";
import { Users } from "./Users";
export class Params extends Module {
  public async onCreateModule() {
    const remoteDB = await this.getModule(RemoteDB);
    if (remoteDB) {
      remoteDB.addEventListener("connect",() => {
        remoteDB.run("create table IF NOT EXISTS params(params_name TEXT primary key,params_value json);");
      });
    }
    return true;
  }
  public async getParam(name: string) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB)
      return null;
    const result = await remoteDB.get2("select params_value as value from params where params_name=$1", name) as string;
    if(result)
      return JSON.parse(result);
    return null;
  }
  public async setParam(name: string,value:unknown) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB)
      return null;
    const result = await remoteDB.run("insert into params values($1,$2) ON CONFLICT ON CONSTRAINT params_pkey do update set params_value=$2", name,value);
    return result;
  }
  public JS_getGlobal(name: string) {
    return this.getParam("Global_" + name);
  }
  public async JS_setGlobal(name:string,value:unknown){
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;
    return this.setParam("Global_" + name,value);
  }
}
