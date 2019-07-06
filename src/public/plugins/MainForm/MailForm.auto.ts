import "./MailForm.scss";
import * as JWF from "javascript-window-framework";
export interface MailParams {
  subject?: string;
  body?: string;
}
export class MailForm extends JWF.FrameWindow {
  private itemMap: {
    [key: string]: HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement;
  };
  private adapter: JWF.Adapter;
  public constructor(adapter: JWF.Adapter) {
    super();
    this.adapter = adapter;
    this.setJwfStyle("MainForm");
    this.setTitle("メッセージ送信フォーム");
    const client = this.getClient();
    client.innerHTML = `<div>
      <div>
        <div>
          <div>メールアドレス</div><input size="1" name='from'>
        </div>
        <div>
          <div>タイトル</div><input size="1" name='subject'>
        </div>
      </div>
      <button name='submit'>送信</button>
     </div>
    <textarea name='body'></textarea>`;
    const items = client.querySelectorAll("input,button,textarea");
    const itemMap: {
      [key: string]: HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement;
    } = {};
    for (let i = 0, length = items.length; i < length; i++) {
      const node = items[i] as
        | HTMLButtonElement
        | HTMLInputElement
        | HTMLTextAreaElement;
      itemMap[node.name] = node;
    }
    this.itemMap = itemMap;
    this.itemMap["submit"].addEventListener(
      "click",
      (): void => {
        this.send();
      }
    );
    this.active(true);
  }
  public send(): void {
    const itemMap = this.itemMap;
    const fromNode = itemMap["from"];
    const subjectNode = itemMap["subject"];
    const bodyNode = itemMap["body"];
    const adapter = this.adapter;
    if (adapter) {
      //メッセージボックスの作成と位置調整
      const msgBox = new JWF.MessageBox("メッセージ", "メールの送信中");
      this.addChild(msgBox);
      msgBox.setPos();
      //本文の作成
      const body = `送信者: ${fromNode.value}\n\n${bodyNode.value}`;
      //メールの送信
      adapter.exec("Mail.send", { subject: subjectNode.value, body }).then(
        (flag: unknown): void => {
          //結果の表示
          msgBox.setText(flag ? "送信成功" : "送信失敗");
        }
      );
    }
  }
}

interface Window{
  createMailForm:()=>void;
}
declare var window: Window;

window.createMailForm = ()=>{
  const adapter = new JWF.Adapter("https://apps.croud.jp/gmail_sender/","https://apps.croud.jp/gmail_sender/");
  const mailForm = new MailForm(adapter);
  mailForm.setPos();
}
