import { Test, TestingModule } from "@nestjs/testing";
import { FoldersService } from "./folders.service";
import { Neo4jService } from "nest-neo4j/dist";
import { FoldersRepository } from "./folders.repository";
import MockNeo4jService from "../../test/mock-neo4j.service";
import { NotFoundException } from "@nestjs/common";
import { FoldersController } from "./folders.controller";

describe("FoldersController", () => {
    let service: FoldersService;
    let neo4jService: Neo4jService;
    let controller: FoldersController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [FoldersController],
            providers: [
                FoldersService,
                {
                    provide: Neo4jService,
                    useValue: MockNeo4jService,
                },
            ],
        }).compile();

        neo4jService = module.get<Neo4jService>(Neo4jService);
        service = module.get<FoldersService>(FoldersService);
        controller = module.get<FoldersController>(FoldersController);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
        expect(neo4jService).toBeDefined();
        expect(controller).toBeDefined();
    });

    describe("getFolders", () => {
        it("should return all folders", async () => {
            jest.spyOn(neo4jService, "read").mockImplementation(() => FoldersRepository.mockGetFolders());

            expect(await controller.getAllFolders()).toStrictEqual(FoldersRepository.resultGetFolders());
        });
    });

    describe("getFolder", () => {
        it("should return one Folder", async () => {
            jest.spyOn(neo4jService, "read").mockImplementation(() => FoldersRepository.mockGetFolder());

            expect(await controller.getFolder(0)).toStrictEqual(FoldersRepository.resultGetFolder());
        });

        it("should return not found exception", async () => {
            jest.spyOn(neo4jService, "read").mockImplementation(() => FoldersRepository.mockEmptyResponse());

            await expect(controller.getFolder(2)).rejects.toThrowError(NotFoundException);
        });
    });

    describe("addFolder", () => {
        it("should return the added Folder", async () => {
            jest.spyOn(neo4jService, "write").mockImplementation(() => FoldersRepository.mockAddFolder());

            expect(await controller.addFolder("added Folder")).toStrictEqual(FoldersRepository.resultAddFolder());
        });
    });

    describe("updateFolder", () => {
        it("should return the updated Folder", async () => {
            jest.spyOn(neo4jService, "write").mockImplementation(() => FoldersRepository.mockUpdateFolder());

            expect(await controller.updateFolder(0, "update Folder")).toStrictEqual(
                FoldersRepository.resultUpdateFolder(),
            );
        });

        it("should return not found exception", async () => {
            jest.spyOn(neo4jService, "write").mockImplementation(() => FoldersRepository.mockEmptyResponse());

            await expect(controller.updateFolder(2, "update Folder")).rejects.toThrowError(NotFoundException);
        });
    });

    describe("deleteFolder", () => {
        it("should return the deleted Folder", async () => {
            jest.spyOn(neo4jService, "write").mockImplementation(() => FoldersRepository.mockDeleteFolder());

            expect(await controller.deleteFolder(0)).toStrictEqual(FoldersRepository.resultDeleteFolder());
        });

        it("should return not found exception", async () => {
            jest.spyOn(neo4jService, "write").mockImplementation(() => FoldersRepository.mockEmptyResponse());

            await expect(controller.deleteFolder(2)).rejects.toThrowError(NotFoundException);
        });
    });
});