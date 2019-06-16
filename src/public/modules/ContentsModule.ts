import { AppModule } from "../AppModule";
export interface TreeContents{
  id:number;
  pid:number;
  stat:boolean;
  type:string;
  title:string;
  childs:TreeContents[]
}
export class ContentsModule extends AppModule {
  public getTree(id?:number){
    const adapter = this.getAdapter();
    return adapter.exec("Contents.getTree", id?id:1) as Promise<TreeContents|null>;
  }
}