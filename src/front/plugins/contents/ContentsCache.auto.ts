/**
 *コンテンツデータをキャッシュして他のプラグインから利用可能にするプラグイン
 *
 */

import { ContentsModule, TreeContents } from "../../Contents/ContentsModule";
import { getManager } from "../..";
import { BaseModule } from "../../Manager/BaseModule";
import { Manager } from "../../Manager/Manager";

export class ContentsCacheModule extends BaseModule {
  private treeContents?: TreeContents;
  public constructor(manager: Manager) {
    super(manager);
    const contentsModule = manager.getModule(ContentsModule);
    contentsModule.addEventListener("getTree", (treeContents) => {
      const id = treeContents.id;
      if (id === undefined || id === 1) {
        this.treeContents = treeContents;
      }
      this.treeContents = treeContents;
    });
    contentsModule.addEventListener("createContents", () => undefined);
    contentsModule.addEventListener("deleteContents", (id) => {
      //コンテンツキャッシュからデータを削除
      const treeContents = this.findTreeContents(id);
      if (treeContents) {
        const parent = treeContents.parent;
        if (parent) {
          const childs = parent.children;
          childs.splice(childs.indexOf(treeContents), 1);
        }
      }
    });
    contentsModule.addEventListener("updateContents", (mainContents) => {
      const treeContents = this.findTreeContents(mainContents.uuid);
      if (treeContents) {
        treeContents.title = mainContents.title;
        treeContents.type = mainContents.type;
        treeContents.visible = mainContents.visible;
        treeContents.date = mainContents.date;
      }
    });
  }
  public findTreeContents(
    uuid: string,
    tree?: TreeContents
  ): TreeContents | null {
    if (!tree) tree = this.treeContents;
    if (!tree) return null;
    if (tree.uuid === uuid) return tree;
    if (tree.children) {
      for (const child of tree.children) {
        const result = this.findTreeContents(uuid, child);
        if (result) return result;
      }
    }
    return null;
  }
  public getTreeCache() {
    return this.treeContents;
  }
}
//起動直後に呼ばれるように自分自身を作成
getManager().getModule(ContentsCacheModule);

/*
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

*/
