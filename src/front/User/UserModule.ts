import { BaseModule, ModuleMap } from "../Manager/BaseModule";
import { AppManager } from "../Manager/FrontManager";


export interface UserInfo {
  no: number;
  type: string;
  id: string;
  name: string;
  admin: boolean;
}

export interface CustomMap extends ModuleMap {
  loginUser: [UserInfo];
  updateUser: [{no:number}];
}

/**
 *ユーザデータ管理用モジュール
 *
 * @export
 * @class UserModule
 * @extends {BaseModule<CustomMap>}
 */
export class UserModule extends BaseModule<CustomMap> {
  private userInfo?: UserInfo;

  public constructor(manager: AppManager) {
    super(manager);
    const adapter = this.getAdapter();
    const value = sessionStorage.getItem(adapter.getKeyName() + "UserInfo");
    if (value) {
      this.userInfo = JSON.parse(value);
    }
  }
  public getUserInfo() {
    return this.userInfo;
  }
  public isAdmin() {
    const userInfo = this.userInfo;
    return userInfo && userInfo.admin;
  }
  /**
   *セッションログイン処理
   *
   * @returns
   * @memberof AppManager
   */
  public async request() {
    const adapter = this.getAdapter();
    //ユーザ情報の要求
    const user = (await adapter.exec("Users.request")) as UserInfo;
    if (user) {
      this.userInfo = user;
    }
    this.callEvent("loginUser", user);
    return user;
  }
  public async login(userId: string, userPass: string, local: boolean, keep: boolean) {
    const adapter = this.getAdapter();
    const user = (await adapter.exec(
      "Users.login",
      userId,
      userPass,
      local,
      keep
    )) as UserInfo;
    if (user) {
      this.userInfo = user;
      sessionStorage.setItem(
        adapter.getKeyName() + "UserInfo",
        JSON.stringify(user)
      );
    }
    this.callEvent("loginUser", user);
    return user;
  }
  public async logout() {
    const adapter = this.getAdapter();
    const user = (await adapter.exec("Users.logout")) as UserInfo;
    this.callEvent("loginUser", user);
    return user;
  }
  public async setUser(
    no: number,
    userId: string,
    userName: string,
    userPass: string,
    local?: boolean
  ) {
    const adapter = this.getAdapter();
    const info = await adapter.exec(
      "Users.setUser",
      no,
      userId,
      userName,
      userPass,
      local
    );
    this.callEvent("updateUser", info);

    //暫定管理者なら再ログイン
    if (!this.userInfo || this.userInfo.no === 0) {
      this.request();
    }
    return info;
  }
  public delUser(userNo: number, local: boolean) {
    const adapter = this.getAdapter();
    return (adapter.exec("Users.delUser", userNo, local) as Promise<
      boolean | null
    >).then(result => {
      this.callEvent("updateUser", { no: userNo });
      return result;
    });
  }
  public getUsers(local: boolean) {
    const adapter = this.getAdapter();
    return adapter.exec("Users.getUsers", local) as Promise<UserInfo[]>;
  }
}
