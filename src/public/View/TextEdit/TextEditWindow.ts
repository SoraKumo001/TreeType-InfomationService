import * as JWF from "javascript-window-framework";
import "./scss/TextEditWindow.scss";
import { EditableView } from "./EditableView";
import { TextArea } from "javascript-window-framework";
import { text } from "body-parser";

/**
 *
 *
 * @export
 * @class TextEditWindow
 * @extends {JWF.FrameWindow}
 */
export class TextEditWindow extends JWF.FrameWindow {
  htmlTimer: JWF.TimerProc;
  textTimer: JWF.TimerProc;
  editableView:EditableView;
  textArea:TextArea;

  constructor() {
    super();
    this.htmlTimer = new JWF.TimerProc(() => {
      textArea.setText(editableView.getHtml());
    }, 500);
    this.textTimer = new JWF.TimerProc(() => {
      editableView.setHtml(textArea.getText());
    }, 500);

    this.setJwfStyle("TextEditWindow");
    this.setSize(800, 600);

    const splitter = new JWF.Splitter();
    this.addChild(splitter, "client");
    splitter.setSplitterPos(600);
    this.setPos();

    const editableView = new EditableView();
    this.editableView = editableView;
    splitter.addChild(0, editableView, "client");
    editableView.addEventListener("updateText", () => {
      this.htmlTimer.call();
    });

    const textArea = new JWF.TextArea();
    this.textArea = textArea;
    splitter.addChild(1, textArea, "client");
    textArea.addEventListener("updateText", () => {
      this.textTimer.call();
    });
  }
  public setHtml(value:string){
    this.textArea.setText(value);
    this.editableView.setHtml(value);
  }
  public getHtml(){
    return this.textArea.getText();
  }
}
