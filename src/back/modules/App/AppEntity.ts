import { ExtendRepository } from "../ExtendRepository";
import {
  Entity,
  PrimaryColumn,
  Column,
  EntityRepository,
  Connection,
} from "typeorm";

@Entity()
export class AppEntity {
  @PrimaryColumn()
  name!: string;
  @Column("simple-json", { default: "{}" })
  value!: unknown;
}

@EntityRepository(AppEntity)
export class AppRepository extends ExtendRepository<AppEntity> {
  constructor(con: Connection) {
    super(con, AppEntity);
  }

  public async getItems() {
    const result = await this.find();
    if (!result) return {};
    const map: { [key: string]: unknown } = {};
    for (const r of result) map[r.name] = r.value;
    return map;
  }
  public async setItem(name: string, value: unknown) {
    //const value = JSON.stringify(values);
    return await this.save({ name, value });
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
      await this.save({ name, value: JSON.stringify(v) });
    }
  }
  /**
   *アプリケーションデータの取得
   *
   * @param {string} name
   * @returns {*}
   * @memberof LocalDB
   */
  public async getItem(name: string): Promise<unknown>;
  public async getItem<T>(name: string, defValue?: T): Promise<T>;
  public async getItem(name: string, defValue?: unknown): Promise<unknown> {
    const entity = await this.findOne(name);
    const value = entity ? entity.value : undefined;
    if (value) {
      if (typeof defValue === "number" && typeof value === "string")
        return parseInt(value) as typeof defValue;
      return value;
    } else if (defValue !== undefined) return defValue;
    return value;
  }
}
