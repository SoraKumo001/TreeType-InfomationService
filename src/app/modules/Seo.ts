import * as amf from "active-module-framework";
import { HtmlCreater } from "active-module-framework";
import { Contents } from "./Contents";
import { Params } from "./Params";

export class SeoModule extends amf.Module {
  public async onCreateHtml(creater: HtmlCreater) {
    const paramsModule = await this.getModule(Params);
    const contentsModule = await this.getModule(Contents);
    if (!paramsModule || !contentsModule) return;
    const document = creater.getDocument();

    const req = creater.getRequest();
    const id = req.query.p || 1;

    //基本パラメータの読み出し
    const basicData = ((await paramsModule.getGlobalParam("BASIC_DATA")) ||
      {}) as {
      url: string;
      logo: string;
      info: string;
      title: string;
    };

    let title = "";
    //パンくずリスト作成
    let breads = await contentsModule.getBreadcrumb(id);
    if (!breads || breads.length===0) {
      //コンテンツが無かったらエラーコードを設定
      creater.setStatus(404);
      return;
    }


    let srcUrl;
    if (basicData && basicData["url"]) srcUrl = basicData["url"];
    else srcUrl = `${req.protocol}://${req.host}${req.url}`;
    const url = srcUrl.replace(/\?.*$/, "").replace(/\/$/, "");
    const list = [];
    for (const item of breads) {
      const bradcrumb = {
        "@type": "ListItem",
        position: 1,
        item: {
          "@id": url + "/?p=" + item.id,
          name: item.title
        }
      };
      list.unshift(bradcrumb);
      if (title.length) title += " - ";
      title += item.title;
    }
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


    //タイトルの設定
    document.title = title;

    //正規URLの作成
    const normalUrl = `${url}/?p=${id}`;
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = normalUrl;
    document.head.appendChild(link);

    //説明の設定
    if (basicData.info) {
      this.createMeta(document, null, "description", basicData.info);
      this.createMeta(document, "og:description", null, basicData.info);
    }

    this.createMeta(document, "og:type", null, id===1?"website":"article");
    this.createMeta(document, "og:url", null, normalUrl);
    this.createMeta(document, "og:title", null, title);
    if (basicData.title) this.createMeta(document, "og:site_name", null, basicData.title);

    if (basicData.logo)
      this.createMeta(
        document,
        "og:image",
        null,
        (url + "/?cmd=download&id=" + basicData.logo)
      );


  }

  private createMeta(
    document: Document,
    property: string | null,
    name: string | null,
    content: string
  ) {
    const meta = document.createElement("meta") as HTMLMetaElement
    if (name) meta.name = name;
    if (property) meta.setAttribute("property",property);
    meta.content = content;
    document.head.appendChild(meta);
  }
}
