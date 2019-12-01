import { Users } from "../User/UsersModule";
import { RemoteDB } from "../RemoteDBModule";
import { Files, FileEntity } from "../FilesModule";
import { sprintf } from "sprintf";
import * as express from "express";
import * as typeorm from "typeorm";
import { ExtendRepository } from "../ExtendRepository";
import { Module, EXPORT } from "@rfcs/core";
import { HtmlCreater } from "../../HtmlCreater";

interface TreeContents {
  id: number;
  parentId: number;
  stat: boolean;
  type: string;
  date: string;
  update: string;
  title: string;
  children: TreeContents[];
}

@typeorm.Entity()
@typeorm.Tree("materialized-path")
export class ContentsEntity {
  @typeorm.PrimaryGeneratedColumn()
  id!: number;
  @typeorm.Column({ generated: "uuid", unique: true })
  uuid?: string;
  @typeorm.Column({ default: 1000 })
  priority!: number;
  @typeorm.Column({ nullable: true })
  visible?: boolean;
  @typeorm.Column({ default: "PAGE" })
  type!: string;
  @typeorm.Column({ default: () => "current_timestamp" })
  date!: Date;
  @typeorm.Column({ default: () => "current_timestamp" })
  update!: Date;
  @typeorm.Column({ default: 1 })
  title_type!: number;
  @typeorm.Column({ default: "New" })
  title!: string;
  @typeorm.Column({ default: "TEXT" })
  value_type!: string;
  @typeorm.Column({ default: "" })
  value!: string;
  title2?: string;

  @typeorm.Column({ nullable: true })
  parentId?: number;

  @typeorm.TreeChildren()
  children!: ContentsEntity[];
  @typeorm.TreeParent()
  parent?: ContentsEntity;
  mpath?: string;
}
export interface ConvertContents extends ContentsEntity {
  files?: FileEntity[];
  children: ConvertContents[];
}

/**
 *コンテンツデータ管理クラス
 *
 * @export
 * @class Contents
 * @extends {amf.Module}
 */

export class Contents extends Module {
  private remoteDB?: RemoteDB;
  private repository?: ExtendRepository<ContentsEntity>;
  /**
   *モジュール作成時の初期化処理
   *
   * @returns {Promise<boolean>}
   * @memberof Contents
   */
  public async onCreateModule(): Promise<boolean> {
    //データベースの初期化
    const remoteDB = await this.getModule(RemoteDB);
    remoteDB.addEntity(ContentsEntity);

    const files = await this.getModule(Files);
    remoteDB.addEventListener(
      "connect",
      async (connection): Promise<void> => {
        if (files) files.createDir(1, "Contents");

        const repository = new ExtendRepository(connection, ContentsEntity);
        this.repository = repository;
        if (!(await repository.findOne(1)))
          await repository.save({ title: "TOP" });
        //await this.updateTree();
      }
    );
    this.remoteDB = remoteDB;

    return true;
  }
  public async onCreateHtml(creater: HtmlCreater) {
    const id = creater.getRequest().query.p;
    if (id) {
      if (!this.repository) return;
      const entity = await this.repository.findOne(id);
      if (entity) {
        creater.setStatus(301);
        creater.addHeader("Location", "?uuid=" + entity.uuid);
      }
    }
  }

