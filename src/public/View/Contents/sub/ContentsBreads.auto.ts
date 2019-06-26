import { appManager } from "../../../AppManager";
import { ContentsModule, TreeContents } from "../../../modules/ContentsModule";

const contentsModule = appManager.getModule(ContentsModule);
contentsModule.addEventListener("drawContents", (client,id) => {
  const tree = contentsModule.getTreeCache();
  if (!tree) return;

  const contentsPage = client.querySelector("[data-type=ContentsPage]");
  if (contentsPage) {
    //パンくず領域の作成
    const breadContents = document.createElement("div");
    breadContents.dataset.style = "BreadContents";

    let parent: TreeContents | null = contentsModule.findTreeContents(tree, id);
    if (!parent) return;
    while ((parent = contentsModule.findTreeContents(tree, parent.pid))) {
      const div = document.createElement("div");
      const id = parent.id;
      div.innerText = parent.title;
      div.addEventListener("click", () => {
        contentsModule.selectContents(id);
      });
      breadContents.insertBefore(div, breadContents.firstChild);
    }
    contentsPage.insertBefore(breadContents, contentsPage.firstChild);
  }
});
