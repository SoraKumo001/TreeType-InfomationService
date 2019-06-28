import * as amf from "active-module-framework";
import Postgres from "./lib/Postgres";
import { Users } from "./Users.auto";
import { ModuleMap } from "active-module-framework";

interface DATABASE_CONFIG {
  REMOTEDB_HOST: string;
  REMOTEDB_PORT: number;
  REMOTEDB_DATABASE: string;
  REMOTEDB_USER: number;
  REMOTEDB_PASSWORD?: string;
}

export function Sleep(timeout: number): Promise<void> {
  return new Promise(
    (resolv): void => {
      setTimeout((): void => {
        resolv();
      }, timeout);
    }
  );
}
export interface CustomMap extends ModuleMap {
  connect: [];
  disconnect: [];
}
export class RemoteDB<T extends CustomMap=CustomMap> extends amf.Module<T> {
  public constructor(manager: amf.Manager) {
    super(manager);
    const db = new Postgres();
    this.db = db;
  }
  public static getModuleInfo(): amf.ModuleInfo {
    return {
      className: this.name,
      name: "リモートデータベースモジュール",
      version: 1,
      author: "空雲",
      info: "メインデータベースアクセス用"
    };
  }
  public addEventListener<K extends keyof T>(name: K & string, proc: (...params: T[K]) => void): void{
    if(name === "connect"){
      if(!this.first)
        (proc as ()=>void)();
    }
    super.addEventListener(name,proc);
  }

  private items: { [key: string]: unknown } = {};
  private db: Postgres;
  private first = true;

  public async onCreateModule() {
    await this.connect();
    return true;
  }
  public async connect(){
    for (;;) {
      if (await this.open()) {
        this.output("DBの接続完了");
        //関連テーブルの初期化用
        if(this.first){
          this.callEvent("connect");
          this.first = false;
        }
        return true;
      }
      this.output("RemoteDBのオープンに失敗");
      await Sleep(1000);
    }
  }

  public async open() {
    const localDB = this.getLocalDB();
    const host = localDB.getItem("REMOTEDB_HOST", "localhost");
    const port = localDB.getItem("REMOTEDB_PORT", 5432);
    const database = localDB.getItem("REMOTEDB_DATABASE", "postgres");
    const user = localDB.getItem("REMOTEDB_USER", "");
    const password = localDB.getItem("REMOTEDB_PASSWORD", "");

    //オープン前のフラグを設定
    this.first = true;
    //ユーザ名が設定されていなければ戻る
    if(!user)
      return false;

    const db = this.db;
    if (
      !(await db.open({
        host,
        database,
        user,
        password,
        port,
        keepAlive: true
      }))
    ) {
      return false;
    }
    const client = db.getClient();
    if(!client)
      return false;
    client.on("error", async (error: Error) => {
      console.error(error);
      await this.close();
      this.connect();
    });

    //アイテム用テーブルの作成
    await this.run(
      "CREATE TABLE IF NOT EXISTS app_data (name text primary key,value json)"
    );
    const json = await this.get(
      "select json_build_object(name,value) as value from app_data"
    );
    this.items = json ? (json.value as {}) : {};

    return true;
  }
  public close() {
    const db = this.db;
    db.close();
  }
  public isConnect() {
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
  public async get2(sql: string, ...params: unknown[]) {
    const result = await this.get(sql, ...params);
    if (!result) return null;
    const v = Object.values(result);
    if (v.length) return v[0];
    return null;
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
