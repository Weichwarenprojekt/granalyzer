import { RelationInfo } from "./relations/models/RelationInfo";
import { NodeInfo } from "./nodes/models/NodeInfo";
import { SerializableGraph } from "@/modules/editor/modules/graph-editor/controls/models/SerializableGraph";
import { ICommand } from "@/modules/editor/modules/graph-editor/controls/commands/ICommand";
import { JointGraph } from "@/shared/JointGraph";
import { Store } from "vuex";
import { RootState } from "@/store";
import { GraphControls } from "@/modules/editor/modules/graph-editor/controls/GraphControls";
import { RelationModeControls } from "@/modules/editor/modules/graph-editor/controls/relation-mode/RelationModeControls";
import NodesController from "@/modules/editor/modules/graph-editor/controls/nodes/NodesController";
import RelationsController from "@/modules/editor/modules/graph-editor/controls/relations/RelationsController";
import { Relation } from "@/modules/editor/modules/graph-editor/controls/relations/Relation";
import { HeatConfig, HeatConfigType } from "@/modules/editor/modules/heat-map/models/HeatConfig";

export class GraphHandler {
    /**
     * The nodes/elements of the diagram
     */
    public nodes = new NodesController(this);
    /**
     * The relations between the nodes of the diagram
     */
    public relations: RelationsController;
    /**
     * The extended controls for the graph
     */
    public controls: GraphControls;
    /**
     * The controls for the relation mode
     */
    public relationMode: RelationModeControls;
    /**
     *  The redo stack
     */
    private redoStack = new Array<ICommand>();
    /**
     * The undo stack
     */
    private undoStack = new Array<ICommand>();

    /**
     * The heat configurations (Format: <Label>-<AttributeName>, HeatMapAttribute)
     */
    public heatConfigs = new Map<string, HeatConfig>();

    /**
     * Constructor
     *
     * @param store The vuex store
     * @param graph The joint graph object
     */
    constructor(public store: Store<RootState>, public readonly graph: JointGraph) {
        this.relations = new RelationsController(this);

        this.controls = new GraphControls(this);
        this.relationMode = new RelationModeControls(this);

        this.registerPaperEvents();
    }

    /**
     * Create the diagram from the JSON string
     *
     * @param jsonString The diagram json value
     */
    public fromJSON(jsonString: string): void {
        if (!jsonString || jsonString === "{}") return;

        const { nodes, relations, heatConfigs }: SerializableGraph = JSON.parse(jsonString);

        nodes.forEach((node) => {
            // Set default size for diagrams that don't have a saved size
            if (node.size == null) node.size = { width: -1, height: -1 };

            // Create new node
            this.nodes.new(node);
        });

        // Create the relations
        relations.forEach((relation) => {
            // Get source and target nodes of the relation
            const source = this.nodes.getByReference(relation.from.uuid, relation.from.index);
            const target = this.nodes.getByReference(relation.to.uuid, relation.to.index);

            if (source && target) {
                // If both source and target exist, create new relation
                const newRel = this.relations.new(relation, source, target);

                // And set vertices of the new relation, if they were saved
                if (relation.vertices != null) newRel.vertices = relation.vertices;
                if (relation.anchors != null) newRel.anchors = relation.anchors;
            }
        });

        // Restore saved heat configs
        if (heatConfigs)
            Object.entries(heatConfigs).forEach(([key, value]) => {
                const newHeatConfig = JSON.parse(JSON.stringify(value), HeatConfig.reviver);

                // Restore the color map of heat enum config
                if (newHeatConfig.type === HeatConfigType.ENUM) {
                    newHeatConfig.valueColors = new Map<string, string>();
                    newHeatConfig.updateColors();
                }

                return this.heatConfigs.set(key, newHeatConfig);
            });
    }

    /**
     *  Returns the diagram as JSON string
     */
    public toJSON(): string {
        // Prepare the serialization object for each node
        const nodes: Array<NodeInfo> = Array.from(this.nodes, (node) => {
            // Get current position of the element
            return {
                ...node.info,
                z: node.joint.get("z"),
            } as NodeInfo;
        });

        // Map normal and visual relations to an array
        const relations: RelationInfo[] = Array.from(this.relations.savableRelations(), (relation: Relation) => {
            return {
                ...relation.info,
                vertices: relation.vertices,
                anchors: relation.anchors,
                z: relation.joint.get("z"),
            } as RelationInfo;
        });

        // Save heat configs to json object
        const heatConfigs: { [key: string]: HeatConfig } = {};
        this.heatConfigs.forEach((value, key) => (heatConfigs[key] = value));

        // Compose the serializable graph and return the JSON string
        return JSON.stringify({
            nodes,
            relations,
            heatConfigs,
        } as SerializableGraph);
    }

