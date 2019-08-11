import * as amf from "active-module-framework";
import { Users } from "./User/UsersModule";
import { RemoteDB } from "./RemoteDBModule";
import express = require("express");

import * as typeorm from "typeorm";
import { ExtendRepository } from "./ExtendRepository";
@typeorm.Entity()
@typeorm.Index(["parent", "name"], { unique: true })
@typeorm.Tree("materialized-path")
export class FileEntity {
  @typeorm.PrimaryGeneratedColumn()
  id!: number;
  @typeorm.Column({ default: 0 })
  kind!: number;
  @typeorm.Column()
  name!: string;
  @typeorm.Column({ default: () => "localtimestamp" })
  date!: Date;
  @typeorm.Column({ type: "bytea", nullable: true })
  value?: Buffer;

  @typeorm.Column({ nullable: true })
  parentId?: number;

  @typeorm.TreeParent()
  parent?: FileEntity;
  @typeorm.TreeChildren()
  children?: FileEntity[];

  size!: number;
}
export interface FileData {
  id: number;
  pid: number;
  kind: number;
  name: string;
  size: number;
  date: Date;
  value: string;
}
export interface FileInfo {
  id: number;
  parentId: number;
  kind: number;
  name: string;
  size: number;
  date: string | null;
  childs?: FileInfo[];
}
export class Files extends amf.Module {
  repository?: ExtendRepository<FileEntity>;
  public async onCreateModule(): Promise<boolean> {
    //データベースの初期化
    const remoteDB = await this.getModule(RemoteDB);
    remoteDB.addEntity(FileEntity);

    remoteDB.addEventListener(
      "connect",
      async (): Promise<void> => {
        const repository = new ExtendRepository(
          remoteDB.getConnection() as typeorm.Connection,
          FileEntity
        );
        this.repository = repository;
        if (!(await repository.findOne(1)))
          await repository.save({ kind: 0, name: "[ROOT]" });
      }
    );
    remoteDB.addEventListener("disconnect", () => {
      this.repository = undefined;
    });

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
    const repository = this.repository;
    if (!repository) return null;

    const dirs = path.replace(/(^\/)|(\/$)/g, "").split("/");
    let pid = parentId;
    let id: number | null = null;
    for (const name of dirs) {
      const result = await repository.findOne({
        where: { parentId: pid, name },
        select: ["id"]
      });
      if (!result) return null;
      id = result.id as number;
      pid = id;
    }
    return id;
  }

  public async getFile(fileId: number) {
    const repository = this.repository;
    if (!repository) return null;

    return repository.findOne(fileId);
  }
  public async createDir(parentId: number, path: string) {
    const repository = this.repository;
    if (!repository) return 0;

    const dirs = path.replace(/(^\/)|(\/$)/g, "").split("/");
    let pid = parentId;
    let id: number | null = 0;
    let i, length;
    for (i = 0, length = dirs.length; i < length; i++) {
      const name = dirs[i];
      id = await this.getFileId(pid, name);
      if (id === null) break;
      const file = await this.getFileInfo(id);
      if (!file) break;
      if (file.kind != 0) return 0;
      pid = id;
    }
    if (id) return id;
    id = pid;
    for (; i < length; i++) {
      const name = dirs[i];
      const file2: {
        id?: number;
        parentId?: number;
        name: string;
      } = { parentId: id, name };
      await repository.save(file2);
      id = file2.id as number;
    }
    return id;
  }
  public async setFileName(fileId: number, name: string) {
    const repository = this.repository;
    if (!repository) return null;
    return repository.update(fileId, { name });
  }
  public async getChildList(dirId: number) {
    const repository = this.repository;
    if (!repository) return null;
    const result = await repository.find({
      select: ["id"],
      where: { parent: { id: dirId } }
    });
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
      const promise = [];
      for (const id of fileId) {
        promise.push(this.deleteFile(id));
      }
      await Promise.all(promise);
      return true;
    }
    //単一削除処理
    if (fileId <= 1) return false;
    const repository = this.repository;
    if (!repository) return null;

