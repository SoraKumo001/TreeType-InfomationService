import { SettingView, SettingModule } from "../SettingModule";
import { InfoModule } from "../InfoModule";
import "./ModuleView.scss";
import { AppManager, appManager } from "../../Manager/FrontManager";

export class ModuleView extends SettingView {
  public constructor(manager: AppManager) {
    super(manager);
    this.setJwfStyle("ModuleView");

    const client = this.getClient();
    const infoModule = manager.getModule(InfoModule);
    infoModule.getInfo().then(infoModule => {
      while (client.childNodes.length) client.removeChild(client.childNodes[0]);

      if (!infoModule) return;

      for (const info of infoModule) {
        const table = document.createElement("table");
        client.appendChild(table);
        const p = [
          ["クラス名", info.className],
          ["名称", info.name],
          ["バージョン", info.version],
          ["制作者", info.author],
          ["概要", info.info]
        ];

        for (let j = 0; j < p.length; j++) {
          const row = table.insertRow();
          row.insertCell().innerText = p[j][0].toString();
          row.insertCell().innerText = p[j][1].toString();
        }
      }
    });
  }
}

const settingModule = appManager.getModule(SettingModule);
settingModule.addSetting("システム/モジュール確認",ModuleView);