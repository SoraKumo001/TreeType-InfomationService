import * as JWF from "javascript-window-framework";
import { AppManager } from "../../AppManager";
import { ContentsModule, MainContents } from "../../modules/ContentsModule";
import { ContentsArea } from "../MainView";
export class InfoContentsView extends JWF.Window {
  contentsModule: ContentsModule;
  constructor(manager: AppManager) {
    super();
    const contentsModule = manager.getModule(ContentsModule);
    this.contentsModule = contentsModule;

    contentsModule.addEventListener("selectPage",(id)=>{
      this.loadPage(id);
    })
//    this.loadPage(4);
  }
  private createContents(value: MainContents) {
    var contentsArea = document.createElement("div") as ContentsArea;
    contentsArea.className = "ContentsArea";
    contentsArea.dataset.contentsType = value.type;
    //Contents.nodes[value["id"]] = area;
    var contents = document.createElement("div");
    contents.className = "Contents";
    contentsArea.appendChild(contents);
    //管理者用編集メニュー
    // if (SESSION.isAuthority("SYSTEM_ADMIN"))
    // contents.appendChild(createControlPanel(value["id"]));
    var title = document.createElement("div") as HTMLElement;
    contents.appendChild(title);
    var date = document.createElement("div");
    date.className = "Date";
    contents.appendChild(date);
    var body = document.createElement("div");
    body.className = "Body";
    contents.appendChild(body);
    var childs = document.createElement("div");
    childs.className = "Childs";
    contentsArea.appendChild(childs);
    if (value.childs) {
      for (const child of value.childs) {
        childs.appendChild(this.createContents(child));
      }
    }
    contentsArea.update = value => {
      if (contentsArea.dataset.contentsType === value["type"]) {
        var titleTag = "H" + value["title_type"];
        if (titleTag != title.nodeName) {
          var newTitle = document.createElement(titleTag);
          if (title.parentNode) {
            title.parentNode.insertBefore(newTitle, title);
            title.parentNode.removeChild(title);
          }
          title = newTitle;
        }
        contentsArea.dataset.contentsStat = value.stat.toString();
        title.dataset.nodeName = "H" + value.title_type;
        title.textContent = value.title;
        date.textContent = new Date(value["date"]).toLocaleString();
        body.innerHTML = value["value"];
        const imageNodes = body.querySelectorAll("img");
        for (var i = 0; i < imageNodes.length; i++) {
          const node = imageNodes[i];
          node.addEventListener("click", () => {
            window.open(node.src, "newtab");
          });
        }
        var nodes = body.querySelectorAll(".code");
        for (var index = 0; nodes[index]; index++) {
          var node = nodes[index];
          //hljs.highlightBlock(node);
        }
        var nodes = body.querySelectorAll(".update");
        for (var index = 0; nodes[index]; index++) {
          var node = nodes[index];
          //checkUpdate(node);
        }
      }
    };
    contentsArea.update(value);
    return contentsArea;
  }
  public async loadPage(id: number) {
    const client = this.getClient();
    //既存コンテンツのクリア
    while (client.childNodes.length)
      client.removeChild(client.childNodes[0]);
    //ページ単位でコンテンツの読み出し
    const contentsModule = this.contentsModule;
    const page = await contentsModule.getPage(id);
    if (!page)
      return;
    const node = this.createContents(page);
    client.appendChild(node);
  }
}
