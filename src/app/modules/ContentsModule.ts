import * as amf from "active-module-framework";
import { Users } from "./UsersModule";
import { RemoteDB } from "./RemoteDBModule";
import { Files, FileData } from "./FilesModule";
import { sprintf } from "sprintf";
import * as express from "express";

interface TreeContents {
  id: number;
  pid: number;
  stat: boolean;
  type: string;
  date: string;
  update: string;
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
  value_type: string;
  value: string;
  childs?: MainContents[];
  title2?: string;
}
export interface ConvertContents extends MainContents {
  childs?: ConvertContents[];
  files: FileData[];
}

/**
 *コンテンツデータ管理クラス
 *
 * @export
 * @class Contents
 * @extends {amf.Module}
 */
export class Contents extends amf.Module {
  private remoteDB?: RemoteDB;
  /**
   *モジュール作成時の初期化処理
   *
   * @returns {Promise<boolean>}
   * @memberof Contents
   */
  public async onCreateModule(): Promise<boolean> {
    //データベースの初期化
    const remoteDB = await this.getModule(RemoteDB);
    if (remoteDB) {
      const files = await this.getModule(Files);
      remoteDB.addEventListener(
        "connect",
        async (): Promise<void> => {
          if (files) files.createDir(1, "Contents");

          if (!(await remoteDB.isTable("contents"))) {
            remoteDB.run(
              `create table contents(
					contents_id SERIAL primary key,
					contents_parent INTEGER references contents(contents_id),
					contents_priority INTEGER,
					contents_stat INTEGER,contents_type TEXT,
					contents_date timestamp with time zone,contents_update timestamp with time zone,
					contents_title_type integer,contents_title TEXT,contents_value TEXT,contents_value_type TEXT);
          insert into contents values(default,null,1000,1,'PAGE',current_timestamp,current_timestamp,1,'Top','','TEXT')`
            );
          }
        }
      );
      this.remoteDB = remoteDB;
    }

    const localDB = this.getLocalDB();
    localDB.run(
      "CREATE TABLE IF NOT EXISTS users (users_no integer primary key,users_enable boolean,\
			users_id TEXT,users_password TEXT,users_name TEXT,users_info JSON,UNIQUE(users_id))"
    );

    return true;
  }

