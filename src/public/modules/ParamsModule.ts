import { AppModule, ModuleMap} from "../AppModule";

export interface CustomMap extends ModuleMap {
  updateParam: [string, unknown]; //name,value
  updateGlobalParam: [string, unknown]; //name,value
}
/**
 *アプリケーションパラメータ入出力モジュール
 *
 * @export
 * @class ParamsModule
 * @extends {AppModule<CustomMap>}
 */
export class ParamsModule extends AppModule<CustomMap> {
  public getGlobalParam(name:string){
    const adapter = this.getAdapter();
    return adapter.exec("Params.getGlobalParam",name) as Promise<unknown|null>;
  }
  public async setGlobalParam(name:string,value:unknown){
    const adapter = this.getAdapter();
    if(await adapter.exec("Params.setGlobalParam",name,value)){
      this.callEvent("updateGlobalParam",name,value);
      return true;
    }
    return false;
  }
  public getParam(name:string){
    const adapter = this.getAdapter();
    return adapter.exec("Params.getParam",name) as Promise<unknown|null>;
  }
  public async setParam(name:string,value:unknown){
    const adapter = this.getAdapter();
    if(await adapter.exec("Params.setParam",name,value)){
      this.callEvent("updateParam",name,value);
       return true;
    }
    return false;
  }
}