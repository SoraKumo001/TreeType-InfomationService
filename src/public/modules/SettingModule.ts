import { AppModule} from "../AppModule";
import { Window } from "javascript-window-framework";
import { AppManager } from "../AppManager";


export class SettingView extends Window{
  manager:AppManager;
  public constructor(manager:AppManager){
    super();
    this.manager = manager;
  }
  public getManager(){
    return this.manager;
  }
}
export interface SettingData{
  name:string,
  view:typeof SettingView|null,
  child:SettingData[]
}
export class SettingModule extends AppModule {
  private settings:SettingData[] = [];

  public addSetting(name:string,view?:typeof SettingView){
    const names = name.split('/');
    let settings = this.settings;
    let data:SettingData|undefined;
    for(const key of names){
      data = settings.find((data)=>{
        return data.name === key
      });
      if(!data){
        data = {name:key,view:null,child:[]};
        settings.push(data);
      }
      settings = data.child;
    }
    if(data){
      data.view = view?view:null;
    }
  }
  public getSettings(){
    return this.settings;
  }

}