    //配下のオブジェクトを削除
    const childs = await this.getChildList(fileId);
    if (childs) {
      const promise = [];
      for (const child of childs) {
        promise.push(this.deleteFile(child));
      }
      await Promise.all(promise);
    }
    //ファイル削除
    return repository.delete(fileId);
  }
  public async getFileInfo(fileId: number) {
    const repository = this.repository;
    if (!repository) return null;

    return repository.findOne({
      select: ["id", "kind", "name", "date"],
      where: { id: fileId }
    });
  }

  public async getFileList(parentId: number) {
    const repository = this.repository;
    if (!repository) return null;

    const result = await repository
      .createQueryBuilder()
      .select("id,kind,name,date,octet_length(value) as size")
      .where({ parentId })
      .orderBy("kind,name")
      .getRawMany();
    return result;
  }
  public async getDirList() {
    const repository = this.repository;
    if (!repository) return null;

    const dirInfos = (await repository
      .createQueryBuilder()
      .select(
        `id,"parentId",kind,name,date,octet_length(value) as size`
      )
      .where("kind=0")
      .orderBy("name")
      .getRawMany()) as FileInfo[];
    const hash = new Map<number, FileInfo>();

    if (dirInfos) {
      for (const dir of dirInfos) {
        dir.childs = [];
        hash.set(dir.id, dir);
      }
      for (const dir of hash.values()) {
        const parentId = dir.parentId as number;
        if (parentId > 0) {
          const p = hash.get(parentId);
          if (p && p.childs) p.childs.push(dir);
        }
      }
    }

    return hash.get(1) as FileInfo;
  }
  public async clear() {
    const repository = this.repository;
    if (!repository) return null;
    await repository.clear();
    await repository.query("select setval ($1, 1, false)", [
      repository.metadata.tableName + "_id_seq"
    ]);
    await repository.save({ kind: 0, name: "[ROOT]" });
  }
  public async getDirId(parentId: number, path: string) {
    const repository = this.repository;
    if (!repository) return null;

    const dirs = path.replace(/(^\/)|(\/$)/g, "").split("/");
    let id = parentId;
    for (const name of dirs) {
      const result = await repository.findOne({
        select: ["id"],
        where: { parentId: id, name }
      });
      if (!result) return null;
      id = result.id;
    }
    return id;
  }
  public async uploadFile(parentId: number, name: string, buffer: Buffer) {
    const repository = this.repository;
    if (!repository) return null;
    const check = await repository.findOne({
      select: ["id"],
      where: { parentId: parentId, name }
    });
    const file = {
      id: check ? check.id : undefined,
      parent: { id: parentId } as FileEntity,
      name,
      date: () => "default",
      kind: 1,
      value: buffer
    };
    await repository.save((file as unknown) as FileEntity);
    return file;
  }
  public async downloadFile(res: express.Response, fileId: number) {
    const repository = this.repository;
    if (!repository) return null;
    const result = (await repository
      .createQueryBuilder()
      .select("name,octet_length(value) as size,date,value")
      .where("id=:id and kind=1", { id: fileId })
      .getRawOne()) as {
      name: string;
      size: number;
      date: Date;
      value: Buffer;
    };
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
      res.end(result.value, "binary");
    } else {
      res.status(404);
      res.end("notfound");
    }

    return result;
  }
  public async setFile(pid: number, name: string, date: Date, value: Buffer) {
    const repository = this.repository;
    if (!repository) return null;

    let id: number | undefined;
    const result = await repository.findOne({ parentId: pid, name });
    if (result) id = result.id;
    const file = {
      id,
      kind: 1,
      name,
      date,
      parent: { id: pid },
      value
    };
    await repository.save(file);
    return (<FileEntity>file).id;
  }
  public isAdmin() {
    const users = this.getSessionModule(Users);
    return users.isAdmin();
  }
  public async JS_createDir(parentId: number, path: string) {
    if (!this.isAdmin()) return null;
    return this.createDir(parentId, path);
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
    const buffer = this.getSession().getBuffer();
    if (buffer) return this.uploadFile(parentId, name, buffer);
  }
}
