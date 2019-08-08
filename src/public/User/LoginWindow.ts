import * as JWF from "javascript-window-framework";
import { UserModule } from "./UserModule";
import { AppManager } from "../Manager/AppManager";

const LOGIN_ID_SVG = require("./images/login_id.svg");
const LOGIN_PASS_SVG = require("./images/login_pass.svg");

/**
 *ログインウインドウ用クラス
 *
 * @export
 * @class LoginWindow
 * @extends {JWF.FrameWindow}
 */
export class LoginWindow extends JWF.FrameWindow {
  public constructor(
    manager: AppManager,
    userId?: string,
    userPass?: string,
    local?: boolean
  ) {
    super();
    //ウインドウ初期状態の設定
    this.setSize(300, 300);
    this.setTitle("ログイン");
    this.setPadding(10, 10, 10, 10);

    const userModule = manager.getModule(UserModule);
    const userInfo = userModule.getUserInfo();
    if(userInfo){
      if(!userId)
        userId  = userInfo.id;
      if(local === undefined){
        local = userInfo.type==="local";
      }
    }


    const textUserID = new JWF.TextBox({
      label: "ユーザID",
      image: LOGIN_ID_SVG
    });
    this.addChild(textUserID, "top");
    textUserID.setMargin(0, 0, 0, 10);
    //if (userId) textUserID.setText(userId);
    const textUserPass = new JWF.TextBox({
      label: "パスワード",
      type: "password",
      image: LOGIN_PASS_SVG
    });
    textUserPass.setMargin(0, 10, 0, 10);
    this.addChild(textUserPass, "top");
    if (userPass) textUserPass.setText(userPass);
    const localCheck = new JWF.CheckBox({
      text: "ローカルログイン",
      checked: true
    });
    this.addChild(localCheck, "top");
    if (local) localCheck.setCheck(local);
    const keepCheck = new JWF.CheckBox({ text: "ログイン情報の保存" });
    this.addChild(keepCheck, "top");
    const buttonLogin = new JWF.Button("ログイン");
    buttonLogin.setMargin(0, 10, 0, 5);
    buttonLogin.setAlign("center");
    this.addChild(buttonLogin, "top");
    const buttonLogout = new JWF.Button("ログアウト");
    buttonLogout.setAlign("center");
    this.addChild(buttonLogout, "top");
    const msgLabel = new JWF.Label("ログイン入力待ち");
    msgLabel.setAlign("center");
    this.addChild(msgLabel, "top");
    this.setPos();
    this.active();

    // this.addEventListener("closed", () => {
    //   resolv();
    // });
    buttonLogin.addEventListener("buttonClick", async () => {
      msgLabel.setText("ログイン中");

      const info = await userModule.login(
        textUserID.getText(),
        textUserPass.getText(),
        localCheck.isCheck(),
        keepCheck.isCheck()
      );
      if (info) {
        msgLabel.setText("認証成功");
        await JWF.Sleep(500);
        this.close();
      } else msgLabel.setText("ログイン失敗");
    });
    buttonLogout.addEventListener("buttonClick", async () => {
      msgLabel.setText("ログアウト中");
      const info = userModule.logout();
      if (info) {
        msgLabel.setText("ログアウト完了");
        await JWF.Sleep(500);
        this.close();
      } else msgLabel.setText("ログアウト失敗");
    });
  }
}
