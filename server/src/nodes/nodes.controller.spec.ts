/**
 * @group db/nodes/controller
 */

import { TestingModule } from "@nestjs/testing";
import { NodesController } from "./nodes.controller";
import { Neo4jService } from "nest-neo4j/dist";
import { NodesService } from "./nodes.service";
import Node from "./node.model";
import { NumberAttribute, StringAttribute } from "../data-scheme/models/attributes";
import { InternalServerErrorException } from "@nestjs/common";
import Relation from "../relations/relation.model";
import { RelationType } from "../data-scheme/models/relationType";
import { Connection } from "../data-scheme/models/connection";
import { NodesRelationsService } from "./nodes-relations.service";
import TestUtil from "../util/test.util";
import { DatabaseUtil } from "../util/database.util";
import { LabelScheme } from "../data-scheme/models/labelScheme";

describe("NodesController", () => {
    let module: TestingModule;

    let service: NodesService;
    let neo4jService: Neo4jService;
    let controller: NodesController;
    let databaseUtil: DatabaseUtil;

    let movieNodeId;
    let validNodeId;
    let nmNodeID;

    beforeAll(async () => {
        // Create main module for testing
        module = await TestUtil.createTestingModule([NodesService, NodesRelationsService], [NodesController]);

        controller = module.get<NodesController>(NodesController);
        service = module.get<NodesService>(NodesService);
        neo4jService = module.get<Neo4jService>(Neo4jService);
        databaseUtil = module.get<DatabaseUtil>(DatabaseUtil);

        await databaseUtil.initDatabase();
    });

    beforeEach(async () => {
        const movieLabel = new LabelScheme("Movie", "#EEE", [
            new NumberAttribute("attrOne", true, 1900),
            new StringAttribute("attrTwo", false, "empty"),
        ]);
        movieLabel.name = await writeLabel(movieLabel);

        const validLabel = new LabelScheme("validLabel", "#222", [
            new NumberAttribute("attrOne", true, 1900),
            new StringAttribute("attrTwo", true, "empty"),
        ]);
        validLabel.name = await writeLabel(validLabel);

        const nmLabel = new LabelScheme("nmLabel", "#424", [
            new NumberAttribute("attrOne", false, null),
            new StringAttribute("attrTwo", false, null),
            new StringAttribute("attrThree", false, null),
        ]);
        nmLabel.name = await writeLabel(nmLabel);

        const movieNode = new Node("Avengers", "Movie", { attrOne: 1990, attrTwo: "GER" });
        movieNode.nodeId = await writeNode(movieNode);
        movieNodeId = movieNode.nodeId;

        const validNode = new Node("ValidNode", "validLabel", { attrOne: 1234, attrTwo: "HansPeter" });
        validNode.nodeId = await writeNode(validNode);
        validNodeId = validNode.nodeId;

        const nmNode = new Node("nmNode", "nmLabel", { attrOne: 42, attrTwo: "GER" });
        nmNode.nodeId = await writeNode(nmNode);
        nmNodeID = nmNode.nodeId;

        /**
         * Mock relations
         */

        const hobbitRelation = new RelationType(
            "isHobbitOf",
            [new StringAttribute("attrOne", false)],
            [new Connection(movieLabel.name, validLabel.name)],
        );
        hobbitRelation.name = await writeRelationType(hobbitRelation);

        const validRelation = new Relation("isHobbitOf", movieNode.nodeId, validNode.nodeId, { attrOne: "Gandalf" });
        validRelation.relationId = await writeRelation(validRelation);

        const invalidRelation = new Relation("isHobbitOf", validNode.nodeId, validNode.nodeId, {
            attrOne: "Hermione Granger",
        });
        invalidRelation.relationId = await writeRelation(invalidRelation);
    });

    afterEach(async () => {
        await databaseUtil.clearDatabase();
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
        expect(service).toBeDefined();
        expect(neo4jService).toBeDefined();
    });

    describe("getNode", () => {
        it("should get one node", async () => {
            expect((await controller.getNode(movieNodeId)).name).toBe("Avengers");
        });

        it("should throw an exception", async () => {
            // Create specific data which should cause the failure
            const threePropsLabel = new LabelScheme("ThreeProps", "#333", [
                new NumberAttribute("attrOne", true, 1900),
                new StringAttribute("attrTwo", true, "empty"),
                new StringAttribute("attrThree", true, "empty"),
            ]);
            threePropsLabel.name = await writeLabel(threePropsLabel);

            const missingAttributeNode = new Node("MissingNode", "ThreeProps", { attrOne: 1234, attrTwo: "Alfons" });
            missingAttributeNode.nodeId = await writeNode(missingAttributeNode);

            await expect(controller.getNode(missingAttributeNode.nodeId)).rejects.toThrowError(
                InternalServerErrorException,
            );
        });

        it("should return the attribute the right datatypes", async () => {
            const resultNode = await controller.getNode(validNodeId);

            expect(typeof resultNode.attributes.attrOne).toBe("number");
            expect(typeof resultNode.attributes.attrTwo).toBe("string");
        });

        it("should return the node, that has no attributes", async () => {
            const mandaNode = await controller.getNode(nmNodeID);

            expect(mandaNode.attributes.attrOne).toEqual(42);
            expect(mandaNode.attributes.attrTwo).toEqual("GER");
            expect(mandaNode.attributes.attrThree).toBeUndefined();
        });
    });

    describe("getAllNodes", () => {
        it("should return more than one node", async () => {
            expect((await controller.getAllNodes()).length).toBeGreaterThan(1);
        });

        it("should return one node", async () => {
            expect((await controller.getAllNodes(1, 1)).length).toBe(1);
        });

        it("should return the node with given search term", async () => {
            expect((await controller.getAllNodes(20, 0, "Avengers", ["Movie", "validLabel"])).length).toBe(1);
        });
    });

    describe("getRelationsOfNode", () => {
        it("should return all valid relations of the node", async () => {
            const relations: Relation[] = await controller.getRelationsOfNode(movieNodeId);

            // Second relation of the node is not valid -> only one is returned
            expect(relations.length).toEqual(1);
            expect(relations[0].from).toEqual(movieNodeId);
            expect(relations[0].to).toEqual(validNodeId);
        });
    });

    /**
     * Helper functions
     */

    function writeLabel(l: LabelScheme): Promise<string> {
        // language=cypher
        const cypher = `
          CREATE (l:LabelScheme {name: $labelName})
          SET l.color = $color, l.attributes = $attribs
          RETURN l {. *} AS label`;

        const params = {
            labelName: l.name,
            color: l.color,
            attribs: JSON.stringify(l.attributes),
        };

        const resolveWrite = (res) => {
            return res.records[0].get("label").name;
        };
        return neo4jService
            .write(cypher, params, process.env.DB_TOOL)
            .then(resolveWrite)
            .catch(databaseUtil.catchDbError);
    }

    function writeRelationType(r: RelationType): Promise<string> {
        // language=cypher
        const cypher = `
          CREATE (rt:RelationType {name: $relType})
          SET rt.attributes = $attribs, rt.connections = $connects
          RETURN rt {. *}`;

        const params = {
            relType: r.name,
            attribs: JSON.stringify(r.attributes),
            connects: JSON.stringify(r.connections),
        };

        return neo4jService
            .write(cypher, params, process.env.DB_TOOL)
            .then((res) => res.records[0].get("rt").name)
            .catch(databaseUtil.catchDbError);
    }

    function writeNode(node: Node): Promise<string> {
        // language=cypher
        const cypher = `
          CREATE (m:${node.label} {nodeId: apoc.create.uuid(), name: $name, attrOne: $attrOne, attrTwo: $attrTwo})
          RETURN m {. *} AS n`;

        const params = {
            name: node.name,
            label: node.label,
            attrOne: node.attributes.attrOne,
            attrTwo: node.attributes.attrTwo,
        };
        return neo4jService
            .write(cypher, params, process.env.DB_CUSTOMER)
            .then((res) => res.records[0].get("n").nodeId)
            .catch(databaseUtil.catchDbError);
    }

    function writeRelation(relation: Relation) {
        // language=Cypher
        const cypher = `
          MATCH (s {nodeId: $from}), (e {nodeId: $to})
          CREATE(s)-[r:${relation.type}]->(e)
          SET r.relationId = apoc.create.uuid(), r.attrOne = $attrOne
          RETURN r {. *}`;

        const params = {
            from: relation.from,
            to: relation.to,
            attrOne: relation.attributes.attrOne,
        };

        return neo4jService
            .write(cypher, params, process.env.DB_CUSTOMER)
            .then((res) => res.records[0].get("r").name)
            .catch(databaseUtil.catchDbError);
    }
});
