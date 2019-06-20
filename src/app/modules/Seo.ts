import * as amf from "active-module-framework";
import { HtmlCreater } from "active-module-framework";

export class SeoModule extends amf.Module {
  public async onCreateHtml(creater:HtmlCreater){
    const document = creater.getDocument();
  }
}