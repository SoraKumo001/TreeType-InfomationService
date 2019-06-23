import * as JWF from "javascript-window-framework";
import { TopMenu } from "../TopMenu";
import { AppManager } from "../../AppManager";
import { InfoTreeView } from "./InfoTreeView";
import { ContentsModule } from "../../modules/ContentsModule";
import { InfoContentsView } from "./InfoContentsView";
import { RouterModule } from "../../modules/RouterModule";
import { UserModule } from "../../modules/UserModule";
import { TreeItem } from "javascript-window-framework";



export class MainView extends JWF.Window {
  private contentsModule: ContentsModule;
  private routerModule: RouterModule;
  public constructor(manager: AppManager) {
    super({ overlap: true });
    this.setMaximize(true);

    this.addChild(new TopMenu(manager), "bottom");

    const splitter = new JWF.Splitter();
    this.addChild(splitter, "client");
    splitter.setSplitterPos(250,"ew");
    splitter.setOverlay(true,600);


    const infoTreeView = new InfoTreeView(manager);
    const infoContentsView = new InfoContentsView(manager);
    splitter.addChild(0, infoTreeView, "client");
    splitter.addChild(1, infoContentsView, "client");
    const contentsModule = manager.getModule(ContentsModule);
    this.contentsModule = contentsModule;
    const routerModule = manager.getModule(RouterModule);
    this.routerModule = routerModule;

    contentsModule.addEventListener("selectContents", (id,tree) => {
      this.routerModule.setLocationParams({ p: id },!tree);
    });
    contentsModule.addEventListener("selectPage", id => {
      let item: TreeItem | null = infoTreeView.findItemFromValue(id);
      if (!item) return;
      let title = "";
      const values: { name: string; value: number }[] = [];
      do {
        const name = item.getItemText();
        values.push({
          name,
          value: item.getItemValue() as number
        });
        if (title.length) title += " - ";
        title += name;
      } while ((item = item.getParentItem()));
      document.title = title;

      //トラッカーに通知
      try {
        const AnalyticsUA = (global as NodeJS.Global&{AnalyticsUA:string})["AnalyticsUA"];
        // eslint-disable-next-line no-undef
        gtag("config", AnalyticsUA, {
          page_title: title,
          page_path: "/?p=" + id
        });
      } catch (e) {// empty
      }
    });

    const userModule = manager.getModule(UserModule);

    let first = true;
    routerModule.addEventListener("goLocation", params => {
      //ページの更新や戻る/進むボタンの処理
      const id = parseInt(params["p"] || "1");
      infoTreeView.loadTree(id);
      infoContentsView.loadPage(id);
    });

    userModule.addEventListener("loginUser", () => {
      //二回目以降のログインでコンテンツの更新
      if (!first) {
        const params = routerModule.getLocationParams();
        const id = parseInt(params["p"] || "1");
        //コンテンツの強制更新
        infoTreeView.loadTree(id, true);
        infoContentsView.loadPage(id, true);
      } else first = false;
    });

    routerModule.goLocation();

    // infoTreeView.addEventListener("selectPage", id => {
    //   infoContentsView.loadPage(id);
    // });
  }
}
