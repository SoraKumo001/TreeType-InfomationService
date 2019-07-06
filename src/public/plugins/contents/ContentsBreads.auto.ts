/**
 *表示用パンくずリストプラグイン
 */

import { appManager } from "../../AppManager";
import { ContentsModule, TreeContents } from "../../modules/ContentsModule";
import "./ContentsBreads.auto.scss";

const contentsModule = appManager.getModule(ContentsModule);
contentsModule.addEventListener("drawContents", (client, id) => {
  const contentsPage = client.querySelector("[data-type=ContentsPage]");
  if (contentsPage) {
    //パンくず領域の作成
    const breadContents = document.createElement("div");
    breadContents.dataset.style = "BreadContents";
    let parent:
      | TreeContents
      | undefined
      | null = contentsModule.findTreeContents(id);
    if (!parent) return;
    while ((parent = parent.parent)) {
      //SEO対策のためaタグを生成
      const link = document.createElement("a");
      const id = parent.id;
      link.href = "?p="+id;
      link.innerText = parent.title;
      link.addEventListener("click", (e) => {
        contentsModule.selectContents(id);
        e.preventDefault();
      });
      breadContents.insertBefore(link, breadContents.firstChild);
    }
    contentsPage.insertBefore(breadContents, contentsPage.firstChild);
  }
});
