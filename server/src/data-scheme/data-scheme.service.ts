import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Neo4jService } from "nest-neo4j/dist";
import { Scheme } from "./data-scheme.model";
import { RelationType } from "./models/relationType";
import { LabelScheme } from "./models/labelScheme";
import { DatabaseUtil } from "../util/database.util";
import Relation from "../relations/relation.model";
import { DataSchemeUtil } from "../util/data-scheme.util";
import { Attribute } from "./models/attributes";
import Node from "../nodes/node.model";

@Injectable()
export class DataSchemeService {
    /**
     * The name of the customer database
     */
    private customerDb = process.env.DB_CUSTOMER;
    /**
     * The name of the tool database
     */
    private readonly database = process.env.DB_TOOL;

    constructor(
        private readonly neo4jService: Neo4jService,
        private readonly dataSchemeUtil: DataSchemeUtil,
        private readonly databaseUtil: DatabaseUtil,
    ) {}

    /**
     * Fetch all entries of the scheme
     */
    async getScheme(): Promise<Scheme> {
        return new Scheme(await this.getAllLabelSchemes(), await this.getAllRelationTypes());
    }

    /**
     * Fetch all labels of the scheme
     */
    async getAllLabelSchemes(): Promise<Array<LabelScheme>> {
        // language=cypher
        const cypher = `
          MATCH (ls:LabelScheme)
          RETURN ls {. *} AS dataScheme`;
        const params = {};

        // Callback function which is applied on the neo4j response
        const resolveRead = (res) => res.records.map(this.dataSchemeUtil.parseLabelScheme);

        return this.neo4jService
            .read(cypher, params, this.database)
            .then(resolveRead)
            .catch(this.databaseUtil.catchDbError);
    }

    /**
     * Fetch the label with specific name
     */
    async getLabelScheme(name: string): Promise<LabelScheme> {
        return this.dataSchemeUtil.getLabelScheme(name);
    }

    /**
     * Adds a new label scheme to the db
     */
    async addLabelScheme(label: LabelScheme): Promise<LabelScheme> {
        // language=Cypher
        const cypher = `
          CREATE (ls:LabelScheme {name: $name, color: $color, attributes: $attributes})
          RETURN ls {. *} AS dataScheme`;

        const params = {
            name: label.name,
            color: label.color,
            attributes: JSON.stringify(label.attributes),
        };

        // Callback function which is applied on the neo4j response
        const resolveWrite = (res) => {
            return this.dataSchemeUtil.parseLabelScheme(res.records[0]);
        };

        return this.neo4jService
            .write(cypher, params, this.database)
            .then(resolveWrite)
            .catch(this.databaseUtil.catchDbError);
    }

    /**
     * Adds a new label scheme to the db
     */
    async updateLabelScheme(name: string, label: LabelScheme, force: boolean): Promise<LabelScheme> {
        label.type = "LabelScheme";
        // language=Cypher
        const cypher = `
          MATCH (ls:LabelScheme {name: $name})
          SET ls.color = $color, ls.attributes = $attributes
          RETURN ls {. *} AS dataScheme`;

        const params = {
            name,
            color: label.color,
            attributes: JSON.stringify(label.attributes),
        };

        // Callback function which is applied on the neo4j response
        const resolveWrite = (res) => {
            return this.dataSchemeUtil.parseLabelScheme(res.records[0]);
        };

        if (force || !(await this.schemeHasConflicts(label))) {
            return this.neo4jService
                .write(cypher, params, this.database)
                .then(resolveWrite)
                .catch(this.databaseUtil.catchDbError);
        }
    }

    /**
     * Deletes a label scheme from the db
     */
    async deleteLabelScheme(name: string): Promise<LabelScheme> {
        // language=cypher
        const cypher = `
          MATCH (ls:LabelScheme {name: $name})
          WITH ls, properties(ls) AS copyLs
          DETACH DELETE ls
          RETURN copyLs {. *} AS dataScheme`;

        const params = {
            name,
        };

        // Callback function which is applied on the neo4j response
        const resolveWrite = (res) => {
            if (!res.records[0]) throw new NotFoundException(`The label ${name} has not been found`);
            return this.dataSchemeUtil.parseLabelScheme(res.records[0]);
        };

        return this.neo4jService
            .write(cypher, params, this.database)
            .then(resolveWrite)
            .catch(this.databaseUtil.catchDbError);
    }

