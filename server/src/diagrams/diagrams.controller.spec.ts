/**
 * @group unit/diagrams/controller
 */

import { Test, TestingModule } from "@nestjs/testing";
import { DiagramsController } from "./diagrams.controller";
import { DiagramsService } from "./diagrams.service";
import { Neo4jService } from "nest-neo4j/dist";
import { DiagramsRepository } from "./diagrams.repository";
import MockNeo4jService from "../../test/mock-neo4j.service";
import { FoldersService } from "../folders/folders.service";
import { TestingLogger } from "@nestjs/testing/services/testing-logger.service";

describe("DiagramsController", () => {
    let service: DiagramsService;
    let foldersService: FoldersService;
    let neo4jService: Neo4jService;
    let controller: DiagramsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DiagramsController],
            providers: [
                DiagramsService,
                FoldersService,
                {
                    provide: Neo4jService,
                    useValue: MockNeo4jService,
                },
            ],
        }).compile();

        module.useLogger(TestingLogger);

        neo4jService = module.get<Neo4jService>(Neo4jService);
        service = module.get<DiagramsService>(DiagramsService);
        foldersService = module.get<FoldersService>(FoldersService);
        controller = module.get<DiagramsController>(DiagramsController);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
        expect(foldersService).toBeDefined();
        expect(neo4jService).toBeDefined();
        expect(controller).toBeDefined();
    });

    describe("getDiagrams", () => {
        it("should return all diagrams", async () => {
            jest.spyOn(neo4jService, "read").mockImplementation(() => DiagramsRepository.mockGetDiagrams());

            expect(await controller.getAllDiagrams()).toStrictEqual(DiagramsRepository.resultGetDiagrams());
        });
    });

    describe("getRootDiagrams", () => {
        it("should return all root diagrams", async () => {
            jest.spyOn(neo4jService, "read").mockImplementation(() => DiagramsRepository.mockGetDiagrams());

            expect(await controller.getAllRootDiagrams()).toStrictEqual(DiagramsRepository.resultGetDiagrams());
        });
    });

    describe("getDiagram", () => {
        it("should return one diagram", async () => {
            jest.spyOn(neo4jService, "read").mockImplementation(() => DiagramsRepository.mockGetDiagram());

            expect(await controller.getDiagram("0-0-0-0")).toStrictEqual(DiagramsRepository.resultGetDiagram());
        });
    });

    describe("addDiagram", () => {
        it("should return the added diagram", async () => {
            jest.spyOn(neo4jService, "write").mockImplementation(() => DiagramsRepository.mockAddDiagram());

            const bodyObject = {
                name: "my name",
                serialized: "string",
            };

            expect(await controller.addDiagram(bodyObject)).toStrictEqual(DiagramsRepository.resultAddDiagram());
        });
    });

    describe("updateDiagram", () => {
        it("should return the updated diagram", async () => {
            jest.spyOn(neo4jService, "write").mockImplementation(() => DiagramsRepository.mockUpdateDiagram());

            const bodyObject = {
                name: "changed name",
                serialized: ",changed string",
            };

            expect(await controller.updateDiagram(0, bodyObject)).toStrictEqual(
                DiagramsRepository.resultUpdateDiagram(),
            );
        });
    });

    describe("deleteDiagram", () => {
        it("should return the deleted diagram", async () => {
            jest.spyOn(neo4jService, "write").mockImplementation(() => DiagramsRepository.mockDeleteDiagram());

            expect(await controller.deleteDiagram("0-0-0-0")).toStrictEqual(DiagramsRepository.resultDeleteDiagram());
        });
    });
});
