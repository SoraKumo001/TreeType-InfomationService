import * as pg from "pg";

export default class Postgres {
  private client: pg.Client;
  private connectStat: boolean;
  private lastError?: unknown;
  private config?: pg.ClientConfig;
  public constructor() {
    this.client = new pg.Client();
    this.connectStat = false;
  }
  public getClient(): pg.Client {
    return this.client;
  }
  public async open(config?: pg.ClientConfig): Promise<boolean> {
    //既存の接続を切断
    await this.close();

    this.connectStat = false;
    if (config) this.config = config;
    else if (this.config) config = this.config;
    else return false;

    const client = new pg.Client(config);
    //client.addListener("");
    this.client = client;
    return client
      .connect()
      .then((): boolean => {
        this.connectStat = true;
        return true;
      })
      .catch((e): boolean => {
        this.outputError(e);
        return false;
      });
  }
  public outputError(e: Error): void {
    // eslint-disable-next-line no-console
    console.error(e);
    this.lastError = e;
  }
  public getLastError(): unknown {
    return this.lastError;
  }
  public isConnect(): boolean {
    return this.connectStat;
  }
  public async isTable(name: string): Promise<boolean> {
    const result = await this.get(
      "select 1 as value from pg_tables where tablename=$1",
      name
    );
    if (result && result.value === 1) return true;
    return false;
  }
  public async close(): Promise<void> {
    const client = this.client;
    try{
    if(client)
      await client.end();
    }catch(e){
      //
    }
    this.connectStat = false;
  }
  public async run(sql: string, ...params: unknown[]): Promise<boolean | null> {
    if (!this.isConnect()) return null;
    const client = this.client;
    return await client
      .query(sql, params)
      .then((): boolean => {
        return true;
      })
      .catch((e): boolean => {
        // eslint-disable-next-line no-console
        console.error(sql);
        this.outputError(e);
        return false;
      });
  }
  public async all(
    sql: string,
    ...params: unknown[]
  ): Promise<unknown[] | null> {
    if (!this.isConnect()) return null;
    const client = this.client;
    return await client
      .query(sql, params)
      .then((result): unknown[] => {
        return result.rows;
      })
      .catch((e): null => {
        // eslint-disable-next-line no-console
        console.error("%s\n%s", sql, JSON.stringify(params));
        this.outputError(e);
        return null;
      });
  }
  public async get(
    sql: string,
    ...params: unknown[]
  ): Promise<({ [key: string]: unknown }) | null> {
    if (!this.isConnect()) return null;

    const client = this.client;
    return await client
      .query(sql, params)
      .then((result): { [key: string]: unknown } | null => {
        return result.rows ? result.rows[0] : null;
      })
      .catch((e): null => {
        // eslint-disable-next-line no-console
        console.error(sql);
        this.outputError(e);
        return null;
      });
  }
}
