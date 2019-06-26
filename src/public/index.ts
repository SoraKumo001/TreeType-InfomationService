import { AppManager } from "./AppManager";
import { MainView } from "./View/MainView";
import "./index.scss";
import { UserModule, UserInfo } from "./modules/UserModule";
import { UserEditWindow } from "./View/User/UserEditWindow";

const appManager = new AppManager();
//ユーザが存在しなかった場合の初期化処理
const userModule = appManager.getModule(UserModule);
userModule.addEventListener("loginUser", (userInfo: UserInfo) => {
  if (userInfo) {
    //暫定ユーザーならローカル管理者の編集画面へ
    if (userInfo.no === 0 && userInfo.admin) {
      new UserEditWindow(appManager, 0, "admin", "ローカル管理者", "", true);
    }
  }
});
//初回認証
userModule.request();
//ページ読み込み時に実行する処理を設定
addEventListener("DOMContentLoaded", () => {
  new MainView(appManager);
});
