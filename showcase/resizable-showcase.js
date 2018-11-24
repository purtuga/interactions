import {showcase} from "@purtuga/project-showcase";
import {Resizable} from "../src/Resizable/Resizable.js";
import resizableHandleStyles from "../src/Resizable/handle-styles.toString.css";
import resizableStyles from "../src/Resizable/resizable-styles.toString.css";

//==================================================================

showcase("Resizable", function ($cntr) {
    $cntr.innerHTML = `
<style>
#box {
    width: 200px; 
    height: 200px; 
    background-color: lightblue;
}
${resizableStyles.replace(".resizable-is-resizing", ":root(.resizable-is-resizing)")}
${resizableHandleStyles}
</style>
<div>
    <div id="box" class="resizable">Box here</div>
</div>`;

    $cntr._resizable = new Resizable({
        ele: $cntr.querySelector("#box")
    });
});
