import { appManager } from "../../../AppManager";
import { ContentsModule } from "../../../modules/ContentsModule";
import { sprintf } from "javascript-window-framework";

const contentsModule = appManager.getModule(ContentsModule);
contentsModule.addEventListener("drawContents", (client, id) => {
  const tree = contentsModule.getTreeCache();
  if (!tree) return;

  const contentsPage = client.querySelector("[data-type=ContentsPage]");
  if (!contentsPage) return;

  //サブコンテンツ領域の作成
  const subContents = document.createElement("div");
  subContents.dataset.style = "SubContents";

  const div = document.createElement("div");
  subContents.appendChild(div);

  const contents = contentsModule.findTreeContents(tree, id);
  if (contents) {
    const childs = contents.childs;
    if (childs) {
      const table = document.createElement("table");
      const row = table.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 2;
      cell.innerText = "目次";
      let flag = false;
      for (const c of childs) {
        if (c.type !== "PAGE") continue;
        flag = true;

        const row = table.insertRow();
        //let cell;
        let cell: HTMLTableDataCellElement;

        const date = new Date(c.update);
        cell = row.insertCell();
        cell.innerText = sprintf(
          "%04d/%02d/%02d %02d:%02d",
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          date.getMinutes()
        );

        cell = row.insertCell();
        cell.innerText = c.title;

        row.addEventListener("click", () => {
          contentsModule.selectContents(c.id);
        });
      }
      div.appendChild(table);
      if (flag) contentsPage.appendChild(subContents);
    }
  }
});
