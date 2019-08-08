import { AppModule, ModuleMap } from "../Manager/AppModule";

export interface TreeContents {
  id: number;
  pid: number;
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
  id: number;
  pid: number;
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
  selectPage: [number]; //pid
  selectContents: [number, boolean | undefined]; //parameter
  createContents: [number, number]; //pid,id
  deleteContents: [number]; //id
  updateContents: [MainContents]; //id
  moveVector: [number, number]; //id,vector
  moveContents: [number, number]; //fromId,toId
  importContents: [number];
  drawContents: [HTMLElement, number];
}

type ValueTypeProc = (
  body: HTMLDivElement,
  pageId: number,
  contents: MainContents
) => void;

/**
 *コンテンツデータアクセス用モジュール
 *
 * @export
 * @class ContentsModule
 * @extends {AppModule<CustomMap>}
 */
export class ContentsModule extends AppModule<CustomMap> {
  private contentsValueTypes: { [name: string]: ValueTypeProc } = {};
  public async createContents(pid: number, vector: number, type: string) {
    const adapter = this.getAdapter();
    const result = (await adapter.exec(
      "Contents.createContents",
      pid,
      vector,
      type
    )) as { pid: number; id: number } | null;
    if (result) {
      this.callEvent("createContents", result.pid, result.id);
    }
    return result;
  }

  /**
   *ツリーデータを受け取る
   *
   * @param {number} [id]
   * @returns
   * @memberof ContentsModule
   */
  public async getTree(id?: number) {
    const adapter = this.getAdapter();
    const treeContents = (await adapter.exec(
      "Contents.getTree",
      id ? id : 1
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
   * @param {number} id
   * @returns
   * @memberof ContentsModule
   */
  public async getPage(id: number) {
    const adapter = this.getAdapter();
    const page = (await adapter.exec(
      "Contents.getPage",
      id
    )) as MainContents | null;
    if (page) {
      this.callEvent("selectPage", page.id);
    }
    return page;
  }

  /**
   *ページを選択する
   *
   * @param {number} id
   * @param {boolean} [tree]
   * @memberof ContentsModule
   */
  public selectContents(id: number, tree?: boolean) {
    this.callEvent("selectContents", id, tree);
  }

  /**
   *対象IDのコンテンツのみ取得
   *
   * @param {number} id
   * @param {boolean} [child]
   * @returns
   * @memberof ContentsModule
   */
  public getContents(id: number, child?: boolean) {
    const adapter = this.getAdapter();
    return adapter.exec(
      "Contents.getContents",
      id,
      child
    ) as Promise<MainContents | null>;
  }

  /**
   *コンテンツの削除
   *
   * @param {number} id
   * @returns
   * @memberof ContentsModule
   */
  public async deleteContents(id: number) {
    const adapter = this.getAdapter();
    const flag = (await adapter.exec("Contents.deleteContents", id)) as Promise<
      boolean | null
    >;
    if (flag) {
      this.callEvent("deleteContents", id);
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
  public async moveVector(id: number, vector: number) {
    const adapter = this.getAdapter();
    const flag = (await adapter.exec("Contents.moveVector", id, vector)) as
      | boolean
      | null;
    if (flag) this.callEvent("moveVector", id, vector);
    return flag;
  }
  public async moveContents(fromId: number, toId: number) {
    const adapter = this.getAdapter();
    const flag = (await adapter.exec("Contents.moveContents", fromId, toId)) as
      | boolean
      | null;
    if (flag) this.callEvent("moveContents", fromId, toId);
    return flag;
  }
  public async export(id: number) {
    const adapter = this.getAdapter();
    const blob = (await adapter.execBinary(
      "Contents.export",
      id
    )) as Blob | null;
    if (blob) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "export.json";
      link.click();
    }
    return blob;
  }

  public async import(id: number, mode: number, src: string) {
    const adapter = this.getAdapter();
    const flag = (await adapter.upload(
      new Blob([src], { type: "text/plain" }),
      "Contents.import",
      id,
      mode
    )) as boolean;
    if (flag) this.callEvent("importContents", id);
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
    pageId: number,
    contents: MainContents
  ) {
    const proc = this.contentsValueTypes[contents.value_type];
    if (proc) {
      proc(body, pageId, contents);
    }
  }
  public async search(keyword: string) {
    const adapter = this.getAdapter();
    return adapter.exec("Contents.search", keyword) as Promise<number[] | null>;
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