    /**
     * Add a new commando to undo/redo queue
     * @param command Command to be executed
     */
    public addCommand(command: ICommand): void {
        // Add command to the undo list and execute it
        this.undoStack.push(command);
        command.redo();

        // Clear the redo stack
        this.redoStack = [];
    }

    /**
     * Returns if there are redo-actions to perform
     */
    public hasRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     *  Returns if there are undo-actions to perform
     */
    public hasUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * Call the undo action
     */
    public Undo(): void {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
        }
    }

    /**
     * Call the redo action
     */
    public Redo(): void {
        // Get the most recently undone command
        const command = this.redoStack.pop();
        if (command) {
            command.redo();
            this.undoStack.push(command);
        }
    }

    /**
     * Dispatch a new command to the store, so that "saveChange" will also be dispatched
     *
     * @param command The command to be dispatched to the store
     * @param storeAction An optional action string, in case a different action than the default "addCommand" is needed
     */
    public async dispatchCommand(command: ICommand, storeAction = "editor/addCommand"): Promise<void> {
        await this.store.dispatch(storeAction, command);
    }

    /**
     * Remove the focus of other ui fields (input fields etc.)
     * That's important for the toolbar shortcuts to work
     */
    private static removeInputFocus(): void {
        const input = document.activeElement as HTMLElement;
        if (input) input.blur();
    }

    /**
     * Register callbacks to joint js events
     * @private
     */
    private registerPaperEvents(): void {
        this.graph.paper.on({
            // Reset selection when clicking on a blank paper space
            "blank:pointerclick": () => {
                GraphHandler.removeInputFocus();
                // Resetting the selection can not, under any circumstances, be done by calling
                // this.controls.resetSelection()! This leads to unexplainable error after changing the shape of
                // an element.
                this.store.commit("editor/resetSelection");

                // Interrupt drawing visual relations
                this.relationMode.cancelRelationDrawing();
            },
            // Reset the focus of input fields if necessary
            "cell:pointerdown": () => {
                GraphHandler.removeInputFocus();
            },
            // Select node and begin registering a node movement
            "element:pointerdown": async (elementView) => {
                // Handle pointer down on a resize handle
                this.controls.resizeControls.pointerDownCallback(elementView);
                this.controls.startNodeMovement(elementView);
                // Move the select event behind other possible events
                // (e.g. change events of input fields would be fired after otherwise.
                // This is a problem as restyle commands are added within those change commands)
                setTimeout(async () => await this.controls.selectNode(elementView));
            },
            // Stop registering node movement
            "element:pointerup": async (elementView) => {
                // Handle pointer up on a resize handle
                await this.controls.resizeControls.pointerUpCallback(elementView);

                await this.controls.stopNodeMovement();
            },
            // Pass element click to relation mode for handling the drawing of visual relations
            "element:pointerclick": async (elementView, evt, x, y) => {
                await this.relationMode.elementClick(elementView, evt, x, y);
            },
            // Select relation or switch it, depending on the state of the relation mode
            "link:pointerdown": async (linkView) => {
                // Interrupt drawing visual relations
                this.relationMode.cancelRelationDrawing();

                await this.controls.selectRelation(linkView);

                await this.relationMode.switchRelation(linkView);
            },
            // Register BendRelationCommand and display link tools
            "link:mouseenter": (linkView) => {
                // Start dragging a vertex
                this.controls.startBendingRelation(linkView);

                this.controls.showLinkTools(linkView);
            },
            // Stop registering bending of relations and hide link tools
            "link:mouseleave": async (linkView) => {
                await this.controls.stopBendingRelation();

                this.controls.hideLinkTools(linkView);
            },
            // Register changes of relation connections
            "link:connect": async (linkView) => {
                await this.relationMode.connectRelation(linkView);
            },
        });
    }
}
