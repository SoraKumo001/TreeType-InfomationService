import { ModuleMap, BaseModule } from "../Manager/BaseModule";

export interface TreeContents {
  id:number;
  uuid:string;
  visible: boolean;
  date: Date;
  update: Date;
  type: string;
  title: string;
  children: TreeContents[];
  parent?: TreeContents;
  pageNew?: TreeContents;
}
export interface MainContents {
  id:number;
  uuid:string;
  priority?: number;
  visible: boolean;
  type: string;
  date: Date;
  update?: Date;
  title_type: number;
  title: string;
  value_type: string;
  value: string;
  children?: MainContents[];
}
export interface CustomMap extends ModuleMap {
  getTree: [TreeContents];
  selectPage: [string]; //pid
  selectContents: [string, boolean | undefined]; //parameter
  createContents: [string, string]; //pid,id
  deleteContents: [string]; //id
  updateContents: [MainContents];
  moveVector: [string, number]; //id,vector
  moveContents: [string, string]; //fromId,toId
  importContents: [string];
  drawContents: [HTMLElement, string];
}

type ValueTypeProc = (
  body: HTMLDivElement,
  pageId: string,
  contents: MainContents
) => void;

/**
 *コンテンツデータアクセス用モジュール
 *
 * @export
 * @class ContentsModule
 * @extends {BaseModule<CustomMap>}
 */
export class ContentsModule extends BaseModule<CustomMap> {
  private contentsValueTypes: { [name: string]: ValueTypeProc } = {};
  public async createContents(puuid: string, vector: number, type: string) {
    const adapter = this.getAdapter();
    const result = (await adapter.exec(
      "Contents.createContents",
      puuid,
      vector,
      type
    )) as { uuid: string } | null;
    if (result) {
      this.callEvent("createContents", puuid, result.uuid);
    }
    return result;
  }

  /**
   *ツリーデータを受け取る
   *
   * @param {string} [id]
   * @returns
   * @memberof ContentsModule
   */
  public async getTree(uuid?: string) {
    const adapter = this.getAdapter();
    const treeContents = (await adapter.exec(
      "Contents.getTree",
      uuid
    )) as TreeContents | null;
    if (treeContents) {
      this.convertTreeContents(treeContents);
      this.callEvent("getTree", treeContents);
    }
    return treeContents;
  }

  /**
   *コンテンツ表示用のページデータを読み出す
   *
   * @param {string} id
   * @returns
   * @memberof ContentsModule
   */
  public async getPage(uuid: string) {
    const adapter = this.getAdapter();
    const page = (await adapter.exec(
      "Contents.getPage",
      uuid
    )) as MainContents | null;
    if (page) {
      this.callEvent("selectPage", page.uuid);
    }
    return page;
  }

  /**
   *ページを選択する
   *
   * @param {number} uuid
   * @param {boolean} [tree]
   * @memberof ContentsModule
   */
  public selectContents(uuid: string, tree?: boolean) {
    this.callEvent("selectContents", uuid, tree);
  }

  /**
   *対象IDのコンテンツのみ取得
   *
   * @param {number} uuid
   * @param {boolean} [child]
   * @returns
   * @memberof ContentsModule
   */
  public getContents(uuid: string, child?: boolean) {
    const adapter = this.getAdapter();
    return adapter.exec(
      "Contents.getContents",
      uuid,
      child
    ) as Promise<MainContents | null>;
  }

  /**
   *コンテンツの削除
   *
   * @param {number} uuid
   * @returns
   * @memberof ContentsModule
   */
  public async deleteContents(uuid: string) {
    const adapter = this.getAdapter();
    const flag = (await adapter.exec("Contents.deleteContents", uuid)) as Promise<
      boolean | null
    >;
    if (flag) {
      this.callEvent("deleteContents", uuid);
    }
    return flag;
  }
  public async updateContents(contents: MainContents, save?: boolean) {
    const adapter = this.getAdapter();
    let flag: boolean | null = false;
    if (save) {
      flag = (await adapter.exec("Contents.updateContents", contents)) as
        | boolean
        | null;
    } else flag = true;

    if (flag) {
      this.callEvent("updateContents", contents);
    }
    return flag;
  }
  public async moveVector(uuid: string, vector: number) {
    const adapter = this.getAdapter();
    const flag = (await adapter.exec("Contents.moveVector", uuid, vector)) as
      | boolean
      | null;
    if (flag) this.callEvent("moveVector", uuid, vector);
    return flag;
  }
  public async moveContents(fromId: string, toId: string) {
    const adapter = this.getAdapter();
    const flag = (await adapter.exec("Contents.moveContents", fromId, toId)) as
      | boolean
      | null;
    if (flag) this.callEvent("moveContents", fromId, toId);
    return flag;
  }
  public async export(uuid: string) {
    const adapter = this.getAdapter();
    const blob = (await adapter.execBinary(
      "Contents.export",
      uuid
    )) as Blob | null;
    if (blob) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "export.json";
      link.click();
    }
    return blob;
  }

  public async import(uuid: string, mode: number, src: string) {
    const adapter = this.getAdapter();
    const flag = (await adapter.upload(
      new Blob([src], { type: "text/plain" }),
      "Contents.import",
      uuid,
      mode
    )) as boolean;
    if (flag) this.callEvent("importContents", uuid);
    return flag;
  }
  public getContentsValueTypes() {
    return Object.keys(this.contentsValueTypes);
  }
  public addContentsValueType(name: string, proc: ValueTypeProc) {
    this.contentsValueTypes[name] = proc;
  }
  public createContentsValue(
    body: HTMLDivElement,
    pageId: string,
    contents: MainContents
  ) {
    const proc = this.contentsValueTypes[contents.value_type];
    if (proc) {
      proc(body, pageId, contents);
    }
  }
  public async search(keyword: string) {
    const adapter = this.getAdapter();
    return adapter.exec("Contents.search", keyword) as Promise<string[] | null>;
  }
  /**
   *受け取ったツリーデータを扱いやすいように変換
   *
   * @private
   * @param {TreeContents} treeContents
   * @memberof ContentsModule
   */
  private convertTreeContents(treeContents: TreeContents, page?: TreeContents) {
    //取得データを文字列からDateに変換
    treeContents.date = new Date(treeContents.date);
    treeContents.update = new Date(treeContents.update);

    if (treeContents.type === "PAGE") {
      page = treeContents;
      page.pageNew = treeContents;
    } else {
      //ページ全体の更新時間を設定
      if (page && page.pageNew) {
        if (treeContents.date.getTime() > page.pageNew.date.getTime()) {
          page.pageNew = treeContents;
        }
      }
    }
    if (treeContents.children) {
      for (const child of treeContents.children) {
        child.parent = treeContents;
        this.convertTreeContents(child, page);
      }
    }
  }
}
