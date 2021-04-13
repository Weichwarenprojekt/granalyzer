export default class ApiLabel {
    /**
     * Label model
     *
     * @param name name of the label
     * @param color color of the label
     * @param attributes attributes of the label
     */
    constructor(public name = "", public color = "#000", public attributes = []) {}
}