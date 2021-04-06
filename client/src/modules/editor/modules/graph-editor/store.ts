import { GraphHandler } from "@/modules/editor/modules/graph-editor/undo-redo/GraphHandler";
import { ActionContext } from "vuex";
import { RootState } from "@/store";
import { Node } from "./undo-redo/models/Node";
import { Diagram } from "@/models/Diagram";
import { CreateNodeCommand } from "./undo-redo/commands/CreateNodeCommand";
import { dia } from "jointjs";
import { RemoveNodeCommand } from "@/modules/editor/modules/graph-editor/undo-redo/commands/RemoveNodeCommand";
import { GET } from "@/utility";
import { Relation } from "./undo-redo/models/Relation";
import { MoveNodeCommand } from "@/modules/editor/modules/graph-editor/undo-redo/commands/MoveNodeCommand";

export class GraphEditorState {
    /**
     * The graph handler
     */
    public graphHandler?: GraphHandler;

    /**
     * The diagram element which has been clicked most recently
     */
    public selectedElement?: dia.Element;

    /**
     * Old X-Coordinate of the unselected element
     */
    public oldX?: number;

    /**
     * Old Y-Coordinate of the unselected element
     */
    public oldY?: number;

    /**
     * The move command
     */
    public moveCommand?: MoveNodeCommand;
}

export const graphEditor = {
    state: new GraphEditorState(),
    mutations: {
        /**
         * Set the active diagram handler
         */
        setGraphHandler(state: GraphEditorState, graphHandler: GraphHandler): void {
            state.graphHandler = graphHandler;
        },
        /**
         * Set the active diagram
         */
        setDiagram(state: GraphEditorState, diagram: Diagram): void {
            if (state.graphHandler) state.graphHandler.fromJSON(diagram.serialized);
        },

        /**
         * Set the clicked diagram element
         */
        setClickedItem(state: GraphEditorState, diagElement?: dia.Element): void {
            state.selectedElement = diagElement;

            if (state.graphHandler && diagElement) {
                state.oldX = diagElement.attributes.position.x;
                state.oldY = diagElement.attributes.position.y;
                state.moveCommand = new MoveNodeCommand(state.graphHandler, diagElement);
            }
        },

        /**
         * Set the unselected diagram element
         */
        setReleasedItem(state: GraphEditorState, diagElement?: dia.Element): void {
            if (state.moveCommand && state.graphHandler && diagElement) {
                const newX = diagElement.attributes.position.x;
                const newY = diagElement.attributes.position.y;

                // Only fire the command when there was an actual element drag
                if (state.oldX != newX || state.oldY != newY) {
                    state.moveCommand.setNodeStopPos(newX, newY);
                    state.graphHandler.addCommand(state.moveCommand);
                }
            }
        },

        /**
         * Change the active diagram
         */
        undo(state: GraphEditorState): void {
            state.graphHandler?.Undo();
        },
        /**
         * Set selected item
         */
        redo(state: GraphEditorState): void {
            state.graphHandler?.Redo();
        },
        /**
         * Add a node
         */
        addNode(state: GraphEditorState, payload: [node: Node, rels: Relation[]]): void {
            if (state.graphHandler) {
                const command = new CreateNodeCommand(state.graphHandler, payload[0], payload[1]);
                state.graphHandler.addCommand(command);
            }
        },

        /**
         * Remove a node
         */
        removeNode(state: GraphEditorState): void {
            if (state.graphHandler && state.selectedElement) {
                const command = new RemoveNodeCommand(state.graphHandler, state.selectedElement);
                state.graphHandler.addCommand(command);
            }
            state.selectedElement = undefined;
        },

        /**
         * Save the data to backend
         */
        saveChange(state: GraphEditorState): void {
            const graph = state.graphHandler?.toJSON();
            // Log the graph as a nested object so that it doesn't completely cover the console
            console.log({
                msg: "Saved graph",
                graph: {
                    value: graph,
                },
            });
            // TODO: Save JSON config with REST backend!
        },
    },
    actions: {
        /**
         * Undo a change
         */
        async undo(context: ActionContext<GraphEditorState, RootState>): Promise<void> {
            context.commit("saveChange");
            context.commit("undo");
        },
        /**
         * Redo a change
         */
        async redo(context: ActionContext<GraphEditorState, RootState>): Promise<void> {
            context.commit("saveChange");
            context.commit("redo");
        },
        /**
         * Add a node with its relations
         */
        async addNode(context: ActionContext<GraphEditorState, RootState>, node: Node): Promise<void> {
            context.commit("saveChange");

            // Model to represent the api response todo move type to separate class
            type ApiRelation = { start: string; end: string; id: string; type: string };

            // Perform api request
            const res = await GET("/api/nodes/" + node.ref.uuid + "/relations");
            const newVar: ApiRelation[] = await res.json();

            // Transform relations from api into Relation objects
            const rels: Relation[] = newVar.map((rel) => {
                return {
                    from: { uuid: rel.start, index: 0 },
                    to: { uuid: rel.end, index: 0 },
                    uuid: rel.id,
                    type: rel.type,
                };
            });

            context.commit("addNode", [node, rels]);
        },

        /**
         * Remove a node
         */
        async removeNode(context: ActionContext<GraphEditorState, RootState>): Promise<void> {
            context.commit("saveChange");
            context.commit("removeNode");
        },
    },
    getters: {
        /**
         * @return True if undo is available
         */
        undoAvailable(state: GraphEditorState): boolean {
            if (state.graphHandler) return state.graphHandler.hasUndo();
            else return false;
        },
        /**
         * @return True if redo is available
         */
        redoAvailable(state: GraphEditorState): boolean {
            if (state.graphHandler) return state.graphHandler.hasRedo();
            else return false;
        },

        /**
         *@return True if element is being in selection
         */
        itemSelected(state: GraphEditorState): boolean {
            return state.selectedElement !== undefined;
        },
    },
};
