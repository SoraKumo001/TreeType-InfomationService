import * as amf from "active-module-framework";
import { Users } from "./User/UsersModule";
import * as typeorm from "typeorm";

@typeorm.Entity()
class DatabaseConfigEntity extends typeorm.BaseEntity {
  @typeorm.PrimaryGeneratedColumn()
  id?: number;
  @typeorm.Column()
  REMOTEDB_HOST?: string;
  @typeorm.Column()
  REMOTEDB_PORT?: number;
  @typeorm.Column()
  REMOTEDB_DATABASE?: string;
  @typeorm.Column()
  REMOTEDB_USER?: string;
  @typeorm.Column()
  REMOTEDB_PASSWORD?: string;
}

export function Sleep(timeout: number): Promise<void> {
  return new Promise((resolv): void => {
    setTimeout((): void => {
      resolv();
    }, timeout);
  });
}
export interface CustomMap extends amf.ModuleMap {
  connect: [typeorm.Connection];
  disconnect: [];
}
export class RemoteDB<T extends CustomMap = CustomMap> extends amf.Module<T> {
  private entities: (( new () => T)|Function)[] = [];
  private localRepository?: typeorm.Repository<DatabaseConfigEntity>;
  public addEntity<T>(model:( new () => T)|Function) {
    this.entities.push(model);
  }
  public getRepository<T>(model: new () => T): typeorm.Repository<T> {
    if (!this.connection) throw "Error can't local database";
    return this.connection.getRepository(model);
  }
  connection?: typeorm.Connection;
  public static getModuleInfo(): amf.ModuleInfo {
    return {
      className: this.name,
      name: "リモートデータベースモジュール",
      version: 1,
      author: "空雲",
      info: "メインデータベースアクセス用"
    };
  }
  public getConnection() {
    return this.connection;
  }
  public async onCreateModule() {
    this.getLocalDB().addEntity(DatabaseConfigEntity);
    this.getManager().addEventListener("message",(e)=>{
      if(e === "connect")
        this.connect();
    })
    return true;
  }
  public async onCreatedModule() {
    const repository = this.getLocalDB().getRepository(DatabaseConfigEntity);
    this.localRepository = repository;
    this.connect();
    return true;
  }
  public async connect() {
    if (await this.open()) {
      this.output("DBの接続完了");
      return true;
    }
    return false;
  }

  public async open() {
    await this.close();

    if (!this.localRepository) return false;
    const config = await this.localRepository.findOne();
    if (!config) return false;

    const host = config.REMOTEDB_HOST || "localhost";
    const port = config.REMOTEDB_PORT || 0;
    const database = config.REMOTEDB_DATABASE || "postgres";
    const username = config.REMOTEDB_USER || "";
    const password = config.REMOTEDB_PASSWORD || "";

    //オープン前のフラグを設定
    //this.first = true;
    //ユーザ名が設定されていなければ戻る
    if (!username) return false;
    this.connection = await typeorm.createConnection({
      name: "RemoteDB",
      type: "postgres",
      host, // 接続するDBホスト名
      port,
      username, // DBユーザ名
      password, // DBパスワード
      database, // DB名
      synchronize: true,
      logging: false,
      entities: [...this.entities]
    });
    if (this.connection) this.callEvent("connect", this.connection);
    return true;
  }
  public async close() {
    const connection = this.connection;
    if (connection) {
      this.callEvent("disconnect");
      await connection.close();
      this.connection = undefined;
    }
  }

  public isAdmin() {
    const users = this.getSessionModule(Users);
    return users.isAdmin();
  }
  public async JS_getConfig() {
    if (!this.isAdmin()) return null;

    if (!this.localRepository) return false;
    const config = await this.localRepository.findOne();
    if (!config) return false;

    const host = config.REMOTEDB_HOST || "localhost";
    const port = config.REMOTEDB_PORT || 0;
    const database = config.REMOTEDB_DATABASE || "postgres";
    const username = config.REMOTEDB_USER || "";
    const password = config.REMOTEDB_PASSWORD || "";

    const result = {
      REMOTEDB_HOST: host,
      REMOTEDB_PORT: port,
      REMOTEDB_DATABASE: database,
      REMOTEDB_USER: username,
      REMOTEDB_PASSWORD: password
    };
    return result;
  }
  public async JS_setConfig(config: DatabaseConfigEntity) {
    if (!this.isAdmin()) return null;
    if (!this.localRepository) return null;
    await this.localRepository.clear();
    await this.localRepository.save(config);
    this.getManager().sendMessage("connect");
    return this.connect();
  }

  public async JS_getInfo() {
    if (!this.isAdmin() || !this.connection) return null;
    const result = await this.connection.query(
      "select true as connect,current_database() as database,pg_database_size(current_database()) as size,version() as server"
    );
    return result ? result[0] : null;
  }
}
