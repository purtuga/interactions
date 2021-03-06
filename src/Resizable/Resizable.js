import {objectExtend} from "@purtuga/common/src/jsutils/objectExtend.js"
import {dataStore} from "@purtuga/common/src/jsutils/dataStore.js"
import {eventful} from "@purtuga/common/src/jsutils/Ev-decorator.js"
import {domAddEventListener} from "@purtuga/common/src/domutils/domAddEventListener.js"
import {BaseClass} from "@purtuga/common/src/jsutils/BaseClass.js"
import {
    createElement,
    doc
} from "@purtuga/common/src/jsutils/runtime-aliases.js";
//========================================================================
const PRIVATE = dataStore.create();
const EV_RESIZE = "resize";
const EV_START = `${EV_RESIZE}-start`;
const EV_END = `${EV_RESIZE}-end`;
const HANDLE_OPTIONS = [
    "nHandle",
    "neHandle",
    "eHandle",
    "seHandle",
    "sHandle",
    "swHandle",
    "wHandle",
    "nwHandle"
];
const IS_NORTH_SOUTH_MOVEMENT = /^[ns]H/;
const IS_EAST_WEST_MOVEMENT = /^[ew]H/;
const IS_TOUCH = /^touch/;
const RETURN_FALSE = () => false;
const handleTemplate = createElement("template");

handleTemplate.innerHTML = `<div handle></div>`;

/**
 * Utility to make a given DOM element resizable by dragging its edges.
 *
 * @class Resizable
 * @extends BaseClass
 * @implements MinimalEventEmitter
 *
 * @param {Object} options
 *
 * @param {HTMLElement} options.ele
 *
 * @param {HTMLElement} [options.minWidth=50]
 *
 * @param {HTMLElement} [options.minHeight=50]
 *
 * @param {String} [options.handleClassPrefix="handle"]
 *  The CSS Prefix for the handles. Used only on handles whose configuration (see below) is `true`;
 *
 * @param {Boolean|String|HTMLElement} [options.nHandle=false]
 *  The top (n = North) drag handle. The following option values applies to all handles:
 *  -   `Boolean`: indicating if handle should be used or not. In such case,
 *      this utility will insert its own markup to represent the handle.
 *      Note that this option will require that Styles be added to the page in order
 *      to ensure the handles are styles correctly.
 *  -   `String`: a selector identifing the drag handle (selector is applied
 *       to `options.ele`)
 *  -   `HTMLElement`: An HTML element
 * @param {Boolean|String|HTMLElement} [options.neHandle=false]
 * @param {Boolean|String|HTMLElement} [options.eHandle=true]
 * @param {Boolean|String|HTMLElement} [options.seHandle=true]
 * @param {Boolean|String|HTMLElement} [options.sHandle=true]
 * @param {Boolean|String|HTMLElement} [options.swHandle=false]
 * @param {Boolean|String|HTMLElement} [options.wHandle=false]
 * @param {Boolean|String|HTMLElement} [options.nwHandle=false]
 *
 * @fires Resizable#resize-start
 * @fires Resizable#resize-end
 * @fires Resizable#resize
 */
@eventful()
class Resizable extends BaseClass {
    constructor(options) {
        super();

        let inst = {
            opt: objectExtend({}, this.constructor.defaults, options)
        };

        PRIVATE.set(this, inst);
        inst.opt.ele.ondragstart = RETURN_FALSE;
        this.emit = this.emit.bind(this);
        setupHandles.call(this);
    }

    setHandle() {} // FIXME: implement
}

function setupHandles() {
    let inst = PRIVATE.get(this);
    let opt = inst.opt;
    let handleEle;

    HANDLE_OPTIONS.forEach(handle => {
        handleEle = null;
        const handleType = typeof opt[handle];

        if (!opt[handle]) {
            return;
        } else if ("boolean" === handleType) {
            handleEle = document.importNode(handleTemplate.content, true).firstChild;
            handleEle.setAttribute("class", `${opt.handleClassPrefix} ${opt.handleClassPrefix}-${handle.substr(0, handle.indexOf("H"))}`);
            opt.ele.appendChild(handleEle);

        } else if ("string" === handleType) {
            handleEle = opt.ele.querySelector(opt[handle]);
            if (!handleEle) {
                return;
            }
        } else if (!opt[handle].addEventListener) {
            return;
        } else {
            handleEle = opt[handle];
        }

        inst[handle] = addEventHandlingToHandle.call(this, {
            handle: handleEle,
            movement: IS_EAST_WEST_MOVEMENT.test(handle)
                ? "ew"
                : IS_NORTH_SOUTH_MOVEMENT.test(handle)
                    ? "ns"
                    : "all"
        });
    });
}

