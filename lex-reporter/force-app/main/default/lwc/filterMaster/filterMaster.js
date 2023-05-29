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
      operatorOptions: this.textOperators,
      saved: false
    }
  ];

  applyFilters() {
    debugger;
    this.filters = this.filters.map((filter) => ({ ...filter, saved: true }));
    this.dispatchEvent(
      new CustomEvent("filterchange", { detail: this.filters })
    );
  }

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

  handleFieldChange(event) {
    this.filters = this.filters.map((f) => {
      if (f.id === event.detail.id) {
        f.field = event.detail.value.value;
        let field = this.fields.find(
          (f) => f.name === event.detail.value.value
        );

        switch (field.type.toLowerCase()) {
          case "string":
            f.type = "text";
            f.operatorOptions = this.textOperators;
            break;
          case "date":
            f.type = "date";
            f.operatorOptions = this.dateOperators;
            break;
          case "datetime":
            f.type = "datetime";
            f.operatorOptions = this.dateOperators;
            break;
          case "number":
            f.type = "number";
            f.operatorOptions = this.numberOperators;
            break;
          case "currency":
            f.type = "number";
            f.operatorOptions = this.numberOperators;
            break;
          case "boolean":
            f.type = "boolean";
            f.operatorOptions = this.booleanOperators;
            break;
          default:
            f.type = "text";
            f.operatorOptions = this.textOperators;
            break;
        }
      }
      return f;
    });
  }

  handleOperatorChange(event) {
    debugger;
    // set filter whose id === event.detail.id to have operator === event.detail.value
    this.filters = this.filters.map((f) => {
      if (f.id === event.detail.id) {
        f.operator = event.detail.value;
      }
      return f;
    });
  }

  handleValueChange(event) {
    let filter = this.filters.find((f) => f.id === event.detail.id);
    filter.value = event.detail.value;
  }
}
