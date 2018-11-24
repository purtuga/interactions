import {showcase, registerElements} from "@purtuga/project-showcase";

import "./resizable-showcase.js";

//========================================================
registerElements();


showcase("About", function ($content) {
    $content.innerHTML = `
<h2>@purtuga/interactions</h2>
<p>Re-usable UI interactions.</p>
<p>
    <strong>License:</strong> MIT<br>
    <strong>Author:</strong> Paul Tavares <support@purtuga.com><br>
</p>
`;
});