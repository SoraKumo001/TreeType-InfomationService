import * as JWF from "javascript-window-framework";
import { TextEditWindow } from "../TextEdit/TextEditWindow";
import { PanelControl } from "../TextEdit/PanelControl";
import { AppManager } from "../../AppManager";
import { ContentsModule, MainContents } from "../../modules/ContentsModule";

/**
 *コンテンツ編集用ウインドウ
 *
 * @export
 * @class ContentsEditWindow
 * @extends {TextEditWindow}
 */
export class ContentsEditWindow extends TextEditWindow {
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
    this.contentsModule = manager.getModule(ContentsModule);

    for (let i = 0; i < 2; i++) {
      const panel = new JWF.Panel();
      this.panel[i] = panel;
      this.addChild(panel, "top");
    }

    //パネル作成
    const that = this;
    let target = this.panel[0].getClient();
    PanelControl.createControl(target, { label: "保存", event: () => {this.updateContents()} });
    PanelControl.createControl(target, { label: "確認", event: () => {} });
    PanelControl.createControl(target, {
      name: "stat",
      type: "check",
      label: "表示",
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
    this.foreground();
    if (id) {
      this.loadContents(id);
    }
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
      stat: PanelControl.getControlValue(client, "stat")?1:0,
      type: PanelControl.getControlValue(client, "type") as string|| "",
      title: PanelControl.getControlValue(client, "title") as string || "",
      title_type: parseInt(
        PanelControl.getControlValue(client, "title_type")as string || "0"
      ),
      date,
      value: this.getHtml()
    };
    this.contentsModule.updateContents(newContents);
  }
}
