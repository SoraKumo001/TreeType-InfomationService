import * as amf from "active-module-framework";
import Postgres from "./lib/Postgres";
import { Users } from "./Users";

interface DATABASE_CONFIG {
  REMOTEDB_HOST: string;
  REMOTEDB_PORT: number;
  REMOTEDB_DATABASE: string;
  REMOTEDB_USER: number;
  REMOTEDB_PASSWORD?: string;
}

export class RemoteDB extends amf.Module {
  public static getModuleInfo(): amf.ModuleInfo {
    return {
      className: this.name,
      name: "リモートデータベースモジュール",
      version: 1,
      author: "空雲",
      info: "メインデータベースアクセス用"
    };
  }

  private items: { [key: string]: unknown } = {};
  private db: Postgres = new Postgres();
  private openListener: (() => void)[] = [];

  public async onCreateModule() {
    if (!(await this.open())) {
      //Module.output("RemoteDBのオープンに失敗");
      return true;
    }
    return true;
  }
  public addOpenListener(proc: () => void) {
    const listener = this.openListener;
    if (listener.findIndex(proc)!==-1) {
      listener.push(proc);
    }
    const db = this.db;
    if (db.isConnect()) proc();
  }
  public async open() {
    const localDB = this.getLocalDB();
    const host = localDB.getItem("REMOTEDB_HOST", "localhost");
    const port = localDB.getItem("REMOTEDB_PORT", 5432);
    const database = localDB.getItem("REMOTEDB_DATABASE", "postgres");
    const user = localDB.getItem("REMOTEDB_USER", "");
    const password = localDB.getItem("REMOTEDB_PASSWORD", "");

    const db = this.db;
    if (
      !(await db.open({
        host,
        database,
        user,
        password,
        port
      }))
    ) {
      return false;
    }
    //アイテム用テーブルの作成
    await this.run(
      "CREATE TABLE IF NOT EXISTS app_data (name text primary key,value json)"
    );
    var json = await this.get(
      "select json_build_object(name,value) as value from app_data"
    );
    this.items = json ? (json.value as {}) : {};

    //関連テーブルの初期化用
    const listener = this.openListener;
    for (const proc of listener) {
      proc();
    }
  }
  public close() {
    const db = this.db;
    db.close();
  }
  public isConnect(){
    return this.db.isConnect();
  }
  public run(sql: string, ...params: unknown[]) {
    return this.db.run(sql, ...params);
  }
  public all(sql: string, ...params: unknown[]) {
    return this.db.all(sql, ...params);
  }
  public get(
    sql: string,
    ...params: unknown[]
  ): Promise<
    | ({
        [key: string]: unknown;
      })
    | null
  > {
    return this.db.get(sql, ...params);
  }
  public setItem(name: string, value: unknown) {
    this.items[name] = value;
    return this.run(
      "INSERT INTO app_data VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET value = $2",
      name,
      JSON.stringify(value)
    );
  }
  public isTable(name: string) {
    return this.db.isTable(name);
  }
  public getItem(name: string): unknown {
    return this.items[name];
  }
  public async JS_getConfig() {
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;

    const localDB = this.getLocalDB();
    const host = localDB.getItem("REMOTEDB_HOST", "localhost");
    const port = localDB.getItem("REMOTEDB_PORT", 5432);
    const database = localDB.getItem("REMOTEDB_DATABASE", "postgres");
    const user = localDB.getItem("REMOTEDB_USER", "");

    const result = {
      REMOTEDB_HOST: host,
      REMOTEDB_PORT: port,
      REMOTEDB_DATABASE: database,
      REMOTEDB_USER: user
    };
    console.log(result);
    return result;
  }
  public async JS_setConfig(config: DATABASE_CONFIG) {
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;

    const localDB = this.getLocalDB();
    localDB.setItem(config as never);

    return this.open();
  }

  public async JS_getInfo() {
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;

    const db = this.db;
    if (!db.isConnect()) {
      return { connect: false };
    }
    return this.get(
      "select true as connect,current_database() as database,pg_database_size(current_database()) as size,version() as server"
    );
  }
}