    /**
     * Fetch all relations
     */
    async getAllRelationTypes(): Promise<Array<RelationType>> {
        // language=cypher
        const cypher = "MATCH (rt:RelationType) RETURN rt {.*} AS dataScheme";
        const params = {};

        // Callback function which is applied on the neo4j response
        const resolveRead = (res) => res.records.map(this.dataSchemeUtil.parseRelationType);

        return this.neo4jService
            .read(cypher, params, this.database)
            .then(resolveRead)
            .catch(this.databaseUtil.catchDbError);
    }

    /**
     * Fetch the relation with specific name
     */
    async getRelationType(name: string): Promise<RelationType> {
        return this.dataSchemeUtil.getRelationType(name);
    }

    /**
     * Adds a new relation type
     */
    async addRelationType(relationType: RelationType): Promise<RelationType> {
        // language=Cypher
        const cypher = `
          CREATE (rt:RelationType {name: $name, attributes: $attributes, connections: $connections})
          RETURN rt {. *} AS dataScheme`;

        const params = {
            name: relationType.name,
            attributes: JSON.stringify(relationType.attributes),
            connections: JSON.stringify(relationType.connections),
        };

        // Callback function which is applied on the neo4j response
        const resolveWrite = (res) => {
            return this.dataSchemeUtil.parseRelationType(res.records[0]);
        };

        return this.neo4jService
            .write(cypher, params, this.database)
            .then(resolveWrite)
            .catch(this.databaseUtil.catchDbError);
    }

    /**
     * Adds a new label scheme to the db
     */
    async updateRelationType(name: string, relationType: RelationType, force: boolean): Promise<LabelScheme> {
        relationType.type = "RelationType";

        // language=Cypher
        const cypher = `
          MATCH (rt:RelationType {name: $name})
          SET rt.attributes = $attributes, rt.connections = $connections
          RETURN rt {. *} AS dataScheme`;

        const params = {
            name,
            attributes: JSON.stringify(relationType.attributes),
            connections: JSON.stringify(relationType.connections),
        };

        // Callback function which is applied on the neo4j response
        const resolveWrite = (res) => {
            return this.dataSchemeUtil.parseRelationType(res.records[0]);
        };

        if (force || !(await this.schemeHasConflicts(relationType)))
            return this.neo4jService
                .write(cypher, params, this.database)
                .then(resolveWrite)
                .catch(this.databaseUtil.catchDbError);
    }

    /**
     * Deletes a relation type from the db
     */
    async deleteRelationType(name: string): Promise<Relation> {
        // language=cypher
        const cypher = `
          MATCH (rt:RelationType {name: $name})
          WITH rt, properties(rt) AS copyRt
          DETACH DELETE rt
          RETURN copyRt {. *} AS dataScheme`;

        const params = {
            name,
        };

        // Callback function which is applied on the neo4j response
        const resolveWrite = (res) => {
            if (!res.records[0]) throw new NotFoundException(`The relation type ${name} has not been found`);
            return this.dataSchemeUtil.parseRelationType(res.records[0]);
        };

        return this.neo4jService
            .write(cypher, params, this.database)
            .then(resolveWrite)
            .catch(this.databaseUtil.catchDbError);
    }

    /**
     * Check whether the given label scheme will have any conflicts with the data stored in the database.
     * May either be missing attributes or values that cannot be parsed
     * @param label The label scheme
     * @throws ConflictException when any conflict is found and sends the type and amount of conflicting nodes
     */
    private async schemeHasConflicts(label: LabelScheme | RelationType) {
        const [addedAttr, changedAttr] = await this.getChangedAttrs(label);

        let missingConflicts = 0;
        let diffConflicts = 0;

        if (addedAttr.length) {
            for (const element of addedAttr) {
                if (element.mandatory)
                    missingConflicts += (await this.getEntityAttrDependant(element.name, label, false)).length;
            }
        }

        for (const element of changedAttr) {
            const exists: Node[] = await this.getEntityAttrDependant(element["name"], label, true);

            if (element.mandatory)
                missingConflicts += (await this.getEntityAttrDependant(element.name, label, false)).length;
            exists.forEach((node) => {
                diffConflicts += this.dataSchemeUtil.hasConflict(element, node) ? 1 : 0;
            });
        }

        const err = {
            missingError: missingConflicts,
            parseError: diffConflicts,
        };

        if (missingConflicts > 0 || diffConflicts > 0) {
            throw new ConflictException(err);
        } else return false;
    }

