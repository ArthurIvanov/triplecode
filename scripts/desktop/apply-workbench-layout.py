"""Apply TripleCode startup and layout defaults to the pinned Workbench."""

import base64
import hashlib
import json
import shutil
from pathlib import Path
import sys


resources = Path(sys.argv[1])
out = resources / "out"
product_path = resources / "product.json"
product = json.loads(product_path.read_text())
if product["commit"] != "c072cf642cbbadabefa22f39c58cc902a8b7427f":
    raise SystemExit("Review the TripleCode Workbench layout after changing upstream.")

js_name = "vs/workbench/workbench.desktop.main.js"
css_name = "vs/workbench/workbench.desktop.main.css"
js = (out / js_name).read_text()
title_bar = "De.appendMenuItem(F.TitleBar,{submenu:F.ChatTitleBarMenu"
title_actions = (
    ("workbench.action.navigateBack", "Back", "arrowLeft", "D.has(\"canNavigateBack\")", None),
    ("workbench.action.navigateForward", "Forward", "arrowRight", "D.has(\"canNavigateForward\")", None),
    ("triplecode.newChat", "New chat", "plus", None, 'D.has("triplecode.agentVisible")'),
    ("triplecode.focusAgent", "Agents", "commentDiscussion", None, 'D.notEquals("workbenchState","empty")'),
    ("workbench.action.openSettings", "Settings", "gear", None, 'D.notEquals("workbenchState","empty")'),
)
title_items = ""
for index, (command, label, icon, enabled, visible) in enumerate(title_actions, 20):
    command_fields = f'id:{json.dumps(command)},title:{json.dumps(label)},icon:A.{icon}'
    if enabled:
        command_fields += f",precondition:{enabled}"
    if command == "triplecode.focusAgent":
        command_fields += ',toggled:{condition:D.has("triplecode.agentVisible")}'
    menu_fields = f'group:"navigation",order:{index}'
    if visible:
        menu_fields += f",when:{visible}"
    title_items += f"De.appendMenuItem(F.TitleBar,{{command:{{{command_fields}}},{menu_fields}}});"

