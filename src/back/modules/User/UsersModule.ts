import * as crypto from "crypto";
import * as amf from "@rfcs/core";
import * as typeorm from "typeorm";
import { RemoteDB } from "../RemoteDBModule";

import { UserEntity } from "./UserEntity";

function getSHA256(v1: string, v2?: string): string {
  return crypto
    .createHash("sha256")
    .update(v1 + (v2 ? v2 : ""))
    .digest("hex");
}
export interface UserInfo {
  no: number;
  type: string;
  id: string;
  name: string;
  admin: boolean;
}

export class Users extends amf.Module {
  private userRepository?: typeorm.Repository<UserEntity>;
  private userInfo?: UserInfo;

  public async onCreateModule(): Promise<boolean> {
    this.getLocalDB().addEntity(UserEntity);

    //データベースの初期化
    const remoteDB = await this.getModule(RemoteDB);
    remoteDB.addEntity(UserEntity);

    if (remoteDB) {
      remoteDB.addEventListener("connect", async () => {
        const userRepository = remoteDB.getRepository(UserEntity);
        this.userRepository = userRepository;
        if ((await userRepository.count()) === 0)
          userRepository.insert({ id: "admin", name: "リモート管理者" });
      });
    }
    return true;
  }
  public async onCreatedModule(): Promise<boolean> {
    return true;
  }

  public async getLocalCount() {
    const userModel = this.getLocalDB().getRepository(UserEntity);
    const count = userModel.count({ where: { enable: true } });
    return count;
  }

