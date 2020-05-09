/**
 *コンテンツのタイトルツリーの管理
 *
 */
import * as JWF from "@jswf/core";
import { ContentsModule, TreeContents } from "./ContentsModule";
import { TreeItem } from "@jswf/core";
import { ContentsControleWindow } from "./ContentsControleWindow";
import { ContentsEditWindow } from "./ContentsEditWindow";
import { ContentsImportWindow } from "./ContentsInportWindow";
import "./scss/InfoTreeView.scss";
import { Manager } from "../Manager/Manager";

export class InfoTreeView extends JWF.TreeView {
  private manager: Manager;
  private contentsModule: ContentsModule;
  private selectId: string = "0";
  private overId: string = "";
  public constructor(manager: Manager) {
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
        contentsModule.selectContents(e.item.getItemValue() as string, false);
    });
    this.addEventListener("itemDblClick", e => {
      new ContentsEditWindow(this.manager, e.item.getItemValue() as string);
    });
    this.addEventListener("itemOver", e => {
      const item = e.item;
      this.overId = item.getItemValue() as string;
      item.getNode().childNodes[0].appendChild(optionNode);
      e.event.preventDefault();
    });

    this.addEventListener("itemDrop", e => {
      if (typeof e.srcValue === "string")
        this.contentsModule.moveContents(
          e.srcValue,
          e.item.getItemValue() as string
        );

      e.event.preventDefault();
    });
    contentsModule.addEventListener("getTree", treeContents => {
      this.drawTree(treeContents);
    });
    contentsModule.addEventListener("selectContents", uuid => {
      this.selectId = uuid;
      this.selectItemFromValue(uuid, true);
    });
    contentsModule.addEventListener("createContents", (pid, uuid) => {
      this.loadTree(uuid);
    });
    contentsModule.addEventListener("moveContents", fromId => {
      this.loadTree(fromId, true);
    });
    contentsModule.addEventListener("deleteContents", id => {
      const item = this.findItemFromValue(id);
      if (item) item.removeItem();
    });
    contentsModule.addEventListener("updateContents", contents => {
      const item = this.findItemFromValue(contents.uuid);
      if (item) {
        const node = item.getNode();
        if (node.dataset.contentType !== contents.type) {
          //タイプ変更の場合はツリーを読み直す
          this.loadTree(undefined ,true);
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
  public showEditMenu(uuid: string) {
    //管理者用編集メニュー

    const contentsControle = new ContentsControleWindow();
    const x =
      this.getAbsX() + this.getWidth() - contentsControle.getWidth() - 30;
    contentsControle.setPos(x, 30);

    contentsControle.addMenu("編集", () => {
      new ContentsEditWindow(this.manager, uuid);
    });

    contentsControle.addMenu("新規(上)", () => {
      this.contentsModule.createContents(uuid, 0, "PAGE");
    });
    contentsControle.addMenu("新規(下)", () => {
      this.contentsModule.createContents(uuid, 1, "PAGE");
    });

    contentsControle.addMenu("新規(子上)", () => {
      this.contentsModule.createContents(uuid, 2, "PAGE");
    });
    contentsControle.addMenu("新規(子下)", () => {
      this.contentsModule.createContents(uuid, 3, "PAGE");
    });

    contentsControle.addMenu("移動(上)", () => {
      this.contentsModule.moveVector(uuid, -1);
    });
    contentsControle.addMenu("移動(下)", () => {
      this.contentsModule.moveVector(uuid, 1);
    });
    contentsControle.addMenu("インポート", () => {
      new ContentsImportWindow(this.manager, uuid);
    });
    contentsControle.addMenu("エクスポート", async () => {
      const value = await this.contentsModule.export(uuid);
      if (value) console.log(value.size);
    });
  }
  public drawTree(value: TreeContents) {
    const uuid = value.uuid;
    let item: TreeItem | null;
    if (value.id === 1) item = this.getRootItem();
    else item = this.findItemFromValue(uuid);

    if (!item) return;
    item.clearItem();
    if (value) this.setTreeItem(item, value);
    if (this.selectId) this.selectItemFromValue(this.selectId, true);
  }
  public async loadTree(selectId?: string, reload?: boolean) {
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
   // const level = item.getTreeLevel();
    item.setItemText(value.title);
    item.setItemValue(value.uuid);
    node.dataset.contentStat = value.visible ? "true" : "false";
    node.dataset.contentType = value["type"] === "PAGE" ? "PAGE" : "ITEM";
    if (value.children) {
      const flag = node.dataset.contentType !== "PAGE";
      for (let i = 0; value.children[i]; i++) {
        const child = value.children[i];
        // if (/*Contents.visible || */ child["stat"])
        this.setTreeItem(item.addItem("", flag), child);
      }
    }
  }
}