# Fixed grid views reserve real space so the editor, terminal and webview share one origin.
grid_leaf = 'p=({type:g})=>u[g],h=lie.deserialize(this.createGridDescriptor()'
grid_spacers = (
    'z=new Map,p=({type:g})=>{if(!g.startsWith("triplecode.gutter."))return u[g];'
    'let v=z.get(g);if(!v){let e=E(".triplecode-gutter"),'
    'x=g.endsWith("left")||g.endsWith("right");'
    'v={element:e,minimumWidth:x?9:0,maximumWidth:x?9:Infinity,'
    'minimumHeight:x?0:9,maximumHeight:x?Infinity:9,onDidChange:q.None,'
    'layout(){},toJSON(){return{type:g}}};z.set(g,v)}return v},'
    'h=lie.deserialize(this.createGridDescriptor()'
)
middle_size = 'p=t-a-l,h=['
middle_layout = '},e,p),w={root:{type:"branch",size:e,data:[...this.shouldShowBannerFirst()?h.reverse():h,{type:"branch",data:y,size:p},'
framed_layout = (
    '},e-(tc?18:0),p),'
    'tg=k=>({type:"leaf",data:{type:"triplecode.gutter."+k},size:9,visible:!0}),'
    'w={root:{type:"branch",size:e,data:[...this.shouldShowBannerFirst()?h.reverse():h,'
    '...tc?[tg("top")]:[],{type:"branch",data:tc?[tg("left"),...y,tg("right")]:y,size:p},'
    '...tc?[tg("bottom")]:[],'
)
for before, after in (
    (grid_leaf, grid_spacers),
    # Upstream moves Activity Bar and Auxiliary Bar by their position in the middle branch.
    ("workbenchGrid.moveViewTo(this.activityBarPartView,[2,0]",
     "workbenchGrid.moveViewTo(this.activityBarPartView,this.contextService.getWorkbenchState()===1?[2,0]:[3,1]"),
    ("workbenchGrid.moveViewTo(this.activityBarPartView,[2,-1]",
     "workbenchGrid.moveViewTo(this.activityBarPartView,this.contextService.getWorkbenchState()===1?[2,-1]:[3,-2]"),
    ("workbenchGrid.moveViewTo(this.auxiliaryBarPartView,[2,0]",
     "workbenchGrid.moveViewTo(this.auxiliaryBarPartView,this.contextService.getWorkbenchState()===1?[2,0]:[3,1]"),
    ("workbenchGrid.moveViewTo(this.auxiliaryBarPartView,[2,-1]",
     "workbenchGrid.moveViewTo(this.auxiliaryBarPartView,this.contextService.getWorkbenchState()===1?[2,-1]:[3,-2]"),
    (middle_size, 'tc=this.contextService.getWorkbenchState()!==1,p=t-a-l-(tc?18:0),h=['),
    (middle_layout, framed_layout),
    ('di.activityBarSize36:di.activityBarSize48}get actionHeight()', 'di.activityBarSize36:52}get actionHeight()'),
    ('this.layoutService.isFloatingPanelsEnabled()?di.activityBarSize36:di.activityBarSize48}get actionGap()',
     'this.layoutService.isFloatingPanelsEnabled()?di.activityBarSize36:43}get actionGap()'),
    ('get actionGap(){return!this.layoutService.isFloatingPanelsEnabled()||this._isCompact?0:',
     'get actionGap(){return this._isCompact?0:!this.layoutService.isFloatingPanelsEnabled()?4:'),
    (title_bar, title_items + title_bar),
    # Use the shared design-system surface on the native, draggable editor tab.
    ('E(".tab",{draggable:!0,role:"tab"})',
     'E(".tab.triplecode-editor-tab",{draggable:!0,role:"tab"})'),
    ('return{normal:di.tabsSize35,compact:di.tabsSize22,modernUI:di.tabsSize32',
     'return{normal:di.tabsSize32,compact:di.tabsSize22,modernUI:di.tabsSize32'),
    ('super("workbench.parts.auxiliarybar",{hasTitle:!0,trailingSeparator:!0',
     'super("workbench.parts.auxiliarybar",{hasTitle:!0,'
     'titleHeight:()=>{let chat=this.getActiveComposite()?.getId().split(".").at(-1)==="triplecode-agents";'
     'this.getContainer()?.classList.toggle("triplecode-chat-title",chat);'
     'return chat?0:void 0},trailingSeparator:!0'),
    ('e.setVisible(!0),!(!this.activeComposite||e.getId()!==this.activeComposite.getId())',
     'e.setVisible(!0),this.getContainer()?.id==="workbench.parts.auxiliarybar"&&this.relayout(),'
     '!(!this.activeComposite||e.getId()!==this.activeComposite.getId())'),
    ('getHeight(o){return di.sidebarSize22}getTemplateId(o){return one.ID}',
     'getHeight(o){return 30}getTemplateId(o){return one.ID}'),
    ("static get HEIGHT(){return di.statusBarSize22}", "static get HEIGHT(){return 32}"),
    (
        "function COs(s,o,e){if(e.skipWelcome)return!1;",
        "function COs(s,o,e){if(e.skipWelcome||"
        "o.getWorkbenchState()===1&&!s.inspect(Wor).userValue)return!1;",
    ),
    (
        '"workbench.welcomePage.walkthroughs.openOnInstall":{scope:2,type:"boolean",default:!0',
        '"workbench.welcomePage.walkthroughs.openOnInstall":{scope:2,type:"boolean",default:!1',
    ),
    (
        "this.stateCache.set(ln.ACTIVITYBAR_HIDDEN.name,this.isActivityBarHidden())",
        "this.stateCache.set(ln.ACTIVITYBAR_HIDDEN.name,"
        "this.isActivityBarHidden()||this.contextService.getWorkbenchState()===1)",
    ),
    (
        "ln.SIDEBAR_SIZE.defaultValue=Math.min(300,r.width/4)",
        "ln.SIDEBAR_SIZE.defaultValue=Math.min(281,Math.max(215,Math.round(r.width*.235)))",
    ),
    (
        "ln.AUXILIARYBAR_SIZE.defaultValue=i?Math.max(300,r.width/2):Math.min(300,r.width/4)",
        "ln.AUXILIARYBAR_SIZE.defaultValue=i?Math.max(300,r.width/2):"
        "Math.min(380,Math.max(280,Math.round(r.width*.32)))",
    ),
    (
        "this.setInitializationValue(ln.SIDEBAR_SIZE,Math.min(300,e.mainContainerDimension.width/4)),"
        "this.setInitializationValue(ln.AUXILIARYBAR_SIZE,Math.min(300,e.mainContainerDimension.width/4))",
        "this.setInitializationValue(ln.SIDEBAR_SIZE,Math.min(281,Math.max(215,Math.round(e.mainContainerDimension.width*.235)))),"
        "this.setInitializationValue(ln.AUXILIARYBAR_SIZE,"
        "Math.min(380,Math.max(280,Math.round(e.mainContainerDimension.width*.32))))",
    ),
    (
        "Vg(ln.PANEL_POSITION.defaultValue)?r.height/3:r.width/4",
        "Vg(ln.PANEL_POSITION.defaultValue)?Math.min(197,Math.round(r.height*.25)):r.width/4",
    ),
):
    if js.count(before) != 1:
        raise SystemExit(f"Expected exactly one Workbench layout anchor: {before}")
    js = js.replace(before, after)

(out / js_name).write_text(js)
shutil.copytree(Path(__file__).with_name("icons"), (out / css_name).parent / "triplecode-icons")
extension = Path(__file__).parents[2] / "extensions/triplecode-mvp"
shutil.copytree(extension / "media/figma-assets/activity-bar", (out / css_name).parent / "triplecode-activity-bar")
with (out / css_name).open("ab") as css:
    for name in ("figma-tokens.css", "theme-bridge.css"):
        css.write(b"\n")
        css.write((extension / "media" / name).read_bytes())
    css.write(b"\n")
    css.write(Path(__file__).with_name("workbench.css").read_bytes())
    css.write(b"\n")
    css.write((extension / "media/tab-surface.css").read_bytes())
    css.write(b"\n")
    css.write((extension / "webview/design-system/components/action-button/action-button.css").read_bytes())

    css.write(b"\n")
    css.write((extension / "webview/design-system/components/activity-bar/activity-bar.css").read_bytes())

for name in (js_name, css_name):
    digest = hashlib.sha256((out / name).read_bytes()).digest()
    product["checksums"][name] = base64.b64encode(digest).decode().rstrip("=")
product_path.write_text(json.dumps(product, indent=2) + "\n")
