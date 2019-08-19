import * as JWF from "javascript-window-framework";
import {
  SettingModule,
  SettingData,
  SettingView
} from "./SettingModule";
import { Manager } from "../Manager/Manager";

export class SettingWindow extends JWF.FrameWindow {
  private treeView: JWF.TreeView;
  private manager: Manager;
  public constructor(manager: Manager) {
    super();
    this.setJwfStyle("SettingWindow");
    this.manager = manager;
    this.setTitle("総合設定");
    this.setSize(640, 600);
    this.setPos();

    const splitter = new JWF.Splitter();
    this.addChild(splitter, "client");
    splitter.setSplitterPos(250);

    const treeView = new JWF.TreeView();
    this.treeView = treeView;
    splitter.addChild(0, treeView, "client");

    treeView.addEventListener("itemSelect", e => {
      splitter.removeChildAll(1);
      const value = e.item.getItemValue() as typeof SettingView;
      if (value) {
        splitter.addChild(1, new value(manager), "client");
      }
    });

    this.drawMenu();
  }

  public drawMenu() {
    //ツリービューの初期化
    const treeView = this.treeView;
    treeView.clearItem();
    const item = treeView.getRootItem();
    item.setItemText("設定一覧");

    //メニューを追加
    const settingModule = this.manager.getModule(SettingModule);
    const settings = settingModule.getSettings();
    this.addItem(item, settings);
  }
  private addItem(item: JWF.TreeItem, settings: SettingData[]) {
    for (const data of settings) {
      const childItem = item.addItem([data.name, data.view], true);
      this.addItem(childItem, data.child);
    }
  }
}
