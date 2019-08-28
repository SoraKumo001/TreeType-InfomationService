/**
 *表示用パンくずリストプラグイン
 */

import { ContentsModule, TreeContents } from "../../Contents/ContentsModule";
import "./ContentsBreads.auto.scss";
import { ContentsCacheModule } from "./ContentsCache.auto";
import { getManager } from "../..";

const contentsModule = getManager().getModule(ContentsModule);
const contentsCacheModule = getManager().getModule(ContentsCacheModule);

contentsModule.addEventListener("drawContents", (client, uuid) => {
  const contentsPage = client.querySelector("[data-type=ContentsPage]");
  if (contentsPage) {
    //パンくず領域の作成
    const breadContents = document.createElement("div");
    breadContents.dataset.style = "BreadContents";
    let parent:
      | TreeContents
      | undefined
      | null = contentsCacheModule.findTreeContents(uuid);
    if (!parent) return;
    while ((parent = parent.parent)) {
      //SEO対策のためaタグを生成
      const link = document.createElement("a");
      const uuid = parent.uuid;
      link.href = "?uuid="+uuid;
      link.innerText = parent.title;
      link.addEventListener("click", (e) => {
        contentsModule.selectContents(uuid);
        e.preventDefault();
      });
      breadContents.insertBefore(link, breadContents.firstChild);
    }
    contentsPage.insertBefore(breadContents, contentsPage.firstChild);
  }
});
