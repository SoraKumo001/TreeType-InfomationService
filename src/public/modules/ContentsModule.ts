import { AppModule, ModuleMap } from "../AppModule";
export interface TreeContents {
  id: number;
  pid: number;
  stat: boolean;
  date: Date;
  update: Date;
  type: string;
  title: string;
  childs: TreeContents[];
  parent?: TreeContents;
  pageNew?: TreeContents;
}
export interface MainContents {
  id: number;
  pid: number;
  priority?: number;
  stat: number;
  type: string;
  date: Date;
  update?: Date;
  title_type: number;
  title: string;
  value_type: string;
  value: string;
  childs?: MainContents[];
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
export class ContentsModule extends AppModule<CustomMap> {
  private treeContents?: TreeContents;
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
  public findTreeContents(
    id: number,
    tree?: TreeContents
  ): TreeContents | null {
    if (!tree) tree = this.treeContents;
    if (!tree) return null;
    if (tree.id === id) return tree;
    if (tree.childs) {
      for (const child of tree.childs) {
        const result = this.findTreeContents(id, child);
        if (result) return result;
      }
    }
    return null;
  }
  public getTreeCache() {
    return this.treeContents;
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
      if (id === undefined || id === 1) {
        this.treeContents = treeContents;
      }
      this.callEvent("getTree", treeContents);
    }
    return treeContents;
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
        if (treeContents.date.getTime() > page.pageNew.date.getTime()){
          page.pageNew = treeContents;
        }
      }
    }
    if (treeContents.childs) {
      for (const child of treeContents.childs) {
        child.parent = treeContents;
        this.convertTreeContents(child, page);
      }
    }
  }
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
  public selectContents(id: number, tree?: boolean) {
    this.callEvent("selectContents", id, tree);
  }
  public getContents(id: number, child?: boolean) {
    const adapter = this.getAdapter();
    return adapter.exec(
      "Contents.getContents",
      id,
      child
    ) as Promise<MainContents | null>;
  }
  public async deleteContents(id: number) {
    const adapter = this.getAdapter();
    const flag = (await adapter.exec("Contents.deleteContents", id)) as Promise<
      boolean | null
    >;
    if (flag) this.callEvent("deleteContents", id);
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

    if (flag) this.callEvent("updateContents", contents);
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
}
