import { AppModule} from "../Manager/AppModule";

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
 * @extends {AppModule}
 */
export class InfoModule extends AppModule {
  public getInfo():Promise<ModuleInfo[]>{
    const adapter = this.getAdapter();
    //ユーザ情報の要求
    return adapter.exec("TestModule.getModuleInfo") as Promise<ModuleInfo[]>;
  }
}