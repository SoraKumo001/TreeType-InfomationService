import * as amf from "active-module-framework";
import { Users } from "./UsersModule";
import { RemoteDB } from "./RemoteDBModule";
import express = require("express");

export interface FileInfo {
  id: number;
  parent: number;
  kind: number;
  name: string;
  size: number;
  date: string | null;
  files_date: string | null;
  childs?: FileInfo[];
}
export interface FileData {
  id: number;
  kind: number;
  name: string;
  sise: number;
  date: Date;
  value: string;
}

export class Files extends amf.Module {
  public async onCreateModule(): Promise<boolean> {
    //データベースの初期化
    const remoteDB = await this.getModule(RemoteDB);
    //ユーザモジュールの初期化を優先するために空呼び出し
    await this.getModule(Users);
    if (remoteDB) {
      remoteDB.addEventListener("connect", async () => {
        if (!(await remoteDB.isTable("files"))) {
          remoteDB.run(
            `create table files(files_id SERIAL PRIMARY KEY,files_parent INTEGER references files(files_id),files_kind INTEGER,users_no INTEGER references users(users_no),files_name TEXT,files_date TIMESTAMP with time zone,files_byte BYTEA,UNIQUE(files_parent,files_name));
            insert into files values(default,null,0,null,'[ROOT]',now(),null)`
          );
        }
      });
    }
    this.addCommand(
      "download",
      (req: express.Request, res: express.Response) => {
        const fileId = req.query.id;
        if (fileId) this.downloadFile(res, fileId);
      }
    );
    return true;
  }
  public async getFileId(parentId: number, path: string) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;