/**
 * Adds event handling to a give handle.
 *
 * @param {Object} options
 * @param {HTMLElement} options.handle
 * @param {Object} [options.movement="all"]
 *  The type of movement the handle allows. Valid values are:
 *
 *  -   `all`: All directions (north-south/east-west)
 *  -   `ns`: vertically only (north south)
 *  -   `ew`: Horizontally only (east west)
 *
 * @return {Object}
 *  An object containing a `.remove()` method that can be used to
 *  destruct all event handlers
 */
function addEventHandlingToHandle({ handle, movement = "all" }) {
    const { opt: { ele: resizableEle, minWidth, minHeight } } = PRIVATE.get(this);
    const emit = this.emit;
    const domEvents = {};
    let boxWidth;
    let boxHeight;
    let handleX;
    let handleY;

    let resizeWhenMouseMoves = mouseEvent => {
        let newWidth = boxWidth + (getEventPointerPosition(mouseEvent, "x") - handleX);
        let newHeight = boxHeight + (getEventPointerPosition(mouseEvent, "y") - handleY);
        let fireEvent = false;

        if (newWidth >= minWidth && (movement === "all" || movement === "ew")) {
            resizableEle.style.width = newWidth + "px";
            fireEvent = true;
        }

        if (newHeight >= minHeight && (movement === "all" || movement === "ns")) {
            resizableEle.style.height = newHeight + "px";
            fireEvent = true;
        }

        if (fireEvent) {
            /**
             * Element was resized
             *
             * @event Resizable#resize
             */
            emit(EV_RESIZE);
        }

        mouseEvent.stopPropagation();
        mouseEvent.preventDefault();
        return false;
    };
    let stopResizing = (/*ev*/) => {
        let fireEvent = false;

        if (domEvents.mousemove) {
            domEvents.mousemove.remove();
            domEvents.mousemove = null;
            fireEvent = true;
        }

        if (domEvents.mouseup) {
            domEvents.mouseup.remove();
            domEvents.mouseup = null;
            fireEvent = true;
        }

        if (fireEvent) {
            /**
             * Resizing of element has ended (user released the mouse (mouseup).
             *
             * @event Resizable#resize-end
             */
            emit(EV_END);
        }
    };

    domEvents.mousedown = domAddEventListener(
        handle,
        "mousedown touchstart",
        handleEle => {
            // FIXME: check if mouse is still down. Edge case: user tabs between windows while mosue is down.

            boxWidth = resizableEle.clientWidth;
            boxHeight = resizableEle.clientHeight;
            handleX = getEventPointerPosition(handleEle, "x"); // handleEle.clientX;
            handleY = getEventPointerPosition(handleEle, "y"); //handleEle.clientY;

            domEvents.mouseup = domAddEventListener(
                doc,
                "mouseup touchend",
                stopResizing,
                false
            );

            domEvents.mousemove = domAddEventListener(
                doc,
                "mousemove touchmove",
                resizeWhenMouseMoves,
                false
            );

            /**
             * Resizing of element is about to start (user moused down on handle)
             *
             * @event Resizable#resize-start
             */
            emit(EV_START);
        },
        false
    );

    return Object.create({
        remove() {
            Object.keys(domEvents).forEach(evName => {
                if (domEvents[evName]) {
                    domEvents[evName].remove();
                    domEvents[evName] = null;
                }
            });
        }
    });
}

function getEventPointerPosition(event, type) {
    const coordinates =
        IS_TOUCH.test(event.type) && event.targetTouches
            ? event.targetTouches.item(0)
            : event;
    return coordinates[`client${type.toUpperCase()}`];
}

Resizable.defaults = {
    ele: null,
    minWidth: 50,
    minHeight: 50,
    handleClassPrefix: "handle",
    // FIXME: support `maxWidth` of px + keyword like `parent` or maybe juust a % (implies parent)
    // FIXME: support `maxHeight` of px + keyword like `parent` or maybe just a % (which would imply parent)
    // drag handles
    nHandle: false,
    neHandle: false,
    eHandle: true,
    seHandle: true,
    sHandle: true,
    swHandle: false,
    wHandle: false,
    nwHandle: false
};

export { Resizable };
export default Resizable;
