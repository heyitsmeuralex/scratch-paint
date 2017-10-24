import paper from '@scratch/paper';
import Modes from '../../modes/modes';
import {styleShape} from '../style-path';
import {clearSelection, deleteSelection} from '../selection';
import BoundingBoxTool from '../selection-tools/bounding-box-tool';

/**
 * Tool for drawing rectangles.
 */
class RectTool extends paper.Tool {
    static get TOLERANCE () {
        return 6;
    }
    /**
     * @param {function} setSelectedItems Callback to set the set of selected items in the Redux state
     * @param {function} clearSelectedItems Callback to clear the set of selected items in the Redux state
     * @param {!function} onUpdateSvg A callback to call when the image visibly changes
     */
    constructor (setSelectedItems, clearSelectedItems, onUpdateSvg) {
        super();
        this.clearSelectedItems = clearSelectedItems;
        this.onUpdateSvg = onUpdateSvg;
        this.prevHoveredItemId = null;
        this.boundingBoxTool = new BoundingBoxTool(Modes.RECT, setSelectedItems, clearSelectedItems, onUpdateSvg);
        
        // We have to set these functions instead of just declaring them because
        // paper.js tools hook up the listeners in the setter functions.
        this.onMouseDown = this.handleMouseDown;
        this.onMouseDrag = this.handleMouseDrag;
        this.onMouseUp = this.handleMouseUp;
        this.onKeyUp = this.handleKeyUp;

        this.rect = null;
        this.colorState = null;
        this.isBoundingBoxMode = null;
    }
    getHitOptions () {
        return {
            segments: true,
            stroke: true,
            curves: true,
            fill: true,
            guide: false,
            match: hitResult =>
                (hitResult.item.data && hitResult.item.data.isHelperItem) ||
                hitResult.item.selected, // Allow hits on bounding box and selected only
            tolerance: RectTool.TOLERANCE / paper.view.zoom
        };
    }
    /**
     * Should be called if the selection changes to update the bounds of the bounding box.
     * @param {Array<paper.Item>} selectedItems Array of selected items.
     */
    onSelectionChanged (selectedItems) {
        this.boundingBoxTool.onSelectionChanged(selectedItems);
    }
    setColorState (colorState) {
        this.colorState = colorState;
    }
    handleMouseDown (event) {
        if (this.boundingBoxTool.onMouseDown(event, false /* clone */, false /* multiselect */, this.getHitOptions())) {
            this.isBoundingBoxMode = true;
        } else {
            this.isBoundingBoxMode = false;
            clearSelection(this.clearSelectedItems);
        }
    }
    handleMouseDrag (event) {
        if (event.event.button > 0) return; // only first mouse button

        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseDrag(event);
            return;
        }

        if (this.rect) {
            this.rect.remove();
        }

        const rect = new paper.Rectangle(event.downPoint, event.point);
        if (event.modifiers.shift) {
            rect.height = rect.width;
        }
        this.rect = new paper.Path.Rectangle(rect);
        
        if (event.modifiers.alt) {
            this.rect.position = event.downPoint;
        }
        
        styleShape(this.rect, this.colorState);
    }
    handleMouseUp (event) {
        if (event.event.button > 0) return; // only first mouse button
        
        if (this.isBoundingBoxMode) {
            this.boundingBoxTool.onMouseUp(event);
            this.isBoundingBoxMode = null;
            return;
        }

        if (this.rect) {
            if (this.rect.area < RectTool.TOLERANCE / paper.view.zoom) {
                // Tiny rectangle created unintentionally?
                this.rect.remove();
                this.rect = null;
            } else {
                this.rect.selected = true;
                this.boundingBoxTool.setSelectionBounds();
                this.onUpdateSvg();
                this.rect = null;
            }
        }
    }
    handleKeyUp (event) {
        // Backspace, delete
        if (event.key === 'delete' || event.key === 'backspace') {
            deleteSelection(Modes.RESHAPE, this.onUpdateSvg);
            this.boundingBoxTool.removeBoundsPath();
        }
    }
    deactivateTool () {
        this.boundingBoxTool.removeBoundsPath();
    }
}

export default RectTool;
