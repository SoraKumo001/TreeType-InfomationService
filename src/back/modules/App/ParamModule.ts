import * as amf from "@rfcs/core";
import { AppEntity, AppRepository } from "./AppEntity";
import { Users } from "../User/UsersModule";
import { RemoteDB } from "../RemoteDBModule";
export class ParamModule extends amf.Module {
  private appRepository!: AppRepository;

  public async onCreateModule() {
    const remoteDB = await this.getModule(RemoteDB);
    remoteDB.addEntity(AppEntity);
    return true;
  }
  public async onCreatedModule() {
    const remoteDB = await this.getModule(RemoteDB);
    remoteDB.addEventListener("connect", async () => {
      const connection = remoteDB.getConnection();
      if (connection) {
        this.appRepository = new AppRepository(connection);
      }
    });

    return true;
  }
  public async getItem<T>(name: string, defValue?: T): Promise<T> {
    if (!this.appRepository) return defValue as T;
    return this.appRepository.getItem(name, defValue);
  }
  public setItem(name: string, value: unknown) {
    if (!this.appRepository) return false;
    return this.appRepository.setItem(name, value);
  }
  public setItems(values: { [key: string]: unknown }) {
    if (!this.appRepository) return false;
    this.appRepository.setItems(values);
  }

  public isAdmin() {
    const users = this.getSessionModule(Users);
    return users.isAdmin();
  }
  @amf.EXPORT
  public getGlobalParam(name: string) {
    return this.getItem("Global_" + name);
  }
  @amf.EXPORT
  public async setGlobalParam(name: string, value: unknown) {
    if (!this.isAdmin()) return null;
    return this.setItem("Global_" + name, value);
  }
  @amf.EXPORT
  public async getParam(name: string) {
    if (!this.isAdmin()) return null;
    return this.getItem(name);
  }
  @amf.EXPORT
  public async setParam(name: string, value: unknown) {
    if (!this.isAdmin()) return null;
    return this.setItem(name, value);
  }
}
