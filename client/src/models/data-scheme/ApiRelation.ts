import { ApiAttribute } from "@/models/data-scheme/ApiAttribute";

export default class ApiRelation {
    /**
     * Model for the relation from the api
     *
     * @param name Name of the relation
     * @param type Type of the relation
     * @param from UUID of the start node of the relation
     * @param to UUID of the end node of the relation
     * @param id UUID of the relation
     * @param attributes Attributes of the relation
     */
    constructor(
        public name: string = "",
        public type: string = "",
        public from: string = "",
        public to: string = "",
        public id: string = "",
        public attributes = new Array<ApiAttribute>(),
    ) {}
}
