import * as JWF from "javascript-window-framework";
import { FileModule } from "./FileModule";
/**
 *
 *
 * @class FileEditWindow
 * @extends {JWF.FrameWindow}
 */
export class FileEditWindow extends JWF.FrameWindow {
  public constructor(params: {
    fileModule: FileModule;
    parentId?: number;
    fileId?: number;
    name?: string;
  }) {
    super();
    this.setJwfStyle("FileWindow");
    this.setSize(300, 180);
    this.setPos();
    this.setPadding(10);
    this.setTitle(params.parentId ? "新規ディレクトリ作成" : "名前の変更");

    const fileModule = params.fileModule;
    const label = new JWF.Label(params.parentId ? "ディレクトリ名を入力" : "新しい名前を入力");
    this.addChild(label, "top");
    const text = new JWF.TextBox({
      label: "名前",
      text: params.name ? params.name : ""
    });

        const enter = async () => {
      if (params.parentId) {
        const id = await fileModule.createDir(params.parentId, text.getText());
        if (!id)
          label.setText("作成エラー");
        else {
          this.close();
        }
      }
      else {
        if (params.fileId) {
          if (!fileModule.setFileName(params.fileId, text.getText())) {
            label.setText("変更エラー");
          }
          else {
            this.close();
          }
        }
      }
    };

    text.addEventListener("enter", () => {
      enter();
    });
    this.addChild(text, "top");

    const okButton = new JWF.Button("OK");
    this.addChild(okButton, "top");
    okButton.addEventListener("buttonClick", async () => {
      enter();
    });
    const cancelButton = new JWF.Button("Cancel");
    this.addChild(cancelButton, "top");
    cancelButton.addEventListener("buttonClick", () => {
      this.close();
    });
    this.addEventListener("layouted", () => {
      text.focus();
    });
    this.active();
  }
}
