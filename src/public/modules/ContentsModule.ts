import { AppModule, ModuleMap } from "../AppModule";
export interface TreeContents {
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
  priority?: number;
  stat: number;
  type: string;
  date: Date;
  update?: Date;
  title_type: number;
  title: string;
  value: string;
  childs?: MainContents[];
}
export interface CustomMap extends ModuleMap {
  selectPage:[number] //pid
  selectContents: [number, boolean | undefined]; //parameter
  createContents: [number, number]; //pid,id
  deleteContents: [number]; //id
}

export class ContentsModule extends AppModule<CustomMap> {
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
  public getTree(id?: number) {
    const adapter = this.getAdapter();
    return adapter.exec(
      "Contents.getTree",
      id ? id : 1
    ) as Promise<TreeContents | null>;
  }
  public async getPage(id: number) {
    const adapter = this.getAdapter();
    const page = await adapter.exec("Contents.getPage", id) as MainContents | null;
    if(page){
      this.callEvent("selectPage",page.id);
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
    const flag = adapter.exec("Contents.deleteContents", id) as Promise<
      boolean | null
    >;
    if (flag) this.callEvent("deleteContents", id);
    return flag;
  }
  public updateContents(contents: MainContents) {
    const adapter = this.getAdapter();
    return adapter.exec("Contents.updateContents", contents) as Promise<
      number | null
    >;
  }
}
