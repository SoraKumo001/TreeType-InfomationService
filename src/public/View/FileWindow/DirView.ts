import * as JWF from "javascript-window-framework";
import { FileModule, FileInfo } from "../../modules/FileModule";
import { FileEditWindow } from "./FileEditWindow";
/**
 *
 *
 * @class DirView
 * @extends {JWF.Window}
 */
export class DirView extends JWF.Window {
  private dirTree: JWF.TreeView;
  private fileModule: FileModule;
  public constructor(fileModule: FileModule) {
    super();
    this.fileModule = fileModule;
    //ディレクトリ用ツリービューの設定
    const dirTree = new JWF.TreeView();
    this.dirTree = dirTree;
    this.addChild(dirTree, "client");
    //パネルの作成
    const treePanel = new JWF.Panel();
    this.addChild(treePanel, "bottom");
    let button;
    button = new JWF.Button("更新");
    treePanel.addChild(button, "left");
    button.addEventListener("buttonClick", () => {
      this.loadDirs();
    });
    button = new JWF.Button("新規");
    treePanel.addChild(button, "left");
    button.addEventListener("buttonClick", () => {
      const parentId = this.dirTree.getSelectItemValue() as number;
      if (parentId) {
        const dirEdit = new FileEditWindow({
          fileModule: this.fileModule,
          parentId: this.dirTree.getSelectItemValue() as number
        });
        this.addFrameChild(dirEdit);
        dirEdit.setPos();
      }
    });
    button = new JWF.Button("削除");
    treePanel.addChild(button, "left");
    button.addEventListener("buttonClick", () => {
      const item = this.dirTree.getSelectItem();
      if (item) {
        const dirId = item.getItemValue() as number;
        const messageBox = new JWF.MessageBox("削除", "削除しますか？", [
          ["OK", true],
          ["Cancel", false]
        ]);
        this.addFrameChild(messageBox);
        messageBox.addEventListener("buttonClick", e => {
          if (e) this.fileModule.deleteFile(dirId);
        });
        messageBox.setPos();
      }
    });
    button = new JWF.Button("編集");
    treePanel.addChild(button, "left");
    button.addEventListener("buttonClick", () => {
      const item = this.dirTree.getSelectItem();
      if (item) {
        const fileId = item.getItemValue() as number;
        const dirEdit = new FileEditWindow({
          fileModule: this.fileModule,
          fileId: fileId as number,
          name: item.getItemText()
        });
        this.addFrameChild(dirEdit);
        dirEdit.setPos();
      }
    });
    this.addRemover(
      fileModule.addEventListener("delete_file", dirId => {
        //削除対象が選択中かどうか
        const selectId = this.dirTree.getSelectItemValue();
        if (dirId === selectId) {
          let id = 0;
          const item = this.dirTree.findItemFromValue(dirId);
          if (item) {
            const parent = item.getParentItem();
            if (parent) {
              id = parent.getItemValue() as number;
            }
          }
          //親ディレクトリを選択
          this.loadDirs(id);
        } else this.loadDirs();
      }),
      fileModule.addEventListener("update_dir", parentId => {
        this.loadDirs(parentId);
      }),
      fileModule.addEventListener("update_file", () => {
        this.loadDirs();
      })
    );
    //初回ロード
    this.loadDirs();
  }
  public async loadDirs(selectId?: number) {
    const dirTree = this.dirTree;
    const treeStat = dirTree.getTreeStat();
    dirTree.clearItem();
    if (!selectId) {
      selectId = dirTree.getSelectItemValue() as number;
    }
    const dir = await this.fileModule.getDirs();
    if (dir) {
      var item = dirTree.getRootItem();
      this.setTreeData(item, dir);
    }
    dirTree.setTreeStat(treeStat);
    if (selectId) dirTree.selectItemFromValue(selectId);
    else dirTree.getRootItem().selectItem();
  }
  private setTreeData(item: JWF.TreeItem, dir: FileInfo) {
    item.setItemText(dir.name);
    item.setItemValue(dir.id);
    for (const child of dir.childs) {
      this.setTreeData(item.addItem(), child);
    }
  }
  public getDirId() {
    return this.dirTree.getSelectItemValue() as number;
  }
  public selectDir(id: number) {
    this.dirTree.selectItemFromValue(id);
  }
  public getTree() {
    return this.dirTree;
  }
}
