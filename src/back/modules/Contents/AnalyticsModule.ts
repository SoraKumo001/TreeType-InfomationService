import { ParamModule } from "../App/ParamModule";
import { Module } from "@rfcs/core";
import { HtmlCreater } from "../../HtmlCreater";

/**
 *アナリティクス初期設定用クラス
 *
 * @export
 * @class Analytics
 * @extends {amf.Module}
 */
export class Analytics extends Module {
  public async onCreateHtml(creater: HtmlCreater): Promise<void> {
    const paramsModule = await this.getModule(ParamModule);

    if (!paramsModule) return;
    const basicData = (await paramsModule.getGlobalParam("BASIC_DATA")) as {
      analytics: string;
    };
    if (basicData && basicData.analytics) {
      const document = creater.getDocument();
      const script1 = document.createElement("script");
      script1.defer = true;
      script1.src =
        "https://www.googletagmanager.com/gtag/js?id=" + basicData.analytics;
      document.head.appendChild(script1);
      const script2 = document.createElement("script");
      script2.innerHTML = `AnalyticsUA = '${basicData.analytics}';
      window.dataLayer = window.dataLayer || [];
      function gtag() { dataLayer.push(arguments); }
      gtag('js', new Date());
      //gtag('config', AnalyticsUA);`;
      document.head.appendChild(script2);
    }
  }
}
