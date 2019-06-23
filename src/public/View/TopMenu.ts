import * as JWF from "javascript-window-framework";

import "./scss/TopMenu.scss";
import { UserInfo, UserModule } from "../modules/UserModule";
import { AppManager } from "../AppManager";
import { LoginWindow } from "./User/LoginWindow";
import { SettingWindow } from "./Setting/SettingWindow";
import { ParamsModule } from "../modules/ParamsModule";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LogoImage = require("./images/sorakumo_logo.svg");
export class TopMenu extends JWF.Window {
  public constructor(manager: AppManager) {
    super();
    this.setJwfStyle("TopMenu");
    this.setHeight(80);
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

    const userModule = manager.getModule(UserModule);
    userModule.addEventListener("loginUser", (info: UserInfo) => {
        userNode.textContent = info?info.name:"GUEST";
    });

    const paramsModule = manager.getModule(ParamsModule);
    paramsModule.getGlobalParam("BASIC_DATA").then((e)=>{
      if(e){
        const params = e as {logo:string,title:string};
        if(params.logo)
          titleLogo.src = "?cmd=download&id="+params.logo;
        //if(params.title)
        //  titleNode.innerText = params.title;
      }
    })
  }
}
