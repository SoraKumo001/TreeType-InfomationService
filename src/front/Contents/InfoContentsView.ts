/**
 *コンテンツのページ表示用
 *
 */
import * as JWF from "@jswf/core";
import { ContentsModule, MainContents } from "./ContentsModule";
import { ContentsControleWindow } from "./ContentsControleWindow";
import { ContentsEditWindow } from "./ContentsEditWindow";
import "./scss/InfoContentsView.scss";
import "highlight.js/styles/tomorrow-night-eighties.css";
import { Manager } from "@jswf/manager";


// eslint-disable-next-line @typescript-eslint/no-var-requires
const highlight = require("highlight.js/lib/core");
highlight.registerLanguage(
  "javascript",
  require("highlight.js/lib/languages/javascript")
);
highlight.registerLanguage("css", require("highlight.js/lib/languages/css"));
highlight.registerLanguage("java", require("highlight.js/lib/languages/java"));
highlight.registerLanguage("xml", require("highlight.js/lib/languages/xml"));
highlight.registerLanguage("php", require("highlight.js/lib/languages/php"));
highlight.registerLanguage("typescript", require("highlight.js/lib/languages/typescript"));

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
  private contentsNode: { [key: string]: ContentsArea } = {};
  private timerHandle?: number;
  private selectId: string = '0';
  private manager: Manager;
  private scrollFlag: boolean = false;
  private pageId: string = '0';

  /**
   *Creates an instance of InfoContentsView.
   * @param {AppManager} manager
   * @memberof InfoContentsView
   */
  public constructor(manager: Manager) {
    super();
    this.manager = manager;
    this.setJwfStyle("InfoContentsView");
    const contentsModule = manager.getModule(ContentsModule);
    this.contentsModule = contentsModule;

    contentsModule.addContentsValueType(
      "TEXT",
      (body: HTMLDivElement, pageId: string, contents: MainContents) => {
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
        const uuid = contents.uuid;
        if (this.selectId !== uuid) {
          this.contentsModule.selectContents(uuid, true);
          this.selectId = uuid;
        }
      }
    });
  }
  private addModuleEvent() {
    const contentsModule = this.contentsModule;
    contentsModule.addEventListener("selectContents", (id, tree) => {
      if (!tree) this.loadPage(id);
    });
    contentsModule.addEventListener("createContents", async (puuid, id) => {
      await this.loadSubPage(puuid, id);
      this.jumpContents(id);
    });
    contentsModule.addEventListener("deleteContents", id => {
      const contents = this.contentsNode[id];
      if (contents && contents.parentNode) {
        contents.parentNode.removeChild(contents);
      }
    });
    contentsModule.addEventListener("updateContents", contents => {
      const contentsNode = this.contentsNode[contents.uuid];
      if (contentsNode) {
        if(contentsNode.contents.type !== contents.type)
          this.loadPage(contents.uuid,true);
        else
          contentsNode.update(contents);
      }
    });
    contentsModule.addEventListener("moveVector", (uuid, vector) => {
      this.moveVector(uuid, vector);
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
      this.contentsNode[contents.uuid] = contentsArea;
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
          new ContentsEditWindow(this.manager, contents.uuid);
          e.preventDefault();
          const selection = getSelection();
          if(selection)
            selection.removeAllRanges();
        });
      }
      contentsArea.dataset.contentsStat = contents.visible?"true":"false";
      title.dataset.nodeName = "H" + contents.title_type;
      title.textContent = contents.title;
      date.textContent = new Date(contents["date"]).toLocaleString();
      this.contentsModule.createContentsValue(body, this.pageId, contents);
      const imageNodes = body.querySelectorAll("img");
      for (let i = 0; i < imageNodes.length; i++) {
        const node = imageNodes[i];
        node.style.maxWidth = "90%";
        node.addEventListener("click", () => {
          window.open(node.src, "newtab");
        });
      }
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
        new ContentsEditWindow(this.manager, contents.uuid);
      });
      if (contents.type !== "PAGE") {
        contentsControle.addMenu("新規(上)", () => {
          this.contentsModule.createContents(contents.uuid, 0, "ITEM");
        });
        contentsControle.addMenu("新規(下)", () => {
          this.contentsModule.createContents(contents.uuid, 1, "ITEM");
        });
      }
      contentsControle.addMenu("新規(子上)", () => {
        this.contentsModule.createContents(contents.uuid, 2, "ITEM");
      });
      contentsControle.addMenu("新規(子下)", () => {
        this.contentsModule.createContents(contents.uuid, 3, "ITEM");
      });
      if (contents.type !== "PAGE") {
        contentsControle.addMenu("移動(上)", () => {
          this.contentsModule.moveVector(contents.uuid, -1);
        });
        contentsControle.addMenu("移動(下)", () => {
          this.contentsModule.moveVector(contents.uuid, 1);
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
  public async loadPage(uuid: string, reload?: boolean) {
    if (!reload && this.contentsNode[uuid]) {
      this.jumpContents(uuid);
      return;
    }
    //既存コンテンツのクリア
    this.contentsNode = {};
    const contentsPage = this.contentsPage;
    while (contentsPage.childNodes.length)
      contentsPage.removeChild(contentsPage.childNodes[0]);
    //ページ単位でコンテンツの読み出し
    const contentsModule = this.contentsModule;
    const page = await contentsModule.getPage(uuid);
    if (!page) return;
    this.pageId = page.uuid;
    const node = this.createContents(page);
    contentsPage.appendChild(node);
    this.jumpContents(uuid);

    this.contentsModule.callEvent("drawContents", this.getClient(), page.uuid);
  }
  public moveVector(uuid: string, vector: number) {
    const node = this.contentsNode[uuid];
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
  public async loadSubPage(pid: string, uuid: string) {
    //対象が存在しなければ全てを読み込みなおす
    const parent = this.contentsNode[uuid];
    if (!parent){ this.loadPage(uuid, true);return;}

    //部分的なコンテンツの読み出し
    const contentsModule = this.contentsModule;
    const contents = await contentsModule.getContents(uuid, true);
    if (!contents) return;
    const node = this.createContents(contents);
    if (parent.parentNode) parent.parentNode.replaceChild(node, parent);
  }
  public jumpContents(uuid: string) {
    const node = this.contentsNode[uuid];
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
