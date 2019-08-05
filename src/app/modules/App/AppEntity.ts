import { ExtendRepository } from "../ExtendRepository";
import {
  Entity,
  PrimaryColumn,
  Column,
  EntityRepository,
  Connection
} from "typeorm";

@Entity()
export class AppEntity {
  @PrimaryColumn()
  name!: string;
  @Column()
  value!: string;
}

@EntityRepository(AppEntity)
export class AppRepository extends ExtendRepository<AppEntity> {
  private items: { [key: string]: unknown } = {};
  constructor(con: Connection) {
    super(con, AppEntity);
  }

  public async init(): Promise<void> {
    this.items = await this.getItems();
  }
  public async getItems() {
    const result = await this.find();
    if (!result) return {};
    const map: { [key: string]: string } = {};
    for (const r of result) map[r.name] = JSON.parse(r.value);
    return map;
  }
  public async setItem(name: string, values: unknown) {
    const value = JSON.stringify(values);
    this.items[name] = value;
    await this.save({ name, value });
  }
  /**
   *アプリケーションデータの設定
   *
   * @param {string} name
   * @param {*} value
   * @memberof LocalDB
   */
  public async setItems(values: { [key: string]: unknown }): Promise<void> {
    for (const name of Object.keys(values)) {
      const v = values[name as keyof typeof values];
      this.items[name] = v;
      const value = JSON.stringify(v);
      await this.save({ name, value });
    }
  }
  /**
   *アプリケーションデータの取得
   *
   * @param {string} name
   * @returns {*}
   * @memberof LocalDB
   */
  public getItem(name: string): unknown;
  public getItem<T>(name: string, defValue?: T): T;
  public getItem(name: string, defValue?: unknown): unknown {
    const value = this.items[name];
    if (value) {
      if (typeof defValue === "number" && typeof value === "string")
        return parseInt(value) as typeof defValue;
      return value;
    } else if (defValue !== undefined) return defValue;
    return value;
  }
}
