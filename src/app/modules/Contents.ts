import * as amf from "active-module-framework";
import { Users } from "./Users";
import { RemoteDB } from "./RemoteDB";
import { Files } from "./Files";

interface TreeContents{
  id:number;
  pid:number;
  stat:boolean;
  type:string;
  title:string;
  childs:TreeContents[]
}
export class Contents extends amf.Module {
  public async onCreateModule(): Promise<boolean> {
    //データベースの初期化
    const remoteDB = await this.getModule(RemoteDB);
    if (remoteDB) {
      remoteDB.addOpenListener(async () => {
        if (!await remoteDB.isTable("contents")) {
          remoteDB.run(
            `create table contents(
					contents_id SERIAL primary key,
					contents_parent INTEGER references contents(contents_id),
					contents_priority INTEGER,
					contents_stat INTEGER,contents_type TEXT,
					contents_date timestamp with time zone,contents_update timestamp with time zone,
					contents_title_type integer,contents_title TEXT,contents_value TEXT);
          insert into contents values(default,null,1000,1,'PAGE',current_timestamp,current_timestamp,0,'Top','')
          `
          );
        }
         const files = await this.getModule(Files);
         if(files)
           files.createDir(1,"Contents");
      });

    }

    const localDB = this.getLocalDB();
    //localDB.db.run('drop table users');
    localDB.run(
      "CREATE TABLE IF NOT EXISTS users (users_no integer primary key,users_enable boolean,\
			users_id TEXT,users_password TEXT,users_name TEXT,users_info JSON,UNIQUE(users_id))"
    );
    return true;
  }

  public async JS_getTree(id:number){
    const users = await this.getSessionModule(Users);
    const visible = (!users || !users.isAdmin())?"where contents_stat=1":"";
    const remoteDB = await this.getModule(RemoteDB);
    if(!remoteDB)
      return null;
    const values = await remoteDB.all(`select contents_id as id,contents_parent as pid,contents_stat as stat,
			contents_type as type,contents_title as title from contents ${visible} order by contents_type='PAGE',contents_priority`);
    if(!values)
      return null;
    //ID参照データの作成
    const items:{[key:number]:TreeContents} = {};
    for(const value of values){
      items[value.id] = value;
    }
    //親子関係ツリーの作成
    for(const key of Object.keys(items)){
      const item = items[key as unknown as number];
      const pid = item.pid;
      if(pid && items[pid]){
        const parent = items[pid];
        if(!parent.childs)
          parent.childs = []
        parent.childs.push(item);
      }
    }
    //最上位データを返す
    return items[id];
  }
}
