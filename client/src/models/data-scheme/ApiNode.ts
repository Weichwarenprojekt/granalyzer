export default class ApiNode {
    /**
     * Node model from the API
     *
     * @param name Name of the node
     * @param label Label the node is related to
     * @param nodeId Id of the node
     * @param attributes Additional attributes of the node
     */
    constructor(
        public name: string = "",
        public label: string = "",
        public nodeId: string = "",
        public attributes: {
            [key: string]: string | number;
        } = {},
    ) {}
}