  public async onStartSession() {
    const count = await this.getLocalCount();
    let user: UserInfo | null = null;

    if (count === 0) {
      //ローカルユーザが存在しなければ管理者に設定
      user = {
        no: 0,
        type: "local",
        id: "Admin",
        name: "暫定管理者",
        admin: true,
      };
    } else {
      //セッションユーザの確認
      user = this.getSessionItem("user") as UserInfo;
      if (user) {
        if (user.no === 0) user = null;
        //暫定管理者なら情報をクリア
        //ユーザナンバーからユーザ情報を再設定
        else {
          user = await this.getUserEntityFromNo(user.no, user.type === "local");
        }
      } else {
        //セッションに情報が無かった場合、グローバルログインを確認
        user = this.getGlobalItem("user") as UserInfo;
        if (user) this.setSessionItem("user", user);
      }
    }
    //ユーザが存在しなければゲスト扱い
    if (!user) user = this.logout();
    this.userInfo = user;

    this.output("ユーザ: %s", JSON.stringify(this.userInfo));
  }
  public async isLogin(userId: string, userPass: string, local: boolean) {
    if (local) {
      //ローカルユーザ
      const userModel = this.getLocalDB().getRepository(UserEntity);
      const result = await userModel.findOne({
        where: {
          id: userId,
          password: getSHA256(userPass),
        }
      });
      if (!result) return false;
    } else {
      //リモートユーザ
      const userRepository = this.userRepository;
      if (!userRepository) return false;

      const result = await userRepository.findOne({
        where: {
          id: userId,
          password: getSHA256(userPass),
          enable: true,
        }
      });
      if (!result) return false;
    }
    return true;
  }
  public async getUserEntityFromNo(
    no: number,
    local: boolean
  ): Promise<UserInfo | null> {
    let userEntity: UserEntity | null;
    if (local) {
      const userModel = this.getLocalDB().getRepository(UserEntity);
      userEntity = await userModel.findOne({ where: { no } });
    } else {
      //リモートユーザ
      const userRepository = this.userRepository;
      if (!userRepository) return null;
      userEntity = await userRepository.findOne({ where: { no } });
    }
    if (!userEntity) return null;
    return <UserInfo>{
      no: userEntity.no,
      id: userEntity.id,
      admin: true,
      name: userEntity.name,
      type: local ? "local" : "remote",
    };
  }
  public getRemoteNo() {
    const userInfo = this.userInfo;
    if (!userInfo) return 0;
    if (userInfo.type === "local") {
      return 1;
    }
    return userInfo.no;
  }
  public async getUserInfo(userId: string, local: boolean) {
    let userEntity: UserEntity | null;
    if (local) {
      const userRepository = this.getLocalDB().getRepository(UserEntity);
      userEntity = await userRepository.findOne({ where: { id: userId } });
    } else {
      //リモートユーザ
      const userRepository = this.userRepository;
      if (!userRepository) return null;
      userEntity = await userRepository.findOne({ where: { id: userId } });
    }
    if (!userEntity) return null;

    return <UserInfo>{
      no: userEntity.no,
      id: userEntity.id,
      admin: true,
      name: userEntity.name,
      type: local ? "local" : "remote",
    };
  }
  public isAdmin() {
    return this.userInfo ? this.userInfo.admin : false;
  }
  @amf.EXPORT
  public async request() {
    return this.userInfo;
  }
  @amf.EXPORT
  public logout() {
    const user = {
      no: -1,
      id: "GUEST",
      name: "GUEST",
      type: "normal",
      admin: false,
    };
    this.setGlobalItem("user", null);
    this.setSessionItem("user", null);
    this.userInfo = user;
    return user;
  }
  @amf.EXPORT
  public async login(
    userId: string,
    userPass: string,
    local: boolean,
    keep?: boolean
  ): Promise<false | UserInfo | null> {
    if (await this.isLogin(userId, userPass, local)) {
      const result = await this.getUserInfo(userId, local);
      if (result) {
        if (keep) this.setGlobalItem("user", result);
        this.setSessionItem("user", result);
        this.userInfo = result;
      }
      return result;
    }
    return false;
  }
  @amf.EXPORT
  public async setUser(
    userNo: number,
    userId: string,
    userName: string,
    userPass: string,
    local: boolean
  ) {
    if (!this.isAdmin()) return false;
    if (local) {
      const userRepository = this.getLocalDB().getRepository(UserEntity);
      //ユーザが存在するか確認
      const userEntity = await userRepository.findOne({ where: { no: userNo } });
      if (userNo && !userEntity) return false;
      if (userNo == 0 && userPass === "") return false;
      if (userName === "") userName = userId;
      const pass = userPass ? getSHA256(userPass) : userEntity!.password;
      let result;
      try {
        if (userNo == 0) {
          result = await userRepository.insert({
            id: userId,
            password: pass,
            name: userName,
          });
        } else {
          //作成したシリアル番号を返す
          result = await userRepository.update(userNo, {
            id: userId,
            password: pass,
            name: userName,
          });
        }
      } catch {
        result = null;
      }
      return result;
    } else {
      //リモートユーザ
      const userRepository = this.userRepository;
      if (!userRepository) return false;
      //ユーザが存在するか確認
      const userEntity = await userRepository.findOne({ where: { no: userNo } });
      if (userName === "") userName = userId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;
      try {
        if (userEntity) {
          result = await userRepository.update(userNo, {
            password: userPass ? userEntity.password : getSHA256(userPass),
            name: userName,
          });
        } else {
          result = await userRepository.insert({
            id: userId,
            password: getSHA256(userPass),
            name: userName,
          });
        }
        if (result) {
          result.type = result.type ? "local" : "remote";
        }
      } catch {
        result = null;
      }
      return result;
    }
  }
  @amf.EXPORT
  public async delUser(userNo: number, local: boolean) {
    if (!this.isAdmin()) return false;
    if (local) {
      const userModel = this.getLocalDB().getRepository(UserEntity);
      const result = await userModel.delete(userNo);
      return !!result;
    } else {
      //リモートユーザ
      const userRepository = this.userRepository;
      if (!userRepository) return false;

      const result = await userRepository.delete(userNo);
      return !!result;
    }
  }
  @amf.EXPORT
  public async getUsers(local: boolean): Promise<UserInfo[] | null> {
    if (!this.isAdmin()) return null;
    let userEntitys: UserEntity[];
    if (local) {
      const userRepository = this.getLocalDB().getRepository(UserEntity);
      //ユーザが存在するか確認
      userEntitys = await userRepository.find({ order: { no: "ASC" } });
    } else {
      //リモートユーザ
      const userRepository = this.userRepository;
      if (!userRepository) return null;
      //ユーザが存在するか確認
      userEntitys = await userRepository.find({ order: { no: "ASC" } });
    }
    const userInfos: UserInfo[] = [];
    for (const userEntity of userEntitys) {
      userInfos.push({
        no: userEntity.no,
        id: userEntity.id,
        admin: true,
        name: userEntity.name,
        type: local ? "local" : "remote",
      });
    }
    return userInfos;
  }
}
