import * as JWF from "javascript-window-framework";

import "./TopMenu.scss";
import { UserInfo, UserModule } from "../User/UserModule";
import { LoginWindow } from "../User/LoginWindow";
import { SettingWindow } from "../Setting/SettingWindow";
import { ParamsModule } from "../Manager/ParamsModule";
import { AppManager } from "../Manager/FrontManager";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LogoImage = require("../images/sorakumo_logo.svg");
export class TopMenu extends JWF.BaseView {
  public constructor(manager: AppManager) {
    super();
    this.setJwfStyle("TopMenu");
    this.setHeight(80);
    const client = this.getClient();

    const titleLogo = document.createElement("img");
    client.appendChild(titleLogo);

    const titleNode = document.createElement("div");
    client.appendChild(titleNode);

    const optionNode = document.createElement("div");
    client.appendChild(optionNode);
    optionNode.dataset.type = "option";

    const settingNode = document.createElement("div");
    optionNode.appendChild(settingNode);
    settingNode.textContent = "設定";
    settingNode.addEventListener("click", () => {
      new SettingWindow(manager);
    });

    const userNode = document.createElement("div");
    optionNode.appendChild(userNode);
    userNode.addEventListener("click", () => {
      new LoginWindow(manager);
    });

    const userModule = manager.getModule(UserModule);
    userModule.addEventListener("loginUser", (info: UserInfo) => {
      userNode.textContent = info ? info.name : "GUEST";
    });

    const paramsModule = manager.getModule(ParamsModule);
    paramsModule.getGlobalParam("BASIC_DATA").then(e => {
      if (e) {
        const params = e as { logo: string; title: string };
        if (params.logo) titleLogo.src = "?cmd=download&id=" + params.logo;
        else titleLogo.src = LogoImage;
      }
    });
    paramsModule.addEventListener("updateGlobalParam", (name, value) => {
      if (name === "BASIC_DATA") {
        const params = value as { logo: string; title: string };
        if (params.logo) titleLogo.src = "?cmd=download&id=" + params.logo;
        else titleLogo.src = LogoImage;
      }
    });
  }
}
