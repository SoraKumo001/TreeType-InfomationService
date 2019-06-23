import * as JWF from "javascript-window-framework";
import { AppManager } from "../../AppManager";
import { ContentsModule, TreeContents } from "../../modules/ContentsModule";
import { TreeItem } from "javascript-window-framework";
import "./scss/InfoTreeView.scss";
import { ContentsControleWindow } from "./ContentsControleWindow";
import { ContentsEditWindow } from "./ContentsEditWindow";
import { ContentsImportWindow } from "./ContentsInportWindow";

export class InfoTreeView extends JWF.TreeView {
  private manager: AppManager;
  private contentsModule: ContentsModule;
  private selectId: number = 0;
  private overId: number = 0;
  public constructor(manager: AppManager) {
    super();
    this.manager = manager;
    const contentsModule = manager.getModule(ContentsModule);
    this.contentsModule = contentsModule;

    this.getClient().dataset.style = "InfoTreeView";

    const optionNode = document.createElement("div");
    optionNode.className = "TreeOption";
    optionNode.innerText = "🔧";
    optionNode.addEventListener("click", (e) => {
      this.showEditMenu(this.overId);
      e.cancelBubble = true;
    });

    this.addEventListener("itemSelect", e => {
      if (e.user)
        contentsModule.selectContents(e.item.getItemValue() as number, false);
    });
    this.addEventListener("itemOver", e => {
      const item = e.item;
      this.overId = item.getItemValue() as number;
      item.getNode().childNodes[0].appendChild(optionNode);
      e.event.preventDefault();
    });

    this.addEventListener("itemDrop", e => {
      if (typeof e.srcValue === "number")
        this.contentsModule.moveContents(
          e.srcValue,
          e.item.getItemValue() as number
        );

      e.event.preventDefault();
    });

    contentsModule.addEventListener("selectContents", id => {
      this.selectId = id;
      this.selectItemFromValue(id,true);
    });
    contentsModule.addEventListener("createContents", (pid, id) => {
      this.loadSubTree(pid, id);
    });
    contentsModule.addEventListener("moveContents", (fromId) => {
      this.loadTree(fromId,true);
    });
    contentsModule.addEventListener("deleteContents", id => {
      const item = this.findItemFromValue(id);
      if (item) item.removeItem();
    });
    contentsModule.addEventListener("updateContents", contents => {
      const item = this.findItemFromValue(contents.id);
      if (item) {
        item.setItemText(contents.title);
        const node = item.getNode();
        node.dataset.contentStat = contents.stat ? "true" : "false";
        node.dataset.contentType = contents.type === "PAGE" ? "PAGE" : "TEXT";
      }
    });
    contentsModule.addEventListener("moveVector", (id, vector) => {
      const item = this.findItemFromValue(id);
      if (!item) return;
      item.moveItem(vector);
    });
  }
  public showEditMenu(id: number) {
    //管理者用編集メニュー

    const contentsControle = new ContentsControleWindow();
    const x =
      this.getAbsX() + this.getWidth() - contentsControle.getWidth() - 30;
    contentsControle.setPos(x, 30);

    contentsControle.addMenu("編集", () => {
      new ContentsEditWindow(this.manager, id);
    });

    contentsControle.addMenu("新規(上)", () => {
      this.contentsModule.createContents(id, 0, "PAGE");
    });
    contentsControle.addMenu("新規(下)", () => {
      this.contentsModule.createContents(id, 1, "PAGE");
    });

    contentsControle.addMenu("新規(子上)", () => {
      this.contentsModule.createContents(id, 2, "PAGE");
    });
    contentsControle.addMenu("新規(子下)", () => {
      this.contentsModule.createContents(id, 3, "PAGE");
    });

    contentsControle.addMenu("移動(上)", () => {
      this.contentsModule.moveVector(id, -1);
    });
    contentsControle.addMenu("移動(下)", () => {
      this.contentsModule.moveVector(id, 1);
    });
    contentsControle.addMenu("インポート", () => {
      new ContentsImportWindow(this.manager,id);
    });
  }

  public async loadTree(selectId?: number, reload?: boolean) {
    if (!reload && selectId && this.findItemFromValue(selectId)) {
      this.selectItemFromValue(selectId, true);
      return false;
    }

    this.clearItem();
    const value = await this.contentsModule.getTree();
    if (value) this.setTreeItem(this.getRootItem(), value);
    if (selectId) this.selectItemFromValue(selectId);
    else if (this.selectId) this.selectItemFromValue(this.selectId);
    return true;
  }
  public async loadSubTree(parentId: number, selectId?: number) {
    const item = this.findItemFromValue(parentId);
    if (!item) return this.loadTree(selectId);

    item.clearItem();

    const value = await this.contentsModule.getTree(parentId);
    if (value) this.setTreeItem(item, value);
    if (selectId) this.selectItemFromValue(selectId);
    else if (this.selectId) this.selectItemFromValue(this.selectId,true);
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
        // if (/*Contents.visible || */ child["stat"])
        this.setTreeItem(item.addItem("", flag), child);
      }
    }
  }
}
