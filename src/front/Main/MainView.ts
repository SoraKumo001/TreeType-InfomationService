import * as JWF from "@jswf/core";
import { TopMenu } from "./TopMenu";
import { InfoTreeView } from "../Contents/InfoTreeView";
import { ContentsModule } from "../Contents/ContentsModule";
import { InfoContentsView } from "../Contents/InfoContentsView";
import { TreeItem } from "@jswf/core";
import "analytics-gtag";
import { Manager, RouterModule, UserModule } from "@jswf/manager";

export class MainView extends JWF.BaseView {
  private routerModule: RouterModule;
  private infoTreeView: InfoTreeView;
  public constructor(manager: Manager) {
    super({ overlap: true });
    this.setMaximize(true);
    this.setJwfStyle("MainView");

    const splitter = new JWF.Splitter();
    this.addChild(splitter, "client");
    splitter.setSplitterPos(400, "ew");
    splitter.setOverlay(true, 600);

    splitter.addChild(0, new TopMenu(manager), "bottom");

    const infoTreeView = new InfoTreeView(manager);
    this.infoTreeView = infoTreeView;
    const infoContentsView = new InfoContentsView(manager);
    splitter.addChild(0, infoTreeView, "client");
    splitter.addChild(1, infoContentsView, "client");
    const contentsModule = manager.getModule(ContentsModule);
    const routerModule = manager.getModule(RouterModule);
    this.routerModule = routerModule;

    contentsModule.addEventListener("selectContents", (id, tree) => {
      this.routerModule.setLocationParams({ uuid: id }, !tree);
    });
    contentsModule.addEventListener("selectPage", uuid => {
      const title = this.selectPage(uuid);
      if (!title) return;

      //トラッカーに通知
      try {
        const AnalyticsUA = (global as NodeJS.Global & {
          AnalyticsUA: string;
        })["AnalyticsUA"];
        // eslint-disable-next-line no-undef
        const page_location = `${location.protocol}://${location.host}${location.pathname}`;
        gtag("config", AnalyticsUA, {
          page_title: title,
          page_location,
          page_path: "/?uuid=" + uuid
        });
      } catch (e) {
        // empty
      }
    });

    const userModule = manager.getModule(UserModule);

    let first = true;
    routerModule.addEventListener("goLocation", params => {
      //ページの更新や戻る/進むボタンの処理
      const uuid = params["uuid"] || "";
      infoTreeView.loadTree(uuid).then(e => {
        if (e) {
          this.selectPage(uuid);
        }
      });
      infoContentsView.loadPage(uuid);
    });

    userModule.addEventListener("loginUser", () => {
      //二回目以降のログインでコンテンツの更新
      if (!first) {
        const params = routerModule.getLocationParams();
        const uuid = params["uuid"] || "";
        //コンテンツの強制更新
        infoTreeView.loadTree(uuid, true);
        infoContentsView.loadPage(uuid, true);
      } else first = false;
    });

    routerModule.goLocation();
  }
  public selectPage(uuid: string) {
    let item: TreeItem | null = this.infoTreeView.findItemFromValue(uuid);
    if (!item) return "";
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
    return title;
  }
}
