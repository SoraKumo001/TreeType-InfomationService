import { AppModule, ModuleMap } from "../AppModule";

export interface UserInfo {
  no: number;
  type: string;
  id: string;
  name: string;
  admin: boolean;
}

export interface CustomMap extends ModuleMap {
  user_login: [UserInfo];
  user_update: [UserInfo];
}

export class UserModule extends AppModule {
  userInfo?: UserInfo;

  public addEventListener<K extends keyof CustomMap>(
    name: K,
    proc: (...params: CustomMap[K]) => unknown
  ): void {
    super.addEventListener(name, proc);
  }
  public callEvent<K extends keyof CustomMap>(
    name: K,
    ...params: CustomMap[K]
  ): void {
    super.callEvent(name, ...params);
  }
  public getUserInfo() {
    return this.userInfo;
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
    this.callEvent("user_login", user);
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
    }
    this.callEvent("user_login", user);
    return user;
  }
  async logout() {
    const adapter = this.getAdapter();
    const user = (await adapter.exec("Users.logout")) as UserInfo;
    this.callEvent("user_login", user);
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
    this.callEvent("user_update", info);

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
      this.callEvent("user_update", { no: userNo } as UserInfo);
      return result;
    });
  }
  getUsers(local: boolean) {
    const adapter = this.getAdapter();
    return adapter.exec("Users.getUsers", local) as Promise<UserInfo[]>;
  }
}
