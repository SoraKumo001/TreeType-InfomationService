import * as JWF from "javascript-window-framework";

import "./scss/TopMenu.scss";
import { UserInfo, UserModule } from "../modules/UserModule";
import { AppManager } from "../AppManager";
import { LoginWindow } from "./User/LoginWindow";
import { SettingWindow } from "./Setting/SettingWindow";

const LogoImage = require("./images/sorakumo_logo.svg");
export class TopMenu extends JWF.Window {
  constructor(manager: AppManager) {
    super();
    this.setJwfStyle("TopMenu");
    this.setHeight(64);
    const client = this.getClient();

    const titleLogo = document.createElement("img");
    client.appendChild(titleLogo);
    titleLogo.src = LogoImage;

    const titleNode = document.createElement("div");
    client.appendChild(titleNode);
    titleNode.dataset.type = "title";
    //titleNode.textContent = "空雲リファレンス";

    const optionNode = document.createElement("div");
    client.appendChild(optionNode);
    optionNode.dataset.type = "option";

    const settingNode = document.createElement("div");
    optionNode.appendChild(settingNode);
    settingNode.textContent = "設定";
    settingNode.addEventListener("click",()=>{
      new SettingWindow(manager);
    })

    const userNode = document.createElement("div");
    optionNode.appendChild(userNode);
    userNode.addEventListener("click",()=>{
      new LoginWindow(manager);
    })

    // manager.addEventListener("title",(title:string)=>{
    //   titleNode.textContent = title
    // })
    const userModule = manager.getModule(UserModule);
    userModule.addEventListener("user_login", (info: UserInfo) => {
        userNode.textContent = info?info.name:"GUEST";
    });
  }
}
