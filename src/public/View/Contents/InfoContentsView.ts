import * as JWF from "javascript-window-framework";
import { AppManager } from "../../AppManager";
import { ContentsModule, MainContents } from "../../modules/ContentsModule";
import "./scss/InfoContentsView.scss";
import "highlight.js/styles/dark.css";
import { ContentsControleWindow } from "./ContentsControleWindow";
import { ContentsEditWindow } from "./ContentsEditWindow";
import { UserModule } from "../../modules/UserModule";

const highlight = require("highlight.js/lib/highlight");
highlight.registerLanguage(
  "javascript",
  require("highlight.js/lib/languages/javascript")
);
highlight.registerLanguage("css", require("highlight.js/lib/languages/css"));
highlight.registerLanguage("java", require("highlight.js/lib/languages/java"));
highlight.registerLanguage("xml", require("highlight.js/lib/languages/xml"));
highlight.registerLanguage("php", require("highlight.js/lib/languages/php"));

export interface ContentsArea extends HTMLDivElement {
  contents: MainContents;
  update: (value: MainContents) => void;
}
/**
 *
 *
 * @export
 * @class InfoContentsView
 * @extends {JWF.Window}
 */
export class InfoContentsView extends JWF.Window {
  userModule: UserModule;
  contentsModule: ContentsModule;
  contentsPage: HTMLDivElement;
  contentsNode: { [key: number]: ContentsArea } = {};
  timerHandle?: number;
  selectId: number = 0;
  manager: AppManager;
  /**
   *Creates an instance of InfoContentsView.
   * @param {AppManager} manager
   * @memberof InfoContentsView
   */
  constructor(manager: AppManager) {
    super();
    this.manager = manager;
    const contentsModule = manager.getModule(ContentsModule);
    this.contentsModule = contentsModule;
    this.userModule = manager.getModule(UserModule);

    contentsModule.addEventListener("selectContents", (id, tree) => {
      if (!tree) this.loadPage(id);
    });
    contentsModule.addEventListener("createContents", async (pid, id) => {
      await this.loadSubPage(pid, id);
      this.jumpContents(id);
    });
    contentsModule.addEventListener("deleteContents", id => {
      const contents = this.contentsNode[id];
      if (contents && contents.parentNode) {
        contents.parentNode.removeChild(contents);
      }
    });

    this.setJwfStyle("InfoContentsView");
    const contentsPage = document.createElement("div");
    this.getClient().appendChild(contentsPage);
    this.contentsPage = contentsPage;

    const client = this.getClient();
    //スクロール時にツリービューの選択を変更
    client.addEventListener("scroll", () => {
      const scrollTop = client.scrollTop-20;
      let nearNode: ContentsArea | null = null;
      let near = 0;
      for (const node of Object.values(this.contentsNode)) {
        const p = Math.abs(node.offsetTop - scrollTop);
        if (p > 0 &&  (nearNode === null || p < near)) {
          nearNode = node;
          near = p;
        }
      }
      if (nearNode) {
        const contents = nearNode.contents;
        const id = contents.id;
        if (this.selectId !== id) {
          this.contentsModule.selectContents(id, true);
          this.selectId = id;
        }
      }
    });
  }
  /**
   *
   *
   * @private
   * @param {MainContents} value
   * @returns
   * @memberof InfoContentsView
   */
  private createContents(value: MainContents) {
    var contentsArea = document.createElement("div") as ContentsArea;
    contentsArea.contents = value;
    contentsArea.className = "ContentsArea";
    contentsArea.dataset.contentsType = value.type;
    var contents = document.createElement("div");
    contents.className = "Contents";
    contentsArea.appendChild(contents);

    //管理者用編集メニュー
    //if (SESSION.isAuthority("SYSTEM_ADMIN"))
    const edit = document.createElement("div");
    edit.className = "ContentsEdit";
    edit.innerText = "🖹";
    contents.appendChild(edit);
    edit.addEventListener("click", () => {
      const contentsControle = new ContentsControleWindow();
      const x =
        this.getAbsX() + this.getWidth() - contentsControle.getWidth() - 30;
      contentsControle.setPos(x, 30);

      contentsControle.addMenu("編集", () => {
        const editWindow = new ContentsEditWindow(this.manager, value.id);
      });
      if (value.type !== "PAGE") {
        contentsControle.addMenu("新規(上)", () => {
          this.contentsModule.createContents(value.id, 0, "TEXT");
        });
        contentsControle.addMenu("新規(下)", () => {
          this.contentsModule.createContents(value.id, 1, "TEXT");
        });
      }
      contentsControle.addMenu("新規(子上)", () => {
        this.contentsModule.createContents(value.id, 2, "TEXT");
      });
      contentsControle.addMenu("新規(子下)", () => {
        this.contentsModule.createContents(value.id, 3, "TEXT");
      });
      if (value.type !== "PAGE") {
        contentsControle.addMenu("移動(上)");
        contentsControle.addMenu("移動(下)");
      }
    });

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
      contentsArea.contents = value;
      this.contentsNode[value.id] = contentsArea;
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
          node.src = node.src.replace("command=Files.download", "cmd=download");
          node.addEventListener("click", () => {
            window.open(node.src, "newtab");
          });
        }
        var nodes = body.querySelectorAll(".code");
        for (var index = 0; nodes[index]; index++) {
          var node = nodes[index];
          highlight.highlightBlock(node);
        }
        var nodes = body.querySelectorAll(".update");
        for (var index = 0; nodes[index]; index++) {
          var node = nodes[index];
          //checkUpdate(node);
        }
      }
    };
    contentsArea.update(value);
    /*
    //ツリービューの選択を変更する処理
    const changeActiveId = (e: MouseEvent) => {
      const id = value.id;
      if (this.selectId !== id) {
        this.contentsModule.selectPage(id, true);
        this.selectId = id;
      }
      e.cancelBubble = true;
    };
    body.addEventListener("mouseover", changeActiveId);
    title.addEventListener("mouseover", changeActiveId);
    body.addEventListener("click", changeActiveId);
    title.addEventListener("click", changeActiveId);
*/

    return contentsArea;
  }
  /**
   *
   *
   * @param {number} id
   * @param {boolean} [reload]
   * @returns
   * @memberof InfoContentsView
   */
  public async loadPage(id: number, reload?: boolean) {
    if (!reload && this.contentsNode[id]) {
      this.jumpContents(id);
      return;
    }
    //既存コンテンツのクリア
    this.contentsNode = {};
    const contentsPage = this.contentsPage;
    while (contentsPage.childNodes.length)
      contentsPage.removeChild(contentsPage.childNodes[0]);
    //ページ単位でコンテンツの読み出し
    const contentsModule = this.contentsModule;
    const page = await contentsModule.getPage(id);
    if (!page) return;
    const node = this.createContents(page);
    contentsPage.appendChild(node);
    this.jumpContents(id);
  }
  public async loadSubPage(pid: number, id: number) {
    //対象が存在しなければ全てを読み込みなおす
    const parent = this.contentsNode[pid];
    if (!parent) this.loadPage(id, true);

    //部分的なコンテンツの読み出し
    const contentsModule = this.contentsModule;
    const contents = await contentsModule.getContents(pid, true);
    if (!contents) return;
    const node = this.createContents(contents);
    if (parent.parentNode) parent.parentNode.replaceChild(node, parent);
  }
  public jumpContents(id: number) {
    const node = this.contentsNode[id];
    if (node) {
      var y =
        node.getBoundingClientRect().top -
        this.contentsPage.getBoundingClientRect().top;
      setTimeout(() => {
        this.scrollTo(this.getClient(), y - 50);
      }, 0);
    }
  }

  /**
   *
   *
   * @param {HTMLElement} node
   * @param {number} pos
   * @memberof InfoContentsView
   */
  public scrollTo(node: HTMLElement, pos: number) {
    if (this.timerHandle) window.clearInterval(this.timerHandle);
    pos -= 20;
    if (pos < 0) pos = 0;
    var limit = node.scrollHeight - node.clientHeight;
    if (pos > limit) pos = limit;
    this.timerHandle = window.setInterval(() => {
      var p = pos - node.scrollTop;
      if (Math.abs(p) < 5) {
        node.scrollTop = pos;
        window.clearInterval(this.timerHandle);
        this.timerHandle = undefined;
      } else node.scrollTop += p / 5;
    }, 10);
  }
}