    const dirs = path.replace(/(^\/)|(\/$)/g, "").split("/");
    let pid = parentId;
    let id: number | null = null;
    for (const name of dirs) {
      const result = await remoteDB.get(
        "select files_id from files where files_parent=$1 and files_name=$2",
        pid,
        name
      );
      if (!result) return null;
      id = result["files_id"] as number;
      pid = id;
    }
    return id;
  }
  public async getFileInfo(fileId: number) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;

    return remoteDB.get(
      "select files_name,files_kind,octet_length(files_byte),files_date from files where files_id=$1",
      fileId
    );
  }

  public async getFile(fileId: number) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;

    return (await remoteDB.get(
      "select files_id as id,files_kind as kind,files_name as name,octet_length(files_byte) as size,files_date as date,encode(files_byte, 'base64') as value from files where files_id=$1 and files_kind=1",
      fileId
    )) as FileData | null;
  }
  public async createDir(parentId: number, path: string, userNo: number = 1) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return 0;

    const dirs = path.replace(/(^\/)|(\/$)/g, "").split("/");
    let pid = parentId;
    let id: number | null = 0;
    let i, length;
    for (i = 0, length = dirs.length; i < length; i++) {
      const name = dirs[i];
      id = await this.getFileId(pid, name);
      if (id === null) break;
      const file = await this.getFileInfo(id);
      if (file === null) break;
      if (file["files_kind"] != 0) return 0;
      pid = id;
    }
    if (id) return id;
    id = pid;
    for (; i < length; i++) {
      const name = dirs[i];
      id = (await remoteDB.get2(
        "insert into files values(default,$1,0,$2,$3,now(),null) on conflict do nothing returning files_id",
        id,
        userNo,
        name
      )) as number;
      if (!id) return 0;
    }
    return id;
  }
  public async setFileName(fileId: number, name: string) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;
    return remoteDB.run(
      "update files set files_name=$1 where files_id=$2",
      name,
      fileId
    );
  }
  public async getChildList(dirId: number) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;
    const result = (await remoteDB.all(
      "select files_id as id from files where files_parent=$1",
      dirId
    )) as { id: number }[] | null;
    if (!result) return null;
    const values: number[] = [];
    for (const r of result) {
      values.push(r.id);
    }
    return values;
  }
  public async deleteFile(fileId: number | number[]) {
    //パラメータが配列だった場合は複数削除
    if (Array.isArray(fileId)) {
      for (const id of fileId) {
        if (!this.deleteFile(id)) return false;
      }
      return true;
    }
    //単一削除処理
    if (fileId <= 1) return false;
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;

    //配下のオブジェクトを削除
    const childs = await this.getChildList(fileId);
    if (childs) {
      for (const child of childs) {
        await this.deleteFile(child);
      }
    }
    //ファイル削除
    const result = remoteDB.run("delete from files where files_id=$1", fileId);
    return result;
  }

  public async getFileList(parentId: number) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;

    return (await remoteDB.all(
      `select files_id as id,files_parent as parent,files_kind as kind,files_name as name,files_date as date,octet_length(files_byte) as size
			from files where files_parent=$1 order by files_kind,files_name`,
      parentId
    )) as FileInfo[] | null;
  }
  public async getDirList() {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;

    const dirInfos = (await remoteDB.all(
      `select files_id as id,files_parent as parent ,files_kind as kind,files_name as name,files_date as date,octet_length(files_byte) as size
			from files where files_kind=0 order by files_name`
    )) as FileInfo[] | null;
    const hash = new Map<number, FileInfo>();

    if (dirInfos) {
      for (const dir of dirInfos) {
        dir.childs = [];
        hash.set(dir.id, dir);
      }
      for (const dir of hash.values()) {
        const parent = dir.parent as number;
        if (parent > 0) {
          const p = hash.get(parent);
          if (p && p.childs) p.childs.push(dir);
        }
      }
    }

    return hash.get(1) as FileInfo;
  }
  public async getDirId(parentId: number, path: string) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;

    const dirs = path.replace(/(^\/)|(\/$)/g, "").split("/");
    let id = parentId;
    for (const name of dirs) {
      const result = (await remoteDB.get2(
        "select files_id from files where files_parent=$1 and files_name=$2",
        id,
        name
      )) as number;
      if (!result) return null;
      id = result;
    }
    return id;
  }
  public async uploadFile(
    parentId: number,
    userNo: number,
    name: string,
    buffer: Buffer
  ) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;
    return (await remoteDB.get(
      `insert into files values(default,$1,1,$2,$3,now(),$4) ON CONFLICT (files_parent,files_name)
      DO UPDATE SET files_name=$3,files_date=now(),files_byte=$4 returning files_id as id,octet_length(files_byte) as size`,
      parentId,
      userNo,
      name,
      buffer
    )) as { id: number; size: number } | null;
  }
  public async downloadFile(res: express.Response, fileId: number) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;
    const result = await remoteDB.get(
      "select files_name as name,octet_length(files_byte) as size,files_date as date,files_byte  as value from files where files_id=$1 and files_kind=1",
      fileId
    );
    let httpDisposition = "inline;";
    if (result) {
      const fileName = result.name as string;
      let ext = fileName.split(".").pop();
      let contentType = "application/octet-stream;";
      if (ext) {
        switch (ext.toLowerCase()) {
          case "txt":
            contentType = "text/plain";
            break;
          case "html":
            contentType = "text/html";
            break;
          case "png":
            contentType = "image/png";
            break;
          case "svg":
            contentType = "image/svg+xml";
            break;
          case "jpeg":
          case "jpg":
            contentType = "image/jpeg";
            break;
          case "gif":
            contentType = "image/gif";
            break;
          default:
            httpDisposition = "attachment;";
            break;
        }
      }
      res.contentType(contentType);
      res.header("Content-length", (result.size as number).toString());
      res.header("Last-Modified", (result.date as Date).toUTCString());
      res.header(
        "Content-Disposition",
        `${httpDisposition} filename*=utf-8'jp'${encodeURI(fileName)}`
      );
      res.end(result.value);
    } else {
      res.status(404);
      res.end("notfound");
    }

    return result;
  }
  public async setFile(pid: number, name: string, date: Date, value: string) {
    const remoteDB = await this.getModule(RemoteDB);
    if (!remoteDB || !remoteDB.isConnect()) return null;
    return remoteDB.get2(
      "insert into files values(default,$1,1,$2,$3,$4,decode($5,'base64')) returning files_id",
      pid,
      1,
      name,
      date,
      value
    );
  }
  public isAdmin() {
    const users = this.getSessionModule(Users);
    return users.isAdmin();
  }
  public async JS_createDir(parentId: number, path: string) {
    if (!this.isAdmin()) return null;
    const users = this.getSessionModule(Users);
    return this.createDir(parentId, path, users.getRemoteNo());
  }
  public async JS_setFileName(fileId: number, name: string) {
    if (!this.isAdmin()) return null;
    return this.setFileName(fileId, name);
  }
  public async JS_deleteFile(fileIds: number | number[]) {
    if (!this.isAdmin()) return null;
    return this.deleteFile(fileIds);
  }
  public async JS_getFileList(parentId: number) {
    if (!this.isAdmin()) return null;
    return this.getFileList(parentId);
  }
  public async JS_getDirList() {
    if (!this.isAdmin()) return null;
    return this.getDirList();
  }
  public async JS_getDirId(parentId: number, name: string) {
    if (!this.isAdmin()) return null;
    return this.getDirId(parentId, name);
  }

  public async JS_uploadFile(parentId: number, name: string) {
    if (!this.isAdmin()) return null;
    const users = this.getSessionModule(Users);
    const code = users.getRemoteNo();
    if (code === 0) return null;
    const buffer = this.getSession().getBuffer();
    if (buffer) return this.uploadFile(parentId, code, name, buffer);
  }
}
