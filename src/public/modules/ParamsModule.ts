import { AppModule} from "../AppModule";

export class ParamsModule extends AppModule {
  public getGlobal(name:string){
    const adapter = this.getAdapter();
    return adapter.exec("Params.getGlobal",name) as Promise<unknown|null>;
  }
  public setGlobal(name:string,value:unknown){
    const adapter = this.getAdapter();
    return adapter.exec("Params.setGlobal",name,value) as Promise<boolean|null>;
  }
}