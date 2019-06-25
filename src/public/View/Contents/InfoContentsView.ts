import * as JWF from "javascript-window-framework";
import { AppManager } from "../../AppManager";
import {
  ContentsModule,
  MainContents,
  TreeContents
} from "../../modules/ContentsModule";
import "./scss/InfoContentsView.scss";
import "highlight.js/styles/dark.css";
import { ContentsControleWindow } from "./ContentsControleWindow";
import { ContentsEditWindow } from "./ContentsEditWindow";

// eslint-disable-next-line @typescript-eslint/no-var-requires
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
  contentsNode: HTMLElement;
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
  private contentsModule: ContentsModule;
  private contentsPage: HTMLDivElement;
  private contentsNode: { [key: number]: ContentsArea } = {};
  private timerHandle?: number;
  private selectId: number = 0;
  private manager: AppManager;
  private scrollFlag: boolean = false;
  private pageId: number = 0;

  /**
   *Creates an instance of InfoContentsView.
   * @param {AppManager} manager
   * @memberof InfoContentsView
   */
  public constructor(manager: AppManager) {
    super();
    this.manager = manager;
    this.setJwfStyle("InfoContentsView");
    const contentsModule = manager.getModule(ContentsModule);
    this.contentsModule = contentsModule;

    this.addModuleEvent();

    //ページ表示用ノードの作成
    const contentsPage = document.createElement("div");
    this.getClient().appendChild(contentsPage);
    this.contentsPage = contentsPage;

    const client = this.getClient();
    //スクロール時にツリービューの選択を変更
    client.addEventListener("scroll", () => {
      //強制スクロール中なら終了
      if (this.scrollFlag) return;

      const scrollTop = client.scrollTop - 10;
      let nearNode: ContentsArea | null = null;
      let near = 0;
      for (const node of Object.values(this.contentsNode)) {
        const p = Math.abs(node.offsetTop - scrollTop);
        if (p > 0 && (nearNode === null || p < near)) {
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
  private addModuleEvent() {
    const contentsModule = this.contentsModule;
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
    contentsModule.addEventListener("updateContents", contents => {
      const contentsNode = this.contentsNode[contents.id];
      if (contentsNode) {
        contentsNode.update(contents);
      }
    });
    contentsModule.addEventListener("moveVector", (id, vector) => {
      this.moveVector(id, vector);
    });
    contentsModule.addEventListener("moveContents", (fromId, toId) => {
      if (this.contentsNode[fromId] || this.contentsNode[toId])
        this.loadPage(this.pageId, true);
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
  private createContents(contents: MainContents) {
    var contentsArea = document.createElement("div") as ContentsArea;
    contentsArea.contents = contents;
    contentsArea.className = "ContentsArea";
    contentsArea.dataset.contentsType = contents.type;
    var contentsNode = document.createElement("div");
    contentsNode.className = "Contents";
    contentsArea.appendChild(contentsNode);
    contentsArea.contentsNode = contentsNode;

    this.createEditMenu(contentsArea);

    var title = document.createElement("div") as HTMLElement;
    contentsNode.appendChild(title);
    var date = document.createElement("div");
    date.className = "Date";
    contentsNode.appendChild(date);
    var body = document.createElement("div");
    body.className = "Body";
    contentsNode.appendChild(body);
    var childs = document.createElement("div");
    childs.className = "Childs";
    contentsArea.appendChild(childs);
    if (contents.childs) {
      for (const child of contents.childs) {
        childs.appendChild(this.createContents(child));
      }
    }
    contentsArea.update = contents => {
      contentsArea.contents = contents;
      this.contentsNode[contents.id] = contentsArea;
      if (contentsArea.dataset.contentsType === contents["type"]) {
        var titleTag = "H" + contents["title_type"];
        if (titleTag != title.nodeName) {
          var newTitle = document.createElement(titleTag);
          if (title.parentNode) {
            title.parentNode.insertBefore(newTitle, title);
            title.parentNode.removeChild(title);
          }
          title = newTitle;
        }
        contentsArea.dataset.contentsStat = contents.stat.toString();
        title.dataset.nodeName = "H" + contents.title_type;
        title.textContent = contents.title;
        date.textContent = new Date(contents["date"]).toLocaleString();
        body.innerHTML = contents["value"];
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
        // var nodes = body.querySelectorAll(".update");
        // for (var index = 0; nodes[index]; index++) {
        //   var node = nodes[index];
        //   //checkUpdate(node);
        // }
      }
    };
    contentsArea.update(contents);
    return contentsArea;
  }
  public createEditMenu(contentsArea: ContentsArea) {
    //管理者用編集メニュー
    //if (SESSION.isAuthority("SYSTEM_ADMIN"))
    const edit = document.createElement("div");
    edit.className = "ContentsEdit";
    edit.innerText = "🖹";
    contentsArea.contentsNode.appendChild(edit);
    edit.addEventListener("click", () => {
      const contents = contentsArea.contents;
      const contentsControle = new ContentsControleWindow();
      const x =
        this.getAbsX() + this.getWidth() - contentsControle.getWidth() - 30;
      contentsControle.setPos(x, 30);

      contentsControle.addMenu("編集", () => {
        new ContentsEditWindow(this.manager, contents.id);
      });
      if (contents.type !== "PAGE") {
        contentsControle.addMenu("新規(上)", () => {
          this.contentsModule.createContents(contents.id, 0, "TEXT");
        });
        contentsControle.addMenu("新規(下)", () => {
          this.contentsModule.createContents(contents.id, 1, "TEXT");
        });
      }
      contentsControle.addMenu("新規(子上)", () => {
        this.contentsModule.createContents(contents.id, 2, "TEXT");
      });
      contentsControle.addMenu("新規(子下)", () => {
        this.contentsModule.createContents(contents.id, 3, "TEXT");
      });
      if (contents.type !== "PAGE") {
        contentsControle.addMenu("移動(上)", () => {
          this.contentsModule.moveVector(contents.id, -1);
        });
        contentsControle.addMenu("移動(下)", () => {
          this.contentsModule.moveVector(contents.id, 1);
        });
      }
    });
  }

  private findContents(tree: TreeContents, id: number): TreeContents | null {
    if (tree.id === id) return tree;
    if (tree.childs) {
      for (const child of tree.childs) {
        const result = this.findContents(child, id);
        if (result) return result;
      }
    }
    return null;
  }
  public drawBreads() {
    const contentsModule = this.contentsModule;
    const tree = contentsModule.getTreeCache();
    if (!tree) return;

    //パンくず領域の作成
    const breadContents = document.createElement("div");
    breadContents.dataset.style = "BreadContents";

    let parent: TreeContents | null = this.findContents(tree, this.pageId);
    if (!parent) return;
    while ((parent = this.findContents(tree, parent.pid))) {
      const div = document.createElement("div");
      const id = parent.id;
      div.innerText = parent.title;
      div.addEventListener("click", () => {
        contentsModule.selectContents(id);
      });
      breadContents.insertBefore(div, breadContents.firstChild);
    }
    this.contentsPage.insertBefore(breadContents, this.contentsPage.firstChild);
  }
  public drawSubContents() {
    const contentsModule = this.contentsModule;
    const tree = contentsModule.getTreeCache();
    if (!tree) return;



    //サブコンテンツ領域の作成
    const subContents = document.createElement("div");
    subContents.dataset.style = "SubContents";

    const div = document.createElement("div");
    subContents.appendChild(div);

    const contents = this.findContents(tree, this.pageId);
    if (contents) {
      const childs = contents.childs;
      if (childs) {
        const table = document.createElement("table");
        const row = table.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 2;
        cell.innerText = "目次";
        let flag = false;
        for (const c of childs) {
          if (c.type !== "PAGE") continue;
          flag = true;

          const row = table.insertRow();
          //let cell;
          let cell: HTMLTableDataCellElement;

          const date = new Date(c.update);
          cell = row.insertCell();
          cell.innerText = JWF.sprintf(
            "%04d/%02d/%02d %02d:%02d",
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes()
          );

          cell = row.insertCell();
          cell.innerText = c.title;

          row.addEventListener("click", () => {
            contentsModule.selectContents(c.id);
          });
        }
        div.appendChild(table);
        if (flag) this.contentsPage.appendChild(subContents);
      }
    }
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
    this.pageId = page.id;
    const node = this.createContents(page);
    contentsPage.appendChild(node);
    this.jumpContents(id);

    this.drawBreads();
    this.drawSubContents();
  }
  public moveVector(id: number, vector: number) {
    var node = this.contentsNode[id];
    if (node == null) return;
    var parent = node.parentNode;
    if (!parent) return;
    var childs = parent.childNodes;
    for (var i = 0; i < childs.length; i++) {
      if (childs[i] === node) {
        if (vector < 0) {
          if (i === 0) return false;
          parent.insertBefore(node, childs[i - 1]);
        } else {
          if (i === childs.length - 1) return false;
          parent.insertBefore(childs[i + 1], node);
        }
        break;
      }
    }
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
    this.scrollFlag = true;
    this.timerHandle = window.setInterval(() => {
      var p = Math.floor(pos - node.scrollTop);
      if (p === 0) {
        window.clearInterval(this.timerHandle);
        this.timerHandle = undefined;
        this.scrollFlag = false;
      } else if (Math.abs(p) < 30) {
        node.scrollTop = pos;
      } else node.scrollTop += p / 5;
    }, 10);
  }
}
