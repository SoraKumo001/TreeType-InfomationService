import { AppManager } from "./AppManager";
import { UserModule, UserInfo } from "./modules/UserModule";
import { UserEditWindow } from "./View/User/UserEditWindow";
import { MainView } from "./View/MainView";
import { SettingModule } from "./modules/SettingModule";
import { ModuleView } from "./View/Setting/ModuleView";
import { DatabaseView } from "./View/Setting/DatabaseView";
import { UserListView } from "./View/Setting/UserListView";
import { BasicView } from "./View/Setting/BasicView";
import "./index.scss";

//ページ読み込み時に実行する処理を設定
addEventListener("DOMContentLoaded", () => {
  const manager = new AppManager();
  //manager.addModule(UserModule);

  //ユーザが存在しなかった場合の初期化処理
  const userModule = manager.getModule(UserModule);
  userModule.addEventListener("loginUser", (userInfo:UserInfo) => {
    if (userInfo){
      //暫定ユーザーならローカル管理者の編集画面へ
      if (userInfo.no === 0 && userInfo.admin){
          new UserEditWindow(manager,0,"admin","ローカル管理者","",true);
      }
    }
  });

  const settingModule = manager.getModule(SettingModule);
  settingModule.addSetting("システム/モジュール確認",ModuleView);
  settingModule.addSetting("システム/データベース設定",DatabaseView);
  settingModule.addSetting("システム/ユーザ設定",UserListView);
  settingModule.addSetting("システム/基本設定",BasicView);

  //初回認証
  userModule.request();

  new MainView(manager);
  //new FileWindow(manager);
  //new TextEditWindow();

});
