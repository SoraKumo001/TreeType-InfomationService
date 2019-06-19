import * as JWF from "javascript-window-framework";
import { AppManager } from "../../AppManager";
import { ContentsModule, TreeContents } from "../../modules/ContentsModule";
import { TreeItem, TreeViewEventMap } from "javascript-window-framework";
import "./scss/InfoTreeView.scss";

export class InfoTreeView extends JWF.TreeView {
  private contentsModule: ContentsModule;
  private selectId: number = 0;
  public constructor(manager: AppManager) {
    super();
    const contentsModule = manager.getModule(ContentsModule);
    this.contentsModule = contentsModule;

    this.addEventListener("itemSelect", e => {
      if (e.user)
        contentsModule.selectContents(e.item.getItemValue() as number,false);
    });
    contentsModule.addEventListener("selectContents", id => {
      this.selectId = id;
      this.selectItemFromValue(id);
    });
    contentsModule.addEventListener("createContents", (pid, id) => {
      this.loadSubTree(pid,id);
    });
    contentsModule.addEventListener("deleteContents", (id) => {
      const item = this.findItemFromValue(id);
      if(item)
        item.removeItem();
    });

  }
  public async loadTree(selectId?: number, reload?: boolean) {
    if (!reload && selectId && this.findItemFromValue(selectId)) {
      this.selectItemFromValue(selectId);
      return;
    }

    this.clearItem();
    const value = await this.contentsModule.getTree();
    if (value) this.setTreeItem(this.getRootItem(), value);
    if (selectId) this.selectItemFromValue(selectId);
    else if (this.selectId) this.selectItemFromValue(this.selectId);
  }
  public async loadSubTree(parentId:number,selectId?: number) {
    const item = this.findItemFromValue(parentId);
    if(!item)
      return this.loadTree(selectId,true);

    item.clearItem();

    const value = await this.contentsModule.getTree(parentId);
    if (value) this.setTreeItem(item, value);
    if (selectId) this.selectItemFromValue(selectId);
    else if (this.selectId) this.selectItemFromValue(this.selectId);
  }
  private setTreeItem(item: TreeItem, value: TreeContents) {
    const node = item.getNode();
    item.setItemText(value.title);
    item.setItemValue(value.id);
    node.dataset.contentStat = value.stat ? "true" : "false";
    node.dataset.contentType = value["type"] === "PAGE" ? "PAGE" : "TEXT";
    if (value.childs) {
      var flag = node.dataset.contentType !== "PAGE";
      for (var i = 0; value.childs[i]; i++) {
        var child = value.childs[i];
        if (/*Contents.visible || */ child["stat"])
          this.setTreeItem(item.addItem("", flag), child);
      }
    }
  }
}
