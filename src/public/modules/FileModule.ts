import { AppModule, ModuleMap } from "../AppModule";

export interface FileInfo {
  id: number;
  parent: number;
  kind: number;
  name: string;
  size: number;
  date: string;
  files_date: string | null;
  childs: FileInfo[];
}

export interface CustomMap extends ModuleMap {
  update_dir: [number, number]; //parentId,dirId
  delete_file: [number | number[]]; //fileId
  update_file: [number]; //fileId
  upload_file: [number]; //parentId
}

export class FileModule extends AppModule<CustomMap> {
  public getDirs() {
    const adapter = this.getAdapter();
    return adapter.exec("Files.getDirList") as Promise<FileInfo>;
  }
  public async createDir(parentId: number, name: string) {
    const adapter = this.getAdapter();
    const id = (await adapter.exec(
      "Files.createDir",
      parentId,
      name
    )) as number;
    if (id) {
      this.callEvent("update_dir", parentId, id);
    }
    return id;
  }
  public async deleteFile(fileId: number | number[]) {
    const adapter = this.getAdapter();
    if (await adapter.exec("Files.deleteFile", fileId)) {
      this.callEvent("delete_file", fileId);
      return true;
    }
    return false;
  }
  public async setFileName(fileId: number, name: string) {
    const adapter = this.getAdapter();
    if (await adapter.exec("Files.setFileName", fileId, name)) {
      this.callEvent("update_file", fileId);
      return true;
    }
    return false;
  }
  public getFileList(parentId: number) {
    const adapter = this.getAdapter();
    return adapter.exec("Files.getFileList", parentId) as Promise<
      FileInfo[] | null
    >;
  }
  public async uploadFile(parentId: number, files: FileList) {
    const adapter = this.getAdapter();
    const count = files.length;
    for (let i = 0; i < count; i++) {
      const file = files.item(i);
      if (file) {
        await adapter.upload(file, "Files.uploadFile", parentId, file.name);
        this.callEvent("upload_file", parentId);
      }
    }
  }
}