  /**
   *コンテンツを含むPageIDを返す
   *
   * @param {number} id コンテンツのID
   * @returns {Promise<number>}
   * @memberof Contents
   */
  public async getParentPage(id: number): Promise<number> {
    if (!this.repository) return 0;
    //PAGEタイプを持つ親を探す
    const contents = await this.repository.getParent({ id } as ContentsEntity, {
      select: ["id", "type"]
    });
    if (!contents) return 0;
    let parent: typeof contents | undefined = contents;
    do {
      if (parent.type === "PAGE") return parent.id;
    } while ((parent = parent.parent));
    return 0;
  }
  /**
   *親IDを返す
   *
   * @param {number} id コンテンツのID
   * @returns {(Promise<number | null>)}
   * @memberof Contents
   */
  public async getParent(id: number): Promise<number | null> {
    if (!this.repository) return 0;
    const contents = await this.repository.findOne(id);
    if (!contents || !contents.parentId) return 0;
    return contents.parentId;
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
   * @param {ContentsEntity} value
   * @param {Date} [date]
   * @returns {Date}
   * @memberof Contents
   */
  private getMaxDate(value: ContentsEntity, date?: Date): Date {
    if (
      !date ||
      (value.type !== "PAGE" && value.date.getTime() > date.getTime())
    ) {
      date = value.date;
    }
    const children = value.children;
    if (children) {
      for (const child of children) {
        if (child.type !== "PAGE") date = this.getMaxDate(child, date);
      }
    }
    return date;
  }
  /**
   *ページを構成するのにに必要なデータを返す
   *
   * @returns {(Promise<ContentsEntity[] | null>)}
   * @memberof Contents
   */
  public async _getPage(): Promise<ContentsEntity[] | null> {
    if (!this.repository) return null;

    //ページを構成するのにに必要なデータを抽出
    const values = await this.repository.findTrees();
    if (!values) return null;

    //ページの抽出
    const pages: ContentsEntity[] = [];
    const getPage = (contents: ContentsEntity) => {
      if (contents.type === "PAGE") pages.push(contents);
      contents.children.forEach(getPage);
    };
    values.forEach(getPage);
    //ページの更新日時を設定
    const getUpdate = function(
      this: ContentsEntity | void,
      contents: ContentsEntity
    ) {
      const that = this || contents;
      if (contents.date.getTime() > that.date.getTime())
        that.date = contents.date;
      contents.children.forEach(getUpdate, this || contents);
    };
    pages.forEach(getUpdate);

    //階層タイトルの設定
    pages.forEach(page => {
      let title = "";
      let parent: ContentsEntity | undefined = page;
      do {
        title += " ～ " + parent.title;
      } while ((parent = parent.parent));
      page.title2 = title;
    });

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
   * @returns {(Promise<{ id: number; title: string }[] | undefined>)}
   * @memberof Contents
   */
  public async getBreadcrumb(id: number): Promise<ContentsEntity | undefined> {
    const repository = this.repository;
    if (!repository) return undefined;

    const bread = await repository.getParent(["id=:id", { id }], {
      select: ["id", "title", "uuid"]
    });
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
   * @returns {(Promise<ContentsEntity[] | null>)}
   * @memberof Contents
   */
  public async getPages(admin: boolean): Promise<ContentsEntity[] | null> {
    const repository = this.repository;
    if (!repository) return null;
    let param = {};
    if (admin) param = {};
    else param = { where: { visible: true, type: "PAGE" } };
    return repository.find(param);
  }
  /**
   *コンテンツを返す
   *
   * @param {number} id
   * @param {boolean} [child]
   * @param {boolean} [admin]
   * @returns {(Promise<ContentsEntity | null>)}
   * @memberof Contents
   */
  public async _getContents(
    id: number,
    child?: boolean,
    admin?: boolean
  ): Promise<ContentsEntity | undefined> {
    const repository = this.repository;
    if (!repository) return undefined;

    const where: { visible?: boolean; type?: string; parentId?: number } = admin
      ? {}
      : { visible: true };
    const entity = await repository.findOne(id, { where });
    if (!entity) return;

    where.type = "ITEM";
    const getChildren = async (parent: ContentsEntity) => {
      where.parentId = parent.id;
      const children = await repository.find({ where, order: { priority: 1 } });
      if (children) {
        const promise = [];
        for (const child of children) {
          promise.push(getChildren(child));
        }
        await Promise.all(promise);
        parent.children = children;
      }
    };
    if (child) await getChildren(entity);
    return entity;
  }

  /**
   *親コンテンツのIDを返す
   *
   * @param {number} id
   * @returns {(Promise<number | null>)}
   * @memberof Contents
   */
  public async getContentsParent(id: number): Promise<number | null> {
    const repository = this.repository;
    if (!repository) return null;
    const result = await repository
      .createQueryBuilder()
      .select('"parentId" as id')
      .where({ id })
      .getRawOne();
    if (!result) return null;
    return result.id;
  }
  /**
   *コンテンツの表示優先度を返す
   *
   * @param {number} id
   * @returns {(Promise<number | null>)}
   * @memberof Contents
   */
  public async getContentsPriority(id: number): Promise<number | null> {
    const repository = this.repository;
    if (!repository) return null;
    const result = await repository.findOne(id, { select: ["priority"] });
    if (!result) return null;
    return result.priority;
  }
  /**
   *PAGEタイプまでの深さを探索
   *
   * @param {number} id
   * @returns {(Promise<number | null>)}
   * @memberof Contents
   */
  public async getDeeps(id: number): Promise<number | null> {
    const repository = this.repository;
    if (!repository) return null;
    let count = 0;
    const result = await repository.getParent(id, {
      select: ["id", "type"]
    });
    if (!result) return null;
    let parent: ContentsEntity | undefined = result;
    do {
      if (parent.type === "PAGE") break;
      count++;
    } while ((parent = parent.parent));
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
    const repository = this.repository;
    if (!repository) return null;

    const values = await repository
      .createQueryBuilder()
      .select()
      .where({ parentId: id })
      .orderBy("type='PAGE',priority")
      .getMany();
    let key = 0;
    for (const value of values) {
      value.priority = ++key * 1000;
    }
    await repository.save(values);
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
  public async _createContents(
    id: number,
    vector: number,
    type: string
  ): Promise<{
    uuid: string;
  } | null> {
    const repository = this.repository;
    if (!repository) return null;

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
    const result = await repository.save({
      parent: { id: pid },
      priority,
      type,
      title_type: titleType
    });
    if (!result) return null;
    this.updatePriority(pid);
    return { uuid: result.uuid! };
  }
  /**
   *コンテンツの削除(関連ファイルも削除)
   *
   * @param {number} id
   * @param {boolean} [flag]
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async _deleteContents(uuid: string | number): Promise<boolean | null> {
    const repository = this.repository;
    if (!repository) return null;
    //if (flag || flag === undefined) await remoteDB.run("begin");

    const promise: Promise<unknown>[] = [];
    const id = typeof uuid === "string" ? await this.getIdFromUuid(uuid) : uuid;
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
      const ids = await repository.find({
        where: { parentId: id },
        select: ["id"]
      });
      if (ids) {
        const promise: Promise<unknown>[] = [];
        for (const cid of ids) promise.push(this._deleteContents(cid.uuid!));
        await Promise.all(promise);
      }
    };
    await contentsDelete();

    if (id !== 1) {
      promise.push(repository.delete(id));
    }
    Promise.all(promise);
    //if (flag || flag === undefined) await remoteDB.run("commit");
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
   * @param {ContentsEntity} contents
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async _updateContents(
    contents: ContentsEntity
  ): Promise<boolean | null> {
    const repository = this.repository;
    if (!repository) return null;

    return !!repository.save(contents);
  }
  /**
   *子コンテンツのIDから兄弟の表示優先順位を正規化する
   *
   * @param {number} id
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async updatePriorityFromChild(id: number): Promise<boolean | null> {
    const repository = this.repository;
    if (!repository) return null;
    const subQuery = repository
      .createQueryBuilder()
      .subQuery()
      .select([`"parentId"`])
      .from(repository.metadata.target, repository.metadata.targetName)
      .where("id=:id")
      .getQuery();
    const values = (await repository
      .createQueryBuilder()
      .select("id")
      .where('"parentId"=' + subQuery)
      .orderBy("type='PAGE',priority")
      .setParameters({ id })
      .getRawMany()) as undefined | { id: number }[];
    if (!values) return false;

    let index = 0;
    for (const value of values) {
      await repository.update(value.id, { priority: ++index * 10 });
    }
    return true;
  }
  /**
   *表示優先順位の変更
   *
   * @param {number} id
   * @param {number} vector
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async _moveVector(id: number, vector: number): Promise<boolean | null> {
    const repository = this.repository;
    if (!repository) return null;
    const priority = (await this.getContentsPriority(id)) as number;
    if (!priority) return false;
    await repository.update(id, {
      priority: priority + (vector < 0 ? -15 : 15)
    });
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
  public async _getTree(
    id: number,
    admin: boolean
  ): Promise<TreeContents | null> {
    const visible = admin ? undefined : "visible=true";
    const repository = this.repository;
    if (!repository) return null;
    const values = await repository.getChildren(["id=:id", { id }], {
      select: [
        "id",
        "uuid",
        "parentId",
        "visible",
        "date",
        "update",
        "type",
        "title"
      ],
      where: visible,
      order: `treeEntity.type='PAGE',"treeEntity".priority,"treeEntity".id`
    });
    if (!values) return null;
    //最上位データを返す
    return (values as unknown) as TreeContents;
  }
  /**
   *コンテンツの階層を移動する
   *
   * @param {number} fromId
   * @param {number} toId
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  public async _moveContents(
    fromId: number,
    toId: number
  ): Promise<boolean | null> {
    const repository = this.repository;
    if (!repository) return null;
    //移動先が子だったら処理を行わない
    if (await this.isParent(toId, fromId)) return false;

    //親の組み替え
    const flag = !!(await repository.update(fromId, {
      parentId: toId,
      priority: 100000
    }));
    //親子関係のmpathを再構成
    await this.updateTree(fromId);
    //優先順位を直す
    await this.updatePriority(toId);
    return flag;
  }
  // public async updateTree() {
  //   const repository = this.repository;
  //   if (!repository) return false;
  //   const items = await repository.find({select:["id","parentId"]});
  //   if(!items)
  //     return false;
  //   const map = new Map<number,ContentsEntity>();
  //   for(const item of items){
  //     map.set(item.id,item);
  //   }
  //   for(const item of items){
  //     let mpath = item.id+".";
  //     let parent:ContentsEntity|undefined = item;
  //     while(parent!.parentId){
  //       parent = map.get(parent!.parentId);
  //       mpath = parent!.id + "." + mpath
  //     }
  //     await repository.createQueryBuilder().update().set({mpath}).where({id:item.id}).execute();
  //   }
  // }
  public async updateTree(id: number) {
    const repository = this.repository;
    if (!repository) return false;
    const item = await repository.getChildren(id, {
      select: ["id", "parentId"]
    });
    if (!item) return false;
    //親のmpathを取得
    let mpath = "";
    if (item.parentId) {
      const parent = (await repository
        .createQueryBuilder()
        .select(["mpath"])
        .where({ id: item.parentId })
        .getRawOne()) as { mpath: string };
      if (parent) mpath = parent.mpath;
    }

    //mpathを再構成
    const createMpath = async (item: ContentsEntity, parentMpath: string) => {
      const mpath = `${parentMpath}${item.id}.`;
      const p: Promise<unknown>[] = [];
      p.push(
        repository
          .createQueryBuilder()
          .update()
          .set({ mpath })
          .where({ id: item.id })
          .execute()
      );
      if (item.children) {
        for (const child of item.children) {
          p.push(createMpath(child, mpath));
        }
      }
      await Promise.all(p);
    };
    await repository.metadata.connection.transaction(async () => {
      await createMpath(item, mpath || "");
    });

    //再構成したmpathを保存
    //await repository.save(items);
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
    const repository = this.repository;
    if (!repository) return null;
    const fileModule = await this.getModule(Files);
    if (!fileModule) return null;

    const entity = Object.assign({}, value);

    //データの挿入
    const v: any = value;
    if (v.childs) v.children = v.childs;
    if (v.stat) v.visible = v.stat === 1;

    (<{ id: unknown }>entity).id = undefined;
    (<{ parentId: unknown }>entity).parentId = undefined;
    if (pid) (<{ parent: { id: number } }>entity).parent = { id: pid };

    await repository.save(entity);
    const id = entity.id;

    if (id === undefined) return false;
    //ファイルの復元処理
    const files = value.files;
    if (files && files.length) {
      const ids: { [key: number]: number } = {};
      const path = this.getDirPath(id);
      const dirId = await fileModule.createDir(1, path);
      if (dirId) {
        for (const file of files) {
          if (!file || !file.value) continue;
          if (!(file.value instanceof Buffer)) {
            file.value = Buffer.from(file.value, "base64");
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
        //リンクの変換
        for (const srcId of Object.keys(ids)) {
          const destId = ids[(srcId as unknown) as number];
          v = v.replace(
            new RegExp(sprintf('src="\\?cmd=download&amp;id=%s"', srcId), "g"),
            sprintf('src="?cmd=download&amp;id=%d"', destId)
          );
        }
        await repository.update(id, { value: v });
      }
    }
    //子データの挿入
    const children = value.children;
    if (children) {
      for (const child of children) {
        await this.importChild(id, child);
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
  public async _import(
    id: number,
    mode: number,
    src: string
  ): Promise<boolean | null> {
    if (!id) id = 1;
    const repository = this.repository;
    if (!repository) return null;
    const fileModule = await this.getModule(Files);
    if (!fileModule) return null;

    const value = JSON.parse(src);

    if (mode == 0) {
      if (id == 1) {
        //全データを削除
        // await remoteDB.run("begin");
        await repository.metadata.connection.transaction(async () => {
          await repository.clear();
          await repository.query("select setval ($1, 1, false)", [
            repository.metadata.tableName + "_id_seq"
          ]);
          //関連ファイルの削除
          await fileModule.clear();
          await fileModule.createDir(1, "Contents");
          //インポート処理

          await this.importChild(null, value);
        });

        // await remoteDB.run("commit");
      } else {
        //上書き元のデータを取得
        const contents = await this._getContents(id, false, true);
        if (!contents) return null;
        const pid = contents.parent ? contents.parent.id : null;
        //上書き元のデータを削除
        this._deleteContents(id);
        value.priority = contents.priority;
        //await remoteDB.run("begin");
        await this.importChild(pid, value);
        //await remoteDB.run("commit");
      }
    } else {
      // await remoteDB.run("begin");
      await this.importChild(id, value);
      //await remoteDB.run("commit");
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
  public async _export(res: express.Response, id: number) {
    const repository = this.repository;
    if (!repository) return null;
    const fileModule = this.getSessionModule(Files);
    const values = await repository.getChildren(["id=:id", { id }]);
    if (values === null) return null;

    const promise: Promise<unknown>[] = [];
    const fileLoad = async (contents: ConvertContents) => {
      const id = contents.id;
      //子データの取得開始
      if (contents.children) {
        for (const child of contents.children) {
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
              if (fileData) contents.files!.push(fileData);
            });
          }
        }
      }
    };
    //必要なファイルデータの読み出し
    promise.push(fileLoad(values as ConvertContents));
    //読み出しが終わるまで待機
    await Promise.all(promise);

    //戻り値をカスタマイズ
    this.setReturn(false);
    //res.contentType("text/json");
    res.header("Content-disposition", 'attachment; filename="export.json"');
    res.json(values);
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
  public async _search(keyword: string, admin?: boolean) {
    const visible = admin ? {} : { visible: true };
    const repository = this.repository;
    if (!repository) return null;
    const results = (await repository
      .createQueryBuilder()
      .select("uuid,title || ' ' ||value as value")
      .where(visible)
      .orderBy({ date: "DESC" })
      .getRawMany()) as { uuid: string; value: string }[] | null;
    if (!results) return null;
    const keywords = keyword
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
      })
      .toLowerCase()
      .split(/\s/);
    if (keywords.length === 0) return null;
    const hits: string[] = [];
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
      let flag = true;
      for (const key of keywords) {
        if (key.length === 0) continue;
        if (msg.indexOf(key) === -1) {
          flag = false;
          break;
        }
      }
      if (flag) hits.push(r.uuid);
    }
    return hits;
  }

  public async getIdFromUuid(uuid: string) {
    const repository = this.repository;
    if (!repository) return 0;
    const entity = await repository.findOne({
      select: ["id"],
      where: { uuid }
    });
    if (!entity) return 0;
    return entity.id;
  }

  /**
   *コンテンツのエクスポート
   *
   * @param {number} id
   * @returns
   * @memberof Contents
   */
  @EXPORT
  public async export(uuid: string) {
    if (!this.isAdmin()) return null;
    const id = await this.getIdFromUuid(uuid);
    return this._export(this.getResponse(), id);
  }
  /**
   *コンテンツのインポート
   *
   * @param {number} id
   * @param {number} mode
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  @EXPORT
  public async import(uuid: string, mode: number): Promise<boolean | null> {
    if (!this.isAdmin()) return null;
    const buffer = this.getSession().getBuffer();
    if (!buffer) return null;
    const id = await this.getIdFromUuid(uuid);
    return this._import(id, mode, buffer.toString());
  }
  /**
   *コンテンツの検索
   *
   * @param {string} keyword
   * @returns
   * @memberof Contents
   */
  @EXPORT
  public async search(keyword: string) {
    const admin = this.isAdmin();
    return this._search(keyword, admin);
  }

  /**
   *コンテンツの階層を移動
   *
   * @param {number} fromId
   * @param {number} toId
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  @EXPORT
  public async moveContents(
    fromUuid: string,
    toUuid: string
  ): Promise<boolean | null> {
    const fromId = await this.getIdFromUuid(fromUuid);
    const toId = await this.getIdFromUuid(toUuid);
    if (this.isAdmin()) return this._moveContents(fromId, toId);
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
  @EXPORT
  public async moveVector(
    uuid: string,
    vector: number
  ): Promise<boolean | null> {
    const id = await this.getIdFromUuid(uuid);
    if (!this.isAdmin()) return null;
    return this._moveVector(id, vector);
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
  @EXPORT
  public async createContents(
    uuid: string,
    vector: number,
    type: string
  ): Promise<{
    uuid: string;
  } | null> {
    const remoteDB = this.remoteDB;
    if (!remoteDB) return null;
    if (!this.isAdmin()) return null;
    const id = await this.getIdFromUuid(uuid);
    return this._createContents(id, vector, type);
  }
  /**
   *ツリー構造のコンテンツデータを返す
   *
   * @param {number} id
   * @returns {(Promise<TreeContents | null>)}
   * @memberof Contents
   */
  @EXPORT
  public async getTree(uuid: string|null): Promise<TreeContents | null> {
    const admin = this.isAdmin();
    const id = uuid ? await this.getIdFromUuid(uuid) : 1;
    return this._getTree(id, admin);
  }
  /**
   *一ページ分のコンテンツデータを返す
   *
   * @param {number} id
   * @returns {(Promise<ContentsEntity | null>)}
   * @memberof Contents
   */
  @EXPORT
  public async getPage(uuid: string): Promise<ContentsEntity | undefined> {
    const admin = this.isAdmin();
    const id = uuid ? await this.getIdFromUuid(uuid) : 1;
    const pid = await this.getParentPage(id);
    if (pid === 0) return undefined;
    const contents = await this._getContents(pid, true, admin);
    return contents;
  }
  /**
   *コンテンツデータを返す
   *
   * @param {number} id
   * @param {boolean} [child]
   * @returns {(Promise<ContentsEntity | null>)}
   * @memberof Contents
   */
  @EXPORT
  public async getContents(
    uuid: string,
    child?: boolean
  ): Promise<ContentsEntity | undefined> {
    const id = await this.getIdFromUuid(uuid);
    const admin = this.isAdmin();
    return this._getContents(id, child, admin);
  }
  /**
   *コンテンツを削除
   *
   * @param {number} id
   * @returns {(Promise<boolean | null>)}
   * @memberof Contents
   */
  @EXPORT
  public async deleteContents(id: number): Promise<boolean | null> {
    if (!this.isAdmin()) return null;
    const flag = await this._deleteContents(id);
    return flag;
  }

  /**
   *コンテンツの更新
   *
   * @param {ContentsEntity} contents
   * @returns
   * @memberof Contents
   */
  @EXPORT
  public async updateContents(contents: ContentsEntity) {
    const users = await this.getSessionModule(Users);
    if (!users || !users.isAdmin()) return null;
    return this._updateContents(contents);
  }
}
