import { AppModule, ModuleMap } from "../AppModule";
import { AppManager } from "../AppManager";
export interface TreeContents{
  id:number;
  pid:number;
  stat:boolean;
  type:string;
  title:string;
  childs:TreeContents[]
}
export interface MainContents {
  id: number;
  pid: number;
  stat: number;
  type: string;
  date: Date;
  update: Date;
  title_type: number;
  title: string;
  value: string;
  childs?: MainContents[];
}
export interface CustomMap extends ModuleMap {
  selectPage: [number]; //parameter
}

export class ContentsModule extends AppModule<CustomMap>{
  public getTree(id?:number){
    const adapter = this.getAdapter();
    return adapter.exec("Contents.getTree", id?id:1) as Promise<TreeContents|null>;
  }
  public getPage(id:number){
    const adapter = this.getAdapter();
    return adapter.exec("Contents.getPage", id) as Promise<MainContents|null>;
  }
  public selectPage(id:number){
    this.callEvent("selectPage",id);
  }
}
