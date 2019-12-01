import { Module } from "@rfcs/core";
import { HtmlCreater } from "../../HtmlCreater";
import { ParamModule } from "../App/ParamModule";

/**
 *アドセンス初期設定用クラス
 *
 * @export
 * @class AdSense
 * @extends {amf.Module}
 */
export class AdSense extends Module {
  public async onCreateHtml(creater: HtmlCreater): Promise<void> {
    const paramsModule = await this.getModule(ParamModule);

    if (!paramsModule) return;
    const basicData = (await paramsModule.getGlobalParam("ADSENSE_DATA")) as {
      top?: string;
      bottom?: string;
    };
    if (basicData && (basicData.top || basicData.bottom)) {
      const document = creater.getDocument();
      const script1 = document.createElement("script");
      script1.defer = true;
      script1.src = "//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      document.head.appendChild(script1);
    }
  }
}
