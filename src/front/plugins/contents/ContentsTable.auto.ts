/**
 *目次表示用プラグイン
 */
import { ContentsModule } from "../../Contents/ContentsModule";
import { sprintf } from "javascript-window-framework";
import "./ContentsTable.auto.scss";
import { ContentsCacheModule } from "./ContentsCache.auto";
import { getManager } from "../..";

const contentsModule = getManager().getModule(ContentsModule);
const contentsCacheModule = getManager().getModule(ContentsCacheModule);

contentsModule.addEventListener("drawContents", (client, id) => {
  const contentsPage = client.querySelector("[data-type=ContentsPage]");
  if (!contentsPage) return;

  //サブコンテンツ領域の作成
  const subContents = document.createElement("div");
  subContents.dataset.style = "ContentsTable";

  const div = document.createElement("div");
  subContents.appendChild(div);

  const contents = contentsCacheModule.findTreeContents(id);
  if (contents) {
    const childs = contents.children;
    if (childs) {
      const table = document.createElement("table");
      const row = table.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 2;
      cell.innerText = "目次";
      let flag = false;
      let index = 1;
      for (const c of childs) {
        if (c.type !== "PAGE") continue;
        flag = true;

        const row = table.insertRow();
        let cell: HTMLTableDataCellElement;
        cell = row.insertCell();
        const link = document.createElement("a");
        link.innerText = sprintf("  %02d. %s", index++, c.title);
        link.href = "?p=" + id;
        link.addEventListener("click", e => {
          contentsModule.selectContents(c.id);
          e.preventDefault();
        });
        cell.appendChild(link);
      }
      div.appendChild(table);
      if (flag) contentsPage.appendChild(subContents);
    }
  }
});
