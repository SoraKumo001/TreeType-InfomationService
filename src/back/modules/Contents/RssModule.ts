import express = require("express");
import { Contents } from "./ContentsModule";
import * as xml2js from "xml2js";
import { ParamModule } from "../App/ParamModule";
import { HtmlCreater } from "../../HtmlCreater";
import { Module } from "@rfcs/core";

export class Rss extends Module {
  public async onCreateModule(): Promise<boolean> {
    this.addCommand(
      "rss",
      async (req: express.Request, res: express.Response) => {
        res.contentType("text/xml; charset=utf-8");
        const rss = await this.createRss();
        res.end(rss);
      }
    );
    return true;
  }
  public async onCreateHtml(creater: HtmlCreater) {
    const params = await this.getModule(ParamModule);
    let url = "";
    if (params) {
      const p = (await params.getGlobalParam("BASIC_DATA")) as {
        url: string;
        title: string;
        info: string;
      };
      if (p && p.url) url = p.url;
      url = url.replace(/\/$/, "") + "/";
    }

    const document = creater.getDocument();
    const node = document.createElement("link");
    node.rel = "alternate";
    node.type = "application/rss+xml";
    node.href = url + "?cmd=rss";
    node.title = "RSS2.0";
    document.head.appendChild(node);
  }
  public async createRss() {
    const params = await this.getModule(ParamModule);
    const contents = await this.getModule(Contents);
    if (!contents || !params) return "";
    const basicData = (await params.getGlobalParam("BASIC_DATA")) as {
      url: string;
      title: string;
      info: string;
    };
    let link = "";
    let title = "";
    let description = "";
    if (basicData) {
      link = basicData.url || "";
      title = basicData.title || "";
      description = basicData.info || "";
    }
    //コンテンツの読み出し
    const items = [];
    const pages = await contents.getPages(false);
    if (pages) {
      for (const c of pages) {
        let description = c.value;
        description = description
          .replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&");
        const item = {
          guid: `${link}?uuid=${c.uuid}`,
          title: c.title,
          link: `${link}?uuid=${c.uuid}`,
          pubDate: new Date(c.update).toUTCString(),
          category: "topic",
          description
        };
        items.push(item);
      }
    }

    //rssの作成
    const rss = {
      rss: {
        $: {
          version: "2.0"
        },
        channel: { title, description, link, language: "ja-jp", item: items }
      }
    };

    const xml = new xml2js.Builder();
    return xml.buildObject(rss);
  }
}
