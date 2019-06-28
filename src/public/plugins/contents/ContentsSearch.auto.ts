/**
 *表示用パンくずリストプラグイン
 */

import { appManager } from "../../AppManager";
import { ContentsModule } from "../../modules/ContentsModule";
import { ContentsSearchWindow } from "../../View/ContentsSearch";

const contentsModule = appManager.getModule(ContentsModule);
contentsModule.addEventListener("drawContents", (client, id) => {
  const contentsPage = client.querySelector(
    "[data-type=ContentsPage]"
  ) as HTMLElement;
  const search = document.createElement("div");
  search.style.cursor = "pointer";
  search.style.position = "absolute";
  search.style.right = "3em";
  search.style.padding = "0.7em";
  search.style.background = "rgba(0,0,0,0.1)";
  search.style.borderRadius = "1em";
  search.innerText = "検索";
  search.addEventListener("click", () => {
    new ContentsSearchWindow(appManager);
  });
  contentsPage.insertBefore(search, contentsPage.firstChild);
});
