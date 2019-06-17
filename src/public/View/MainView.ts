import * as JWF from "javascript-window-framework";
import { TopMenu } from "./TopMenu";
import { AppManager } from "../AppManager";
import { InfoTreeView } from "./Contents/InfoTreeView";
import { MainContents, ContentsModule } from "../modules/ContentsModule";
import { InfoContentsView } from "./Contents/InfoContentsView";
import { RouterModule } from "../modules/RouterModule";

export interface ContentsArea extends HTMLDivElement {
  update: (value: MainContents) => void;
}

export class MainView extends JWF.Window {
  contentsModule: ContentsModule;
  routerModule: RouterModule;
  constructor(manager: AppManager) {
    super({ overlap: true });
    this.setMaximize(true);

    this.addChild(new TopMenu(manager), "bottom");

    const splitter = new JWF.Splitter();
    this.addChild(splitter, "client");
    splitter.setSplitterPos(250);

    const infoTreeView = new InfoTreeView(manager);
    const infoContentsView = new InfoContentsView(manager);
    splitter.addChild(0, infoTreeView, "client");
    splitter.addChild(1, infoContentsView, "client");

    const contentsModule = manager.getModule(ContentsModule);
    this.contentsModule = contentsModule;
    const routerModule = manager.getModule(RouterModule);
    this.routerModule = routerModule;

    contentsModule.addEventListener("selectPage", id => {
      this.routerModule.setLocationParams({ p: id });
    });

    routerModule.addEventListener("goLocation", params => {
      const id = params["p"];
      if (id) {
        contentsModule.selectPage(parseInt(id));
      }
    });

    routerModule.goLocation();

    // infoTreeView.addEventListener("selectPage", id => {
    //   infoContentsView.loadPage(id);
    // });
  }
}
