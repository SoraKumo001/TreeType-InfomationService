import { AppModule} from "../AppModule";

export class ParamsModule extends AppModule {
  public getGlobalParam(name:string){
    const adapter = this.getAdapter();
    return adapter.exec("Params.getGlobalParam",name) as Promise<unknown|null>;
  }
  public setGlobalParam(name:string,value:unknown){
    const adapter = this.getAdapter();
    return adapter.exec("Params.setGlobalParam",name,value) as Promise<boolean|null>;
  }
  public getParam(name:string){
    const adapter = this.getAdapter();
    return adapter.exec("Params.getParam",name) as Promise<unknown|null>;
  }
  public setParam(name:string,value:unknown){
    const adapter = this.getAdapter();
    return adapter.exec("Params.setParam",name,value) as Promise<boolean|null>;
  }
}