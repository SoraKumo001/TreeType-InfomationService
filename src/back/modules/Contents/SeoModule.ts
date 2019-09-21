import * as amf from "active-module-framework";
import { HtmlCreater } from "active-module-framework";
import { Contents, ContentsEntity } from "./ContentsModule";
import { ParamModule } from "../App/ParamModule";

export class SeoModule extends amf.Module {
  public async onCreateHtml(creater: HtmlCreater) {
    const paramsModule = await this.getModule(ParamModule);
    const contentsModule = await this.getModule(Contents);
    if (!paramsModule || !contentsModule) return;
    const document = creater.getDocument();

    const req = creater.getRequest();
    const uuid = req.query.uuid || "";
    const id = uuid ? await contentsModule.getIdFromUuid(uuid) : 1;

    //パラメータの読み出し
    let [basicData, breads, contents] = await Promise.all([
      paramsModule.getGlobalParam("BASIC_DATA") as Promise<{
        url?: string;
        logo?: string;
        info?: string;
        title?: string;
      } | null>,
      contentsModule.getBreadcrumb(id),
      contentsModule.getContents(id, true)
    ]);
    if (!basicData) basicData = {};

    let title = "";

    //パンくずリスト作成
    if (!breads) {
      //コンテンツが無かったらエラーコードを設定
      creater.setStatus(404);
      return;
    }

    let srcUrl;
    if (basicData && basicData["url"]) srcUrl = basicData["url"];
    else srcUrl = `${req.protocol}://${req.hostname}${req.url}`;
    const url = srcUrl.replace(/\?.*$/, "").replace(/\/$/, "");
    const list = [];
    let item: ContentsEntity | undefined = breads;
    while ((item = item.parent)) {
      const bradcrumb = {
        "@type": "ListItem",
        position: 1,
        item: {
          "@id": url + "/?uuid=" + item.uuid,
          name: item.title
        }
      };
      list.unshift(bradcrumb);
      if (title.length) title += " - ";
      title += item.title;
    }
    if (list.length) {
      for (let i = 0; i < list.length; i++) {
        list[i].position = i + 1;
      }
      const breadcrumbList = document.createElement("script");
      breadcrumbList.type = "application/ld+json";
      const breadcrumbValue = {
        "@context": "http://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: list
      };
      breadcrumbList.textContent = JSON.stringify(breadcrumbValue);
      document.head.appendChild(breadcrumbList);
    }
    //ページの説明文章の作成
    let info = "";
    if (contents) {
      //本文を設定
      if (contents.value) {
        //タグの無効化
        info = this.convertText(contents.value);
      }
      //サブタイトルを設定
      if (contents.children) {
        for (const child of contents.children) {
          info += child.title + " ";
        }
      }
      //タイトルの設定
      if (title.length) title = " - " + title;
      title = contents.title + title;
    }

    document.title = title;

    //正規URLの作成(正規IDはページのIDを設定)
    const normalUrl = `${url}/?uuid=${breads.uuid}`;
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = normalUrl;
    document.head.appendChild(link);

    //説明の設定
    if (info.length === 0 && basicData.info) info = basicData.info;
    this.createMeta(document, null, "description", info);
    this.createMeta(document, "og:description", null, info);

    this.createMeta(
      document,
      "og:type",
      null,
      id === 1 ? "website" : "article"
    );
    this.createMeta(document, "og:url", null, normalUrl);
    this.createMeta(document, "og:title", null, title);
    this.createMeta(document, "fb:app_id", null, "562797474252030");
    if (basicData.title)
      this.createMeta(document, "og:site_name", null, basicData.title);

    if (basicData.logo)
      this.createMeta(
        document,
        "og:image",
        null,
        url + "/?cmd=download&id=" + basicData.logo
      );
  }
  private convertText(value: string) {
    return value
      .replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\n|\r\n|\r/g, "");
  }
  private createMeta(
    document: Document,
    property: string | null,
    name: string | null,
    content: string
  ) {
    const meta = document.createElement("meta") as HTMLMetaElement;
    if (name) meta.name = name;
    if (property) meta.setAttribute("property", property);
    meta.content = content;
    document.head.appendChild(meta);
  }
}
