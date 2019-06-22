import * as JWF from "javascript-window-framework";
import { TextEditWindow } from "../TextEditor/TextEditWindow";
import { PanelControl } from "../TextEditor/PanelControl";
import { AppManager } from "../../AppManager";
import { ContentsModule, MainContents } from "../../modules/ContentsModule";
import { FileWindow } from "../FileWindow/FileWindow";
import { FileModule } from "../../modules/FileModule";

/**
 *コンテンツ編集用ウインドウ
 *
 * @export
 * @class ContentsEditWindow
 * @extends {TextEditWindow}
 */
export class ContentsEditWindow extends TextEditWindow {
  manager: AppManager;
  contents?: MainContents;
  panel: JWF.Panel[] = [];
  contentsModule: ContentsModule;
  /**
   *Creates an instance of ContentsEditWindow.
   * @param {AppManager} manager
   * @param {number} [id]
   * @memberof ContentsEditWindow
   */
  public constructor(manager: AppManager, id?: number) {
    super();
    this.manager = manager;
    this.contentsModule = manager.getModule(ContentsModule);

    for (let i = 0; i < 2; i++) {
      const panel = new JWF.Panel();
      this.panel[i] = panel;
      this.addChild(panel, "top");
    }
    this.getEditableView().addEventListener("insertFile", param => {
      param.enter = true;
      this.insertFile(param.fileList);
    });
    this.createPanel();

    this.createControl({
      label: "FILE",
      event: () => {
        const fileWindow = new FileWindow(manager);
        this.addChild(fileWindow);
        fileWindow.setPos();
        fileWindow.addEventListener("enterFile", param => {
          param.enter = true;
          const fileInfo = param.fileInfo;
          this.insertFileContents(fileInfo.id, fileInfo.name);
        });
      }
    });
    this.foreground();
    if (id) {
      this.loadContents(id);
    }
  }
  public insertFileContents(id: number, fileName: string) {
    const ext = fileName.split(".").pop();
    let imageFlag = false;
    if (ext) {
      if (["jpg", "jpeg", "png", "svg"].indexOf(ext.toLowerCase()) >= 0)
        imageFlag = true;
    }
    const fileId = id.toString();
    if (imageFlag) {
      const img = document.createElement("img");
      img.src = `?cmd=download&id=${fileId}`;
      img.dataset.fileId = fileId;
      this.insertNode(img);
    } else {
      const link = document.createElement("a");
      link.target = "_blank";
      link.href = `?cmd=download&id=${fileId}`;
      link.dataset.fileId = fileId;
      link.innerText = fileName;
      this.insertNode(link);
    }
  }
  public async insertFile(fileList: FileList) {
    const contents = this.contents;
    if (!contents) return;
    const id = contents.id;
    const fileModule = this.manager.getModule(FileModule);
    const path = JWF.sprintf(
      "/Contents/%04d/%02d",
      Math.floor(id / 100) * 100,
      id % 100
    );
    const dirId = await fileModule.createDir(1, path);
    if (dirId) {
      const result = await fileModule.uploadFile(dirId, fileList);
      for (const r of result) {
        this.insertFileContents(r.id,r.file.name);
      }
    }
  }
  insertNode(node: HTMLElement) {
    this.editableView.insertNode(node);
  }
  createPanel() {
    //パネル作成
    const that = this;
    let target = this.panel[0].getClient();
    PanelControl.createControl(target, {
      label: "保存",
      event: () => {
        this.updateContents();
      }
    });
    PanelControl.createControl(target, { label: "確認", event: () => {} });
    PanelControl.createControl(target, {
      name: "stat",
      type: "check",
      label: "表示"
    });
    PanelControl.createControl(target, {
      name: "date",
      type: "input",
      label: "日付",
      size: 10,
      value: this.getDateString(new Date()),
      event: function(this: HTMLInputElement) {
        const calendar = new JWF.CalendarView({ frame: true });
        that.addFrameChild(calendar);
        calendar.setPos();
        calendar.addEventListener("date", e => {
          this.value = that.getDateString(e.date);
        });
      }
    });

    PanelControl.createControl(target, {
      name: "time",
      type: "input",
      label: "時間",
      value: this.getTimeString(new Date()),
      size: 10
    });
    PanelControl.createControl(target, {
      label: "削除",
      event: async () => {
        const contents = this.contents;
        if (contents) {
          if (await this.contentsModule.deleteContents(contents.id))
            this.close();
        }
      }
    });

    target = this.panel[1].getClient();
    PanelControl.createControl(target, {
      name: "type",
      type: "select",
      label: "",
      option: [{ label: "PAGE" }, { label: "TEXT" }, { label: "UPDATE" }],
      event: () => {}
    });
    PanelControl.createControl(target, { type: "text", label: "題名" });
    PanelControl.createControl(target, {
      name: "title_type",
      type: "select",
      label: "",
      option: [
        { label: "無", value: "0" },
        { label: "大", value: "1" },
        { label: "中", value: "2" },
        { label: "小", value: "3" }
      ],
      event: () => {}
    });
    PanelControl.createControl(target, {
      name: "title",
      type: "input",
      label: "",
      size: 40
    });
  }
  /**
   *dateを文字列に変換
   *
   * @private
   * @param {Date} date
   * @returns {string}
   * @memberof ContentsEditWindow
   */
  private getDateString(date: Date): string {
    return JWF.sprintf(
      "%d-%02d-%02d",
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
  }
  /**
   *dateを文字列に変換
   *
   * @private
   * @param {Date} date
   * @returns {string}
   * @memberof ContentsEditWindow
   */
  private getTimeString(date: Date): string {
    return JWF.sprintf(
      "%02d:%02d:%02d",
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    );
  }
  /**
   *コンテンツの読み出し
   *
   * @param {number} id
   * @memberof ContentsEditWindow
   */
  public async loadContents(id: number) {
    const contents = await this.contentsModule.getContents(id);
    if (contents) {
      const client = this.getClient();
      this.contents = contents;
      PanelControl.setControlValue(client, "stat", contents.stat);
      PanelControl.setControlValue(client, "type", contents.type);
      PanelControl.setControlValue(client, "title", contents.title);
      PanelControl.setControlValue(client, "title_type", contents.title_type);
      var date = new Date(contents["date"]);
      PanelControl.setControlValue(client, "date", this.getDateString(date));
      PanelControl.setControlValue(client, "time", this.getTimeString(date));
      this.setHtml(contents.value);
    }
  }
  /**
   *コンテンツの更新
   *
   * @returns
   * @memberof ContentsEditWindow
   */
  public async updateContents() {
    const contents = this.contents;
    if (!contents) return;
    const client = this.getClient();
    const date = new Date(
      (PanelControl.getControlValue(client, "date") || "") +
        " " +
        (PanelControl.getControlValue(client, "time") || "")
    );
    const newContents: MainContents = {
      id: contents.id,
      pid: contents.pid,
      stat: PanelControl.getControlValue(client, "stat") ? 1 : 0,
      type: (PanelControl.getControlValue(client, "type") as string) || "",
      title: (PanelControl.getControlValue(client, "title") as string) || "",
      title_type: parseInt(
        (PanelControl.getControlValue(client, "title_type") as string) || "0"
      ),
      date,
      value: this.getHtml()
    };
    this.contentsModule.updateContents(newContents);
  }
}