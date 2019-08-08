import * as JWF from "javascript-window-framework";
import { UserModule } from "./UserModule";
import { AppManager } from "../Manager/AppManager";
const LOGIN_ID_SVG = require("./images/login_id.svg");
const LOGIN_PASS_SVG = require("./images/login_pass.svg");
/**
 *ユーザ編集用クラス
 *
 * @export
 * @class UserEditView
 * @extends {JWF.FrameWindow}
 */
export class UserEditWindow extends JWF.FrameWindow {
  private textUserID?: JWF.TextBox;
  private textUserPass?: JWF.TextBox;
  public constructor(manager: AppManager, no?: number, id?: string, name?: string, pass?: string, local?: boolean) {
    super();

    const userModule = manager.getModule(UserModule);

    this.setTitle("ユーザの追加");
    this.setPos();
    this.setPadding(10, 10, 10, 10);
    const textUserID = new JWF.TextBox({
      label: "ユーザID",
      text: id || "",
      image: LOGIN_ID_SVG
    });
    this.addChild(textUserID, "top");
    textUserID.setMargin(0, 0, 0, 10);
    this.textUserID = textUserID;
    const textUserName = new JWF.TextBox({
      label: "ユーザ名(省略時ユーザID)",
      text: name || "",
      image: LOGIN_ID_SVG
    });
    this.addChild(textUserName, "top");
    textUserName.setMargin(0, 0, 0, 10);
    const textUserPass = new JWF.TextBox({
      label: "パスワード(入力無しは無変更)",
      type: "password",
      text: pass || "",
      image: LOGIN_PASS_SVG
    });
    textUserPass.setMargin(0, 10, 0, 10);
    this.addChild(textUserPass, "top");
    this.textUserPass = textUserPass;
    const button = new JWF.Button(no ? "変更" : "追加");
    button.setMargin(0, 10, 0, 5);
    button.setAlign("center");
    this.addChild(button, "top");
    const msgLabel = new JWF.Label("ユーザの追加");
    msgLabel.setAlign("center");
    this.addChild(msgLabel, "top");
    button.addEventListener("buttonClick", async () => {
      msgLabel.setText("設定中");

      if (userModule) {
        const info = await userModule.setUser(no ? no : 0, textUserID.getText(), textUserName.getText(), textUserPass.getText(), local);
        if (info) {
          msgLabel.setText("設定成功");
          await JWF.Sleep(1000);
          this.close();
        }
        else {
          msgLabel.setText("設定失敗");
        }
      }
    });
  }
  public getUserId() {
    if (!this.textUserID)
      return null;
    return this.textUserID.getText();
  }
  public getUserPass() {
    if (!this.textUserPass)
      return null;
    return this.textUserPass.getText();
  }
}
