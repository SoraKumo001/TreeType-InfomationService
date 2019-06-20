import * as pg from "pg";

export default class Postgres {
  client: pg.Client;
  connectStat: boolean;
  lastError?: unknown;
  config?: pg.ClientConfig;
  constructor() {
    this.client = new pg.Client();
    this.client.addListener("end", () => {
      console.log("end");
    });
    this.connectStat = false;
  }
  public getClient(){
    return this.client;
  }
  public async open(config?: pg.ClientConfig) {
    this.connectStat = false;
    if (config) this.config = config;
    else if (this.config) config = this.config;
    else return false;

    const client = new pg.Client(config);
    //client.addListener("");
    this.client = client;
    return client
      .connect()
      .then(() => {
        this.connectStat = true;
        return true;
      })
      .catch(e => {
        this.outputError(e);
        return false;
      });
  }
  public outputError(e: Error) {
    console.error(e);
    this.lastError = e;
  }
  public getLastError() {
    return this.lastError;
  }
  public isConnect() {
    return this.connectStat;
  }
  public async isTable(name: string) {
    const result = await this.get(
      "select 1 as value from pg_tables where tablename=$1",
      name
    );
    if (result && result.value === 1) return true;
    return false;
  }
  public async close() {
    await this.client.end();
    this.connectStat = false;
  }
  public async run(sql: string, ...params: unknown[]) {
    if (!this.isConnect())
      return null;
    const client = this.client;
    return await client
      .query(sql, params)
      .then(() => {
        return true;
      })
      .catch(e => {
        console.error(sql);
        this.outputError(e);
        return false;
      });
  }
  public async all(sql: string, ...params: unknown[]) {
    if (!this.isConnect())
      return null;
    const client = this.client;
    return await client
      .query(sql, params)
      .then(result => {
        return result.rows;
      })
      .catch(e => {
        console.error(sql);
        this.outputError(e);
        return null;
      });
  }
  public async get(
    sql: string,
    ...params: unknown[]
  ): Promise<({ [key: string]: unknown }) | null> {
    if (!this.isConnect())
      return null;

    const client = this.client;
    return await client
      .query(sql, params)
      .then(result => {
        return result.rows ? result.rows[0] : null;
      })
      .catch(e => {
        console.error(sql);
        this.outputError(e);
        return null;
      });
  }
}
