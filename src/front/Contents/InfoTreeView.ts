/**
 *コンテンツのタイトルツリーの管理
 *
 */
import * as JWF from "javascript-window-framework";
import { ContentsModule, TreeContents } from "./ContentsModule";
import { TreeItem } from "javascript-window-framework";
import { ContentsControleWindow } from "./ContentsControleWindow";
import { ContentsEditWindow } from "./ContentsEditWindow";
import { ContentsImportWindow } from "./ContentsInportWindow";
import "./scss/InfoTreeView.scss";
import { AppManager } from "../Manager/FrontManager";

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
    optionNode.addEventListener("click", e => {
      this.showEditMenu(this.overId);
      e.cancelBubble = true;
    });

    this.addEventListener("itemSelect", e => {
      if (e.user)
        contentsModule.selectContents(e.item.getItemValue() as number, false);
    });
    this.addEventListener("itemDblClick", e => {
      new ContentsEditWindow(this.manager, e.item.getItemValue() as number);
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
    contentsModule.addEventListener("getTree", treeContents => {
      this.drawTree(treeContents);
    });
    contentsModule.addEventListener("selectContents", id => {
      this.selectId = id;
      this.selectItemFromValue(id, true);
    });
    contentsModule.addEventListener("createContents", (pid, id) => {
      this.loadTree(id);
    });
    contentsModule.addEventListener("moveContents", fromId => {
      this.loadTree(fromId, true);
    });
    contentsModule.addEventListener("deleteContents", id => {
      const item = this.findItemFromValue(id);
      if (item) item.removeItem();
    });
    contentsModule.addEventListener("updateContents", contents => {
      const item = this.findItemFromValue(contents.id);
      if (item) {
        const node = item.getNode();
        if (node.dataset.contentType !== contents.type) {
          //タイプ変更の場合はツリーを読み直す
          this.loadTree(contents.pid ? contents.pid : 1,true);
        } else {
          item.setItemText(contents.title);
          node.dataset.contentStat = contents.visible ? "true" : "false";
        }
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
      new ContentsImportWindow(this.manager, id);
    });
    contentsControle.addMenu("エクスポート", async () => {
      const value = await this.contentsModule.export(id);
      if (value) console.log(value.size);
    });
  }
  public drawTree(value: TreeContents) {
    const id = value.id;
    let item: TreeItem | null;
    if (id === 1) item = this.getRootItem();
    else item = this.findItemFromValue(id);

    if (!item) return;
    item.clearItem();
    if (value) this.setTreeItem(item, value);
    if (this.selectId) this.selectItemFromValue(this.selectId, true);
  }
  public async loadTree(selectId?: number, reload?: boolean) {
    if (!reload && selectId && this.findItemFromValue(selectId)) {
      this.selectItemFromValue(selectId, true);
      return false;
    }
    if (selectId) this.selectId = selectId;
    this.contentsModule.getTree();
    return true;
  }
  private setTreeItem(item: TreeItem, value: TreeContents) {
    const node = item.getNode();
    const level = item.getTreeLevel();
    item.setItemText(value.title);
    item.setItemValue(value.id);
    node.dataset.contentStat = value.visible ? "true" : "false";
    node.dataset.contentType = value["type"] === "PAGE" ? "PAGE" : "ITEM";
    if (value.children) {
      const flag = node.dataset.contentType !== "PAGE";
      for (let i = 0; value.children[i]; i++) {
        const child = value.children[i];
        // if (/*Contents.visible || */ child["stat"])
        this.setTreeItem(item.addItem("", flag||level<1), child);
      }
    }
  }
}
