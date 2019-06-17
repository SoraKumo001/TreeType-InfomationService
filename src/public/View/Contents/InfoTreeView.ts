import * as JWF from "javascript-window-framework";
import { AppManager } from "../../AppManager";
import { ContentsModule, TreeContents } from "../../modules/ContentsModule";
import { TreeItem, TreeViewEventMap } from "javascript-window-framework";
import "./scss/InfoTreeView.scss";

export interface CustomMap extends TreeViewEventMap {
  selectPage: [number]; //pageId
}

export class InfoTreeView extends JWF.TreeView<CustomMap> {

  private contentsModule: ContentsModule;
  private selectId : number = 0;
  public constructor(manager: AppManager) {
    super();
    const contentsModule = manager.getModule(ContentsModule);
    this.contentsModule = contentsModule;

    this.addEventListener("itemSelect",(e)=>{
      if(e.user)
        contentsModule.callEvent("selectPage",e.item.getItemValue() as number);
    })
    contentsModule.addEventListener("selectPage",(id)=>{
      this.selectId = id;
      this.selectItemFromValue(id);
    });

    this.loadTree();
  }
  public async loadTree() {
    this.clearItem();
    const value = await this.contentsModule.getTree();
    if (value)
      this.setTreeItem(this.getRootItem(), value);
    if(this.selectId)
      this.selectItemFromValue(this.selectId);
  }
  private setTreeItem(item: TreeItem, value: TreeContents) {
    const node = item.getNode();
    item.setItemText(value.title);
    item.setItemValue(value.id);
    node.dataset.contentStat = value.stat ? "true" : "false";
    node.dataset.contentType = value["type"] === "PAGE" ? "PAGE" : "TEXT";
    if (value.childs) {
      var flag = node.dataset.contentType !== 'PAGE';
      for (var i = 0; value.childs[i]; i++) {
        var child = value.childs[i];
        if ( /*Contents.visible || */child["stat"])
          this.setTreeItem(item.addItem("", flag), child);
      }
    }
  }
}
