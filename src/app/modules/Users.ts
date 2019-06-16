import * as crypto from "crypto";
import * as amf from "active-module-framework";
import { RemoteDB } from "./RemoteDB";

function getSHA256(v1: string, v2?: string): string {
  return crypto
    .createHash("sha256")
    .update(v1 + (v2 ? v2 : ""))
    .digest("hex");
}
export type UserInfo = {
  no: number;
  type: string;
  id: string;
  name: string;
  admin: boolean;
};

export class Users extends amf.Module {
  private userInfo?: UserInfo;

  public async onCreateModule(): Promise<boolean> {
    //データベースの初期化
    const remoteDB = await this.getModule(RemoteDB);
    if (remoteDB) {
      remoteDB.addOpenListener(async () => {
        if (!(await remoteDB.isTable("users"))) {
          remoteDB.run(
            `create table IF NOT EXISTS users(users_no SERIAL PRIMARY KEY,users_enable BOOLEAN,users_id TEXT,
          users_password TEXT,users_name TEXT,users_info JSON,UNIQUE(users_id));
          insert into users values(default,true,'admin',null,'リモート管理者','{}')
          `
          );
        }
      });
    }

    const localDB = this.getLocalDB();
    //localDB.db.run('drop table users');
    localDB.run(
      "CREATE TABLE IF NOT EXISTS users (users_no integer primary key,users_enable boolean,\
			users_id TEXT,users_password TEXT,users_name TEXT,users_info JSON,UNIQUE(users_id))"
    );
    return true;
  }

  public async getLocalCount() {
    const localDB = this.getLocalDB();
    const result = await localDB.get(
      "select count(*) as count from users where users_enable=1"
    );
    return result.count;
  }

