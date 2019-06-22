import * as amf from "active-module-framework";
import { Users } from "./Users";
import { RemoteDB } from "./RemoteDB";
import { Files, FileInfo } from "./Files";
import { sprintf } from "sprintf";

interface TreeContents {
  id: number;
  pid: number;
  stat: boolean;
  type: string;
  title: string;
  childs: TreeContents[];
}
export interface MainContents {
  id: number;
  pid: number;
  priority: number;
  stat: number;
  type: string;
  date: Date;
  update: Date;
  title_type: number;
  title: string;
  value: string;
  childs?: MainContents[];
  title2?: string;
}
export interface ConvertContents extends MainContents {
  childs?: ConvertContents[];
  files: { id: number; name: string; date: string; value: string }[];
}

export class Contents extends amf.Module {
  remoteDB?: RemoteDB;
  public async onCreateModule(): Promise<boolean> {
    //データベースの初期化
    const remoteDB = await this.getModule(RemoteDB);
    if (remoteDB) {
      remoteDB.addEventListener("connect", async () => {
        if (!(await remoteDB.isTable("contents"))) {
          remoteDB.run(
            `create table contents(
					contents_id SERIAL primary key,
					contents_parent INTEGER references contents(contents_id),
					contents_priority INTEGER,
					contents_stat INTEGER,contents_type TEXT,
					contents_date timestamp with time zone,contents_update timestamp with time zone,
					contents_title_type integer,contents_title TEXT,contents_value TEXT);
          insert into contents values(default,null,1000,1,'PAGE',current_timestamp,current_timestamp,1,'Top','')`
          );
        }
        const files = await this.getModule(Files);
        if (files) files.createDir(1, "Contents");
      });
      this.remoteDB = remoteDB;
    }

    const localDB = this.getLocalDB();
    //localDB.db.run('drop table users');
    localDB.run(
      "CREATE TABLE IF NOT EXISTS users (users_no integer primary key,users_enable boolean,\
			users_id TEXT,users_password TEXT,users_name TEXT,users_info JSON,UNIQUE(users_id))"
    );

    return true;
  }

  public async getParentPage(id: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return 0;
    //PAGEタイプを持つ親を探す
    while (true) {
      const value = await remoteDB.get(
        "select contents_parent as pid,contents_type as type from contents where contents_id=$1",
        id
      );
      if (value === null) return 0;
      if (value["type"] === "PAGE") break;
      id = value["pid"] as number;
    }
    return id;
  }
  public async getParent(id: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    return (await remoteDB.get2(
      "select contents_parent from contents where contents_id = $1",
      id
    )) as number | null;
  }
  public async isParent(id: number, checkId: number) {
    let cid: number | null = id;
    if (cid === checkId) return true;
    while ((cid = await this.getParent(cid))) {
      if (cid === checkId) return true;
    }
    return false;
  }
  private getMaxDate(value: MainContents, date?: Date): Date {
    if (
      !date ||
      (value.type !== "PAGE" && value.date.getTime() > date.getTime())
    ) {
      date = value.date;
    }
    const childs = value.childs;
    if (childs) {
      for (const child of childs) {
        if (child.type !== "PAGE") date = this.getMaxDate(child, date);
      }
    }
    return date;
  }
  public async getPage(id: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;

    //ページを構成するのにに必要なデータを抽出
    const values = (await remoteDB.all(
      `select contents_id as id,contents_parent as pid,contents_stat as stat,
			to_char(contents_date at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as date,
			to_char(contents_update at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as update,
			contents_type as type,contents_title as title,contents_value as value from contents where contents_stat=1`
    )) as MainContents[];
    if (values === null) return null;
    const items: { [key: number]: MainContents } = {};
    //ID参照用データの作成
    for (const value of values) {
      items[value.id] = value;
    }
    //親子関係の作成
    for (const key of Object.keys(items)) {
      const item = items[(key as unknown) as number];
      const pid = item.pid;
      if (pid !== null && items[pid]) {
        const parent = items[pid];
        if (!parent.childs) parent.childs = [];
        parent.childs.push(item);
      }
    }

    const pages = [];
    for (const key of Object.keys(items)) {
      const value = items[(key as unknown) as number];
      if (value.type !== "PAGE") continue;
      //作成日を調整
      value["date"] = this.getMaxDate(value);
      //タイトルの調整
      let title = value.title;
      let p = value;
      while (p.pid && (p = items[p.pid])) {
        if (p.id != 1) title += " ～ " + p.title;
      }
      value.title2 = title;
      pages.push(value);
    }

    //日付でソート
    pages.sort((a, b) => {
      return a.date.getTime() - b.date.getTime();
    });

    return pages;
  }
  public async getBreadcrumb(id: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const bread = [];
    while (id) {
      let value = (await remoteDB.get(
        "select contents_parent as pid,contents_title as title,contents_type as type from contents where contents_id=$1",
        id
      )) as { pid: number; type: string; title: string };
      if (!value) return null;
      if (value.type === "PAGE") {
        bread.push({ id, title: value.title });
      }
      id = value.pid;
    }
    return bread;
  }
  public async getContents(id: number, child?: boolean) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;

