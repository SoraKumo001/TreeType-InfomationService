import * as JWF from "javascript-window-framework";
import { FileModule, FileInfo } from "../../modules/FileModule";
import { FileEditWindow } from "./FileEditWindow";
import { ModuleMap } from "../../AppModule";
import { WINDOW_EVENT_MAP } from "javascript-window-framework";
const IMAGE_FILE = require("./images/file.svg");
const IMAGE_FOLDER = require("./images/folder.svg");

export interface CustomMap extends WINDOW_EVENT_MAP {
  selectDir: [number ]; //parameter
}

/**
 *
 *
 * @class FileView
 * @extends {JWF.Window}
 */
export class FileView extends JWF.Window {
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

  fileModule: FileModule;
  fileList: JWF.ListView;
  parentId: number;
  imageFile: HTMLImageElement;
  imageFolder: HTMLImageElement;

  public constructor(fileModule: FileModule) {
    super();
    this.fileModule = fileModule;
    this.parentId = 0;

    const imageFile = document.createElement("img");
    imageFile.src = IMAGE_FILE;
    this.imageFile = imageFile;
    const imageFolder = document.createElement("img");
    imageFolder.src = IMAGE_FOLDER;
    this.imageFolder = imageFolder;

    //ファイルリストの設定
    const fileList = new JWF.ListView();
    this.fileList = fileList;
    this.addChild(fileList, "client");
    fileList.addHeader([
      ["*", 40],
      ["ファイル名", 128],
      ["サイズ", 80],
      "更新"
    ]);
    const fileClinet = fileList.getClient();
    fileList.addEventListener("itemDblClick", e => {
      const file = fileList.getItemValue(e.itemIndex) as FileInfo;
      const id = file.id;
      if (file.kind === 0) this.callEvent("selectDir", id);
      else window.open("?cmd=download&id=" + id);
    });
    //ドラッグドロップの許可
    fileClinet.ondragover = function(e) {
      e.preventDefault();
    };
    fileClinet.addEventListener("drop", e => {
      const parentId = this.parentId;
      if (e.dataTransfer && parentId)
        fileModule.uploadFile(parentId, e.dataTransfer.files);
    });
    //パネルの作成
    const treePanel = new JWF.Panel();
    this.addChild(treePanel, "bottom");
    let button;
    button = new JWF.Button("更新");
    treePanel.addChild(button, "left");
    button.addEventListener("buttonClick", () => {
      this.loadFiles();
    });
    button = new JWF.Button("アップロード");
    treePanel.addChild(button, "left");
    button.addEventListener("buttonClick", () => {
      this.uploadFile();
    });
    button = new JWF.Button("削除");
    treePanel.addChild(button, "left");
    button.addEventListener("buttonClick", () => {
      const values = this.fileList.getSelectValues() as FileInfo[];
      if (values.length) {
        const messageBox = new JWF.MessageBox("削除", "削除しますか？", [
          ["OK", true],
          ["Cancel", false]
        ]);
        this.addFrameChild(messageBox);
        messageBox.addEventListener("buttonClick", e => {
          if (e) {
            const ids: number[] = [];
            for (const file of values) {
              ids.push(file.id);
            }
            this.fileModule.deleteFile(ids);
          }
        });
        messageBox.setPos();
      }
    });
    button = new JWF.Button("編集");
    treePanel.addChild(button, "left");
    button.addEventListener("buttonClick", () => {
      const values = this.fileList.getSelectValues() as FileInfo[];
      if (values.length) {
        const editWindow = new FileEditWindow({
          fileModule: this.fileModule,
          fileId: values[0].id,
          name: values[0].name
        });
        this.addFrameChild(editWindow);
        editWindow.setPos();
      }
    });
    fileModule.addEventListener("delete_file", fileId => {
      const values = this.fileList.getItemValues() as FileInfo[];
      let flag = false;
      for (const file of values) {
        if (file.id === fileId) {
          flag = true;
        }
      }
      if (flag) this.loadFiles();
    });
    fileModule.addEventListener("update_dir", (parentId, dirId) => {
      if (this.parentId === parentId) this.loadFiles();
    });
    fileModule.addEventListener("upload_file", parentId => {
      if (this.parentId === parentId) this.loadFiles();
    });
    fileModule.addEventListener("update_file", fileId => {
      const values = this.fileList.getItemValues() as FileInfo[];
      let flag = false;
      for (const file of values) {
        if (file.id === fileId) {
          flag = true;
        }
      }
      if (flag) this.loadFiles();
    });
  }
  public async loadFiles(parentId?: number) {
    if (parentId) this.parentId = parentId;
    else parentId = this.parentId;
    const fileList = this.fileList;
    fileList.clearItem();
    const fileModule = this.fileModule;
    if (parentId) {
      const files = await fileModule.getFileList(parentId);
      if (files) {
        for (const file of files) {
          const icon = (file.kind
            ? this.imageFile
            : this.imageFolder
          ).cloneNode() as HTMLElement;
          fileList.addItem(
            [icon, file.name, file.size, new Date(file.date).toLocaleString()],
            file
          );
        }
      }
    }
  }
  uploadFile() {
    let input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    const that = this;
    input.addEventListener("change", function(e) {
      const files = this.files;
      const parentId = that.parentId;
      if (parentId && files) that.fileModule.uploadFile(parentId, files);
    });
    input.click();
  }
}
