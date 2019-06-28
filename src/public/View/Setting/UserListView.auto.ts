import * as JWF from "javascript-window-framework";
import { SettingView, SettingModule } from "../../modules/SettingModule";
import { AppManager, appManager } from "../../AppManager";
import { UserModule } from "../../modules/UserModule";
import { UserEditWindow } from "../User/UserEditWindow";

export interface UserInfo {
  no: number;
  type: string;
  id: string;
  name: string;
  admin: boolean;
}

/**
 *ローカルユーザ管理用クラス
 *
 * @export
 * @class UserListWindow
 * @extends {JWF.Window}
 */
export class UserListView extends SettingView {
  private listView: JWF.ListView;
  private userModule: UserModule;
  private local: boolean;
  public constructor(manager: AppManager) {
    super(manager);
    this.local = true;
    this.userModule = manager.getModule(UserModule);

    const panel = new JWF.Panel();
    this.addChild(panel, "top");

    const remoteSelect = new JWF.SelectBox({
      name: "local",
      options: [
        { label: "ローカル", value: true },
        { label: "リモート", value: false }
      ],
      event: {
        change: () => {
          this.local = remoteSelect.getValue() == "true";
          this.getUsers();
        }
      }
    });
    panel.addChild(remoteSelect, "left");

    const addButton = new JWF.Button("追加");
    panel.addChild(addButton, "left");
    addButton.addEventListener("buttonClick", async () => {
      const userEditWindow = new UserEditWindow(
        this.getManager(),
        0,
        undefined,
        undefined,
        undefined,
        this.local
      );
      userEditWindow.setPos();
      // const flag = await userEditWindow.setUser();
      // if (flag) {
      //   this.getUsers();
      // }
    });
    const delButton = new JWF.Button("削除");
    panel.addChild(delButton, "left");
    delButton.addEventListener("buttonClick", () => {
      const values = this.listView.getSelectValues();
      if (values.length) {
        const userInfo = values[0] as UserInfo;
        const messageBox = new JWF.MessageBox(
          "確認",
          `[${userInfo.name}]を削除しますか？`,
          [["OK", true], ["Cancel", false]]
        );
        messageBox.addEventListener("buttonClick", value => {
          if (value) {
            this.userModule.delUser(userInfo.no, this.local).then(result => {
              if (!result) {
                new JWF.MessageBox("エラー", `削除失敗`);
              }
            });
          }
        });
      }
    });

    const list = new JWF.ListView();
    this.addChild(list, "client");
    this.listView = list;
    list.addHeader(["NO", ["ID", 100], "NAME"]);
    list.setColumnStyles(["right"]);
    list.addEventListener("itemDblClick", async e => {
      const user = list.getItemValue(e.itemIndex) as UserInfo;
      new UserEditWindow(
        manager,
        user.no,
        user.id,
        user.name,
        undefined,
        this.local
      );
    });

    this.userModule.addEventListener("user_update", () => {
      this.getUsers();
    });

    this.getUsers();
    this.active();
  }
  public async getUsers() {
    const listView = this.listView;
    listView.clearItem();
    const users = await this.userModule.getUsers(this.local);

    if (users) {
      for (const user of users) {
        listView.addItem([user.no, user.id, user.name], user);
      }
    }
    return users;
  }
}

const settingModule = appManager.getModule(SettingModule);
settingModule.addSetting("システム/ユーザ設定", UserListView);