  public async onStartSession() {
    var count = await this.getLocalCount();
    let user: UserInfo | null = null;

    if (count === 0) {
      //ローカルユーザが存在しなければ管理者に設定
      user = {
        no: 0,
        type: "local",
        id: "Admin",
        name: "暫定管理者",
        admin: true
      };
    } else {
      //セッションユーザの確認
      user = this.getSessionItem("user") as UserInfo;
      if (user) {
        if (user.no === 0) user = null;
        //暫定管理者なら情報をクリア
        //ユーザナンバーからユーザ情報を再設定
        else {
          user = await this.getUserInfoFromNo(user.no, user.type === "local");
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
      const localDB = this.getLocalDB();
      const result = await localDB.get(
        "select 0 from users where users_id=? and users_password=? and users_enable=1",
        userId,
        getSHA256(userPass)
      );
      if (!result) return false;
    } else {
      //リモートユーザ
      const remoteDB = await this.getModule(RemoteDB);
      if (!remoteDB) return false;

      const result = await remoteDB.get(
        "select 0 from users where users_id=$1 and users_password=$2 and users_enable=true",
        userId,
        getSHA256(userPass)
      );
      if (!result) return false;
    }
    return true;
  }
  public async getUserInfoFromNo(
    no: number,
    local: boolean
  ): Promise<UserInfo | null> {
    if (local) {
      const localDB = this.getLocalDB();
      var result = await localDB.get(
        "select users_no as no,users_id as id,users_name as name,'local' as type,true as admin from users where users_no=? ",
        no
      );
      if (result) return result as UserInfo;
    } else {
      //リモートユーザ
      const remoteDB = await this.getModule(RemoteDB);
      if (!remoteDB) return null;

      const result = await remoteDB.get(
        "select users_no as no,users_id as id,users_name as name,'remote' as type,true as admin from users where users_no=$1 ",
        no
      );
      if (result) return result as UserInfo;
    }
    return null;
  }
  public getRemoteNo() {
    const userInfo = this.userInfo;
    if (!userInfo) return 0;
    if (userInfo.type === "local") {
      return 1;
    }
    return userInfo.no;
  }
  async getUserInfo(userId: string, local: boolean) {
    if (local) {
      const localDB = this.getLocalDB();
      var result = await localDB.get(
        "select users_no as no,users_id as id,users_name as name,'local' as type,true as admin from users where users_id=? ",
        userId
      );
      if (result) return result as UserInfo;
    } else {
      //リモートユーザ
      const remoteDB = await this.getModule(RemoteDB);
      if (!remoteDB) return null;

      const result = await remoteDB.get(
        "select users_no as no,users_id as id,users_name as name,'remote' as type,true as admin from users where users_id=$1",
        userId
      );
      if (result) return result as UserInfo;
    }
    return null;
  }
  logout() {
    const user = {
      no: -1,
      id: "GUEST",
      name: "GUEST",
      type: "normal",
      admin: false
    };
    this.setGlobalItem("user", null);
    this.setSessionItem("user", null);
    this.userInfo = user;
    return user;
  }
  isAdmin() {
    return this.userInfo ? this.userInfo.admin : false;
  }
  async JS_request() {
    return this.userInfo;
  }
  async JS_logout() {
    return this.logout();
  }
  async JS_login(
    userId: string,
    userPass: string,
    local: boolean,
    keep?: boolean
  ) {
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
  async JS_setUser(
    userNo: number,
    userId: string,
    userName: string,
    userPass: string,
    local: boolean
  ) {
    if (!this.isAdmin()) return false;
    if (local) {
      let localDB = this.getLocalDB();
      //ユーザが存在するか確認
      var userInfo = await localDB.get(
        "select * from users where users_no=?",
        userNo
      );
      if (userNo && !userInfo) return false;
      if (userNo == 0 && userPass === "") return false;

      if (userName === "") userName = userId;
      const pass = userPass ? getSHA256(userPass) : userInfo.users_password;
      let result;
      if (userNo == 0) {
        result = await localDB.run(
          "insert into users values(null,1,?,?,?,'{}')",
          userId,
          pass,
          userName
        );
      } else {
        //作成したシリアル番号を返す
        result = await localDB.run(
          "update users set users_id=?,users_password=?,users_name=? where users_no=?",
          userId,
          pass,
          userName,
          userNo
        );
      }
      return result;
    } else {
      //リモートユーザ
      const remoteDB = await this.getModule(RemoteDB);
      if (!remoteDB) return null;

      //ユーザが存在するか確認
      const userInfo = await remoteDB.get(
        "select * from users where users_no=$1",
        userNo
      );

      let result;
      if (userInfo) {
        result = await remoteDB.run(
          "update users set users_id=$1,users_password=$2,users_name=$3 where users_no=$4",
          userId,
          !userPass ? userInfo.users_password : getSHA256(userPass),
          userName,
          userNo
        );
      } else {
        result = await remoteDB.run(
          "insert into users values(default,true,$1,$2,$3,'{}')",
          userId,
          getSHA256(userPass),
          userName
        );
      }
      return result;
    }
  }
  async JS_delUser(userNo: number, local: boolean) {
    if (!this.isAdmin()) return false;
    if (local) {
      const localDB = this.getLocalDB();
      const result = await localDB.run(
        "update users set users_name=null,users_enable=false where users_no=?",
        userNo
      );
      return result.changes > 0;
    } else {
      //リモートユーザ
      const remoteDB = await this.getModule(RemoteDB);
      if (!remoteDB) return null;

      const result = await remoteDB.run(
        "update users set users_name=null,users_enable=false where users_no=$1",
        userNo
      );
      return result;
    }
  }

  async JS_getUsers(local: boolean) {
    if (!this.isAdmin()) return false;
    if (local) {
      let localDB = this.getLocalDB();
      //ユーザが存在するか確認
      return await localDB.all(
        "select users_no as no,users_id as id,users_name as name,'local' as type,true as admin from users where users_enable order by no"
      );
    } else {
      //リモートユーザ
      const remoteDB = await this.getModule(RemoteDB);
      if (!remoteDB) return null;
      //ユーザが存在するか確認
      return await remoteDB.all(
        "select users_no as no,users_id as id,users_name as name,'remote' as type,true as admin from users where users_enable order by no"
      );
    }
  }
}
