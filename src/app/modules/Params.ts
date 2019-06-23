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
    return await remoteDB.get2("select params_value as value from params where params_name=$1", name) as unknown;
  }
  public async setParam(name: string,value:unknown) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB)
      return null;
    const result = await remoteDB.run("insert into params values($1,$2) ON CONFLICT ON CONSTRAINT params_pkey do update set params_value=$2", name,value);
    return result;
  }
  public getGlobalParam(name: string) {
    return this.getParam("Global_" + name);
  }
  public setGlobalParam(name: string,value:unknown) {
    return this.setParam("Global_" + name,value);
  }
  public JS_getGlobalParam(name: string) {
    return this.getGlobalParam(name);
  }
  public async JS_setGlobalParam(name:string,value:unknown){
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;
    return this.setGlobalParam(name,value);
  }
  public async JS_getParam(name: string) {
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;
    return this.getParam(name);
  }
  public async JS_setParam(name:string,value:unknown){
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;
    return this.setParam(name,value);
  }
}
