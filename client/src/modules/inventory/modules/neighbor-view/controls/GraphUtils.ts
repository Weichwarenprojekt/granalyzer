import { dia, shapes } from "jointjs";
import { NodeInfo } from "@/modules/editor/modules/graph-editor/controls/nodes/models/NodeInfo";
import ApiNode from "@/models/data-scheme/ApiNode";
import { Store } from "vuex";
import { RootState } from "@/store";
import ApiRelation from "@/models/data-scheme/ApiRelation";
import { getFontColor } from "@/utility";
import { JointGraph } from "@/shared/JointGraph";
import { RelationInfo } from "@/modules/editor/modules/graph-editor/controls/relations/models/RelationInfo";

/**
 * Provides key functionality for placing nodes and relations
 */
export class GraphUtils {
    /**
     * Maps the uuid of a node to the id of a diagram shape
     */
    public mappedNodes = new Map<string, string | number>();

    /**
     * Maps the uuid of a relation to the id of a diagram link
     */
    public mappedRelations = new Map<string, string | number>();

    /**
     * Distance between two nodes on a circle
     */
    private stepDistance = 0;

    /**
     * Amount of neighbors already placed
     */
    private neighborsPlaced = 0;

    /**
     * Radius of the circle
     */
    private radius = 0;

    /**
     * Current x position of the shape to be placed
     */
    private currentX = 0;

    /**
     * Current y position of the shape to be placed
     */
    private currentY = 0;

    /**
     *  True, if first node (origin) has been placed
     */
    private rootNodeSet = false;

    /**
     * Constructor
     *
     * @param graph Graph to place nodes/relations into
     * @param store Root Store
     */
    constructor(public readonly graph: JointGraph, private store: Store<RootState>) {
        this.registerNodeInteraction();
    }

    /**
     * Transforms an ApiNode to a node, creates a shape and places it in the graph
     *
     * @param apiNode Node to be placed into the diagram
     * @Return Returns the shape that was added to the graph
     */
    public addNodeToDiagram(apiNode: ApiNode): dia.Element {
        this.calculateNewPosition();

        // Add the shape
        const shape = new shapes.standard.Rectangle();
        this.mappedNodes.set(apiNode.nodeId, shape.id);

        // Position and style the shape
        shape.position(this.currentX, this.currentY);
        const color = this.store.state.overview?.labelColor.get(apiNode.label)?.color ?? "#70FF87";
        shape.attr({
            label: {
                text: apiNode.name,
                textAnchor: "middle",
                textVerticalAnchor: "middle",
                fill: getFontColor(color),
                class: "node-text",
            },
            body: {
                ref: "label",
                fill: color,
                strokeWidth: 1,
                rx: 4,
                ry: 4,
                refWidth: 32,
                refHeight: 16,
                refX: -16,
                refY: -8,
                class: "node-body",
            },
        });

        shape.addTo(this.graph.graph);
        shape.attr("body/strokeWidth", 0);
        if (!this.rootNodeSet) this.graph.selectElement(this.graph.paper.findViewByModel(shape.id));
        this.rootNodeSet = true;
        return shape;
    }

    /**
     * Sets the focus on the node which is currently edited in the inspector
     */
    public setEditedNodeFocus(): void {
        const editedNode = this.store.state.inspector?.element;
        if (editedNode && editedNode instanceof ApiNode) {
            const shapeID = this.mappedNodes.get(editedNode.nodeId);
            if (shapeID) this.graph.selectElement(this.graph.paper.findViewByModel(shapeID));
        }
    }

    /**
     * Transforms an ApiRelation to a node, creates a link and places it in the graph
     *
     * @param apiRelation Relation to be placed in the diagram
     */
    public addRelationToDiagram(apiRelation: ApiRelation): shapes.standard.Link | undefined {
        // Prevent duplicate relations
        if (this.mappedRelations.has(apiRelation.relationId)) return;

        // Get direction of the relation
        const source = this.getShapeById(apiRelation.from);
        const target = this.getShapeById(apiRelation.to);
        if (!(source && target)) return;

        const link = new shapes.standard.Link();
        this.mappedRelations.set(apiRelation.relationId, link.id);

        link.source(source);
        link.target(target);
        link.attr({
            line: { strokeWidth: 4 },
        });

        if (apiRelation.type)
            link.appendLabel({
                attrs: {
                    text: { text: apiRelation.type, textAnchor: "middle", textVerticalAnchor: "middle", fill: "#fff" },
                    rect: {
                        ref: "text",
                        fill: "#333",
                        stroke: "#000",
                        strokeWidth: 0,
                        refX: "-10%",
                        refY: "-4%",
                        refWidth: "120%",
                        refHeight: "108%",
                        rx: 0,
                        ry: 0,
                    },
                },
            });
        link.addTo(this.graph.graph);

        return link;
    }

