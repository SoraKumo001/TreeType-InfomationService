/**
 *検索ボタン表示用プラグイン
 */


import { ContentsModule, TreeContents } from "../../Contents/ContentsModule";
import {
  FrameWindow,
  ListView,
  Panel,
  Button,
  TextBox,
  sprintf
} from "javascript-window-framework";
import { RouterModule } from "../../Manager/RouterModule";
import { ContentsCacheModule } from "./ContentsCache.auto";
import { appManager, AppManager } from "../../Manager/AppManager";

const contentsModule = appManager.getModule(ContentsModule);
const contentsCacheModule = appManager.getModule(ContentsCacheModule);

contentsModule.addEventListener("drawContents", (client, id) => {
  const contentsPage = client.querySelector(
    "[data-type=ContentsPage]"
  ) as HTMLElement;
  const search = document.createElement("div");
  search.style.position = "absolute";
  search.style.cursor = "pointer";
  search.style.right = "2em";
  search.style.zIndex = "100";
  search.style.padding = "0.7em";
  search.style.background = "rgba(0,0,0,0.1)";
  search.style.borderRadius = "1em";
  search.innerText = "検索";
  search.addEventListener("click", () => {
    new ContentsSearchWindow(appManager);
  });
  contentsPage.insertBefore(search, contentsPage.firstChild);
});

const routerModule = appManager.getModule(RouterModule);

export class ContentsSearchWindow extends FrameWindow {
  private searchBox: TextBox;
  private listView: ListView;
  public constructor(manager: AppManager) {
    super();
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
      contentsModule.selectContents(id);
    });
    this.addEventListener("closed", () => {
      routerModule.setLocationParams({ search: null });
    });
  }
  public async search(keyword?:string) {
    if(!keyword){
      keyword = this.searchBox.getText();
    }else{
      this.searchBox.setText(keyword);
    }
    const listView = this.listView;
    listView.clearItem();
    const result = await contentsModule.search(keyword);
    if (result) {
      for (const r of result) {
        const contents = contentsCacheModule.findTreeContents(r);
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
            if (title.length) title += " - ";
            title += parent.title;
          } while ((parent = contentsCacheModule.findTreeContents(parent.pid)));
          listView.addItem([dateStr, title], r);

          routerModule.setLocationParams({ search: keyword });
        }
      }
    }
  }
}
routerModule.addEventListener("goLocation",()=>{
  const keyword = routerModule.getLocationParam("search");
  if(keyword){
    const searchWindow = new ContentsSearchWindow(appManager);
    searchWindow.search(keyword);
    searchWindow.foreground();
  }
})
