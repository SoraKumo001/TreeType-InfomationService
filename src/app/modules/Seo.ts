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

    let breads = await contentsModule.getBreadcrumb(id);
    if (!breads) return;
    //パンくずリスト作成
    let srcUrl;
    const basicData = await paramsModule.getGlobalParam("BASIC_DATA") as {url:string};
    if(basicData && basicData["url"])
      srcUrl = basicData["url"];
    else
      srcUrl = `${req.protocol}://${req.host}${req.url}`;
   var url = srcUrl.replace(/\?.*$/, "").replace(/\/$/, '');
    var list = [];
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
    }
    for (var i = 0; i < list.length; i++) {
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


}
