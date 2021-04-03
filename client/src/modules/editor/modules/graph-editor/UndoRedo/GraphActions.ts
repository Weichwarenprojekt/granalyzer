import { NodeShapes } from "@/modules/editor/modules/graph-editor/models/NodeShapes";
import { GraphHandler } from "@/modules/editor/modules/graph-editor/GraphHandler";
import { dia, shapes } from "jointjs";
import { Node } from "../models/Node";
import { Relation } from "@/modules/editor/modules/graph-editor/models/Relation";

export class GraphActions {
    /**
     * Add a node to the diagram
     * @param node The node to be added
     * @param gH The GraphHandler instance
     */
    public static addNode(node: Node, gH: GraphHandler): dia.Element {
        // Check if a node of this type was already registered and update the ref
        let index = -1;
        gH.nodes.forEach((value) => {
            if (node.ref.uuid == value.ref.uuid) index = Math.max(index, value.ref.index);
        });
        if (index >= 0) node.ref.index = index + 1;

        // Create the shape
        const shape = NodeShapes.parseType(node.shape);
        shape.position(node.x, node.y);
        shape.resize(100, 60);
        shape.attr({
            body: {
                fill: node.color ? node.color : "#70FF87",
                strokeWidth: 0,
                rx: 4,
                ry: 4,
                class: "node",
            },
            label: {
                text: node.label,
            },
        });

        // Add the shape to the graph and to the other nodes
        gH.nodes.set(shape, node);
        if (gH.graph) shape.addTo(gH.graph);

        return shape;
    }

    /**
     * Removes a node from the diagram
     * @param diagElement The element to be removed
     * @param gH The GraphHandler instance
     */
    public static removeNode(diagElement: dia.Element, gH: GraphHandler): void {
        const nodeRef = gH.nodes.get(diagElement);
        if (!nodeRef) return;

        // Remove the node
        gH.nodes.delete(diagElement);

        // Remove the relations
        gH.relations.forEach((value, key) => {
            if (value.from == nodeRef.ref || value.to == nodeRef.ref) gH.relations.delete(key);
        });

        // Remove the element (and all its relations) from the diagram and re-render
        const diagElements = gH.graph.getElements();
        const elIndex = diagElements.indexOf(diagElement);
        if (elIndex !== -1) {
            diagElements[elIndex].remove();
        }
    }

    /**
     * Add a new relation
     *
     * @param gH The GraphHandler instance
     * @param source The source element
     * @param target The target element
     * @param uuid An optional uuid for the relation
     * @param label An optional label for the label
     */
    public static addRelation(
        gH: GraphHandler,
        source: dia.Element,
        target: dia.Element,
        uuid?: string,
        label?: string,
    ): void {
        // Check if the nodes exist
        const from = gH.nodes.get(source);
        const to = gH.nodes.get(target);
        if (!from || !to) return;

        // Create the node relation
        const relation: Relation = {
            uuid,
            label,
            from: from.ref,
            to: to.ref,
        };

        // Create the link
        const link = new shapes.standard.Link();
        link.source(source);
        link.target(target);
        link.attr({
            line: {
                strokeWidth: 4,
            },
        });
        link.router("manhattan");
        link.connector("rounded");

        // Add the relation to the graph and to the other links
        link.addTo(gH.graph);
        gH.relations.set(link, relation);
    }

    /**
     * Remove a relation
     * @param relation The relation to be removed
     * @param gH The GraphHandler instance
     * @graph graph The graph object
     */
    public static removeRelation(relation: shapes.standard.Link, gH: GraphHandler): void {
        // Remove the relation
        gH.relations.delete(relation);

        // Remove the relation from the diagram and re-render
        const diagRelations = gH.graph.getLinks();
        const relIndex = diagRelations.indexOf(relation);
        if (relIndex !== -1) {
            diagRelations[relIndex].remove();
        }
    }
}