    const users = await this.getSessionModule(Users);
    const visible = users && users.isAdmin() ? "" : "and contents_stat=1";

    const value = (await remoteDB.get(
      `select contents_id as id,contents_parent as pid,contents_priority as priority,contents_stat as stat,contents_type as type,to_char(contents_date at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as date,to_char(contents_update at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as update,contents_title_type as title_type,contents_title as title,contents_value as value from contents where contents_id=$1 ${visible}`,
      id
    )) as MainContents | null;
    if (value && child) {
      const childValue = await this.getChildContents(id);
      if (childValue) value.childs = childValue;
    }
    return value;
  }
  public async getPages(admin: boolean) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const visible = admin ? "" : "and contents_stat=1";

    return (await remoteDB.all(
      `select contents_id as id,contents_parent as pid,contents_priority as priority,contents_stat as stat,contents_type as type,to_char(contents_date at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as date,to_char(contents_update at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as update,contents_title_type as title_type,contents_title as title,contents_value as value from contents where contents_type='PAGE' ${visible}`
    )) as MainContents[] | null;
  }
  public async getChildContents(pid: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return [];
    const users = await this.getSessionModule(Users);
    const visible = users && users.isAdmin() ? "" : "and contents_stat=1";

    //親Idを元にコンテンツを抽出
    const values = (await remoteDB.all(
      `select contents_id as id,contents_parent as pid,contents_priority as priority,contents_stat as stat,contents_type as type,to_char(contents_date at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as date,to_char(contents_update at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as update,contents_title_type as title_type,contents_title as title,contents_value as value from contents where contents_parent=$1 and contents_type != 'PAGE' ${visible} order by contents_priority`,
      pid
    )) as MainContents[];
    //子コンテンツを抽出
    for (const value of values) {
      value.childs = await this.getChildContents(value.id);
    }
    return values;
  }
  public getImages(contents: MainContents, images: string[]) {
    const value = contents.value;
    const regexp = /<img src="\?command=Files\.download&amp;id=(\d+?)"/gi;
    let ids;
    while ((ids = regexp.exec(value))) images = images.concat(ids[1]);
    if (contents.childs) {
      for (const child of contents.childs) {
        images = this.getImages(child, images);
      }
    }
    return images;
  }
  public getContentsParent(id: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    return remoteDB.get2(
      "select contents_parent from contents where contents_id=$1",
      id
    );
  }
  public getContentsPriority(id: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    return remoteDB.get2(
      "select contents_priority from contents where contents_id=$1",
      id
    );
  }
  public async getDeeps(id: number) {
    //PAGEタイプまでの深さを探索
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    let count = 0;
    while (true) {
      id = (await remoteDB.get2(
        "select contents_parent as type from contents where contents_id=$1 and contents_type!='PAGE'",
        id
      )) as number;
      if (id === null) break;
      count++;
    }
    return count;
  }
  public async updatePriority(id: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;

    const values = await remoteDB.all(
      "select contents_id from contents where contents_parent=$1 order by contents_type='PAGE',contents_priority",
      id
    );
    let sql = "";
    if (!values) return null;
    let key = 0;
    for (const value of values) {
      sql += sprintf(
        "update contents SET contents_priority=%d where contents_id=%d;\n",
        ++key * 1000,
        value["contents_id"]
      );
    }
    if (sql !== "") remoteDB.run(sql);
  }

  public async createContents(id: number, vector: number, type: string) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;

    let cid = 0;
    let pid = 0;
    let priority = 0;
    switch (vector) {
      case 0:
      case 1:
        pid = (await this.getContentsParent(id)) as number;
        if (!pid) return null;
        priority =
          (((await this.getContentsPriority(id)) as number) || 0) +
          (vector === 0 ? -5 : 5);
        break;
      case 2:
      case 3:
        pid = id;
        priority = vector == 2 ? 0 : 100000;
        break;
      default:
        return null;
    }
    let titleType = 1;
    if (type != "PAGE") {
      const count = await this.getDeeps(pid);
      if (count == 0) titleType = 2;
      else titleType = 3;
    }
    const result = await remoteDB.get(
      `insert into contents values(default,$1,$2,-1,$3,
				current_timestamp,current_timestamp,$4,'New','') RETURNING contents_id`,
      pid,
      priority,
      type,
      titleType
    );
    if (!result) return null;
    cid = result.contents_id as number;
    this.updatePriority(pid);
    return { pid: pid, id: cid };
  }
  public async deleteContents(id: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const ids = await remoteDB.all(
      "select contents_id from contents where contents_parent=$1",
      id
    );
    if (!ids) return null;
    for (const cid of ids) await this.deleteContents(cid.contents_id);
    if (id === 1) return true;
    //関連ファイルの削除
    const files = await this.getSessionModule(Files);
    if (files) {
      const path = this.getDirPath(id);
      const fileId = await files.getDirId(1, path);
      if (fileId) await files.deleteFile(fileId);
    }
    //コンテンツの削除
    return await remoteDB.run("delete from contents where contents_id=$1", id);
  }
  public getDirPath(id: number) {
    return sprintf("/Contents/%04d/%02d", Math.floor(id / 100) * 100, id % 100);
  }
  public updateContents(contents: MainContents) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;

    // const document = JSDOM.fragment(contents.value);
    // const images = document.querySelectorAll("img");
    // images.forEach((img)=>{
    //   const result = img.src.match(/^data:(.*?);/;
    //   if(result){
    //     console.log();

    //   }
    // })
    return remoteDB.run(
      `update contents SET contents_stat=$1,contents_date=$2,contents_type=$3,contents_update=current_timestamp,
			contents_title_type=$4,contents_title=$5,contents_value=$6 where contents_id=$7`,
      contents.stat,
      contents.date,
      contents.type,
      contents.title_type,
      contents.title,
      contents.value,
      contents.id
    );
  }
  public async updatePriorityFromChild(id: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const values = (await remoteDB.all(
      "select contents_id as id from contents where contents_parent=(select contents_parent from contents where contents_id=$1) order by contents_type='PAGE',contents_priority",
      id
    )) as { id: number }[];
    let sql = "";
    let index = 0;
    for (const value of values) {
      sql += sprintf(
        "update contents SET contents_priority=%d where contents_id=%d;\n",
        ++index * 10,
        value.id
      );
    }
    if (sql.length) return remoteDB.run(sql);
    return false;
  }
  public async moveVector(id: number, vector: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const priority = (await this.getContentsPriority(id)) as number;
    if (!priority) return false;
    const count = await remoteDB.run(
      "update contents set contents_priority = $1 where contents_id=$2",
      priority + (vector < 0 ? -15 : 15),
      id
    );
    await this.updatePriorityFromChild(id);
    const priority2 = await this.getContentsPriority(id);
    return priority !== priority2;
  }

  public async getTree(id: number, admin: boolean) {
    const visible = admin ? "" : "where contents_stat=1";
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const values = await remoteDB.all(`select contents_id as id,contents_parent as pid,contents_stat as stat,
			contents_type as type,contents_title as title from contents ${visible} order by contents_type='PAGE',contents_priority`);
    if (!values) return null;
    //ID参照データの作成
    const items = new Map<number, TreeContents>();
    for (const value of values) {
      items.set(value.id, value);
    }
    //親子関係ツリーの作成
    for (const item of items.values()) {
      const pid = item.pid;
      if (pid && items.get(pid)) {
        const parent = items.get(pid);
        if (parent) {
          if (!parent.childs) parent.childs = [];
          parent.childs.push(item);
        }
      }
    }
    //最上位データを返す
    return items.get(id);
  }
  public async moveContents(fromId: number, toId: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    //移動先が子だったら処理を行わない
    if (await this.isParent(toId, fromId)) return false;

    //親の組み替え
    const flag = await remoteDB.run(
      "update contents set contents_parent=$1,contents_priority=100000 where contents_id=$2",
      toId,
      fromId
    );
    this.updatePriority(toId);
    return flag;
  }
  public async importChild(pid: number | null, value: ConvertContents) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const fileModule = await this.getSessionModule(Files);
    if (!fileModule) return null;

    //データの挿入
    const cid = (await remoteDB.get2(
      "insert into contents values(default,$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING contents_id",
      pid,
      value["priority"],
      value["stat"],
      value["type"],
      value["date"],
      value["update"],
      value["title_type"],
      value["title"],
      value["value"]
    )) as number;
    if (cid === null) return false;
    //ファイルの復元処理
    const files = value.files;
    if (files && files.length) {
      const ids: { [key: number]: number } = {};
      const path = this.getDirPath(cid);
      const dirId = await fileModule.createDir(1, path);
      if (dirId) {
        for (const file of files) {
          if (file && file.name) console.log(file.name);
          else {
            console.error(file);
            continue;
          }
          const id = (await fileModule.setFile(
            dirId,
            file.name,
            new Date(file.date),
            file.value
          )) as number;
          if (id) ids[file.id] = id;
        }
        let v = value.value;
        for (const srcId of Object.keys(ids)) {
          const destId = ids[(srcId as unknown) as number];
          v = v.replace(
            new RegExp(
              sprintf('src="\\?command=Files\\.download&amp;id=%s"', srcId),
              "g"
            ),
            sprintf('src="?cmd=download&amp;id=%d"', destId)
          );
        }
        console.log(v);
        value.value = v;
        await remoteDB.run(
          "update contents set contents_value=$1 where contents_id=$2",
          value.value,
          cid
        );
      }
    }
    //子データの挿入
    const childs = value.childs;
    if (childs) {
      for (const child of childs) {
        await this.importChild(cid, child);
      }
    }
    return true;
  }

  public async import(id: number, mode: number, src: string) {
    if (!id) return false;
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const fileModule = await this.getSessionModule(Files);
    if (!fileModule) return null;

    const value = JSON.parse(src);

    if (mode == 0) {
      if (id == 1) {
        //全データを削除
        await remoteDB.run("begin");
        await remoteDB.run(
          "delete from contents;select setval ('contents_contents_id_seq', 1, false);"
        );
        //関連ファイルの削除
        const fileId = await fileModule.getDirId(1, "/Contents");
        if (fileId) await fileModule.deleteFile(fileId);
        await fileModule.createDir(1, "Contents");
        //インポート処理

        await this.importChild(null, value);
        await remoteDB.run("commit");
      } else {
        //上書き元のデータを取得
        const contents = await this.getContents(id);
        if (!contents) return null;
        const pid = contents.pid;
        //上書き元のデータを削除
        this.deleteContents(id);
        contents.priority = contents.priority;
        await remoteDB.run("begin");
        await this.importChild(pid, value);
        await remoteDB.run("commit");
      }
    } else {
      await remoteDB.run("begin");
      await this.importChild(id, value);
      await remoteDB.run("commit");
    }
    return true;
  }
  public async JS_import(id: number, mode: number) {
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;
    const buffer = this.getSession().getBuffer();
    if (!buffer) return null;
    return this.import(id, mode, buffer.toString());
  }
  public async JS_moveContents(fromId: number, toId: number) {
    const users = await this.getSessionModule(Users);
    if (users && users.isAdmin()) return this.moveContents(fromId, toId);
    return false;
  }
  public async JS_moveVector(id: number, vector: number) {
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;
    return this.moveVector(id, vector);
  }
  public async JS_createContents(id: number, vector: number, type: string) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    return this.createContents(id, vector, type);
  }
  public async JS_getTree(id: number) {
    const users = await this.getSessionModule(Users);
    const admin = (users && users.isAdmin()) as boolean;
    return this.getTree(id, admin);
  }
  public async JS_getPage(id: number) {
    const pid = await this.getParentPage(id);
    if (pid === 0) return null;
    const contents = await this.getContents(pid);
    if (contents === null) return null;
    contents.childs = await this.getChildContents(pid);

    const images = this.getImages(contents, []);
    for (const id of images) {
      //header("link: <?command=Files.download&id=$id>;rel=preload;as=image;",false);
    }

    return contents;
  }
  public JS_getContents(id: number, child?: boolean) {
    return this.getContents(id, child);
  }
  public async JS_deleteContents(id: number) {
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;
    return this.deleteContents(id);
  }

  public async JS_updateContents(contents: MainContents) {
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;
    return this.updateContents(contents);
  }
}