  /**
   *コンテンツを含むPageIDを返す
   *
   * @param {number} id コンテンツのID
   * @returns {Promise<number>}
   * @memberof Contents
   */
  public async getParentPage(id: number): Promise<number> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return 0;
    //PAGEタイプを持つ親を探す
    for (;;) {
      const value = await remoteDB.get(
        "select contents_parent as pid,contents_type as type from contents where contents_id=$1",
        id
      );
      if (!value) return 0;
      if (value["type"] === "PAGE") break;
      id = value["pid"] as number;
    }
    return id;
  }
  /**
   *親IDを返す
   *
   * @param {number} id コンテンツのID
   * @returns {(Promise<number | null>)}
   * @memberof Contents
   */
  public async getParent(id: number): Promise<number | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    return (await remoteDB.get2(
      "select contents_parent from contents where contents_id = $1",
      id
    )) as number | null;
  }
  /**
   *コンテンツの上位に対象のIDがあるかチェックする
   *
   * @param {number} id コンテンツのID
   * @param {number} checkId 親の可能性があるID
   * @returns {Promise<boolean>}
   * @memberof Contents
   */
  public async isParent(id: number, checkId: number): Promise<boolean> {
    let cid: number | null = id;
    if (cid === checkId) return true;
    while ((cid = await this.getParent(cid))) {
      if (cid === checkId) return true;
    }
    return false;
  }
  /**
   *ページ内の最新更新時間を返す
   *
   * @private
   * @param {MainContents} value
   * @param {Date} [date]
   * @returns {Date}
   * @memberof Contents
   */
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
  /**
   *ページを構成するのにに必要なデータを返す
   *
   * @returns {(Promise<MainContents[] | null>)}
   * @memberof Contents
   */
  public async getPage(): Promise<MainContents[] | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;

    //ページを構成するのにに必要なデータを抽出
    const values = (await remoteDB.all(
      `select contents_id as id,contents_parent as pid,contents_stat as stat,
			to_char(contents_date at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as date,
			to_char(contents_update at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as update,
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
    pages.sort((a, b): number => {
      return a.date.getTime() - b.date.getTime();
    });

    return pages;
  }
  /**
   *パンくずリスト用データを返す
   *
   * @param {number} id
   * @returns {(Promise<{ id: number; title: string }[] | null>)}
   * @memberof Contents
   */
  public async getBreadcrumb(
    id: number
  ): Promise<{ id: number; title: string }[] | null> {
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
  /**
   *現在のセッションが管理権限を持つか返す
   *
   * @returns
   * @memberof Contents
   */
  public isAdmin() {
    const users = this.getSessionModule(Users);
    return users.isAdmin();
  }
  /**
   *全ページデータを返す
   *
   * @param {boolean} admin
   * @returns {(Promise<MainContents[] | null>)}
   * @memberof Contents
   */
  public async getPages(admin: boolean): Promise<MainContents[] | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const visible = admin ? "" : "and contents_stat=1";

    return (await remoteDB.all(
      `select contents_id as id,contents_parent as pid,contents_priority as priority,contents_stat as stat,contents_type as type,to_char(contents_date at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as date,to_char(contents_update at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as update,contents_title_type as title_type,contents_title as title,contents_value_type as value_type,contents_value as value from contents where contents_type='PAGE' ${visible}`
    )) as MainContents[] | null;
  }
  /**
   *コンテンツを返す
   *
   * @param {number} id
   * @param {boolean} [child]
   * @param {boolean} [admin]
   * @returns {(Promise<MainContents | null>)}
   * @memberof Contents
   */
  public async getContents(
    id: number,
    child?: boolean,
    admin?: boolean
  ): Promise<MainContents | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;

    const visible = admin ? "" : "and contents_stat=1";

    const value = (await remoteDB.get(
      `select contents_id as id,contents_parent as pid,contents_priority as priority,contents_stat as stat,contents_type as type,to_char(contents_date at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as date,to_char(contents_update at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as update,contents_title_type as title_type,contents_title as title,contents_value_type as value_type,contents_value as value from contents where contents_id=$1 ${visible}`,
      id
    )) as MainContents | null;
    if (value && child) {
      const childValue = await this.getChildContents(id, admin ? true : false);
      if (childValue) value.childs = childValue;
    }
    return value;
  }

  /**
   *親IDを指定し、子コンテンツを返す
   *
   * @param {number} pid
   * @param {boolean} admin
   * @returns {Promise<MainContents[]>}
   * @memberof Contents
   */
  public async getChildContents(
    pid: number,
    admin: boolean
  ): Promise<MainContents[]> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return [];
    const visible = admin ? "" : "and contents_stat=1";

    //親Idを元にコンテンツを抽出
    const values = (await remoteDB.all(
      `select contents_id as id,contents_parent as pid,contents_priority as priority,contents_stat as stat,contents_type as type,to_char(contents_date at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as date,to_char(contents_update at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as update,contents_title_type as title_type,contents_title as title,contents_value_type as value_type,contents_value as value from contents where contents_parent=$1 and contents_type != 'PAGE' ${visible} order by contents_priority`,
      pid
    )) as MainContents[];
    //子コンテンツを抽出(非同期)
    const promise = [];
    for (const value of values) {
      promise.push(this.getChildContents(value.id, admin));
    }
    const childValues = await Promise.all(promise);
    //非同期で取得した結果を設定
    let index = 0;
    for (const value of values) {
      value.childs = childValues[index++];
    }
    return values;
  }
  /**
   *親コンテンツのIDを返す
   *
   * @param {number} id
   * @returns {(Promise<number | null>)}
   * @memberof Contents
   */
  public async getContentsParent(id: number): Promise<number | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    return (await remoteDB.get2(
      "select contents_parent from contents where contents_id=$1",
      id
    )) as number | null;
  }
  /**
   *コンテンツの表示優先度を返す
   *
   * @param {number} id
   * @returns {(Promise<number | null>)}
   * @memberof Contents
   */
  public async getContentsPriority(id: number): Promise<number | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    return remoteDB.get2(
      "select contents_priority from contents where contents_id=$1",
      id
    ) as Promise<number>;
  }
  /**
   *PAGEタイプまでの深さを探索
   *
   * @param {number} id
   * @returns {(Promise<number | null>)}
   * @memberof Contents
   */
  public async getDeeps(id: number): Promise<number | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    let count = 0;
    for (;;) {
      id = (await remoteDB.get2(
        "select contents_parent as type from contents where contents_id=$1 and contents_type!='PAGE'",
        id
      )) as number;
      if (id === null) break;
      count++;
    }
    return count;
  }
  /**
   *表示優先度を正規化
   *
   * @param {number} id
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async updatePriority(id: number): Promise<boolean | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;

    const values = (await remoteDB.all(
      "select contents_id from contents where contents_parent=$1 order by contents_type='PAGE',contents_priority",
      id
    )) as { contents_id: number }[];
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
    return true;
  }

  /**
   *新規コンテンツを作成しIDを返す
   *
   * @param {number} id
   * @param {number} vector
   * @param {string} type
   * @returns {(Promise<{
   *     pid: number;
   *     id: number;
   *   } | null>)}
   * @memberof Contents
   */
  public async createContents(
    id: number,
    vector: number,
    type: string
  ): Promise<{
    pid: number;
    id: number;
  } | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;

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
				current_timestamp,current_timestamp,$4,'New','','TEXT') RETURNING contents_id`,
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
  /**
   *コンテンツの削除(関連ファイルも削除)
   *
   * @param {number} id
   * @param {boolean} [flag]
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async deleteContents(
    id: number,
    flag?: boolean
  ): Promise<boolean | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    if (flag || flag === undefined) await remoteDB.run("begin");

    const promise: Promise<unknown>[] = [];
    //関連ファイルの削除
    const fileDelete = async () => {
      const files = this.getSessionModule(Files);
      const path = this.getDirPath(id);
      const fileId = await files.getDirId(1, path);
      if (fileId) await files.deleteFile(fileId);
    };
    promise.push(fileDelete());
    //コンテンツ削除
    const contentsDelete = async () => {
      const ids = (await remoteDB.all(
        "select contents_id from contents where contents_parent=$1",
        id
      )) as { contents_id: number }[] | null;
      if (ids) {
        const promise: Promise<unknown>[] = [];
        for (const cid of ids)
          promise.push(this.deleteContents(cid.contents_id, false));
        await Promise.all(promise);
      }
    };
    await contentsDelete();

    if (id !== 1) {
      promise.push(
        remoteDB.run("delete from contents where contents_id=$1", id)
      );
    }
    Promise.all(promise);
    if (flag || flag === undefined) await remoteDB.run("commit");
    //コンテンツの削除
    return true;
  }
  /**
   *コンテンツに対応するファイルパスを返す
   *
   * @param {number} id
   * @returns {string}
   * @memberof Contents
   */
  public getDirPath(id: number): string {
    return sprintf("/Contents/%04d/%02d", Math.floor(id / 100) * 100, id % 100);
  }
  /**
   *コンテンツを更新する
   *
   * @param {MainContents} contents
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async updateContents(contents: MainContents): Promise<boolean | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;

    return remoteDB.run(
      `update contents SET contents_stat=$1,contents_date=$2,contents_type=$3,contents_update=current_timestamp,
			contents_title_type=$4,contents_title=$5,contents_value_type=$6,contents_value=$7 where contents_id=$8`,
      contents.stat,
      contents.date,
      contents.type,
      contents.title_type,
      contents.title,
      contents.value_type,
      contents.value,
      contents.id
    );
  }
  /**
   *子コンテンツのIDから兄弟の表示優先順位を正規化する
   *
   * @param {number} id
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async updatePriorityFromChild(id: number): Promise<boolean | null> {
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
  /**
   *表示優先順位の変更
   *
   * @param {number} id
   * @param {number} vector
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async moveVector(id: number, vector: number): Promise<boolean | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const priority = (await this.getContentsPriority(id)) as number;
    if (!priority) return false;
    await remoteDB.run(
      "update contents set contents_priority = $1 where contents_id=$2",
      priority + (vector < 0 ? -15 : 15),
      id
    );
    await this.updatePriorityFromChild(id);
    const priority2 = await this.getContentsPriority(id);
    return priority !== priority2;
  }

  /**
   *ツリー構造のコンテンツデータを返す
   *
   * @param {number} id
   * @param {boolean} admin
   * @returns {(Promise<TreeContents | null>)}
   * @memberof Contents
   */
  public async getTree(
    id: number,
    admin: boolean
  ): Promise<TreeContents | null> {
    const visible = admin ? "" : "where contents_stat=1";
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const values = (await remoteDB.all(`select contents_id as id,contents_parent as pid,contents_stat as stat,contents_date as date,contents_update as update,
			contents_type as type,contents_title as title from contents ${visible} order by contents_type='PAGE',contents_priority`)) as
      | TreeContents[]
      | null;
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
    return items.get(id) || null;
  }
  /**
   *コンテンツの階層を移動する
   *
   * @param {number} fromId
   * @param {number} toId
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async moveContents(
    fromId: number,
    toId: number
  ): Promise<boolean | null> {
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
  /**
   *コンテンツデータをインポートする
   *
   * @param {(number | null)} pid
   * @param {ConvertContents} value
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async importChild(
    pid: number | null,
    value: ConvertContents
  ): Promise<boolean | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const fileModule = await this.getModule(Files);
    if (!fileModule) return null;

    //データの挿入
    const cid = (await remoteDB.get2(
      "insert into contents values(default,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING contents_id",
      pid,
      value["priority"],
      value["stat"],
      value["type"],
      value["date"],
      value["update"],
      value["title_type"],
      value["title"],
      value["value"],
      value["value_type"]
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
          if (!file) continue;
          const id = (await fileModule.setFile(
            dirId,
            file.name,
            new Date(file.date),
            file.value
          )) as number;
          if (id) ids[file.id] = id;
        }
        let v = value.value;
        //リンクの変換
        for (const srcId of Object.keys(ids)) {
          const destId = ids[(srcId as unknown) as number];
          v = v.replace(
            new RegExp(sprintf('src="\\?cmd=download&amp;id=%s"', srcId), "g"),
            sprintf('src="?cmd=download&amp;id=%d"', destId)
          );
        }
        await remoteDB.run(
          "update contents set contents_value=$1 where contents_id=$2",
          v,
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

  /**
   *コンテンツデータをインポートする
   *
   * @param {number} id
   * @param {number} mode
   * @param {string} src
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async import(
    id: number,
    mode: number,
    src: string
  ): Promise<boolean | null> {
    if (!id) return false;
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const fileModule = await this.getModule(Files);
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
        const contents = await this.getContents(id, false, true);
        if (!contents) return null;
        const pid = contents.pid;
        //上書き元のデータを削除
        this.deleteContents(id);
        value.priority = contents.priority;
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
  /**
   *コンテンツデータをエクスポートする
   *
   * @param {express.Response} res
   * @param {number} id
   * @returns
   * @memberof Contents
   */
  public async export(res: express.Response, id: number) {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const fileModule = this.getSessionModule(Files);
    const values = (await remoteDB.all(
      "select contents_id as id,contents_parent as pid,contents_stat as stat,contents_priority as priority,contents_type as type,to_char(contents_date at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as date,to_char(contents_update at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') as update,contents_title_type as title_type,contents_title as title,contents_value as value,contents_value_type as value_type from contents order by contents_type='PAGE',contents_priority"
    )) as ConvertContents[];
    if (values === null) return null;
    const items: { [key: number]: ConvertContents } = {};
    for (const value of values) {
      const id2 = value.id;
      //ID参照用データの作成
      items[id2] = value;
    }
    //親子関係の作成
    for (const item of Object.values(items)) {
      if (item.pid !== null) {
        const parent = items[item.pid];
        parent.childs ? parent.childs.push(item) : (parent.childs = [item]);
      }
    }

    const promise: Promise<unknown>[] = [];
    const fileLoad = async (contents: ConvertContents) => {
      const id = contents.id;
      //子データの取得開始
      if (contents.childs) {
        for (const child of contents.childs) {
          promise.push(fileLoad(child));
        }
      }
      //ファイルデータの読み出し
      const path = this.getDirPath(id);
      const fileId = await fileModule.getDirId(1, path);
      if (fileId !== null) {
        const fileList = await fileModule.getChildList(fileId);
        if (fileList) {
          contents.files = [];
          for (const fileId of fileList) {
            await fileModule.getFile(fileId).then(fileData => {
              if (fileData) contents.files.push(fileData);
            });
          }
        }
      }
    };
    //必要なファイルデータの読み出し
    promise.push(fileLoad(items[id]));
    //読み出しが終わるまで待機
    await Promise.all(promise);

    //戻り値をカスタマイズ
    this.setReturn(false);
    //res.contentType("text/json");
    res.header("Content-disposition", 'attachment; filename="export.json"');
    res.json(items[id]);
    res.end();
  }

  /**
   *コンテンツの検索
   *
   * @param {string} keyword
   * @param {boolean} [admin]
   * @returns
   * @memberof Contents
   */
  public async search(keyword: string, admin?: boolean) {
    const visible = admin ? "" : "where contents_stat=1";
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    const results = (await remoteDB.all(
      "select contents_id as id,contents_title || ' ' ||contents_value as value from contents " +
        visible +
        " order by contents_date desc"
    )) as { id: number; value: string }[] | null;
    if (!results) return null;
    const keywords = keyword
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
      })
      .toLowerCase()
      .split(/\s/);
    console.log(keywords);
    if (keywords.length === 0) return null;
    const hits: number[] = [];
    for (const r of results) {
      //タグを削除、全角を半角に変換、小文字に変換
      const msg = r.value
        .replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&")
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
          return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
        })
        .toLowerCase();
      console.log(msg);
      let flag = true;
      for (const key of keywords) {
        if (key.length === 0) continue;
        if (msg.indexOf(key) === -1) {
          flag = false;
          break;
        }
      }
      if (flag) hits.push(r.id);
    }
    return hits;
  }
  /**
   *コンテンツのエクスポート
   *
   * @param {number} id
   * @returns
   * @memberof Contents
   */
  public JS_export(id: number) {
    if (!this.isAdmin()) return null;
    return this.export(this.getResponse(), id);
  }
  /**
   *コンテンツのインポート
   *
   * @param {number} id
   * @param {number} mode
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async JS_import(id: number, mode: number): Promise<boolean | null> {
    if (!this.isAdmin()) return null;
    const buffer = this.getSession().getBuffer();
    if (!buffer) return null;
    return this.import(id, mode, buffer.toString());
  }
  /**
   *コンテンツの検索
   *
   * @param {string} keyword
   * @returns
   * @memberof Contents
   */
  public async JS_search(keyword: string) {
    const admin = this.isAdmin();
    return this.search(keyword, admin);
  }

  /**
   *コンテンツの階層を移動
   *
   * @param {number} fromId
   * @param {number} toId
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async JS_moveContents(
    fromId: number,
    toId: number
  ): Promise<boolean | null> {
    if (this.isAdmin()) return this.moveContents(fromId, toId);
    return false;
  }

  /**
   *表示優先順位の変更
   *
   * @param {number} id
   * @param {number} vector
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async JS_moveVector(
    id: number,
    vector: number
  ): Promise<boolean | null> {
    if (!this.isAdmin()) return null;
    return this.moveVector(id, vector);
  }
  /**
   *新規コンテンツの作成
   *
   * @param {number} id
   * @param {number} vector
   * @param {string} type
   * @returns {(Promise<{
   *     pid: number;
   *     id: number;
   *   } | null>)}
   * @memberof Contents
   */
  public async JS_createContents(
    id: number,
    vector: number,
    type: string
  ): Promise<{
    pid: number;
    id: number;
  } | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    if (!this.isAdmin()) return null;
    return this.createContents(id, vector, type);
  }
  /**
   *ツリー構造のコンテンツデータを返す
   *
   * @param {number} id
   * @returns {(Promise<TreeContents | null>)}
   * @memberof Contents
   */
  public async JS_getTree(id: number): Promise<TreeContents | null> {
    const admin = this.isAdmin();
    return this.getTree(id, admin);
  }
  /**
   *一ページ分のコンテンツデータを返す
   *
   * @param {number} id
   * @returns {(Promise<MainContents | null>)}
   * @memberof Contents
   */
  public async JS_getPage(id: number): Promise<MainContents | null> {
    const admin = this.isAdmin();
    const pid = await this.getParentPage(id);
    if (pid === 0) return null;
    const contents = await this.getContents(pid, false, admin);
    if (contents === null) return null;
    contents.childs = await this.getChildContents(pid, admin);

    // const images = this.getImages(contents, []);
    // for (const id of images) {
    //   header("link: <?command=Files.download&id=$id>;rel=preload;as=image;",false);
    // }
    return contents;
  }
  /**
   *コンテンツデータを返す
   *
   * @param {number} id
   * @param {boolean} [child]
   * @returns {(Promise<MainContents | null>)}
   * @memberof Contents
   */
  public JS_getContents(
    id: number,
    child?: boolean
  ): Promise<MainContents | null> {
    const admin = this.isAdmin();
    return this.getContents(id, child, admin);
  }
  /**
   *コンテンツを削除
   *
   * @param {number} id
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async JS_deleteContents(id: number): Promise<boolean | null> {
    if (!this.isAdmin()) return null;
    const flag = await this.deleteContents(id);
    return flag;
  }

  /**
   *コンテンツの更新
   *
   * @param {MainContents} contents
   * @returns
   * @memberof Contents
   */
  public async JS_updateContents(contents: MainContents) {
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;
    return this.updateContents(contents);
  }
}
