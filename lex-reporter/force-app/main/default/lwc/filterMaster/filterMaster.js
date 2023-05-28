import { LightningElement, api, track } from "lwc";

export default class FilterMaster extends LightningElement {
  @api fields;

  textOperators = [
    { label: "Contains", value: "contains" },
    { label: "Equals", value: "equals" },
    { label: "Does Not Equal", value: "not-equal" },
    { label: "Does Not Contain", value: "not-contains" }
  ];
  dateOperators = [
    { label: "Before", value: "before" },
    { label: "After", value: "after" },
    { label: "On", value: "on" },
    { label: "On or Before", value: "on-before" },
    { label: "On or After", value: "on-after" }
  ];
  numberOperators = [
    { label: "Equals", value: "equals" },
    { label: "Greater Than", value: "greater" },
    { label: "Less Than", value: "less" },
    { label: "Greater Than or Equal To", value: "greater-equal" },
    { label: "Less Than or Equal To", value: "less-equal" }
  ];
  booleanOperators = [{ label: "Equals", value: "equals" }];

  @track filters = [
    {
      id: 0,
      field: "",
      operator: "",
      value: "",
      type: "text",
      operatorOptions: this.textOperators
    }
  ];

  fieldOptions = [];

  connectedCallback() {
    this.fieldOptions = this.fields.map((field) => {
      return { label: field.label, value: field.name };
    });
  }

  addFilter() {
    let newId = this.filters[this.filters.length - 1].id + 1;
    this.filters = [
      ...this.filters,
      {
        id: newId,
        field: "",
        operator: "",
        value: "",
        type: "text",
        operatorOptions: this.textOperators
      }
    ];
  }

  applyFilters() {
    this.dispatchEvent(
      new CustomEvent("filterchange", { detail: this.filters })
    );
  }

  handleFieldChange(event) {
    debugger;
    let filter = this.filters.find((f) => f.id === event.detail.id);
    filter.field = event.detail.value.value;
    let field = this.fields.find((f) => f.name === filter.field);
    switch (field.type.toLowerCase()) {
      case "string":
        filter.type = "text";
        filter.operatorOptions = this.textOperators;
        break;
      case "date":
        filter.type = "date";
        filter.operatorOptions = this.dateOperators;
        break;
      case "datetime":
        filter.type = "datetime";
        filter.operatorOptions = this.dateOperators;
        break;
      case "number":
        filter.type = "number";
        filter.operatorOptions = this.numberOperators;
        break;
      case "currency":
        filter.type = "number";
        filter.operatorOptions = this.numberOperators;
        break;
      case "boolean":
        filter.type = "boolean";
        filter.operatorOptions = this.booleanOperators;
        break;
      default:
    }
  }

  handleOperatorChange(event) {
    let filter = this.filters.find((f) => f.id === event.detail.name);
    filter.operator = event.detail.operator;
  }

  handleValueChange(event) {
    let filter = this.filters.find((f) => f.id === event.detail.name);
    filter.value = event.detail.value;
  }
}
