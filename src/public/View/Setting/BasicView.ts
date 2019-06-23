import * as JWF from "javascript-window-framework";

import { SettingView } from "../../modules/SettingModule";
import { AppManager } from "../../AppManager";
import { ParamsModule } from "../../modules/ParamsModule";
import { FileWindow } from "../FileWindow/FileWindow";
import { MessageBox } from "javascript-window-framework";
const LogoImage = require("../images/sorakumo_logo.svg");
export class BasicView extends SettingView {
  private paramsModule: ParamsModule;
  private form: JWF.TableFormView;
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
      { name: "analytics", label: "アナリティクス", type: "string", value: "" },
      {
        name: "logo",
        label: "ロゴイメージ",
        type: "image",
        image_width: "200px",
        image: LogoImage,
        events: {
          click: () => {
            new MessageBox("ロゴの選択", "動作を指定してください", [
              ["ロゴのクリア", 0],
              ["ファイル選択", 1]
            ]).addEventListener("buttonClick", e => {
              if (e) {
                const fileWindow = new FileWindow(manager);
                this.addFrameChild(fileWindow);
                fileWindow.setPos();
                fileWindow.addEventListener("enterFile", param => {
                  param.enter = true;
                  const img = form.getItem("logo") as HTMLImageElement & {
                    value: string;
                  };
                  img.src = "?cmd=download&id=" + param.fileInfo.id;
                  img.value = param.fileInfo.id.toString();
                });
              }else{
                const img = form.getItem("logo") as HTMLImageElement & {
                    value: string;
                  };
                  img.src = LogoImage
                  img.value = "";
              }
            });
          }
        }
      },
      {
        label: "設定",
        type: "submit",
        events: {
          //設定イベントに対する処理
          click: async () => {
            const params = form.getParams() as unknown;
            const msg = new JWF.MessageBox("設定保存", "送信中");
            if (await paramsModule.setGlobalParam("BASIC_DATA", params)) {
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
    const params = (await this.paramsModule.getGlobalParam("BASIC_DATA")) as {
      [key: string]: string | number | boolean;
    };
    if (params) {
      form.setParams(params);
      if (params.logo) {
        const img = form.getItem("logo") as HTMLImageElement & {
          value: string;
        };
        img.src = "?cmd=download&id=" + params.logo;
      }
    }
  }
}