    /**
     * Get the attributes that have changed in the given scheme in comparison to the one stored in the tool db
     * @param scheme The scheme which has to be checked against the database label
     * @return Tuple At [0] the newly added attributes, at [1] the changed attributes
     */
    private async getChangedAttrs(scheme: LabelScheme | RelationType) {
        const oldAttrs =
            scheme.type === "LabelScheme"
                ? (await this.dataSchemeUtil.getLabelScheme(scheme.name)).attributes
                : (await this.dataSchemeUtil.getRelationType(scheme.name)).attributes;

        const oldAttrsMap = new Map(oldAttrs.map((i): [string, Attribute] => [i.name, i]));
        const newAttrsMap = new Map(scheme.attributes.map((i): [string, Attribute] => [i.name, i]));

        const addedAttr = [];
        const changedAttr = [];

        // find attributes only existing in the old label scheme
        newAttrsMap.forEach((newEl) => {
            if (oldAttrsMap.has(newEl.name)) {
                if (!(JSON.stringify(newEl) === JSON.stringify(oldAttrsMap.get(newEl.name)))) changedAttr.push(newEl);
            } else addedAttr.push(newEl);
        });
        return [addedAttr, changedAttr];
    }

    /**
     * Differentiates the query depending on the type of scheme (RelationType or LabelScheme)
     * Note that this cannot be an anonymous function because the this context is necessary for the neo4jservice
     * @param attributeName The name of the attribute which is being searched for
     * @param scheme The scheme which is either of type LabelScheme or RelationType
     * @param attributeExists True if the attribute that is being searched should exist
     * @private
     */
    private async getEntityAttrDependant(
        attributeName: string,
        scheme: LabelScheme | RelationType,
        attributeExists: boolean,
    ) {
        return scheme.type === "LabelScheme"
            ? this.getNodesAttrDependant(attributeName, scheme.name, attributeExists)
            : this.getRelationsAttrDependant(attributeName, scheme.name, attributeExists);
    }

    /**
     * Get the nodes that either do or do not have a specific attribute
     * @param attributeName The name of the attribute which is being searched for
     * @param labelName The name of the label the attribute holding element has
     * @param attributeExists True if the attribute that is being searched should exist
     * @private
     */
    private async getNodesAttrDependant(attributeName: string, labelName: string, attributeExists: boolean) {
        const params = {
            labelName,
        };
        const cypher = attributeExists
            ? `MATCH (node:${labelName})
                    WHERE exists(node.${attributeName})
                  RETURN node {.*, label: $labelName} AS node`
            : `MATCH (node:${labelName})
                    WHERE NOT exists(node.${attributeName})
                  RETURN node {.*, label: $labelName} AS node`;

        const resolveRead = (result) => Promise.all(result.records.map((el) => this.dataSchemeUtil.parseNode(el)));
        return await this.neo4jService
            .read(cypher, params, this.customerDb)
            .then(resolveRead)
            .catch(this.databaseUtil.catchDbError);
    }

    /**
     * Get the relations that either do or do not have a specific attribute
     * @param attributeName The name of the attribute which is being searched for
     * @param relationTypeName The name of the relation the attribute holding element has
     * @param attributeExists True if the attribute that is being searched should exist
     * @private
     */
    private async getRelationsAttrDependant(attributeName: string, relationTypeName: string, attributeExists: boolean) {
        const params = {
            relationTypeName,
        };
        const cypher = attributeExists
            ? `MATCH ()-[rel:${relationTypeName}]-()
                WHERE exists(rel.${attributeName})
                RETURN DISTINCT rel {.*, type: $relationTypeName} AS r`
            : `MATCH ()-[rel:${relationTypeName}]-()
                WHERE NOT exists(rel.${attributeName})
                RETURN DISTINCT rel {.*, type: $relationTypeName} AS r`;

        const resolveRead = (result) => Promise.all(result.records.map((el) => this.dataSchemeUtil.parseRelation(el)));
        return await this.neo4jService
            .read(cypher, params, this.customerDb)
            .then(resolveRead)
            .catch(this.databaseUtil.catchDbError);
    }
}
