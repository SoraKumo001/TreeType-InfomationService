import { AppModule} from "../AppModule";
import { BaseView } from "javascript-window-framework";
import { AppManager } from "../AppManager";


/**
 *基本データ設定用モジュール
 *
 * @export
 * @class SettingView
 * @extends {BaseView}
 */
export class SettingView extends BaseView{
  private manager:AppManager;
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
    let data:SettingData|null = null;
    for(const key of names){
      const count = settings.length;
      data = null;
      for(let i = 0;i<count;i++){
        if(settings[i].name === key){
          data = settings[i];
          break;
        }
      }
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
