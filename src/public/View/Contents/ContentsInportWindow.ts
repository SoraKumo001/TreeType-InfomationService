import * as JWF from "javascript-window-framework";
import { AppManager } from "../../AppManager";
import { ContentsModule } from "../../modules/ContentsModule";
export class ContentsImportWindow extends JWF.FrameWindow {
  public constructor(manager: AppManager, pid: number) {
    super();
    const client = this.getClient();
    this.setSize(300,200);
    this.setPos();
    client.innerHTML = `<div>ファイルをドロップすると開始</div>
    <select name='mode'><option value='0'>上書き<option value='1'>子階層</option></select>`;
    const select = client.querySelector("select") as HTMLSelectElement;

    //ドラッグドロップの許可
    client.ondragover = function(e) {
      e.preventDefault();
    };
    client.addEventListener("drop", e => {
      if (!e.dataTransfer) return;
      e.preventDefault();

      const file = e.dataTransfer.files[0];
      if (file) {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.addEventListener("load", e => {
          const contentsModule = manager.getModule(ContentsModule);
          if (reader.result)
            contentsModule.import(
              pid,
              parseInt(select.value),
              reader.result.toString()
            );
        });
      }
    });
  }
}
