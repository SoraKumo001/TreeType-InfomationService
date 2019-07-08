/**
 *コンテンツインポート用UI
 *
 */

import * as JWF from "javascript-window-framework";
import { AppManager } from "../../AppManager";
import { ContentsModule } from "../../modules/ContentsModule";
import "./scss/ContentsImportWindow.scss";
export class ContentsImportWindow extends JWF.FrameWindow {
  public constructor(manager: AppManager, pid: number) {
    super();
    this.setJwfStyle("ContentsImportWindow");
    const client = this.getClient();
    this.setSize(300, 200);
    this.setPos();
    client.innerHTML = `<div name="msg">ファイルをドロップすると開始</div>
    <select name='mode'><option value='0'>上書き<option value='1'>子階層</option></select>`;
    const select = client.querySelector("select") as HTMLSelectElement;

    const msg = client.querySelector("[name=msg]") as HTMLDivElement;
    //ドラッグドロップの許可
    client.ondragover = function(e) {
      e.preventDefault();
    };
    client.addEventListener("drop", e => {
      if (!e.dataTransfer) return;
      e.preventDefault();

      msg.innerText = "データのインポートを開始";

      const file = e.dataTransfer.files[0];
      if (file) {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.addEventListener("load", async () => {
          const contentsModule = manager.getModule(ContentsModule);
          if (reader.result)
            if (
              await contentsModule.import(
                pid,
                parseInt(select.value),
                reader.result.toString()
              )
            ) {
              msg.textContent = "インポート完了";
              //コンテンツの再読み込み
              contentsModule.getTree();
            } else {
              msg.textContent = "インポート失敗";
            }
        });
      }
    });
  }
}
