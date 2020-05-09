import * as JWF from "@jswf/core";
import "./DatabaseView.scss";
import { getManager } from "..";
import { BaseModule } from "../Manager/BaseModule";
import { Manager } from "../Manager/Manager";
import { SettingView, SettingModule } from "../Setting/SettingModule";

interface DatabaseInfo {
  connect: boolean;
  database: string;
  size: number;
  server: string;
}
interface DATABASE_CONFIG {
  REMOTEDB_HOST: string;
  REMOTEDB_PORT: number;
  REMOTEDB_DATABASE: string;
  REMOTEDB_USER: number;
  REMOTEDB_PASSWORD?: string;
}
export class DatabaseModule extends BaseModule {
  public getInfo(): Promise<DatabaseInfo> {
    const adapter = this.getAdapter();
    return adapter.exec("RemoteDB.getInfo");
  }
  public getConfig(): Promise<DATABASE_CONFIG> {
    const adapter = this.getAdapter();
    return adapter.exec("RemoteDB.getConfig");
  }
  public setConfig(config: DATABASE_CONFIG) {
    const adapter = this.getAdapter();
    return adapter.exec("RemoteDB.setConfig", config);
  }
}

export class DatabaseView extends SettingView {
  private statusView: JWF.BaseView;
  private databaseModule: DatabaseModule;
  public constructor(manager: Manager) {
    super(manager);

    //DB操作モジュールの読み出し
    const databaseModule = manager.getModule(DatabaseModule);
    this.databaseModule = databaseModule;

    //DB設定入力フォーム
    const form = new JWF.TableFormView();
    form.setAutoSize(true);
    form.addItem([
      { name: "REMOTEDB_HOST", label: "アドレス", type: "string", value: "" },
      { name: "REMOTEDB_PORT", label: "ポート", type: "number", value: "" },
      {
        name: "REMOTEDB_DATABASE",
        label: "データベース",
        type: "string",
        value: ""
      },
      { name: "REMOTEDB_USER", label: "ユーザID", type: "string", value: "" },
      {
        name: "REMOTEDB_PASSWORD",
        label: "パスワード",
        type: "password",
        value: ""
      },
      {
        name: "submit",
        label: "設定",
        type: "submit",
        events: {
          //設定イベントに対する処理
          click: () => {
            const params = (form.getParams() as unknown) as DATABASE_CONFIG;
            databaseModule.setConfig(params).then(() => {
              this.loadStatus();
            });
          }
        }
      }
    ]);
    this.addChild(form, "top");

    //DB設定情報の取得
    databaseModule.getConfig().then((config: DATABASE_CONFIG) => {
      if (config) {
        form.setParams(config as never);
      }
    });

    //DB情報の表示
    const status = new JWF.BaseView();
    this.statusView = status;
    status.setAutoSize(true);
    this.addChild(status, "top");
    status.setJwfStyle("DatabaseView");

    this.loadStatus();
  }
  public loadStatus() {
    const client = this.statusView.getClient();
    this.databaseModule.getInfo().then((info: DatabaseInfo) => {
      if (client.childNodes.length) client.removeChild(client.childNodes[0]);

      const table = document.createElement("table");
      let row;
      row = table.insertRow();
      row.insertCell().innerText = "接続状態";
      row.insertCell().innerText = info && info.connect ? "接続中" : "未接続";

      if (info) {
        row = table.insertRow();
        row.insertCell().innerText = "データベース";
        row.insertCell().innerText = info.database || "";

        row = table.insertRow();
        row.insertCell().innerText = "サイズ";
        row.insertCell().innerText = info.size
          ? String(Math.floor(info.size / 1024)).replace(
              /(\d)(?=(\d\d\d)+(?!\d))/g,
              "$1,"
            ) + " KB"
          : "";

        row = table.insertRow();
        row.insertCell().innerText = "サーバ情報";
        row.insertCell().innerText = info.server || "";
      }
      client.appendChild(table);
      this.layout();
    });
  }
}

const settingModule = getManager().getModule(SettingModule);
settingModule.addSetting("システム/データベース設定", DatabaseView);
