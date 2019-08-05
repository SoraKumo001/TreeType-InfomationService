/**
 *コンテンツデータをキャッシュして他のプラグインから利用可能にするプラグイン
 *
 */

import { appManager, AppManager } from "../../AppManager";
import { ContentsModule, TreeContents } from "../../modules/ContentsModule";
import { AppModule } from "../../AppModule";


export class ContentsCacheModule extends AppModule {
  private treeContents?: TreeContents;
  public constructor(manager: AppManager) {
    super(manager);
    const contentsModule = manager.getModule(ContentsModule);
    contentsModule.addEventListener("getTree", treeContents => {
      const id = treeContents.id;
      if (id === undefined || id === 1) {
        this.treeContents = treeContents;
      }
      this.treeContents = treeContents;
    });
    contentsModule.addEventListener("createContents", treeContents => {});
    contentsModule.addEventListener("deleteContents", id => {
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
    contentsModule.addEventListener("updateContents", mainContents => {
      const treeContents = this.findTreeContents(mainContents.id);
      if(treeContents){
        treeContents.title = mainContents.title;
        treeContents.type = mainContents.type;
        treeContents.visible = mainContents.visible;
        treeContents.date = mainContents.date;
      }
    });
  }
  public findTreeContents(
    id: number,
    tree?: TreeContents
  ): TreeContents | null {
    if (!tree) tree = this.treeContents;
    if (!tree) return null;
    if (tree.id === id) return tree;
    if (tree.children) {
      for (const child of tree.children) {
        const result = this.findTreeContents(id, child);
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
appManager.getModule(ContentsCacheModule);

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
