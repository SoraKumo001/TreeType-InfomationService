import {
  FrameWindow,
  ListView,
  Panel,
  Button,
  TextBox,
  sprintf
} from "javascript-window-framework";
import { AppManager } from "../AppManager";
import { ContentsModule, TreeContents } from "../modules/ContentsModule";

export class ContentsSearchWindow extends FrameWindow {
  private searchBox: TextBox;
  private listView: ListView;
  private contentsModule: ContentsModule;
  public constructor(manager: AppManager) {
    super();
    this.contentsModule = manager.getModule(ContentsModule);
    this.setTitle("検索");
    this.setSize(600, 400);
    this.setPos();
    const panelView = new Panel();
    this.addChild(panelView, "top");
    const enterButton = new Button("検索");
    panelView.addChild(enterButton, "left");
    enterButton.addEventListener("buttonClick", () => {
      this.search();
    });

    const searchBox = new TextBox();
    this.searchBox = searchBox;
    panelView.addChild(searchBox, "client");
    searchBox.addEventListener("enter", () => {
      this.search();
    });

    const listView = new ListView();
    this.listView = listView;
    this.addChild(listView, "client");
    listView.addHeader([["更新", 100], "タイトル"]);
    listView.addEventListener("itemClick", e => {
      const id = listView.getItemValue(e.itemIndex) as number;
      this.contentsModule.selectContents(id);
    });
  }
  public async search() {
    const contentsModule = this.contentsModule;
    const keyword = this.searchBox.getText();
    const result = await contentsModule.search(keyword);
    const listView = this.listView;
    listView.clearItem();
    if (result) {
      for (const r of result) {
        const contents = contentsModule.findTreeContents(r);
        if (contents) {
          const date = new Date(contents.date);
          const dateStr = sprintf(
            "%04d/%02d/%02d",
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate()
          );
          let title = "";
          let parent: TreeContents | null = contents;
          do {
            if(title.length)
              title += " - ";
            title += parent.title;
          } while ((parent = contentsModule.findTreeContents(parent.pid)));
          listView.addItem([dateStr, title], r);
        }
      }
    }
  }
}
