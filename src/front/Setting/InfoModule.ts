import { BaseModule } from "../Manager/BaseModule";

export interface ModuleInfo {
  className: string;
  name: string;
  version: number;
  author: string;
  info: string;
}

/**
 *プラグイン情報取得用モジュール
 *
 * @export
 * @class InfoModule
 * @extends {BaseModule}
 */
export class InfoModule extends BaseModule {
  public getInfo(): Promise<ModuleInfo[]> {
    const adapter = this.getAdapter();
    //ユーザ情報の要求
    return adapter.exec("InfoModule.getModuleInfo") as Promise<ModuleInfo[]>;
  }
}
