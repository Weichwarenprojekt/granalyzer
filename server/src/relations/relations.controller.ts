import { RelationsService } from "./relations.service";
import {
    Body,
    Controller,
    DefaultValuePipe,
    Delete,
    Get,
    Param,
    ParseBoolPipe,
    Post,
    Put,
    Query,
} from "@nestjs/common";
import {
    ApiBody,
    ApiInternalServerErrorResponse,
    ApiNotAcceptableResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from "@nestjs/swagger";
import Relation from "./relation.model";
import { ValidationPipe } from "../validation-pipe";

@ApiTags("relations")
@Controller("relations")
export class RelationsController {
    constructor(private readonly relationsService: RelationsService) {}

    @Get(":id")
    @ApiQuery({
        name: "includeDefaults",
        type: "number",
        description: "True if the returned attributes shall contain default values",
    })
    @ApiOperation({ description: "Returns a specific relation from the customer db matching by id" })
    @ApiOkResponse({ description: "Return the relation with the given id", type: Relation })
    @ApiInternalServerErrorResponse()
    getRelation(
        @Param("id") id: string,
        @Query("includeDefaults", new DefaultValuePipe(true), ParseBoolPipe) includeDefaults: boolean,
    ) {
        return this.relationsService.getRelation(id, includeDefaults);
    }

    @Get()
    @ApiOperation({
        description: "Returns all the relations from the customer db",
    })
    @ApiOkResponse({ description: "Return the relations", type: [Relation] })
    @ApiInternalServerErrorResponse()
    getAllRelations() {
        return this.relationsService.getAllRelations();
    }

    @Post()
    @ApiBody({
        type: Relation,
        description: "The relation to be created",
    })
    @ApiOperation({ description: "Creates a relation between two nodes" })
    @ApiOkResponse({ description: "Returns the created relation", type: Relation })
    @ApiNotAcceptableResponse({ description: "Cannot create this relation due to violated constraints" })
    createRelation(@Body(ValidationPipe) body: Relation): Promise<Relation> {
        return this.relationsService.createRelation(body);
    }

    @Put(":id")
    @ApiOperation({ description: "Updates the attributes of the relation" })
    @ApiOkResponse({ description: "Returns the updated relation", type: Relation })
    @ApiNotFoundResponse({ description: "Could not find any relation for this uuid" })
    @ApiNotAcceptableResponse({ description: "Cannot modify this relation due to violated constraints" })
    @ApiParam({
        name: "id",
        type: "string",
        description: "UUID of the relation",
    })
    @ApiBody({
        type: Relation,
        description: "The relation to be modified",
    })
    modifyRelation(@Param("id") id: string, @Body(ValidationPipe) body: Relation) {
        return this.relationsService.modifyRelation(id, body);
    }

    @Delete(":id")
    @ApiOperation({ description: "Deletes the specified relation" })
    @ApiOkResponse({ description: "Returns the deleted relation", type: Relation })
    @ApiNotFoundResponse({ description: "Could not find any relation for this uuid" })
    @ApiParam({
        name: "relationId",
        type: "string",
        description: "UUID of the relation",
    })
    deleteRelation(@Param("id") relationId: string): Promise<Relation> {
        return this.relationsService.deleteRelation(relationId);
    }
}
