import { ApiDiagram } from "@/models/ApiDiagram";
import { ActionContext } from "vuex";
import { RootState } from "@/store";
import { GET } from "@/utility";
import ApiNode from "@/models/data-scheme/ApiNode";
import { graphEditor, GraphEditorState } from "@/modules/editor/modules/graph-editor/store";
import { NodeDrag } from "@/shared/NodeDrag";
import { heatMap, HeatMapState } from "@/modules/editor/modules/heat-map/store";

/**
 * The local storage key for the opened diagram in the editor
 */
const currentDiagramKey = "current-diag-id";

export class EditorState {
    /**
     * True if the panels (overview list and tools) shall be hidden
     */
    public hidePanels = false;

    /**
     * True if the toolbox is open (inspector otherwise)
     */
    public toolsOpen = true;

    /**
     * The currently edited diagram
     */
    public diagram?: ApiDiagram;

    /**
     * Replication of the overview item that currently selected
     */
    public selectedNode?: ApiNode;

    /**
     * The dragged node (important for adding new nodes/shapes)
     */
    public draggedNode?: NodeDrag;

    /**
     * Graph editor state
     */
    public graphEditor?: GraphEditorState;

    /**
     * Heat map state
     */
    public heatMap?: HeatMapState;
}

export const editor = {
    namespaced: true,
    state: new EditorState(),
    mutations: {
        /**
         * Set the active diagram object
         */
        setActiveDiagram(state: EditorState, diagram?: ApiDiagram): void {
            state.diagram = diagram;
            if (diagram) {
                localStorage.setItem(currentDiagramKey, diagram.diagramId);
                state.hidePanels = false;
            } else state.hidePanels = true;
        },

        /**
         * Set selected item
         */
        setSelectedNode(state: EditorState, node?: ApiNode): void {
            state.selectedNode = node;
        },

        /**
         * Set dragged item
         */
        setDraggedNode(state: EditorState, node?: NodeDrag): void {
            state.draggedNode = node;
            if (node) state.graphEditor?.graphHandler?.graph.createDragNode(node);
        },

        /**
         * Open either the toolbox or the inspector
         */
        openTools(state: EditorState, toolsOpen: boolean): void {
            state.toolsOpen = toolsOpen;
        },
    },
    actions: {
        /**
         * Loads the ID of the most recently opened diagram from LocalStorage,
         * fetches the diagram from the REST backend and sets it as the
         * active diagram
         */
        async fetchActiveDiagram(context: ActionContext<EditorState, RootState>): Promise<void> {
            // Get active diagram ID
            const id = localStorage.getItem(currentDiagramKey);
            if (!id) {
                context.commit("setActiveDiagram");
                return;
            }

            // Fetch the diagram model from the REST backend
            const result = await GET(`/api/diagrams/${id}`);

            // Unable to fetch diagram, remove ID from LocalStorage
            if (result.status !== 200) {
                context.commit("setActiveDiagram");
                localStorage.removeItem(currentDiagramKey);
                return;
            }

            // Set the active diagram
            const diagram: ApiDiagram = await result.json();
            context.commit("setActiveDiagram", diagram);
        },
    },
    modules: {
        graphEditor,
        heatMap,
    },
};
