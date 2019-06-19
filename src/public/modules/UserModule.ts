import { AppModule, ModuleMap } from "../AppModule";
import { AppManager } from "../AppManager";

export interface UserInfo {
  no: number;
  type: string;
  id: string;
  name: string;
  admin: boolean;
}

export interface CustomMap extends ModuleMap {
  loginUser: [UserInfo];
  updateUser: [UserInfo];
}

export class UserModule extends AppModule<CustomMap> {
  userInfo?: UserInfo;

  constructor(manager: AppManager) {
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
  async request() {
    const adapter = this.getAdapter();
    //ユーザ情報の要求
    const user = (await adapter.exec("Users.request")) as UserInfo;
    if (user) {
      this.userInfo = user;
    }
    this.callEvent("loginUser", user);
    return user;
  }
  async login(userId: string, userPass: string, local: boolean, keep: boolean) {
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
  async logout() {
    const adapter = this.getAdapter();
    const user = (await adapter.exec("Users.logout")) as UserInfo;
    this.callEvent("loginUser", user);
    return user;
  }
  async setUser(
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
  delUser(userNo: number, local: boolean) {
    const adapter = this.getAdapter();
    return (adapter.exec("Users.delUser", userNo, local) as Promise<
      boolean | null
    >).then(result => {
      this.callEvent("updateUser", { no: userNo } as UserInfo);
      return result;
    });
  }
  getUsers(local: boolean) {
    const adapter = this.getAdapter();
    return adapter.exec("Users.getUsers", local) as Promise<UserInfo[]>;
  }
}
