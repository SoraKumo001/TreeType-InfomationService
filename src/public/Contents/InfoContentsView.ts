/**
 *コンテンツのページ表示用
 *
 */
import * as JWF from "javascript-window-framework";
import { ContentsModule, MainContents } from "./ContentsModule";
import { ContentsControleWindow } from "./ContentsControleWindow";
import { ContentsEditWindow } from "./ContentsEditWindow";
import "./scss/InfoContentsView.scss";
import "highlight.js/styles/tomorrow-night-eighties.css";
import { AppManager } from "../Manager/FrontManager";

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
 * @extends {JWF.BaseView}
 */
export class InfoContentsView extends JWF.BaseView {
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

    contentsModule.addContentsValueType(
      "TEXT",
      (body: HTMLDivElement, pageId: number, contents: MainContents) => {
        body.innerHTML = contents["value"];
      }
    );

    this.addModuleEvent();

    //ページ表示用ノードの作成
    const contentsPage = document.createElement("div");
    contentsPage.dataset.type = "ContentsPage";
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
        if(contentsNode.contents.type !== contents.type)
          this.loadPage(contents.id,true);
        else
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
    const contentsArea = document.createElement("div") as ContentsArea;
    contentsArea.contents = contents;
    contentsArea.className = "ContentsArea";
    contentsArea.dataset.contentsType = contents.type;
    const contentsNode = document.createElement("div");
    contentsNode.className = "Contents";
    contentsArea.appendChild(contentsNode);
    contentsArea.contentsNode = contentsNode;

    this.createEditMenu(contentsArea);

    let title = document.createElement("div");
    contentsNode.appendChild(title);
    const date = document.createElement("div");
    date.className = "Date";
    contentsNode.appendChild(date);
    const body = document.createElement("p");
    body.className = "Body";
    contentsNode.appendChild(body);
    const childs = document.createElement("div");
    childs.className = "Childs";
    contentsArea.appendChild(childs);
    if (contents.children) {
      for (const child of contents.children) {
        childs.appendChild(this.createContents(child));
      }
    }
    contentsArea.update = contents => {
      contentsArea.contents = contents;
      this.contentsNode[contents.id] = contentsArea;
      // if (contentsArea.dataset.contentsType === contents["type"]) {
      const titleTag = "H" + contents["title_type"];
      if (titleTag != title.nodeName) {
        const newTitle = document.createElement(titleTag) as HTMLDivElement;
        if (title.parentNode) {
          title.parentNode.insertBefore(newTitle, title);
          title.parentNode.removeChild(title);
        }
        title = newTitle;
        title.addEventListener("dblclick", e => {
          new ContentsEditWindow(this.manager, contents.id);
          e.preventDefault();
          const selection = getSelection();
          if(selection)
            selection.removeAllRanges();
        });
      }
      contentsArea.dataset.contentsStat = contents.visible.toString();
      title.dataset.nodeName = "H" + contents.title_type;
      title.textContent = contents.title;
      date.textContent = new Date(contents["date"]).toLocaleString();
      this.contentsModule.createContentsValue(body, this.pageId, contents);
      // const imageNodes = body.querySelectorAll("img");
      // for (const i = 0; i < imageNodes.length; i++) {
      //   const node = imageNodes[i];
      //   node.src = node.src.replace("command=Files.download", "cmd=download");
      //   node.addEventListener("click", () => {
      //     window.open(node.src, "newtab");
      //   });
      // }
      const nodes = body.querySelectorAll(".code");
      for (let index = 0; nodes[index]; index++) {
        const node = nodes[index];
        highlight.highlightBlock(node);
      }
      // const nodes = body.querySelectorAll(".update");
      // for (const index = 0; nodes[index]; index++) {
      //   const node = nodes[index];
      //   //checkUpdate(node);
      // }
    };
    //};
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
          this.contentsModule.createContents(contents.id, 0, "ITEM");
        });
        contentsControle.addMenu("新規(下)", () => {
          this.contentsModule.createContents(contents.id, 1, "ITEM");
        });
      }
      contentsControle.addMenu("新規(子上)", () => {
        this.contentsModule.createContents(contents.id, 2, "ITEM");
      });
      contentsControle.addMenu("新規(子下)", () => {
        this.contentsModule.createContents(contents.id, 3, "ITEM");
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

    this.contentsModule.callEvent("drawContents", this.getClient(), page.id);
  }
  public moveVector(id: number, vector: number) {
    const node = this.contentsNode[id];
    if (node == null) return;
    const parent = node.parentNode;
    if (!parent) return;
    const childs = parent.childNodes;
    for (let i = 0; i < childs.length; i++) {
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
      const y =
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
    const limit = node.scrollHeight - node.clientHeight;
    if (pos > limit) pos = limit;
    this.scrollFlag = true;
    this.timerHandle = window.setInterval(() => {
      const p = Math.floor(pos - node.scrollTop);
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