    /**
     * Define a fitting distance between nodes for the circular alignment
     *
     * @param nNeighbors Amount of neighbor nodes to be placed
     */
    public setStepDistance(nNeighbors: number): void {
        this.stepDistance = (2 * Math.PI) / nNeighbors;
        this.radius = nNeighbors > 9 ? nNeighbors * 50 : nNeighbors > 3 ? 500 : 300;
    }

    /**
     * Reset the positioning of nodes in the graph
     */
    public resetNeighborPlacement(): void {
        this.neighborsPlaced = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.rootNodeSet = false;
    }

    /**
     * Clears the mapped nodes and relations of the previous graph
     */
    public resetGraph(): void {
        this.mappedNodes.clear();
        this.mappedRelations.clear();
        this.graph.graph.clear();
    }

    /**
     * Finds the node id that corresponds to a shape id
     *
     * @param id Id of the shape
     */
    public async getNodeByShapeId(id: string): Promise<ApiNode | undefined> {
        const nodeId = [...this.mappedNodes].find(([, value]) => value === id);
        if (!nodeId) return undefined;
        return await this.store.dispatch("inventory/getNode", nodeId[0]);
    }

    /**
     * Returns the diagram-shape that belongs to a node
     *
     * @param id Id of the node that is supposed to be in the graph
     * @private
     */
    private getShapeById(id: string): dia.Element | undefined {
        const shapeId = this.mappedNodes.get(id);
        if (shapeId) return this.graph.graph.getCell(shapeId) as dia.Element;
        return undefined;
    }

    /**
     * Adjust the x and y position for the next node
     */
    private calculateNewPosition(): void {
        if (!this.rootNodeSet) return;
        const alpha = this.stepDistance * this.neighborsPlaced++ - 0.5 * Math.PI;
        this.currentX = this.radius * Math.cos(alpha);
        this.currentY = this.radius * Math.sin(alpha);
    }

    /**
     * Listen for node move events
     */
    private registerNodeInteraction(): void {
        // Change centered element of neighborhood graph on double click
        this.graph.paper.on("element:pointerdblclick", async (cell) => {
            if (!this.store.state.inventory) return;
            if (this.store.state.inventory.loading) return;

            const node = await this.getNodeByShapeId(cell.model.id);

            this.store.commit("inventory/setSelectedNode", node);
        });

        // Make links selectable and show them in the inspector on click
        this.graph.paper.on("link:pointerdown", async (cell) => {
            const relationId = [...this.mappedRelations].find(([, value]) => value === cell.model.id);
            if (relationId) {
                await this.store.dispatch("inspector/selectRelation", {
                    uuid: relationId[0],
                    includeDefaults: false,
                });
                this.graph.selectElement(cell);
            }
        });

        // Make nodes selectable and show them in the inspector on click
        this.graph.paper.on("element:pointerdown", async (cell) => {
            const nodeId = [...this.mappedNodes].find(([, value]) => value === cell.model.id);
            if (nodeId) {
                await this.store.dispatch("inspector/selectNode", {
                    uuid: nodeId[0],
                    includeDefaults: false,
                });
                this.graph.selectElement(cell);
            }
        });
    }

    /**
     *  Returns the diagram as JSON string
     */
    public serializeToDiagram(): string {
        if (!this.store?.state?.inventory) return "";

        // Prepare the serialization object for each node
        const nodes: Array<NodeInfo> = Array.from(
            [this.store.state.inventory.selectedNode as ApiNode, ...this.store.state.inventory.neighbors],
            (node) => {
                const diagEl = this.getShapeById(node.nodeId);

                // Get color, size, and position of the diagram element
                const color = this.store.state.overview?.labelColor.get(node.label)?.color;
                const size = diagEl ? this.graph.sizeOf(diagEl) : { width: 200, height: 30 };
                const pos = diagEl ? diagEl.position() : { x: 0, y: 0 };

                return {
                    label: node.label,
                    ref: {
                        index: 0,
                        uuid: node.nodeId,
                    },
                    name: node.name,
                    labelColor: color,
                    shape: "rectangle",
                    x: pos.x - size.width / 2,
                    y: pos.y - size.height / 2,
                    size: size,
                };
            },
        );

        // Define lambda for mapping relations
        const relationMapFn = (link: dia.Link) => {
            const relation = this.store.state.inventory?.relations.filter(
                (rel) => this.mappedRelations.get(rel.relationId) === link.id,
            )[0] as ApiRelation;
            return {
                uuid: relation.relationId,
                from: {
                    uuid: relation.from,
                    index: 0,
                },
                to: {
                    uuid: relation.to,
                    index: 0,
                },
                name: relation.type,
                vertices: link.vertices(),
            } as RelationInfo;
        };

        // Map normal and visual relations to an array
        const relations: RelationInfo[] = Array.from(this.graph.graph.getLinks(), relationMapFn);

        // Compose the serializable graph and return the JSON string
        return JSON.stringify({
            nodes,
            relations,
        });
    }
}
