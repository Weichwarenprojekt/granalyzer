import { Injectable } from "@nestjs/common";
import { Neo4jService } from "nest-neo4j/dist";
import { Folder } from "./folder.model";
import { Transaction } from "neo4j-driver";
import Result from "neo4j-driver/types/result";
import { UtilsNode } from "../util/utils.node";

@Injectable()
export class FoldersService {
    constructor(private readonly neo4jService: Neo4jService, private readonly utilsNode: UtilsNode) {}

    /**
     * @private Configures the default database
     */
    private readonly database = process.env.DB_TOOL;

    /**
     * Return all folders
     */
    async getAllFolders(): Promise<Folder[]> {
        // language=Cypher
        const cypher = "MATCH (f:Folder) RETURN f AS folder";
        const params = {};

        return this.neo4jService
            .read(cypher, params, this.database)
            .then((res) => res.records.map(FoldersService.parseFolder));
    }

    /**
     * Return all folders at top level (which are not nested into another folder)
     */
    async getAllRootFolders(): Promise<Folder[]> {
        // language=Cypher
        const cypher = "MATCH (f:Folder) WHERE NOT (f)-[:IS_CHILD]->() RETURN f AS folder";
        const params = {};

        return this.neo4jService
            .read(cypher, params, this.database)
            .then((res) => res.records.map(FoldersService.parseFolder));
    }

    /**
     * Return a specific folder by id
     *
     * @param id
     */
    async getFolder(id: number): Promise<Folder> {
        // Check whether id belongs to a folder
        await this.utilsNode.checkElementForLabel(id, "Folder");

        // language=Cypher
        const cypher = "MATCH (f:Folder) WHERE id(f) = $id RETURN f AS folder";
        const param = {
            id: this.neo4jService.int(id),
        };

        return this.neo4jService.read(cypher, param, this.database).then((res) => {
            return FoldersService.parseFolder(res.records[0]);
        });
    }

    /**
     * Add a new folder
     *
     * @param name
     */
    async addFolder(name: string): Promise<Folder> {
        // language=Cypher
        const cypher = "CREATE (f:Folder {name: $name}) RETURN f AS folder";
        const params = {
            name,
        };

        return this.neo4jService
            .write(cypher, params, this.database)
            .then((res) => FoldersService.parseFolder(res.records[0]));
    }

    /**
     * Delete an existing folder
     * @param id
     */
    async deleteFolder(id: number): Promise<Folder> {
        // Check whether id belongs to a folder
        await this.utilsNode.checkElementForLabel(id, "Folder");

        // language=Cypher
        const cypher = "MATCH (f:Folder) WHERE id(f) = $id DETACH DELETE f RETURN f AS folder";
        const params = {
            id: this.neo4jService.int(id),
        };

        return this.neo4jService.write(cypher, params, this.database).then((res) => {
            return FoldersService.parseFolder(res.records[0]);
        });
    }

    /**
     * Update an existing folder
     *
     * @param id
     * @param name
     */
    async updateFolder(id: number, name: string): Promise<Folder> {
        // Check whether id belongs to a folder
        await this.utilsNode.checkElementForLabel(id, "Folder");

        // language=Cypher
        const cypher = "MATCH (f:Folder) WHERE id(f) = $id SET f.name = $name RETURN f AS folder";
        const params = {
            id: this.neo4jService.int(id),
            name,
        };

        return this.neo4jService.write(cypher, params, this.database).then((res) => {
            return FoldersService.parseFolder(res.records[0]);
        });
    }

    /**
     * Returns all folders which are assign to the folder as a IS_CHILD relation
     *
     * @param id
     */
    async getFoldersInFolder(id: number): Promise<Folder[]> {
        // Check whether id belongs to a folder
        await this.utilsNode.checkElementForLabel(id, "Folder");

        // language=Cypher
        const cypher = "MATCH (cf:Folder)-[r:IS_CHILD]->(pf:Folder) WHERE id(pf) = $id RETURN cf AS folder";
        const params = {
            id: this.neo4jService.int(id),
        };

        return this.neo4jService.read(cypher, params, this.database).then((res) => {
            return res.records.map(FoldersService.parseFolder);
        });
    }

