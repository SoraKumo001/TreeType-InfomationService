import * as JWF from "javascript-window-framework";

export class TextInputWindow extends JWF.FrameWindow {
  private msg:JWF.Label
  private text:JWF.TextBox;
  public constructor(params: {
    title?: string;
    message?: string;
    label?: string;
    value?: string;
    event?: (value: string) => void;
  }) {
    super();
    this.setSize(300, 180);
    this.setPos();
    this.setPadding(10);
    if (params.title) this.setTitle(params.title);
    const msg = new JWF.Label(params.label || "");
    this.msg = msg;
    this.addChild(msg, "top");

    const text = new JWF.TextBox({
      label: params.value || "",
      text: params.value || ""
    });
    this.text = text;
    text.addEventListener("enter", () => {
      if (params.event) params.event(text.getText());
    });
    this.addChild(text, "top");

    const okButton = new JWF.Button("OK");
    this.addChild(okButton, "top");
    okButton.addEventListener("buttonClick", async () => {
      if (params.event) params.event(text.getText());
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
  public setMessage(message:string):void{
    this.msg.setText(message);
  }
  public getValue(){
    return this.text.getText();
  }
}
