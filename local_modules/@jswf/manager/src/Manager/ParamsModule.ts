import { BaseModule, ModuleMap} from "./BaseModule";

interface CustomMap extends ModuleMap {
  updateParam: [string, unknown]; //name,value
  updateGlobalParam: [string, unknown]; //name,value
}
/**
 *アプリケーションパラメータ入出力モジュール
 *
 * @export
 * @class ParamsModule
 * @extends {BaseModule<CustomMap>}
 */
export class ParamsModule extends BaseModule<CustomMap> {
  public getGlobalParam(name:string){
    const adapter = this.getAdapter();
    return adapter.exec("ParamModule.getGlobalParam",name) as Promise<unknown|null>;
  }
  public async setGlobalParam(name:string,value:unknown){
    const adapter = this.getAdapter();
    if(await adapter.exec("ParamModule.setGlobalParam",name,value)){
      this.callEvent("updateGlobalParam",name,value);
      return true;
    }
    return false;
  }
  public getParam(name:string){
    const adapter = this.getAdapter();
    return adapter.exec("ParamModule.getParam",name) as Promise<unknown|null>;
  }
  public async setParam(name:string,value:unknown){
    const adapter = this.getAdapter();
    if(await adapter.exec("ParamModule.setParam",name,value)){
      this.callEvent("updateParam",name,value);
       return true;
    }
    return false;
  }
}