    /**
     * Returns a specific child of a given folder
     *
     * @param parentId
     * @param childId
     */
    async getFolderInFolder(parentId: number, childId: number): Promise<Folder> {
        // Check whether id belongs to a folder
        await this.utilsNode.checkElementForLabel(parentId, "Folder");
        await this.utilsNode.checkElementForLabel(childId, "Folder");

        // language=Cypher
        const cypher =
            "MATCH (cf:Folder)-[r:IS_CHILD]->(pf:Folder) WHERE id(pf) = $parentId AND id(cf) = $childId RETURN cf AS folder";
        const params = {
            parentId: this.neo4jService.int(parentId),
            childId: this.neo4jService.int(childId),
        };
        return this.neo4jService.read(cypher, params, this.database).then((res) => {
            return FoldersService.parseFolder(res.records[0]);
        });
    }

    /**
     * Creates a IS_CHILD relation child-IS_CHILD->parent
     *
     * @param parentId
     * @param childId
     */
    async addFolderToFolder(parentId: number, childId: number): Promise<Folder> {
        // Check whether id and child id belongs to a folder
        await this.utilsNode.checkElementForLabel(parentId, "Folder");
        await this.utilsNode.checkElementForLabel(childId, "Folder");

        // Start a new transaction to keep deletion of old relationship and adding the new one persistent
        const transaction = this.neo4jService.beginTransaction(this.database);

        // Delete old IS_CHILD relation if available
        await this.deleteIsChildRelation(childId, transaction);

        //language=Cypher
        const cypher =
            "MATCH (p:Folder), (c:Folder) WHERE id(p) = $parentId AND id(c) = $childId " +
            "SET c.parentId = id(p)" +
            "CREATE (c)-[r:IS_CHILD]->(p) RETURN c AS folder";
        const params = {
            parentId: this.neo4jService.int(parentId),
            childId: this.neo4jService.int(childId),
        };
        const child = await this.neo4jService
            .write(cypher, params, transaction)
            .then((res) => FoldersService.parseFolder(res.records[0]));

        // Commit the transaction
        await transaction.commit();

        // Return child as promise
        return new Promise<Folder>((resolve) => resolve(child));
    }

    /**
     * Deletes the IS_CHILD relation between the given parent and child
     *
     * @param parentId
     * @param childId
     */
    async removeFolderFromFolder(parentId: number, childId: number): Promise<Folder> {
        // Check whether id belongs to a folder
        await this.utilsNode.checkElementForLabel(parentId, "Folder");
        await this.utilsNode.checkElementForLabel(childId, "Folder");

        return this.deleteIsChildRelation(childId, this.database).then((res) =>
            FoldersService.parseFolder(res.records[0]),
        );
    }

    /**
     * Deletes all outgoing IS_CHILD relations of node with childId
     *
     * To provide a folder structure a child must be assigned to only one parent!
     *
     * @param childId Id of the node whose relations should be deleted
     * @param databaseOrTransaction The current database or a neo4j transaction
     * @private
     */
    deleteIsChildRelation(childId: number, databaseOrTransaction?: string | Transaction): Result {
        //language=Cypher
        const cypher =
            "MATCH (c: Folder)-[r:IS_CHILD]->() WHERE id(c) = $childId DELETE r REMOVE c.parentId RETURN c AS folder";
        const params = {
            childId: this.neo4jService.int(childId),
        };
        return this.neo4jService.write(cypher, params, databaseOrTransaction);
    }

    /**
     * Restructure the response of the db
     *
     * @param record
     * @private
     */
    static parseFolder(record: Record<any, any>): Folder {
        const folder = record.get("folder");

        return {
            name: folder.properties["name"],
            parentId: folder.properties["parentId"]?.toNumber(),
            id: folder.identity.toNumber(),
        } as Folder;
    }
}
