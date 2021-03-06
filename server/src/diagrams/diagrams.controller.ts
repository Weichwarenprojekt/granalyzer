import { Controller, Get, Param, Post, Body, Put, Delete } from "@nestjs/common";
import { DiagramsService } from "./diagrams.service";
import {
    ApiBody,
    ApiCreatedResponse,
    ApiNotAcceptableResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from "@nestjs/swagger";
import { Diagram } from "./diagram.model";
import { ValidationPipe } from "../validation-pipe";

@ApiTags("diagrams")
@Controller("diagrams")
export class DiagramsController {
    constructor(private readonly diagramsService: DiagramsService) {}

    @Get()
    @ApiOperation({
        description: "Returns all diagrams",
    })
    @ApiOkResponse({
        description: "Returns all diagrams",
        type: [Diagram],
    })
    getAllDiagrams() {
        return this.diagramsService.getDiagrams();
    }

    @Get("/root")
    @ApiOperation({
        description: "Return all diagrams at top level (which are not nested into another folder)",
    })
    @ApiOkResponse({
        description: "Returns all diagrams at root level",
        type: [Diagram],
    })
    getAllRootDiagrams() {
        return this.diagramsService.getAllRootDiagrams();
    }

    @Get(":id")
    @ApiOperation({
        description: "Returns the specific diagram represented by the given id",
    })
    @ApiParam({
        name: "id",
        type: "string",
        description: "Identifier of the diagram which is requested",
    })
    @ApiOkResponse({
        type: Diagram,
        description: "Returns the specific diagram represented by the given id",
    })
    @ApiNotAcceptableResponse({ description: "Requested resource is not a diagram" })
    @ApiNotFoundResponse({ description: "Requested resource does not exist" })
    getDiagram(@Param("id") id: string) {
        return this.diagramsService.getDiagram(id);
    }

    @Post()
    @ApiOperation({
        description: "Adds a new diagram",
    })
    @ApiBody({
        type: Diagram,
    })
    @ApiCreatedResponse({
        type: Diagram,
        description: "Returns the added diagram",
    })
    addDiagram(@Body(ValidationPipe) body: Diagram) {
        return this.diagramsService.addDiagram(body.name, body.serialized);
    }

    @Put(":id")
    @ApiOperation({
        description: "Updates an existing diagram",
    })
    @ApiOkResponse({
        type: Diagram,
        description: "Updates an existing diagram by id",
    })
    @ApiNotAcceptableResponse({ description: "Requested resource is not a diagram" })
    @ApiNotFoundResponse({ description: "Requested resource does not exist" })
    @ApiParam({
        name: "id",
        type: "string",
        description: "Identifier of the diagram which should be updated",
    })
    @ApiBody({
        type: Diagram,
    })
    updateDiagram(@Param("id") id: string, @Body(ValidationPipe) body: Diagram) {
        return this.diagramsService.updateDiagram(id, body.name, body.serialized);
    }

    @Delete(":id")
    @ApiOperation({
        description: "Deletes the diagram with the given id",
    })
    @ApiParam({
        name: "id",
        type: "string",
        description: "Identifier of the diagram which should be deleted",
    })
    @ApiOkResponse({
        type: Diagram,
        description: "Returns the deleted diagram",
    })
    @ApiNotAcceptableResponse({ description: "Requested resource is not a diagram" })
    @ApiNotFoundResponse({ description: "Requested resource does not exist" })
    deleteDiagram(@Param("id") id: string) {
        return this.diagramsService.deleteDiagram(id);
    }
}
