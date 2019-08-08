/**
 *アドセンス設定項目追加プラグイン
 *
 */

import * as JWF from "javascript-window-framework";

import { SettingView, SettingModule } from "../../Setting/SettingModule";
import { ParamsModule } from "../../Manager/ParamsModule";
import { AppManager, appManager } from "../../Manager/AppManager";

export class AdSettingView extends SettingView {
  private paramsModule: ParamsModule;
  private form: JWF.TableFormView;
  public constructor(manager: AppManager) {
    super(manager);
    this.setJwfStyle("AdSettingView");

    const paramsModule = manager.getModule(ParamsModule);
    this.paramsModule = paramsModule;

    //DB設定入力フォーム
    const form = new JWF.TableFormView();
    this.form = form;
    form.setAutoSize(true);
    form.addItem([
      { name: "top", label: "ヘッダー", type: "textarea", value: "" ,styles:{height:"10em"}},
      { name: "bottom", label: "フッター", type: "textarea", value: "" ,styles:{height:"10em"}},
      {
        label: "設定",
        type: "submit",
        events: {
          //設定イベントに対する処理
          click: async () => {
            const params = form.getParams() as unknown;
            const msg = new JWF.MessageBox("設定保存", "送信中");
            if (await paramsModule.setGlobalParam("ADSENSE_DATA", params)) {
              msg.close();
            } else {
              msg.setText("設定エラー");
            }
          }
        }
      }
    ]);
    this.addChild(form, "client");
    this.loadSetting();
  }
  public async loadSetting() {
    const form = this.form;
    const params = (await this.paramsModule.getGlobalParam("ADSENSE_DATA")) as {
      [key: string]: string | number | boolean;
    };
    if(params)
      form.setParams(params);
  }
}

const settingModule = appManager.getModule(SettingModule);
settingModule.addSetting("Google AdSense", AdSettingView);
