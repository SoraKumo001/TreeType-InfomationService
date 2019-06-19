import * as JWF from "javascript-window-framework";

import { SettingView } from "../../modules/SettingModule";
import { AppManager } from "../../AppManager";
import { ParamsModule } from "../../modules/ParamsModule";
import { TableFormView } from "javascript-window-framework";
export class BasicView extends SettingView {
  paramsModule:ParamsModule
  form:TableFormView
  public constructor(manager: AppManager) {
    super(manager);
    this.setJwfStyle("BasicView");

    const paramsModule = manager.getModule(ParamsModule);
    this.paramsModule = paramsModule;

    //DB設定入力フォーム
    const form = new JWF.TableFormView();
    this.form = form;
    form.setAutoSize(true);
    form.addItem([
      { name: "url", label: "正規URL", type: "string", value: "" },
      { name: "title", label: "タイトル", type: "string", value: "" },
      {
        name: "info",
        label: "サイトの説明",
        type: "string",
        value: ""
      },
      {
        label: "設定",
        type: "submit",
        events: {
          //設定イベントに対する処理
          click: async () => {
            const params = (form.getParams() as unknown)
            const msg = new JWF.MessageBox("設定保存","送信中");
            if(await paramsModule.setGlobal("BASIC_DATA",params)){
              msg.close();
            }else{
              msg.setText("設定エラー");
            }
          }
        }
      }
    ]);
    this.addChild(form, "client");
    this.loadSetting();
  }
  public async loadSetting(){
    const form = this.form;
    const params = await this.paramsModule.getGlobal("BASIC_DATA") as {[key: string]: string | number | boolean};
    if(params)
      form.setParams(params);
  }
}